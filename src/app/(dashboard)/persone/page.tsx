"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Contact, Linkedin, Search } from "lucide-react";
import { data } from "@/components/ricerca/etichette";

interface Persona {
  id: string;
  nome: string;
  ruolo: string | null;
  aziendaNome: string | null;
  linkedinUrl: string | null;
  localita: string | null;
  contattoInComune: string | null;
  fonte: string;
  note: string | null;
  createdAt: string;
  lead: { id: string; name: string; website: string | null } | null;
  bniMembro: { id: string; name: string; chapter: string | null } | null;
  chiave: { tipo: string; valore: string; casoStudio: { id: string; titolo: string } | null } | null;
}

const FILTRI = [
  { k: "", label: "Tutte" },
  { k: "fonte=linkedin", label: "Simili ai casi studio" },
  { k: "fonte=rete_membro", label: "Dalle reti BNI" },
  { k: "bni=1", label: "Membri BNI" },
];

export default function PersonePage() {
  const [q, setQ] = useState("");
  const [cerca, setCerca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [persone, setPersone] = useState<Persona[] | null>(null);
  const [totale, setTotale] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setCerca(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let vivo = true;
    const qs = [filtro, cerca ? `q=${encodeURIComponent(cerca)}` : ""].filter(Boolean).join("&");
    fetch(`/api/ricerca/persone${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        setPersone(d.persone ?? []);
        setTotale(d.totale ?? 0);
      });
    return () => {
      vivo = false;
    };
  }, [cerca, filtro]);

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Contact className="h-6 w-6 text-primary" /> Persone LinkedIn</h1>
        <p className="text-sm text-muted-foreground">Le persone trovate su LinkedIn: simili ai titolari dei casi studio e nelle reti dei membri BNI, ognuna con la sua azienda.</p>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, azienda o ruolo" className="pl-9" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTRI.map((f) => (
          <button key={f.k} onClick={() => setFiltro(f.k)} className={`text-xs px-2.5 py-1 rounded-md border transition ${filtro === f.k ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}>{f.label}</button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">{totale} persone</div>
      {!persone ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : persone.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nessuna persona. Le trova l&apos;agente su LinkedIn (al massimo 2 lavori al giorno) partendo dai casi studio e dalle reti dei membri BNI.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {persone.map((p) => (
            <Card key={p.id}><CardContent className="p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium break-words">{p.nome}</span>
                {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Profilo LinkedIn"><Linkedin className="h-4 w-4 text-primary" /></a>}
                {p.bniMembro && <Link href={`/bni/membri/${p.bniMembro.id}`}><Badge variant="outline" className="text-[10px]">membro BNI · {p.bniMembro.chapter}</Badge></Link>}
              </div>
              <div className="text-xs text-muted-foreground break-words">
                {[p.ruolo, p.localita].filter(Boolean).join(" · ")}
                {p.lead ? <> · <Link href={`/leads/${p.lead.id}`} className="hover:underline">{p.lead.name}</Link></> : p.aziendaNome ? ` · ${p.aziendaNome}` : ""}
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                {p.contattoInComune && <span>contatto in comune: {p.contattoInComune}</span>}
                {p.chiave?.casoStudio && <Link href={`/casi-studio/${p.chiave.casoStudio.id}`} className="hover:underline">dal caso {p.chiave.casoStudio.titolo}</Link>}
                <span>{data(p.createdAt)}</span>
              </div>
              {p.note && <div className="text-xs break-words">{p.note}</div>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
