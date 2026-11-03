"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import type { Origine } from "@/lib/vendita/fila";

/**
 * "Mi hanno chiesto informazioni" (v3.93): apre la trattativa al primo passo della fila.
 * Da lì il CRM ricorda di fissare la call se resta ferma.
 */
export function NuovaRichiestaDialog({ variante = "default", onCreata }: { variante?: "default" | "outline"; onCreata?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [origini, setOrigini] = useState<Origine[]>([]);
  const vuoto = { nome: "", referente: "", telefono: "", email: "", origine: "", nota: "" };
  const [form, setForm] = useState(vuoto);
  const set = (k: keyof typeof vuoto, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open || origini.length) return;
    fetch("/api/vendita/config")
      .then((r) => r.json())
      .then((d) => setOrigini(d.origini ?? []))
      .catch(() => {});
  }, [open, origini.length]);

  async function salva() {
    if (!form.nome.trim()) return toast.error("Serve il nome");
    if (!form.origine) return toast.error("Da dove arriva?");
    setSaving(true);
    try {
      const r = await fetch("/api/trattative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          richiesta: true,
          nome: form.nome.trim(),
          origine: form.origine,
          referente: form.referente || undefined,
          telefono: form.telefono || undefined,
          email: form.email || undefined,
          nota: form.nota || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore nel salvataggio");
      toast.success("Richiesta segnata: ti ricordo di fissare la call");
      setOpen(false);
      setForm(vuoto);
      if (onCreata) onCreata();
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
          <MessageSquarePlus className="h-4 w-4 mr-1" /> Nuova richiesta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mi hanno chiesto informazioni</DialogTitle>
          <DialogDescription>La segno e, se non fissi la call, te la ricordo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="nr-nome">Azienda o persona</Label>
            <Input id="nr-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Da dove arriva</Label>
            <div className="flex flex-wrap gap-1.5">
              {origini.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => set("origine", o.id)}
                  className={`text-sm px-3 py-1.5 rounded-md border transition ${form.origine === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-transparent"}`}
                >{o.nome}</button>
              ))}
              {!origini.length && <span className="text-xs text-muted-foreground"><Loader2 className="h-3 w-3 inline mr-1 animate-spin" />Carico…</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nr-ref">Con chi parli</Label>
              <Input id="nr-ref" value={form.referente} onChange={(e) => set("referente", e.target.value)} placeholder="Nome e ruolo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nr-tel">Telefono</Label>
              <Input id="nr-tel" type="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nr-email">Email</Label>
            <Input id="nr-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nr-nota">Cosa gli serve</Label>
            <Textarea id="nr-nota" value={form.nota} onChange={(e) => set("nota", e.target.value)} rows={2} placeholder="Due righe, come te le ha dette" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salva} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Segna la richiesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
