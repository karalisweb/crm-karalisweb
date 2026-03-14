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
  Megaphone,
  MonitorPlay,
  StickyNote,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TeleprompterScript {
  atto_1: string;
  atto_2: string;
  atto_3: string;
  atto_4: string;
}

interface GeminiAnalysisResult {
  cliche_found: string;
  primary_error_pattern: string;
  teleprompter_script: TeleprompterScript;
  strategic_note: string;
  has_active_ads: boolean;
  ads_networks_found?: string[];
  generatedAt: string;
  model: string;
  analysisVersion?: string;
}

interface GeminiAnalysisCardProps {
  leadId: string;
  hasWebsite: boolean;
  geminiAnalysis: GeminiAnalysisResult | null;
  geminiAnalyzedAt: string | null;
}

const ATTO_LABELS = [
  { key: "atto_1" as const, label: "ATTO 1", subtitle: "Ghiaccio e Metafora" },
  { key: "atto_2" as const, label: "ATTO 2", subtitle: "La Scena del Crimine" },
  { key: "atto_3" as const, label: "ATTO 3", subtitle: "I Soldi" },
  { key: "atto_4" as const, label: "ATTO 4", subtitle: "La Soluzione" },
];

export function GeminiAnalysisCard({
  leadId,
  hasWebsite,
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

  const copyFullScript = async () => {
    if (!geminiAnalysis) return;
    const script = ATTO_LABELS.map(
      (a) => `[${a.label} - ${a.subtitle}]\n${geminiAnalysis.teleprompter_script[a.key]}`
    ).join("\n\n");

    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Nessun sito web
  if (!hasWebsite) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>Serve un sito web per generare l&apos;analisi strategica.</p>
        </CardContent>
      </Card>
    );
  }

  // Controlla se è il nuovo formato (con teleprompter_script) o vecchio/null
  const isNewFormat =
    geminiAnalysis &&
    typeof geminiAnalysis === "object" &&
    "teleprompter_script" in geminiAnalysis &&
    geminiAnalysis.teleprompter_script &&
    "cliche_found" in geminiAnalysis;

  // Nessuna analisi o formato vecchio → mostra bottone per generare
  if (!geminiAnalysis || !isNewFormat) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <MonitorPlay className="h-8 w-8 mx-auto text-purple-500" />
          <div>
            <p className="font-medium">
              {geminiAnalysis && !isNewFormat
                ? "Analisi precedente (formato legacy) — Rigenera per il nuovo Teleprompter"
                : "Analisi Strategica non ancora generata"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Gemini analizzerà il posizionamento del sito e genererà
              un copione per il teleprompter in 4 atti.
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
                {geminiAnalysis && !isNewFormat
                  ? "Rigenera Analisi Strategica"
                  : "Genera Analisi Strategica"}
              </>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  // === TELEPROMPTER MODE ===
  return (
    <div className="space-y-4">
      {/* Header con badge Ads + data + rigenera */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Badge Ads */}
          {geminiAnalysis.has_active_ads ? (
            <Badge className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1">
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              Fanno Ads!
              {geminiAnalysis.ads_networks_found && geminiAnalysis.ads_networks_found.length > 0 && (
                <span className="ml-1 opacity-80">
                  ({geminiAnalysis.ads_networks_found.join(", ")})
                </span>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Megaphone className="mr-1.5 h-3.5 w-3.5 opacity-50" />
              Niente Ads
            </Badge>
          )}
          {/* Badge Pattern Errore */}
          {geminiAnalysis.primary_error_pattern && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-red-500/30 text-red-400">
              {geminiAnalysis.primary_error_pattern}
            </Badge>
          )}
          {geminiAnalysis.analysisVersion && (
            <Badge variant="outline" className="text-sm px-2 py-0.5 border-blue-500/40 text-blue-400 font-mono">
              v{geminiAnalysis.analysisVersion}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">
            {geminiAnalyzedAt
              ? new Date(geminiAnalyzedAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={copyFullScript}
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
                Copia copione
              </>
            )}
          </Button>
          <Button
            onClick={runAnalysis}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3 w-3" />
            )}
            Rigenera
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Frase Cliché trovata */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs font-medium text-amber-400 mb-1 uppercase tracking-wide">
            Frase Cliché Trovata
          </p>
          <p className="text-lg font-medium italic">
            &ldquo;{geminiAnalysis.cliche_found}&rdquo;
          </p>
        </CardContent>
      </Card>

      {/* 4 Atti del Teleprompter - Font grande per lettura da schermo */}
      {ATTO_LABELS.map((atto, index) => (
        <Card key={atto.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              {atto.label}
              <span className="text-muted-foreground font-normal">
                — {atto.subtitle}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl leading-relaxed font-light">
              {geminiAnalysis.teleprompter_script[atto.key]}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Nota strategica interna (collassata, per Alessio) */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <StickyNote className="h-4 w-4" />
            Nota Strategica (interna)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {geminiAnalysis.strategic_note}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
