"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, RefreshCw, AlertTriangle, Play, Server, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Agente {
  chiave: string;
  numero: string;
  nome: string;
  compito: string;
  famiglia: "server" | "browser" | "sintesi";
  squadra: "commerciale" | "bni" | "vendita";
  stato: "attivo" | "da_costruire" | "esistente_altrove";
  nota?: string;
  settimana: { fatti: number; falliti: number };
  ultimoLavoro: string | null;
  spesaMeseEuro: number;
}

interface Dati {
  agenti: Agente[];
  aziendeAnalizzate: number;
  daAnalizzare: number;
  cassetta: Partial<Record<"IN_ATTESA" | "APPROVATO" | "SCARTATO", number>>;
  erroriSettimana: { errore: string; lavori: number }[];
  browser: Partial<Record<"IN_CODA" | "IN_CORSO", number>>;
  spesa: { meseEuro: number; tettoEuro: number };
  servizi: { ai: string | null; dataForSeo: boolean; browser: boolean };
  coperturaSardegna: {
    capitoli: { capitolo: string; totale: number; conosciuti: number; percentuale: number }[];
    totale: number;
    conosciuti: number;
    percentuale: number;
  } | null;
}

const LANCI: { squadra: "commerciale" | "bni" | "esploratore"; label: string }[] = [
  { squadra: "commerciale", label: "Commerciale: 5 aziende" },
  { squadra: "bni", label: "BNI" },
  { squadra: "esploratore", label: "Cerca aziende nuove" },
];

const FAMIGLIA = {
  server: { label: "Server", icon: Server, help: "Lavora di notte sul server, su molte aziende" },
  browser: { label: "Browser", icon: Globe, help: "Lavora con il tuo browser, poche aziende al giorno" },
  sintesi: { label: "Sintesi", icon: Sparkles, help: "Ragiona su quello che hanno trovato gli altri" },
};

