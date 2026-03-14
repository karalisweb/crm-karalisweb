import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runGeminiAnalysis } from "@/lib/gemini-analysis";
import { isGeminiConfigured } from "@/lib/gemini";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { Prisma } from "@prisma/client";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

/**
 * POST /api/cron/batch-gemini-analysis
 *
 * Esegue l'analisi strategica v2.0 su tutti i lead con sito web.
 * Protetto da CRON_SECRET.
 *
 * Query params:
 * - force=true → rigenera anche lead già analizzati
 * - limit=N → processa al massimo N lead
 */
export async function POST(request: NextRequest) {
  // Verifica autenticazione cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API key non configurata" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const limitParam = searchParams.get("limit");
  const maxLeads = limitParam ? parseInt(limitParam, 10) : 100;

  // Trova lead con sito web
  const leads = await db.lead.findMany({
    where: {
      website: { not: null },
      ...(force
        ? {}
        : {
            OR: [
              { geminiAnalysis: { equals: Prisma.DbNull } },
              {
                // Rigenera anche quelli senza v2 (senza teleprompter_script)
                NOT: {
                  geminiAnalysis: {
                    path: ["analysisVersion"],
                    equals: "2.0",
                  },
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      name: true,
      website: true,
    },
    take: maxLeads,
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `[BATCH] Avvio analisi strategica v2.0 su ${leads.length} lead (force=${force})`
  );

  const results: Array<{
    id: string;
    name: string;
    status: "ok" | "error" | "skip";
    error?: string;
  }> = [];

  for (const lead of leads) {
    try {
      if (!lead.website) {
        results.push({ id: lead.id, name: lead.name, status: "skip", error: "No website" });
        continue;
      }

      let url = lead.website;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      // 1. Fetch HTML
      let html: string;
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: FETCH_HEADERS,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch error";
        results.push({ id: lead.id, name: lead.name, status: "error", error: `Fetch: ${msg}` });
        console.log(`[BATCH] ❌ ${lead.name}: fetch error - ${msg}`);
        continue;
      }

      const baseUrl = new URL(url).origin;

      // 2. Estrazione strategica
      const strategicData = await extractStrategicData(html, baseUrl, lead.name);

      const totalText = [
        strategicData.home_text,
        strategicData.about_text,
        strategicData.services_text,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (totalText.length < 10) {
        results.push({
          id: lead.id,
          name: lead.name,
          status: "error",
          error: "Testo insufficiente",
        });
        console.log(`[BATCH] ❌ ${lead.name}: testo insufficiente (${totalText.length}ch)`);
        continue;
      }

      // Fallback: se home vuota usa about/services
      if (!strategicData.home_text || strategicData.home_text.trim().length < 10) {
        strategicData.home_text =
          strategicData.about_text || strategicData.services_text || "";
      }

      // 3. Analisi Gemini
      const analysis = await runGeminiAnalysis(strategicData);

      // 4. Salva
      await db.lead.update({
        where: { id: lead.id },
        data: {
          geminiAnalysis: analysis as unknown as Prisma.InputJsonValue,
          geminiAnalyzedAt: new Date(),
        },
      });

      results.push({ id: lead.id, name: lead.name, status: "ok" });
      console.log(`[BATCH] ✅ ${lead.name}`);

      // Pausa 2 sec tra richieste per non sovraccaricare Gemini
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ id: lead.id, name: lead.name, status: "error", error: msg });
      console.log(`[BATCH] ❌ ${lead.name}: ${msg}`);
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  console.log(
    `[BATCH] Completato: ✅ ${ok} | ❌ ${errors} | ⏭ ${skipped} / ${leads.length}`
  );

  return NextResponse.json({
    total: leads.length,
    ok,
    errors,
    skipped,
    results,
  });
}
