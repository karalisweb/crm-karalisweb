"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Globe, Mail, MessageCircle, Star, Video, Phone } from "lucide-react";
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
  trattativa?: { id: string; nome: string; stadio: string; origine: string; telefono: string | null; email: string | null; referente: string | null } | null;
}

/** Etichette dei pulsanti per tipo di voce: cosa vuol dire "sì" e "no". */
export const AZIONI: Record<string, { si: string; no: string; etichetta: string }> = {
  FASCICOLO_BASE: { si: "Approfondisci", no: "Scarta", etichetta: "Da approfondire?" },
  SCHEDA_CONTATTO: { si: "Lo contatto", no: "Scarta", etichetta: "Pronta per il contatto" },
  AZIONE_BNI: { si: "Prepara i messaggi", no: "Non ora", etichetta: "BNI · azione" },
  MESSAGGIO_BNI: { si: "Mandato", no: "Non ora", etichetta: "BNI · richiesta di 121" },
  VISITA_CAPITOLO: { si: "Mandato", no: "Non ora", etichetta: "BNI · visita al capitolo" },
  PREPARAZIONE_121: { si: "Letto", no: "Non serve", etichetta: "BNI · prepara il 121" },
  DOPO_121: { si: "Fatto", no: "Non serve", etichetta: "BNI · registra il 121" },
  PRESENTAZIONE_BNI: { si: "Mandato", no: "Non ora", etichetta: "BNI · chiedi la presentazione" },
  RETE_PONTE: { si: "Mandato", no: "Non ora: prova un altro", etichetta: "Rete · me lo presenti?" },
  RETE_DIRETTO: { si: "Mandato", no: "Non ora", etichetta: "Rete · scrivi a chi decide" },
  RETE_PROMEMORIA: { si: "Mandato", no: "Non serve", etichetta: "Rete · promemoria al ponte" },
  COMMENTO_LINKEDIN: { si: "Commentato", no: "Salta", etichetta: "Rete · commento alla pagina" },
  RETE_CONTATTO: { si: "Mandato", no: "Non ora", etichetta: "Rete · contatto dopo i commenti" },
  RETE_PAGINA: { si: "Mandato", no: "Non serve", etichetta: "Rete · messaggio alla pagina" },
  PROPOSTA_MSD: { si: "Mandata", no: "Non la mando", etichetta: "BNI · proposta Metodo Strategico Digitale™" },
  MSD_FUORI_TARGET: { si: "Fai la proposta lo stesso", no: "Solo relazione", etichetta: "BNI · interessato ma fuori target" },
  RICHIAMO_MSD: { si: "Mandato", no: "Non serve", etichetta: "BNI · richiamo dopo la proposta" },
  PREPARAZIONE_CALL: { si: "Letta", no: "Non serve", etichetta: "Vendita · prepara la call" },
  DOPO_CALL: { si: "Mandata", no: "Scarta", etichetta: "Vendita · dopo la call" },
  RECALL: { si: "Fatto", no: "Rimanda", etichetta: "Vendita · recall" },
  NURTURING_PROPOSTO: { si: "Passa a nurturing", no: "Riprova fra 7 giorni", etichetta: "Vendita · nessuna risposta" },
  MESSAGGIO_NURTURING: { si: "Mandato", no: "Salta questo giro", etichetta: "Vendita · nurturing" },
};

/** Etichetta del "sì" del Dopo-call: dipende da cosa raccomanda l'agente. */
export function siDopoCall(p: Record<string, unknown>): string {
  return ({ LETTERA: "Lettera mandata", FOLLOW_UP: "Follow-up mandato", NURTURING: "Passa a nurturing", EXIT: "Chiudi (exit)" } as Record<string, string>)[String(p.raccomandazione)] ?? "Fatto";
}

function copia(testo: string) {
  navigator.clipboard.writeText(testo).then(
    () => toast.success("Copiato"),
    () => toast.error("Non riesco a copiare: seleziona il testo a mano")
  );
}

