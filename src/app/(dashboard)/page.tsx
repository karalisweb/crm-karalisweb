"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { dataOra } from "@/components/ricerca/etichette";

interface Oggi {
  daFare: { richiesteDaMandare: number; visiteDaMandare: number; fogli: number; altreDecisioni: number; casiDaConfermare: number };
  incontri: { id: string; nome: string; azienda: string | null; capitolo: string | null; quando: string }[];
  call: { id: string; nome: string; quando: string }[];
  settimana: { fatti: number; fissati: number; obiettivo: number; richiesteAperte: number };
  sardegna: { conosciuti: number; totale: number };
  ricerca: { aziendeOggi: number; obiettivo: number; personeOggi: number; casiAttivi: number };
  agentiMac: { fermi: boolean; oreFermi: number };
}

function Riga({ href, testo }: { href: string; testo: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary transition">
      <span className="text-sm">{testo}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

function Numero({ valore, di, etichetta, href }: { valore: number; di?: number; etichetta: string; href: string }) {
  const pieno = di != null && valore >= di;
  return (
    <Link href={href} className="block">
      <Card className="hover:border-primary transition h-full"><CardContent className="p-4">
        <div className={`text-3xl font-bold ${pieno ? "text-green-600 dark:text-green-400" : ""}`}>{valore}{di != null && <span className="text-lg text-muted-foreground">/{di}</span>}</div>
        <div className="text-sm text-muted-foreground mt-1">{etichetta}</div>
        {di != null && <div className="mt-2 h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (valore / di) * 100)}%` }} /></div>}
      </CardContent></Card>
    </Link>
  );
}

export default function HomePage() {
  const [d, setD] = useState<Oggi | null>(null);
  useEffect(() => {
    fetch("/api/oggi").then((r) => r.json()).then(setD);
  }, []);

  if (!d) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  const cose: { href: string; testo: string }[] = [];
  const f = d.daFare;
  if (f.richiesteDaMandare) cose.push({ href: "/cassetta", testo: `Manda ${f.richiesteDaMandare} ${f.richiesteDaMandare === 1 ? "richiesta" : "richieste"} di incontro BNI (messaggio già scritto)` });
  if (f.fogli) cose.push({ href: "/cassetta", testo: `Leggi ${f.fogli === 1 ? "il foglio" : `i ${f.fogli} fogli`} per gli incontri di domani` });
  if (f.visiteDaMandare) cose.push({ href: "/cassetta", testo: `Chiedi ${f.visiteDaMandare === 1 ? "la visita" : `${f.visiteDaMandare} visite`} a un capitolo BNI` });
  if (f.casiDaConfermare) cose.push({ href: "/casi-studio", testo: `Conferma ${f.casiDaConfermare === 1 ? "il caso studio caricato" : `${f.casiDaConfermare} casi studio`}` });
  if (f.altreDecisioni) cose.push({ href: "/cassetta", testo: `${f.altreDecisioni} altre cose da approvare` });
  const s = d.settimana;
  const incontriSettimana = s.fatti + s.fissati;

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-2xl font-bold">Oggi</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {d.agentiMac.fermi && (
        <Card className="border-amber-400"><CardContent className="p-4 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>Gli agenti che usano il tuo Chrome (BNI Connect, LinkedIn, Facebook) sono fermi da {Math.floor(d.agentiMac.oreFermi / 24)} giorni. Apri l&apos;app Claude sul Mac e consenti l&apos;attività &quot;Squadra CRM — agenti di browser&quot;.</span>
        </CardContent></Card>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Da fare adesso</h2>
        {cose.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Niente da fare adesso.</CardContent></Card>
        ) : (
          <div className="space-y-2">{cose.map((c, i) => <Riga key={i} {...c} />)}</div>
        )}
      </section>

      {(d.incontri.length > 0 || d.call.length > 0) && (
        <section className="space-y-2">
          <h2 className="font-semibold">Oggi e domani</h2>
          <div className="space-y-2">
            {d.incontri.map((m) => (
              <Link key={m.id} href={`/bni/membri/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary transition">
                <span className="text-sm min-w-0"><b>Incontro BNI</b> con {m.nome}{m.capitolo ? ` (${m.capitolo})` : ""}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><CalendarClock className="h-3.5 w-3.5" />{dataOra(m.quando)}</span>
              </Link>
            ))}
            {d.call.map((t) => (
              <Link key={t.id} href={`/trattative/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary transition">
                <span className="text-sm min-w-0"><b>Call di vendita</b> con {t.nome}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><CalendarClock className="h-3.5 w-3.5" />{dataOra(t.quando)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">I numeri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Numero valore={incontriSettimana} di={s.obiettivo} etichetta="Incontri BNI questa settimana" href="/bni" />
          <Numero valore={d.ricerca.aziendeOggi} di={d.ricerca.obiettivo} etichetta="Aziende nuove trovate oggi" href="/aziende-trovate" />
          <Numero valore={d.sardegna.conosciuti} di={d.sardegna.totale} etichetta="Membri BNI della Sardegna che conosci" href="/bni/membri" />
        </div>
        <p className="text-xs text-muted-foreground">
          {s.richiesteAperte} richieste di incontro aspettano risposta · {d.ricerca.personeOggi} persone trovate oggi su LinkedIn · {d.ricerca.casiAttivi} {d.ricerca.casiAttivi === 1 ? "caso studio guida" : "casi studio guidano"} la ricerca
        </p>
      </section>
    </div>
  );
}
