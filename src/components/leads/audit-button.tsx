"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface AuditButtonProps {
  leadId: string;
  auditStatus: string;
}

export function AuditButton({ leadId, auditStatus }: AuditButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAudit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'avvio dell'audit");
      }

      // Refresh della pagina per vedere lo stato aggiornato
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  // Se l'audit e' in corso, mostra lo stato
  if (auditStatus === "RUNNING") {
    return (
      <Button disabled className="mt-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Audit in corso...
      </Button>
    );
  }

  // Se l'audit e' fallito, permetti di riprovare
  if (auditStatus === "FAILED") {
    return (
      <div className="mt-4 space-y-2">
        <Button onClick={handleAudit} disabled={isLoading} variant="outline">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Avvio audit...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Riprova Audit
            </>
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Stato PENDING - mostra bottone per avviare
  return (
    <div className="mt-4 space-y-2">
      <Button onClick={handleAudit} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Avvio audit...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Avvia Audit
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
