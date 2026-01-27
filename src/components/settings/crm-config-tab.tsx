"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Target, Phone, Clock, AlertTriangle } from "lucide-react";

interface CrmSettings {
  scoreThreshold: number;
  dailyCallLimit: number;
  ghostOfferDays: number;
  maxCallAttempts: number;
}

export function CrmConfigTab() {
  const [settings, setSettings] = useState<CrmSettings>({
    scoreThreshold: 60,
    dailyCallLimit: 5,
    ghostOfferDays: 20,
    maxCallAttempts: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<CrmSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (originalSettings) {
      const changed =
        settings.scoreThreshold !== originalSettings.scoreThreshold ||
        settings.dailyCallLimit !== originalSettings.dailyCallLimit ||
        settings.ghostOfferDays !== originalSettings.ghostOfferDays ||
        settings.maxCallAttempts !== originalSettings.maxCallAttempts;
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings/crm");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setOriginalSettings(data);
      }
    } catch (error) {
      console.error("Error fetching CRM settings:", error);
      toast.error("Errore nel caricamento impostazioni");
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
        setSettings(data);
        setOriginalSettings(data);
        toast.success("Impostazioni CRM salvate");
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nel salvataggio");
      }
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setSettings({
      scoreThreshold: 60,
      dailyCallLimit: 5,
      ghostOfferDays: 20,
      maxCallAttempts: 3,
    });
  }

  function undoChanges() {
    if (originalSettings) {
      setSettings(originalSettings);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score Threshold */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Soglia Score MSD</CardTitle>
          </div>
          <CardDescription>
            I lead con score uguale o superiore a questa soglia vengono mostrati in &quot;Da chiamare oggi&quot;.
            Lead sotto la soglia vanno in &quot;Da Verificare&quot; per revisione manuale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="scoreThreshold">Score minimo (0-100)</Label>
              <Input
                id="scoreThreshold"
                type="number"
                min={0}
                max={100}
                value={settings.scoreThreshold}
                onChange={(e) => setSettings({ ...settings, scoreThreshold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="pt-6">
              <div className="text-sm text-muted-foreground">
                Score &ge; {settings.scoreThreshold} = Da chiamare
              </div>
              <div className="text-sm text-muted-foreground">
                Score &lt; {settings.scoreThreshold} = Da verificare
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Call Limit */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Limite Chiamate Giornaliere</CardTitle>
          </div>
          <CardDescription>
            Numero massimo di lead da mostrare nella lista &quot;Da chiamare oggi&quot;.
            Aiuta a mantenere un carico di lavoro gestibile per il commerciale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dailyCallLimit">Lead da chiamare al giorno</Label>
              <Input
                id="dailyCallLimit"
                type="number"
                min={1}
                max={50}
                value={settings.dailyCallLimit}
                onChange={(e) => setSettings({ ...settings, dailyCallLimit: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Mostra max {settings.dailyCallLimit} lead per volta
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Max Call Attempts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <CardTitle>Tentativi Chiamata Massimi</CardTitle>
          </div>
          <CardDescription>
            Dopo questo numero di chiamate senza risposta, il lead viene spostato in &quot;Da Verificare&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="maxCallAttempts">Tentativi massimi</Label>
              <Input
                id="maxCallAttempts"
                type="number"
                min={1}
                max={10}
                value={settings.maxCallAttempts}
                onChange={(e) => setSettings({ ...settings, maxCallAttempts: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Dopo {settings.maxCallAttempts} tentativi = Da verificare
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ghost Offer Days */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Giorni Ghost Offerta</CardTitle>
          </div>
          <CardDescription>
            Se un lead con offerta inviata non risponde dopo questo numero di giorni,
            viene considerato &quot;ghost&quot; e segnalato per follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="ghostOfferDays">Giorni senza risposta</Label>
              <Input
                id="ghostOfferDays"
                type="number"
                min={1}
                max={90}
                value={settings.ghostOfferDays}
                onChange={(e) => setSettings({ ...settings, ghostOfferDays: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Ghost dopo {settings.ghostOfferDays} giorni
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Ripristina Default
          </Button>
          {hasChanges && (
            <Button variant="ghost" onClick={undoChanges}>
              Annulla modifiche
            </Button>
          )}
        </div>
        <Button onClick={saveSettings} disabled={saving || !hasChanges} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salva Impostazioni CRM
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
