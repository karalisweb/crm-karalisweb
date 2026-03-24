"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Sparkles, FileText, Cpu, Search, Pen } from "lucide-react";
import { DEFAULT_READING_SCRIPT_PROMPT } from "@/lib/prompts";
import { DEFAULT_STRATEGIC_ANALYSIS_PROMPT } from "@/lib/prompts";
import {
  DEFAULT_ANALYST_PROMPT,
  DEFAULT_SCRIPTWRITER_PROMPT,
  ANALYST_PLACEHOLDERS,
  SCRIPTWRITER_PLACEHOLDERS,
} from "@/lib/prompts-v2";
import { PromptEditor } from "./prompt-editor";

interface AiSettings {
  aiProvider: string;
  aiModelGemini: string | null;
  aiModelClaude: string | null;
  aiModelOpenai: string | null;
  strategicAnalysisPrompt: string | null;
  readingScriptPrompt: string | null;
  analystPrompt: string | null;
  scriptwriterPrompt: string | null;
}

const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini", icon: "🟢", keyEnv: "GEMINI_API_KEY" },
  { value: "claude", label: "Anthropic Claude", icon: "🟠", keyEnv: "ANTHROPIC_API_KEY" },
  { value: "openai", label: "OpenAI ChatGPT", icon: "🔵", keyEnv: "OPENAI_API_KEY" },
];

const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  claude: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

