import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractContactEmail } from "@/lib/audit/email-finder";
import { safeFetch } from "@/lib/safe-fetch";
import { PipelineStage } from "@prisma/client";

/**
 * POST /api/internal/recover-emails
 *
 * Recupera retroattivamente l'email di contatto per i lead già analizzati
 * che non l'hanno perché email-finder non esisteva al momento dell'audit.
 *
 * - Processa un batch per run (default 50, configurabile con ?batch=N)
 * - HOT e WARM prima, poi gli altri
 * - Timeout aggressivo (10s per sito) + fallback /contatti
 * - Niente retry immediato: se fallisce ora, riprova alla prossima esecuzione
 *
 * Richiede: Authorization: Bearer CRON_SECRET
 */

const DEFAULT_BATCH = 50;
const FETCH_TIMEOUT_MS = 10_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  const ok =
    (expected && authHeader === `Bearer ${expected}`) ||
    (expected && cronHeader === expected);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const batchSize = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("batch") || String(DEFAULT_BATCH), 10) || DEFAULT_BATCH)
  );

  // HOT e WARM in cima — sono quelli che il mailer prova a contattare subito
  const PRIORITY_STAGES: PipelineStage[] = [
    PipelineStage.HOT_LEAD,
    PipelineStage.WARM_LEAD,
    PipelineStage.DA_ANALIZZARE,
  ];

  const leads = await db.lead.findMany({
    where: {
      email: null,
      website: { not: null },
      auditStatus: "COMPLETED",
      pipelineStage: { in: PRIORITY_STAGES },
    },
    select: { id: true, name: true, website: true },
    orderBy: [
      // HACK: ordina per pipelineStage con priorità manuale → fatta con raw query
      // Prisma non ha orderBy su enum, usiamo createdAt come tie-break
      { pipelineStage: "asc" }, // HOT < WARM < DA_ANALIZZARE alfabeticamente
      { createdAt: "asc" },
    ],
    take: batchSize,
  });

  const stats = { processed: 0, found: 0, notFound: 0, errors: 0 };

  for (const lead of leads) {
    stats.processed++;
    if (!lead.website) {
      stats.notFound++;
      continue;
    }

    let url = lead.website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;

    try {
      const baseUrl = new URL(url).origin;
      const host = new URL(url).hostname;

      // Tentativo 1: homepage
      let email: string | null = null;
      try {
        const res = await safeFetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (res.ok) email = extractContactEmail(await res.text(), host);
      } catch {
        /* non bloccante */
      }

      // Tentativo 2: pagina /contatti (comune nei siti italiani)
      if (!email) {
        try {
          const res = await safeFetch(`${baseUrl}/contatti`, {
            signal: AbortSignal.timeout(8_000),
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          });
          if (res.ok) email = extractContactEmail(await res.text(), host);
        } catch {
          /* non bloccante */
        }
      }

      // Tentativo 3: /contattaci (variante comune)
      if (!email) {
        try {
          const res = await safeFetch(`${baseUrl}/contattaci`, {
            signal: AbortSignal.timeout(8_000),
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          });
          if (res.ok) email = extractContactEmail(await res.text(), host);
        } catch {
          /* non bloccante */
        }
      }

      if (email) {
        await db.lead.update({ where: { id: lead.id }, data: { email } });
        stats.found++;
        console.log(`[RECOVER-EMAIL] ${lead.name}: ${email}`);
      } else {
        stats.notFound++;
      }

      // Jitter per non martellare i siti
      await sleep(800 + Math.floor(Math.random() * 1200));
    } catch (err) {
      stats.errors++;
      console.error(`[RECOVER-EMAIL] errore su ${lead.name}:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    ok: true,
    batchSize,
    ...stats,
    remaining: await db.lead.count({
      where: {
        email: null,
        website: { not: null },
        auditStatus: "COMPLETED",
        pipelineStage: { in: PRIORITY_STAGES },
      },
    }),
  });
}