export function linkWhatsApp(telefono: string | null | undefined, testo: string): string | null {
  if (!telefono) return null;
  let cifre = telefono.replace(/\D/g, "");
  if (cifre.startsWith("00")) cifre = cifre.slice(2);
  if (cifre.length === 10 && cifre.startsWith("3")) cifre = `39${cifre}`;
  return cifre.length >= 11 ? `https://wa.me/${cifre}?text=${encodeURIComponent(testo)}` : null;
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function Intestazione({ v }: { v: VoceCassetta }) {
  if (v.trattativa) {
    return (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/trattative/${v.trattativa.id}`} className="font-semibold hover:underline break-words">{v.trattativa.nome}</Link>
          <Badge variant="secondary" className="text-[10px]">{AZIONI[v.kind]?.etichetta ?? v.kind}</Badge>
        </div>
        {v.trattativa.referente && <div className="text-xs text-muted-foreground mt-1">{v.trattativa.referente}</div>}
      </div>
    );
  }
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
        <Link href={v.bniMembro ? `/bni/membri/${v.bniMembro.id}` : v.bniChapter ? `/bni/capitoli/${v.bniChapter.id}` : "/bni"} className="font-semibold hover:underline break-words">{v.title}</Link>
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

function Messaggio({ testo, oggetto, telefono, linkedin, email, chiama, altri = [] }: { testo: string; oggetto?: string; telefono?: string | null; linkedin?: string | null; email?: string | null; chiama?: boolean; altri?: { etichetta: string; url: string }[] }) {
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
        {linkedin && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><Globe className="h-3.5 w-3.5 mr-1" /> Apri LinkedIn</Button>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}?body=${encodeURIComponent(testo)}`}>
            <Button size="sm" variant="outline"><Mail className="h-3.5 w-3.5 mr-1" /> Mail</Button>
          </a>
        )}
        {chiama && telefono && (
          <a href={`tel:${telefono}`}>
            <Button size="sm" variant="outline"><Phone className="h-3.5 w-3.5 mr-1" /> Chiama</Button>
          </a>
        )}
        {altri.map((a) => (
          <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><Globe className="h-3.5 w-3.5 mr-1" /> {a.etichetta}</Button>
          </a>
        ))}
      </div>
    </div>
  );
}

/** La rete al centro: il messaggio al ponte, a chi decide o il promemoria (lo manda Alessio). */
export function CorpoRete({ p }: { p: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {s(p.dare) && <p className="text-sm font-medium">{s(p.dare)}</p>}
      <Messaggio testo={s(p.messaggio)} telefono={s(p.telefono) || null} linkedin={s(p.linkedin) || null} />
      {!s(p.telefono) && !s(p.linkedin) && <p className="text-xs text-muted-foreground">Mandalo su LinkedIn o WhatsApp a {s(p.ponte)}: copialo e incollalo.</p>}
      {p.motivoDalCaso === false && <p className="text-xs text-muted-foreground">Aggiungi tu, a voce o per iscritto, la storia del caso studio (senza il nome del cliente).</p>}
    </div>
  );
}

const NOMI_SOCIAL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };

/** Il commento proposto per la pagina dell'azienda: lo incolli tu sotto il post. */
export function CorpoCommento({ p }: { p: Record<string, unknown> }) {
  const dove = NOMI_SOCIAL[s(p.piattaforma)] ?? (/linkedin/i.test(s(p.post)) ? "LinkedIn" : "il post");
  return (
    <div className="space-y-2">
      {s(p.estratto) && <p className="text-xs text-muted-foreground">Dal post: &quot;{s(p.estratto)}&quot;</p>}
      <Messaggio testo={s(p.commento)} altri={s(p.post) ? [{ etichetta: `Apri ${dove}`, url: s(p.post) }] : []} />
    </div>
  );
}

