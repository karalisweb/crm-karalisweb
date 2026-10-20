"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronLeft, ChevronRight, Gauge, RefreshCw } from "lucide-react";

interface Misura {
  chiave: string;
  nome: string;
  valore: number | null;
  unita: "n" | "%" | "per121";
  obiettivo: string;
  allarme: string;
  azione: string;
  stato: "ok" | "attenzione" | "allarme" | "nd";
  dettaglio?: string;
}
interface Cruscotto {
  inizio: string;
  fine: string;
  misure: Misura[];
  allarmi: number;
  linkedin: { usate: number; disponibili: number; blocco: boolean; bloccoFinoAl: string | null };
}

const STILE: Record<Misura["stato"], { punto: string; testo: string; parola: string }> = {
  ok: { punto: "bg-green-600", testo: "text-green-700 dark:text-green-400", parola: "in linea" },
  attenzione: { punto: "bg-amber-500", testo: "text-amber-700 dark:text-amber-400", parola: "attenzione" },
  allarme: { punto: "bg-red-600", testo: "text-red-700 dark:text-red-400", parola: "allarme" },
  nd: { punto: "bg-muted-foreground/40", testo: "text-muted-foreground", parola: "senza dati" },
};

function valore(m: Misura): string {
  if (m.valore === null) return "—";
  if (m.unita === "%") return `${m.valore}%`;
  if (m.unita === "per121") return `${m.valore} per 121`;
  return String(m.valore);
}

/**
 * Il cruscotto del Motore 121: gli 11 numeri della settimana con obiettivo, allarme e cosa fare.
 * Il venerdì alle 17 arriva anche per mail.
 */
export default function CruscottoPage() {
  const [indietro, setIndietro] = useState(0);
  const [c, setC] = useState<Cruscotto | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const carica = useCallback(async () => {
    setCaricando(true);
    setErrore(null);
    try {
      const r = await fetch(`/api/ricerca/cruscotto?settimane=${indietro}`);
      if (!r.ok) throw new Error("Non riesco a leggere i numeri");
      setC(await r.json());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore");
    } finally {
      setCaricando(false);
    }
  }, [indietro]);
  useEffect(() => {
    carica();
  }, [carica]);

  const settimana = c
    ? `${new Date(c.inizio).toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – ${new Date(new Date(c.fine).getTime() - 86400_000).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
    : "";

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="h-6 w-6 text-primary" /> Cruscotto 121</h1>
          <p className="text-sm text-muted-foreground">I numeri della settimana, con cosa fare quando un numero è fuori. Il venerdì alle 17 te li mando anche per mail.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Settimana prima" onClick={() => setIndietro((i) => Math.min(12, i + 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm px-2 tabular-nums min-w-[8.5rem] text-center">{indietro === 0 ? "Questa settimana" : settimana}</span>
          <Button variant="outline" size="icon" aria-label="Settimana dopo" disabled={indietro === 0} onClick={() => setIndietro((i) => Math.max(0, i - 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" aria-label="Aggiorna" onClick={carica} disabled={caricando}><RefreshCw className={`h-4 w-4 ${caricando ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>

      {errore && <Card className="border-red-500"><CardContent className="p-4 text-red-600"><AlertTriangle className="h-4 w-4 inline mr-2" />{errore}</CardContent></Card>}

      {c?.linkedin.blocco && (
        <Card className="border-red-500"><CardContent className="p-3 text-sm">
          <AlertTriangle className="h-4 w-4 inline mr-2 text-red-600" />
          LinkedIn ha chiesto una verifica o ha bloccato una ricerca: i lavori su LinkedIn sono fermi
          {c.linkedin.bloccoFinoAl ? ` fino a ${new Date(c.linkedin.bloccoFinoAl).toLocaleString("it-IT", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : " per 48 ore"}. Poi si riparte a metà ritmo.
        </CardContent></Card>
      )}

      {!c && caricando ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : c ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(["allarme", "attenzione", "ok"] as const).map((s) => (
              <Card key={s}><CardContent className="p-3">
                <div className={`text-2xl font-bold tabular-nums ${STILE[s].testo}`}>{c.misure.filter((m) => m.stato === s).length}</div>
                <div className="text-xs text-muted-foreground">{s === "ok" ? "numeri in linea" : s === "attenzione" ? "da tenere d'occhio" : "allarmi"}</div>
              </CardContent></Card>
            ))}
          </div>

          <div className="space-y-2">
            {c.misure.map((m) => (
              <Card key={m.chiave}><CardContent className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${STILE[m.stato].punto}`} aria-hidden />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">Obiettivo {m.obiettivo} · allarme {m.allarme}{m.dettaglio ? ` · ${m.dettaglio}` : ""}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold tabular-nums">{valore(m)}</div>
                    <div className={`text-xs ${STILE[m.stato].testo}`}>{STILE[m.stato].parola}</div>
                  </div>
                </div>
                {(m.stato === "allarme" || m.stato === "attenzione") && (
                  <div className="text-sm mt-2 pl-[1.125rem]"><span className="text-muted-foreground">Cosa fare:</span> {m.azione}</div>
                )}
              </CardContent></Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            LinkedIn oggi: {c.linkedin.usate} letture usate, {c.linkedin.disponibili} ancora disponibili (25 al giorno fra tutti gli agenti).
            Le soglie sono una prima taratura: si correggono dopo 4 settimane. Il processo completo è in <Link href="/guida" className="underline">Guida</Link>.
          </p>
        </>
      ) : null}
    </div>
  );
}
