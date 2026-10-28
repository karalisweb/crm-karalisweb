import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { applicaDecisioneVendita } from "@/lib/vendita/trattative";
import { KIND_PRESENTAZIONE_BNI, presentazioneChiesta } from "@/lib/agents/motore";
import { decisioneRete } from "@/lib/agents/rete";
import { decisioneMsd } from "@/lib/agents/msd";

/**
 * POST /api/cassetta/[id] — la decisione di Alessio su una voce in cassetta.
 * Body: { decisione: "APPROVATO" | "SCARTATO", note?: string }
 *
 * Cosa vuol dire approvare, per tipo:
 *   FASCICOLO_BASE  → "approfondisci": partono gli agenti a pagamento e quelli di browser;
 *   SCHEDA_CONTATTO → "contatto": Alessio usa scheda e messaggio (l'invio lo fa lui);
 *   MESSAGGIO_BNI   → "mandato": la richiesta di 121 è partita (Alessio fissa poi la data);
 *   VISITA_CAPITOLO → "mandato": la visita al capitolo è chiesta (capitolo in "visita pianificata");
 *   PREPARAZIONE_121→ "letto";
 *   PRESENTAZIONE_BNI → "mandato": la richiesta di presentazione al membro è partita;
 *   DOPO_121        → "fatto" (il promemoria del vocale);
 *   RETE_PONTE / RETE_DIRETTO → "mandato" (presentazione chiesta / contatto scritto); "non ora" = ponte successivo;
 *   RETE_PROMEMORIA → "mandato"; COMMENTO_LINKEDIN → "fatto" (al 5° il contatto diretto);
 *   PROPOSTA_MSD → "mandata" (membro in "Offerta inviata", richiamo fra 7 giorni);
 *   MSD_FUORI_TARGET → "fai la proposta lo stesso"; RICHIAMO_MSD → "mandato" (poi in attesa).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const decisione = body?.decisione;
  if (decisione !== "APPROVATO" && decisione !== "SCARTATO") {
    return NextResponse.json({ error: "decisione deve essere APPROVATO o SCARTATO" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;

  // Si decide una volta sola: una voce già decisa non cambia.
  const r = await db.approvalItem.updateMany({
    where: { id, status: "IN_ATTESA" },
    data: { status: decisione, note, decidedAt: new Date(), decidedBy: gate.userId },
  });
  if (r.count === 0) {
    const esiste = await db.approvalItem.findUnique({ where: { id }, select: { status: true } });
    return NextResponse.json(
      { error: esiste ? `Già decisa (${esiste.status})` : "Voce non trovata" },
      { status: esiste ? 409 : 404 }
    );
  }
  // Pipeline di vendita: la decisione fa avanzare la trattativa (lettera inviata, recall fatto…).
  const decisa = await db.approvalItem.findUnique({ where: { id }, select: { kind: true, trattativaId: true, payload: true } });
  if (decisa?.trattativaId) await applicaDecisioneVendita(decisa, decisione, gate.userId);
  // La rete al centro: "Mandato" fa avanzare l'azienda in lavorazione, "Non ora" passa al ponte successivo.
  await decisioneRete(id, decisione);
  // Il seguito MSD del 121: la proposta mandata, la proposta comunque, il richiamo.
  await decisioneMsd(id, decisione);

  // Effetto collaterale piccolo e reversibile: un messaggio BNI mandato sposta il membro
  // da "da avvicinare" a "richiesta 121" (solo se era ancora all'inizio).
  if (decisione === "APPROVATO") {
    const voce = await db.approvalItem.findUnique({ where: { id }, select: { kind: true, bniMembroId: true, bniChapterId: true } });
    if (voce?.kind === "VISITA_CAPITOLO" && voce.bniChapterId) {
      await db.bniChapter.updateMany({ where: { id: voce.bniChapterId, visitStatus: { notIn: ["VISITATO"] } }, data: { visitStatus: "VISITA_PIANIFICATA" } });
    }
    if (voce?.kind === KIND_PRESENTAZIONE_BNI) await presentazioneChiesta(id);
    if (voce?.kind === "MESSAGGIO_BNI" && voce.bniMembroId) {
      await db.bniMembro.updateMany({
        where: { id: voce.bniMembroId, bniStage: "DA_AVVICINARE" },
        data: { bniStage: "RICHIESTA_121" },
      });
    }
  }
  return NextResponse.json({ success: true, stato: decisione });
}
