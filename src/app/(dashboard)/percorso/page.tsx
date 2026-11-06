"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Footprints, Loader2, UserPlus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { SchedaPercorso, type AziendaPercorso, type DatiPercorso } from "@/components/percorso/scheda";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";
import { CercaTu } from "@/components/ricerca/cerca-tu";
import { Sezione } from "@/components/ui/sezione";

/** La cerchia stretta (prima in "In lavorazione"): un ponte vale solo se è qui. Sta nel passo 2. */
function Cerchia() {
  const [c, setC] = useState<{ daBni: number; aggiunti: { id: string; nome: string }[] } | null>(null);
  const [nuovo, setNuovo] = useState("");
  const [versione, setVersione] = useState(0);
  const carica = () => setVersione((v) => v + 1);
  useEffect(() => {
    fetch("/api/rete").then((r) => (r.ok ? r.json() : null)).then((x) => x && setC(x.cerchia));
  }, [versione]);
  async function salva(url: string, metodo: string, body?: unknown) {
    const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) toast.error("Non sono riuscito a salvare");
    return r.ok;
  }
  async function aggiungi() {
    if (nuovo.trim().length < 3) return;
    if (await salva("/api/rete/cerchia", "POST", { nome: nuovo.trim(), conosco: true })) {
      toast.success("Aggiunto alla cerchia");
      setNuovo("");
      carica();
    }
  }
  if (!c) return null;
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> La tua cerchia stretta</div>
      <p className="text-xs text-muted-foreground">
        {c.daBni} membri BNI con cui hai fatto un 121 (entrano da soli) + {c.aggiunti.length} persone che hai segnato. Chi te la presenta deve essere qui.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input value={nuovo} onChange={(e) => setNuovo(e.target.value)} placeholder="Nome e cognome" className="h-8 max-w-xs" onKeyDown={(e) => e.key === "Enter" && aggiungi()} />
        <Button size="sm" variant="outline" onClick={aggiungi} disabled={nuovo.trim().length < 3}>Aggiungi</Button>
      </div>
      {c.aggiunti.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.aggiunti.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5">
              {p.nome}
              <button aria-label={`Togli ${p.nome}`} onClick={async () => (await salva(`/api/rete/cerchia/${p.id}`, "DELETE")) && carica()} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}

/** "Analizza adesso" (v3.111): spinge a mano una sottosezione dove lavora il CRM. */
function AnalizzaAdesso({ passo, stato, quante, inCoda, onFatto }: { passo: number; stato: string; quante: number; inCoda: number; onFatto: () => void }) {
  const [inCorso, setInCorso] = useState(false);
  async function vai() {
    setInCorso(true);
    try {
      const r = await fetch("/api/percorso/forza", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passo, stato }) });
      const e = (await r.json().catch(() => null)) as { accodati?: number; giaInCoda?: number; bloccoLinkedin?: boolean } | null;
      if (!r.ok || !e) throw new Error();
      if (e.bloccoLinkedin) toast.warning("LinkedIn ha bloccato da poco: il CRM aspetta 48 ore per non rischiare l'account. Ho fatto il resto del giro.");
      else if (e.accodati || e.giaInCoda) toast.success(`${(e.accodati ?? 0) + (e.giaInCoda ?? 0)} in coda per il Mac: le fa al prossimo giro (ogni ora, 10 alla volta).`);
      else toast.success("Fatto il giro adesso.");
      onFatto();
    } catch {
      toast.error("Non sono riuscito a farlo partire");
    } finally {
      setInCorso(false);
    }
  }
  // v3.112 (Alessio: "come mi rendo conto di quali ho premuto?"): quante sono già in coda per il Mac.
  return (
    <span className="flex items-center gap-2">
    {inCoda > 0 && <span className="text-xs font-normal text-amber-700 dark:text-amber-300">{inCoda === quante ? "tutte" : inCoda} in coda per il Mac</span>}
    <Button size="sm" variant="outline" className="h-7" disabled={inCorso} onClick={vai} title={`Fa partire subito il lavoro del CRM su tutte le ${quante}`}>
      {inCorso ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
      <span className="ml-1">Analizza adesso</span>
    </Button>
    </span>
  );
}

/**
 * Il percorso (v3.63): l'unica pagina delle aziende, 4 passi. Ha preso il posto di "Aziende trovate" e
 * "In lavorazione"; le cose da fare oggi stanno nella pagina Oggi.
 */
// useSearchParams vuole un Suspense intorno, o la build non prepara la pagina.
export default function PercorsoPage() {
  return <Suspense><Percorso /></Suspense>;
}

