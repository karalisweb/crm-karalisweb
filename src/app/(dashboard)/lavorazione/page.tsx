"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, Loader2, RefreshCw, Route, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { data } from "@/components/ricerca/etichette";

interface Lavorazione {
  id: string; leadId: string; azienda: string; zona: string | null; categoria: string | null;
  fase: string; etichettaFase: string; attiva: boolean; strada: string | null; etichettaStrada: string | null;
  ponte: string | null; decisore: string | null; tentativi: number; provati: string[];
  chiestaAt: string | null; presentatoAt: string | null; scaldataAt: string | null; incontroAt: string | null;
  propostaAt: string | null; clienteAt: string | null; pausaFino: string | null; note: string | null;
  daConfermare: string[]; prossimoPasso: string;
}
interface Dati {
  capienza: number;
  attive: number;
  lavorazioni: Lavorazione[];
  cerchia: { daBni: number; aggiunti: { id: string; nome: string }[] };
}

const GRUPPI: { k: string; titolo: string; fasi: string[] }[] = [
  { k: "lavoro", titolo: "In lavorazione", fasi: ["MAPPATA", "PONTE_SCELTO", "CHIESTA"] },
  { k: "vendita", titolo: "Incontro e proposta", fasi: ["INCONTRO", "PROPOSTA"] },
  { k: "fine", titolo: "Clienti e pause", fasi: ["CLIENTE", "PAUSA"] },
];

const COLORE: Record<string, string> = {
  MAPPATA: "bg-muted text-foreground",
  PONTE_SCELTO: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  CHIESTA: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  INCONTRO: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  PROPOSTA: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  CLIENTE: "bg-green-600 text-white",
  PAUSA: "bg-muted text-muted-foreground",
};

async function chiama(url: string, metodo: string, body?: unknown): Promise<boolean> {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) {
    toast.error("Non sono riuscito a salvare");
    return false;
  }
  return true;
}