/** Al 5° commento: il primo messaggio a chi decide, con WhatsApp, mail, telefono e i suoi profili. */
export function CorpoContatto({ p }: { p: Record<string, unknown> }) {
  const altri = (["facebook", "instagram"] as const).filter((k) => s(p[k])).map((k) => ({ etichetta: `${NOMI_SOCIAL[k]} di ${s(p.decisore) || "chi decide"}`, url: s(p[k]) }));
  return (
    <div className="space-y-2">
      <Messaggio testo={s(p.messaggio)} telefono={s(p.telefono) || null} email={s(p.email) || null} linkedin={s(p.linkedin) || null} chiama altri={altri} />
      {!s(p.telefono) && !s(p.email) && <p className="text-xs text-muted-foreground">Nessun telefono né mail dell&apos;azienda: scrivigli in privato sui social.</p>}
      {p.motivoDalCaso === false && <p className="text-xs text-muted-foreground">Aggiungi tu, a voce o per iscritto, la storia del caso studio (senza il nome del cliente).</p>}
    </div>
  );
}

/** La proposta MSD dopo il 121 (o il richiamo): la rileggi sempre prima di mandarla. */
export function CorpoMsd({ p }: { p: Record<string, unknown> }) {
  const avvisi = arr<string>(p.avvisi);
  return (
    <div className="space-y-2">
      {s(p.richiesta) && <p className="text-xs text-muted-foreground">Al 121 ha chiesto: {s(p.richiesta)}</p>}
      {s(p.passoFissato) && <p className="text-xs text-muted-foreground">Passo già fissato: {s(p.passoFissato)}</p>}
      {avvisi.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-xs space-y-0.5">
          {avvisi.map((a, i) => <div key={i}>⚠ {a}</div>)}
        </div>
      )}
      <Messaggio testo={s(p.messaggio)} telefono={s(p.telefono) || null} email={s(p.email) || null} />
      <p className="text-xs text-muted-foreground">Rileggila prima di mandarla. Se l&apos;avete già fissato al 121, il messaggio mantiene l&apos;accordo.</p>
    </div>
  );
}

/** Interessato per sé ma fuori dal perimetro MSD (o non si sa): decide Alessio. */
export function CorpoFuoriTarget({ p }: { p: Record<string, unknown> }) {
  return (
    <div className="space-y-1 text-sm">
      {s(p.richiesta) && <p>Ha chiesto: {s(p.richiesta)}</p>}
      <p className="text-muted-foreground">{s(p.perche) || "Dal 121 non si capisce quanto è grande l'azienda."}</p>
      <p className="text-xs text-muted-foreground">Il perimetro MSD: PMI tra 500 mila e 5 milioni, 10-15 persone. Se lo segui per la relazione, il seguito punta alle segnalazioni.</p>
    </div>
  );
}

