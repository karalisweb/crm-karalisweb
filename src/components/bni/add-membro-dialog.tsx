"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddMembroDialogProps {
  chapters: string[];
  onCreated?: () => void;
}

export function AddMembroDialog({ chapters, onCreated }: AddMembroDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    profession: "",
    company: "",
    chapter: "",
    phone: "",
    email: "",
    website: "",
    notes: "",
    status: "ATTIVO",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bni/membri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");

      toast.success("Membro aggiunto", { description: data.membro.name });
      setForm({
        name: "",
        profession: "",
        company: "",
        chapter: "",
        phone: "",
        email: "",
        website: "",
        notes: "",
        status: "ATTIVO",
      });
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast.error("Errore", {
        description: err instanceof Error ? err.message : "Errore sconosciuto",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Aggiungi membro</span>
          <span className="sm:hidden">Membro</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo membro BNI</DialogTitle>
          <DialogDescription>
            Una persona della tua rete BNI con cui fai (o farai) un 121.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Nome e cognome *</Label>
            <Input
              id="m-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Mario Rossi"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-profession">Professione</Label>
              <Input
                id="m-profession"
                value={form.profession}
                onChange={(e) => set("profession", e.target.value)}
                placeholder="Commercialista"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-company">Azienda</Label>
              <Input
                id="m-company"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Studio Rossi"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-chapter">Capitolo</Label>
              <Input
                id="m-chapter"
                value={form.chapter}
                onChange={(e) => set("chapter", e.target.value)}
                placeholder="es. BNI Cagliari"
                list="bni-chapters"
                disabled={loading}
              />
              <datalist id="bni-chapters">
                {chapters.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-status">Stato</Label>
              <select
                id="m-status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ATTIVO">Membro attivo</option>
                <option value="VISITATORE">Visitatore / ospite</option>
                <option value="EX_MEMBRO">Ex membro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-phone">Telefono</Label>
              <Input
                id="m-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+39 ..."
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="mario@studio.it"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-website">Sito web</Label>
            <Input
              id="m-website"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="studiorossi.it"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-notes">Note</Label>
            <Textarea
              id="m-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Cosa fa, cosa cerca, contatti utili..."
              rows={2}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !form.name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Aggiungi membro"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
