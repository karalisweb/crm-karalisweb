"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Bell, CalendarClock, CheckCircle2, Trash2 } from "lucide-react";
import { dataOra } from "@/components/ricerca/etichette";
import { NuovaRichiestaDialog } from "@/components/vendita/nuova-richiesta-dialog";
import { Sezione as SezioneComune } from "@/components/ui/sezione";
import { type AziendaPercorso, type CosaDiOggi, type DatiPercorso } from "@/components/percorso/scheda";

// Le 3 cose di oggi (v3.64; dalla v3.67 tutte, senza tetto): ogni azienda con la sua cosa da fare.
const COSE: { k: CosaDiOggi; titolo: string; spiega: string }[] = [
  { k: "contatta", titolo: "Da contattare", spiega: "Passo 4: scrivi a chi decide (o all'azienda, se chi decide non si sa). Passo 2: scrivi a chi te la presenta." },
  { k: "scalda", titolo: "Da scaldare", spiega: "Lo fa il CRM da solo: chiede il collegamento a chi decide e commenta i suoi post. Tu non devi fare niente." },
  { k: "valida", titolo: "Da validare", spiega: "Basta un sì o un no." },
];

interface Oggi {
  daFare: { richiesteDaMandare: number; visiteDaMandare: number; fogli: number; aziendeDaDecidere: number; casiDaConfermare: number };
  incontri: { id: string; nome: string; azienda: string | null; capitolo: string | null; quando: string; daChiedere: number }[];
  call: { id: string; nome: string; quando: string }[];
  avvisiSettore: { id: string; azienda: string; perche: string | null; righe: string[]; cosaFare: string; bottone: string; link: string; membroDaConoscere: string | null }[];
  messaggi121: { oggi: number; massimo: number };
  avvisiOggi: { decisi: number; massimo: number };
  vendita: { trattativaId: string; nome: string; testo: string; giorniDiRitardo: number }[];
  settimana: { fatti: number; fissati: number; obiettivo: number; richiesteAperte: number };
  sardegna: { conosciuti: number; totale: number };
  ricerca: { aziendeOggi: number; obiettivo: number; personeOggi: number; casiAttivi: number };
  agentiMac: { fermi: boolean; falliscono: boolean; oreFermi: number };
  linkedinFermo: boolean;
}

/**
 * v3.99 (Alessio: "essendo molto lunga deve lavorare con gli accordion"): ogni blocco di Oggi si chiude e si riapre
 * con un tocco sul titolo, e resta come l'hai lasciato (salvato nel browser).
 */
