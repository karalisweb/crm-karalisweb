"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { stessoRuolo } from "@/lib/agents/bni-regole";

interface Membro {
  id: string;
  name: string;
  profession: string | null;
  company: string | null;
  chapter: string | null;
  cosaFa: string | null;
  seeking: string | null;
  referenzePuoDare: string | null;
  conosciuto: boolean;
  next121At: string | null;
  leadershipRole: string | null;
}

const RUOLI: Record<string, string> = { PRESIDENTE: "presidente", VICEPRESIDENTE: "vicepresidente", FORMAZIONE: "formazione", EVENTI: "eventi" };

type Stato = "CONOSCIUTO" | "FISSATO" | "DA_INCONTRARE";

function statoDi(m: Membro): Stato {
  if (m.conosciuto) return "CONOSCIUTO";
  if (m.next121At && new Date(m.next121At).getTime() > Date.now() - 86400000) return "FISSATO";
  return "DA_INCONTRARE";
}

const STATI: Record<Stato, { etichetta: string; ordine: number; badge: string; bordo: string }> = {
  CONOSCIUTO: { etichetta: "conosciuto", ordine: 0, badge: "bg-green-600 text-white border-transparent", bordo: "border-l-4 border-l-green-600" },
  FISSATO: { etichetta: "incontro fissato", ordine: 1, badge: "bg-blue-600 text-white border-transparent", bordo: "border-l-4 border-l-blue-600" },
  DA_INCONTRARE: { etichetta: "da incontrare", ordine: 2, badge: "bg-muted text-muted-foreground border-transparent", bordo: "border-l-4 border-l-transparent" },
};

/** I membri raggruppati per capitolo (dal più grande); dentro, per stato e poi per nome. */
function perCapitolo(membri: Membro[]): [string, Membro[]][] {
  const gruppi = new Map<string, Membro[]>();
  for (const m of membri) {
    const k = m.chapter || "Senza capitolo";
    gruppi.set(k, [...(gruppi.get(k) ?? []), m]);
  }
  for (const lista of gruppi.values()) lista.sort((a, b) => STATI[statoDi(a)].ordine - STATI[statoDi(b)].ordine || a.name.localeCompare(b.name, "it"));
  // I capitoli più grandi per primi.
  return [...gruppi.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "it"));
}

interface InfoCapitolo { id: string; regione: string | null; isMine: boolean }
const SENZA_REGIONE = "Regione non indicata";

/** I capitoli divisi per regione (v3.73): prima la Sardegna (il tuo capitolo in cima), poi le altre, per nome. */
function perRegione(membri: Membro[], info: Record<string, InfoCapitolo>): [string, [string, Membro[]][]][] {
  const regioni = new Map<string, [string, Membro[]][]>();
  for (const [capitolo, lista] of perCapitolo(membri)) {
    const r = info[capitolo.toLowerCase()]?.regione ?? SENZA_REGIONE;
    regioni.set(r, [...(regioni.get(r) ?? []), [capitolo, lista]]);
  }
  for (const caps of regioni.values()) caps.sort((a, b) => Number(!info[a[0].toLowerCase()]?.isMine) - Number(!info[b[0].toLowerCase()]?.isMine));
  const peso = (r: string) => (r === "Sardegna" ? 0 : r === SENZA_REGIONE ? 2 : 1);
  return [...regioni.entries()].sort((a, b) => peso(a[0]) - peso(b[0]) || a[0].localeCompare(b[0], "it"));
}

const ORDINE_RUOLI = ["PRESIDENTE", "VICEPRESIDENTE", "FORMAZIONE", "EVENTI"];

/**
 * Le sezioni di un capitolo, in quest'ordine: 121 fatti, colleghi (chi fa il tuo mestiere),
 * leadership, 121 da fare. Chi è già stato incontrato sta solo tra i fatti, anche se è un
 * collega o un leader.
 */
