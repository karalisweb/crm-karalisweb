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
  Inbox,
  Phone,
  Search,
  X,
  Globe,
  PhoneMissed,
  PhoneForwarded,
  Calendar,
  UserX,
  Mail,
  CheckCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { PIPELINE_STAGES, LOST_REASONS } from "@/types";

// Mappa stringhe icone -> componenti Lucide
const STAGE_ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  phone: Phone,
  search: Search,
  x: X,
  "globe-off": Globe,
  "phone-missed": PhoneMissed,
  "phone-callback": PhoneForwarded,
  calendar: Calendar,
  "user-x": UserX,
  mail: Mail,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
};

// Gruppi di stati per il menu
const SELECTION_STAGES = ["NEW", "DA_CHIAMARE", "DA_VERIFICARE", "NON_TARGET", "SENZA_SITO"];
const SALES_STAGES = ["NON_RISPONDE", "RICHIAMARE", "CALL_FISSATA", "NON_PRESENTATO", "OFFERTA_INVIATA", "VINTO", "PERSO"];

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
    // Se lo stato è PERSO, mostra dialog per selezionare il motivo
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
      case "emerald": return "default"; // VINTO
      case "red": return "destructive"; // PERSO
      case "rose": return "destructive"; // NON_PRESENTATO
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
          <DropdownMenuLabel>Selezione</DropdownMenuLabel>
          {SELECTION_STAGES.map((stage) => {
            const stageInfo = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES];
            const Icon = stageInfo?.icon ? STAGE_ICONS[stageInfo.icon] : null;
            const isActive = currentStage === stage;
            return (
              <DropdownMenuItem
                key={stage}
                onClick={() => changeStage(stage)}
                disabled={isActive}
                className={isActive ? "bg-accent" : ""}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {stageInfo?.label || stage}
                {isActive && <span className="ml-auto text-xs text-muted-foreground">attuale</span>}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Vendita MSD</DropdownMenuLabel>
          {SALES_STAGES.map((stage) => {
            const stageInfo = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES];
            const Icon = stageInfo?.icon ? STAGE_ICONS[stageInfo.icon] : null;
            const isActive = currentStage === stage;
            return (
              <DropdownMenuItem
                key={stage}
                onClick={() => changeStage(stage)}
                disabled={isActive}
                className={isActive ? "bg-accent" : ""}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {stageInfo?.label || stage}
                {isActive && <span className="ml-auto text-xs text-muted-foreground">attuale</span>}
              </DropdownMenuItem>
            );
          })}
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
