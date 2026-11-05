/**
 * v3.103 (Alessio, 2026-11-05: "usando il client di posta non ha un tracking delle azioni"): i messaggi del Percorso
 * (contatto, follow-up, ponte, pagina) si mandano da qui e si registrano da soli.
 *   - email: parte dal CRM (stesso mittente delle mail di outreach), non dal client di posta;
 *   - WhatsApp e LinkedIn: il tocco sul pulsante apre l'app col testo e segna il messaggio come mandato.
 * Ogni invio lascia un'attività sull'azienda (canale, data, chi) e fa avanzare il percorso come "Mandato".
 */
import type { ActivityType } from "@prisma/client";
import { db } from "@/lib/db";
import { sendOutreachEmail } from "@/lib/email";
import { KINDS_RETE, decisioneRete } from "./rete";

export type Canale = "whatsapp" | "linkedin" | "email";

const TIPO: Record<Canale, ActivityType> = { whatsapp: "WHATSAPP_SENT", linkedin: "LINKEDIN_SENT", email: "EMAIL_OUTREACH" };
const NOME: Record<Canale, string> = { whatsapp: "WhatsApp", linkedin: "LinkedIn", email: "email" };

export type EsitoInvio = { ok: true } | { ok: false; errore: string; stato: number };

export async function registraInvio(voceId: string, canale: Canale, chi: string): Promise<EsitoInvio> {
  const v = await db.approvalItem.findUnique({ where: { id: voceId }, select: { id: true, kind: true, leadId: true, status: true, title: true, payload: true } });
  if (!v || !KINDS_RETE.includes(v.kind)) return { ok: false, errore: "Messaggio non trovato", stato: 404 };
  const p = (v.payload ?? {}) as { email?: string | null; messaggio?: string | null; azienda?: string | null; casoId?: string | null };

  if (canale === "email") {
    if (!p.email || !p.messaggio) return { ok: false, errore: "Manca l'indirizzo email o il testo", stato: 400 };
    if (v.status !== "IN_ATTESA") return { ok: false, errore: "Già mandato", stato: 409 };
    const lead = v.leadId ? await db.lead.findUnique({ where: { id: v.leadId }, select: { name: true, unsubscribed: true } }) : null;
    if (lead?.unsubscribed) return { ok: false, errore: "Si è disiscritto: non si scrive", stato: 403 };
    const azienda = p.azienda ?? lead?.name ?? "voi";
    const oggetto = p.casoId ? `Un caso studio per ${azienda}` : `Per ${azienda}`;
    const inviata = await sendOutreachEmail(p.email, oggetto, p.messaggio, v.leadId ?? undefined);
    if (!inviata) return { ok: false, errore: "L'email non è partita: riprova fra poco", stato: 502 };
  }

  // Segnato come mandato (una volta sola) e il percorso va avanti come col pulsante "Mandato".
  const r = await db.approvalItem.updateMany({
    where: { id: voceId, status: "IN_ATTESA" },
    data: { status: "APPROVATO", decidedAt: new Date(), decidedBy: chi, note: `Mandato via ${NOME[canale]}` },
  });
  if (r.count) await decisioneRete(voceId, "APPROVATO");
  if (v.leadId) {
    await db.activity.create({ data: { leadId: v.leadId, type: TIPO[canale], notes: `[Percorso] ${v.title} — via ${NOME[canale]}${canale === "email" ? ` a ${p.email}` : ""}`, createdBy: chi } });
    await db.lead.update({ where: { id: v.leadId }, data: { lastContactedAt: new Date() } }).catch(() => null);
  }
  return { ok: true };
}
