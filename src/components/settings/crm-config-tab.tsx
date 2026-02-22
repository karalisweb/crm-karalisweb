"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Target, Clock, AlertTriangle, PlayCircle, RefreshCw, Wrench, CheckCircle2, Video, Mail, CalendarClock } from "lucide-react";

interface CrmSettings {
  scoreThreshold: number;
  ghostOfferDays: number;
  maxCallAttempts: number;
  followUpDaysVideo: number;
  followUpDaysLetter: number;
  recontactMonths: number;
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
    ghostOfferDays: 20,
    maxCallAttempts: 3,
    followUpDaysVideo: 7,
    followUpDaysLetter: 7,
    recontactMonths: 6,
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
  const [fixingCallable, setFixingCallable] = useState(false);
  const [callableStats, setCallableStats] = useState<{ shouldBeCallable: number } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchAuditStats();
    fetchCallableStats();
  }, []);

  useEffect(() => {
    if (originalSettings) {
      const changed =
        settings.scoreThreshold !== originalSettings.scoreThreshold ||
        settings.ghostOfferDays !== originalSettings.ghostOfferDays ||
        settings.maxCallAttempts !== originalSettings.maxCallAttempts ||
        settings.followUpDaysVideo !== originalSettings.followUpDaysVideo ||
        settings.followUpDaysLetter !== originalSettings.followUpDaysLetter ||
        settings.recontactMonths !== originalSettings.recontactMonths;
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
      ghostOfferDays: 20,
      maxCallAttempts: 3,
      followUpDaysVideo: 7,
      followUpDaysLetter: 7,
      recontactMonths: 6,
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

  // Fetch callable status stats
  async function fetchCallableStats() {
    try {
      const res = await fetch("/api/debug/callable-status");
      if (res.ok) {
        const data = await res.json();
        setCallableStats({
          shouldBeCallable: data.shouldBeCallableButAreNot || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching callable stats:", error);
    }
  }

  // Fix isCallable flag for all leads
  async function fixCallableStatus() {
    setFixingCallable(true);
    try {
      const res = await fetch("/api/debug/callable-status", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchCallableStats();
        fetchAuditStats();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nel fix");
      }
    } catch (error) {
      console.error("Error fixing callable status:", error);
      toast.error("Errore nel fix isCallable");
    } finally {
      setFixingCallable(false);
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
          `Ricalcolati ${data.results.total} lead: ${data.results.daQualificare ?? 0} DA_QUALIFICARE, ${data.results.nonTarget ?? 0} NON_TARGET`
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
            <CardTitle>Soglia Score</CardTitle>
          </div>
          <CardDescription>
            Soglia informativa per prioritizzare i lead. Daniela decide la qualificazione manualmente.
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
            <div className="pt-6 text-sm text-muted-foreground">
              Score di riferimento per la qualificazione
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Days Video */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle>Follow-up dopo Video</CardTitle>
          </div>
          <CardDescription>
            Giorni dopo l&apos;invio del video prima di suggerire l&apos;invio della lettera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="followUpDaysVideo">Giorni dopo il video</Label>
              <Input
                id="followUpDaysVideo"
                type="number"
                min={1}
                max={60}
                value={settings.followUpDaysVideo}
                onChange={(e) => setSettings({ ...settings, followUpDaysVideo: parseInt(e.target.value) || 7 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Suggerisci lettera dopo {settings.followUpDaysVideo} giorni
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Days Letter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Follow-up dopo Lettera</CardTitle>
          </div>
          <CardDescription>
            Giorni dopo l&apos;invio della lettera prima di suggerire il contatto LinkedIn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="followUpDaysLetter">Giorni dopo la lettera</Label>
              <Input
                id="followUpDaysLetter"
                type="number"
                min={1}
                max={60}
                value={settings.followUpDaysLetter}
                onChange={(e) => setSettings({ ...settings, followUpDaysLetter: parseInt(e.target.value) || 7 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Suggerisci LinkedIn dopo {settings.followUpDaysLetter} giorni
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recontact Months */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle>Mesi Ricontatto</CardTitle>
          </div>
          <CardDescription>
            Dopo quanti mesi un lead in &quot;Da richiamare&quot; torna automaticamente in pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="recontactMonths">Mesi prima del ricontatto</Label>
              <Input
                id="recontactMonths"
                type="number"
                min={1}
                max={24}
                value={settings.recontactMonths}
                onChange={(e) => setSettings({ ...settings, recontactMonths: parseInt(e.target.value) || 6 })}
              />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              Ricontatto automatico dopo {settings.recontactMonths} mesi
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
            Dopo questo numero di chiamate senza risposta, il lead viene spostato in archivio.
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
              Dopo {settings.maxCallAttempts} tentativi senza risposta
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ghost Offer Days */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Giorni Ghost Proposta</CardTitle>
          </div>
          <CardDescription>
            Se un lead con proposta inviata non risponde dopo questo numero di giorni,
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
              Ricalcola gli stati dei lead con audit completato in base ai tag commerciali.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Callable → DA_QUALIFICARE, Non target → NON_TARGET
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

        {/* Fix Callable Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Fix Flag &quot;Chiamabile&quot;</CardTitle>
            </div>
            <CardDescription>
              Corregge il flag isCallable per tutti i lead in base al loro tag commerciale.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {callableStats && callableStats.shouldBeCallable > 0 ? (
                  <Badge variant="destructive">{callableStats.shouldBeCallable} lead da correggere</Badge>
                ) : (
                  <span className="text-sm text-green-600">Tutti i lead hanno il flag corretto</span>
                )}
              </div>
              <Button
                onClick={fixCallableStatus}
                disabled={fixingCallable}
                variant="outline"
              >
                {fixingCallable ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Correzione...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Fix Callable
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
