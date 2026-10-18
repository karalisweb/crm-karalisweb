"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, ExternalLink, Loader2, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ETICHETTE_CHIAVE, zoneDisponibili, type TipoChiave } from "@/lib/ricerca/regole";
import { CANALI, STATI_CASO, data } from "@/components/ricerca/etichette";

interface Chiave { id: string; tipo: TipoChiave; valore: string; termini: string[]; attiva: boolean; zonaIndice: number; usi: number; trovati: number; esauritaAt: string | null }
interface Caso {
  id: string; titolo: string; storia: string | null; settore: string | null; aziendaNome: string | null; aziendaSito: string | null;
  personaNome: string | null; personaRuolo: string | null; personaLinkedin: string | null; termini: string[]; terminiSettore: string[]; provincia: string | null; stato: string; validoFino: string | null;
  chiavi: Chiave[];
}
interface Trovato {
  id: string; canale: string; createdAt: string; chiave: { tipo: string };
  lead: { id: string; name: string; website: string | null; address: string | null; category: string | null } | null;
  persona: { id: string; nome: string; ruolo: string | null; aziendaNome: string | null; linkedinUrl: string | null; bniMembroId: string | null } | null;
}

const righe = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

/** Dove è arrivata la chiave: termine per zona, prima tutta la Sardegna. */
function zonaChiave(k: Chiave, provincia: string | null): string {
  if (k.esauritaAt) return "tutte le zone fatte";
  const termini = k.tipo === "AZIENDA" ? k.termini.length : k.termini.length + 1;
  const z = zoneDisponibili(k.tipo === "AZIENDA" && provincia ? [provincia] : [])[Math.floor(k.zonaIndice / Math.max(1, termini))];
  return z ? `ora a ${z}` : "tutte le zone fatte";
}

