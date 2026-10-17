"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarClock, Handshake, MapPin, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { localeAIso } from "@/components/vendita/call-fissata-dialog";
import { FORMATI, MOTIVI, dataOra } from "@/components/ricerca/etichette";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";

interface Settimana {
  obiettivo: number;
  fatti: number;
  fissati: number;
  richiesteAperte: number;
  inizio: string;
}
interface InCalendario {
  id: string;
  name: string;
  company: string | null;
  profession: string | null;
  chapter: string | null;
  next121At: string;
}
interface Richiesta {
  voceId: string;
  inCassetta: boolean;
  chiestaIl: string;
  membroId: string;
  nome: string;
  capitolo: string;
  perche: string | null;
}
interface Capitolo {
  id: string;
  nome: string;
  zona: string;
  sardo: boolean;
  formato: string;
  giorno: string | null;
  ora: string | null;
  sede: string | null;
  mio: boolean;
  visitStatus: string;
  visitaDaFare: boolean;
  totale: number;
  conosciuti: number;
  percentuale: number;
  inCorso: boolean;
  prossimi: { id: string; nome: string; motivo: string }[];
  attesaMappa: boolean;
}

function giorniFa(iso: string): string {
  const g = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : `${g} giorni fa`;
}

function FissaData({ membroId, onFatto }: { membroId: string; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [quando, setQuando] = useState("");
  const [salvo, setSalvo] = useState(false);
  async function salva() {
    const iso = localeAIso(quando);
    if (!iso) return toast.error("Scegli data e ora");
    setSalvo(true);
    const r = await fetch(`/api/ricerca/bni/membri/${membroId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next121At: iso }) });
    setSalvo(false);
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success("121 in calendario");
    setAperto(false);
    onFatto();
  }
  if (!aperto) return <Button size="sm" variant="outline" onClick={() => setAperto(true)}><CalendarClock className="h-3.5 w-3.5 mr-1" /> Fissato</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-8 w-auto" />
      <Button size="sm" onClick={salva} disabled={salvo}>Salva</Button>
    </div>
  );
}

export default function Bni121Page() {
  const [dati, setDati] = useState<{ settimana: Settimana; calendario: InCalendario[]; richiesteAperte: Richiesta[]; capitoli: Capitolo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/ricerca/bni");
      if (!r.ok) throw new Error("Errore nel caricamento");
      setDati(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);

  const s = dati?.settimana;
  const fatti = s ? s.fatti + s.fissati : 0;

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Handshake className="h-6 w-6 text-primary" /> Incontri BNI</h1>
          <p className="text-sm text-muted-foreground">I 121 da fare: 10 a settimana, con tutti i membri, capitolo per capitolo (prima chi fa il tuo mestiere, poi chi guida il capitolo, poi tutti gli altri).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanciaAdesso squadra="bni" etichetta="Prepara le richieste adesso" onFatto={carica} />
          <Button variant="outline" size="sm" onClick={carica} disabled={loading} aria-label="Aggiorna"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      {error && <Card className="border-red-500"><CardContent className="p-4 text-red-500"><AlertTriangle className="h-4 w-4 inline mr-2" />{error}</CardContent></Card>}

      {loading && !dati ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : dati && s ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className={`text-2xl font-bold ${fatti >= s.obiettivo ? "text-green-600 dark:text-green-400" : ""}`}>{fatti}/{s.obiettivo}</div>
              <div className="text-xs text-muted-foreground">121 questa settimana</div>
              <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (fatti / s.obiettivo) * 100)}%` }} /></div>
            </CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.fatti}</div><div className="text-xs text-muted-foreground">Fatti</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.fissati}</div><div className="text-xs text-muted-foreground">In calendario</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{s.richiesteAperte}</div><div className="text-xs text-muted-foreground">Richieste aperte (obiettivo 15)</div></CardContent></Card>
          </div>

          <section className="space-y-2">
            <h2 className="font-semibold">In calendario</h2>
            {dati.calendario.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun 121 in calendario. Quando qualcuno ti risponde, premi &quot;Fissato&quot; qui sotto e metti la data.</p>
            ) : (
              <div className="space-y-2">
                {dati.calendario.map((m) => (
                  <Link key={m.id} href={`/bni/membri/${m.id}`} className="block">
                    <Card className="hover:border-primary transition"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium break-words">{m.name}</div>
                        <div className="text-xs text-muted-foreground break-words">{[m.profession, m.company, m.chapter].filter(Boolean).join(" · ")}</div>
                      </div>
                      <Badge variant="outline">{dataOra(m.next121At)}</Badge>
                    </CardContent></Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Richieste aperte</h2>
            {dati.richiesteAperte.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna richiesta aperta. Ogni mattina alle 7 il Pianificatore prepara le prossime in Cassetta.</p>
            ) : (
              <div className="space-y-2">
                {dati.richiesteAperte.map((r) => (
                  <Card key={r.voceId}><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/bni/membri/${r.membroId}`} className="font-medium hover:underline break-words">{r.nome}</Link>
                      <div className="text-xs text-muted-foreground break-words">{r.capitolo}{r.perche ? ` · ${r.perche}` : ""}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.inCassetta ? (
                        <Link href="/cassetta"><Badge className="bg-amber-500/90 text-white gap-1"><Send className="h-3 w-3" /> da mandare</Badge></Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">mandata {giorniFa(r.chiestaIl)}</span>
                      )}
                      {!r.inCassetta && <FissaData membroId={r.membroId} onFatto={carica} />}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Capitoli</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {dati.capitoli.map((c) => (
                <Link key={c.id} href={`/bni/capitoli/${c.id}`} className="block">
                  <Card className={`hover:border-primary transition h-full ${c.inCorso ? "border-primary/60" : ""}`}><CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.nome}</span>
                      {c.inCorso && <Badge className="text-[10px]">in corso</Badge>}
                      {c.mio && <Badge variant="secondary" className="text-[10px]">il tuo</Badge>}
                      {c.visitaDaFare && <Badge className="text-[10px] bg-green-600 text-white">visita!</Badge>}
                      {c.visitStatus === "VISITA_PIANIFICATA" && <Badge variant="outline" className="text-[10px]">visita chiesta</Badge>}
                      {c.visitStatus === "VISITATO" && <Badge variant="outline" className="text-[10px]">visitato</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {c.zona && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.zona}</span>}
                      <span>{FORMATI[c.formato] ?? c.formato}</span>
                      {(c.giorno || c.ora) && <span>{[c.giorno, c.ora].filter(Boolean).join(" ")}</span>}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs"><span>Conosciuti {c.conosciuti}/{c.totale}</span><span>{c.percentuale}%</span></div>
                      <div className="mt-1 h-1.5 rounded bg-muted overflow-hidden relative">
                        <div className="h-full bg-primary" style={{ width: `${c.percentuale}%` }} />
                        <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: "33.3%" }} title="Un terzo: la visita" />
                      </div>
                    </div>
                    {c.prossimi.length > 0 && (
                      <div className="text-xs text-muted-foreground break-words">
                        Prossimi: {c.prossimi.map((p) => `${p.nome} (${MOTIVI[p.motivo] ?? p.motivo})`).join(", ")}
                      </div>
                    )}
                    {c.totale === 0 && <div className="text-xs text-muted-foreground">Membri non ancora letti da BNI Connect.</div>}
                    {c.totale > 0 && c.attesaMappa && <div className="text-xs text-amber-600 dark:text-amber-400">Non si sa ancora chi guida il capitolo: aspetto la lettura da BNI Connect (intanto solo chi fa il tuo mestiere).</div>}
                  </CardContent></Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
