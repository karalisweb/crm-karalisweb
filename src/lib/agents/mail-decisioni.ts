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

const CANALI: Record<string, string> = { google: "Google", maps: "Google Maps", linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" };

const riga = (etichetta: string, valore: string) =>
  `<tr><td style="vertical-align:top;padding:2px 10px 2px 0;color:#666;white-space:nowrap">${etichetta}</td><td style="vertical-align:top;padding:2px 0">${valore}</td></tr>`;

/** Le prime frasi di un testo, senza superare `max` caratteri (taglia su una frase intera quando può). */
function corto(t: string, max = 260): string {
  const pulito = t.replace(/\s+/g, " ").trim();
  if (pulito.length <= max) return pulito;
  const frasi = pulito.match(/[^.!?]+[.!?]+/g) ?? [];
  let out = "";
  for (const f of frasi) {
    if ((out + f).length > max) break;
    out += f;
  }
  return out.trim() || `${pulito.slice(0, max - 1).trim()}…`;
}

type LeadMail = {
  name: string; category: string | null;
  ritrovamenti: { canale: string; chiave: { tipo: string; valore: string; casoStudio: { titolo: string; aziendaNome: string | null; settore: string | null; personaNome: string | null } | null; bniMembro: { name: string } | null } }[];
  agentReports: { agent: string; summary: string; findings: unknown }[];
};

/**
 * v3.94 (richiesta di Alessio, 2026-11-04): per ogni azienda la mail dice da dove arriva (Google, Maps, LinkedIn…
 * e cercando cosa), cosa fa, perché sentirla e a chi chiedere il contatto. Tutto da dati già raccolti: niente costi.
 */
export function schedaAzienda(l: LeadMail): {
  origine: string; cosaFanno: string; perche: string; chiDecide: { testo: string; profilo: string | null } | null; chiedereA: string | null;
} {
  const r = l.ritrovamenti[0];
  const k = r?.chiave;
  const canale = r ? CANALI[r.canale] ?? r.canale : null;
  const cliente = k?.casoStudio?.aziendaNome ?? k?.casoStudio?.titolo.split(":")[0] ?? null;
  let origine: string;
  if (!k) origine = "trovata dalla ricerca";
  else if (k.tipo === "MANUALE") origine = `l'hai aggiunta tu${canale ? ` (scheda ${canale})` : ""}`;
  else if (k.tipo === "RETE_MEMBRO") origine = `${canale ?? "LinkedIn"}: tra i contatti di ${k.bniMembro?.name ?? k.valore} (BNI)`;
  else if (k.tipo === "PERSONA") origine = `${canale ?? "LinkedIn"}: cercando titolari come ${k.casoStudio?.personaNome ?? k.valore}${cliente ? ` di ${cliente}` : ""}`;
  else if (k.tipo === "SETTORE") origine = `${canale ?? "ricerca"}: cercando "${k.valore}"`;
  else origine = `${canale ?? "ricerca"}: cercando aziende come ${cliente ?? k.valore}`;

  const rep = (a: string) => l.agentReports.find((x) => x.agent === a);
  const sintesi = (rep("lettore")?.findings as { sintesi?: string } | null)?.sintesi;
  const descrGoogle = (rep("scheda_google")?.findings as { descrizione?: string } | null)?.descrizione;
  const li = rep("linkedin_azienda");
  const cosaFanno = sintesi ? corto(sintesi)
    : descrGoogle ? `${corto(descrGoogle, 200)} (dalla scheda Google)`
    : li && (li.findings as { esiste?: boolean } | null)?.esiste ? corto(li.summary, 200)
    : l.category ? `${l.category}: il sito non l'abbiamo letto, apri la scheda per saperne di più` : "Non si sa ancora: apri la scheda";

  const perche = k?.tipo === "RETE_MEMBRO"
    ? `È nella rete di ${k.bniMembro?.name ?? k.valore}, che può presentarti: un contatto caldo invece di uno a freddo`
    : cliente
      ? `Fa lo stesso lavoro di ${cliente}${k?.casoStudio?.settore ? ` (${k.casoStudio.settore})` : ""}, tuo cliente: hai già il caso da raccontargli`
      : "Chi decide è collegato a te: il contatto passa da una persona che conosci";

  const persone = (rep("decision_maker")?.findings as { persone?: { nome?: string; ruolo?: string; profilo?: string; grado?: number | string; contattiInComune?: unknown[] }[] } | null)?.persone ?? [];
  const p = persone.find((x) => x?.nome);
  let chiDecide: { testo: string; profilo: string | null } | null = null;
  let chiedereA: string | null = null;
  if (p?.nome) {
    const grado = typeof p.grado === "string" ? parseInt(p.grado, 10) : p.grado;
    chiDecide = { testo: `${p.nome}${p.ruolo ? `, ${p.ruolo}` : ""}${grado === 1 ? " (è già un tuo contatto)" : ""}`, profilo: typeof p.profilo === "string" ? p.profilo : null };
    const comuni = (Array.isArray(p.contattiInComune) ? p.contattiInComune : [])
      .map((x) => (typeof x === "string" ? x : (x as { nome?: string })?.nome ?? null))
      .filter((x): x is string => !!x);
    if (grado === 1) chiedereA = "nessuno: scrivigli direttamente";
    else if (comuni.length) chiedereA = comuni.slice(0, 3).join(", ") + (comuni.length > 3 ? ` (e altri ${comuni.length - 3})` : "");
  }
  return { origine, cosaFanno, perche, chiDecide, chiedereA };
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
          ritrovamenti: {
            take: 1, orderBy: { createdAt: "asc" },
            select: { canale: true, chiave: { select: { tipo: true, valore: true, casoStudio: { select: { titolo: true, aziendaNome: true, settore: true, personaNome: true } }, bniMembro: { select: { name: true } } } } },
          },
          agentReports: {
            where: { agent: { in: ["lettore", "scheda_google", "linkedin_azienda", "decision_maker"] } },
            orderBy: { collectedAt: "desc" },
            select: { agent: true, summary: true, findings: true },
          },
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
    const scheda = schedaAzienda(l);
    const leve = ((v.payload as { leve?: Leva[] })?.leve ?? []).slice(0, 3);
    const ponte = (v.payload as { collegamento?: string })?.collegamento ?? null;
    const nuova = v.createdAt.getTime() >= ieri;
    return {
      html: `<div style="border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:0 0 14px">
  <div style="font-size:16px;font-weight:600">${esc(l.name)}${nuova ? ' <span style="font-size:11px;color:#0b6e4f">nuova</span>' : ""}</div>
  <div style="font-size:13px;color:#666">${esc([l.category, l.address].filter(Boolean).join(" · "))} — ${esc(perche)}</div>
  ${ponte ? `<div style="font-size:13px;color:#0b6e4f;margin-top:4px">Ponte: ${esc(ponte)}</div>` : ""}
  <table style="font-size:14px;margin:10px 0 4px;border-collapse:collapse">
    ${riga("Da dove arriva", esc(scheda.origine))}
    ${riga("Cosa fanno", esc(scheda.cosaFanno))}
    ${riga("Perché sentirli", esc(scheda.perche))}
    ${scheda.chiDecide ? riga("Chi decide", scheda.chiDecide.profilo ? `<a href="${esc(scheda.chiDecide.profilo)}" style="color:#0a66c2">${esc(scheda.chiDecide.testo)}</a>` : esc(scheda.chiDecide.testo)) : ""}
    ${scheda.chiedereA ? riga("Chiedi il contatto a", esc(scheda.chiedereA)) : ""}
  </table>
  ${leve.length ? '<div style="font-size:13px;color:#666;margin-top:8px">Cosa ha visto il CRM:</div>' : ""}
  ${leve.length ? `<ul style="font-size:14px;padding-left:18px;margin:8px 0">${leve.map((x) => `<li>${esc(x.testo)}</li>`).join("")}</ul>` : '<div style="font-size:14px;margin:8px 0">L’analisi veloce non ha trovato niente di forte.</div>'}
  <a href="${base}/aziende-trovate/${l.id}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">Apri e decidi</a>
</div>`,
      testo: `• ${l.name} (${perche})\n  Da dove arriva: ${scheda.origine}\n  Cosa fanno: ${scheda.cosaFanno}\n  Perché sentirli: ${scheda.perche}\n${scheda.chiDecide ? `  Chi decide: ${scheda.chiDecide.testo}${scheda.chiDecide.profilo ? ` (${scheda.chiDecide.profilo})` : ""}\n` : ""}${scheda.chiedereA ? `  Chiedi il contatto a: ${scheda.chiedereA}\n` : ""}${leve.map((x) => `  - ${x.testo}`).join("\n")}\n  ${base}/aziende-trovate/${l.id}`,
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
