"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Globe, Phone, Star } from "lucide-react";
import { CANALI, data } from "@/components/ricerca/etichette";
import { LanciaAdesso } from "@/components/ricerca/lancia-adesso";
import { CercaTu } from "@/components/ricerca/cerca-tu";

interface Azienda {
  id: string;
  name: string;
  website: string | null;
  address: string | null;
  category: string | null;
  phone: string | null;
  googleRating: string | number | null;
  googleReviewsCount: number | null;
  canale: string;
  trovataIl: string;
  caso: { id: string; titolo: string } | null;
  manuale: boolean;
  provinciaCliente: boolean;
  eliminata: boolean;
  decisione: "IN_ATTESA" | "APPROVATO" | "SCARTATO" | null;
  sintesi: string | null;
  segnali: { chiDecide: "noto" | "da_trovare" | null; pubblicita: boolean; sitoVecchio: boolean; sitoNonComunica: boolean; nonSiTrova: boolean };
}

/** Le due liste di lavoro; scartate ed eliminate stanno da parte (link in fondo). */
const LISTE: { k: string; label: string; ok: (a: Azienda) => boolean }[] = [
  { k: "decidere", label: "Da decidere", ok: (a) => !a.eliminata && !a.provinciaCliente && (a.decisione === "IN_ATTESA" || a.decisione === null) },
  { k: "approfondite", label: "Approfondite", ok: (a) => !a.eliminata && a.decisione === "APPROVATO" },
];
const DA_PARTE: { k: string; label: string; ok: (a: Azienda) => boolean }[] = [
  { k: "scartate", label: "scartate", ok: (a) => !a.eliminata && a.decisione === "SCARTATO" },
  { k: "eliminate", label: "eliminate", ok: (a) => a.eliminata },
];

/** I segnali dall'analisi: etichette sull'azienda e filtri sopra l'elenco. */
const SEGNALI: { k: string; label: string; ok: (a: Azienda) => boolean; tono: "bene" | "male" | "neutro" }[] = [
  { k: "chiNoto", label: "chi decide: noto", ok: (a) => a.segnali.chiDecide === "noto", tono: "bene" },
  { k: "chiDaTrovare", label: "chi decide: da trovare", ok: (a) => a.segnali.chiDecide !== "noto", tono: "neutro" },
  { k: "pubblicita", label: "fa pubblicità", ok: (a) => a.segnali.pubblicita, tono: "neutro" },
  { k: "sitoVecchio", label: "sito vecchio", ok: (a) => a.segnali.sitoVecchio, tono: "male" },
  { k: "nonComunica", label: "sito che non comunica", ok: (a) => a.segnali.sitoNonComunica, tono: "male" },
  { k: "nonSiTrova", label: "non si fa trovare", ok: (a) => a.segnali.nonSiTrova, tono: "male" },
];
const TONO = {
  bene: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
  male: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  neutro: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
};

// Lo stato dice cosa è già successo, non cosa resta da fare.
const STATO: Record<string, string> = { IN_ATTESA: "analisi veloce fatta: decidi", APPROVATO: "analisi completa", SCARTATO: "scartata" };