export function AiConfigTab() {
  const [settings, setSettings] = useState<AiSettings>({
    aiProvider: "gemini",
    aiModelGemini: null,
    aiModelClaude: null,
    aiModelOpenai: null,
    strategicAnalysisPrompt: null,
    readingScriptPrompt: null,
    analystPrompt: null,
    scriptwriterPrompt: null,
  });
  const [original, setOriginal] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings/crm");
      if (res.ok) {
        const data = await res.json();
        const s: AiSettings = {
          aiProvider: data.aiProvider || "gemini",
          aiModelGemini: data.aiModelGemini || null,
          aiModelClaude: data.aiModelClaude || null,
          aiModelOpenai: data.aiModelOpenai || null,
          strategicAnalysisPrompt: data.strategicAnalysisPrompt || null,
          readingScriptPrompt: data.readingScriptPrompt || null,
          analystPrompt: data.analystPrompt || null,
          scriptwriterPrompt: data.scriptwriterPrompt || null,
        };
        setSettings(s);
        setOriginal(s);
      }
    } catch {
      toast.error("Errore nel caricamento impostazioni AI");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        const s: AiSettings = {
          aiProvider: data.aiProvider || "gemini",
          aiModelGemini: data.aiModelGemini || null,
          aiModelClaude: data.aiModelClaude || null,
          aiModelOpenai: data.aiModelOpenai || null,
          strategicAnalysisPrompt: data.strategicAnalysisPrompt || null,
          readingScriptPrompt: data.readingScriptPrompt || null,
          analystPrompt: data.analystPrompt || null,
          scriptwriterPrompt: data.scriptwriterPrompt || null,
        };
        setSettings(s);
        setOriginal(s);
        toast.success("Impostazioni AI salvate");
      } else {
        const err = await res.json();
        toast.error(err.error || "Errore nel salvataggio");
      }
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = original && JSON.stringify(settings) !== JSON.stringify(original);
  const currentModel =
    settings.aiProvider === "gemini" ? settings.aiModelGemini :
    settings.aiProvider === "claude" ? settings.aiModelClaude :
    settings.aiModelOpenai;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider AI */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle>Provider AI</CardTitle>
          </div>
          <CardDescription>
            Scegli quale AI usare per l&apos;analisi strategica e la generazione degli script video.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {AI_PROVIDERS.map((provider) => (
              <button
                key={provider.value}
                onClick={() => setSettings({ ...settings, aiProvider: provider.value })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  settings.aiProvider === provider.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="text-2xl mb-2">{provider.icon}</div>
                <div className="font-medium text-sm">{provider.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {DEFAULT_MODELS[provider.value]}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Modello {settings.aiProvider === "gemini" ? "Gemini" : settings.aiProvider === "claude" ? "Claude" : "OpenAI"}</Label>
            <Input
              value={currentModel || ""}
              onChange={(e) => {
                const key = settings.aiProvider === "gemini" ? "aiModelGemini" :
                  settings.aiProvider === "claude" ? "aiModelClaude" : "aiModelOpenai";
                setSettings({ ...settings, [key]: e.target.value || null });
              }}
              placeholder={DEFAULT_MODELS[settings.aiProvider]}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Lascia vuoto per usare il modello di default ({DEFAULT_MODELS[settings.aiProvider]})
            </p>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p className="font-medium mb-1">API Key richiesta:</p>
            <p>
              Configura la chiave nella tab <strong>API &amp; Token</strong>.
              Variabile: <code className="text-primary">
                {AI_PROVIDERS.find(p => p.value === settings.aiProvider)?.keyEnv}
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ==========================================
          CATENA 2 PROMPT (V2)
          ========================================== */}

      {/* Prompt 1 - Analista */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            <CardTitle>Prompt 1 — Analista</CardTitle>
          </div>
          <CardDescription>
            Analizza il sito del prospect e trova punti di dolore concreti, pattern di errore e clich&eacute;.
            Produce l&apos;output che verr&agrave; validato prima di passare allo Sceneggiatore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromptEditor
            value={settings.analystPrompt || DEFAULT_ANALYST_PROMPT}
            defaultValue={DEFAULT_ANALYST_PROMPT}
            placeholders={ANALYST_PLACEHOLDERS}
            onChange={(v) => setSettings({ ...settings, analystPrompt: v })}
            rows={24}
          />
        </CardContent>
      </Card>

      {/* Prompt 2 - Sceneggiatore */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pen className="h-5 w-5 text-purple-600" />
            <CardTitle>Prompt 2 — Sceneggiatore</CardTitle>
          </div>
          <CardDescription>
            Prende l&apos;output approvato dell&apos;Analista e crea lo script video a 4 atti.
            Alimenta il problema, crea una metafora, toglie le colpe e presenta la soluzione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromptEditor
            value={settings.scriptwriterPrompt || DEFAULT_SCRIPTWRITER_PROMPT}
            defaultValue={DEFAULT_SCRIPTWRITER_PROMPT}
            placeholders={SCRIPTWRITER_PLACEHOLDERS}
            onChange={(v) => setSettings({ ...settings, scriptwriterPrompt: v })}
            rows={24}
          />
        </CardContent>
      </Card>

      {/* ==========================================
          PROMPT LEGACY (mantenuti per backward compat)
          ========================================== */}

      {/* Prompt Analisi Strategica (Legacy) */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Prompt Analisi Strategica (Legacy)</CardTitle>
          </div>
          <CardDescription>
            Prompt singolo originale (v3.1). Usato per lead gi&agrave; processati. I nuovi lead usano la catena Analista + Sceneggiatore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={settings.strategicAnalysisPrompt || DEFAULT_STRATEGIC_ANALYSIS_PROMPT}
            onChange={(e) => setSettings({ ...settings, strategicAnalysisPrompt: e.target.value })}
            rows={12}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings({ ...settings, strategicAnalysisPrompt: DEFAULT_STRATEGIC_ANALYSIS_PROMPT })}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Ripristina Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Script di Lettura */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Prompt Script di Lettura</CardTitle>
          </div>
          <CardDescription>
            Trasforma il teleprompter a 4 atti in un testo fluido pronto da leggere nel video.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={settings.readingScriptPrompt || DEFAULT_READING_SCRIPT_PROMPT}
            onChange={(e) => setSettings({ ...settings, readingScriptPrompt: e.target.value })}
            rows={20}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings({ ...settings, readingScriptPrompt: DEFAULT_READING_SCRIPT_PROMPT })}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Ripristina Default
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/30 rounded-lg p-3">
            <p className="font-medium">Variabili disponibili (sostituite automaticamente):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
              <span><code className="text-primary">{`{{CHI_PARLA}}`}</code> — nome e ruolo speaker</span>
              <span><code className="text-primary">{`{{PROSPECT_NAME}}`}</code> — nome del lead</span>
              <span><code className="text-primary">{`{{PROSPECT_WEBSITE}}`}</code> — sito web</span>
              <span><code className="text-primary">{`{{OPPORTUNITY_SCORE}}`}</code> — score 0-100</span>
              <span><code className="text-primary">{`{{ERROR_PATTERN}}`}</code> — pattern di errore strategico</span>
              <span><code className="text-primary">{`{{CLICHE}}`}</code> — frase clich&eacute; trovata sul sito</span>
              <span><code className="text-primary">{`{{STRATEGIC_NOTE}}`}</code> — nota strategica</span>
              <span><code className="text-primary">{`{{PROBLEMI_SITO}}`}</code> — problemi strategici dall&apos;analisi AI</span>
              <span><code className="text-primary">{`{{ATTO_1}}`}</code> ... <code className="text-primary">{`{{ATTO_4}}`}</code> — i 4 atti del teleprompter</span>
              <span><code className="text-primary">{`{{CUSTOM_INSTRUCTIONS}}`}</code> — istruzioni aggiuntive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salva */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving || !hasChanges} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salva Impostazioni AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
