"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Target,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface GeminiAnalysisResult {
  marketingCoherence: {
    summary: string;
    targetAudience: string;
    messagingIssues: string[];
    score: "coerente" | "parzialmente_coerente" | "incoerente";
  };
  topErrors: Array<{
    title: string;
    description: string;
    businessImpact: string;
    suggestion: string;
  }>;
  heygenPrompt: string;
  generatedAt: string;
  model: string;
}

interface GeminiAnalysisCardProps {
  leadId: string;
  auditStatus: string;
  geminiAnalysis: GeminiAnalysisResult | null;
  geminiAnalyzedAt: string | null;
}

const COHERENCE_LABELS = {
  coerente: { label: "Coerente", color: "bg-green-100 text-green-800" },
  parzialmente_coerente: { label: "Parzialmente coerente", color: "bg-yellow-100 text-yellow-800" },
  incoerente: { label: "Incoerente", color: "bg-red-100 text-red-800" },
};

export function GeminiAnalysisCard({
  leadId,
  auditStatus,
  geminiAnalysis,
  geminiAnalyzedAt,
}: GeminiAnalysisCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads/${leadId}/gemini-analysis`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'analisi");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const copyHeygenPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback per browser senza clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Audit non completato
  if (auditStatus !== "COMPLETED") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>Completa prima l&apos;audit per poter generare l&apos;analisi AI.</p>
        </CardContent>
      </Card>
    );
  }

  // Nessuna analisi ancora
  if (!geminiAnalysis) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <Sparkles className="h-8 w-8 mx-auto text-purple-500" />
          <div>
            <p className="font-medium">Analisi AI non ancora generata</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gemini analizzera la coerenza marketing, identifichera 3 errori principali
              e generera un prompt per il video HeyGen.
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Genera Analisi AI
              </>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  // Mostra risultati
  const coherenceConfig = COHERENCE_LABELS[geminiAnalysis.marketingCoherence.score] ||
    COHERENCE_LABELS.parzialmente_coerente;

  return (
    <div className="space-y-4">
      {/* Header con data e rigenera */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Generato {geminiAnalyzedAt ? new Date(geminiAnalyzedAt).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) : ""}
          {" "}con {geminiAnalysis.model}
        </p>
        <Button onClick={runAnalysis} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          Rigenera
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* 1. Coerenza Marketing */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Coerenza Marketing
            </CardTitle>
            <Badge className={coherenceConfig.color}>
              {coherenceConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{geminiAnalysis.marketingCoherence.summary}</p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">TARGET AUDIENCE</p>
            <p className="text-sm">{geminiAnalysis.marketingCoherence.targetAudience}</p>
          </div>
          {geminiAnalysis.marketingCoherence.messagingIssues.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">PROBLEMI DI COMUNICAZIONE</p>
              <ul className="text-sm space-y-1">
                {geminiAnalysis.marketingCoherence.messagingIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">-</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. I 3 Errori Principali */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            3 Errori Principali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {geminiAnalysis.topErrors.map((err, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-lg font-bold text-destructive">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{err.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{err.description}</p>
                </div>
              </div>
              <div className="ml-6 space-y-1">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3 w-3 mt-1 text-red-500 shrink-0" />
                  <p className="text-sm"><span className="font-medium">Impatto:</span> {err.businessImpact}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                  <p className="text-sm"><span className="font-medium">Soluzione:</span> {err.suggestion}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Prompt HeyGen */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Prompt Video HeyGen
            </CardTitle>
            <Button
              onClick={() => copyHeygenPrompt(geminiAnalysis.heygenPrompt)}
              variant="outline"
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3 w-3" />
                  Copia
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {geminiAnalysis.heygenPrompt}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
