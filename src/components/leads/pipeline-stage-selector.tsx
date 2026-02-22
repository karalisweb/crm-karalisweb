"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronDown,
  Loader2,
} from "lucide-react";
import { PIPELINE_STAGES, LOST_REASONS } from "@/types";

// Gruppi di stati per il menu dropdown
const STAGE_GROUPS = [
  {
    label: "Qualificazione",
    stages: ["NUOVO", "DA_QUALIFICARE", "QUALIFICATO"],
  },
  {
    label: "Outreach",
    stages: ["VIDEO_DA_FARE", "VIDEO_INVIATO", "LETTERA_INVIATA", "FOLLOW_UP_LINKEDIN"],
  },
  {
    label: "Vendita",
    stages: ["RISPOSTO", "CALL_FISSATA", "IN_CONVERSAZIONE", "PROPOSTA_INVIATA", "VINTO", "PERSO"],
  },
  {
    label: "Archivio",
    stages: ["DA_RICHIAMARE_6M", "RICICLATO", "NON_TARGET", "SENZA_SITO"],
  },
];

interface PipelineStageSelectorProps {
  leadId: string;
  currentStage: string;
  lostReason?: string | null;
  lostReasonNotes?: string | null;
}

export function PipelineStageSelector({
  leadId,
  currentStage,
  lostReason,
  lostReasonNotes,
}: PipelineStageSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState(lostReason || "");
  const [lostNotes, setLostNotes] = useState(lostReasonNotes || "");

  const currentStageInfo = PIPELINE_STAGES[currentStage as keyof typeof PIPELINE_STAGES];

  async function changeStage(newStage: string) {
    if (newStage === "PERSO") {
      setShowLostDialog(true);
      return;
    }
    await updateLeadStage(newStage);
  }

  async function updateLeadStage(newStage: string, lostReasonValue?: string, notes?: string) {
    setLoading(true);
    try {
      const body: Record<string, string | undefined> = { pipelineStage: newStage };

      if (newStage === "PERSO" && lostReasonValue) {
        body.lostReason = lostReasonValue;
        body.lostReasonNotes = notes;
      }

      // For DA_RICHIAMARE_6M, set recontactAt to +6 months
      if (newStage === "DA_RICHIAMARE_6M") {
        const recontactDate = new Date();
        recontactDate.setMonth(recontactDate.getMonth() + 6);
        body.recontactAt = recontactDate.toISOString();
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const stageLabel = PIPELINE_STAGES[newStage as keyof typeof PIPELINE_STAGES]?.label || newStage;
        toast.success(`Stato aggiornato: ${stageLabel}`);
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nell'aggiornamento");
      }
    } catch {
      toast.error("Errore nell'aggiornamento");
    } finally {
      setLoading(false);
    }
  }

  async function handleLostConfirm() {
    if (!selectedLostReason) {
      toast.error("Seleziona un motivo");
      return;
    }
    await updateLeadStage("PERSO", selectedLostReason, lostNotes);
    setShowLostDialog(false);
  }

  function getStageVariant(stageKey: string): "default" | "secondary" | "destructive" | "outline" {
    const stage = PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
    if (!stage) return "secondary";

    switch (stage.color) {
      case "emerald": return "default";
      case "red": return "destructive";
      default: return "secondary";
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Badge variant={getStageVariant(currentStage)}>
                  {currentStageInfo?.label || currentStage}
                </Badge>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {STAGE_GROUPS.map((group, idx) => (
            <div key={group.label}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.stages.map((stage) => {
                const stageInfo = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES];
                const isActive = currentStage === stage;
                return (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => changeStage(stage)}
                    disabled={isActive}
                    className={isActive ? "bg-accent" : ""}
                  >
                    {stageInfo?.label || stage}
                    {isActive && <span className="ml-auto text-xs text-muted-foreground">attuale</span>}
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog per selezionare motivo perso */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo della perdita</DialogTitle>
            <DialogDescription>
              Seleziona il motivo per cui questo lead non ha convertito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={selectedLostReason} onValueChange={setSelectedLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOST_REASONS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                placeholder="Dettagli aggiuntivi sul motivo..."
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleLostConfirm} disabled={loading || !selectedLostReason}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
