"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, ExternalLink, Footprints, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Azione =
  | { tipo: "decidi" }
  | { tipo: "cassetta"; voceId: string; si: string; no: string; testo: string | null; link: string | null }
  | { tipo: "conosco"; nomi: string[] }
  | { tipo: "presentato" }
  | { tipo: "incontro" };

interface Azienda {
  leadId: string; lavorazioneId: string | null; nome: string; zona: string | null; categoria: string | null;
  passo: 1 | 2 | 3 | 4; tocca: "te" | "crm" | "attesa"; cosa: string; azione: Azione | null;
}
interface Dati {
  passi: { n: 1 | 2 | 3 | 4; nome: string; spiega: string; quante: number; toccaATe: number }[];
  oggi: Azienda[];
  fattiOggi: number;
  aziende: Azienda[];
  dopo: number;
  inPausa: number;
}

const TOCCA: Record<Azienda["tocca"], { testo: string; classe: string }> = {
  te: { testo: "tocca a te", classe: "bg-primary/15 text-primary" },
  crm: { testo: "ci pensa il CRM", classe: "bg-muted text-muted-foreground" },
  attesa: { testo: "si aspetta", classe: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" },
};

async function chiama(url: string, metodo: string, body?: unknown): Promise<boolean> {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) toast.error("Non sono riuscito a salvare");
  return r.ok;
}

