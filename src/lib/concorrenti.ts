/**
 * v3.97 (Alessio, 2026-11-05: "sì, toglili"): i concorrenti di Karalisweb non sono clienti. La ricerca "aziende come
 * un tuo cliente" partendo da un cliente di consulenza (es. Liliana Mitroi) trovava consulenti di marketing e coach
 * di LinkedIn: chi vende quello che vende Alessio. Qui si riconoscono da nome, categoria e sito dell'azienda (non dal
 * ruolo di una persona: il responsabile marketing di un hotel non fa dell'hotel un concorrente).
 */

const NORMALIZZA = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Mestieri di Karalisweb: chi li fa è un concorrente. Parole intere, sul testo normalizzato. */
const MESTIERI: { etichetta: string; re: RegExp }[] = [
  { etichetta: "marketing", re: /\b(digital|web|social|performance|growth|content|email|inbound) marketing\b/ },
  { etichetta: "marketing", re: /\b(consulent[ei]|consulenza|agenzia|esperto|esperta|specialist[ai]?|strategist|manager|consultant|agency) (di |del |in |per il )?(digital |web )?marketing\b/ },
  { etichetta: "marketing", re: /\bmarketing (agency|consultant|specialist|strategist|digitale|online)\b/ },
  { etichetta: "agenzia web", re: /\b(web ?agency|agenzia web|agenzia digitale|digital agency|agenzia di comunicazione|agenzia comunicazione|agenzia pubblicitaria|agenzia di pubblicita|creative agency|agenzia creativa)\b/ },
  { etichetta: "siti web", re: /\b(web ?design(er)?|web developer|realizzazione siti( web)?|sviluppo siti( web)?|creazione siti( web)?|siti web e|webmaster)\b/ },
  { etichetta: "social media", re: /\b(social media (manager|marketing|agency|strategist|specialist)|gestione social)\b/ },
  { etichetta: "SEO / ads", re: /\b(seo (specialist|consultant|agency|copywriter)|consulente seo|posizionamento (sui motori|su google)|google ads (specialist|expert|consultant)|meta ads|facebook ads (specialist|expert))\b/ },
  { etichetta: "formazione LinkedIn", re: /\b(linkedin (coach|trainer|strategist|specialist|expert|consultant|sales navigator)|corsi linkedin|sales navigator)\b/ },
  { etichetta: "comunicazione", re: /\b(comunicazione e marketing|marketing e comunicazione|consulente (di |della )?comunicazione|ufficio stampa e comunicazione)\b/ },
];

export interface DatiAzienda {
  nome?: string | null;
  categoria?: string | null;
  sito?: string | null;
}

