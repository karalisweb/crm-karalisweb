"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  Clock,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface MessagingHubProps {
  leadId: string;
  leadName: string;
  whatsappNumber: string | null;
  email: string | null;
  outreachChannel: string | null;
  landingUrl: string | null;
  phone: string | null;
  landingPuntoDolore: string | null;
  videoViewsCount: number;
  videoFirstPlayAt: string | null;
  videoMaxWatchPercent: number | null;
  videoCompletedAt: string | null;
  unsubscribed: boolean;
  activities: Array<{
    id: string;
    type: string;
    notes: string | null;
    createdAt: string;
  }>;
}

type MessageType = "first" | "followup1" | "followup2" | "followup3";

interface EmailSettings {
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
}

// Default templates
const DEFAULT_TEMPLATES: Record<string, (name: string, company: string, url: string) => string> = {
  tplFirstWa: (name, company, url) =>
    `Ciao ${name}, sono Alessio Loi, fondatore di Karalisweb.\n\nHo preparato un'analisi personalizzata per ${company} — un breve video dove ti mostro alcune opportunità concrete che ho individuato navigando il vostro sito.\n\nEccola qui: ${url}\n\nDura pochi minuti. Fammi sapere se preferisci ricevere aggiornamenti via email invece che qui su WhatsApp!`,
  tplFirstEmail: (name, company, url) =>
    `Buongiorno ${name},\n\nSono Alessio Loi, fondatore di Karalisweb.\n\nHo preparato un'analisi personalizzata per ${company}: un breve video dove le mostro alcune opportunità concrete che ho individuato navigando il vostro sito.\n\nPuò visionarla qui: ${url}\n\nSe preferisce, posso contattarla via WhatsApp per un riscontro più rapido.\n\nCordiali saluti,\nAlessio Loi\nKaralisweb`,
  tplFollowup1Wa: (name, _company, url) =>
    `Ciao ${name}, qualche giorno fa ti avevo inviato un'analisi personalizzata del tuo sito. Magari ti è sfuggita — eccola qui: ${url}\n\nFammi sapere se hai 10 minuti per vederla insieme!`,
  tplFollowup1Email: (name, _company, url) =>
    `Buongiorno ${name},\n\nLe scrivo per un breve follow-up: qualche giorno fa le avevo inviato un'analisi personalizzata del vostro sito.\n\nSe non ha avuto modo di visionarla, può trovarla qui: ${url}\n\nSarei felice di dedicarle 10 minuti per mostrarle i punti principali. Quando le farebbe comodo?\n\nCordiali saluti,\nAlessio Loi\nKaralisweb`,
  tplFollowup2Wa: (name, _company, url) =>
    `Ciao ${name}, è la terza volta che ti scrivo — prometto che è l'ultima! 😄\n\nSe hai 2 minuti, dai un'occhiata alla tua analisi: ${url}\n\nSe non ti interessa, nessun problema — scrivimi "no" e non ti disturbo più.`,
  tplFollowup2Email: (name, _company, url) =>
    `Buongiorno ${name},\n\nMi permetto un ultimo follow-up: l'analisi che ho preparato per voi è ancora disponibile qui: ${url}\n\nSe non è il momento giusto, capisco perfettamente. In caso contrario, sono disponibile per una breve call di 10 minuti.\n\nCordiali saluti,\nAlessio Loi\nKaralisweb`,
  tplFollowup3Wa: (name, _company, _url) =>
    `Ciao ${name}, solo un ultimo messaggio. Se in futuro avessi bisogno di supporto per il sito o il marketing digitale, sono qui.\n\nBuon lavoro! 👋\nAlessio`,
  tplFollowup3Email: (name, _company, _url) =>
    `Buongiorno ${name},\n\nNon le scrivo più, non voglio essere invadente.\n\nSe in futuro avesse bisogno di supporto per il sito web o il marketing digitale, sarò felice di aiutarla.\n\nLe auguro buon lavoro.\n\nCordiali saluti,\nAlessio Loi\nKaralisweb`,
};

function applyTemplate(
  template: string | null,
  defaultKey: string,
  leadName: string,
  landingUrl: string | null
): string {
  const firstName = leadName.split(" ")[0];
  const rawUrl = landingUrl || "[link analisi]";
  const url = landingUrl ? landingUrl + (landingUrl.includes("?") ? "&" : "?") + "utm=client" : rawUrl;

  if (template) {
    return template
      .replace(/\{nome\}/g, firstName)
      .replace(/\{azienda\}/g, leadName)
      .replace(/\{landingUrl\}/g, url);
  }

  const defaultFn = DEFAULT_TEMPLATES[defaultKey];
  return defaultFn ? defaultFn(firstName, leadName, url) : "";
}

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  first: "Primo contatto",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
  followup3: "Follow-up 3",
};

const TEMPLATE_KEYS: Record<MessageType, { wa: string; email: string }> = {
  first: { wa: "tplFirstWa", email: "tplFirstEmail" },
  followup1: { wa: "tplFollowup1Wa", email: "tplFollowup1Email" },
  followup2: { wa: "tplFollowup2Wa", email: "tplFollowup2Email" },
  followup3: { wa: "tplFollowup3Wa", email: "tplFollowup3Email" },
};

// Filtra solo activity legate a messaggi
const MESSAGE_ACTIVITY_TYPES = [
  "EMAIL_OUTREACH",
  "WHATSAPP_SENT",
  "VIDEO_SENT",
  "FOLLOW_UP",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "FOLLOW_UP_3",
  "LINKEDIN_SENT",
];