/** Chi decide non si sa: il messaggio privato alla pagina dell'azienda. */
export function CorpoPagina({ p }: { p: Record<string, unknown> }) {
  return <Messaggio testo={s(p.messaggio)} altri={s(p.pagina) ? [{ etichetta: `Apri la pagina ${NOMI_SOCIAL[s(p.piattaforma)] ?? ""}`.trim(), url: s(p.pagina) }] : []} />;
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

const FORMATI_121: Record<string, string> = { PRESENZA: "di persona", ONLINE: "online (Meet)", A_SCELTA: "di persona o online" };

export function CorpoMessaggioBni({ p, telefono }: { p: Record<string, unknown>; telefono: string | null }) {
  return (
    <div className="space-y-2">
      {(s(p.perche) || s(p.formato)) && (
        <div className="flex flex-wrap gap-2">
          {s(p.perche) && <span className="text-sm">{s(p.perche)}</span>}
          {FORMATI_121[s(p.formato)] && <Badge variant="outline">121 {FORMATI_121[s(p.formato)]}</Badge>}
        </div>
      )}
      <Messaggio testo={s(p.messaggio)} telefono={telefono ?? s(p.telefono)} />
      {s(p.nota_per_alessio) && <p className="text-xs text-muted-foreground">Per te: {s(p.nota_per_alessio)}</p>}
    </div>
  );
}

export function CorpoVisitaCapitolo({ p, telefono }: { p: Record<string, unknown>; telefono: string | null }) {
  return (
    <div className="space-y-2">
      {s(p.perche) && <p className="text-sm">{s(p.perche)}</p>}
      <div className="text-xs text-muted-foreground">
        {[s(p.formato).toLowerCase(), s(p.quando), s(p.sede)].filter(Boolean).join(" · ")}
      </div>
      <Messaggio testo={s(p.messaggio)} telefono={telefono ?? s(p.telefono)} />
    </div>
  );
}

export function CorpoPreparazione121({ p }: { p: Record<string, unknown> }) {
  const quando = s(p.quando) ? new Date(s(p.quando)).toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const pres = arr<{ nome: string; ruolo?: string | null; perche?: string | null; linkedin?: string | null; forza?: number }>(p.presentazioni);
  const segn = arr<{ nome: string; motivo?: string | null }>(p.segnalazioni);
  const caso = (p.casoStudio ?? null) as { titolo?: string; storia?: string } | null;
  return (
    <div className="space-y-3">
      {s(p.pagina) && (
        <Link href={s(p.pagina)} className="inline-flex"><Button size="sm" variant="outline">Apri la pagina del 121 (sempre aggiornata)</Button></Link>
      )}
      {s(p.ricorda) && <p className="text-sm font-medium">{s(p.ricorda)}</p>}
      <Blocco titolo="Chi è">{s(p.chi)}{quando && <div className="text-xs text-muted-foreground mt-0.5">{quando}</div>}</Blocco>
      {segn.length > 0 && (
        <Blocco titolo="Contatti da segnalargli">
          {segn.map((x, i) => (
            <div key={i}>{x.nome}{x.motivo && <div className="text-xs text-muted-foreground">{x.motivo}</div>}</div>
          ))}
        </Blocco>
      )}
      {s(p.cosaFa) && <Blocco titolo="Cosa fa">{s(p.cosaFa)}</Blocco>}
      {pres.length > 0 && (
        <Blocco titolo="Chiedigli di presentarti">
          {pres.map((x, i) => (
            <div key={i}>
              {x.nome} {x.ruolo && <span className="text-muted-foreground">— {x.ruolo}</span>}{" "}
              {x.linkedin && <a className="text-xs underline" href={x.linkedin} target="_blank" rel="noopener noreferrer">profilo</a>}
              {x.perche && <div className="text-xs text-muted-foreground">{x.perche}</div>}
            </div>
          ))}
        </Blocco>
      )}
      {caso?.storia && <Blocco titolo={`La storia da raccontare: ${caso.titolo ?? ""}`}><p className="whitespace-pre-wrap">{caso.storia}</p></Blocco>}
      <Blocco titolo="Le domande">
        <ul className="list-disc pl-4 space-y-0.5">{arr<string>(p.domande).map((d, i) => <li key={i}>{d}</li>)}</ul>
      </Blocco>
    </div>
  );
}

/** Testo lungo con i segnaposto [INVESTIMENTO] in evidenza, da completare prima di mandarlo. */
function TestoLungo({ testo }: { testo: string }) {
  const pezzi = testo.split(/(\[[A-ZÀ-Ù _]+\])/);
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {pezzi.map((p, i) => (/^\[[A-ZÀ-Ù _]+\]$/.test(p) ? <mark key={i} className="bg-amber-300/60 text-foreground rounded px-0.5">{p}</mark> : p))}
    </p>
  );
}

/** Motore 121: il messaggio al membro per chiedere la presentazione promessa al 121. */
export function CorpoPresentazioneBni({ p, telefono }: { p: Record<string, unknown>; telefono: string | null }) {
  return (
    <div className="space-y-2">
      {s(p.perche) && <p className="text-sm">{s(p.perche)}</p>}
      <Messaggio testo={s(p.messaggio)} telefono={telefono ?? s(p.telefono)} />
      <p className="text-xs text-muted-foreground">Quando te lo presenta, segna &quot;presentato&quot; nella scheda del membro: parte l&apos;analisi completa della sua azienda.</p>
    </div>
  );
}

