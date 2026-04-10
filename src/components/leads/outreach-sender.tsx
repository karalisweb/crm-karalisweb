"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  ArrowRightLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface OutreachSenderProps {
  leadId: string;
  leadName: string;
  whatsappNumber: string | null;
  email: string | null;
  outreachChannel: string | null;
  landingUrl: string | null;
  phone: string | null;
}

function addUtm(url: string | null): string {
  if (!url) return "[link analisi]";
  return url + (url.includes("?") ? "&" : "?") + "utm=client";
}

function generateFirstMessage(leadName: string, landingUrl: string | null, channel: "WA" | "EMAIL"): string {
  const firstName = leadName.split(" ")[0];
  const videoLink = addUtm(landingUrl);

  if (channel === "WA") {
    return `Ciao ${firstName}, sono Alessio Loi, fondatore di Karalisweb.

Ho preparato un'analisi personalizzata per ${leadName} — un breve video dove ti mostro alcune opportunità concrete che ho individuato navigando il vostro sito.

Eccola qui: ${videoLink}

Dura pochi minuti. Fammi sapere se preferisci ricevere aggiornamenti via email invece che qui su WhatsApp!`;
  }

  return `Buongiorno ${firstName},

Sono Alessio Loi, fondatore di Karalisweb.

Ho preparato un'analisi personalizzata per ${leadName}: un breve video dove le mostro alcune opportunità concrete che ho individuato navigando il vostro sito.

Può visionarla qui: ${videoLink}

Se preferisce, posso contattarla via WhatsApp per un riscontro più rapido.

Cordiali saluti,
Alessio Loi
Karalisweb`;
}

function generateFollowUpMessage(leadName: string, landingUrl: string | null, channel: "WA" | "EMAIL"): string {
  const firstName = leadName.split(" ")[0];
  const videoLink = addUtm(landingUrl);

  if (channel === "WA") {
    return `Ciao ${firstName}, qualche giorno fa ti avevo inviato un'analisi personalizzata del tuo sito. Magari ti è sfuggita — eccola qui: ${videoLink}

Fammi sapere se hai 10 minuti per vederla insieme!`;
  }

  return `Buongiorno ${firstName},

Le scrivo per un breve follow-up: qualche giorno fa le avevo inviato un'analisi personalizzata del vostro sito.

Se non ha avuto modo di visionarla, può trovarla qui: ${videoLink}

Sarei felice di dedicarle 10 minuti per mostrarle i punti principali. Quando le farebbe comodo?

Cordiali saluti,
Alessio Loi
Karalisweb`;
}