export function MessagingHub({
  leadId,
  leadName,
  whatsappNumber,
  email,
  outreachChannel,
  landingUrl,
  phone,
  landingPuntoDolore,
  videoViewsCount,
  videoFirstPlayAt,
  videoMaxWatchPercent,
  videoCompletedAt,
  unsubscribed,
  activities,
}: MessagingHubProps) {
  const [channel, setChannel] = useState<"WA" | "EMAIL">(
    (outreachChannel as "WA" | "EMAIL") || (whatsappNumber ? "WA" : "EMAIL")
  );
  const [messageType, setMessageType] = useState<MessageType>("first");
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [leadEmail, setLeadEmail] = useState(email || "");
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);

  const waNumber = whatsappNumber || phone;
  const canWA = !!waNumber;
  const canEmail = !!leadEmail.trim();

  // Carica settings da API
  useEffect(() => {
    fetch("/api/settings/email-messaging")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  // Rigenera messaggio quando cambiano parametri
  const regenerateMessage = useCallback(
    (ch: "WA" | "EMAIL", type: MessageType) => {
      const keys = TEMPLATE_KEYS[type];
      const templateKey = ch === "WA" ? keys.wa : keys.email;
      const settingValue = settings?.[templateKey as keyof EmailSettings] ?? null;
      const msg = applyTemplate(settingValue, templateKey, leadName, landingUrl);
      setMessage(msg);

      // Aggiorna anche l'oggetto email
      if (ch === "EMAIL") {
        const subjectTemplate = type === "first"
          ? settings?.emailSubjectFirst
          : settings?.emailSubjectFollowup;
        const defaultSubject = type === "first"
          ? `Analisi personalizzata per ${leadName}`
          : `Re: Analisi per ${leadName}`;
        const subject = subjectTemplate
          ? subjectTemplate.replace(/\{nome\}/g, leadName.split(" ")[0]).replace(/\{azienda\}/g, leadName)
          : defaultSubject;
        setEmailSubject(subject);
      }
    },
    [leadName, landingUrl, settings]
  );

  // Init messaggio quando settings caricate
  useEffect(() => {
    if (settings !== null) {
      regenerateMessage(channel, messageType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSendWA = async () => {
    if (!waNumber) return;
    const cleanNumber = waNumber.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?/, "");
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    setSending(true);
    try {
      await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WHATSAPP_SENT",
          notes: `Messaggio WA ${MESSAGE_TYPE_LABELS[messageType]} inviato`,
        }),
      });

      if (!outreachChannel) {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outreachChannel: "WA" }),
        });
      }

      window.open(waUrl, "_blank");
      toast.success("WhatsApp aperto");
    } catch {
      toast.error("Errore nel logging");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!leadEmail.trim()) {
      toast.error("Inserisci l'email del prospect");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: leadEmail.trim(),
          subject: emailSubject || `Analisi personalizzata per ${leadName}`,
          body: message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore invio email");
      }

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
      setSending(false);
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

  const messageActivities = activities.filter((a) =>
    MESSAGE_ACTIVITY_TYPES.includes(a.type)
  );

  return (
    <div className="space-y-4">
      {/* Unsubscribed warning */}
      {unsubscribed && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">
                Questo lead si è disiscritto e non desidera ricevere comunicazioni email.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riepilogo compatto */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {outreachChannel && (
              <Badge variant="outline">
                {outreachChannel === "WA" ? (
                  <><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</>
                ) : (
                  <><Mail className="h-3 w-3 mr-1" /> Email</>
                )}
              </Badge>
            )}
            {videoViewsCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                {videoCompletedAt
                  ? "Video completato"
                  : videoMaxWatchPercent
                    ? `Video ${videoMaxWatchPercent}%`
                    : "Video visto"}
              </Badge>
            )}
            {videoFirstPlayAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Play: {new Date(videoFirstPlayAt).toLocaleDateString("it-IT")}
              </span>
            )}
            {landingPuntoDolore && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {landingPuntoDolore.length > 60
                  ? landingPuntoDolore.slice(0, 60) + "..."
                  : landingPuntoDolore}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Composer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Componi Messaggio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canale */}
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
          </div>

          {/* Tipo messaggio */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(MESSAGE_TYPE_LABELS) as MessageType[]).map((type) => (
              <Button
                key={type}
                variant={messageType === type ? "secondary" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => {
                  setMessageType(type);
                  regenerateMessage(channel, type);
                }}
              >
                {MESSAGE_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>

          {/* Email fields */}
          {channel === "EMAIL" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email destinatario</Label>
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="info@esempio.it"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Oggetto</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Oggetto email"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Messaggio */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="text-sm resize-y"
          />

          {/* Landing URL preview */}
          {landingUrl && (
            <p className="text-xs text-muted-foreground truncate">
              Landing: {landingUrl}
            </p>
          )}

          {/* Azioni */}
          <div className="flex gap-2">
            {channel === "WA" ? (
              <Button
                onClick={handleSendWA}
                disabled={sending || !canWA}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sending ? (
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
                disabled={sending || !canEmail || unsubscribed}
                className="flex-1"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Invia Email
              </Button>
            )}
            <Button variant="outline" onClick={copyMessage}>
              {copiedMsg ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {channel === "WA" && !canWA && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Nessun numero WA trovato. Usa il canale Email.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Storico messaggi */}
      {messageActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Storico Messaggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messageActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0"
                >
                  <div className="mt-0.5">
                    {activity.type.includes("WHATSAPP") || activity.type === "VIDEO_SENT" ? (
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : activity.type.includes("EMAIL") ? (
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
