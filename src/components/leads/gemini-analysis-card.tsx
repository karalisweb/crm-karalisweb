"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Megaphone,
  MonitorPlay,
  StickyNote,
  Crosshair,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  AlertTriangle,
  PenLine,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TeleprompterScript {
  atto_1: string;
  atto_2: string;
  atto_3: string;
  atto_4: string;
  atto_5?: string;
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

interface EvidenceData {
  cliche_status: "PASS" | "FAIL" | "ERROR";
  cliches_found: Array<{ phrase: string; tag: string; context: string }>;
  tracking_tools: string[];
  ads_status: "CONFIRMED" | "NOT_FOUND" | "API_ERROR" | "PENDING";
  home_text_length: number;
  about_text_length: number;
  services_text_length: number;
}

interface GeminiAnalysisCardProps {
  leadId: string;
  hasWebsite: boolean;
  geminiAnalysis: GeminiAnalysisResult | null;
  geminiAnalyzedAt: string | null;
  adsCheckedAt?: string | null;
  googleAdsCopy?: string | null;
  metaAdsCopy?: string | null;
}

const ATTO_LABELS = [
  { key: "atto_1" as const, label: "ATTO 1", subtitle: "Introduzione" },
  { key: "atto_2" as const, label: "ATTO 2", subtitle: "La Scena del Crimine" },
  { key: "atto_3" as const, label: "ATTO 3", subtitle: "I Soldi" },
  { key: "atto_4" as const, label: "ATTO 4", subtitle: "La Soluzione" },
  { key: "atto_5" as const, label: "ATTO 5", subtitle: "Chiusura e Contatto" },
];

export function GeminiAnalysisCard({
  leadId,
  hasWebsite,
  geminiAnalysis,
  geminiAnalyzedAt,
  adsCheckedAt,
  googleAdsCopy,
  metaAdsCopy,
}: GeminiAnalysisCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrecisionLoading, setIsPrecisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceData | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [manualTexts, setManualTexts] = useState({
    home_text: "",
    about_text: "",
    services_text: "",
  });
  const [lastScrapeError, setLastScrapeError] = useState<string | null>(null);
  const router = useRouter();

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setLastScrapeError(null);

    try {
      const body: Record<string, unknown> = {};
      if (manualOverride) {
        // Valida che almeno home_text abbia contenuto
        if (manualTexts.home_text.trim().length < 20) {
          setError("Il testo homepage deve essere almeno 20 caratteri.");
          setIsLoading(false);
          return;
        }
        body.manualOverride = {
          home_text: manualTexts.home_text.trim(),
          about_text: manualTexts.about_text.trim() || undefined,
          services_text: manualTexts.services_text.trim() || undefined,
        };
      }

      const response = await fetch(`/api/leads/${leadId}/gemini-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.manual_check_required) {
          setLastScrapeError(data.error);
          setManualOverride(true);
          setError(`Scraping fallito: ${data.error}. Usa l'override manuale.`);
        } else {
          throw new Error(data.error || "Errore nell'analisi");
        }
        return;
      }

      // Salva evidence dalla response
      if (data.evidence) {
        setEvidence(data.evidence);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const runPrecisionCorrector = async () => {
    setIsPrecisionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads/${leadId}/gemini-precision`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore precisione");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsPrecisionLoading(false);
    }
  };

  // Mostra bottone "Inietta Dati Ads" solo se: analisi esiste + ads checked + dati ads presenti
  const canInjectAds =
    geminiAnalysis &&
    adsCheckedAt &&
    (googleAdsCopy || metaAdsCopy) &&
    geminiAnalysis.analysisVersion !== "precision-v1";

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

  // Hard Lock: il bottone è disabilitato se non c'è un sito E non c'è override manuale con testo sufficiente
  const canGenerate = manualOverride
    ? manualTexts.home_text.trim().length >= 20
    : hasWebsite;

  // Nessun sito web E nessun override manuale
  if (!hasWebsite && !manualOverride) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <Sparkles className="h-8 w-8 mx-auto opacity-30" />
          <p className="text-muted-foreground">
            Serve un sito web per generare l&apos;analisi strategica.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Switch
              id="manual-override-no-site"
              checked={manualOverride}
              onCheckedChange={setManualOverride}
            />
            <Label htmlFor="manual-override-no-site" className="text-sm cursor-pointer">
              Override Manuale (inserisci testi a mano)
            </Label>
          </div>
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

  // Nessuna analisi o formato vecchio → mostra bottone per generare + Evidence Box
  if (!geminiAnalysis || !isNewFormat) {
    return (
      <div className="space-y-4">
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
                MSD Engine v3.1 — Analisi deterministica con evidence box.
              </p>
            </div>

            {/* Manual Override Toggle */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Switch
                id="manual-override"
                checked={manualOverride}
                onCheckedChange={setManualOverride}
              />
              <Label htmlFor="manual-override" className="text-sm cursor-pointer flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                Override Manuale
              </Label>
            </div>

            {lastScrapeError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                {lastScrapeError}
              </div>
            )}

            {/* Manual Override Textareas */}
            {manualOverride && (
              <div className="text-left space-y-3 pt-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Testo Homepage (obbligatorio, min 20 caratteri)
                  </Label>
                  <Textarea
                    placeholder="Incolla qui il testo della homepage del sito..."
                    value={manualTexts.home_text}
                    onChange={(e) => setManualTexts(prev => ({ ...prev, home_text: e.target.value }))}
                    rows={5}
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {manualTexts.home_text.length} caratteri
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Testo Chi Siamo (opzionale)
                  </Label>
                  <Textarea
                    placeholder="Incolla qui il testo della pagina Chi Siamo..."
                    value={manualTexts.about_text}
                    onChange={(e) => setManualTexts(prev => ({ ...prev, about_text: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Testo Servizi (opzionale)
                  </Label>
                  <Textarea
                    placeholder="Incolla qui il testo della pagina Servizi..."
                    value={manualTexts.services_text}
                    onChange={(e) => setManualTexts(prev => ({ ...prev, services_text: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <Button onClick={runAnalysis} disabled={isLoading || !canGenerate}>
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
                    : manualOverride
                    ? "Genera con Testi Manuali"
                    : "Genera Analisi Strategica"}
                </>
              )}
            </Button>
            {!canGenerate && !isLoading && (
              <p className="text-xs text-amber-400">
                {manualOverride
                  ? "Inserisci almeno 20 caratteri nel campo Homepage per sbloccare."
                  : "Serve un sito web o attiva l'override manuale."}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Evidence Box (mostrato dopo prima analisi, anche se fallita) */}
        {evidence && <EvidenceBox evidence={evidence} />}
      </div>
    );
  }

  // === TELEPROMPTER MODE ===
  return (
    <div className="space-y-4">
      {/* Evidence Box — mostra sempre i dati estratti */}
      {evidence && <EvidenceBox evidence={evidence} />}

      {/* Header con badge versione + data + azioni */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge Versione */}
          {geminiAnalysis.analysisVersion && (
            <Badge variant="outline" className="text-sm px-2 py-0.5 border-blue-500/40 text-blue-400 font-mono">
              v{geminiAnalysis.analysisVersion}
            </Badge>
          )}
          {/* Badge Pattern Errore */}
          {geminiAnalysis.primary_error_pattern && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-red-500/30 text-red-400">
              {geminiAnalysis.primary_error_pattern}
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
        <div className="flex items-center gap-2 flex-wrap">
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
          {canInjectAds && (
            <Button
              onClick={runPrecisionCorrector}
              variant="default"
              size="sm"
              disabled={isPrecisionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPrecisionLoading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Crosshair className="mr-2 h-3 w-3" />
              )}
              Inietta Dati Ads
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Frase Cliché trovata */}
      {geminiAnalysis.cliche_found && geminiAnalysis.cliche_found !== "NESSUNA_CLICHE_TROVATA" && (
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
      )}

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

      {/* Nota strategica interna (per Alessio) */}
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

// ==========================================
// EVIDENCE BOX — Mostra dati estratti deterministically
// ==========================================

function EvidenceBox({ evidence }: { evidence: EvidenceData }) {
  const clicheIcon =
    evidence.cliche_status === "PASS" ? (
      <ShieldCheck className="h-4 w-4 text-green-500" />
    ) : evidence.cliche_status === "FAIL" ? (
      <ShieldX className="h-4 w-4 text-red-500" />
    ) : (
      <ShieldAlert className="h-4 w-4 text-amber-500" />
    );

  const clicheLabel =
    evidence.cliche_status === "PASS"
      ? "Cliché trovati — pronto per script"
      : evidence.cliche_status === "FAIL"
      ? "Nessun cliché rilevato"
      : "Errore nel check cliché";

  const clicheColor =
    evidence.cliche_status === "PASS"
      ? "border-green-500/30 bg-green-500/5"
      : evidence.cliche_status === "FAIL"
      ? "border-red-500/30 bg-red-500/5"
      : "border-amber-500/30 bg-amber-500/5";

  const adsLabel =
    evidence.ads_status === "CONFIRMED"
      ? "Ads attive confermate"
      : evidence.ads_status === "NOT_FOUND"
      ? "Nessuna Ads attiva"
      : evidence.ads_status === "API_ERROR"
      ? "Errore API Ads"
      : "Non ancora verificato";

  return (
    <Card className={`${clicheColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Evidence Box — Dati Estratti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Cliché Status */}
        <div className="flex items-center gap-2">
          {clicheIcon}
          <span className="font-medium">{clicheLabel}</span>
        </div>

        {/* Cliché trovati */}
        {evidence.cliches_found.length > 0 && (
          <div className="space-y-1.5 pl-6">
            {evidence.cliches_found.map((c, i) => (
              <div key={i} className="bg-background/50 rounded p-2 border border-border/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {c.tag}
                  </Badge>
                  <span className="font-mono text-xs text-amber-400">
                    &ldquo;{c.phrase}&rdquo;
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Contesto: {c.context}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Testi estratti */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-background/50 rounded p-2 border border-border/50 text-center">
            <p className="text-lg font-bold">{evidence.home_text_length}</p>
            <p className="text-[10px] text-muted-foreground">Homepage chars</p>
          </div>
          <div className="bg-background/50 rounded p-2 border border-border/50 text-center">
            <p className="text-lg font-bold">{evidence.about_text_length}</p>
            <p className="text-[10px] text-muted-foreground">Chi Siamo chars</p>
          </div>
          <div className="bg-background/50 rounded p-2 border border-border/50 text-center">
            <p className="text-lg font-bold">{evidence.services_text_length}</p>
            <p className="text-[10px] text-muted-foreground">Servizi chars</p>
          </div>
        </div>

        {/* Ads Status */}
        <div className="flex items-center gap-2">
          {evidence.ads_status === "CONFIRMED" ? (
            <Megaphone className="h-4 w-4 text-green-500" />
          ) : evidence.ads_status === "NOT_FOUND" ? (
            <Megaphone className="h-4 w-4 text-muted-foreground opacity-50" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span>{adsLabel}</span>
        </div>

        {/* Tracking tools (informativo) */}
        {evidence.tracking_tools.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Tracking:</span>
            {evidence.tracking_tools.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tool}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
