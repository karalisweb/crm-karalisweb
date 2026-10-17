"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Globe, Linkedin, MapPin, Phone, Target, User } from "lucide-react";
import { CANALI, STATI_PRESENTAZIONE, data } from "@/components/ricerca/etichette";

interface Scheda {
  azienda: {
    id: string;
    name: string;
    website: string | null;
    address: string | null;
    category: string | null;
    phone: string | null;
    googleRating: number | null;
    googleReviewsCount: number | null;
    googleMapsUrl: string | null;
    socialUrl: string | null;
  };
  perche: { canale: string; createdAt: string; chiave: { casoStudio: { id: string; titolo: string } | null; bniMembro: { id: string; name: string } | null } } | null;
  casi: { id: string; titolo: string }[];
  persone: { id: string; nome: string; ruolo: string | null; linkedinUrl: string | null; contattoInComune: string | null }[];
  ponti: { id: string; name: string; chapter: string | null; come: string; stato?: string }[];
  prossimo: string;
  storia: { quando: string; cosa: string }[];
}

function citta(indirizzo: string | null): string | null {
  const m = indirizzo?.match(/\d{5}\s+([^,]+?)\s+[A-Z]{2}\b/);
  return m ? m[1] : null;
}

/** Com'è messa online: quello che si sa già; il resto lo riempie la fase Analisi. */
function presenza(a: Scheda["azienda"]) {
  const social = a.socialUrl ?? "";
  const daVedere = { testo: "da vedere", tono: "muto" as const };
  const google =
    a.googleRating == null
      ? { testo: "nessuna scheda", tono: "male" as const }
      : a.googleRating >= 4.3 && (a.googleReviewsCount ?? 0) >= 30
        ? { testo: "buono", tono: "bene" as const }
        : { testo: "debole", tono: "male" as const };
  return [
    { nome: "Sito", url: a.website, ...(a.website ? daVedere : { testo: "non ce l'ha", tono: "male" as const }) },
    { nome: "Google", url: a.googleMapsUrl, ...google },
    { nome: "Facebook", url: /facebook\.com/.test(social) ? social : null, ...daVedere },
    { nome: "Instagram", url: /instagram\.com/.test(social) ? social : null, ...daVedere },
    { nome: "Pubblicità", url: null, ...daVedere },
  ];
}

const TONI = { bene: "text-green-600 dark:text-green-400", male: "text-amber-600 dark:text-amber-400", muto: "text-muted-foreground" };

function Titolo({ n, children }: { n: number; children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground mt-5 mb-1.5">{n}. {children}</div>;
}

export default function SchedaAziendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Scheda | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/aziende/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!vivo) return;
        if (!r.ok) setErrore(d.error ?? "Errore");
        else setS(d);
      })
      .catch(() => vivo && setErrore("Errore nel caricamento"));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (errore) return <Card><CardContent className="p-6 text-sm text-red-500">{errore}</CardContent></Card>;
  if (!s) return <div className="space-y-3 max-w-2xl"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const a = s.azienda;
  const titolare = s.persone[0];
  const caso = s.perche?.chiave.casoStudio;
  const rete = s.perche?.chiave.bniMembro;

  return (
    <div className="max-w-2xl min-w-0 space-y-3">
      <Link href="/aziende-trovate" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Aziende trovate</Link>
      <Card><CardContent className="p-4 sm:p-5">
        <h1 className="text-2xl font-bold break-words">{a.name}</h1>
        <div className="text-sm text-muted-foreground break-words">
          {[a.category, citta(a.address), a.googleRating != null ? `${a.googleRating.toFixed(1).replace(".", ",")} stelle (${a.googleReviewsCount ?? 0} recensioni)` : null].filter(Boolean).join(" · ")}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {a.website && <Button asChild variant="outline" size="sm"><a href={a.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 mr-1.5" />Sito</a></Button>}
          {a.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${a.phone}`}><Phone className="h-4 w-4 mr-1.5" />Chiama</a></Button>}
          {a.googleMapsUrl && <Button asChild variant="outline" size="sm"><a href={a.googleMapsUrl} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4 mr-1.5" />Mappa</a></Button>}
        </div>

        {s.perche && (
          <div className="mt-4 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 px-3 py-2.5 text-sm">
            <Target className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Perché è qui:{" "}
            {caso ? <>stesso settore del caso studio <Link href={`/casi-studio/${caso.id}`} className="font-medium underline">{caso.titolo}</Link>.</>
              : rete ? <>è nella rete di <Link href={`/bni/membri/${rete.id}`} className="font-medium underline">{rete.name}</Link>.</>
                : null}{" "}
            Trovata su {CANALI[s.perche.canale] ?? s.perche.canale} il {data(s.perche.createdAt)}.
          </div>
        )}

        <Titolo n={1}>Chi decide</Titolo>
        <div className="rounded-md border px-3 py-2.5 text-sm flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>
          {titolare ? (
            <div className="min-w-0">
              <div className="font-medium flex items-center gap-2 break-words">
                {titolare.nome}
                {titolare.linkedinUrl && <a href={titolare.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Profilo LinkedIn"><Linkedin className="h-4 w-4 text-primary" /></a>}
              </div>
              <div className="text-muted-foreground">{titolare.ruolo ?? "Titolare"}</div>
            </div>
          ) : (
            <div><div className="font-medium">Titolare: da trovare</div><div className="text-muted-foreground">L&apos;agente lo cerca su LinkedIn</div></div>
          )}
        </div>

        <Titolo n={2}>Chi te la può presentare</Titolo>
        <div className="rounded-md border px-3 py-2.5 text-sm space-y-1">
          {s.ponti.length > 0 ? s.ponti.map((p) => (
            <div key={p.id} className="break-words">
              <Link href={`/bni/membri/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              <span className="text-muted-foreground"> · {p.chapter ?? "BNI"} · {p.come}{p.stato ? ` · presentazione ${STATI_PRESENTAZIONE[p.stato] ?? p.stato}` : ""}</span>
            </div>
          )) : titolare?.contattoInComune ? (
            <div>Contatto in comune su LinkedIn: <span className="font-medium">{titolare.contattoInComune}</span></div>
          ) : (
            <div className="text-muted-foreground">Nessun membro BNI collegato, per ora</div>
          )}
          {s.casi.length > 0 && <div className="text-muted-foreground">Caso da raccontare: {s.casi.map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link href={`/casi-studio/${c.id}`} className="hover:underline">{c.titolo}</Link></span>)}</div>}
        </div>

        <Titolo n={3}>Com&apos;è messa online <span className="text-xs">(la riempie la fase Analisi)</span></Titolo>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presenza(a).map((p) => (
            <div key={p.nome} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
              {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.nome}</a> : p.nome}
              <div className={TONI[p.tono]}>{p.testo}</div>
            </div>
          ))}
        </div>

        <Titolo n={4}>Prossimo passo</Titolo>
        <div className="rounded-md border px-3 py-2.5 text-sm">{s.prossimo}</div>

        <Titolo n={5}>Storia</Titolo>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {s.storia.map((e, i) => <div key={i} className="break-words">{data(e.quando)} · {e.cosa}</div>)}
        </div>
      </CardContent></Card>
    </div>
  );
}
