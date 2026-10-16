"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, RefreshCw, AlertTriangle, Clock, Inbox } from "lucide-react";
import { CallFissataDialog } from "@/components/vendita/call-fissata-dialog";
import { ORDINE_STADI, ORIGINI, STADI, type Origine, type Stadio } from "@/lib/vendita/regole";

interface TrattativaRiga {
  id: string;
  nome: string;
  origine: string;
  stadio: Stadio;
  referente: string | null;
  callAt: string | null;
  prossimoPasso: string | null;
  prossimaData: string | null;
  valoreEuro: number | null;
  inRitardo: boolean;
  daDecidere: number;
}

function quando(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const giorni = Math.round((d.getTime() - Date.now()) / 86400000);
  const data = d.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" });
  if (giorni === 0) return `oggi ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  if (giorni === 1) return `domani ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  if (giorni < 0) return `${data} (${-giorni}g fa)`;
  return data;
}

export default function TrattativePage() {
  const [righe, setRighe] = useState<TrattativaRiga[]>([]);
  const [conteggi, setConteggi] = useState<Partial<Record<Stadio, number>>>({});
  const [stadio, setStadio] = useState<Stadio | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/trattative${stadio ? `?stadio=${stadio}` : ""}`);
      if (!r.ok) throw new Error("Errore nel caricamento delle trattative");
      const d = await r.json();
      setRighe(d.trattative || []);
      setConteggi(d.conteggi || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [stadio]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aperte = ORDINE_STADI.filter((s) => STADI[s].aperto).reduce((n, s) => n + (conteggi[s] ?? 0), 0);
  const valore = righe.filter((r) => STADI[r.stadio].aperto).reduce((n, r) => n + (r.valoreEuro ?? 0), 0);

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            Trattative
          </h1>
          <p className="text-sm text-muted-foreground">
            Call di vendita → follow-up o lettera strategica → recall o incarico → exit o nurturing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} aria-label="Aggiorna">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <CallFissataDialog nuova />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{aperte}</div><div className="text-xs text-muted-foreground">Aperte</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{conteggi.CALL_FISSATA ?? 0}</div><div className="text-xs text-muted-foreground">Call in calendario</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className={`text-2xl font-bold ${righe.some((r) => r.inRitardo) ? "text-rose-600 dark:text-rose-400" : ""}`}>{righe.filter((r) => r.inRitardo).length}</div><div className="text-xs text-muted-foreground">In ritardo</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{conteggi.INCARICO ?? 0}</div><div className="text-xs text-muted-foreground">Incarichi{valore ? ` · ${valore.toLocaleString("it-IT")} € aperti` : ""}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStadio("")}
          className={`text-xs px-2.5 py-1 rounded-md border transition ${stadio === "" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
        >Aperte</button>
        {ORDINE_STADI.map((s) => (
          <button
            key={s}
            onClick={() => setStadio(s)}
            className={`text-xs px-2.5 py-1 rounded-md border transition ${stadio === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
          >{STADI[s].icona} {STADI[s].label}{conteggi[s] ? ` (${conteggi[s]})` : ""}</button>
        ))}
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500"><AlertTriangle className="h-5 w-5 inline mr-2" />{error}</CardContent>
        </Card>
      )}

      {loading && righe.length === 0 ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : righe.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nessuna trattativa qui. Si apre una trattativa quando fissi una call: dalla scheda pronta in Cassetta, dalla scheda di un&apos;azienda o con &quot;Nuova trattativa&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {righe.map((t) => {
            const data = t.stadio === "CALL_FISSATA" ? quando(t.callAt) : quando(t.prossimaData);
            return (
              <Link key={t.id} href={`/trattative/${t.id}`} className="block">
                <Card className={`hover:border-primary transition ${t.inRitardo ? "border-rose-400" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium flex flex-wrap items-center gap-2">
                          <span className="break-words">{t.nome}</span>
                          <Badge variant="outline" className="text-[10px]">{STADI[t.stadio].icona} {STADI[t.stadio].label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{ORIGINI[t.origine as Origine] ?? t.origine}</Badge>
                          {t.daDecidere > 0 && (
                            <Badge className="text-[10px] gap-1 bg-amber-500/90 text-white"><Inbox className="h-3 w-3" /> in cassetta</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {t.referente && <span>{t.referente}</span>}
                          {data && (
                            <span className={`flex items-center gap-1 ${t.inRitardo ? "text-rose-600 dark:text-rose-400 font-medium" : ""}`}>
                              <Clock className="h-3 w-3" /> {t.stadio === "CALL_FISSATA" ? "call" : t.prossimoPasso ?? "prossimo passo"}: {data}
                            </span>
                          )}
                          {t.valoreEuro ? <span>≈ {t.valoreEuro.toLocaleString("it-IT")} €</span> : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
