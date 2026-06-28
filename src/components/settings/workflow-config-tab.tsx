"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, Save, Info } from "lucide-react";
import { AVAILABLE_PLACEHOLDERS } from "@/lib/workflow-templates";

interface OutreachSettings {
  sdLandingUrl?: string | null;
  alessioLinkedinUrl?: string | null;
  questionnaireUrl?: string | null;
  emailDailyCap?: number;
  optInSubjects?: string | null;
  emailGenPrompt?: string | null;
  signatureAlessio?: string | null;
}

export function WorkflowConfigTab() {
  const [settings, setSettings] = useState<OutreachSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/outreach-mail");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch {
      toast.error("Errore caricamento impostazioni");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/outreach-mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Impostazioni salvate");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Invio Mail Automatico
          </CardTitle>
          <CardDescription>
            Mail di primo contatto opt-in scritte dall&apos;AI, inviate in modo distribuito nei giorni feriali,
            con oggetti che ruotano e un follow-up automatico. Quando il prospect risponde, si passa al video.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder legend */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Placeholder disponibili
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <Badge key={p.key} variant="outline" className="text-xs cursor-help" title={p.description}>
                  {p.key}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Landing Metodo SD (placeholder {"{metodoSD}"})</Label>
              <Input
                value={settings.sdLandingUrl || ""}
                onChange={(e) => setSettings((p) => ({ ...p, sdLandingUrl: e.target.value }))}
                placeholder="https://www.karalisweb.net/web-marketing"
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn di Alessio (placeholder {"{linkedinAlessio}"})</Label>
              <Input
                value={settings.alessioLinkedinUrl || ""}
                onChange={(e) => setSettings((p) => ({ ...p, alessioLinkedinUrl: e.target.value }))}
                placeholder="https://www.linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Link Questionario (placeholder {"{{QUESTIONARIO}}"})</Label>
              <Input
                value={settings.questionnaireUrl || ""}
                onChange={(e) => setSettings((p) => ({ ...p, questionnaireUrl: e.target.value }))}
                placeholder="https://forms.gle/... (unico link della mail 1)"
              />
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Aziende da contattare via mail / giorno</Label>
            <Input
              type="number"
              min={0}
              value={settings.emailDailyCap ?? 20}
              onChange={(e) => setSettings((p) => ({ ...p, emailDailyCap: Number(e.target.value) }))}
              placeholder="20"
            />
            <p className="text-xs text-muted-foreground">
              Tetto giornaliero di invii automatici (deliverability). 0 = nessun invio.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Oggetti mail (uno per riga — ruotano a ogni invio)</Label>
            <Textarea
              value={settings.optInSubjects ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, optInSubjects: e.target.value }))}
              placeholder={"Ho guardato il sito di {azienda}\nUna cosa che ho notato su {azienda}\n{azienda}: posso mandarvi un video?"}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Usa {"{azienda}"} per il nome. Se vuoto, usa una lista di default.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Istruzioni per l&apos;AI che scrive la mail</Label>
            <Textarea
              value={settings.emailGenPrompt ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, emailGenPrompt: e.target.value }))}
              placeholder="Vuoto = istruzioni di default. Scrivi qui per cambiare tono, lunghezza, come usare il gancio…"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Vuoto = istruzioni di default. L&apos;AI scrive ogni mail su misura con un gancio vero.
            </p>
          </div>

          <div className="space-y-2 md:max-w-md">
            <Label>Firma Alessio</Label>
            <Textarea
              value={settings.signatureAlessio || ""}
              onChange={(e) => setSettings((p) => ({ ...p, signatureAlessio: e.target.value }))}
              placeholder="Alessio Loi&#10;Karalisweb"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>
    </div>
  );
}
