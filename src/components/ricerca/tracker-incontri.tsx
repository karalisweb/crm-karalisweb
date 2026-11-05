"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check, Copy, MessageCircle, Pencil, Phone, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { localeAIso } from "@/components/vendita/call-fissata-dialog";
import { CorpoVisitaCapitolo, linkWhatsApp } from "@/components/agents/voci-cassetta";
import { data, dataOra } from "@/components/ricerca/etichette";

export interface RigaRichiesta {
  voceId: string;
  membroId: string;
  nome: string;
  capitolo: string;
  telefono: string | null;
  perche: string | null;
  messaggio: string;
  /** v3.100: il promemoria per chi non ha ancora risposto. */
  followup?: string;
  formato: string | null;
  mandataIl: string | null;
  /** v3.105: quando è partito il follow-up (null = non ancora). */
  followupAt?: string | null;
}
export interface Tracker {
  daMandare: RigaRichiesta[];
  inAttesa: RigaRichiesta[];
  senzaRisposta: RigaRichiesta[];
  fatti: { id: string; data: string; formato: string | null; membroId: string; nome: string; capitolo: string | null }[];
}
export interface Visita {
  voceId: string;
  capitolo: string;
  telefono: string | null;
  payload: Record<string, unknown>;
}
export interface Fissato {
  foglio?: boolean;
  id: string;
  name: string;
  company: string | null;
  profession: string | null;
  chapter: string | null;
  next121At: string;
}

type Scheda = "daMandare" | "inAttesa" | "senzaRisposta" | "fissati" | "fatti";

const FORMATO: Record<string, string> = { PRESENZA: "di persona", ONLINE: "online", A_SCELTA: "di persona o online" };

function giorniFa(iso: string): string {
  const g = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : `${g} giorni fa`;
}

function FissaData({ membroId, onFatto }: { membroId: string; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [quando, setQuando] = useState("");
  async function salva() {
    const iso = localeAIso(quando);
    if (!iso) return toast.error("Scegli data e ora");
    const r = await fetch(`/api/ricerca/bni/membri/${membroId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next121At: iso }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success("Incontro fissato");
    setAperto(false);
    onFatto();
  }
  if (!aperto) return <Button size="sm" variant="outline" onClick={() => setAperto(true)}><CalendarClock className="h-3.5 w-3.5 mr-1" /> Ha risposto: fisso la data</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-8 w-auto" />
      <Button size="sm" onClick={salva}>Salva</Button>
    </div>
  );
}

/**
 * v3.100 (Alessio: "perché a volte c'è il riscrivi e a volte no?"): WhatsApp si apre solo col cellulare del membro.
 * Dove manca, lo si scrive qui una volta e da lì compaiono "Manda su WhatsApp" e "Riscrivi".
 */
function AggiungiNumero({ membroId, onFatto }: { membroId: string; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [numero, setNumero] = useState("");
  const [occupato, setOccupato] = useState(false);
  async function salva() {
    if (!linkWhatsApp(numero, "")) return toast.error("Scrivi un cellulare valido, es. 347 1234567");
    setOccupato(true);
    const res = await fetch(`/api/ricerca/bni/membri/${membroId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: numero.trim() }) });
    setOccupato(false);
    if (!res.ok) return toast.error("Non sono riuscito a salvare il numero");
    toast.success("Numero salvato");
    setAperto(false);
    onFatto();
  }
  if (!aperto) return <Button size="sm" variant="ghost" onClick={() => setAperto(true)}><Phone className="h-3.5 w-3.5 mr-1" /> Aggiungi il numero</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="tel" inputMode="tel" placeholder="Cellulare" value={numero} onChange={(e) => setNumero(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void salva(); }} className="h-8 w-40" autoFocus />
      <Button size="sm" onClick={salva} disabled={occupato}>Salva</Button>
      <Button size="sm" variant="ghost" onClick={() => setAperto(false)}>Annulla</Button>
    </div>
  );
}

