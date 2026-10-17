"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";

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
}

export default function MembriBniPage() {
  const [q, setQ] = useState("");
  const [cerca, setCerca] = useState("");
  const [risultato, setRisultato] = useState<{ per: string; membri: Membro[]; totale: number } | null>(null);
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
    fetch(`/api/ricerca/bni/membri${cerca ? `?q=${encodeURIComponent(cerca)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (vivo) setRisultato({ per: cerca, membri: d.membri ?? [], totale: d.totale ?? 0 });
      });
    return () => {
      vivo = false;
    };
  }, [cerca]);

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Membri BNI</h1>
        <p className="text-sm text-muted-foreground">Qualcuno ti chiede una referenza? Scrivi di cosa ha bisogno.</p>
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
      ) : (
        <div className="space-y-2">
          {membri.map((m) => (
            <Link key={m.id} href={`/bni/membri/${m.id}`} className="block">
              <Card className="hover:border-primary transition"><CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">{m.name}</span>
                  {m.conosciuto ? <Badge variant="outline" className="text-[10px]">conosciuto</Badge> : <Badge variant="secondary" className="text-[10px]">da incontrare</Badge>}
                </div>
                <div className="text-xs text-muted-foreground break-words">{[m.profession, m.company, m.chapter].filter(Boolean).join(" · ")}</div>
                {cerca && (m.cosaFa || m.referenzePuoDare) && (
                  <div className="text-xs mt-1 break-words line-clamp-2">{m.cosaFa ?? m.referenzePuoDare}</div>
                )}
              </CardContent></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
