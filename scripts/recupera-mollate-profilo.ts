/**
 * v3.135 (2026-11-19) — una tantum. Dall'8 novembre i link di Google arrivavano come "google.com/goto?…" e il CRM
 * non riconosceva i profili LinkedIn/Instagram di chi decide: le aziende venivano mollate per "nessun profilo".
 * Per ognuna rifà la ricerca dei profili (col link sistemato); se ora c'è un profilo l'azienda torna al passo 2
 * (Collegamento). Le altre restano mollate.
 *
 * Sul server: set -a; . ./.env; . ./.env.local; set +a; npx tsx scripts/recupera-mollate-profilo.ts [--fai]
 * Senza --fai cerca i profili e dice cosa farebbe, senza rimettere le aziende nel Percorso.
 */
import { db } from "@/lib/db";
import { cercaChiDecideServer } from "@/lib/agents/chi-decide-server";
import { profiliDecisore } from "@/lib/agents/rete";
import { STRADA_COLLEGARE } from "@/lib/agents/rete-regole";

const FAI = process.argv.includes("--fai");

async function main() {
  const oggi = new Date();
  const mollate = await db.lavorazione.findMany({
    where: { fase: "ELIMINATA", note: { startsWith: "Mollata dal CRM: Nessun profilo" }, updatedAt: { gte: new Date("2026-11-08T00:00:00Z") } },
    select: { id: true, leadId: true, lead: { select: { name: true } } },
    orderBy: { updatedAt: "asc" },
  });
  console.log(`Aziende mollate per "nessun profilo" dall'8/11: ${mollate.length}${FAI ? "" : " (prova, non cambio niente nel Percorso)"}`);
  let riprese = 0;
  for (const m of mollate) {
    // L'agenzia stessa non è un cliente da cercare.
    if (/karalisweb/i.test(m.lead.name)) continue;
    const r = await cercaChiDecideServer(m.leadId, oggi, { forza: true, relazioneDiretta: true });
    const p = await profiliDecisore(m.leadId);
    const trovato = !!(p.linkedin || p.instagram);
    console.log(`${trovato ? "RIPRESA " : "resta   "} ${m.lead.name} — ${p.nome ?? "?"} | LI ${p.linkedin ?? "-"} | IG ${p.instagram ?? "-"}${r.fatto ? "" : ` (ricerca: ${r.motivo})`}`);
    if (!trovato) continue;
    riprese++;
    if (FAI) {
      await db.lavorazione.update({
        where: { id: m.id },
        data: { fase: "MAPPATA", strada: STRADA_COLLEGARE, decisore: p.nome, note: "Ripresa v3.135: era stata mollata per un guasto dei link di Google (il profilo c'era)" },
      });
    }
  }
  console.log(`Con un profilo adesso: ${riprese}${FAI ? " — tornate al passo 2" : ""}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