const STATO = {
  attivo: { label: "Al lavoro", cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" },
  esistente_altrove: { label: "In parte attivo", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  da_costruire: { label: "Da costruire", cls: "bg-muted text-muted-foreground" },
};

const SQUADRE: { chiave: Agente["squadra"]; titolo: string }[] = [
  { chiave: "commerciale", titolo: "Squadra commerciale" },
  { chiave: "bni", titolo: "Squadra BNI" },
  { chiave: "vendita", titolo: "Squadra vendita" },
];

function quando(iso: string | null): string {
  if (!iso) return "mai";
  const ore = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (ore < 1) return "meno di un'ora fa";
  if (ore < 24) return `${ore} ore fa`;
  return `${Math.round(ore / 24)} giorni fa`;
}

export default function SquadraPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [dati, setDati] = useState<Dati | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lancio, setLancio] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/squadra");
      if (!r.ok) throw new Error("Errore nel caricamento della squadra");
      setDati(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function lancia(squadra: "commerciale" | "bni" | "esploratore") {
    setLancio(squadra);
    try {
      const r = await fetch("/api/squadra/lancia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squadra, limit: 5 }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Errore");
      if (squadra === "bni") {
        toast.success(`${d.capitoliValutati} capitoli valutati · ${d.azioniInCassetta} azioni e ${d.messaggiInCassetta} messaggi in cassetta${d.mappeAccodate ? " · 1 regione da mappare in coda" : ""}`);
      } else if (squadra === "esploratore") {
        toast.success(d.motivo ? d.motivo : `"${d.ricerca}": ${d.nuove} aziende nuove (${d.giaPresenti} già nel CRM)`);
      } else {
        toast.success(
          `${d.aziende} aziende · ${d.nuoviInCassetta} in cassetta${d.accodatiBrowser ? ` · ${d.accodatiBrowser} lavori per il browser` : ""}${d.lavoriFalliti ? ` · ${d.lavoriFalliti} non riusciti` : ""}${d.saltatiPerBudget ? ` · ${d.saltatiPerBudget} fermati dal tetto di spesa` : ""}`
        );
      }
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setLancio(null);
    }
  }

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Squadra
          </h1>
          <p className="text-sm text-muted-foreground">
            Gli agenti che lavorano al posto tuo. Di notte analizzano; la mattina trovi in Cassetta le aziende che meritano.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} aria-label="Aggiorna">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isAdmin &&
            LANCI.map((l) => (
              <Button key={l.squadra} size="sm" variant={l.squadra === "commerciale" ? "default" : "outline"} onClick={() => lancia(l.squadra)} disabled={!!lancio}>
                <Play className="h-4 w-4 mr-1" /> {lancio === l.squadra ? "Al lavoro…" : l.label}
              </Button>
            ))}
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="p-4 text-center text-red-500">
            <AlertTriangle className="h-5 w-5 inline mr-2" />{error}
          </CardContent>
        </Card>
      )}

      {!dati ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dati.aziendeAnalizzate}</div><div className="text-xs text-muted-foreground">Aziende con fascicolo</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dati.daAnalizzare}</div><div className="text-xs text-muted-foreground">Ancora da analizzare</div></CardContent></Card>
            <Link href="/cassetta">
              <Card className="hover:border-primary transition"><CardContent className="p-4"><div className={`text-2xl font-bold ${dati.cassetta.IN_ATTESA ? "text-amber-600 dark:text-amber-400" : ""}`}>{dati.cassetta.IN_ATTESA ?? 0}</div><div className="text-xs text-muted-foreground">In cassetta da decidere</div></CardContent></Card>
            </Link>
            <Card><CardContent className="p-4"><div className={`text-2xl font-bold ${dati.spesa.meseEuro >= dati.spesa.tettoEuro ? "text-rose-600 dark:text-rose-400" : ""}`}>{dati.spesa.meseEuro.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</div><div className="text-xs text-muted-foreground">Spesi questo mese su {dati.spesa.tettoEuro} €</div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>AI: <strong>{dati.servizi.ai ?? "non configurata"}</strong></span>
              <span>DataForSEO: <strong>{dati.servizi.dataForSeo ? "collegato" : "non configurato"}</strong></span>
              <span>Browser: <strong>{dati.servizi.browser ? "collegato" : "chiave mancante"}</strong>
                {(dati.browser.IN_CODA || dati.browser.IN_CORSO) ? ` · ${dati.browser.IN_CODA ?? 0} in coda, ${dati.browser.IN_CORSO ?? 0} in corso` : ""}
              </span>
            </CardContent>
          </Card>

          {SQUADRE.map((sq) => (
            <section key={sq.chiave} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{sq.titolo}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {dati.agenti.filter((a) => a.squadra === sq.chiave).map((a) => {
                  const fam = FAMIGLIA[a.famiglia];
                  const st = STATO[a.stato];
                  const Icona = fam.icon;
                  return (
                    <Card key={a.chiave} className={a.stato === "da_costruire" ? "opacity-70" : undefined}>
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium">
                              <span className="text-muted-foreground mr-1">{a.numero}</span>{a.nome}
                            </div>
                            <div className="text-xs text-muted-foreground">{a.compito}</div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${st.cls}`}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" title={fam.help}><Icona className="h-3 w-3" /> {fam.label}</span>
                          {a.stato === "attivo" && (
                            <>
                              <span>7 giorni: {a.settimana.fatti} fatti{a.settimana.falliti ? `, ${a.settimana.falliti} non riusciti` : ""}</span>
                              <span>ultimo: {quando(a.ultimoLavoro)}</span>
                              {a.spesaMeseEuro > 0 && <span>{a.spesaMeseEuro.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} nel mese</span>}
                            </>
                          )}
                        </div>
                        {a.nota && <div className="text-[11px] text-muted-foreground italic">{a.nota}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}

          {dati.coperturaSardegna && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Copertura Sardegna: conosci {dati.coperturaSardegna.conosciuti} membri su {dati.coperturaSardegna.totale} ({dati.coperturaSardegna.percentuale}%)
              </h2>
              <Card>
                <CardContent className="p-3 space-y-2">
                  {dati.coperturaSardegna.capitoli.map((c) => (
                    <div key={c.capitolo} className="space-y-1">
                      <div className="flex justify-between text-xs"><span>{c.capitolo}</span><span className="text-muted-foreground">{c.conosciuti}/{c.totale}</span></div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${c.percentuale}%` }} /></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {dati.erroriSettimana.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Perché alcuni lavori non sono riusciti (7 giorni)</h2>
              <Card>
                <CardContent className="p-3 space-y-1">
                  {dati.erroriSettimana.map((e) => (
                    <div key={e.errore} className="flex items-start justify-between gap-3 text-xs">
                      <span className="break-words min-w-0">{e.errore}</span>
                      <span className="text-muted-foreground shrink-0">{e.lavori} lavori</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    I siti che bloccano i programmi automatici (403) saranno il lavoro degli agenti di browser.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