export function DaMandare({ r, onFatto }: { r: RigaRichiesta; onFatto: () => void }) {
  const [occupato, setOccupato] = useState(false);
  const [testo, setTesto] = useState(r.messaggio);
  const [modifica, setModifica] = useState(false);
  const cambiato = testo.trim() !== r.messaggio.trim();
  const wa = linkWhatsApp(r.telefono, testo);
  async function salvaTesto() {
    const res = await fetch(`/api/ricerca/bni/richieste/${r.voceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messaggio: testo }) });
    if (!res.ok) return toast.error("Non sono riuscito a salvare il testo");
    toast.success("Testo salvato");
    setModifica(false);
  }
  async function decidi(decisione: "APPROVATO" | "SCARTATO") {
    setOccupato(true);
    const res = await fetch(`/api/cassetta/${r.voceId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisione }) });
    setOccupato(false);
    if (!res.ok) return toast.error("Non sono riuscito a salvare");
    toast.success(decisione === "APPROVATO" ? "Segnato come mandato" : "Rimandato di 30 giorni");
    onFatto();
  }
  return (
    <Card><CardContent className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/bni/membri/${r.membroId}`} className="font-medium hover:underline">{r.nome}</Link>
        <span className="text-xs text-muted-foreground">{r.capitolo}</span>
        {r.formato && FORMATO[r.formato] && <Badge variant="outline" className="text-[10px]">{FORMATO[r.formato]}</Badge>}
      </div>
      {r.perche && <div className="text-xs text-muted-foreground">{r.perche}</div>}
      {modifica ? (
        <div className="space-y-2">
          <Textarea value={testo} onChange={(e) => setTesto(e.target.value)} rows={6} className="text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={salvaTesto} disabled={!cambiato}>Salva il testo</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTesto(r.messaggio); setModifica(false); }}>Annulla</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setModifica(true)} className="w-full text-left text-sm whitespace-pre-wrap rounded-md bg-muted/40 p-2 hover:bg-muted/60 transition" title="Clicca per modificare">
          {testo}
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Pencil className="h-3 w-3" /> clicca per modificare</span>
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer"><Button size="sm"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Manda su WhatsApp</Button></a>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(testo).then(() => toast.success("Copiato"))}><Copy className="h-3.5 w-3.5 mr-1" /> Copia (manca il telefono)</Button>
            <AggiungiNumero membroId={r.membroId} onFatto={onFatto} />
          </>
        )}
        <Button size="sm" variant="outline" onClick={() => decidi("APPROVATO")} disabled={occupato}><Check className="h-3.5 w-3.5 mr-1" /> Mandato</Button>
        <Button size="sm" variant="ghost" onClick={() => decidi("SCARTATO")} disabled={occupato}><X className="h-3.5 w-3.5 mr-1" /> Non ora</Button>
      </div>
    </CardContent></Card>
  );
}

function RigaSemplice({ r, nota, onFatto }: { r: RigaRichiesta; nota: string; onFatto: () => void }) {
  // v3.100: a chi non ha risposto si manda il promemoria, non la stessa richiesta.
  const wa = linkWhatsApp(r.telefono, r.followup ?? r.messaggio);
  // v3.105: il tocco registra il follow-up: la richiesta torna in "Aspetto risposta" per altre 72 ore.
  const registraFollowup = () => {
    void fetch(`/api/ricerca/bni/richieste/${r.voceId}`, { method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followup: true }) })
      .then((res) => { if (res.ok) { toast.success("Follow-up segnato: torna in Aspetto risposta"); onFatto(); } else toast.error("Non sono riuscito a segnare il follow-up"); });
  };
  return (
    <Card><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <Link href={`/bni/membri/${r.membroId}`} className="font-medium hover:underline">{r.nome}</Link>
        <div className="text-xs text-muted-foreground">{r.capitolo} · {nota}</div>
        {r.followupAt && <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Follow-up già mandato {giorniFa(r.followupAt)}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {r.followupAt ? null : wa ? <a href={wa} target="_blank" rel="noopener noreferrer" onClick={registraFollowup}><Button size="sm" variant="ghost"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Manda il follow-up</Button></a> : <AggiungiNumero membroId={r.membroId} onFatto={onFatto} />}
        <FissaData membroId={r.membroId} onFatto={onFatto} />
      </div>
    </CardContent></Card>
  );
}

/** Dove sono gli incontri: da mandare → aspetto risposta → (non hanno risposto) → fissati → fatti. */
async function decidi(voceId: string, decisione: "APPROVATO" | "SCARTATO", ok: string, onFatto: () => void) {
  const res = await fetch(`/api/cassetta/${voceId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisione }) });
  if (!res.ok) return toast.error("Non sono riuscito a salvare");
  toast.success(ok);
  onFatto();
}