export default function AziendeTrovatePage() {
  const [aziende, setAziende] = useState<Azienda[] | null>(null);
  const [versione, setVersione] = useState(0);
  const [filtro, setFiltro] = useState("decidere");
  const [segnaliScelti, setSegnaliScelti] = useState<string[]>([]);
  const lista = [...LISTE, ...DA_PARTE].find((f) => f.k === filtro)!;
  const visibili = (aziende ?? []).filter(lista.ok).filter((a) => segnaliScelti.every((k) => SEGNALI.find((x) => x.k === k)!.ok(a)));
  // Dopo un lancio l'elenco si aggiorna da solo per 3 minuti (la ricerca lavora in sottofondo).
  const [aggiornaFino, setAggiornaFino] = useState(0);
  useEffect(() => {
    if (!aggiornaFino) return;
    const t = setInterval(() => {
      if (Date.now() > aggiornaFino) return setAggiornaFino(0);
      setVersione((v) => v + 1);
    }, 15000);
    return () => clearInterval(t);
  }, [aggiornaFino]);
  const dopoLancio = () => {
    setVersione((v) => v + 1);
    setAggiornaFino(Date.now() + 180_000);
  };
  useEffect(() => {
    let vivo = true;
    fetch("/api/ricerca/aziende").then((r) => r.json()).then((d) => vivo && setAziende(d.aziende ?? []));
    return () => {
      vivo = false;
    };
  }, [versione]);

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Aziende trovate</h1>
          <p className="text-sm text-muted-foreground">Le aziende trovate dagli agenti (simili ai clienti dei casi studio, su Google, Maps e LinkedIn) e quelle che aggiungi tu. Su ognuna parte da sola l&apos;analisi veloce; tu decidi se fare quella completa.</p>
        </div>
        <LanciaAdesso squadra="ricerca" etichetta="Cerca adesso" onFatto={dopoLancio} />
      </div>
      <CercaTu onFatto={dopoLancio} />
      {aziende && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {LISTE.map((f) => (
                <button key={f.k} onClick={() => setFiltro(f.k)} className={`text-sm px-3 py-1.5 rounded-md border transition ${filtro === f.k ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}>
                  {f.label} ({aziende.filter(f.ok).length})
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Messe da parte:{" "}
              {DA_PARTE.map((f, i) => (
                <span key={f.k}>{i > 0 && " · "}<button onClick={() => setFiltro(f.k)} className={`hover:underline ${filtro === f.k ? "text-foreground font-medium underline" : ""}`}>{f.label} ({aziende.filter(f.ok).length})</button></span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Mostra solo:</span>
            {SEGNALI.map((x) => {
              const attivo = segnaliScelti.includes(x.k);
              return (
                <button key={x.k} onClick={() => setSegnaliScelti((v) => (attivo ? v.filter((k) => k !== x.k) : [...v, x.k]))} className={`text-xs px-2 py-0.5 rounded-full border transition ${attivo ? `${TONO[x.tono]} border-transparent font-medium` : "border-border hover:bg-muted"}`}>
                  {x.label} ({aziende.filter(lista.ok).filter(x.ok).length})
                </button>
              );
            })}
            {segnaliScelti.length > 0 && <button onClick={() => setSegnaliScelti([])} className="text-xs text-muted-foreground hover:underline ml-1">togli filtri</button>}
          </div>
        </div>
      )}
      {!aziende ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : aziende.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Ancora nessuna azienda. Carica e conferma un caso studio: la ricerca parte da lì.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visibili.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">Nessuna azienda qui.</CardContent></Card>}
          {visibili.map((a) => {
            const voto = a.googleRating != null ? Number(a.googleRating) : null;
            return (
              <Card key={a.id}><CardContent className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/aziende-trovate/${a.id}`} className="font-medium hover:underline break-words">{a.name}</Link>
                  <Badge variant="secondary" className="text-[10px]">{a.manuale ? "aggiunta a mano" : `trovata su ${CANALI[a.canale] ?? a.canale}`}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.decisione ? STATO[a.decisione] : a.provinciaCliente ? "esclusa: concorrente del cliente" : "analisi veloce in corso"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground break-words">{[a.category, a.address].filter(Boolean).join(" · ")}</div>
                {a.decisione && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {SEGNALI.filter((x) => x.ok(a)).map((x) => (
                      <span key={x.k} className={`text-[11px] px-1.5 py-0.5 rounded ${TONO[x.tono]}`}>{x.label}</span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline"><Globe className="h-3 w-3" />{a.website.replace(/^https?:\/\/(www\.)?/, "")}</a>}
                  {a.phone && <a href={`tel:${a.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3 w-3" />{a.phone}</a>}
                  {voto != null && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{voto.toFixed(1)} ({a.googleReviewsCount ?? 0})</span>}
                  {a.caso && <Link href={`/casi-studio/${a.caso.id}`} className="hover:underline">dal caso {a.caso.titolo}</Link>}
                  <span>{data(a.trovataIl)}</span>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
