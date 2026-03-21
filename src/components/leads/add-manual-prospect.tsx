"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Globe, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function AddManualProspect() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: website.trim(),
          name: name.trim() || undefined,
          category: category.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.error("Lead già esistente", {
          description: "Esiste già un lead con questo sito",
          action: {
            label: "Vai al lead",
            onClick: () => router.push(`/leads/${data.existingId}`),
          },
        });
        return;
      }

      if (!res.ok) throw new Error(data.error);

      toast.success("Prospect aggiunto!", {
        description: `${data.lead.name} — audit in corso...`,
        action: {
          label: "Apri",
          onClick: () => router.push(`/leads/${data.lead.id}`),
        },
      });

      setOpen(false);
      setWebsite("");
      setName("");
      setCategory("");
      router.refresh();
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
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">Aggiungi da URL</span>
          <Plus className="h-3 w-3 md:hidden" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Prospect Manuale</DialogTitle>
          <DialogDescription>
            Inserisci l&apos;URL di un sito interessante. L&apos;audit partirà automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website">URL del sito *</Label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                type="text"
                placeholder="esempio.it"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome azienda (opzionale)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Verrà estratto dal sito se vuoto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria (opzionale)</Label>
            <Input
              id="category"
              type="text"
              placeholder="es. Ristorante, Dentista..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !website.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi e Analizza
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