/** Motore 121: il 121 è passato e non è registrato. */
export function CorpoDopo121({ p }: { p: Record<string, unknown> }) {
  const quando = s(p.quando) ? new Date(s(p.quando)).toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div className="space-y-2 text-sm">
      <p>Detta un vocale di 2 minuti o incolla la trascrizione di Meet{quando ? ` (121 di ${quando})` : ""}: la scheda si compila da sola e le presentazioni vanno in Cassetta.</p>
      {s(p.link) && <Link href={s(p.link)}><Button size="sm" variant="outline">Apri la scheda e registra il 121</Button></Link>}
    </div>
  );
}

export function CorpoPreparazione({ p }: { p: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Blocco titolo="Obiettivo della call">{s(p.obiettivo_call)}</Blocco>
      {arr<string>(p.cosa_sappiamo).length > 0 && (
        <Blocco titolo="Cosa sappiamo"><ul className="list-disc pl-4 space-y-0.5">{arr<string>(p.cosa_sappiamo).map((x, i) => <li key={i}>{x}</li>)}</ul></Blocco>
      )}
      <Blocco titolo="Come aprire">{s(p.apertura)}</Blocco>
      <Blocco titolo="Domande, in quest'ordine">
        <ol className="list-decimal pl-4 space-y-1">
          {arr<{ domanda: string; perche: string }>(p.domande).map((d, i) => <li key={i}>{d.domanda}<div className="text-xs text-muted-foreground">{d.perche}</div></li>)}
        </ol>
      </Blocco>
      {arr(p.leve).length > 0 && (
        <Blocco titolo="Leve">
          {arr<{ leva: string; prova: string }>(p.leve).map((l, i) => <div key={i}>{l.leva}<div className="text-xs text-muted-foreground">Prova: {l.prova}</div></div>)}
        </Blocco>
      )}
      {arr(p.obiezioni).length > 0 && (
        <Blocco titolo="Obiezioni probabili">
          {arr<{ obiezione: string; risposta: string }>(p.obiezioni).map((o, i) => <div key={i}>{o.obiezione}<div className="text-xs text-muted-foreground">→ {o.risposta}</div></div>)}
        </Blocco>
      )}
      <Blocco titolo="Il ponte verso il Metodo SD">{s(p.ponte_metodo_sd)}</Blocco>
      <Blocco titolo="Come chiudere">{s(p.chiusura)}</Blocco>
    </div>
  );
}

export function CorpoDopoCall({ p, telefono }: { p: Record<string, unknown>; telefono?: string | null }) {
  const lettera = s(p.lettera);
  const email = s(p.email_accompagnamento);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {s(p.temperatura) && <Badge variant="outline">Temperatura: {s(p.temperatura)}</Badge>}
        {s(p.raccomandazione) && <Badge variant="outline">Consiglio: {s(p.raccomandazione).toLowerCase().replace("_", " ")}</Badge>}
      </div>
      <Blocco titolo="Cosa è successo">{s(p.sintesi)}{s(p.perche) && <div className="text-muted-foreground mt-1">{s(p.perche)}</div>}</Blocco>
      {arr(p.problemi).length > 0 && (
        <Blocco titolo="I problemi, con le loro parole">
          {arr<{ problema: string; citazione: string }>(p.problemi).map((x, i) => <div key={i}>{x.problema}<div className="text-xs text-muted-foreground">“{x.citazione}”</div></div>)}
        </Blocco>
      )}
      {arr<string>(p.obiezioni).length > 0 && <Blocco titolo="Obiezioni"><ul className="list-disc pl-4">{arr<string>(p.obiezioni).map((o, i) => <li key={i}>{o}</li>)}</ul></Blocco>}
      {lettera && (
        <Blocco titolo={s(p.raccomandazione) === "LETTERA" ? `Lettera strategica: ${s(p.lettera_titolo)}` : "Messaggio"}>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <TestoLungo testo={lettera} />
            <Button size="sm" variant="outline" onClick={() => copia(lettera)}><Copy className="h-3.5 w-3.5 mr-1" /> Copia la lettera</Button>
          </div>
          {/\[[A-ZÀ-Ù _]+\]/.test(lettera) && <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Completa i punti evidenziati prima di mandarla.</div>}
        </Blocco>
      )}
      {email && <Blocco titolo="Email di accompagnamento"><Messaggio testo={email} telefono={telefono} /></Blocco>}
      {s(p.prossimo_passo) && <Blocco titolo="Prossimo passo">{s(p.prossimo_passo)}{p.giorni_al_prossimo_passo ? ` (fra ${String(p.giorni_al_prossimo_passo)} giorni se non rispondono)` : ""}</Blocco>}
    </div>
  );
}

