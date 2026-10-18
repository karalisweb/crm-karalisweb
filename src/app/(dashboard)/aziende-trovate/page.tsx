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
  decisione: "IN_ATTESA" | "APPROVATO" | "SCARTATO" | null;
  sintesi: string | null;
}

const FILTRI: { k: string; label: string; ok: (a: Azienda) => boolean }[] = [
  { k: "decidere", label: "Da decidere", ok: (a) => !a.provinciaCliente && (a.decisione === "IN_ATTESA" || a.decisione === null) },
  { k: "approfondire", label: "Da approfondire", ok: (a) => a.decisione === "APPROVATO" },
  { k: "scartate", label: "Scartate", ok: (a) => a.decisione === "SCARTATO" },
  { k: "tutte", label: "Tutte", ok: () => true },
];

const STATO: Record<string, string> = { IN_ATTESA: "da decidere", APPROVATO: "da approfondire", SCARTATO: "scartata" };

export default function AziendeTrovatePage() {
  const [aziende, setAziende] = useState<Azienda[] | null>(null);
  const [versione, setVersione] = useState(0);
  const [filtro, setFiltro] = useState("decidere");
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
          <p className="text-sm text-muted-foreground">Aziende che fanno lo stesso mestiere dei tuoi clienti dei casi studio (prima la nicchia, poi il settore; mai nella provincia del cliente), più quelle che aggiungi tu. Su ognuna gli agenti fanno da soli il giro veloce; tu decidi se approfondire.</p>
        </div>
        <LanciaAdesso squadra="ricerca" etichetta="Cerca adesso" onFatto={() => setVersione((v) => v + 1)} />
      </div>
      <CercaTu onFatto={() => setVersione((v) => v + 1)} />
      {aziende && (
        <div className="flex flex-wrap gap-1.5">
          {FILTRI.map((f) => (
            <button key={f.k} onClick={() => setFiltro(f.k)} className={`text-xs px-2.5 py-1 rounded-md border transition ${filtro === f.k ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}>
              {f.label} ({aziende.filter(f.ok).length})
            </button>
          ))}
        </div>
      )}
      {!aziende ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : aziende.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Ancora nessuna azienda. Carica e conferma un caso studio: la ricerca parte da lì.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {aziende.filter(FILTRI.find((f) => f.k === filtro)!.ok).map((a) => {
            const voto = a.googleRating != null ? Number(a.googleRating) : null;
            return (
              <Card key={a.id}><CardContent className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/aziende-trovate/${a.id}`} className="font-medium hover:underline break-words">{a.name}</Link>
                  <Badge variant="secondary" className="text-[10px]">{a.manuale ? "aggiunta da te" : CANALI[a.canale] ?? a.canale}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.decisione ? STATO[a.decisione] : a.provinciaCliente ? "concorrente diretto del cliente: esclusa" : "giro veloce in corso"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground break-words">{[a.category, a.address].filter(Boolean).join(" · ")}</div>
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
