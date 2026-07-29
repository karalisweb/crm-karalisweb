"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OPP_SOURCES } from "@/lib/opportunita-stages";

/**
 * Aggiunta rapida di un'opportunita' extra-BNI (collega, referral, preventivo…).
 * Solo il nome e' obbligatorio: dev'essere veloce da buttare dentro per non dimenticare.
 */
export function AddOpportunitaDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", source: "collega", sourceDetail: "", phone: "", email: "",
    website: "", about: "", nextFollowupAt: "", estimatedValue: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function reset() {
    setForm({ name: "", source: "collega", sourceDetail: "", phone: "", email: "", website: "", about: "", nextFollowupAt: "", estimatedValue: "" });
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Serve almeno il nome");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/opportunita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          source: form.source,
          sourceDetail: form.sourceDetail || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          website: form.website || undefined,
          about: form.about || undefined,
          nextFollowupAt: form.nextFollowupAt || null,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
        }),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio");
      toast.success("Opportunità aggiunta");
      setOpen(false);
      reset();
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nuova opportunità
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova opportunità</DialogTitle>
          <DialogDescription>Un contatto caldo da fuori BNI, da non dimenticare.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="opp-name">Nome *</Label>
            <Input id="opp-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Persona o azienda" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="opp-source">Come è arrivato</Label>
              <select
                id="opp-source"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                {OPP_SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-sd">Chi/dove (opz.)</Label>
              <Input id="opp-sd" value={form.sourceDetail} onChange={(e) => set("sourceDetail", e.target.value)} placeholder="es. passato da Marco" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opp-about">Di cosa si tratta</Label>
            <Textarea id="opp-about" rows={2} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="es. possibile collaborazione su progetti web / preventivo restyling" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="opp-phone">Telefono</Label>
              <Input id="opp-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-email">Email</Label>
              <Input id="opp-email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="opp-follow">Promemoria (risentire il)</Label>
              <Input id="opp-follow" type="date" value={form.nextFollowupAt} onChange={(e) => set("nextFollowupAt", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-value">Valore stimato € (opz.)</Label>
              <Input id="opp-value" type="number" min={0} value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
