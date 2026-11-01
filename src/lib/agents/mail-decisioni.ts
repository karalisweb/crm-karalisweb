/**
 * La mail delle 7: le aziende su cui il giro veloce è finito e che aspettano la decisione di
 * Alessio. Per ognuna chi è, perché è lì e le 3 cose più forti trovate; il pulsante apre la scheda,
 * dove si decide con un tocco (Approfondisci / Scarta).
 */
import { db } from "@/lib/db";
import { sendInternalHtmlEmail } from "@/lib/email";
import { KIND_FASCICOLO_BASE } from "./turno";
import type { Leva } from "./tipi";
import { linkedinFermoPerChrome } from "./motore";

const MAX_IN_MAIL = 10;

// v3.84: se il controllo su LinkedIn è fermo per il Chrome del Mac, la mail lo dice per prima (anche senza aziende).
const AVVISO_CHROME = "Il CRM non riesce a cercare chi decide su LinkedIn: sul Mac Chrome chiede il permesso di aprire linkedin.com e nessuno risponde. Apri Chrome e, quando Claude lo chiede, scegli \"Consenti sempre\" (anche per facebook.com e instagram.com).";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function indirizzoCrm(): string {
  return (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://crm.karalisdemo.it").replace(/\/$/, "");
}

export async function inviaMailDecisioni(oggi = new Date()): Promise<{ inviata: boolean; aziende: number }> {
  const voci = await db.approvalItem.findMany({
    // Motore 121: in mail solo le aziende con il collegamento verificato (chi decide è collegato).
    where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA", leadId: { not: null }, lead: { agentReports: { some: { agent: "decision_maker" } } } },
    orderBy: { createdAt: "desc" },
    take: MAX_IN_MAIL,
    select: {
      createdAt: true,
      payload: true,
      lead: {
        select: {
          id: true, name: true, address: true, category: true, website: true,
          ritrovamenti: { take: 1, orderBy: { createdAt: "asc" }, select: { chiave: { select: { tipo: true, casoStudio: { select: { titolo: true } } } } } },
        },
      },
    },
  });
  const chromeFermo = await linkedinFermoPerChrome();
  if (!voci.length) {
    if (!chromeFermo) return { inviata: false, aziende: 0 };
    const inviata = await sendInternalHtmlEmail("CRM: LinkedIn fermo, serve un clic su Chrome", `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#111"><p style="font-size:15px">${esc(AVVISO_CHROME)}</p></div>`, AVVISO_CHROME);
    return { inviata, aziende: 0 };
  }
  const totale = await db.approvalItem.count({ where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA", lead: { agentReports: { some: { agent: "decision_maker" } } } } });
  const base = indirizzoCrm();
  const ieri = oggi.getTime() - 26 * 3600_000;

  const blocchi = voci.map((v) => {
    const l = v.lead!;
    const k = l.ritrovamenti[0]?.chiave;
    const perche = k?.tipo === "MANUALE" ? "l'hai aggiunta tu" : k?.casoStudio ? `simile a ${k.casoStudio.titolo}` : "trovata dalla ricerca";
    const leve = ((v.payload as { leve?: Leva[] })?.leve ?? []).slice(0, 3);
    const ponte = (v.payload as { collegamento?: string })?.collegamento ?? null;
    const nuova = v.createdAt.getTime() >= ieri;
    return {
      html: `<div style="border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:0 0 14px">
  <div style="font-size:16px;font-weight:600">${esc(l.name)}${nuova ? ' <span style="font-size:11px;color:#0b6e4f">nuova</span>' : ""}</div>
  <div style="font-size:13px;color:#666">${esc([l.category, l.address].filter(Boolean).join(" · "))} — ${esc(perche)}</div>
  ${ponte ? `<div style="font-size:13px;color:#0b6e4f;margin-top:4px">Ponte: ${esc(ponte)}</div>` : ""}
  ${leve.length ? `<ul style="font-size:14px;padding-left:18px;margin:8px 0">${leve.map((x) => `<li>${esc(x.testo)}</li>`).join("")}</ul>` : '<div style="font-size:14px;margin:8px 0">L’analisi veloce non ha trovato niente di forte.</div>'}
  <a href="${base}/aziende-trovate/${l.id}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">Apri e decidi</a>
</div>`,
      testo: `• ${l.name} (${perche})\n${leve.map((x) => `  - ${x.testo}`).join("\n")}\n  ${base}/aziende-trovate/${l.id}`,
    };
  });

  const titolo = `${totale} ${totale === 1 ? "azienda da decidere" : "aziende da decidere"}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#111">
<p style="font-size:15px">Buongiorno Alessio. Queste aziende hanno un ponte verso di te (chi decide è collegato a te su LinkedIn): apri la scheda e scegli <b>Approfondisci</b> (parte l'analisi completa) o <b>Scarta</b>.</p>
${chromeFermo ? `<p style="font-size:14px;background:#fff4e5;border:1px solid #f0b45b;border-radius:8px;padding:10px 12px">${esc(AVVISO_CHROME)}</p>` : ""}
${blocchi.map((b) => b.html).join("\n")}
${totale > voci.length ? `<p style="font-size:13px;color:#666">E altre ${totale - voci.length} in <a href="${base}/aziende-trovate">Aziende trovate</a>.</p>` : ""}
</div>`;
  const testo = `Buongiorno Alessio. ${chromeFermo ? `${AVVISO_CHROME}\n\n` : ""}${titolo}:\n\n${blocchi.map((b) => b.testo).join("\n\n")}`;
  const inviata = await sendInternalHtmlEmail(`CRM: ${titolo}`, html, testo);
  return { inviata, aziende: voci.length };
}
