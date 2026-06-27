"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

interface EmailSettings {
  emailFromAddress: string | null;
  emailFromName: string | null;
  gdprCompanyName: string | null;
  gdprAddress: string | null;
  gdprVatNumber: string | null;
  gdprFooterText: string | null;
  gdprUnsubscribeText: string | null;
  notificationEmails: string | null;
}

const EMPTY_SETTINGS: EmailSettings = {
  emailFromAddress: null,
  emailFromName: null,
  gdprCompanyName: null,
  gdprAddress: null,
  gdprVatNumber: null,
  gdprFooterText: null,
  gdprUnsubscribeText: null,
  notificationEmails: null,
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifiche video views */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notifiche Video Views
          </CardTitle>
          <CardDescription>
            Email destinatarie delle notifiche quando un prospect guarda un video. Separa piu indirizzi con la virgola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Destinatari notifiche</Label>
            <Input
              value={settings.notificationEmails || ""}
              onChange={(e) => updateField("notificationEmails", e.target.value)}
              placeholder="alessio@karalisweb.net, consulenza@karalisweb.net"
            />
            <p className="text-xs text-muted-foreground">
              Se vuoto, usa il valore di default (SMTP_USER dal .env). Esempio: <code>alessio@karalisweb.net, consulenza@karalisweb.net</code>
            </p>
          </div>
        </CardContent>
      </Card>

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