export default function CasoStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [caso, setCaso] = useState<Caso | null>(null);
  const [trovati, setTrovati] = useState<Trovato[]>([]);
  const [form, setForm] = useState({ titolo: "", storia: "", settore: "", aziendaNome: "", aziendaSito: "", personaNome: "", personaRuolo: "", personaLinkedin: "", termini: "", terminiSettore: "", provincia: "" });
  const [occupato, setOccupato] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const r = await fetch(`/api/ricerca/casi-studio/${id}`);
    if (!r.ok) return toast.error("Caso studio non trovato");
    const d = await r.json();
    const c: Caso = d.caso;
    setCaso(c);
    setTrovati(d.trovati ?? []);
    setForm({
      titolo: c.titolo, storia: c.storia ?? "", settore: c.settore ?? "", aziendaNome: c.aziendaNome ?? "", aziendaSito: c.aziendaSito ?? "",
      personaNome: c.personaNome ?? "", personaRuolo: c.personaRuolo ?? "", personaLinkedin: c.personaLinkedin ?? "", termini: (c.termini ?? []).join("\n"), terminiSettore: (c.terminiSettore ?? []).join("\n"), provincia: c.provincia ?? "",
    });
  }, [id]);
  useEffect(() => {
    carica();
  }, [carica]);

  async function azione(a: "conferma" | "rileggi" | "sospendi") {
    setOccupato(a);
    try {
      const body = a === "conferma"
        ? { azione: a, dati: { ...form, termini: righe(form.termini), terminiSettore: righe(form.terminiSettore) } }
        : { azione: a };
      const r = await fetch(`/api/ricerca/casi-studio/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success(a === "conferma" ? "Confermato: le ricerche partono dal prossimo turno" : a === "rileggi" ? "Riletto" : "Spento");
      carica();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setOccupato(null);
    }
  }

  if (!caso) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  const campo = (k: keyof typeof form, etichetta: string, lungo = false) => (
    <div className={`space-y-1 ${lungo ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={k}>{etichetta}</Label>
      {lungo ? <Textarea id={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} rows={k === "storia" ? 5 : 4} /> : <Input id={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
    </div>
  );

  return (
    <div className="space-y-4 min-w-0">
      <Link href="/casi-studio" className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Casi studio</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{caso.titolo}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={caso.stato === "ATTIVO" ? "default" : "secondary"}>{STATI_CASO[caso.stato] ?? caso.stato}</Badge>
            {caso.stato === "ATTIVO" && caso.validoFino && <span className="text-xs text-muted-foreground">valido fino al {data(caso.validoFino)}</span>}
            <a href={`/api/ricerca/casi-studio/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> PDF</a>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{caso.stato === "DA_CONFERMARE" ? "Controlla e conferma" : "Il caso"}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {campo("titolo", "Titolo", false)}
          {campo("settore", "Settore (largo, es. piscine)")}
          {campo("provincia", "Provincia del cliente (sigla, es. CA): la nicchia non si cerca lì")}
          {campo("storia", "La storia da 30 secondi", true)}
          {campo("aziendaNome", "Azienda del cliente")}
          {campo("aziendaSito", "Sito del cliente")}
          {campo("personaNome", "Titolare / referente")}
          {campo("personaRuolo", "Ruolo")}
          {campo("personaLinkedin", "Profilo LinkedIn del titolare")}
          {campo("termini", "Nicchia: chi fa esattamente il suo mestiere (una ricerca per riga, senza città) — si cerca per prima", true)}
          {campo("terminiSettore", "Settore: ricerche più larghe (una per riga) — dopo la nicchia", true)}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button onClick={() => azione("conferma")} disabled={!!occupato}>{occupato === "conferma" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} {caso.stato === "ATTIVO" ? "Salva" : "Conferma"}</Button>
            <Button variant="outline" onClick={() => azione("rileggi")} disabled={!!occupato}>{occupato === "rileggi" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />} Fai rileggere il PDF</Button>
            {caso.stato === "ATTIVO" && <Button variant="ghost" onClick={() => azione("sospendi")} disabled={!!occupato}><Pause className="h-4 w-4 mr-1" /> Spegni</Button>}
          </div>
        </CardContent>
      </Card>

      {caso.chiavi.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chiavi di ricerca</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {caso.chiavi.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 pb-2">
                <div className="min-w-0">
                  <div className="font-medium">{ETICHETTE_CHIAVE[k.tipo] ?? k.tipo}: <span className="font-normal">{k.tipo === "AZIENDA" ? k.termini.join(", ") : [k.valore, ...k.termini].join(", ")}</span></div>
                  <div className="text-xs text-muted-foreground">{k.attiva ? `${k.usi} ricerche · ${k.trovati} nuovi${k.tipo === "PERSONA" ? "" : ` · ${zonaChiave(k, caso.provincia)}`}` : "spenta"}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cosa ha trovato ({trovati.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {trovati.length === 0 ? (
            <p className="text-muted-foreground">Ancora niente: le ricerche girano nei giorni feriali alle 6:30 e alle 14:30.</p>
          ) : (
            trovati.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 pb-1.5">
                <div className="min-w-0">
                  {t.persona ? (
                    <>
                      <span className="font-medium">{t.persona.nome}</span>
                      <span className="text-muted-foreground"> — {[t.persona.ruolo, t.persona.aziendaNome].filter(Boolean).join(" · ")}</span>
                      {t.persona.bniMembroId && <Badge variant="outline" className="ml-2 text-[10px]">membro BNI</Badge>}
                    </>
                  ) : t.lead ? (
                    <>
                      <Link href={`/leads/${t.lead.id}`} className="font-medium hover:underline">{t.lead.name}</Link>
                      <span className="text-muted-foreground"> — {[t.lead.category, t.lead.address].filter(Boolean).join(" · ")}</span>
                    </>
                  ) : null}
                </div>
                <Badge variant="secondary" className="text-[10px]">{CANALI[t.canale] ?? t.canale}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
