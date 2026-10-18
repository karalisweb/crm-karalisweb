/**
 * La mail delle 7: le aziende su cui il giro veloce è finito e che aspettano la decisione di
 * Alessio. Per ognuna chi è, perché è lì e le 3 cose più forti trovate; il pulsante apre la scheda,
 * dove si decide con un tocco (Approfondisci / Scarta).
 */
import { db } from "@/lib/db";
import { sendInternalHtmlEmail } from "@/lib/email";
import { KIND_FASCICOLO_BASE } from "./turno";
import type { Leva } from "./tipi";

const MAX_IN_MAIL = 10;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function indirizzoCrm(): string {
  return (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://crm.karalisdemo.it").replace(/\/$/, "");
}

export async function inviaMailDecisioni(oggi = new Date()): Promise<{ inviata: boolean; aziende: number }> {
  const voci = await db.approvalItem.findMany({
    where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA", leadId: { not: null } },
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
  if (!voci.length) return { inviata: false, aziende: 0 };
  const totale = await db.approvalItem.count({ where: { kind: KIND_FASCICOLO_BASE, status: "IN_ATTESA" } });
  const base = indirizzoCrm();
  const ieri = oggi.getTime() - 26 * 3600_000;

  const blocchi = voci.map((v) => {
    const l = v.lead!;
    const k = l.ritrovamenti[0]?.chiave;
    const perche = k?.tipo === "MANUALE" ? "l'hai aggiunta tu" : k?.casoStudio ? `simile a ${k.casoStudio.titolo}` : "trovata dalla ricerca";
    const leve = ((v.payload as { leve?: Leva[] })?.leve ?? []).slice(0, 3);
    const nuova = v.createdAt.getTime() >= ieri;
    return {
      html: `<div style="border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:0 0 14px">
  <div style="font-size:16px;font-weight:600">${esc(l.name)}${nuova ? ' <span style="font-size:11px;color:#0b6e4f">nuova</span>' : ""}</div>
  <div style="font-size:13px;color:#666">${esc([l.category, l.address].filter(Boolean).join(" · "))} — ${esc(perche)}</div>
  ${leve.length ? `<ul style="font-size:14px;padding-left:18px;margin:8px 0">${leve.map((x) => `<li>${esc(x.testo)}</li>`).join("")}</ul>` : '<div style="font-size:14px;margin:8px 0">L’analisi veloce non ha trovato niente di forte.</div>'}
  <a href="${base}/aziende-trovate/${l.id}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">Apri e decidi</a>
</div>`,
      testo: `• ${l.name} (${perche})\n${leve.map((x) => `  - ${x.testo}`).join("\n")}\n  ${base}/aziende-trovate/${l.id}`,
    };
  });

  const titolo = `${totale} ${totale === 1 ? "azienda da decidere" : "aziende da decidere"}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#111">
<p style="font-size:15px">Buongiorno Alessio. L'analisi veloce è fatta su queste aziende: apri la scheda e scegli <b>Approfondisci</b> (parte l'analisi completa) o <b>Scarta</b>.</p>
${blocchi.map((b) => b.html).join("\n")}
${totale > voci.length ? `<p style="font-size:13px;color:#666">E altre ${totale - voci.length} in <a href="${base}/aziende-trovate">Aziende trovate</a>.</p>` : ""}
</div>`;
  const testo = `Buongiorno Alessio. ${titolo}:\n\n${blocchi.map((b) => b.testo).join("\n\n")}`;
  const inviata = await sendInternalHtmlEmail(`CRM: ${titolo}`, html, testo);
  return { inviata, aziende: voci.length };
}
