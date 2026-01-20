"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  ThumbsUp,
  ThumbsDown,
  Clock,
  PhoneOff,
  PhoneMissed,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// Configurazione esiti
const OUTCOMES = [
  { value: "INTERESTED", label: "Interessato", icon: ThumbsUp, color: "text-green-500" },
  { value: "CALLBACK", label: "Richiamare", icon: Clock, color: "text-blue-500" },
  { value: "NO_ANSWER", label: "Non risponde", icon: PhoneMissed, color: "text-yellow-500" },
  { value: "NOT_INTERESTED", label: "Non interessato", icon: ThumbsDown, color: "text-red-500" },
  { value: "BUSY", label: "Occupato", icon: PhoneOff, color: "text-orange-500" },
];

// Configurazione obiezioni
const OBJECTIONS = [
  { value: "BUDGET", label: "Non abbiamo budget" },
  { value: "TIMING", label: "Non e' il momento" },
  { value: "ALREADY_HAVE", label: "Abbiamo gia qualcuno" },
  { value: "NOT_INTERESTED", label: "Non ci interessa" },
  { value: "NEED_TO_THINK", label: "Devo pensarci" },
  { value: "DECISION_MAKER", label: "Devo parlare con..." },
  { value: "BAD_EXPERIENCE", label: "Brutte esperienze" },
  { value: "NO_NEED", label: "Non ne abbiamo bisogno" },
  { value: "OTHER", label: "Altro" },
];

// Configurazione next step
const NEXT_STEPS = [
  { value: "CALLBACK", label: "Richiamare" },
  { value: "SEND_INFO", label: "Inviare info" },
  { value: "MEETING", label: "Fissare meeting" },
  { value: "PROPOSAL", label: "Inviare preventivo" },
  { value: "WAIT", label: "Aspettare" },
  { value: "CLOSE", label: "Chiudere" },
];

interface QuickCallLoggerProps {
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export function QuickCallLogger({ leadId, leadName, onSuccess }: QuickCallLoggerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<string>("");
  const [objection, setObjection] = useState<string>("");
  const [nextStep, setNextStep] = useState<string>("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!outcome) {
      toast.error("Seleziona un esito");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          objection: objection || undefined,
          nextStep: nextStep || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio");

      toast.success("Chiamata registrata");
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOutcome("");
    setObjection("");
    setNextStep("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Phone className="h-4 w-4 mr-2" />
          Log chiamata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registra chiamata</DialogTitle>
          <p className="text-sm text-muted-foreground">{leadName}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Esito (obbligatorio) */}
          <div>
            <Label className="text-sm font-medium">Esito *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {OUTCOMES.map((o) => {
                const Icon = o.icon;
                return (
                  <Button
                    key={o.value}
                    type="button"
                    variant={outcome === o.value ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => setOutcome(o.value)}
                  >
                    <Icon className={`h-4 w-4 mr-2 ${outcome === o.value ? "" : o.color}`} />
                    {o.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Obiezione (se non interessato o callback) */}
          {(outcome === "NOT_INTERESTED" || outcome === "CALLBACK") && (
            <div>
              <Label className="text-sm font-medium">Obiezione</Label>
              <Select value={objection} onValueChange={setObjection}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Seleziona obiezione..." />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Next step (se callback o interessato) */}
          {(outcome === "CALLBACK" || outcome === "INTERESTED") && (
            <div>
              <Label className="text-sm font-medium">Prossimo passo</Label>
              <Select value={nextStep} onValueChange={setNextStep}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Seleziona next step..." />
                </SelectTrigger>
                <SelectContent>
                  {NEXT_STEPS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note (opzionale) */}
          <div>
            <Label className="text-sm font-medium">Note (opzionale)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Appunti veloci..."
              className="mt-2"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || !outcome}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Versione inline per la card del lead (ancora piu' veloce)
 */
export function QuickCallButtons({
  leadId,
  onSuccess,
}: {
  leadId: string;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const quickLog = async (outcome: string) => {
    setLoading(outcome);
    try {
      const res = await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });

      if (!res.ok) throw new Error("Errore");

      toast.success(
        outcome === "INTERESTED"
          ? "Interessato!"
          : outcome === "CALLBACK"
          ? "Da richiamare"
          : outcome === "NO_ANSWER"
          ? "Non risponde"
          : "Registrato"
      );
      onSuccess?.();
    } catch {
      toast.error("Errore");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => quickLog("INTERESTED")}
        disabled={!!loading}
        title="Interessato"
      >
        {loading === "INTERESTED" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className="h-4 w-4 text-green-500" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => quickLog("CALLBACK")}
        disabled={!!loading}
        title="Richiamare"
      >
        {loading === "CALLBACK" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 text-blue-500" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => quickLog("NO_ANSWER")}
        disabled={!!loading}
        title="Non risponde"
      >
        {loading === "NO_ANSWER" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PhoneMissed className="h-4 w-4 text-yellow-500" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => quickLog("NOT_INTERESTED")}
        disabled={!!loading}
        title="Non interessato"
      >
        {loading === "NOT_INTERESTED" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-500" />
        )}
      </Button>
    </div>
  );
}
