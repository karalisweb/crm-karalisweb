"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { dataOra } from "@/components/ricerca/etichette";
import { SchedaPercorso, type CosaDiOggi, type DatiPercorso } from "@/components/percorso/scheda";

// Le 3 cose di oggi (v3.64; dalla v3.67 tutte, senza tetto): ogni azienda con la sua cosa da fare.
const COSE: { k: CosaDiOggi; titolo: string; spiega: string }[] = [
  { k: "contatta", titolo: "Da contattare", spiega: "Analizzate e verificate: sai cosa dire. Scrivi a chi decide, o a chi te la presenta." },
  { k: "scalda", titolo: "Da scaldare", spiega: "Nessuno te la presenta: commenta un post della loro pagina." },
  { k: "valida", titolo: "Da validare", spiega: "Basta un sì o un no." },
];

interface Oggi {
  daFare: { richiesteDaMandare: number; visiteDaMandare: number; fogli: number; aziendeDaDecidere: number; casiDaConfermare: number };
  incontri: { id: string; nome: string; azienda: string | null; capitolo: string | null; quando: string; daChiedere: number }[];
  call: { id: string; nome: string; quando: string }[];
  avvisiSettore: { id: string; titolo: string; righe: string[]; cosaFare: string; link: string }[];
  settimana: { fatti: number; fissati: number; obiettivo: number; richiesteAperte: number };
  sardegna: { conosciuti: number; totale: number };
  ricerca: { aziendeOggi: number; obiettivo: number; personeOggi: number; casiAttivi: number };
  agentiMac: { fermi: boolean; falliscono: boolean; oreFermi: number };
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
  const [p, setP] = useState<DatiPercorso | null>(null);
  // Le aziende di oggi: dal Percorso, al massimo 2 da contattare, 3 da scaldare, 5 da validare.
  const caricaPercorso = useCallback(() => {
    fetch("/api/percorso").then((r) => (r.ok ? r.json() : null)).then(setP);
  }, []);
  useEffect(() => {
    fetch("/api/oggi").then((r) => r.json()).then(setD);
    caricaPercorso();
  }, [caricaPercorso]);

