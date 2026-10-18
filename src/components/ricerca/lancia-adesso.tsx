"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface EsitoRicerca {
  avviata?: boolean;
  nuove?: number;
  nuoveOggiPrima?: number;
  lavoriMeta?: number;
  lavoriLinkedin?: number;
  esploratoreClassico?: boolean;
  motivo?: string | null;
}
interface EsitoBni {
  richiesteNuove?: number;
  visiteProposte?: number;
  settimana?: { richiesteAperte: number };
}

/** In parole semplici: cosa ha fatto il giro appena lanciato. */
function racconta(squadra: "ricerca" | "bni", d: EsitoRicerca & EsitoBni): string {
  if (squadra === "bni") {
    const n = d.richiesteNuove ?? 0;
    const v = d.visiteProposte ?? 0;
    if (!n && !v) return `Nessuna richiesta nuova: ce ne sono già ${d.settimana?.richiesteAperte ?? 0} aperte (o oggi sono già state preparate).`;
    return `${n} richieste di 121${v ? ` e ${v} visite` : ""} pronte in Cassetta.`;
  }
  if (d.avviata) return "Sto cercando su Google Maps e Google: le aziende nuove compaiono qui sotto in 1-2 minuti, con l'analisi veloce già partita.";
  if (d.motivo) return d.motivo;
  const n = d.nuove ?? 0;
  const browser = (d.lavoriMeta ?? 0) + (d.lavoriLinkedin ?? 0);
  const extra = browser ? ` Facebook, Instagram e LinkedIn li cercano gli agenti sul tuo Mac.` : "";
  if (!n && (d.nuoveOggiPrima ?? 0) >= 5) return `Oggi le 5 aziende nuove ci sono già: la ricerca riprende domani.${extra}`;
  return `${n} aziende nuove trovate${d.esploratoreClassico ? " (nessun caso studio attivo: ricerca per categoria e città)" : ""}.${extra}`;
}

/** Fa partire subito un giro della squadra, senza aspettare l'orario automatico. */
export function LanciaAdesso({ squadra, etichetta, onFatto }: { squadra: "ricerca" | "bni"; etichetta: string; onFatto?: () => void }) {
  const [inCorso, setInCorso] = useState(false);
  async function lancia() {
    setInCorso(true);
    try {
      const r = await fetch("/api/squadra/lancia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ squadra }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) throw new Error("Troppi lanci ravvicinati: riprova fra qualche minuto");
      if (r.status === 403) throw new Error("Solo un amministratore può lanciarlo");
      if (!r.ok) throw new Error(d.error || "Qualcosa non ha funzionato");
      toast.success(racconta(squadra, d), { duration: 8000 });
      onFatto?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setInCorso(false);
    }
  }
  return (
    <Button variant="outline" onClick={lancia} disabled={inCorso}>
      {inCorso ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
      {inCorso ? "Sto lavorando…" : etichetta}
    </Button>
  );
}
