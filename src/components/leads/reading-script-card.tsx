"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Copy,
  Check,
  FileText,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";

interface ReadingScriptCardProps {
  leadId: string;
  leadName: string;
  hasGeminiAnalysis: boolean;
  existingScript: string | null;
}

export function ReadingScriptCard({
  leadId,
  leadName,
  hasGeminiAnalysis,
  existingScript,
}: ReadingScriptCardProps) {
  const [script, setScript] = useState(existingScript || "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!!existingScript);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const generateScript = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reading-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setScript(data.script);
      setExpanded(true);
      toast.success("Script di lettura generato!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nella generazione");
    } finally {
      setLoading(false);
    }
  }, [leadId, customInstructions]);

  const copyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Script copiato!");
  }, [script]);

  if (!hasGeminiAnalysis) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Script di Lettura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Genera prima l&apos;analisi strategica (Gemini) per creare lo script di lettura.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Script di Lettura
          {script && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 w-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Istruzioni personalizzate (toggle) */}
        {!script && (
          <div className="space-y-2">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showInstructions ? "Nascondi" : "Aggiungi"} istruzioni personalizzate
            </button>
            {showInstructions && (
              <div className="space-y-1.5">
                <Label className="text-xs">Istruzioni aggiuntive (opzionale)</Label>
                <Input
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder='es. "Usa metafora del ristorante", "Tono più aggressivo"...'
                  className="text-sm h-8"
                />
              </div>
            )}
          </div>
        )}

        {/* Genera / Rigenera */}
        {!script ? (
          <Button
            onClick={generateScript}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Genera Script di Lettura
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Script generato */}
            {expanded && (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {script}
                </div>

                {/* Editing diretto */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Modifica manualmente
                  </summary>
                  <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={10}
                    className="mt-2 text-sm"
                  />
                </details>

                {/* Istruzioni per rigenerazione */}
                <div className="space-y-1.5">
                  <Input
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Istruzioni per rigenerazione..."
                    className="text-sm h-8"
                  />
                </div>
              </div>
            )}

            {/* Azioni */}
            <div className="flex gap-2">
              <Button
                onClick={copyScript}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1.5" />
                ) : (
                  <Copy className="h-4 w-4 mr-1.5" />
                )}
                {copied ? "Copiato!" : "Copia Script"}
              </Button>
              <Button
                onClick={generateScript}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