function sezioniCapitolo(lista: Membro[]): { titolo: string; membri: Membro[] }[] {
  const fatti = lista.filter((m) => statoDi(m) === "CONOSCIUTO");
  const daIncontrare = lista.filter((m) => statoDi(m) !== "CONOSCIUTO");
  const leadership = daIncontrare
    .filter((m) => m.leadershipRole && ORDINE_RUOLI.includes(m.leadershipRole))
    .sort((a, b) => ORDINE_RUOLI.indexOf(a.leadershipRole!) - ORDINE_RUOLI.indexOf(b.leadershipRole!));
  const colleghi = daIncontrare.filter((m) => !leadership.includes(m) && stessoRuolo(m.profession));
  const daFare = daIncontrare.filter((m) => !leadership.includes(m) && !colleghi.includes(m));
  return [
    { titolo: "121 fatti", membri: fatti },
    { titolo: "Colleghi (fanno il tuo mestiere)", membri: colleghi },
    { titolo: "Leadership", membri: leadership },
    { titolo: "121 da fare", membri: daFare },
  ].filter((x) => x.membri.length);
}

function RigaMembro({ m, conCapitolo, dettaglio }: { m: Membro; conCapitolo?: boolean; dettaglio?: boolean }) {
  return (
    <Link href={`/bni/membri/${m.id}`} className={`flex items-start justify-between gap-3 rounded-lg border p-3 hover:border-primary transition ${STATI[statoDi(m)].bordo}`}>
      <div className="min-w-0">
        <div className="font-medium break-words flex flex-wrap items-center gap-2">
          {m.name}
          {m.leadershipRole && RUOLI[m.leadershipRole] && <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/15 text-primary">{RUOLI[m.leadershipRole]}</span>}
        </div>
        <div className="text-xs text-muted-foreground break-words">{[m.profession, m.company, conCapitolo ? m.chapter : null].filter(Boolean).join(" · ")}</div>
        {dettaglio && (m.cosaFa || m.referenzePuoDare) && <div className="text-xs mt-1 break-words line-clamp-2">{m.cosaFa ?? m.referenzePuoDare}</div>}
      </div>
      <Badge className={`text-[10px] shrink-0 ${STATI[statoDi(m)].badge}`}>{STATI[statoDi(m)].etichetta}</Badge>
    </Link>
  );
}

// useSearchParams vuole un Suspense intorno, o la build non prepara la pagina.
export default function MembriBniPage() {
  return <Suspense><RubricaBni /></Suspense>;
}

function RubricaBni() {
  const [q, setQ] = useState("");
  const [cerca, setCerca] = useState("");
  const [risultato, setRisultato] = useState<{ per: string; membri: Membro[]; totale: number } | null>(null);
  const [capitoli, setCapitoli] = useState<Record<string, InfoCapitolo>>({});
  // Una regione alla volta (v3.76): la Sardegna; le altre (il Lazio) da un link, per non perdere il lavoro fatto.
  const regione = useSearchParams().get("regione") || "Sardegna";
  const [altreRegioni, setAltreRegioni] = useState<{ regione: string; capitoli: number }[]>([]);
  const membri = risultato?.membri ?? [];
  const totale = risultato?.totale ?? 0;
  const loading = risultato?.per !== cerca;

  // Si cerca mezzo secondo dopo che hai smesso di scrivere.
  useEffect(() => {
    const t = setTimeout(() => setCerca(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/bni/membri?regione=${encodeURIComponent(regione)}${cerca ? `&q=${encodeURIComponent(cerca)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        setRisultato({ per: cerca, membri: d.membri ?? [], totale: d.totale ?? 0 });
        setAltreRegioni(d.altreRegioni ?? []);
        if (d.capitoli) setCapitoli(Object.fromEntries((d.capitoli as ({ name: string } & InfoCapitolo)[]).map((c) => [c.name.toLowerCase(), { id: c.id, regione: c.regione, isMine: c.isMine }])));
      });
    return () => {
      vivo = false;
    };
  }, [cerca, regione]);

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Rubrica BNI · {regione}</h1>
        <p className="text-sm text-muted-foreground">Chi fa cosa nei capitoli BNI {regione === "Sardegna" ? "della Sardegna" : `della regione ${regione}`}. Qualcuno ti chiede una referenza? Scrivi di cosa ha bisogno e trovi a chi girarla.</p>
        {altreRegioni.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            {altreRegioni.map((r) => (
              <Link key={r.regione} href={r.regione === "Sardegna" ? "/bni/membri" : `/bni/membri?regione=${encodeURIComponent(r.regione)}`} className="text-primary hover:underline">
                {r.regione === "Sardegna" ? "← Torna alla Sardegna" : `Capitoli ${r.regione} →`}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="es. commercialista a Cagliari · chi conosce aziende di piscine" className="pl-9" />
      </div>
      <div className="text-xs text-muted-foreground">{cerca ? `${totale} membri rispondono a "${cerca}"` : `${totale} membri`}</div>
      {loading && !membri.length ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : membri.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nessun membro corrisponde. Prova con un&apos;altra parola (il mestiere, un settore).</CardContent></Card>
      ) : cerca ? (
        <div className="space-y-2">{membri.map((m) => <RigaMembro key={m.id} m={m} conCapitolo dettaglio />)}</div>
      ) : (
        <div className="space-y-6">
          {perRegione(membri, capitoli).map(([regione, caps]) => {
          const titolo = <h2 className="font-semibold inline">{regione} <span className="text-xs font-normal text-muted-foreground">· {caps.length} {caps.length === 1 ? "capitolo" : "capitoli"}, {caps.reduce((n, [, l]) => n + l.length, 0)} membri</span></h2>;
          const corpo = caps.map(([capitolo, lista]) => {
            const conosciuti = lista.filter((m) => statoDi(m) === "CONOSCIUTO").length;
            const fissati = lista.filter((m) => statoDi(m) === "FISSATO").length;
            return (
              <details key={capitolo} className="rounded-xl border bg-card group">
                <summary className="cursor-pointer list-none p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{capitolo}{capitoli[capitolo.toLowerCase()]?.isMine && <span className="ml-2 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-primary/15 text-primary">il tuo</span>}</span>
                    <span className="text-xs">
                      <span className="text-green-600 dark:text-green-400 font-medium">{conosciuti} conosciuti</span>
                      {fissati > 0 && <span className="text-blue-600 dark:text-blue-400 font-medium"> · {fissati} fissati</span>}
                      <span className="text-foreground font-semibold"> · ne mancano {lista.length - conosciuti - fissati}</span>
                      <span className="text-muted-foreground"> su {lista.length}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden flex">
                    <div className="h-full bg-green-600" style={{ width: `${(conosciuti / lista.length) * 100}%` }} />
                    <div className="h-full bg-blue-600" style={{ width: `${(fissati / lista.length) * 100}%` }} />
                  </div>
                </summary>
                <div className="px-3 pb-3 space-y-1.5">
                  {capitoli[capitolo.toLowerCase()] && (
                    <Link href={`/bni/capitoli/${capitoli[capitolo.toLowerCase()].id}`} className="inline-block text-xs text-primary hover:underline mb-1">Scheda del capitolo: giorno, sede, ordine degli incontri →</Link>
                  )}
                  {sezioniCapitolo(lista).map((sez) => (
                    <div key={sez.titolo} className="pt-2 space-y-1.5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sez.titolo} ({sez.membri.length})</div>
                      {sez.membri.map((m) => <RigaMembro key={m.id} m={m} />)}
                    </div>
                  ))}
                </div>
              </details>
            );
          });
          return <section key={regione} className="space-y-2">{titolo}{corpo}</section>;
          })}
        </div>
      )}
    </div>
  );
}
