"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Globe, MessageCircle, Star, Video, Phone } from "lucide-react";
import { toast } from "sonner";
import { LeveList } from "@/components/agents/leve-list";
import { SERVIZI, type Leva } from "@/lib/agents/tipi";

export interface VoceCassetta {
  id: string;
  kind: string;
  title: string;
  status: "IN_ATTESA" | "APPROVATO" | "SCARTATO";
  createdAt: string;
  decidedAt: string | null;
  payload: Record<string, unknown>;
  lead: { id: string; name: string; website: string | null; category: string | null; googleRating: string | number | null; googleReviewsCount: number | null } | null;
  bniChapter: { id: string; name: string; city: string | null } | null;
  bniMembro: { id: string; name: string; phone: string | null; company: string | null; profession: string | null; chapter: string | null } | null;
}

/** Etichette dei pulsanti per tipo di voce: cosa vuol dire "sì" e "no". */
export const AZIONI: Record<string, { si: string; no: string; etichetta: string }> = {
  FASCICOLO_BASE: { si: "Approfondisci", no: "Scarta", etichetta: "Da approfondire?" },
  SCHEDA_CONTATTO: { si: "Lo contatto", no: "Scarta", etichetta: "Pronta per il contatto" },
  AZIONE_BNI: { si: "Prepara i messaggi", no: "Non ora", etichetta: "BNI · azione" },
  MESSAGGIO_BNI: { si: "Mandato", no: "Scarta", etichetta: "BNI · messaggio" },
};

function copia(testo: string) {
  navigator.clipboard.writeText(testo).then(
    () => toast.success("Copiato"),
    () => toast.error("Non riesco a copiare: seleziona il testo a mano")
  );
}