export function OutreachSender({
  leadId,
  leadName,
  whatsappNumber,
  email,
  outreachChannel,
  landingUrl,
  phone,
}: OutreachSenderProps) {
  const [channel, setChannel] = useState<"WA" | "EMAIL">(
    (outreachChannel as "WA" | "EMAIL") || (whatsappNumber ? "WA" : "EMAIL")
  );
  const [messageType, setMessageType] = useState<"first" | "followup">("first");
  const [message, setMessage] = useState(() =>
    generateFirstMessage(leadName, landingUrl, whatsappNumber ? "WA" : "EMAIL")
  );
  const [leadEmail, setLeadEmail] = useState(email || "");
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [logging, setLogging] = useState(false);
  const [changingChannel, setChangingChannel] = useState(false);

  const waNumber = whatsappNumber || phone;
  const canWA = !!waNumber;
  const canEmail = !!leadEmail.trim();

  const regenerateMessage = useCallback(
    (ch: "WA" | "EMAIL", type: "first" | "followup") => {
      const msg =
        type === "first"
          ? generateFirstMessage(leadName, landingUrl, ch)
          : generateFollowUpMessage(leadName, landingUrl, ch);
      setMessage(msg);
    },
    [leadName, landingUrl]
  );

  const handleChannelSwitch = async () => {
    const newChannel = channel === "WA" ? "EMAIL" : "WA";
    if (newChannel === "WA" && !canWA) {
      toast.error("Nessun numero WhatsApp disponibile");
      return;
    }
    if (newChannel === "EMAIL" && !canEmail) {
      toast.error("Nessuna email disponibile — inseriscila sopra");
      return;
    }

    setChangingChannel(true);
    try {
      // Salva il cambio canale nel DB
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachChannel: newChannel }),
      });
      if (!res.ok) throw new Error();

      // Logga il cambio
      await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CHANNEL_CHANGED",
          notes: `Canale cambiato da ${channel} a ${newChannel}`,
        }),
      });

      setChannel(newChannel);
      regenerateMessage(newChannel, messageType);
      toast.success(`Canale cambiato a ${newChannel === "WA" ? "WhatsApp" : "Email"}`);
    } catch {
      toast.error("Errore nel cambio canale");
    } finally {
      setChangingChannel(false);
    }
  };

  const handleSendWA = async () => {
    if (!waNumber) return;

    // Formatta numero per wa.me (rimuovi spazi, +, ecc)
    const cleanNumber = waNumber.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?/, "");
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    // Logga l'invio
    setLogging(true);
    try {
      await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WHATSAPP_SENT",
          notes: `Messaggio WA ${messageType === "first" ? "primo contatto" : "follow-up"} inviato`,
        }),
      });

      // Salva canale se non già impostato
      if (!outreachChannel) {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outreachChannel: "WA" }),
        });
      }

      // Apri WhatsApp
      window.open(waUrl, "_blank");
      toast.success("WhatsApp aperto — conferma invio manualmente");
    } catch {
      toast.error("Errore nel logging");
    } finally {
      setLogging(false);
    }
  };

  const handleSendEmail = async () => {
    if (!leadEmail.trim()) {
      toast.error("Inserisci l'email del prospect");
      return;
    }

    setLogging(true);
    try {
      // Invia email tramite API
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: leadEmail.trim(),
          subject: `Analisi personalizzata per ${leadName}`,
          body: message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore invio email");
      }

      // Salva email nel lead se non presente
      if (!email) {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: leadEmail.trim(), outreachChannel: "EMAIL" }),
        });
      }

      toast.success("Email inviata con successo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore invio");
    } finally {
      setLogging(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
    toast.success("Messaggio copiato!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          Invio Messaggio
          {outreachChannel && (
            <Badge variant="outline" className="ml-auto">
              {outreachChannel === "WA" ? (
                <><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</>
              ) : (
                <><Mail className="h-3 w-3 mr-1" /> Email</>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selettore canale */}
        <div className="flex items-center gap-2">
          <Button
            variant={channel === "WA" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setChannel("WA");
              regenerateMessage("WA", messageType);
            }}
            disabled={!canWA}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
            {!canWA && <AlertCircle className="h-3 w-3 ml-1 text-muted-foreground" />}
          </Button>
          <Button
            variant={channel === "EMAIL" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setChannel("EMAIL");
              regenerateMessage("EMAIL", messageType);
            }}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
          {outreachChannel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChannelSwitch}
              disabled={changingChannel}
              title="Cambia canale predefinito"
            >
              {changingChannel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Email input (se canale email) */}
        {channel === "EMAIL" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Email prospect</Label>
            <Input
              type="email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="info@esempio.it"
              className="h-8 text-sm"
            />
          </div>
        )}

        {/* Tipo messaggio */}
        <div className="flex gap-2">
          <Button
            variant={messageType === "first" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              setMessageType("first");
              regenerateMessage(channel, "first");
            }}
          >
            Primo contatto
          </Button>
          <Button
            variant={messageType === "followup" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              setMessageType("followup");
              regenerateMessage(channel, "followup");
            }}
          >
            Follow-up
          </Button>
        </div>

        {/* Messaggio editabile */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className="text-sm resize-y"
        />

        {/* Azioni */}
        <div className="flex gap-2">
          {channel === "WA" ? (
            <Button
              onClick={handleSendWA}
              disabled={logging || !canWA}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {logging ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Apri WhatsApp
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={handleSendEmail}
              disabled={logging || !canEmail}
              className="flex-1"
            >
              {logging ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Invia Email
            </Button>
          )}
          <Button variant="outline" onClick={copyMessage}>
            {copiedMsg ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Info canale WA */}
        {channel === "WA" && !canWA && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Nessun numero WA trovato. Usa il canale Email come fallback.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
