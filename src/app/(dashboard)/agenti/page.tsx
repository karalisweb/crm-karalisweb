"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bot, CheckCircle2, Laptop, Server } from "lucide-react";
import { data, dataOra } from "@/components/ricerca/etichette";

interface Agente {
  chiave: string; nome: string; cosa: string; dove: "server" | "mac"; momento: "trovata" | "approfondisci" | "sintesi"; modo: "auto" | "mano"; costo: string;
  fatti24h: number; falliti24h: number; inCorso: number; inCoda: number;
  ultimoErrore: { error: string | null; finishedAt: string; lead: { id: string; name: string } | null } | null;
}
interface Dati { agenti: Agente[]; mac: { inCodaDa: string | null; oreInCoda: number; ultimoLavoro: string | null; inCoda: number } }

const MOMENTI: { k: Agente["momento"]; titolo: string; spiega: string }[] = [
  { k: "trovata", titolo: "Analisi veloce", spiega: "Partono appena un'azienda è trovata (o aggiunta a mano). Costano centesimi." },
  { k: "approfondisci", titolo: "Analisi completa", spiega: "Partono quando premi Approfondisci sulla scheda." },
  { k: "sintesi", titolo: "Le frasi per il telefono", spiega: "Si rifanno ogni volta che arriva un dato nuovo." },
];

export default function AgentiPage() {
  const [d, setD] = useState<Dati | null>(null);
  const [versione, setVersione] = useState(0);
  useEffect(() => {
    let vivo = true;
    fetch("/api/agenti/catalogo").then((r) => r.json()).then((x) => vivo && setD(x));
    return () => {
      vivo = false;
    };
  }, [versione]);

  const cambia = useCallback(async (chiave: string, modo: "auto" | "mano") => {
    setD((x) => (x ? { ...x, agenti: x.agenti.map((a) => (a.chiave === chiave ? { ...a, modo } : a)) } : x));
    await fetch("/api/agenti/catalogo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chiave, modo }) });
    setVersione((v) => v + 1);
  }, []);

  if (!d) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  const oreFermo = d.mac.oreInCoda;

  return (
    <div className="space-y-5 min-w-0 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> Agenti</h1>
        <p className="text-sm text-muted-foreground">Chi analizza le aziende, dove lavora e quando parte. Per ognuno scegli: <b>automatico</b> (parte da solo al suo momento) o <b>a mano</b> (parte solo quando premi il suo pulsante nella scheda azienda).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="p-4 text-sm">
          <div className="font-semibold flex items-center gap-2"><Server className="h-4 w-4" /> Sul server</div>
          <p className="text-muted-foreground mt-1">Lavorano dentro il CRM, sempre, anche a computer spento. Non chiedono permessi.</p>
        </CardContent></Card>
        <Card className={oreFermo >= 2 ? "border-amber-400" : ""}><CardContent className="p-4 text-sm">
          <div className="font-semibold flex items-center gap-2"><Laptop className="h-4 w-4" /> Sul tuo Mac</div>
          <p className="text-muted-foreground mt-1">Solo LinkedIn, perché serve il tuo account. Passa ogni mezz&apos;ora dalle 8 alle 20, se il Mac è acceso.</p>
          <div className="mt-2">
            {d.mac.inCoda > 0
              ? oreFermo >= 2
                ? <span className="text-amber-700 dark:text-amber-400"><AlertTriangle className="h-4 w-4 inline mr-1" />{d.mac.inCoda} lavori aspettano da {oreFermo} ore: il Mac è spento o l&apos;agente è fermo.</span>
                : <span>{d.mac.inCoda} lavori in coda, li prende al prossimo passaggio.</span>
              : <span className="text-green-700 dark:text-green-400"><CheckCircle2 className="h-4 w-4 inline mr-1" />Niente in coda.</span>}
            {d.mac.ultimoLavoro && <div className="text-xs text-muted-foreground mt-1">Ultimo lavoro: {dataOra(d.mac.ultimoLavoro)}</div>}
          </div>
        </CardContent></Card>
      </div>

      {MOMENTI.map((m) => (
        <section key={m.k} className="space-y-2">
          <div>
            <h2 className="font-semibold">{m.titolo}</h2>
            <p className="text-xs text-muted-foreground">{m.spiega}</p>
          </div>
          {d.agenti.filter((a) => a.momento === m.k).map((a) => (
            <Card key={a.chiave}><CardContent className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">{a.nome}<span className="text-[11px] text-muted-foreground flex items-center gap-1">{a.dove === "mac" ? <Laptop className="h-3 w-3" /> : <Server className="h-3 w-3" />}{a.dove === "mac" ? "sul tuo Mac" : "sul server"}</span></div>
                  <div className="text-xs text-muted-foreground">{a.cosa} · costo: {a.costo}</div>
                  <div className="text-xs mt-1">
                    Ultime 24 ore: {a.fatti24h} fatti{a.falliti24h ? <span className="text-red-600 dark:text-red-400">, {a.falliti24h} non riusciti</span> : null}{a.inCorso ? `, ${a.inCorso} in corso` : ""}{a.inCoda ? `, ${a.inCoda} in coda` : ""}
                  </div>
                  {a.ultimoErrore && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-0.5 break-words">
                      Ultimo errore{a.ultimoErrore.lead ? <> su <Link href={`/aziende-trovate/${a.ultimoErrore.lead.id}`} className="underline">{a.ultimoErrore.lead.name}</Link></> : null} ({data(a.ultimoErrore.finishedAt)}): {a.ultimoErrore.error}
                    </div>
                  )}
                </div>
                <div className="flex rounded-md border overflow-hidden text-xs shrink-0" role="group" aria-label={`Modo di ${a.nome}`}>
                  {(["auto", "mano"] as const).map((x) => (
                    <button key={x} onClick={() => cambia(a.chiave, x)} className={`px-2.5 py-1 ${a.modo === x ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{x === "auto" ? "Automatico" : "A mano"}</button>
                  ))}
                </div>
              </div>
            </CardContent></Card>
          ))}
        </section>
      ))}

      <p className="text-xs text-muted-foreground">Gli altri agenti (ricerca delle aziende, BNI, calendario) partono a orari fissi: li trovi in <Link href="/squadra" className="underline">Turni e storico</Link>.</p>
    </div>
  );
}