  // Gli avvisi di settore si decidono qui (v3.71): deciso, sparisce.
  const [decidendo, setDecidendo] = useState<string | null>(null);
  const decidiAvviso = async (id: string, decisione: "APPROVATO" | "SCARTATO") => {
    setDecidendo(id);
    const r = await fetch(`/api/cassetta/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisione }) }).catch(() => null);
    if (r && (r.ok || r.status === 409)) setD((x) => (x ? { ...x, avvisiSettore: x.avvisiSettore.filter((a) => a.id !== id) } : x));
    setDecidendo(null);
  };

  if (!d) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  const cose: { href: string; testo: string }[] = [];
  const f = d.daFare;
  if (f.richiesteDaMandare) cose.push({ href: "/bni", testo: `Manda ${f.richiesteDaMandare} ${f.richiesteDaMandare === 1 ? "richiesta" : "richieste"} di incontro BNI (messaggio già scritto)` });
  if (f.fogli) cose.push({ href: "/bni", testo: `Leggi ${f.fogli === 1 ? "il foglio" : `i ${f.fogli} fogli`} per gli incontri di domani` });
  if (f.visiteDaMandare) cose.push({ href: "/bni", testo: `Chiedi ${f.visiteDaMandare === 1 ? "la visita" : `${f.visiteDaMandare} visite`} a un capitolo BNI` });
  if (f.casiDaConfermare) cose.push({ href: "/casi-studio", testo: `Conferma ${f.casiDaConfermare === 1 ? "il caso studio caricato" : `${f.casiDaConfermare} casi studio`}` });
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
          {d.agentiMac.falliscono ? (
            <span>Gli agenti che usano il tuo Chrome (BNI Connect, LinkedIn, Facebook) girano ma non portano risultati da {Math.max(1, Math.floor(d.agentiMac.oreFermi / 24))} giorni: di solito Chrome chiede il permesso di aprire una pagina e nessuno risponde. Nell&apos;estensione Claude in Chrome autorizza sempre LinkedIn, Facebook, Instagram e BNI Connect.</span>
          ) : (
            <span>Gli agenti che usano il tuo Chrome (BNI Connect, LinkedIn, Facebook) sono fermi da {Math.floor(d.agentiMac.oreFermi / 24)} giorni. Tieni il Mac acceso con Chrome aperto e controlla nell&apos;app Claude che l&apos;attività &quot;Squadra CRM — agenti di browser&quot; sia attiva.</span>
          )}
        </CardContent></Card>
      )}

      {d.avvisiSettore.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Nei tuoi settori: te lo devo dire ({d.avvisiSettore.length})</h2>
          <p className="text-xs text-muted-foreground">Aziende dei tuoi casi studio o dei tuoi settori viste fra i membri BNI, sui contatti LinkedIn o fra le eliminate. Stanno solo qui: decidi e spariscono.</p>
          {d.avvisiSettore.map((a) => (
            <div key={a.id} className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <Link href={a.link} className="block text-sm font-medium break-words hover:underline">{a.titolo}</Link>
              <ul className="text-xs text-muted-foreground space-y-0.5">{a.righe.map((r, i) => <li key={i} className="break-words">{r}</li>)}</ul>
              <div className="text-xs break-words">{a.cosaFare}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={decidendo === a.id} onClick={() => decidiAvviso(a.id, "APPROVATO")}>Me ne occupo</Button>
                <Button size="sm" variant="outline" disabled={decidendo === a.id} onClick={() => decidiAvviso(a.id, "SCARTATO")}>Non mi interessa</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {p && (
        <section className="space-y-4">
          <h2 className="font-semibold">Le aziende di oggi</h2>
          {COSE.map(({ k, titolo, spiega }) => {
            const fatte = p.fatte[k];
            const finite = fatte > 0 && p.oggi[k].length === 0;
            return (
              <div key={k} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{titolo}</h3>
                  <span className={`text-sm flex items-center gap-1 ${finite ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {finite && <CheckCircle2 className="h-4 w-4" />}{p.oggi[k].length} da fare{fatte ? ` · ${fatte} fatte oggi` : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{spiega}</p>
                {p.oggi[k].length ? (
                  p.oggi[k].map((a) => <SchedaPercorso key={a.leadId} a={a} passi={p.passi} onCambio={caricaPercorso} />)
                ) : (
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">{finite ? "Fatte tutte. Le prossime le prepara il CRM." : "Per ora nessuna: le prepara il CRM."}</div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {cose.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">BNI e casi studio</h2>
          <div className="space-y-2">{cose.map((c, i) => <Riga key={i} {...c} />)}</div>
        </section>
      )}

      {(d.incontri.length > 0 || d.call.length > 0) && (
        <section className="space-y-2">
          <h2 className="font-semibold">Oggi e domani</h2>
          <div className="space-y-2">
            {d.incontri.map((m) => (
              <Link key={m.id} href={`/bni/121/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary transition">
                <span className="text-sm min-w-0">
                  <b>Incontro BNI</b> con {m.nome}{m.capitolo ? ` (${m.capitolo})` : ""}
                  {m.daChiedere > 0 && <span className="block text-xs text-primary">Chiedigli {m.daChiedere === 1 ? "una presentazione" : `${m.daChiedere} presentazioni`}: le trovi nel foglio</span>}
                </span>
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
          <Numero valore={d.ricerca.aziendeOggi} di={d.ricerca.obiettivo} etichetta="Aziende nuove trovate oggi" href="/percorso" />
          <Numero valore={d.sardegna.conosciuti} di={d.sardegna.totale} etichetta="Membri BNI della Sardegna che conosci" href="/bni/membri" />
        </div>
        <p className="text-xs text-muted-foreground">
          {s.richiesteAperte} richieste di incontro aspettano risposta · {d.ricerca.personeOggi} persone trovate oggi su LinkedIn · {d.ricerca.casiAttivi} {d.ricerca.casiAttivi === 1 ? "caso studio guida" : "casi studio guidano"} la ricerca
        </p>
      </section>
    </div>
  );
}
