"use client";

import { createContext, use, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Globe, Laptop, Linkedin, Loader2, MapPin, Phone, Play, RotateCcw, Search, Server, Target, Trash2, User, X } from "lucide-react";
import { CANALI, STATI_PRESENTAZIONE, data } from "@/components/ricerca/etichette";

interface Leva { servizio: string; testo: string; prova: string }
interface Referto { summary: string; findings: Record<string, unknown>; levers: Leva[]; data: string }
interface Agente { chiave: string; nome: string; dove: "server" | "mac"; momento: string; modo: "auto" | "mano"; senzaSito: boolean; stato: string | null; errore: string | null; quando: string | null }

interface Scheda {
  azienda: {
    id: string; name: string; website: string | null; address: string | null; category: string | null; phone: string | null;
    googleRating: number | null; googleReviewsCount: number | null; googleMapsUrl: string | null; socialUrl: string | null;
    pipelineStage: string;
  };
  perche: { canale: string; createdAt: string; chiave: { tipo: string; casoStudio: { id: string; titolo: string } | null; bniMembro: { id: string; name: string } | null } } | null;
  casi: { id: string; titolo: string }[];
  persone: { id: string; nome: string; ruolo: string | null; linkedinUrl: string | null; contattoInComune: string | null }[];
  ponti: { id: string; name: string; chapter: string | null; come: string; stato?: string }[];
  prossimo: string;
  storia: { quando: string; cosa: string }[];
  decisione: { status: "IN_ATTESA" | "APPROVATO" | "SCARTATO"; decidedAt: string | null; note: string | null } | null;
  contatto: { daContattare: boolean; scelta: "AGGIUNTA" | "TOLTA" | null };
  inCorso: { agent: string; status: string }[];
  sulMac: string[];
  agenti: Agente[];
  analisi: Record<string, Referto>;
}

