"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { FORMATI, GRUPPI, data } from "@/components/ricerca/etichette";

interface MembroRiga {
  id: string;
  nome: string;
  azienda: string | null;
  categoria: string | null;
  conosciuto: boolean;
  chiestaIl: string | null;
  fissatoIl: string | null;
  rinviato: boolean;
  indicato: boolean;
  prossimo: boolean;
  ultimo121: string | null;
}
interface Dati {
  capitolo: {
    id: string; nome: string; citta: string | null; region: string | null; regioneItaliana: string | null; formato: string;
    giorno: string | null; ora: string | null; sede: string | null; mio: boolean; visitStatus: string; mappatoIl: string | null;
    permesso: "CONCESSO" | "NEGATO" | null; permessoAt: string | null;
  };
  copertura: { totale: number; conosciuti: number; percentuale: number };
  visitaDaFare: boolean;
  attesaMappa: boolean;
  gruppi: { motivo: string; membri: MembroRiga[] }[];
}

function statoMembro(m: MembroRiga): { testo: string; classe: string } {
  if (m.conosciuto) return { testo: m.ultimo121 ? `conosciuto · ${data(m.ultimo121)}` : "conosciuto", classe: "text-green-700 dark:text-green-400" };
  if (m.fissatoIl) return { testo: `121 il ${data(m.fissatoIl)}`, classe: "text-primary" };
  if (m.chiestaIl) return { testo: `chiesto il ${data(m.chiestaIl)}`, classe: "text-amber-600 dark:text-amber-400" };
  if (m.rinviato) return { testo: "rinviato", classe: "text-muted-foreground" };
  if (m.prossimo) return { testo: "prossimo", classe: "text-primary font-medium" };
  return { testo: "da incontrare", classe: "text-muted-foreground" };
}

