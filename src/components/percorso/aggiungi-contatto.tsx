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

function useSalvaContatto(leadId: string, onFatto: () => void) {
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [salvo, setSalvo] = useState(false);
  const salva = async (ev: FormEvent): Promise<boolean> => {
    ev.preventDefault();
    setSalvo(true);
    const r = await fetch(`/api/percorso/${leadId}/contatto`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, telefono }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { esito?: string; soloFisso?: boolean; error?: string } | null;
    setSalvo(false);
    if (!r?.ok) {
      toast.error(d?.error ?? "Non sono riuscito a salvare");
      return false;
    }
    toast.success(d?.soloFisso ? "Numero fisso salvato: su WhatsApp non si può, usa Chiama" : MESSAGGI[d?.esito ?? "salvato"]);
    setEmail("");
    setTelefono("");
    onFatto();
    return true;
  };
  return { email, setEmail, telefono, setTelefono, salvo, salva, vuoto: !email.trim() && !telefono.trim() };
}

/** v3.125.1: nella pagina dell'azienda i contatti si vedono sempre e si scrivono subito, senza aprire niente. */
export function ContattiAzienda({ leadId, persona, email: mailOra, telefono: telOra, onFatto }: { leadId: string; persona: string | null; email: string | null; telefono: string | null; onFatto: () => void }) {
  const f = useSalvaContatto(leadId, onFatto);
  return (
    <form onSubmit={(ev) => void f.salva(ev)} className="mt-4 min-w-0 space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium break-words">Mail e telefono{persona ? ` di ${persona}` : ""}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <div className="text-xs text-muted-foreground break-words">Mail: {mailOra ? <a href={`mailto:${mailOra}`} className="text-foreground underline">{mailOra}</a> : "non c'è ancora"}</div>
          <Input type="email" inputMode="email" autoComplete="off" placeholder={mailOra ? "Scrivi la mail nuova" : "Scrivi la mail"} aria-label="Mail" value={f.email} onChange={(e) => f.setEmail(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-xs text-muted-foreground break-words">Telefono: {telOra ? <a href={`tel:${telOra}`} className="text-foreground underline">{telOra}</a> : "non c'è ancora"}</div>
          <Input type="tel" inputMode="tel" autoComplete="off" placeholder={telOra ? "Scrivi il numero nuovo" : "Scrivi il numero (cellulare = WhatsApp)"} aria-label="Telefono o WhatsApp" value={f.telefono} onChange={(e) => f.setTelefono(e.target.value)} />
        </div>
      </div>
      <Button type="submit" size="sm" className="h-8 text-xs" disabled={f.salvo || f.vuoto}>
        {f.salvo && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Salva
      </Button>
    </form>
  );
}

/** v3.125: mail o telefono trovati dopo (Alessio: "aggiungere o cambiare canale"). Sulle schede del Percorso. */
export function AggiungiContatto({ leadId, onFatto }: { leadId: string; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const f = useSalvaContatto(leadId, onFatto);

  if (!aperto) {
    return (
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAperto(true)}>
        <Plus className="h-3 w-3 mr-1" />Aggiungi mail o telefono
      </Button>
    );
  }

  return (
    <form onSubmit={async (ev) => { if (await f.salva(ev)) setAperto(false); }} className="w-full min-w-0 space-y-2 rounded-md border p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="email" inputMode="email" autoComplete="off" placeholder="Mail" aria-label="Mail" value={f.email} onChange={(e) => f.setEmail(e.target.value)} />
        <Input type="tel" inputMode="tel" autoComplete="off" placeholder="Telefono o WhatsApp" aria-label="Telefono o WhatsApp" value={f.telefono} onChange={(e) => f.setTelefono(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={f.salvo || f.vuoto}>
          {f.salvo && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Salva
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" disabled={f.salvo} onClick={() => setAperto(false)}>Annulla</Button>
      </div>
    </form>
  );
}