function citta(indirizzo: string | null): string | null {
  const m = indirizzo?.match(/\d{5}\s+([^,]+?)\s+[A-Z]{2}\b/);
  return m ? m[1] : null;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const MOMENTO: Record<string, string> = { trovata: "nell'analisi veloce", approfondisci: "con Approfondisci", sintesi: "quando arrivano i dati" };

/** I dati comuni ai blocchi: gli agenti e il pulsante per lanciarli. */
const Ctx = createContext<{ agenti: Agente[]; analisi: Record<string, Referto>; lancia: (chiave: string) => void; inLancio: string | null }>({ agenti: [], analisi: {}, lancia: () => {}, inLancio: null });

/**
 * Una sezione della scheda è una fisarmonica: chiusa mostra quante ricerche sono fatte e quante
 * cose hanno trovato; aperta, i blocchi (su due colonne quando c'è spazio).
 */
function Sezione({ n, titolo, agenti: chiavi = [], aperta = false, unaColonna = false, children }: { n: number; titolo: string; agenti?: string[]; aperta?: boolean; unaColonna?: boolean; children: React.ReactNode }) {
  const { agenti, analisi } = useContext(Ctx);
  const mie = agenti.filter((a) => chiavi.includes(a.chiave));
  const fatte = mie.filter((a) => analisi[a.chiave]).length;
  const inCorso = mie.some((a) => a.stato === "IN_CODA" || a.stato === "IN_CORSO");
  const trovate = mie.reduce((n, a) => n + (analisi[a.chiave]?.levers.length ?? 0), 0);
  return (
    <details className="group rounded-lg border mt-3" open={aperta}>
      <summary className="cursor-pointer list-none px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold"><span className="text-muted-foreground mr-1">{n}.</span>{titolo}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-3">
          {mie.length > 0 && <span>{fatte}/{mie.length} ricerche fatte{inCorso ? " · in corso" : ""}</span>}
          {trovate > 0 && <span className="text-amber-700 dark:text-amber-400">{trovate} {trovate === 1 ? "cosa da dire" : "cose da dire"}</span>}
          <span className="transition group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className={`px-3 pb-3 grid gap-2 ${unaColonna ? "" : "lg:grid-cols-2 [&>*:only-child]:lg:col-span-2"}`}>{children}</div>
    </details>
  );
}

function Leve({ leve }: { leve: Leva[] }) {
  if (!leve.length) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {leve.map((l, i) => (
        <li key={i} className="text-sm">
          <span className="text-amber-700 dark:text-amber-400">●</span> {l.testo}
          <div className="text-xs text-muted-foreground ml-3.5 break-words">{l.prova}</div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Un blocco = un agente. In alto: nome, automatica/a mano, dove gira, stato e il pulsante
 * (Lancia, Rifai, Riprova). Sotto: cosa ha trovato.
 */
function Blocco({ agente, soloDettagli = false, children }: { agente: string; soloDettagli?: boolean; children?: React.ReactNode }) {
  const { agenti, analisi, lancia, inLancio } = useContext(Ctx);
  const a = agenti.find((x) => x.chiave === agente);
  const r = analisi[agente];
  if (!a) return null;
  const lavora = a.stato === "IN_CODA" || a.stato === "IN_CORSO" || inLancio === agente;
  let stato: string;
  if (lavora) stato = a.dove === "mac" && a.stato === "IN_CODA" ? "In coda per l'agente sul Mac (entro mezz'ora)" : "In corso…";
  else if (r) stato = `Fatta il ${data(r.data)}`;
  else if (a.stato === "FALLITO") stato = `Non riuscita: ${a.errore ?? "errore"}`;
  else if (a.senzaSito) stato = "Serve il sito: aggiungilo e parte da sola";
  // Con Approfondisci partono tutte; prima, solo quelle automatiche dell'analisi veloce.
  else if (a.momento === "sintesi") stato = a.modo === "auto" ? `Partirà da sola ${MOMENTO.sintesi}` : "Da lanciare a mano";
  else stato = `Partirà da sola ${a.modo === "auto" && a.momento === "trovata" ? MOMENTO.trovata : MOMENTO.approfondisci}`;
  const etichetta = r ? "Rifai" : a.stato === "FALLITO" ? "Riprova" : "Lancia";
  return (
    <div className="rounded-md border px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium">{a.nome}</div>
          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
            <span className={`rounded px-1.5 ${a.modo === "auto" ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>{a.modo === "auto" ? "automatica" : "a mano"}</span>
            <span className="flex items-center gap-1">{a.dove === "mac" ? <Laptop className="h-3 w-3" /> : <Server className="h-3 w-3" />}{a.dove === "mac" ? "sul tuo Mac" : "sul server"}</span>
            <span className={a.stato === "FALLITO" && !r ? "text-red-600 dark:text-red-400" : ""}>{stato}</span>
          </div>
        </div>
        <Button size="sm" variant={r ? "ghost" : "outline"} className="h-7 text-xs" disabled={lavora} onClick={() => lancia(agente)}>
          {lavora ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r ? <RotateCcw className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
          {!lavora && etichetta}
        </Button>
      </div>
      {r && (
        <>
          {!soloDettagli && <div className="text-sm text-muted-foreground break-words mt-1">{r.summary}</div>}
          {children}
          {!soloDettagli && <Leve leve={r.levers} />}
        </>
      )}
    </div>
  );
}

/** "Cambia sito": se l'agente ha sbagliato o non l'ha trovato, lo scrivi tu e le ricerche ripartono. */
function CambiaSito({ id, attuale, onFatto }: { id: string; attuale: string | null; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [sito, setSito] = useState(attuale ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  if (!aperto) return <Button variant="ghost" size="sm" onClick={() => setAperto(true)}>{attuale ? "Cambia sito" : "Aggiungi il sito"}</Button>;
  return (
    <form
      className="flex flex-wrap items-center gap-2 w-full sm:w-auto"
      onSubmit={async (e) => {
        e.preventDefault();
        if (sito.trim().length < 4) return setErrore("Scrivi l'indirizzo del sito");
        setOccupato(true);
        const r = await fetch(`/api/ricerca/aziende/${id}/sito`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sito }) });
        const d = await r.json().catch(() => ({}));
        setOccupato(false);
        if (!r.ok) return setErrore(d.error ?? "Errore");
        setAperto(false);
        onFatto();
      }}
    >
      <input value={sito} onChange={(e) => { setSito(e.target.value); setErrore(null); }} placeholder="indirizzo del sito" aria-label="Sito dell'azienda" className="h-8 rounded-md border bg-transparent px-2 text-sm min-w-0 flex-1 sm:w-64" />
      <Button size="sm" type="submit" disabled={occupato}>{occupato ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva e rifai le ricerche"}</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setAperto(false)}>Annulla</Button>
      {errore && <span className="text-xs text-red-600 w-full">{errore}</span>}
    </form>
  );
}

export default function SchedaAziendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Scheda | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [inLancio, setInLancio] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);
  // Scarta ed Elimina chiedono il perché: la ricerca lo usa per non riproporre aziende così.
  const [chiedeMotivo, setChiedeMotivo] = useState<"scarta" | "elimina" | null>(null);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/aziende/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!vivo) return;
        if (!r.ok) setErrore(d.error ?? "Errore");
        else setS(d);
      })
      .catch(() => vivo && setErrore("Errore nel caricamento"));
    return () => {
      vivo = false;
    };
  }, [id, versione]);

  // Mentre gli agenti lavorano (anche sul Mac), la scheda si aggiorna da sola.
  const lavorando = !!s && (s.inCorso.length > 0 || s.sulMac.length > 0 || !!inLancio);
  useEffect(() => {
    if (!lavorando) return;
    const t = setInterval(() => setVersione((v) => v + 1), 15000);
    return () => clearInterval(t);
  }, [lavorando]);

  const decidi = useCallback(async (azione: "approfondisci" | "scarta" | "ripensaci" | "elimina" | "ripristina" | "da_contattare" | "non_contattare" | "contattare_auto", perche?: string) => {
    setOccupato(true);
    await fetch(`/api/ricerca/aziende/${id}/decisione`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ azione, ...(perche?.trim() ? { motivo: perche.trim() } : {}) }) });
    setOccupato(false);
    setChiedeMotivo(null);
    setMotivo("");
    setVersione((v) => v + 1);
  }, [id]);

  const lancia = useCallback(async (agente: string) => {
    setInLancio(agente);
    await fetch(`/api/ricerca/aziende/${id}/lancia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agente }) });
    setVersione((v) => v + 1);
    setTimeout(() => setInLancio(null), 4000);
  }, [id]);

  if (errore) return <Card><CardContent className="p-6 text-sm text-red-500">{errore}</CardContent></Card>;
  if (!s) return <div className="space-y-3 max-w-6xl"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const a = s.azienda;
  const an = s.analisi;
  const titolare = s.persone[0];
  // I contatti in comune con chi decide: i nomi salvati, e quanti sono per LinkedIn (può dirne di più).
  const comuni = (titolare?.contattoInComune ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const lettoDm = arr<{ nome?: string; numeroInComune?: number }>(an.decision_maker?.findings.persone).find((p) => p.nome === titolare?.nome);
  const totaleComuni = Math.max(comuni.length, typeof lettoDm?.numeroInComune === "number" ? lettoDm.numeroInComune : 0);
  const caso = s.perche?.chiave.casoStudio;
  const rete = s.perche?.chiave.bniMembro;
  const ganci = arr<{ frase: string; prova: string }>(an.ganci?.findings.ganci);
  const sitoVisto = an.sito_visto?.findings;
  const foto = (sitoVisto?.foto ?? {}) as { telefono?: string | null; computer?: string | null };
  const domande = arr<{ domanda: string; risposta: string }>(an.lettore?.findings.domande_cliente);
  const cosaDice = (an.lettore?.findings.cosa_dice ?? null) as { offerta?: string; pubblico?: string } | null;
  const concorrenti = arr<{ nome: string; rating: number | null; recensioni: number; sito: string | null }>(an.concorrenti?.findings.concorrenti);
  const esempiMeta = arr<{ testo: string; dal: string }>(an.meta_ads?.findings.esempi);
  const stato = s.decisione?.status;

  return (
    <Ctx.Provider value={{ agenti: s.agenti, analisi: an, lancia, inLancio }}>
      <div className="max-w-6xl min-w-0 space-y-3">
        <Link href="/aziende-trovate" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Aziende trovate</Link>
        <Card><CardContent className="p-4 sm:p-5">
          <h1 className="text-2xl font-bold break-words">{a.name}</h1>
          <div className="text-sm text-muted-foreground break-words">
            {[a.category, citta(a.address), a.googleRating != null ? `${a.googleRating.toFixed(1).replace(".", ",")} stelle (${a.googleReviewsCount ?? 0} recensioni)` : null].filter(Boolean).join(" · ")}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {a.website && <Button asChild variant="outline" size="sm"><a href={a.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 mr-1.5" />Sito</a></Button>}
            {a.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${a.phone}`}><Phone className="h-4 w-4 mr-1.5" />Chiama</a></Button>}
            {a.googleMapsUrl && <Button asChild variant="outline" size="sm"><a href={a.googleMapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 mr-1.5" />Mappa</a></Button>}
            <CambiaSito id={a.id} attuale={a.website} onFatto={() => setVersione((v) => v + 1)} />
            {a.pipelineStage !== "ARCHIVIATO" && <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400 ml-auto" onClick={() => setChiedeMotivo("elimina")} disabled={occupato}><Trash2 className="h-4 w-4 mr-1.5" />Elimina</Button>}
          </div>

          {chiedeMotivo && (
            <div className="mt-4 rounded-md border px-3 py-3 space-y-2">
              <div className="text-sm">
                <b>{chiedeMotivo === "elimina" ? "Eliminare questa azienda?" : "Scartare questa azienda?"}</b>{" "}
                <span className="text-muted-foreground">Scrivi perché: la ricerca lo impara e non ti ripropone aziende così.{chiedeMotivo === "elimina" && " Esce dagli elenchi e gli agenti si fermano; la ritrovi in Eliminate."}</span>
              </div>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder="Es. è un libero professionista, non un'azienda · è una catena · non è in Sardegna · fa un altro mestiere"
                className="w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={chiedeMotivo === "elimina" ? "destructive" : "default"} onClick={() => decidi(chiedeMotivo, motivo)} disabled={occupato}>
                  {occupato ? <Loader2 className="h-4 w-4 animate-spin" /> : chiedeMotivo === "elimina" ? "Elimina" : "Scarta"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setChiedeMotivo(null); setMotivo(""); }} disabled={occupato}>Annulla</Button>
              </div>
            </div>
          )}

          {a.pipelineStage === "ARCHIVIATO" && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>Eliminata: non compare negli elenchi e gli agenti non ci lavorano.</span>
              <Button size="sm" variant="outline" onClick={() => decidi("ripristina")} disabled={occupato}>Ripristina</Button>
            </div>
          )}

          {s.perche && (
            <div className="mt-4 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 px-3 py-2.5 text-sm">
              <Target className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Perché è qui:{" "}
              {s.perche.chiave.tipo === "MANUALE" ? <>aggiunta a mano.</>
                : caso ? <>stesso mestiere del caso studio <Link href={`/casi-studio/${caso.id}`} className="font-medium underline">{caso.titolo}</Link>.</>
                  : rete ? <>è nella rete di <Link href={`/bni/membri/${rete.id}`} className="font-medium underline">{rete.name}</Link>.</>
                    : null}{" "}
              {s.perche.chiave.tipo !== "MANUALE" && <>Trovata su {CANALI[s.perche.canale] ?? s.perche.canale} il {data(s.perche.createdAt)}.</>}
            </div>
          )}

          {/* Da contattare: entra da sola se approfondita e collegata a te; la puoi aggiungere o togliere tu. */}
          {a.pipelineStage !== "ARCHIVIATO" && (
            <div className={`mt-4 rounded-md border px-3 py-2.5 text-sm flex flex-wrap items-center gap-2 ${s.contatto.daContattare ? "border-primary bg-primary/10" : ""}`}>
              <span className="flex-1 min-w-0">
                {s.contatto.daContattare
                  ? <><b>Da contattare</b> <span className="text-muted-foreground">{s.contatto.scelta === "AGGIUNTA" ? "(l'hai aggiunta tu)" : "(approfondita e collegata a te)"}</span></>
                  : <span className="text-muted-foreground">{s.contatto.scelta === "TOLTA" ? "Tolta da \"Da contattare\" (tua scelta)." : "Non è ancora da contattare: entra da sola quando è approfondita e collegata a te."}</span>}
              </span>
              {s.contatto.daContattare
                ? <Button size="sm" variant="outline" onClick={() => decidi("non_contattare")} disabled={occupato}>Togli</Button>
                : <Button size="sm" onClick={() => decidi("da_contattare")} disabled={occupato}>Da contattare</Button>}
              {s.contatto.scelta && <Button size="sm" variant="ghost" onClick={() => decidi("contattare_auto")} disabled={occupato}>Torna automatico</Button>}
            </div>
          )}

          {/* La decisione: Approfondisci fa partire le ricerche automatiche dell'analisi completa. */}
          <div className="mt-4 rounded-md border px-3 py-3">
            {stato === "APPROVATO" ? (
              <div className="text-sm"><Check className="h-4 w-4 inline mr-1 text-green-600" /><b>Analisi completa avviata.</b> <span className="text-muted-foreground">Le ricerche a mano le lanci dal loro blocco.</span></div>
            ) : stato === "SCARTATO" ? (
              <div className="text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">Scartata <Button variant="ghost" size="sm" onClick={() => decidi("ripensaci")} disabled={occupato}>Ripensaci</Button></div>
                {s.decisione?.note && <div className="text-muted-foreground break-words">{s.decisione.note}</div>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm"><b>Analisi veloce</b> {s.decisione ? "fatta. Vuoi quella completa?" : "in corso: puoi già decidere."}</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decidi("approfondisci")} disabled={occupato}><Search className="h-4 w-4 mr-1.5" />Approfondisci</Button>
                  <Button size="sm" variant="outline" onClick={() => setChiedeMotivo("scarta")} disabled={occupato}><X className="h-4 w-4 mr-1.5" />Scarta</Button>
                </div>
              </div>
            )}
          </div>

          <Sezione n={1} titolo="Si fa trovare?" agenti={["trova_sito", "posizioni"]}>
            <Blocco agente="trova_sito" />
            <Blocco agente="posizioni" />
          </Sezione>

          <Sezione n={2} titolo="Il sito" agenti={["sito_visto", "contatto", "lettore"]}>
            <Blocco agente="sito_visto">
              {(foto.telefono || foto.computer) && (
                <div className="flex gap-2 mt-2 items-start">
                  {foto.telefono && <a href={foto.telefono} target="_blank" rel="noopener noreferrer" className="w-[30%] max-w-40"><img src={foto.telefono} alt="Il sito sul telefono" className="w-full rounded border" /></a>}
                  {foto.computer && <a href={foto.computer} target="_blank" rel="noopener noreferrer" className="flex-1"><img src={foto.computer} alt="Il sito sul computer" className="w-full rounded border" /></a>}
                </div>
              )}
              {str(sitoVisto?.impressione) && <div className="text-sm mt-1.5">{str(sitoVisto?.impressione)}</div>}
            </Blocco>
            <Blocco agente="contatto" />
            <Blocco agente="lettore">
              {cosaDice?.offerta && <div className="text-sm mt-1">{cosaDice.offerta}{cosaDice.pubblico ? ` Per: ${cosaDice.pubblico}` : ""}</div>}
              {domande.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {domande.map((d, i) => (
                    <div key={i} className="text-xs break-words">
                      <span className={d.risposta === "no" ? "text-red-600 dark:text-red-400" : d.risposta === "sì" ? "text-green-600 dark:text-green-400" : "text-amber-600"}>{d.risposta === "no" ? "✗" : d.risposta === "sì" ? "✓" : "~"}</span> {d.domanda}
                    </div>
                  ))}
                </div>
              )}
            </Blocco>
          </Sezione>

          <Sezione n={3} titolo="Come la vedono i clienti" agenti={["scheda_google", "recensioni"]}>
            <Blocco agente="scheda_google" />
            <Blocco agente="recensioni">
              {arr<{ cosa: string; citazione: string }>(an.recensioni?.findings.lodano).slice(0, 2).map((x, i) => (
                <div key={i} className="text-xs mt-1 break-words"><span className="text-green-600">+</span> {x.cosa}: &ldquo;{x.citazione}&rdquo;</div>
              ))}
              {arr<{ cosa: string; citazione: string }>(an.recensioni?.findings.lamentano).slice(0, 2).map((x, i) => (
                <div key={i} className="text-xs mt-1 break-words"><span className="text-red-600">−</span> {x.cosa}: &ldquo;{x.citazione}&rdquo;</div>
              ))}
            </Blocco>
          </Sezione>

          <Sezione n={4} titolo="I concorrenti" agenti={["concorrenti"]}>
            <Blocco agente="concorrenti">
              <div className="mt-1.5 space-y-0.5">
                {concorrenti.map((c, i) => (
                  <div key={i} className="text-xs text-muted-foreground break-words">{i + 1}. {c.nome} · {c.rating ?? "?"}★ · {c.recensioni} recensioni{c.sito ? ` · ${c.sito}` : " · senza sito"}</div>
                ))}
              </div>
            </Blocco>
          </Sezione>

          {/* L'ordine di Alessio: dove è presente sui social, se sono coerenti, poi le inserzioni (Meta se c'è la pagina, Google se c'è il sito). */}
          <Sezione n={5} titolo="Social e pubblicità" agenti={["social", "instagram", "meta_ads", "google_ads", "tracciamenti"]}>
            <Blocco agente="social" />
            <Blocco agente="instagram">
              {str(an.instagram?.findings.perche) && <div className="text-sm mt-1.5 break-words">{str(an.instagram?.findings.perche)}</div>}
            </Blocco>
            <Blocco agente="meta_ads">
              {esempiMeta.slice(0, 2).map((e, i) => <div key={i} className="text-xs mt-1 break-words">&ldquo;{e.testo}&rdquo; <span className="text-muted-foreground">dal {e.dal}</span></div>)}
            </Blocco>
            <Blocco agente="google_ads" />
            <Blocco agente="tracciamenti" />
          </Sezione>

          <Sezione n={6} titolo="LinkedIn e chi decide" agenti={["linkedin_azienda", "decision_maker"]}>
            <Blocco agente="linkedin_azienda" />
            <Blocco agente="decision_maker">
              {titolare && (
                <div className="text-sm mt-1.5 flex items-center gap-2">
                  <User className="h-4 w-4" /><span className="font-medium">{titolare.nome}</span>{titolare.ruolo ? <span className="text-muted-foreground">· {titolare.ruolo}</span> : null}
                  {titolare.linkedinUrl && <a href={titolare.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Profilo LinkedIn"><Linkedin className="h-4 w-4 text-primary" /></a>}
                </div>
              )}
              {comuni.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">
                    {totaleComuni} {totaleComuni === 1 ? "contatto" : "contatti"} in comune con te
                    {totaleComuni > comuni.length ? ` · di ${comuni.length} si sa il nome (premi Rifai qui sopra per averli tutti)` : ""}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {comuni.map((c) => <span key={c} className="text-xs rounded border px-1.5 py-0.5">{c}</span>)}
                  </div>
                </div>
              )}
            </Blocco>
            <div className="rounded-md border px-3 py-2.5 text-sm space-y-1">
              <div className="font-medium">Chi te la può presentare</div>
              {s.ponti.length > 0 ? s.ponti.map((p) => (
                <div key={p.id} className="break-words">
                  <Link href={`/bni/membri/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  <span className="text-muted-foreground"> · {p.chapter ?? "BNI"} · {p.come}{p.stato ? ` · presentazione ${STATI_PRESENTAZIONE[p.stato] ?? p.stato}` : ""}</span>
                </div>
              )) : <div className="text-muted-foreground">Nessun membro BNI collegato, per ora</div>}
              {s.casi.length > 0 && <div className="text-muted-foreground">Caso da raccontare: {s.casi.map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link href={`/casi-studio/${c.id}`} className="hover:underline">{c.titolo}</Link></span>)}</div>}
            </div>
          </Sezione>

          <Sezione n={7} titolo="Cosa dirgli al telefono" agenti={["ganci"]} aperta unaColonna>
            <Blocco agente="ganci" soloDettagli>
              {ganci.length > 0 && (
                <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 space-y-2">
                  {ganci.map((g, i) => (
                    <div key={i} className="text-sm"><span className="font-medium">{i + 1}.</span> {g.frase}<div className="text-xs text-muted-foreground ml-4 break-words">{g.prova}</div></div>
                  ))}
                  {str(an.ganci?.findings.apertura) && <div className="text-sm border-t pt-2"><span className="text-muted-foreground">Per aprire: </span>&ldquo;{str(an.ganci?.findings.apertura)}&rdquo;</div>}
                </div>
              )}
            </Blocco>
            <div className="rounded-md border px-3 py-2.5 text-sm"><span className="font-medium">Prossimo passo: </span>{s.prossimo}</div>
          </Sezione>

          <section className="mt-5">
            <div className="text-sm font-semibold mb-1">Storia</div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              {s.storia.map((e, i) => <div key={i} className="break-words">{data(e.quando)} · {e.cosa}</div>)}
            </div>
          </section>
        </CardContent></Card>
      </div>
    </Ctx.Provider>
  );
}