export function TrackerIncontri({ tracker, fissati, visite = [], onCambio }: { tracker: Tracker; fissati: Fissato[]; visite?: Visita[]; onCambio: () => void }) {
  const conteggi: Record<Scheda, number> = {
    daMandare: tracker.daMandare.length,
    inAttesa: tracker.inAttesa.length,
    senzaRisposta: tracker.senzaRisposta.length,
    fissati: fissati.length,
    fatti: tracker.fatti.length,
  };
  const [scheda, setScheda] = useState<Scheda>(tracker.daMandare.length ? "daMandare" : fissati.length ? "fissati" : "inAttesa");
  const schede: { k: Scheda; label: string }[] = [
    { k: "daMandare", label: "Da mandare" },
    { k: "inAttesa", label: "Aspetto risposta" },
    { k: "senzaRisposta", label: "Non hanno risposto" },
    { k: "fissati", label: "Fissati" },
    { k: "fatti", label: "Fatti nelle ultime 2 settimane" },
  ];
  const vuoto: Record<Scheda, string> = {
    daMandare: "Nessun messaggio da mandare. Ogni mattina alle 7 arrivano i prossimi (o premi \"Prepara le richieste adesso\").",
    inAttesa: "Nessuno: chi ha ricevuto il messaggio (o il follow-up) nelle ultime 72 ore compare qui.",
    senzaRisposta: "Nessuno: chi non risponde da più di 72 ore compare qui.",
    fissati: "Nessun incontro in calendario.",
    fatti: "Nessun incontro registrato nelle ultime due settimane.",
  };

  return (
    <section className="space-y-3">
      {visite.map((v) => (
        <Card key={v.voceId} className="border-green-600"><CardContent className="p-3 space-y-2">
          <div className="font-medium">È il momento di visitare il capitolo {v.capitolo}</div>
          <CorpoVisitaCapitolo p={v.payload} telefono={v.telefono} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => decidi(v.voceId, "APPROVATO", "Visita chiesta", onCambio)}><Check className="h-3.5 w-3.5 mr-1" /> Mandato</Button>
            <Button size="sm" variant="ghost" onClick={() => decidi(v.voceId, "SCARTATO", "Non ora", onCambio)}><X className="h-3.5 w-3.5 mr-1" /> Non ora</Button>
          </div>
        </CardContent></Card>
      ))}
      <h2 className="font-semibold">I tuoi incontri</h2>
      <div className="flex flex-wrap gap-1.5">
        {schede.map((s) => (
          <button
            key={s.k}
            onClick={() => setScheda(s.k)}
            className={`text-xs px-2.5 py-1.5 rounded-md border transition ${scheda === s.k ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
          >{s.label} ({conteggi[s.k]})</button>
        ))}
      </div>
      {conteggi[scheda] === 0 ? (
        <p className="text-sm text-muted-foreground">{vuoto[scheda]}</p>
      ) : (
        <div className="space-y-2">
          {scheda === "daMandare" && tracker.daMandare.map((r) => <DaMandare key={r.voceId} r={r} onFatto={onCambio} />)}
          {scheda === "inAttesa" && tracker.inAttesa.map((r) => <RigaSemplice key={r.voceId} r={r} nota={`mandato ${giorniFa(r.mandataIl!)}`} onFatto={onCambio} />)}
          {scheda === "senzaRisposta" && tracker.senzaRisposta.map((r) => <RigaSemplice key={r.voceId} r={r} nota={`nessuna risposta da ${giorniFa(r.mandataIl!).replace(" fa", "")}`} onFatto={onCambio} />)}
          {scheda === "fissati" && fissati.map((m) => (
            <Link key={m.id} href={`/bni/membri/${m.id}`} className="block">
              <Card className="hover:border-primary transition"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{[m.profession, m.chapter].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.foglio && <Badge className="bg-green-600 text-white border-transparent">foglio pronto</Badge>}
                  <Badge variant="outline">{dataOra(m.next121At)}</Badge>
                </div>
              </CardContent></Card>
            </Link>
          ))}
          {scheda === "fatti" && tracker.fatti.map((f) => (
            <Link key={f.id} href={`/bni/membri/${f.membroId}`} className="block">
              <Card className="hover:border-primary transition"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-muted-foreground">{f.capitolo}</div>
                </div>
                <span className="text-xs text-muted-foreground">{data(f.data)} · {f.formato === "ONLINE" ? "online" : "di persona"}</span>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
