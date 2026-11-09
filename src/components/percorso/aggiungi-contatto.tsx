"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const MESSAGGI: Record<string, string> = {
  da_contattare: "Salvato: il messaggio è pronto in Da contattare",
  canale_aggiunto: "Salvato: ora puoi scrivergli anche da lì",
  nuovo_messaggio: "Salvato: il messaggio sul nuovo canale è in Da contattare",
  salvato: "Salvato",
};

/** v3.125: mail o telefono trovati dopo (Alessio: "aggiungere o cambiare canale"). */
export function AggiungiContatto({ leadId, onFatto }: { leadId: string; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [salvo, setSalvo] = useState(false);

  if (!aperto) {
    return (
      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAperto(true)}>
        <Plus className="h-3 w-3 mr-1" />Aggiungi mail o telefono
      </Button>
    );
  }

  const salva = async (ev: FormEvent) => {
    ev.preventDefault();
    setSalvo(true);
    const r = await fetch(`/api/percorso/${leadId}/contatto`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, telefono }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { esito?: string; soloFisso?: boolean; error?: string } | null;
    setSalvo(false);
    if (!r?.ok) return void toast.error(d?.error ?? "Non sono riuscito a salvare");
    toast.success(d?.soloFisso ? "Numero fisso salvato: su WhatsApp non si può, usa Chiama nella scheda dell'azienda" : MESSAGGI[d?.esito ?? "salvato"]);
    setEmail("");
    setTelefono("");
    setAperto(false);
    onFatto();
  };

  return (
    <form onSubmit={salva} className="w-full min-w-0 space-y-2 rounded-md border p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="email" inputMode="email" autoComplete="off" placeholder="Mail" aria-label="Mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="tel" inputMode="tel" autoComplete="off" placeholder="Telefono o WhatsApp" aria-label="Telefono o WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={salvo || (!email.trim() && !telefono.trim())}>
          {salvo && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Salva
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={salvo} onClick={() => setAperto(false)}>Annulla</Button>
      </div>
    </form>
  );
}
