"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Globe, Linkedin, Loader2, MapPin, Phone, Search, Target, User, X } from "lucide-react";
import { CANALI, STATI_PRESENTAZIONE, data } from "@/components/ricerca/etichette";

interface Leva { servizio: string; testo: string; prova: string }
interface Referto { summary: string; findings: Record<string, unknown>; levers: Leva[]; data: string }

interface Scheda {
  azienda: {
    id: string; name: string; website: string | null; address: string | null; category: string | null; phone: string | null;
    googleRating: number | null; googleReviewsCount: number | null; googleMapsUrl: string | null; socialUrl: string | null;
  };
  perche: { canale: string; createdAt: string; chiave: { tipo: string; casoStudio: { id: string; titolo: string } | null; bniMembro: { id: string; name: string } | null } } | null;
  casi: { id: string; titolo: string }[];
  persone: { id: string; nome: string; ruolo: string | null; linkedinUrl: string | null; contattoInComune: string | null }[];
  ponti: { id: string; name: string; chapter: string | null; come: string; stato?: string }[];
  prossimo: string;
  storia: { quando: string; cosa: string }[];
  decisione: { status: "IN_ATTESA" | "APPROVATO" | "SCARTATO"; decidedAt: string | null } | null;
  inCorso: { agent: string; status: string }[];
  sulMac: string[];
  analisi: Record<string, Referto>;
}

function citta(indirizzo: string | null): string | null {
  const m = indirizzo?.match(/\d{5}\s+([^,]+?)\s+[A-Z]{2}\b/);
  return m ? m[1] : null;
}

const str = (v: unknown) => (typeof v === "string" ? v : null);
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

function Titolo({ n, children }: { n?: number; children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground mt-5 mb-1.5">{n ? `${n}. ` : ""}{children}</div>;
}

function Leve({ leve }: { leve: Leva[] }) {
  if (!leve.length) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {leve.map((l, i) => (
        <li key={i} className="text-sm">
          <span className="text-amber-700 dark:text-amber-400">●</span> {l.testo}
          <div className="text-xs text-muted-foreground ml-3.5 break-words">{l.prova}</div>
        </li>
      ))}
    </ul>
  );
}

/** Un blocco dell'analisi: cosa ha trovato l'agente, in una riga, e i ganci con la prova. */
function Blocco({ titolo, r, children }: { titolo: string; r?: Referto; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border px-3 py-2.5">
      <div className="text-sm font-medium">{titolo}</div>
      {r ? (
        <>
          <div className="text-sm text-muted-foreground break-words">{r.summary}</div>
          {children}
          <Leve leve={r.levers} />
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Non ancora fatto</div>
      )}
    </div>
  );
}