export default function CapitoloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Dati | null>(null);
  const [modifica, setModifica] = useState(false);
  const [form, setForm] = useState({ sede: "", giorno: "", ora: "", formato: "PRESENZA", zona: "" });

  const [versione, setVersione] = useState(0);
  const carica = useCallback(() => setVersione((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/bni/capitoli/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const x: Dati = await r.json();
        if (!vivo) return;
        setD(x);
        setForm({ sede: x.capitolo.sede ?? "", giorno: x.capitolo.giorno ?? "", ora: x.capitolo.ora ?? "", formato: x.capitolo.formato, zona: x.capitolo.region ?? "" });
      })
      .catch(() => toast.error("Capitolo non trovato"));
    return () => {
      vivo = false;
    };
  }, [id, versione]);

  async function salvaCapitolo(extra?: Record<string, unknown>) {
    const body = extra ?? { sede: form.sede, giorno: form.giorno, ora: form.ora, formato: form.formato, zona: form.zona || null };
    const r = await fetch(`/api/ricerca/bni/capitoli/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success("Salvato");
    setModifica(false);
    carica();
  }

  async function giaConosciuto(m: MembroRiga) {
    const r = await fetch(`/api/ricerca/bni/membri/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conosciuto: !m.conosciuto }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    carica();
  }

  if (!d) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  const c = d.capitolo;

  return (
    <div className="space-y-5 min-w-0">
      <Link href="/bni" className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Incontri BNI</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{c.nome}</h1>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3">
            <span>{[c.region && c.region !== "altro" ? c.region.replace("sardegna_", "Sardegna ") : c.regioneItaliana, c.citta].filter(Boolean).join(" · ")}</span>
            <span>{FORMATI[c.formato] ?? c.formato}</span>
            {(c.giorno || c.ora) && <span>{[c.giorno, c.ora].filter(Boolean).join(" ")}</span>}
            {c.sede && <span className="break-words">{c.sede}</span>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setModifica((x) => !x)}><Pencil className="h-3.5 w-3.5 mr-1" /> Modifica</Button>
      </div>

      {modifica && (
        <Card><CardContent className="p-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2"><Label htmlFor="sede">Sede (indirizzo o link)</Label><Input id="sede" value={form.sede} onChange={(e) => setForm({ ...form, sede: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="giorno">Giorno</Label><Input id="giorno" value={form.giorno} onChange={(e) => setForm({ ...form, giorno: e.target.value })} placeholder="Martedì" /></div>
          <div className="space-y-1"><Label htmlFor="ora">Ora</Label><Input id="ora" value={form.ora} onChange={(e) => setForm({ ...form, ora: e.target.value })} placeholder="07:00" /></div>
          <div className="space-y-1">
            <Label htmlFor="formato">Formato</Label>
            <select id="formato" value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {Object.entries(FORMATI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="zona">Zona</Label>
            <select id="zona" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="">—</option>
              <option value="sardegna_sud">Sardegna Sud</option>
              <option value="sardegna_centro">Sardegna Centro</option>
              <option value="sardegna_nord">Sardegna Nord</option>
              <option value="altro">Resto d&apos;Italia</option>
            </select>
          </div>
          <div className="sm:col-span-2"><Button size="sm" onClick={() => salvaCapitolo()}>Salva</Button></div>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Conosciuti <b>{d.copertura.conosciuti}</b> su {d.copertura.totale}</span><span>{d.copertura.percentuale}%</span></div>
        <div className="h-2 rounded bg-muted overflow-hidden relative">
          <div className="h-full bg-primary" style={{ width: `${d.copertura.percentuale}%` }} />
          <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: "33.3%" }} />
        </div>
        {d.attesaMappa && <p className="text-sm text-amber-600 dark:text-amber-400">Non si sa ancora chi guida il capitolo: il Cartografo lo legge da BNI Connect. Fino ad allora si contatta solo chi fa il tuo mestiere.</p>}
        {d.visitaDaFare && <p className="text-sm text-green-700 dark:text-green-400">Hai conosciuto un terzo del capitolo: è il momento della visita. Trovi il messaggio per il presidente in Cassetta.</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {c.visitStatus !== "VISITATO" && <Button size="sm" variant="outline" onClick={() => salvaCapitolo({ visitStatus: "VISITATO" })}><Check className="h-3.5 w-3.5 mr-1" /> Ho fatto la visita</Button>}
          {c.visitStatus === "VISITATO" && <Badge variant="outline">Capitolo visitato</Badge>}
        </div>
      </CardContent></Card>

      {!c.mio && d.gruppi.some((g) => g.motivo === "STESSO_RUOLO") && (
        <Card className={c.permesso === "NEGATO" ? "border-red-500" : undefined}><CardContent className="p-4 space-y-2 text-sm">
          <div className="font-semibold">Il collega di mestiere</div>
          {c.permesso === "NEGATO" ? (
            <p>Ha detto di no: in questo capitolo i 121 sono sospesi. I membri a cui sei già collegato restano ponti per le presentazioni.</p>
          ) : c.permesso === "CONCESSO" ? (
            <p className="text-green-700 dark:text-green-400">Via libera: si va avanti con la dirigenza e poi con tutti gli altri.</p>
          ) : (
            <p className="text-muted-foreground">Prima di tutti si incontra chi fa il tuo mestiere: più che chiedere il permesso lo informi e gli proponi di fare i partner. Se non risponde in 7 giorni si passa alla dirigenza e lo dici al presidente.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {c.permesso !== "CONCESSO" && <Button size="sm" variant="outline" onClick={() => salvaCapitolo({ permesso: "CONCESSO" })}><Check className="h-3.5 w-3.5 mr-1" /> Ha detto sì</Button>}
            {c.permesso !== "NEGATO" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Il collega ha detto no? I 121 in questo capitolo si fermano e le richieste ancora da mandare si tolgono.")) salvaCapitolo({ permesso: "NEGATO" }); }}>Ha detto no</Button>}
            {c.permesso && <Button size="sm" variant="ghost" onClick={() => salvaCapitolo({ permesso: null })}>Annulla</Button>}
          </div>
        </CardContent></Card>
      )}

      {d.gruppi.length === 0 && <p className="text-sm text-muted-foreground">Nessun membro: il Cartografo li legge da BNI Connect.</p>}
      {d.gruppi.map((g) => (
        <Card key={g.motivo}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{GRUPPI[g.motivo] ?? g.motivo}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {g.membri.map((m) => {
              const st = statoMembro(m);
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 pb-1.5">
                  <div className="min-w-0">
                    <Link href={`/bni/membri/${m.id}`} className="font-medium hover:underline break-words">{m.nome}</Link>
                    <div className="text-xs text-muted-foreground break-words">{[m.categoria, m.azienda].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${st.classe}`}>{st.testo}</span>
                    {!m.ultimo121 && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => giaConosciuto(m)}>
                        {m.conosciuto ? "Non conosciuto" : "Già conosciuto"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