// Il blocco chiudibile ora è comune a tutte le pagine (components/ui/sezione). Le chiavi restano "oggi:…".
function Sezione({ id, ...resto }: { id: string; titolo: ReactNode; conteggio?: ReactNode; children: ReactNode }) {
  return <SezioneComune id={`oggi:${id}`} {...resto} />;
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

/**
 * Le aziende del Percorso dove non tocca a te, divise come le tre liste (v3.79, Alessio: il Percorso dice 49 e Oggi 0,
 * "c'è qualcosa che mi confonde"): così i numeri tornano e si vede perché una lista è vuota.
 */
// v3.117: il collegamento (passo 2) e i commenti (passo 3) li fa il CRM: stanno insieme in "Da scaldare".
const cosaInAttesa = (a: AziendaPercorso): CosaDiOggi => (a.passo === 1 ? "valida" : a.passo === 2 || a.passo === 3 ? "scalda" : "contatta");
/** Gli stati che aspettano gli agenti nel tuo Chrome (LinkedIn, Facebook): fermi se Chrome è fermo. */
const STATI_CHROME = ["analisi", "collegamento", "chi_decide", "cerca_post"];

/** Avvisi di settore mostrati insieme (v3.76, Alessio: "pagina lunghissima"): deciso uno, entra il prossimo. */
const AVVISI_VISIBILI = 5;

export default function HomePage() {
  const [d, setD] = useState<Oggi | null>(null);
  const [p, setP] = useState<DatiPercorso | null>(null);
  // Le aziende di oggi: dal Percorso, al massimo 2 da contattare, 3 da scaldare, 5 da validare.
  const caricaPercorso = useCallback(() => {
    fetch("/api/percorso").then((r) => (r.ok ? r.json() : null)).then(setP);
  }, []);
  const caricaOggi = useCallback(() => {
    fetch("/api/oggi").then((r) => r.json()).then(setD);
  }, []);
  useEffect(() => {
    caricaOggi();
    caricaPercorso();
  }, [caricaOggi, caricaPercorso]);

  // Gli avvisi di settore si decidono qui (v3.71): deciso, sparisce.
  const [decidendo, setDecidendo] = useState<string | null>(null);
  const decidiAvviso = async (id: string, decisione: "APPROVATO" | "SCARTATO") => {
    setDecidendo(id);
    const r = await fetch(`/api/cassetta/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisione }) }).catch(() => null);
    if (r && !r.ok && r.status !== 409) alert((await r.json().catch(() => null))?.error ?? "Non ci sono riuscito, riprova.");
    if (r && (r.ok || r.status === 409)) {
      setD((x) => (x ? { ...x, avvisiSettore: x.avvisiSettore.filter((a) => a.id !== id) } : x));
      // Il sì prepara un messaggio o porta l'azienda fra quelle di oggi: si ricarica il resto della pagina.
      // v3.104: anche il no, perché conta nei 5 di oggi.
      {
        // Si tiene l'ordine di prima, ma si tolgono quelle che oggi non vanno più (es. i 5 messaggi 121 già fatti).
        fetch("/api/oggi").then((r) => r.json()).then((n: Oggi) => setD((x) => {
          if (!x) return n;
          const restano = new Set(n.avvisiSettore.map((a) => a.id));
          return { ...n, avvisiSettore: x.avvisiSettore.filter((a) => restano.has(a.id)) };
        }));
        caricaPercorso();
      }
    }
    setDecidendo(null);
  };

  // v3.99: Elimina toglie l'azienda dal percorso per sempre (contatto, scaldare o approfondire).
  const elimina = async (leadId: string, nome: string) => {
    if (!confirm(`Elimino ${nome}? Esce dal percorso e il CRM non la propone più.`)) return;
    const r = await fetch(`/api/percorso/${leadId}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) { alert("Non ci sono riuscito, riprova."); return; }
    caricaPercorso();
  };

  // "Lo conosco già" (v3.73): il membro diventa conosciuto (non lo si propone più per un 121) e l'avviso sparisce.
  const conoscoGia = async (id: string, membroId: string) => {
    setDecidendo(id);
    const r = await fetch(`/api/ricerca/bni/membri/${membroId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conosciuto: true }) }).catch(() => null);
    setDecidendo(null);
    if (!r?.ok) { alert("Non ci sono riuscito, riprova."); return; }
    await decidiAvviso(id, "SCARTATO");
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oggi</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <NuovaRichiestaDialog variante="outline" onCreata={caricaOggi} />
      </div>

      {(d.vendita ?? []).length > 0 && (
        <Sezione id="vendita" titolo="Da non dimenticare" conteggio={d.vendita.length}>
          <div className="space-y-2">
            {d.vendita.map((v) => (
              <Link key={v.trattativaId} href={`/trattative/${v.trattativaId}`} className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 dark:border-rose-800 p-3 hover:border-primary transition">
                <span className="text-sm min-w-0 flex items-start gap-2"><Bell className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />{v.testo}</span>
                <span className="text-xs text-muted-foreground shrink-0">{v.giorniDiRitardo > 0 ? `${v.giorniDiRitardo} ${v.giorniDiRitardo === 1 ? "giorno" : "giorni"} di ritardo` : "da fare oggi"}</span>
              </Link>
            ))}
          </div>
        </Sezione>
      )}

      {d.agentiMac.fermi && (
        <Card className="border-amber-400"><CardContent className="p-4 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          {d.agentiMac.falliscono ? (
            <span>Gli agenti che usano il tuo Chrome (BNI Connect, LinkedIn, Facebook) girano ma non portano risultati da {Math.max(1, Math.floor(d.agentiMac.oreFermi / 24))} giorni. Il motivo di ogni lavoro fallito è in Agenti.</span>
          ) : (
            <span>Gli agenti che usano il tuo Chrome (BNI Connect, LinkedIn, Facebook) sono fermi da {Math.floor(d.agentiMac.oreFermi / 24)} giorni. Tieni il Mac acceso con Chrome aperto e controlla nell&apos;app Claude che l&apos;attività &quot;Squadra CRM — agenti di browser&quot; sia attiva.</span>
          )}
        </CardContent></Card>
      )}

      {(d.avvisiSettore.length > 0 || d.avvisiOggi.decisi > 0) && (
        <Sezione id="settori" titolo="Aziende sarde dei tuoi settori, trovate in BNI e su LinkedIn" conteggio={`${Math.min(d.avvisiOggi.decisi, d.avvisiOggi.massimo)} di ${d.avvisiOggi.massimo} oggi`}>
          {d.avvisiSettore.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-green-600 dark:text-green-400"><CheckCircle2 className="h-4 w-4" />Per oggi hai finito: domani altre {d.avvisiOggi.massimo}.</div>
          ) : (
            <p className="text-xs text-muted-foreground">Per ognuna: sì o no. Deciso, sparisce. {d.avvisiOggi.massimo} al giorno: domani le prossime.</p>
          )}
          {d.avvisiSettore.slice(0, AVVISI_VISIBILI).map((a) => (
            <div key={a.id} className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <div>
                <Link href={a.link} className="block text-sm font-medium break-words hover:underline">{a.azienda}</Link>
                {a.perche && <div className="text-xs break-words">Settore: {a.perche}</div>}
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">{a.righe.map((r, i) => <li key={i} className="break-words">{r}</li>)}</ul>
              <div className="text-xs break-words">{a.cosaFare}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={decidendo === a.id} onClick={() => decidiAvviso(a.id, "APPROVATO")}>{a.bottone}</Button>
                {a.membroDaConoscere && (
                  <Button size="sm" variant="outline" disabled={decidendo === a.id} onClick={() => conoscoGia(a.id, a.membroDaConoscere!)}>Lo conosco già</Button>
                )}
                <Button size="sm" variant="outline" disabled={decidendo === a.id} onClick={() => decidiAvviso(a.id, "SCARTATO")}>No, non mi interessa</Button>
              </div>
            </div>
          ))}
        </Sezione>
      )}

      {p && (
        <Sezione id="aziende" titolo="Le aziende di oggi" conteggio={`${COSE.reduce((n, c) => n + p.oggi[c.k].length, 0)} da fare`}>
          <div>
            <p className="text-xs text-muted-foreground">Il riassunto del <Link href="/percorso" className="underline">Percorso</Link>: tocca un&apos;azienda e la apri lì, dove decidi.</p>
          </div>
          {COSE.map(({ k, titolo, spiega }) => {
            const fatte = p.fatte[k];
            const tutte = p.oggi[k];
            const finite = fatte > 0 && tutte.length === 0;
            // "Da validare" sono due domande diverse: dal passo 1 (la approfondisci?) e dal passo 2 (li conosci?).
            const gruppi = k === "valida"
              ? [
                { titolo: "Decidi se approfondirle (passo 1 · Trovate)", aziende: tutte.filter((a) => a.passo === 1) },
                { titolo: "Altre da validare", aziende: tutte.filter((a) => a.passo !== 1) },
              ].filter((g) => g.aziende.length)
              : [{ titolo: null, aziende: tutte }];
            return (
              <Sezione key={k} id={k} titolo={titolo} conteggio={
                <span className={`flex items-center gap-1 ${finite ? "text-green-600 dark:text-green-400" : ""}`}>
                  {finite && <CheckCircle2 className="h-4 w-4" />}{tutte.length} da fare{fatte ? ` · ${fatte} fatte oggi` : ""}
                </span>
              }>
                <p className="text-xs text-muted-foreground">{spiega}</p>
                {(() => {
                  const attesa = p.aziende.filter((a) => a.tocca !== "te" && cosaInAttesa(a) === k);
                  if (!attesa.length) return null;
                  const perStato = attesa.reduce<{ stato: string; nome: string; n: number }[]>((g, a) => {
                    const c = g.find((x) => x.stato === a.stato);
                    if (c) c.n++;
                    else g.push({ stato: a.stato, nome: a.statoNome, n: 1 });
                    return g;
                  }, []);
                  const chromeFermo = (d.linkedinFermo || d.agentiMac.fermi) && perStato.some((x) => STATI_CHROME.includes(x.stato));
                  return (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-0.5">
                      <div className="font-medium">{attesa.length} {attesa.length === 1 ? "azienda in attesa" : "aziende in attesa"} (non tocca a te):</div>
                      {perStato.map((x) => <div key={x.stato}>· {x.n} {x.nome.toLowerCase()}</div>)}
                      {chromeFermo && <div className="text-amber-600 dark:text-amber-400 pt-1">Ferme: gli agenti su Chrome non portano risultati. Il motivo dei lavori falliti è in Agenti.</div>}
                    </div>
                  );
                })()}
                {tutte.length ? gruppi.map((g, i) => (
                  <div key={i} className="space-y-1.5">
                    {g.titolo && <div className="text-xs font-semibold text-muted-foreground pt-1">{g.titolo} ({g.aziende.length})</div>}
                    {g.aziende.map((a) => (
                      <div key={a.leadId} className="flex items-stretch gap-2">
                        <Link href={`/percorso?passo=${a.passo}&azienda=${a.leadId}`} className="flex flex-1 min-w-0 items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary transition">
                          <div className="min-w-0">
                            <div className="text-sm font-medium break-words">{a.nome}</div>
                            <div className="text-xs text-muted-foreground break-words">Passo {a.passo} · {p.passi.find((x) => x.n === a.passo)?.nome}{a.zona ? ` · ${a.zona}` : ""}</div>
                            <div className="text-xs break-words mt-0.5">{a.cosa}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                        <Button variant="outline" size="sm" className="h-auto px-3 text-muted-foreground hover:text-destructive" title="Elimina: esce dal percorso" aria-label={`Elimina ${a.nome}`} onClick={() => elimina(a.leadId, a.nome)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )) : p.aziende.some((a) => a.tocca !== "te" && cosaInAttesa(a) === k) ? null : (
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">{k === "scalda" ? "Niente da fare per te: commenta il CRM." : finite ? "Fatte tutte. Le prossime le prepara il CRM." : "Per ora nessuna: le prepara il CRM."}</div>
                )}
              </Sezione>
            );
          })}
        </Sezione>
      )}

      {cose.length > 0 && (
        <Sezione id="bni" titolo="BNI e casi studio" conteggio={cose.length}>
          <div className="space-y-2">{cose.map((c, i) => <Riga key={i} {...c} />)}</div>
        </Sezione>
      )}

      {(d.incontri.length > 0 || d.call.length > 0) && (
        <Sezione id="agenda" titolo="Oggi e domani" conteggio={d.incontri.length + d.call.length}>
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
        </Sezione>
      )}

      <Sezione id="numeri" titolo="I numeri">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Numero valore={incontriSettimana} di={s.obiettivo} etichetta="Incontri BNI questa settimana" href="/bni" />
          <Numero valore={d.ricerca.aziendeOggi} di={d.ricerca.obiettivo} etichetta="Aziende nuove trovate oggi" href="/percorso" />
          <Numero valore={d.sardegna.conosciuti} di={d.sardegna.totale} etichetta="Membri BNI della Sardegna che conosci" href="/bni/membri" />
        </div>
        <p className="text-xs text-muted-foreground">
          {s.richiesteAperte} richieste di incontro aspettano risposta · {d.ricerca.personeOggi} persone trovate oggi su LinkedIn · {d.ricerca.casiAttivi} {d.ricerca.casiAttivi === 1 ? "caso studio guida" : "casi studio guidano"} la ricerca
        </p>
      </Sezione>
    </div>
  );
}