export default function SchedaAziendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Scheda | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [versione, setVersione] = useState(0);

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
  }, [id, versione]);

  // Mentre gli agenti lavorano, la scheda si aggiorna da sola.
  const lavorando = !!s?.inCorso.length;
  useEffect(() => {
    if (!lavorando) return;
    const t = setInterval(() => setVersione((v) => v + 1), 15000);
    return () => clearInterval(t);
  }, [lavorando]);

  const decidi = useCallback(async (azione: "approfondisci" | "scarta" | "ripensaci") => {
    setOccupato(true);
    await fetch(`/api/ricerca/aziende/${id}/decisione`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ azione }) });
    setOccupato(false);
    setVersione((v) => v + 1);
  }, [id]);

  if (errore) return <Card><CardContent className="p-6 text-sm text-red-500">{errore}</CardContent></Card>;
  if (!s) return <div className="space-y-3 max-w-2xl"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const a = s.azienda;
  const an = s.analisi;
  const titolare = s.persone[0];
  const caso = s.perche?.chiave.casoStudio;
  const rete = s.perche?.chiave.bniMembro;
  const ganci = arr<{ frase: string; prova: string }>(an.ganci?.findings.ganci);
  const sitoVisto = an.sito_visto?.findings;
  const foto = (sitoVisto?.foto ?? {}) as { telefono?: string | null; computer?: string | null };
  const domande = arr<{ domanda: string; risposta: string; citazione: string }>(an.lettore?.findings.domande_cliente);
  const cosaDice = (an.lettore?.findings.cosa_dice ?? null) as { offerta?: string; pubblico?: string } | null;
  const concorrenti = arr<{ nome: string; rating: number | null; recensioni: number; sito: string | null }>(an.concorrenti?.findings.concorrenti);
  const stato = s.decisione?.status;

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
            {s.perche.chiave.tipo === "MANUALE" ? <>l&apos;hai aggiunta tu.</>
              : caso ? <>stesso mestiere del caso studio <Link href={`/casi-studio/${caso.id}`} className="font-medium underline">{caso.titolo}</Link>.</>
                : rete ? <>è nella rete di <Link href={`/bni/membri/${rete.id}`} className="font-medium underline">{rete.name}</Link>.</>
                  : null}{" "}
            {s.perche.chiave.tipo !== "MANUALE" && <>Trovata su {CANALI[s.perche.canale] ?? s.perche.canale} il {data(s.perche.createdAt)}.</>}
          </div>
        )}

        {/* La decisione: una sola, dopo il giro veloce. */}
        <div className="mt-4 rounded-md border px-3 py-3">
          {lavorando ? (
            <div className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Gli agenti stanno lavorando ({s.inCorso.length})…</div>
          ) : stato === "APPROVATO" ? (
            <div className="text-sm">
              <Check className="h-4 w-4 inline mr-1 text-green-600" />Da approfondire{an.ganci ? ": i 3 ganci sono pronti" : ": il giro completo è in corso"}
              {s.sulMac.length > 0 && <div className="text-xs text-muted-foreground mt-1">Aspettano gli agenti sul Mac (social, Meta, LinkedIn, titolare): {s.sulMac.length}. Quando arrivano, i ganci si aggiornano.</div>}
            </div>
          ) : stato === "SCARTATO" ? (
            <div className="text-sm flex flex-wrap items-center gap-2">Scartata <Button variant="ghost" size="sm" onClick={() => decidi("ripensaci")} disabled={occupato}>Ripensaci</Button></div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm">{s.decisione ? "Il giro veloce è fatto. Vale la pena?" : "Il giro veloce non è ancora finito, ma puoi già decidere."}</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => decidi("approfondisci")} disabled={occupato}><Search className="h-4 w-4 mr-1.5" />Approfondisci</Button>
                <Button size="sm" variant="outline" onClick={() => decidi("scarta")} disabled={occupato}><X className="h-4 w-4 mr-1.5" />Scarta</Button>
              </div>
            </div>
          )}
        </div>

        {ganci.length > 0 && (
          <>
            <Titolo>I 3 ganci per la chiamata</Titolo>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 space-y-2">
              {ganci.map((g, i) => (
                <div key={i} className="text-sm"><span className="font-medium">{i + 1}.</span> {g.frase}<div className="text-xs text-muted-foreground ml-4 break-words">{g.prova}</div></div>
              ))}
              {str(an.ganci?.findings.apertura) && <div className="text-sm border-t pt-2"><span className="text-muted-foreground">Per aprire: </span>&ldquo;{str(an.ganci?.findings.apertura)}&rdquo;</div>}
            </div>
          </>
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
            <div><div className="font-medium">Titolare: da trovare</div><div className="text-muted-foreground">Lo cerca l&apos;agente su LinkedIn nel giro completo</div></div>
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

        <Titolo n={3}>Ti trovano?</Titolo>
        <div className="space-y-2">
          <Blocco titolo="Cercando il nome" r={an.trova_sito} />
          {an.posizioni && <Blocco titolo="Cercando il servizio su Google" r={an.posizioni} />}
          {an.concorrenti && (
            <Blocco titolo="Su Google Maps, contro i concorrenti" r={an.concorrenti}>
              <div className="mt-1.5 space-y-0.5">
                {concorrenti.map((c, i) => (
                  <div key={i} className="text-xs text-muted-foreground break-words">{i + 1}. {c.nome} · {c.rating ?? "?"}★ · {c.recensioni} recensioni{c.sito ? ` · ${c.sito}` : " · senza sito"}</div>
                ))}
              </div>
            </Blocco>
          )}
        </div>

        <Titolo n={4}>Il sito</Titolo>
        <div className="space-y-2">
          <Blocco titolo="Visto su telefono e computer" r={an.sito_visto}>
            {(foto.telefono || foto.computer) && (
              <div className="flex gap-2 mt-2 items-start">
                {foto.telefono && <img src={foto.telefono} alt="Il sito sul telefono" className="w-24 rounded border" />}
                {foto.computer && <img src={foto.computer} alt="Il sito sul computer" className="w-48 max-w-[60%] rounded border" />}
              </div>
            )}
            {str(sitoVisto?.impressione) && <div className="text-sm mt-1.5">{str(sitoVisto?.impressione)}</div>}
          </Blocco>
          <Blocco titolo="Cosa dice e a cosa risponde" r={an.lettore}>
            {cosaDice?.offerta && <div className="text-sm mt-1">{cosaDice.offerta}{cosaDice.pubblico ? ` Per: ${cosaDice.pubblico}` : ""}</div>}
            {domande.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {domande.map((d, i) => (
                  <div key={i} className="text-xs break-words">
                    <span className={d.risposta === "no" ? "text-red-600 dark:text-red-400" : d.risposta === "sì" ? "text-green-600 dark:text-green-400" : "text-amber-600"}>{d.risposta === "no" ? "✗" : d.risposta === "sì" ? "✓" : "~"}</span> {d.domanda}
                  </div>
                ))}
              </div>
            )}
          </Blocco>
          <Blocco titolo="Dal cliente al contatto" r={an.contatto} />
        </div>

        <Titolo n={5}>Le recensioni</Titolo>
        <Blocco titolo="Cosa dicono i clienti" r={an.recensioni}>
          {arr<{ cosa: string; citazione: string }>(an.recensioni?.findings.lodano).slice(0, 2).map((x, i) => (
            <div key={i} className="text-xs mt-1 break-words"><span className="text-green-600">+</span> {x.cosa}: &ldquo;{x.citazione}&rdquo;</div>
          ))}
          {arr<{ cosa: string; citazione: string }>(an.recensioni?.findings.lamentano).slice(0, 2).map((x, i) => (
            <div key={i} className="text-xs mt-1 break-words"><span className="text-red-600">−</span> {x.cosa}: &ldquo;{x.citazione}&rdquo;</div>
          ))}
        </Blocco>

        <Titolo n={6}>Pubblicità e social <span className="text-xs">(giro completo)</span></Titolo>
        <div className="space-y-2">
          <Blocco titolo="Google Ads" r={an.google_ads} />
          {an.meta_ads && <Blocco titolo="Inserzioni Facebook e Instagram" r={an.meta_ads} />}
          {an.social && <Blocco titolo="Social" r={an.social} />}
          {an.linkedin_azienda && <Blocco titolo="LinkedIn" r={an.linkedin_azienda} />}
        </div>

        <Titolo n={7}>Prossimo passo</Titolo>
        <div className="rounded-md border px-3 py-2.5 text-sm">{s.prossimo}</div>

        <Titolo n={8}>Storia</Titolo>
        <div className="text-sm text-muted-foreground space-y-0.5">
          {s.storia.map((e, i) => <div key={i} className="break-words">{data(e.quando)} · {e.cosa}</div>)}
        </div>
      </CardContent></Card>
    </div>
  );
}
