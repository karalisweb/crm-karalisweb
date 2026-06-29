import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";
import { extractContactEmail } from "@/lib/audit/email-finder";
import { safeFetch } from "@/lib/safe-fetch";

/**
 * POST /api/leads/[id]/find-email
 *
 * Cerca l'email di contatto del lead SUL MOMENTO (dalla schermata di approvazione),
 * quando l'estrazione durante l'audit non l'aveva trovata. Stessa strategia del cron
 * recover-emails ma su un singolo lead: homepage → /contatti → /contattaci.
 * Se la trova la salva su lead.email e la ritorna; altrimenti { email: null }.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function tryPage(url: string, host: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await safeFetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    if (!res.ok) return null;
    return extractContactEmail(await res.text(), host);
  } catch {
    return null;
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const lead = await db.lead.findUnique({
      where: { id },
      select: { id: true, name: true, website: true, email: true },
    });
    if (!lead) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
    if (lead.email) return NextResponse.json({ email: lead.email, alreadyHad: true });
    if (!lead.website) {
      return NextResponse.json({ error: "Il lead non ha un sito da cui cercare l'email" }, { status: 400 });
    }

    let url = lead.website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;

    let origin: string, host: string;
    try {
      origin = new URL(url).origin;
      host = new URL(url).hostname;
    } catch {
      return NextResponse.json({ error: "Sito del lead non valido" }, { status: 400 });
    }

    // On-demand: proviamo la home + i path "contatti" più comuni (anche varianti EN),
    // con early-exit appena ne troviamo una.
    let email = await tryPage(url, host, 10_000);
    const paths = ["/contatti", "/contattaci", "/contatto", "/contact", "/contact-us", "/chi-siamo"];
    for (const p of paths) {
      if (email) break;
      email = await tryPage(`${origin}${p}`, host, 7_000);
    }

    if (!email) {
      // Stampiglia il tentativo fallito → il cron lo mette in cooldown.
      await db.lead.update({ where: { id: lead.id }, data: { emailCheckedAt: new Date() } });
      return NextResponse.json({ email: null });
    }

    await db.lead.update({ where: { id: lead.id }, data: { email, emailCheckedAt: new Date() } });
    console.log(`[FIND-EMAIL] ${lead.name}: ${email}`);
    return NextResponse.json({ email });
  } catch (error) {
    console.error("[API] find-email error:", error);
    return NextResponse.json({ error: "Errore nella ricerca email" }, { status: 500 });
  }
}