function Scheda({ l, onCambio }: { l: Lavorazione; onCambio: () => void }) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  async function azione(a: string, ok: string) {
    setInCorso(a);
    if (await chiama(`/api/rete/lavorazioni/${l.id}`, "PATCH", { azione: a })) {
      toast.success(ok);
      onCambio();
    }
    setInCorso(null);
  }
  async function conosco(nome: string, si: boolean) {
    setInCorso(nome);
    if (await chiama("/api/rete/cerchia", "POST", { nome, conosco: si, lavorazioneId: l.id })) {
      toast.success(si ? `${nome} è nella tua cerchia` : "Ok, non lo propongo più per questa azienda");
      onCambio();
    }
    setInCorso(null);
  }
  const bottone = (a: string, etichetta: string, ok: string, variante: "outline" | "ghost" = "outline") => (
    <Button size="sm" variant={variante} className="h-8 text-xs" disabled={!!inCorso} onClick={() => azione(a, ok)}>
      {inCorso === a && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}{etichetta}
    </Button>
  );
  return (
    <Card><CardContent className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/aziende-trovate/${l.leadId}`} className="font-medium hover:underline break-words">{l.azienda}</Link>
        <span className={`text-[11px] px-2 py-0.5 rounded ${COLORE[l.fase] ?? "bg-muted"}`}>{l.etichettaFase}</span>
        {l.etichettaStrada && <Badge variant="outline" className="text-[10px]">{l.etichettaStrada}</Badge>}
        {l.tentativi > 0 && <span className="text-[11px] text-muted-foreground">tentativo {l.tentativi + 1} di 3</span>}
      </div>
      <div className="text-xs text-muted-foreground break-words">
        {[l.decisore && `chi decide: ${l.decisore}`, l.ponte && `ponte: ${l.ponte}`, l.categoria, l.zona].filter(Boolean).join(" · ")}
      </div>
      <p className="text-sm">{l.prossimoPasso}</p>

      {l.daConfermare.length > 0 && (
        <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
          <div className="text-xs font-medium">Li conosci davvero?</div>
          {l.daConfermare.map((n) => (
            <div key={n} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">{n}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!!inCorso} onClick={() => conosco(n, true)}><Check className="h-3 w-3 mr-0.5" /> Lo conosco</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!!inCorso} onClick={() => conosco(n, false)}><X className="h-3 w-3 mr-0.5" /> No</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {l.fase === "CHIESTA" && !l.presentatoAt && bottone("presentato", "Mi ha presentato", "Segnato: ora fissa l'incontro")}
        {l.fase === "MAPPATA" && !l.scaldataAt && l.strada === "SCALDARE" && bottone("scaldata", "Ha risposto ai miei commenti", "Scaldato: il messaggio è in Cassetta")}
        {(l.fase === "CHIESTA" || l.fase === "PONTE_SCELTO" || l.fase === "MAPPATA") && bottone("incontro", "Incontro fissato", "Incontro: entra la prossima azienda")}
        {l.fase === "INCONTRO" && bottone("proposta", "Proposta fatta", "Proposta segnata")}
        {(l.fase === "INCONTRO" || l.fase === "PROPOSTA") && bottone("cliente", "È cliente", "Cliente!")}
        {l.attiva && bottone("pausa", "Pausa 3 mesi", "In pausa", "ghost")}
        {l.fase === "PAUSA" && bottone("riprendi", "Riprendi adesso", "Ripresa")}
      </div>
      <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
        {l.chiestaAt && <span>chiesta {data(l.chiestaAt)}</span>}
        {l.presentatoAt && <span>presentato {data(l.presentatoAt)}</span>}
        {l.incontroAt && <span>incontro {data(l.incontroAt)}</span>}
        {l.propostaAt && <span>proposta {data(l.propostaAt)}</span>}
        {l.provati.length > 0 && <span>già provati: {l.provati.join(", ")}</span>}
      </div>
    </CardContent></Card>
  );
}

/**
 * La rete al centro (v3.53): le aziende in lavorazione, 15 il primo mese e 30 dal secondo. Il caso studio
 * dice chi cercare, la tua rete dice come arrivarci. Qui si vede a che fase è ognuna e cosa manca.
 */
export default function LavorazionePage() {
  const [d, setD] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState("");
  const [aggiornando, setAggiornando] = useState(false);
  const carica = useCallback(async () => {
    setErrore(null);
    try {
      const r = await fetch("/api/rete");
      if (!r.ok) throw new Error("Non riesco a leggere le aziende in lavorazione");
      setD(await r.json());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore");
    }
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  async function aggiornaAdesso() {
    setAggiornando(true);
    const r = await fetch("/api/rete/turno", { method: "POST" });
    setAggiornando(false);
    if (!r.ok) return toast.error("Non sono riuscito ad aggiornare");
    const x = await r.json();
    toast.success(`Fatto: ${x.entrate} entrate, ${x.messaggi} messaggi in Cassetta`);
    carica();
  }
  async function aggiungi() {
    if (nuovo.trim().length < 3) return;
    if (await chiama("/api/rete/cerchia", "POST", { nome: nuovo.trim(), conosco: true })) {
      toast.success("Aggiunto alla cerchia");
      setNuovo("");
      carica();
    }
  }
  async function togli(id: string) {
    if (await chiama(`/api/rete/cerchia/${id}`, "DELETE")) carica();
  }

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="h-6 w-6 text-primary" /> In lavorazione</h1>
          <p className="text-sm text-muted-foreground">Il caso studio dice chi cercare, la tua rete dice come arrivarci. Entrano da sole fra le aziende che approfondisci, prima quelle con il ponte più forte.</p>
        </div>
        <Button variant="outline" size="sm" onClick={aggiornaAdesso} disabled={aggiornando}>
          <RefreshCw className={`h-4 w-4 mr-1 ${aggiornando ? "animate-spin" : ""}`} /> Aggiorna adesso
        </Button>
      </div>

      {errore && <Card className="border-red-500"><CardContent className="p-4 text-red-600"><AlertTriangle className="h-4 w-4 inline mr-2" />{errore}</CardContent></Card>}

      {!d ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : (
        <>
          <Card><CardContent className="p-4 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-semibold">{d.attive} aziende in lavorazione su {d.capienza}</div>
              <div className="text-xs text-muted-foreground">{d.capienza === 15 ? "15 il primo mese, 30 dal secondo" : "30 dal secondo mese"}</div>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (d.attive / d.capienza) * 100)}%` }} /></div>
            <p className="text-xs text-muted-foreground">Le strade, in ordine: un membro BNI con cui hai fatto un 121, un altro contatto della tua cerchia, chi decide è già nella tua cerchia, chi decide ha risposto ai tuoi commenti. Senza strade non si contatta: l&apos;azienda aspetta. Ponte senza risposta: promemoria dopo 5 giorni, il successivo dopo 10, pausa di 3 mesi dopo 3 tentativi.</p>
          </CardContent></Card>

          {d.lavorazioni.length === 0 && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Ancora nessuna. Entrano le aziende che approfondisci e di cui si conosce chi decide; premi &quot;Aggiorna adesso&quot;.</CardContent></Card>
          )}

          {GRUPPI.map((g) => {
            const lista = d.lavorazioni.filter((l) => g.fasi.includes(l.fase));
            if (!lista.length) return null;
            return (
              <div key={g.k} className="space-y-2">
                <div className="text-sm font-semibold">{g.titolo} ({lista.length})</div>
                {lista.map((l) => <Scheda key={l.id} l={l} onCambio={carica} />)}
              </div>
            );
          })}

          <Card><CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> La tua cerchia stretta</div>
            <p className="text-xs text-muted-foreground">
              {d.cerchia.daBni} membri BNI con cui hai fatto un 121 (entrano da soli) + {d.cerchia.aggiunti.length} persone che hai segnato. Un ponte vale solo se è qui.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input id="cerchia-nuovo" value={nuovo} onChange={(e) => setNuovo(e.target.value)} placeholder="Nome e cognome" className="h-8 max-w-xs" onKeyDown={(e) => e.key === "Enter" && aggiungi()} />
              <Button size="sm" variant="outline" onClick={aggiungi} disabled={nuovo.trim().length < 3}>Aggiungi</Button>
            </div>
            {d.cerchia.aggiunti.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.cerchia.aggiunti.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5">
                    {c.nome}
                    <button aria-label={`Togli ${c.nome}`} onClick={() => togli(c.id)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
