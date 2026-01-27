"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Target, Phone, Clock, AlertTriangle, PlayCircle, RefreshCw, Wrench } from "lucide-react";

interface CrmSettings {
  scoreThreshold: number;
  dailyCallLimit: number;
  ghostOfferDays: number;
  maxCallAttempts: number;
}

interface AuditStats {
  pending: number;
  completed: number;
  running: number;
  failed: number;
  noWebsite: number;
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

  // Maintenance states
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [runningBulkAudit, setRunningBulkAudit] = useState(false);
  const [bulkAuditProgress, setBulkAuditProgress] = useState<{ processed: number; total: number } | null>(null);
  const [recalculatingStages, setRecalculatingStages] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAuditStats();
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

  // Fetch audit statistics
  async function fetchAuditStats() {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/leads/stats");
      if (res.ok) {
        const data = await res.json();
        setAuditStats({
          pending: data.auditStatus?.PENDING || 0,
          completed: data.auditStatus?.COMPLETED || 0,
          running: data.auditStatus?.RUNNING || 0,
          failed: data.auditStatus?.FAILED || 0,
          noWebsite: data.auditStatus?.NO_WEBSITE || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching audit stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }

  // Run bulk audit for pending leads
  async function runBulkAudit() {
    if (!auditStats || auditStats.pending === 0) {
      toast.info("Nessun lead da auditare");
      return;
    }

    setRunningBulkAudit(true);
    setBulkAuditProgress({ processed: 0, total: auditStats.pending });

    try {
      // Run in batches of 10 to avoid timeout
      const batchSize = 10;
      let totalProcessed = 0;
      let totalParked = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch("/api/audit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: batchSize }),
        });

        if (!res.ok) {
          throw new Error("Errore durante l'audit batch");
        }

        const data = await res.json();
        totalProcessed += data.processed || 0;
        totalParked += data.parked || 0;

        setBulkAuditProgress(prev => prev ? { ...prev, processed: totalProcessed } : null);

        // Check if there are more to process
        if ((data.processed || 0) + (data.parked || 0) < batchSize) {
          hasMore = false;
        }

        // Small delay between batches to not overload the server
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`Audit completato: ${totalProcessed} processati, ${totalParked} parcheggiati`);
      fetchAuditStats();
    } catch (error) {
      console.error("Error running bulk audit:", error);
      toast.error("Errore durante l'audit bulk");
    } finally {
      setRunningBulkAudit(false);
      setBulkAuditProgress(null);
    }
  }

  // Recalculate pipeline stages based on score
  async function recalculateStages() {
    setRecalculatingStages(true);
    try {
      const res = await fetch("/api/leads/recalculate-stages", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Ricalcolati ${data.results.total} lead: ${data.results.daChiamare} DA_CHIAMARE, ${data.results.daVerificare} DA_VERIFICARE, ${data.results.nonTarget} NON_TARGET`
        );
        fetchAuditStats();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nel ricalcolo");
      }
    } catch (error) {
      console.error("Error recalculating stages:", error);
      toast.error("Errore nel ricalcolo stati");
    } finally {
      setRecalculatingStages(false);
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

      <Separator className="my-8" />

      {/* Maintenance Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Manutenzione</h2>
        </div>

        {/* Audit Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Stato Audit Lead</CardTitle>
                <CardDescription>
                  Statistiche sullo stato degli audit dei lead nel sistema
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAuditStats}
                disabled={loadingStats}
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento statistiche...
              </div>
            ) : auditStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{auditStats.pending}</p>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{auditStats.running}</p>
                  <p className="text-xs text-muted-foreground">In corso</p>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{auditStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completati</p>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{auditStats.failed}</p>
                  <p className="text-xs text-muted-foreground">Falliti</p>
                </div>
                <div className="text-center p-3 bg-gray-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{auditStats.noWebsite}</p>
                  <p className="text-xs text-muted-foreground">Senza sito</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Bulk Audit */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Avvia Audit Bulk</CardTitle>
            </div>
            <CardDescription>
              Esegue l&apos;audit per tutti i lead in stato PENDING che hanno un sito web.
              Utile se l&apos;audit automatico ha fallito o per processare lead importati manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {auditStats && auditStats.pending > 0 ? (
                  <Badge variant="secondary">{auditStats.pending} lead da auditare</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Nessun lead in attesa di audit</span>
                )}
                {bulkAuditProgress && (
                  <span className="text-sm text-muted-foreground">
                    Processati: {bulkAuditProgress.processed}/{bulkAuditProgress.total}
                  </span>
                )}
              </div>
              <Button
                onClick={runBulkAudit}
                disabled={runningBulkAudit || !auditStats || auditStats.pending === 0}
              >
                {runningBulkAudit ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Audit in corso...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Avvia Audit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recalculate Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Ricalcola Stati Pipeline</CardTitle>
            </div>
            <CardDescription>
              Ricalcola gli stati dei lead con audit completato in base allo score e ai tag commerciali.
              Utile dopo aver modificato la soglia score o per correggere inconsistenze.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Soglia attuale: <Badge variant="outline">{settings.scoreThreshold}</Badge>
                <span className="ml-2">
                  (Score &ge; {settings.scoreThreshold} → DA_CHIAMARE, altrimenti → DA_VERIFICARE)
                </span>
              </div>
              <Button
                onClick={recalculateStages}
                disabled={recalculatingStages}
                variant="outline"
              >
                {recalculatingStages ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ricalcolo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ricalcola Stati
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
