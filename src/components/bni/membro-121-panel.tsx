"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gift, Loader2, Search, Phone, Save, Sparkles, Scale,
  ArrowDownLeft, ArrowUpRight, Info, GitBranch, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { BNI_STAGES, getStage } from "@/lib/bni/bni-stages";

/**
 * MEMO 121 — la schermata da usare AL TAVOLO durante un uno-a-uno.
 *
 * Risolve il problema pratico del Givers Gain: il membro dice "io cerco sindaci di
 * piccoli comuni" e io dovrei ricordarmi, fra centinaia di contatti, chi conosco che
 * corrisponde. A memoria non funziona.
 *
 * Flusso: scrivo cosa cerca -> il CRM propone chi regalargli -> registro cosa ho dato.
 * Mobile-first: si usa col pollice, con poco testo da scrivere.
 */

interface MatchItem {
  kind: "lead" | "membro";
  id: string;
  name: string;
  subtitle: string | null;
  phone: string | null;
  score: number;
  matchedOn: string[];
}

interface ReferralGivenItem {
  id: string;
  contactName: string;
  note: string | null;
  outcome: string;
  givenAt: string;
}

interface Props {
  membroId: string | null;
  membroName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const OUTCOME_LABELS: Record<string, string> = {
  PROPOSTO: "Proposto",
  ACCETTATO: "Accettato",
  CHIUSO: "Ha chiuso",
  NULLA: "Nulla di fatto",
};

export function Membro121Panel({ membroId, membroName, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [seeking, setSeeking] = useState("");
  const [savingSeeking, setSavingSeeking] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [freeQuery, setFreeQuery] = useState("");
  const [given, setGiven] = useState<ReferralGivenItem[]>([]);
  const [reciprocity, setReciprocity] = useState<{ given: number; received: number; balance: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [bniStage, setBniStage] = useState<string>("DA_AVVICINARE");
  const [nextRecallAt, setNextRecallAt] = useState<string>("");
  const [savingStage, setSavingStage] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [last121, setLast121] = useState<string>("");

  const loadMembro = useCallback(async () => {
    if (!membroId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/bni/membri/${membroId}`);
      if (!r.ok) throw new Error("Errore nel caricamento del membro");
      const d = await r.json();
      setSeeking(d.membro?.seeking ?? "");
      setGiven(d.membro?.referralsGiven ?? []);
      setReciprocity(d.reciprocity ?? null);
      setBniStage(d.membro?.bniStage ?? "DA_AVVICINARE");
      setNextRecallAt(d.membro?.nextRecallAt ? String(d.membro.nextRecallAt).slice(0, 10) : "");
      setIsCustomer(!!d.membro?.isCustomer);
      setLast121(d.membro?.lastOneToOneAt ? String(d.membro.lastOneToOneAt).slice(0, 10) : "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, [membroId]);

  const runMatch = useCallback(
    async (q?: string) => {
      if (!membroId) return;
      setMatchLoading(true);
      setHint(null);
      try {
        const params = new URLSearchParams({ membroId });
        if (q?.trim()) params.set("q", q.trim());
        const r = await fetch(`/api/bni/match?${params}`);
        if (!r.ok) throw new Error("Errore nel matching");
        const d = await r.json();
        setMatches(d.matches ?? []);
        setHint(d.hint ?? null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Errore");
      } finally {
        setMatchLoading(false);
      }
    },
    [membroId]
  );

  useEffect(() => {
    if (open && membroId) {
      loadMembro();
      runMatch();
    } else if (!open) {
      setMatches([]);
      setFreeQuery("");
      setHint(null);
    }
  }, [open, membroId, loadMembro, runMatch]);

  async function saveSeeking() {
    if (!membroId) return;
    setSavingSeeking(true);
    try {
      const r = await fetch(`/api/bni/membri/${membroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seeking }),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio");
      toast.success("Salvato — cerco chi puoi regalargli…");
      await runMatch();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSavingSeeking(false);
    }
  }

  async function saveStage(stage: string, recall: string) {
    if (!membroId) return;
    setSavingStage(true);
    try {
      const r = await fetch(`/api/bni/membri/${membroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bniStage: stage,
          // La data di recall ha senso solo nello stadio RECALL.
          nextRecallAt: stage === "RECALL" ? (recall || null) : null,
        }),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio dello stadio");
      toast.success(`Pipeline aggiornata: ${getStage(stage)?.label ?? stage}`);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSavingStage(false);
    }
  }

  async function saveLast121(date: string) {
    if (!membroId) return;
    try {
      const r = await fetch(`/api/bni/membri/${membroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastOneToOneAt: date || null }),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio");
      toast.success("Data del 121 aggiornata");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function toggleCustomer(next: boolean) {
    if (!membroId) return;
    setIsCustomer(next); // ottimistico
    try {
      const r = await fetch(`/api/bni/membri/${membroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCustomer: next }),
      });
      if (!r.ok) throw new Error("Errore nel salvataggio");
      toast.success(next ? "Segnato come tuo cliente" : "Non più segnato come cliente");
      onSaved?.();
    } catch (e) {
      setIsCustomer(!next); // rollback
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function registerGiven(m: MatchItem) {
    if (!membroId) return;
    try {
      const r = await fetch("/api/bni/referral-given", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membroId,
          contactName: m.name,
          contactInfo: m.phone ?? m.subtitle ?? undefined,
          leadId: m.kind === "lead" ? m.id : undefined,
          note: seeking ? `Cercava: ${seeking}` : undefined,
        }),
      });
      if (!r.ok) throw new Error("Errore nella registrazione");
      toast.success(`${m.name} segnalato — referenza registrata`);
      await loadMembro();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-500" />
            Memo 121 — {membroName ?? "Membro"}
          </DialogTitle>
          <DialogDescription>
            Cosa cerca, e chi dei miei contatti posso regalargli.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Carico…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Bilancio della reciprocità */}
            {reciprocity && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="gap-1">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  Dato: {reciprocity.given}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                  Ricevuto: {reciprocity.received}
                </Badge>
                <Badge
                  variant="outline"
                  className={`gap-1 ${
                    reciprocity.balance > 0
                      ? "text-emerald-600 border-emerald-500/40"
                      : reciprocity.balance < 0
                      ? "text-amber-600 border-amber-500/40"
                      : ""
                  }`}
                >
                  <Scale className="h-3 w-3" />
                  {reciprocity.balance > 0
                    ? `In credito (+${reciprocity.balance})`
                    : reciprocity.balance < 0
                    ? `In debito (${reciprocity.balance})`
                    : "In pari"}
                </Badge>
              </div>
            )}

            {/* È già mio cliente? (acquisito, diverso da cliente potenziale) */}
            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomer}
                onChange={(e) => toggleCustomer(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-green-500" />
                È già un mio cliente
              </span>
            </label>

            {/* Pipeline di vendita BNI */}
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                A che punto sei con lui
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {BNI_STAGES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      setBniStage(s.key);
                      saveStage(s.key, nextRecallAt);
                    }}
                    disabled={savingStage}
                    className={`text-xs px-2 py-1 rounded-md border transition ${
                      bniStage === s.key ? s.color + " font-semibold" : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              {getStage(bniStage)?.hint && (
                <p className="text-[11px] text-muted-foreground">{getStage(bniStage)?.hint}</p>
              )}
              {bniStage === "RECALL" && (
                <div className="flex items-center gap-2 pt-1">
                  <Label htmlFor="recall" className="text-xs shrink-0">Ricontatta il</Label>
                  <Input
                    id="recall"
                    type="date"
                    value={nextRecallAt}
                    onChange={(e) => setNextRecallAt(e.target.value)}
                    onBlur={() => saveStage("RECALL", nextRecallAt)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {["FATTO_121", "OFFERTA", "RECALL", "CONSOLIDATO"].includes(bniStage) && (
                <div className="flex items-center gap-2 pt-1">
                  <Label htmlFor="last121" className="text-xs shrink-0">Ultimo 121 il</Label>
                  <Input
                    id="last121"
                    type="date"
                    value={last121}
                    onChange={(e) => setLast121(e.target.value)}
                    onBlur={() => saveLast121(last121)}
                    className="h-8 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">se in passato, correggi la data</span>
                </div>
              )}
            </div>

            {/* Chi cerca */}
            <div className="space-y-2">
              <Label htmlFor="seeking" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Chi cerca (il suo cliente ideale)
              </Label>
              <Textarea
                id="seeking"
                value={seeking}
                onChange={(e) => setSeeking(e.target.value)}
                placeholder="Es. sindaci di piccoli comuni, uffici tecnici comunali, imprese edili con più di 10 dipendenti…"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveSeeking} disabled={savingSeeking}>
                  {savingSeeking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salva e cerca match
                </Button>
                <p className="text-xs text-muted-foreground">
                  È la domanda da fare in ogni 121.
                </p>
              </div>
            </div>

            {/* Ricerca libera */}
            <div className="space-y-2">
              <Label htmlFor="freeq" className="text-xs text-muted-foreground">
                Oppure cerca al volo qualcosa emerso adesso
              </Label>
              <div className="flex gap-2">
                <Input
                  id="freeq"
                  value={freeQuery}
                  onChange={(e) => setFreeQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runMatch(freeQuery)}
                  placeholder="es. hotel Alghero"
                />
                <Button variant="outline" onClick={() => runMatch(freeQuery)} disabled={matchLoading}>
                  {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Match proposti */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-500" />
                Chi posso regalargli
                {matches.length > 0 && <Badge variant="secondary">{matches.length}</Badge>}
              </h4>

              {hint && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{hint}</span>
                </div>
              )}

              {!hint && matches.length === 0 && !matchLoading && (
                <p className="text-xs text-muted-foreground">
                  Nessun contatto corrispondente. Più contatti hai taggati con
                  professione e zona, più questo elenco diventa utile.
                </p>
              )}

              <div className="space-y-2">
                {matches.map((m) => (
                  <div
                    key={`${m.kind}-${m.id}`}
                    className="rounded-lg border p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {m.name}
                        <Badge variant="outline" className="text-[10px]">
                          {m.kind === "lead" ? "lead" : "membro BNI"}
                        </Badge>
                      </div>
                      {m.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">{m.subtitle}</div>
                      )}
                      {m.matchedOn.length > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          match su {m.matchedOn.join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.phone && (
                        <a
                          href={`tel:${m.phone}`}
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                          aria-label="Chiama"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button size="sm" variant="outline" onClick={() => registerGiven(m)}>
                        Segnala
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storico referenze date */}
            {given.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Già segnalati a {membroName}</h4>
                <div className="space-y-1.5">
                  {given.map((g) => (
                    <div
                      key={g.id}
                      className="text-xs flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2"
                    >
                      <span className="truncate">{g.contactName}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {OUTCOME_LABELS[g.outcome] ?? g.outcome}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