function linkWhatsApp(telefono: string | null | undefined, testo: string): string | null {
  if (!telefono) return null;
  let cifre = telefono.replace(/\D/g, "");
  if (cifre.startsWith("00")) cifre = cifre.slice(2);
  if (cifre.length === 10 && cifre.startsWith("3")) cifre = `39${cifre}`;
  return cifre.length >= 11 ? `https://wa.me/${cifre}?text=${encodeURIComponent(testo)}` : null;
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function Intestazione({ v }: { v: VoceCassetta }) {
  if (v.lead) {
    const rating = v.lead.googleRating != null ? Number(v.lead.googleRating) : null;
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/leads/${v.lead.id}`} className="font-semibold hover:underline break-words">{v.lead.name}</Link>
          <Badge variant="secondary" className="text-[10px]">{AZIONI[v.kind]?.etichetta ?? v.kind}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
          {v.lead.category && <span>{v.lead.category}</span>}
          {rating != null && (
            <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {rating.toFixed(1)} ({v.lead.googleReviewsCount ?? 0})</span>
          )}
          {v.lead.website && (
            <a href={v.lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline min-w-0 truncate">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{v.lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/rete-bni" className="font-semibold hover:underline break-words">{v.title}</Link>
        <Badge variant="secondary" className="text-[10px]">{AZIONI[v.kind]?.etichetta ?? v.kind}</Badge>
      </div>
      {v.bniMembro && (
        <div className="text-xs text-muted-foreground mt-1">
          {[v.bniMembro.profession, v.bniMembro.company, v.bniMembro.chapter].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function Blocco({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{titolo}</div>
      <div className="mt-1 text-sm leading-snug break-words">{children}</div>
    </div>
  );
}

function Messaggio({ testo, oggetto, telefono }: { testo: string; oggetto?: string; telefono?: string | null }) {
  const completo = oggetto ? `${oggetto}\n\n${testo}` : testo;
  const wa = linkWhatsApp(telefono, testo);
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      {oggetto && <div className="text-sm font-medium break-words">{oggetto}</div>}
      <p className="text-sm whitespace-pre-wrap break-words">{testo}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copia(completo)}><Copy className="h-3.5 w-3.5 mr-1" /> Copia</Button>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Apri WhatsApp</Button>
          </a>
        )}
      </div>
    </div>
  );
}

function CorpoSchedaContatto({ p }: { p: Record<string, unknown> }) {
  const leve = (p.schedaLeve ?? {}) as Record<string, unknown>;
  const ag = (p.aggancio ?? {}) as Record<string, unknown>;
  const video = (p.video ?? null) as Record<string, unknown> | null;
  const dm = (p.decisionMaker ?? null) as Record<string, unknown> | null;
  const persone = arr<{ nome?: string; ruolo?: string; profilo?: string }>(dm?.persone);
  const avvisi = arr<{ term?: string }>(ag.avvisiCopy);
  const servizio = s(leve.servizio_da_proporre) as keyof typeof SERVIZI;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {s(leve.temperatura) && <Badge variant="outline">Temperatura: {s(leve.temperatura)}</Badge>}
        {SERVIZI[servizio] && <Badge variant="outline">Proporre prima: {SERVIZI[servizio]}</Badge>}
      </div>
      <LeveList leve={arr<Leva>(p.leve)} />
      {s(leve.apertura_chiamata) && <Blocco titolo="Come aprire la chiamata">{s(leve.apertura_chiamata)}</Blocco>}
      {arr<string>(leve.domande).length > 0 && (
        <Blocco titolo="Domande da fare">
          <ul className="list-disc pl-4 space-y-0.5">{arr<string>(leve.domande).map((d, i) => <li key={i}>{d}</li>)}</ul>
        </Blocco>
      )}
      {s(leve.obiezione_probabile) && (
        <Blocco titolo="Obiezione probabile">
          {s(leve.obiezione_probabile)}
          {s(leve.risposta_obiezione) && <div className="text-muted-foreground mt-0.5">Risposta: {s(leve.risposta_obiezione)}</div>}
        </Blocco>
      )}
      {persone.length > 0 && (
        <Blocco titolo="Chi decide">
          {persone.map((x, i) => (
            <div key={i}>
              {x.nome} {x.ruolo && <span className="text-muted-foreground">— {x.ruolo}</span>}{" "}
              {x.profilo && <a className="text-xs underline" href={x.profilo} target="_blank" rel="noopener noreferrer">profilo</a>}
            </div>
          ))}
        </Blocco>
      )}
      {s(ag.messaggio) && (
        <Blocco titolo={`Messaggio (${s(ag.canale) || "canale"} a ${s(ag.destinatario) || "titolare"})`}>
          <Messaggio testo={s(ag.messaggio)} oggetto={s(ag.oggetto) || undefined} />
          {avvisi.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Attenzione al tono: {avvisi.map((a) => a.term).filter(Boolean).join(", ")}
            </div>
          )}
        </Blocco>
      )}
      {video && arr(video.scene).length > 0 && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium flex items-center gap-1"><Video className="h-4 w-4" /> Scaletta del video: {s(video.titolo)}</summary>
          <div className="mt-2 space-y-2 text-sm">
            <p><span className="text-muted-foreground">Apertura:</span> {s(video.apertura)}</p>
            {arr<{ ordine: number; cosa_mostrare: string; dove: string; cosa_dire: string; secondi: number }>(video.scene).map((sc) => (
              <div key={sc.ordine} className="border-l-2 border-primary/40 pl-2">
                <div className="font-medium">{sc.ordine}. {sc.cosa_mostrare} <span className="text-xs text-muted-foreground">({sc.secondi}s)</span></div>
                <div className="text-xs text-muted-foreground break-words">{sc.dove}</div>
                <div>{sc.cosa_dire}</div>
              </div>
            ))}
            <p><span className="text-muted-foreground">Chiusura:</span> {s(video.chiusura)}</p>
          </div>
        </details>
      )}
    </div>
  );
}

function CorpoAzioneBni({ p }: { p: Record<string, unknown> }) {
  const cap = (p.capitolo ?? {}) as Record<string, unknown>;
  const dest = arr<{ nome: string; ruolo: string; telefono: string | null }>(p.destinatari);
  return (
    <div className="space-y-3">
      <p className="text-sm">{s(p.motivo)}</p>
      {(s(cap.giorno) || s(cap.formato)) && (
        <div className="text-xs text-muted-foreground">
          {[s(cap.citta), s(cap.formato).toLowerCase(), [s(cap.giorno), s(cap.ora)].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
        </div>
      )}
      {dest.length > 0 && (
        <Blocco titolo="A chi scrivere">
          {dest.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-2">
              <span>{d.nome}</span>
              <span className="text-muted-foreground text-xs">{d.ruolo}</span>
              {d.telefono && <span className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{d.telefono}</span>}
            </div>
          ))}
        </Blocco>
      )}
    </div>
  );
}

function CorpoMessaggioBni({ p, telefono }: { p: Record<string, unknown>; telefono: string | null }) {
  return (
    <div className="space-y-2">
      <Messaggio testo={s(p.messaggio)} telefono={telefono ?? s(p.telefono)} />
      {s(p.nota_per_alessio) && <p className="text-xs text-muted-foreground">Per te: {s(p.nota_per_alessio)}</p>}
    </div>
  );
}

export function CorpoVoce({ v }: { v: VoceCassetta }) {
  return (
    <>
      <Intestazione v={v} />
      {v.kind === "FASCICOLO_BASE" && <LeveList leve={arr<Leva>(v.payload.leve)} />}
      {v.kind === "SCHEDA_CONTATTO" && <CorpoSchedaContatto p={v.payload} />}
      {v.kind === "AZIONE_BNI" && <CorpoAzioneBni p={v.payload} />}
      {v.kind === "MESSAGGIO_BNI" && <CorpoMessaggioBni p={v.payload} telefono={v.bniMembro?.phone ?? null} />}
    </>
  );
}