function Scheda({ a, passi, onCambio }: { a: Azienda; passi: Dati["passi"]; onCambio: () => void }) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  const fai = async (chiave: string, url: string, metodo: string, body: unknown, ok: string) => {
    setInCorso(chiave);
    if (await chiama(url, metodo, body)) {
      toast.success(ok);
      onCambio();
    }
    setInCorso(null);
  };
  const bottone = (chiave: string, etichetta: string, run: () => void, variante: "default" | "outline" | "ghost" = "outline") => (
    <Button key={chiave} size="sm" variant={variante} className="h-8 text-xs" disabled={!!inCorso} onClick={run}>
      {inCorso === chiave && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}{etichetta}
    </Button>
  );
  const x = a.azione;
  const lav = a.lavorazioneId ? `/api/rete/lavorazioni/${a.lavorazioneId}` : null;
  return (
    <Card><CardContent className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/aziende-trovate/${a.leadId}`} className="font-medium hover:underline break-words">{a.nome}</Link>
        <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{a.passo}. {passi.find((p) => p.n === a.passo)?.nome}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded ${TOCCA[a.tocca].classe}`}>{TOCCA[a.tocca].testo}</span>
      </div>
      {(a.zona || a.categoria) && <div className="text-xs text-muted-foreground break-words">{[a.categoria, a.zona].filter(Boolean).join(" · ")}</div>}
      <div className="text-sm">{a.cosa}</div>

      {x?.tipo === "cassetta" && x.testo && (
        <div className="rounded-md border bg-muted/40 p-2 text-sm whitespace-pre-wrap break-words">{x.testo}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {x?.tipo === "decidi" && <>
          {bottone("si", "Approfondisci", () => fai("si", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "approfondisci" }, "Approfondita: entra al passo 2"), "default")}
          {bottone("no", "Scarta", () => fai("no", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "scarta" }, "Scartata"), "ghost")}
        </>}
        {x?.tipo === "cassetta" && <>
          {x.testo && bottone("copia", "Copia il testo", () => { void navigator.clipboard.writeText(x.testo!).then(() => toast.success("Copiato")); })}
          {x.link && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={x.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Apri il post</a></Button>}
          {bottone("si", x.si, () => fai("si", `/api/cassetta/${x.voceId}`, "POST", { decisione: "APPROVATO" }, "Fatto: un passo avanti"), "default")}
          {bottone("no", x.no, () => fai("no", `/api/cassetta/${x.voceId}`, "POST", { decisione: "SCARTATO" }, "Segnato"), "ghost")}
        </>}
        {x?.tipo === "presentato" && lav && bottone("presentato", "Me l'ha presentata", () => fai("presentato", lav, "PATCH", { azione: "presentato" }, "Presentata: ora al passo 4"))}
        {x?.tipo === "incontro" && lav && bottone("incontro", "Incontro fissato", () => fai("incontro", lav, "PATCH", { azione: "incontro" }, "Incontro fissato: va in Trattative"), a.tocca === "te" ? "default" : "outline")}
      </div>
      {x?.tipo === "conosco" && (
        <div className="space-y-1.5">
          {x.nomi.map((n) => (
            <div key={n} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 break-words">{n}</span>
              {bottone(`${n}-si`, "Lo conosco", () => fai(`${n}-si`, "/api/rete/cerchia", "POST", { nome: n, conosco: true, lavorazioneId: a.lavorazioneId ?? undefined }, `${n} è nella tua cerchia`))}
              {bottone(`${n}-no`, "No", () => fai(`${n}-no`, "/api/rete/cerchia", "POST", { nome: n, conosco: false, lavorazioneId: a.lavorazioneId ?? undefined }, "Ok, non lo propongo più"), "ghost")}
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}

/**
 * Il percorso (v3.62): una pagina sola, 4 passi. Ogni azienda sta in un passo e mostra una cosa da fare;
 * in cima il passo di oggi, le aziende dove tocca a te, prima quelle più vicine al contatto.
 */
export default function PercorsoPage() {
  const [d, setD] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(1);
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

  const nelPasso = (d?.aziende ?? []).filter((a) => a.passo === passo).sort((a, b) => Number(b.tocca === "te") - Number(a.tocca === "te"));

  return (
    <div className="space-y-5 min-w-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Footprints className="h-6 w-6 text-primary" /> Percorso</h1>
        <p className="text-sm text-muted-foreground">Ogni giorno un passo avanti: trovate, chi te la presenta, in riscaldamento, contatto.</p>
      </div>

      {errore && <Card><CardContent className="p-4 text-sm flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" />{errore}</CardContent></Card>}
      {!d && !errore && <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>}

      {d && <>
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Il passo di oggi</h2>
            <span className="text-sm text-muted-foreground flex items-center gap-1">{d.fattiOggi > 0 && <Check className="h-4 w-4 text-green-600" />}Oggi hai fatto {d.fattiOggi} {d.fattiOggi === 1 ? "passo" : "passi"}</span>
          </div>
          {d.oggi.length === 0
            ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Per oggi niente tocca a te: il CRM sta lavorando sulle aziende. Torna domani.</CardContent></Card>
            : <div className="space-y-2">{d.oggi.map((a) => <Scheda key={a.leadId} a={a} passi={d.passi} onCambio={carica} />)}</div>}
        </section>

        <section className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {d.passi.map((p) => (
              <button key={p.n} onClick={() => setPasso(p.n)}
                className={`text-left rounded-lg border p-3 transition min-w-0 ${passo === p.n ? "border-primary bg-primary/10" : "bg-muted/40 hover:bg-muted border-transparent"}`}>
                <div className="text-xs text-muted-foreground">Passo {p.n}</div>
                <div className="font-medium break-words">{p.nome}</div>
                <div className="text-sm">{p.quante} {p.quante === 1 ? "azienda" : "aziende"}{p.toccaATe > 0 && <span className="text-primary"> · {p.toccaATe} a te</span>}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{d.passi.find((p) => p.n === passo)?.spiega}</p>
          {nelPasso.length === 0
            ? <Card><CardContent className="p-4 text-sm text-muted-foreground">Nessuna azienda in questo passo.</CardContent></Card>
            : <div className="space-y-2">{nelPasso.map((a) => <Scheda key={a.leadId} a={a} passi={d.passi} onCambio={carica} />)}</div>}
        </section>

        <p className="text-sm text-muted-foreground">
          Dopo il contatto: {d.dopo} con l&apos;incontro fissato o più avanti, in <Link href="/trattative" className="underline">Trattative</Link>{d.inPausa > 0 && ` · ${d.inPausa} in pausa (tornano da sole)`}.
        </p>
      </>}
    </div>
  );
}
