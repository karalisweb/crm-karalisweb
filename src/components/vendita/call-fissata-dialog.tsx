"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarCheck, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ORIGINI, type Origine } from "@/lib/vendita/regole";

/** Data e ora locali (input datetime-local) → ISO con il fuso del browser. */
export function localeAIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  /** Collegamento: da dove nasce la trattativa. Senza collegamento si chiede il nome. */
  leadId?: string;
  bniMembroId?: string;
  opportunitaId?: string;
  nome?: string;
  origine?: Origine;
  /** Voce di cassetta da chiudere (scheda contatto). */
  daVoce?: string;
  /** Pulsante "Nuova trattativa" invece di "Call fissata". */
  nuova?: boolean;
  variante?: "default" | "outline";
  onCreata?: (id: string) => void;
}

/**
 * Apre una trattativa: "ho fissato una call". Basta la data; nome, telefono ed email
 * vengono dall'azienda, dal membro BNI o dall'opportunità collegata.
 */
export function CallFissataDialog({ leadId, bniMembroId, opportunitaId, nome, origine, daVoce, nuova, variante = "default", onCreata }: Props) {
  const router = useRouter();
  const collegata = !!(leadId || bniMembroId || opportunitaId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: nome ?? "", origine: origine ?? (collegata ? "squadra" : "passaparola"), callAt: "", referente: "", telefono: "", email: "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function salva() {
    if (!collegata && !form.nome.trim()) {
      toast.error("Serve il nome");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/trattative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome || undefined,
          origine: form.origine,
          leadId,
          bniMembroId,
          opportunitaId,
          daVoce,
          callAt: localeAIso(form.callAt),
          referente: form.referente || undefined,
          telefono: form.telefono || undefined,
          email: form.email || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore nel salvataggio");
      toast.success("Trattativa aperta");
      setOpen(false);
      if (onCreata) onCreata(d.trattativa.id);
      else router.push(`/trattative/${d.trattativa.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variante}>
          {nuova ? <Plus className="h-4 w-4 mr-1" /> : <CalendarCheck className="h-4 w-4 mr-1" />}
          {nuova ? "Nuova trattativa" : "Call fissata"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{nuova ? "Nuova trattativa" : `Call fissata${nome ? ` con ${nome}` : ""}`}</DialogTitle>
          <DialogDescription>Si apre la trattativa: il giorno prima della call trovi in Cassetta la preparazione.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!collegata && (
            <div className="space-y-1">
              <Label htmlFor="cf-nome">Azienda o persona</Label>
              <Input id="cf-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="cf-call">Data e ora della call</Label>
            <Input id="cf-call" type="datetime-local" value={form.callAt} onChange={(e) => set("callAt", e.target.value)} />
          </div>
          {!collegata && (
            <div className="space-y-1">
              <Label htmlFor="cf-origine">Da dove arriva</Label>
              <select id="cf-origine" value={form.origine} onChange={(e) => set("origine", e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {Object.entries(ORIGINI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cf-ref">Con chi parli</Label>
              <Input id="cf-ref" value={form.referente} onChange={(e) => set("referente", e.target.value)} placeholder="Nome e ruolo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cf-tel">Telefono</Label>
              <Input id="cf-tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salva} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Apri la trattativa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