export function CorpoRecall({ p, telefono }: { p: Record<string, unknown>; telefono?: string | null }) {
  if (p.proposta === "NURTURING") {
    return <p className="text-sm">Nessuna risposta dopo {String(p.recallFatti)} richiami. Ti propongo di passarla al nurturing: un messaggio di valore ogni 45 giorni, senza insistere.</p>;
  }
  return (
    <div className="space-y-3">
      <Blocco titolo={`Recall ${String(p.numero ?? "")} · ${s(p.canale)}`}><Messaggio testo={s(p.messaggio)} telefono={telefono} /></Blocco>
      {s(p.copione_telefono) && <Blocco titolo="Se chiami">{s(p.copione_telefono)}</Blocco>}
      {s(p.obiezione_da_sciogliere) && <Blocco titolo="Il dubbio da sciogliere">{s(p.obiezione_da_sciogliere)}</Blocco>}
    </div>
  );
}

export function CorpoNurturing({ p, telefono }: { p: Record<string, unknown>; telefono?: string | null }) {
  return (
    <div className="space-y-2">
      <Messaggio testo={s(p.messaggio)} oggetto={s(p.oggetto) || undefined} telefono={s(p.canale) === "whatsapp" ? telefono : null} />
      {s(p.spunto) && <p className="text-xs text-muted-foreground">Nasce da: {s(p.spunto)}</p>}
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
      {v.kind === "VISITA_CAPITOLO" && <CorpoVisitaCapitolo p={v.payload} telefono={v.bniMembro?.phone ?? null} />}
      {v.kind === "PREPARAZIONE_121" && <CorpoPreparazione121 p={v.payload} />}
      {v.kind === "PRESENTAZIONE_BNI" && <CorpoPresentazioneBni p={v.payload} telefono={v.bniMembro?.phone ?? null} />}
      {v.kind === "DOPO_121" && <CorpoDopo121 p={v.payload} />}
      {(v.kind === "RETE_PONTE" || v.kind === "RETE_DIRETTO" || v.kind === "RETE_PROMEMORIA") && <CorpoRete p={v.payload} />}
      {v.kind === "COMMENTO_LINKEDIN" && <CorpoCommento p={v.payload} />}
      {v.kind === "RETE_CONTATTO" && <CorpoContatto p={v.payload} />}
      {v.kind === "RETE_PAGINA" && <CorpoPagina p={v.payload} />}
      {(v.kind === "PROPOSTA_MSD" || v.kind === "RICHIAMO_MSD") && <CorpoMsd p={v.payload} />}
      {v.kind === "MSD_FUORI_TARGET" && <CorpoFuoriTarget p={v.payload} />}
      {v.kind === "PREPARAZIONE_CALL" && <CorpoPreparazione p={v.payload} />}
      {v.kind === "DOPO_CALL" && <CorpoDopoCall p={v.payload} telefono={v.trattativa?.telefono} />}
      {(v.kind === "RECALL" || v.kind === "NURTURING_PROPOSTO") && <CorpoRecall p={v.payload} telefono={v.trattativa?.telefono} />}
      {v.kind === "MESSAGGIO_NURTURING" && <CorpoNurturing p={v.payload} telefono={v.trattativa?.telefono} />}
    </>
  );
}
