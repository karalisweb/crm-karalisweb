"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Gift, HandHelping, Linkedin, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { dataOra, data } from "@/components/ricerca/etichette";
import { PuntiContatto, Segnalazioni, type Segnalazione } from "@/components/ricerca/motore-121";

interface Foglio {
  membro: {
    id: string; nome: string; azienda: string | null; categoria: string | null; capitolo: string | null; ruolo: string | null; telefono: string | null;
    linkedin: string | null; quando: string | null; cosaFa: string | null; referenzeCerca: string | null; referenzePuoDare: string | null; conosciuto: boolean;
  };
  studio: { leadId: string; studiatoAt: string | null; riepiloghi: { agente: string; testo: string }[]; leve: string[] } | null;
  segnalazioni: { id: string; nome: string; motivo: string | null; leadId: string | null }[];
  presentazioni: { id: string; nome: string; ruolo: string | null; perche: string | null; linkedin: string | null; forza: number; punti: string[]; stato: string }[];
  ultimo121: { date: string; riassunto: string | null; promesse: string | null } | null;
  casoStudio: { titolo: string; storia: string | null } | null;
  domande: string[];
  ricorda: string;
}

function Blocco({ icona, titolo, children }: { icona?: React.ReactNode; titolo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{icona}{titolo}</CardTitle></CardHeader>
      <CardContent className="text-sm break-words space-y-2">{children}</CardContent>
    </Card>
  );
}

/**
 * La pagina del giorno prima del 121 (Motore 121, passo 7): 5 minuti di lettura. Chi è, cosa si è
 * visto della sua azienda, cosa dargli (contatti da segnalare) e cosa chiedergli (presentazioni).
 */
export default function Pagina121({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [f, setF] = useState<Foglio | null>(null);
  const [versione, setVersione] = useState(0);
  const carica = useCallback(() => setVersione((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/bni/membri/${id}/foglio`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const x: Foglio = await r.json();
        if (vivo) setF(x);
      })
      .catch(() => toast.error("Pagina non disponibile"));
    return () => {
      vivo = false;
    };
  }, [id, versione]);

  if (!f) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  const m = f.membro;
  const segnalazioni: Segnalazione[] = f.segnalazioni.map((s) => ({ ...s, stato: "DA_DARE" }));

  return (
    <div className="space-y-4 min-w-0 max-w-3xl">
      <Link href={`/bni/membri/${m.id}`} className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Scheda di {m.nome}</Link>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold break-words">121 con {m.nome}</h1>
        <div className="text-sm text-muted-foreground">
          {[...new Set([m.categoria, m.azienda, m.capitolo, m.ruolo?.toLowerCase()].filter(Boolean))].join(" · ")}
          {m.quando && <> · <span className="text-foreground">{dataOra(m.quando)}</span></>}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {m.telefono && <a href={`tel:${m.telefono}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5" />{m.telefono}</a>}
          {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
        </div>
      </div>

      <Card className="border-primary/50 bg-primary/5"><CardContent className="p-3 text-sm font-medium">{f.ricorda}</CardContent></Card>

      <Blocco titolo="Chi è">
        <p className="whitespace-pre-wrap">{m.cosaFa || (m.conosciuto ? "Non ancora scritto: lo dice il vocale dopo il 121." : "Primo incontro: si scopre al 121.")}</p>
        {m.referenzeCerca && <p><span className="text-muted-foreground">Il suo cliente ideale:</span> {m.referenzeCerca}</p>}
        {m.referenzePuoDare && <p><span className="text-muted-foreground">Chi conosce:</span> {m.referenzePuoDare}</p>}
        {f.ultimo121 && (
          <p className="text-xs text-muted-foreground">Ultimo 121: {data(f.ultimo121.date)}{f.ultimo121.promesse ? ` · promesse: ${f.ultimo121.promesse}` : ""}</p>
        )}
      </Blocco>

      <Blocco icona={<Search className="h-4 w-4 text-primary" />} titolo="La sua azienda, vista da fuori">
        {!f.studio ? (
          <p className="text-muted-foreground">Nessun sito o azienda collegata: aggiungi il sito nella scheda del membro e l&apos;agente la studia prima del 121.</p>
        ) : !f.studio.riepiloghi.length ? (
          <p className="text-muted-foreground">Lo studio parte nei 4 giorni prima del 121 (con il turno delle 6:45, 14:45 o 18:15).</p>
        ) : (
          <>
            <ul className="list-disc pl-4 space-y-0.5">{f.studio.riepiloghi.map((r, i) => <li key={i}>{r.testo}</li>)}</ul>
            {f.studio.leve.length > 0 && (
              <div className="text-xs text-muted-foreground">Dove potrebbe crescere (non si vende al primo 121): {f.studio.leve.join(" · ")}</div>
            )}
            <Link href={`/aziende-trovate/${f.studio.leadId}`} className="text-xs underline">Scheda completa dell&apos;azienda</Link>
          </>
        )}
      </Blocco>

      <Blocco icona={<Gift className="h-4 w-4 text-primary" />} titolo="Cosa dargli: contatti da segnalare">
        <Segnalazioni lista={segnalazioni} onCambio={carica} />
      </Blocco>

      <Blocco icona={<HandHelping className="h-4 w-4 text-primary" />} titolo="Cosa chiedergli: persone da farti presentare">
        {f.presentazioni.length === 0 ? (
          <p className="text-muted-foreground">Nessuna ancora: arrivano dalla lettura della sua rete LinkedIn (nei 3 giorni prima del 121). Chiedigli chi sono i suoi clienti tipo.</p>
        ) : (
          f.presentazioni.map((p) => (
            <div key={p.id} className="border-b last:border-0 pb-2">
              <div>{p.nome} {p.ruolo && <span className="text-muted-foreground">— {p.ruolo}</span>} {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs underline">profilo</a>}</div>
              {p.perche && <div className="text-xs text-muted-foreground">{p.perche}</div>}
              <PuntiContatto punti={p.punti} forza={p.forza} />
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground">Chiedi sempre: &quot;lo conosci bene?&quot;. Dopo il 121 dettalo nel vocale: le presentazioni confermate vanno in Cassetta con il messaggio pronto.</p>
      </Blocco>

      {f.casoStudio?.storia && (
        <Blocco titolo={`La storia da raccontare: ${f.casoStudio.titolo}`}><p className="whitespace-pre-wrap">{f.casoStudio.storia}</p></Blocco>
      )}

      <Blocco titolo="Le domande">
        <ul className="list-disc pl-4 space-y-0.5">{f.domande.map((d, i) => <li key={i}>{d}</li>)}</ul>
      </Blocco>

      <div className="flex flex-wrap gap-2">
        <Link href={`/bni/membri/${m.id}`}><Button>Dopo il 121: registra il vocale</Button></Link>
        <Badge variant="outline" className="self-center">pagina aggiornata ora</Badge>
      </div>
    </div>
  );
}
