"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle, Circle } from "lucide-react";
import { useRouter } from "next/navigation";

interface AuditButtonProps {
  leadId: string;
  auditStatus: string;
}

interface AuditStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  details?: Record<string, unknown>;
}

const AUDIT_STEPS: { id: string; label: string }[] = [
  { id: "init", label: "Inizializzazione" },
  { id: "fetch", label: "Download pagina" },
  { id: "seo", label: "Analisi SEO" },
  { id: "blog", label: "Ricerca blog" },
  { id: "tracking", label: "Rilevamento tracking" },
  { id: "social", label: "Link social" },
  { id: "trust", label: "Trust & compliance" },
  { id: "email", label: "Email marketing" },
  { id: "tech", label: "Tech stack" },
  { id: "pagespeed", label: "PageSpeed Insights" },
  { id: "score", label: "Calcolo score" },
  { id: "save", label: "Salvataggio" },
];

export function AuditButton({ leadId, auditStatus }: AuditButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AuditStep[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const router = useRouter();

  const runAudit = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setFinalScore(null);
    setSteps(AUDIT_STEPS.map((s) => ({ ...s, status: "pending" as const })));

    try {
      const response = await fetch(`/api/audit/stream?leadId=${leadId}`);

      if (!response.ok) {
        throw new Error("Errore avvio audit");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream non disponibile");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              const { step, status, data } = event;

              // Aggiorna messaggio corrente
              if (data?.message) {
                setCurrentMessage(data.message);
              }

              // Aggiorna stato dello step
              setSteps((prev) =>
                prev.map((s) => {
                  if (s.id === step) {
                    return { ...s, status, details: data };
                  }
                  return s;
                })
              );

              // Se completato, salva score
              if (step === "complete" && data?.score !== undefined) {
                setFinalScore(data.score);
              }

              // Se errore
              if (status === "error") {
                setError(data?.message || "Errore durante l'audit");
              }
            } catch {
              // Ignora errori di parsing
            }
          }
        }
      }

      // Refresh pagina dopo completamento
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsRunning(false);
    }
  }, [leadId, router]);

  // Se l'audit e' in corso (stato dal DB, non locale)
  if (auditStatus === "RUNNING" && !isRunning) {
    return (
      <Button disabled className="mt-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Audit in corso...
      </Button>
    );
  }

  // Mostra progresso se in esecuzione
  if (isRunning || steps.length > 0) {
    const completedSteps = steps.filter((s) => s.status === "done").length;
    const totalSteps = steps.length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return (
      <Card className="mt-4">
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Header con progresso */}
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {finalScore !== null ? (
                  <span className="text-green-600">
                    Audit completato! Score: {finalScore}/100
                  </span>
                ) : (
                  "Audit in corso..."
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {progressPercent}%
              </span>
            </div>

            {/* Barra progresso */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Messaggio corrente */}
            {currentMessage && (
              <p className="text-sm text-muted-foreground animate-pulse">
                {currentMessage}
              </p>
            )}

            {/* Lista step */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-1.5">
                  {step.status === "pending" && (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                  {step.status === "running" && (
                    <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  )}
                  {step.status === "done" && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                  {step.status === "error" && (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={
                      step.status === "done"
                        ? "text-green-600"
                        : step.status === "running"
                        ? "text-primary font-medium"
                        : step.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Errore */}
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}

            {/* Bottone retry se errore */}
            {error && !isRunning && (
              <Button onClick={runAudit} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-3 w-3" />
                Riprova
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se l'audit e' fallito, permetti di riprovare
  if (auditStatus === "FAILED") {
    return (
      <div className="mt-4 space-y-2">
        <Button onClick={runAudit} disabled={isRunning} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Riprova Audit
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Stato PENDING - mostra bottone per avviare
  return (
    <div className="mt-4 space-y-2">
      <Button onClick={runAudit} disabled={isRunning}>
        <Play className="mr-2 h-4 w-4" />
        Avvia Audit
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