/** Restituisce cosa fa il concorrente (es. "marketing", "siti web") o null se non lo è. */
export function rilevaConcorrente(a: DatiAzienda): string | null {
  const testo = NORMALIZZA([a.nome, a.categoria, a.sito?.replace(/^https?:\/\//, "").replace(/[.\-/]/g, " ")].filter(Boolean).join(" · "));
  if (!testo) return null;
  for (const m of MESTIERI) if (m.re.test(testo)) return m.etichetta;
  return null;
}

export const NOTA_CONCORRENTE = (cosa: string) => `Concorrente (${cosa}): fa il lavoro di Karalisweb, fuori target. Tolto in automatico.`;

/**
 * v3.126 (Alessio, 2026-11-10: "quando trovi un collega attraverso il caso studio di Liliana devi parlare di collaborare
 * e far capire che puoi portare valore aggiunto"): il caso di una consulente parla ai colleghi di Alessio (consulenti,
 * coach, formatori, chi fa marketing o comunicazione). Chi arriva da un caso così non si toglie: gli si propone di
 * collaborare. Si riconosce dal settore del caso (Liliana: "Consulenza B2B").
 */
const SETTORE_COLLEGHI = /\b(consulen\w*|coach\w*|formazion\w*|formator\w*|marketing|comunicazion\w*|posizionamento|personal brand\w*)\b/;
export function casoDaColleghi(caso: { settore?: string | null } | null | undefined): boolean {
  return !!caso?.settore && SETTORE_COLLEGHI.test(NORMALIZZA(caso.settore));
}

export const NOTA_COLLEGA = "Collega trovato dal caso studio di una consulente: non si toglie, gli si propone di collaborare.";

/** L'azienda è stata trovata da una ricerca di un caso "da colleghi"? (query sola lettura) */
export async function trovataDaColleghi(leadId: string): Promise<boolean> {
  const { db } = await import("@/lib/db");
  const r = await db.ritrovamento.findMany({ where: { leadId }, select: { chiave: { select: { casoStudio: { select: { settore: true } } } } }, take: 20 });
  return r.some((x) => casoDaColleghi(x.chiave.casoStudio));
}

/** La chiave di ricerca parte da un caso "da colleghi"? */
export async function chiaveDaColleghi(chiaveId: string | null | undefined): Promise<boolean> {
  if (!chiaveId) return false;
  const { db } = await import("@/lib/db");
  const k = await db.chiaveRicerca.findUnique({ where: { id: chiaveId }, select: { casoStudio: { select: { settore: true } } } });
  return casoDaColleghi(k?.casoStudio);
}

/**
 * Pulizia di quelli già entrati: le aziende ancora in gioco che sono concorrenti vanno in NON_TARGET e le loro voci in
 * attesa (Da decidere, messaggi, commenti) si chiudono. Idempotente: gira prima della ricerca e prima della mail delle 7.
 */
export const SCARTATA_CONCORRENTE = "crm_concorrente";
const STADI_FINITI = ["NON_TARGET", "CLIENTE", "PERSO", "ARCHIVIATO"] as const;

export async function togliConcorrenti(): Promise<number> {
  const { db } = await import("@/lib/db");
  const aziende = await db.lead.findMany({
    where: { pipelineStage: { notIn: [...STADI_FINITI] } },
    select: { id: true, name: true, category: true, website: true, notes: true },
  });
  let tolte = 0;
  for (const a of aziende) {
    const cosa = rilevaConcorrente({ nome: a.name, categoria: a.category, sito: a.website });
    if (!cosa) continue;
    // v3.126: i colleghi arrivati dal caso di una consulente restano: con loro si collabora.
    if (await trovataDaColleghi(a.id)) continue;
    const nota = NOTA_CONCORRENTE(cosa);
    await db.lead.update({ where: { id: a.id }, data: { pipelineStage: "NON_TARGET", notes: a.notes ? `${a.notes}\n${nota}` : nota } });
    await db.approvalItem.updateMany({ where: { leadId: a.id, status: "IN_ATTESA" }, data: { status: "SCARTATO", decidedAt: new Date(), decidedBy: SCARTATA_CONCORRENTE, note: nota } });
    tolte++;
  }
  await rimettiColleghi().catch((e) => console.warn("[concorrenti] colleghi da rimettere:", e instanceof Error ? e.message : e));
  return tolte;
}

/**
 * v3.126: i colleghi già tolti come concorrenti (v3.97) ma trovati dal caso di una consulente tornano in gioco, con le
 * voci chiuse dal CRM riaperte. Una volta sola: la nota NOTA_COLLEGA li segna.
 */
export async function rimettiColleghi(): Promise<number> {
  const { db } = await import("@/lib/db");
  const tolte = await db.lead.findMany({
    where: { pipelineStage: "NON_TARGET", notes: { contains: "fa il lavoro di Karalisweb, fuori target" }, NOT: { notes: { contains: NOTA_COLLEGA } } },
    select: { id: true, notes: true },
  });
  let rimesse = 0;
  for (const a of tolte) {
    if (!(await trovataDaColleghi(a.id))) continue;
    await db.lead.update({ where: { id: a.id }, data: { pipelineStage: "DA_ANALIZZARE", notes: `${a.notes ?? ""}\n${NOTA_COLLEGA}` } });
    await db.approvalItem.updateMany({ where: { leadId: a.id, status: "SCARTATO", decidedBy: SCARTATA_CONCORRENTE }, data: { status: "IN_ATTESA", decidedAt: null, decidedBy: null, note: NOTA_COLLEGA } });
    rimesse++;
  }
  return rimesse;
}
