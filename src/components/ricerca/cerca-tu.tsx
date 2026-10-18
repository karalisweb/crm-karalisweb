"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";

type Tipo = "azienda" | "settore" | "persona";

const TIPI: { k: Tipo; label: string; esempio: string }[] = [
  { k: "azienda", label: "Un'azienda", esempio: "Nome dell'azienda" },
  { k: "settore", label: "Un settore", esempio: "Cosa fanno (come lo cercheresti su Google)" },
  { k: "persona", label: "Una persona", esempio: "Nome e cognome" },
];

/** La casella "parti da qui": Alessio scrive un'azienda, un settore o una persona. */
export function CercaTu({ onFatto }: { onFatto?: () => void }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("azienda");
  const [testo, setTesto] = useState("");
  const [citta, setCitta] = useState("");
  const [azienda, setAzienda] = useState("");
  const [occupato, setOccupato] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (testo.trim().length < 3) {
      setEsito({ ok: false, testo: "Scrivi almeno 3 lettere" });
      return;
    }
    setOccupato(true);
    setEsito(null);
    const r = await fetch("/api/ricerca/manuale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, testo, citta: citta || null, azienda: azienda || null }),
    });
    const d = await r.json().catch(() => ({}));
    setOccupato(false);
    if (!r.ok) {
      setEsito({ ok: false, testo: d.error ?? "Errore" });
      return;
    }
    setTesto("");
    setAzienda("");
    onFatto?.();
    if (d.leadId) router.push(`/aziende-trovate/${d.leadId}`);
    else setEsito({ ok: true, testo: d.messaggio });
  }

  const es = TIPI.find((t) => t.k === tipo)!;
  return (
    <Card><CardContent className="p-4">
      <form onSubmit={invia} className="space-y-3">
        <div className="text-sm font-semibold">Parti da qui</div>
        <div className="flex flex-wrap gap-1.5">
          {TIPI.map((t) => (
            <button type="button" key={t.k} onClick={() => setTipo(t.k)} className={`text-xs px-2.5 py-1 rounded-md border transition ${tipo === t.k ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}>{t.label}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
          <Input value={testo} onChange={(e) => { setTesto(e.target.value); setEsito(null); }} placeholder={es.esempio} aria-label={es.label} />
          {tipo !== "settore" && <Input value={citta} onChange={(e) => setCitta(e.target.value)} placeholder="Città" aria-label="Città" />}
        </div>
        {tipo === "persona" && <Input value={azienda} onChange={(e) => setAzienda(e.target.value)} placeholder="La sua azienda (se la sai)" aria-label="Azienda della persona" />}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={occupato}>{occupato ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}Aggiungi</Button>
          <span className="text-xs text-muted-foreground">
            {tipo === "azienda" ? "La cerco su Google Maps e parte subito l'analisi veloce" : tipo === "settore" ? "Entra nelle ricerche, prima degli altri" : "Se scrivi la sua azienda, parte l'analisi veloce"}
          </span>
        </div>
        {esito && <div className={`text-sm ${esito.ok ? "text-green-600 dark:text-green-400" : "text-red-600"}`}>{esito.testo}</div>}
      </form>
    </CardContent></Card>
  );
}
