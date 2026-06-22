"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Handshake, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface BniMembroLite {
  id: string;
  name: string;
  company: string | null;
  chapter: string | null;
}

interface Referral {
  name: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  need: string;
}

interface Register121DialogProps {
  membri: BniMembroLite[];
  chapters: string[];
  onSaved?: () => void;
  triggerClassName?: string;
}

const emptyReferral = (): Referral => ({
  name: "",
  company: "",
  phone: "",
  email: "",
  website: "",
  need: "",
});

// Data di oggi in formato YYYY-MM-DD (per input type=date)
function todayStr(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function Register121Dialog({
  membri,
  chapters,
  onSaved,
  triggerClassName,
}: Register121DialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string>(membri.length ? "" : "__new__");
  const [newName, setNewName] = useState("");
  const [newChapter, setNewChapter] = useState("");

  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [memberInterested, setMemberInterested] = useState(false);
  const [interestService, setInterestService] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const isNew = selected === "__new__";
  const validReferrals = referrals.filter((r) => r.name.trim());
  const opportunities = (memberInterested ? 1 : 0) + validReferrals.length;
  const hasMembro = isNew ? newName.trim().length > 0 : selected.length > 0;

  const reset = () => {
    setSelected(membri.length ? "" : "__new__");
    setNewName("");
    setNewChapter("");
    setDate(todayStr());
    setLocation("");
    setNotes("");
    setMemberInterested(false);
    setInterestService("");
    setReferrals([]);
  };

  const updateRef = (i: number, k: keyof Referral, v: string) =>
    setReferrals((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRef = () => setReferrals((rs) => [...rs, emptyReferral()]);
  const removeRef = (i: number) =>
    setReferrals((rs) => rs.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMembro) {
      toast.error("Scegli o crea un membro");
      return;
    }
    setLoading(true);
    try {
      // 1) Membro nuovo → crealo al volo
      let membroId = selected;
      if (isNew) {
        const resM = await fetch("/api/bni/membri", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            chapter: newChapter.trim() || undefined,
          }),
        });
        const dataM = await resM.json();
        if (!resM.ok) throw new Error(dataM.error || "Errore creazione membro");
        membroId = dataM.membro.id;
      }

      // 2) Registra il 121
      const res = await fetch("/api/bni/one-to-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membroId,
          date,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          memberInterested,
          interestService: interestService.trim() || undefined,
          referrals: validReferrals.map((r) => ({
            name: r.name.trim(),
            company: r.company.trim() || undefined,
            phone: r.phone.trim() || undefined,
            email: r.email.trim() || undefined,
            website: r.website.trim() || undefined,
            need: r.need.trim() || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");

      toast.success("121 registrato", {
        description:
          data.leadsCreated > 0
            ? `${data.leadsCreated} ${data.leadsCreated === 1 ? "opportunità creata" : "opportunità create"} nella pipeline`
            : "Nessuna opportunità (relazione coltivata)",
      });
      reset();
      setOpen(false);
      onSaved?.();
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
        <Button size="sm" className={triggerClassName}>
          <Handshake className="h-4 w-4 mr-2" />
          Registra 121
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registra un 121</DialogTitle>
          <DialogDescription>
            Cosa è uscito dall&apos;incontro? Interesse del membro e/o referenze
            diventano opportunità nella pipeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Membro */}
          <div className="space-y-2">
            <Label htmlFor="o-membro">Con chi *</Label>
            <select
              id="o-membro"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {membri.length > 0 && <option value="">Scegli un membro…</option>}
              {membri.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.company ? ` — ${m.company}` : ""}
                  {m.chapter ? ` (${m.chapter})` : ""}
                </option>
              ))}
              <option value="__new__">➕ Nuovo membro…</option>
            </select>
          </div>

          {isNew && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div className="space-y-2">
                <Label htmlFor="o-newname">Nome nuovo membro *</Label>
                <Input
                  id="o-newname"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mario Rossi"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="o-newchapter">Capitolo</Label>
                <Input
                  id="o-newchapter"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  placeholder="es. BNI Cagliari"
                  list="bni-chapters-121"
                  disabled={loading}
                />
                <datalist id="bni-chapters-121">
                  {chapters.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          {/* Data + luogo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="o-date">Data</Label>
              <Input
                id="o-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-loc">Dove</Label>
              <Input
                id="o-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Caffè, ufficio, online…"
                disabled={loading}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="o-notes">Note</Label>
            <Textarea
              id="o-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cosa fa, cosa cerca, come posso aiutarlo, come può aiutarmi…"
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Interesse del membro */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="o-interested" className="cursor-pointer">
                È interessato a un mio servizio?
              </Label>
              <Switch
                id="o-interested"
                checked={memberInterested}
                onCheckedChange={setMemberInterested}
                disabled={loading}
              />
            </div>
            {memberInterested && (
              <Input
                value={interestService}
                onChange={(e) => setInterestService(e.target.value)}
                placeholder="Quale? es. sito nuovo, SEO, campagne ads…"
                disabled={loading}
              />
            )}
          </div>

          {/* Referenze */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Referenze ricevute</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRef}
                disabled={loading}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi
              </Button>
            </div>

            {referrals.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessuna referenza. Aggiungi le persone che il membro ti ha
                presentato.
              </p>
            )}

            {referrals.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3 space-y-2 relative"
              >
                <button
                  type="button"
                  onClick={() => removeRef(i)}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  aria-label="Rimuovi referenza"
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                  <Input
                    value={r.name}
                    onChange={(e) => updateRef(i, "name", e.target.value)}
                    placeholder="Nome persona/azienda *"
                    disabled={loading}
                  />
                  <Input
                    value={r.company}
                    onChange={(e) => updateRef(i, "company", e.target.value)}
                    placeholder="Azienda (se diversa)"
                    disabled={loading}
                  />
                  <Input
                    value={r.phone}
                    onChange={(e) => updateRef(i, "phone", e.target.value)}
                    placeholder="Telefono"
                    disabled={loading}
                  />
                  <Input
                    value={r.email}
                    onChange={(e) => updateRef(i, "email", e.target.value)}
                    placeholder="Email"
                    disabled={loading}
                  />
                  <Input
                    value={r.website}
                    onChange={(e) => updateRef(i, "website", e.target.value)}
                    placeholder="Sito web"
                    disabled={loading}
                  />
                  <Input
                    value={r.need}
                    onChange={(e) => updateRef(i, "need", e.target.value)}
                    placeholder="Di cosa ha bisogno"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <p className="text-xs text-muted-foreground sm:mr-auto self-center">
              {opportunities > 0
                ? `Verranno create ${opportunities} opportunità`
                : "Verrà registrato solo l'incontro"}
            </p>
            <Button type="submit" disabled={loading || !hasMembro}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva 121"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
