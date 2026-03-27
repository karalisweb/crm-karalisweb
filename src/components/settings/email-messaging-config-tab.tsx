"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Mail, MessageCircle, Shield } from "lucide-react";
import { toast } from "sonner";

interface EmailSettings {
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailSubjectFirst: string | null;
  emailSubjectFollowup: string | null;
  tplFirstWa: string | null;
  tplFirstEmail: string | null;
  tplFollowup1Wa: string | null;
  tplFollowup1Email: string | null;
  tplFollowup2Wa: string | null;
  tplFollowup2Email: string | null;
  tplFollowup3Wa: string | null;
  tplFollowup3Email: string | null;
  gdprCompanyName: string | null;
  gdprAddress: string | null;
  gdprVatNumber: string | null;
  gdprFooterText: string | null;
  gdprUnsubscribeText: string | null;
}

const TEMPLATE_FIELDS = [
  { key: "tplFirstWa", label: "Primo contatto — WhatsApp", icon: "wa" },
  { key: "tplFirstEmail", label: "Primo contatto — Email", icon: "email" },
  { key: "tplFollowup1Wa", label: "Follow-up 1 — WhatsApp", icon: "wa" },
  { key: "tplFollowup1Email", label: "Follow-up 1 — Email", icon: "email" },
  { key: "tplFollowup2Wa", label: "Follow-up 2 — WhatsApp", icon: "wa" },
  { key: "tplFollowup2Email", label: "Follow-up 2 — Email", icon: "email" },
  { key: "tplFollowup3Wa", label: "Follow-up 3 — WhatsApp", icon: "wa" },
  { key: "tplFollowup3Email", label: "Follow-up 3 — Email", icon: "email" },
] as const;

const EMPTY_SETTINGS: EmailSettings = {
  emailFromAddress: null,
  emailFromName: null,
  emailSubjectFirst: null,
  emailSubjectFollowup: null,
  tplFirstWa: null,
  tplFirstEmail: null,
  tplFollowup1Wa: null,
  tplFollowup1Email: null,
  tplFollowup2Wa: null,
  tplFollowup2Email: null,
  tplFollowup3Wa: null,
  tplFollowup3Email: null,
  gdprCompanyName: null,
  gdprAddress: null,
  gdprVatNumber: null,
  gdprFooterText: null,
  gdprUnsubscribeText: null,
};

export function EmailMessagingConfigTab() {
  const [settings, setSettings] = useState<EmailSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/email-messaging")
      .then((r) => r.json())
      .then((data) => {
        setSettings({ ...EMPTY_SETTINGS, ...data });
      })
      .catch(() => toast.error("Errore nel caricamento impostazioni"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/email-messaging", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore nel salvataggio");
      }
      toast.success("Impostazioni salvate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof EmailSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value || null }));
  };

  const clearTemplate = (key: keyof EmailSettings) => {
    setSettings((prev) => ({ ...prev, [key]: null }));
    toast.info("Template resettato al default");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mittente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Mittente Email
          </CardTitle>
          <CardDescription>
            Da chi arrivano le email di outreach. Se vuoto, usa i valori dal file .env.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email mittente</Label>
              <Input
                value={settings.emailFromAddress || ""}
                onChange={(e) => updateField("emailFromAddress", e.target.value)}
                placeholder="alessio@karalisweb.net"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome mittente</Label>
              <Input
                value={settings.emailFromName || ""}
                onChange={(e) => updateField("emailFromName", e.target.value)}
                placeholder="Alessio Loi - Karalisweb"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Oggetti email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oggetto Email</CardTitle>
          <CardDescription>
            Variabili disponibili: {"{nome}"} (nome del contatto), {"{azienda}"} (nome azienda/lead)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Oggetto — Primo contatto</Label>
            <Input
              value={settings.emailSubjectFirst || ""}
              onChange={(e) => updateField("emailSubjectFirst", e.target.value)}
              placeholder="Analisi personalizzata per {azienda}"
            />
          </div>
          <div className="space-y-2">
            <Label>Oggetto — Follow-up</Label>
            <Input
              value={settings.emailSubjectFollowup || ""}
              onChange={(e) => updateField("emailSubjectFollowup", e.target.value)}
              placeholder="Re: Analisi per {azienda}"
            />
          </div>
        </CardContent>
      </Card>

      {/* Template messaggi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Template Messaggi
          </CardTitle>
          <CardDescription>
            Variabili: {"{nome}"}, {"{azienda}"}, {"{landingUrl}"}. Se vuoto, usa il template di default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {TEMPLATE_FIELDS.map(({ key, label, icon }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {icon === "wa" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] px-1.5">WA</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] px-1.5">Email</Badge>
                  )}
                  {label}
                </Label>
                {settings[key as keyof EmailSettings] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => clearTemplate(key as keyof EmailSettings)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <Textarea
                value={settings[key as keyof EmailSettings] || ""}
                onChange={(e) => updateField(key as keyof EmailSettings, e.target.value)}
                rows={4}
                className="text-sm"
                placeholder="Lascia vuoto per usare il template di default"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer GDPR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Footer GDPR
          </CardTitle>
          <CardDescription>
            Dati aziendali e testo GDPR aggiunto in fondo a ogni email di outreach.
            Compila almeno il nome azienda per attivare il footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome azienda</Label>
              <Input
                value={settings.gdprCompanyName || ""}
                onChange={(e) => updateField("gdprCompanyName", e.target.value)}
                placeholder="Karalisweb"
              />
            </div>
            <div className="space-y-2">
              <Label>P.IVA</Label>
              <Input
                value={settings.gdprVatNumber || ""}
                onChange={(e) => updateField("gdprVatNumber", e.target.value)}
                placeholder="IT12345678901"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Indirizzo sede</Label>
            <Input
              value={settings.gdprAddress || ""}
              onChange={(e) => updateField("gdprAddress", e.target.value)}
              placeholder="Via Roma 1, 09100 Cagliari (CA)"
            />
          </div>
          <div className="space-y-2">
            <Label>Testo footer GDPR</Label>
            <Textarea
              value={settings.gdprFooterText || ""}
              onChange={(e) => updateField("gdprFooterText", e.target.value)}
              rows={2}
              className="text-sm"
              placeholder="Hai ricevuto questa email perché la tua attività è presente su Google Maps."
            />
          </div>
          <div className="space-y-2">
            <Label>Testo link disiscrizione</Label>
            <Input
              value={settings.gdprUnsubscribeText || ""}
              onChange={(e) => updateField("gdprUnsubscribeText", e.target.value)}
              placeholder="Non desidero ricevere altre comunicazioni"
            />
          </div>

          {/* Preview */}
          {settings.gdprCompanyName && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Anteprima footer</Label>
                <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground leading-relaxed">
                  <hr className="border-t border-border mb-2" />
                  {settings.gdprFooterText || "Hai ricevuto questa email perché la tua attività è presente su Google Maps."}
                  <br />
                  <span className="underline">
                    {settings.gdprUnsubscribeText || "Non desidero ricevere altre comunicazioni"}
                  </span>
                  <br />
                  {[
                    settings.gdprCompanyName,
                    settings.gdprAddress,
                    settings.gdprVatNumber ? `P.IVA ${settings.gdprVatNumber}` : null,
                  ].filter(Boolean).join(" · ")}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salva Impostazioni
        </Button>
      </div>
    </div>
  );
}