function Percorso() {
  const [d, setD] = useState<DatiPercorso | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  // Da Oggi si arriva con ?passo=N&azienda=ID (v3.78): si apre quel passo e si va su quell'azienda.
  const cerca = useSearchParams();
  const daOggi = cerca.get("azienda");
  const passoIniziale = Number(cerca.get("passo"));
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(passoIniziale >= 1 && passoIniziale <= 4 ? (passoIniziale as 1 | 2 | 3 | 4) : 1);
  const carica = useCallback(async () => {
    setErrore(null);
    try {
      const r = await fetch("/api/percorso");
      if (!r.ok) throw new Error("Non riesco a leggere il percorso");
      setD(await r.json());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore");
    }
  }, []);
  useEffect(() => {
    carica();
  }, [carica]);
  useEffect(() => {
    if (!d || !daOggi) return;
    // Dopo che la pagina si è disegnata, o lo scorrimento si perde.
    const t = setTimeout(() => document.getElementById(`azienda-${daOggi}`)?.scrollIntoView({ block: "center" }), 300);
    return () => clearTimeout(t);
  }, [d, daOggi]);

  // Già in ordine di stato dal server: qui si raggruppano, con il nome dello stato sopra.
  const raggruppa = (n: number) => (d?.aziende ?? []).filter((a) => a.passo === n).reduce<{ stato: string; nome: string; aziende: AziendaPercorso[] }[]>((g, a) => {
    const ultimo = g[g.length - 1];
    if (ultimo?.stato === a.stato) ultimo.aziende.push(a);
    else g.push({ stato: a.stato, nome: a.statoNome, aziende: [a] });
    return g;
  }, []);
  const nelPasso = (d?.aziende ?? []).filter((a) => a.passo === passo);
  const gruppi = raggruppa(passo);
  // v3.109 (Alessio, 2026-11-06): dalla scheda del passo si va dritti a una sottosezione, aperta.
  const [daAprire, setDaAprire] = useState<string | null>(null);
  const vaiA = (n: 1 | 2 | 3 | 4, stato: string) => {
    setPasso(n);
    setDaAprire(stato);
    setTimeout(() => document.getElementById(`percorso:${n}:${stato}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 100);
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Footprints className="h-6 w-6 text-primary" /> Percorso</h1>
        <p className="text-sm text-muted-foreground">Tutte le aziende, in 4 passi: trovate, chi te la presenta, in riscaldamento, contatto. Le cose da fare oggi le trovi in <Link href="/" className="underline">Oggi</Link>.</p>
      </div>

      {errore && <Card><CardContent className="p-4 text-sm flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" />{errore}</CardContent></Card>}
      {!d && !errore && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>}

      {d && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {d.passi.map((p) => (
            <div key={p.n} className={`rounded-lg border p-3 transition min-w-0 ${passo === p.n ? "border-primary bg-primary/10" : "bg-muted/40 hover:bg-muted border-transparent"}`}>
              <button onClick={() => setPasso(p.n)} className="text-left w-full">
                <div className="text-xs text-muted-foreground">Passo {p.n}</div>
                <div className="font-medium break-words">{p.nome}</div>
                <div className="text-sm">{p.quante} {p.quante === 1 ? "azienda" : "aziende"}{p.toccaATe > 0 && <span className="text-primary"> · {p.toccaATe} a te</span>}</div>
              </button>
              {/* Le sottosezioni con quante ce ne sono, già da fuori (v3.109). */}
              {raggruppa(p.n).length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t pt-2">
                  {raggruppa(p.n).map((g) => (
                    <li key={g.stato}>
                      <button onClick={() => vaiA(p.n, g.stato)} className="flex w-full items-baseline justify-between gap-2 text-left text-xs text-muted-foreground hover:text-foreground">
                        <span className={`min-w-0 break-words ${g.aziende[0].tocca === "te" ? "text-primary" : ""}`}>{g.nome}</span>
                        <span className="shrink-0 tabular-nums">{g.aziende.some((a) => a.mac) && <span className="text-amber-700 dark:text-amber-300">{g.aziende.filter((a) => a.mac).length} in coda · </span>}{g.aziende.length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{d.passi.find((p) => p.n === passo)?.spiega}</p>

        {passo === 1 && (
          <div className="space-y-2">
            <div className="flex justify-end"><LanciaAdesso squadra="ricerca" etichetta="Cerca adesso" onFatto={carica} /></div>
            <CercaTu onFatto={carica} />
          </div>
        )}

        {nelPasso.length === 0
          ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Nessuna azienda in questo passo.</CardContent></Card>
          : <div className="space-y-3">{gruppi.map((g) => (
            <Sezione key={g.stato} id={`percorso:${passo}:${g.stato}`} titolo={g.nome} conteggio={g.aziende.length}
              forzaAperta={daAprire === g.stato || g.aziende.some((a) => a.leadId === daOggi)}
              azione={g.aziende[0].tocca === "crm" ? <AnalizzaAdesso passo={passo} stato={g.stato} quante={g.aziende.length} inCoda={g.aziende.filter((a) => a.mac).length} onFatto={carica} /> : undefined}>
              {g.aziende.map((a) => <SchedaPercorso key={a.leadId} a={a} passi={d.passi} onCambio={carica} evidenziata={a.leadId === daOggi} />)}
            </Sezione>
          ))}</div>}

        {passo === 2 && <Cerchia />}

        <p className="text-sm text-muted-foreground">
          Dopo il contatto: {d.dopo} con l&apos;incontro fissato o più avanti, in <Link href="/trattative" className="underline">Trattative</Link>{d.inPausa > 0 && ` · ${d.inPausa} in pausa (tornano da sole)`}.
        </p>
      </>}
    </div>
  );
}
