"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  Youtube,
  Globe,
  Rocket,
  Target,
  MessageCircle,
  Mail,
  Send,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSidebar } from "@/components/layout/sidebar-context";

interface VideoOutreachInlineProps {
  leadId: string;
  leadName: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  videoYoutubeUrl: string | null;
  videoLandingUrl: string | null;
  landingPuntoDolore: string | null;
  onVideoSent: () => void;
}

function addUtm(url: string | null): string {
  if (!url) return "[link analisi]";
  return url + (url.includes("?") ? "&" : "?") + "utm=client";
}

function generateMessage(leadName: string, landingUrl: string | null, channel: "WA" | "EMAIL"): string {
  const firstName = leadName.split(" ")[0];
  const videoLink = addUtm(landingUrl);

  if (channel === "WA") {
    return `Ciao ${firstName}, sono Alessio Loi, fondatore di Karalisweb.

Ho preparato un'analisi personalizzata per ${leadName} — un breve video dove ti mostro alcune opportunità concrete che ho individuato navigando il vostro sito.

Eccola qui: ${videoLink}

Se hai 10 minuti, fammi sapere — te la presento volentieri!`;
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

export function VideoOutreachInline({
  leadId,
  leadName,
  phone,
  whatsappNumber,
  email: initialEmail,
  videoYoutubeUrl: initialYoutubeUrl,
  videoLandingUrl: initialLandingUrl,
  landingPuntoDolore: initialPuntoDolore,
  onVideoSent,
}: VideoOutreachInlineProps) {
  const { refreshBadges } = useSidebar();

  // State
  const [puntoDolore, setPuntoDolore] = useState(initialPuntoDolore || "");
  const [savingPuntoDolore, setSavingPuntoDolore] = useState(false);

  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl || "");
  const [savingYoutube, setSavingYoutube] = useState(false);

  const [landingUrl, setLandingUrl] = useState(initialLandingUrl || "");
  const [creatingLanding, setCreatingLanding] = useState(false);

  const [channel, setChannel] = useState<"WA" | "EMAIL">(whatsappNumber ? "WA" : "EMAIL");
  const [leadEmail, setLeadEmail] = useState(initialEmail || "");
  const [message, setMessage] = useState(() =>
    generateMessage(leadName, initialLandingUrl, whatsappNumber ? "WA" : "EMAIL")
  );
  const [sending, setSending] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const hasYoutube = !!youtubeUrl;
  const hasLanding = !!landingUrl;

  // Save punto di dolore
  const savePuntoDolore = useCallback(async () => {
    if (!puntoDolore.trim()) return;
    setSavingPuntoDolore(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPuntoDolore: puntoDolore.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Punto di dolore salvato");
    } catch {
      toast.error("Errore salvataggio");
    } finally {
      setSavingPuntoDolore(false);
    }
  }, [leadId, puntoDolore]);

  // Save YouTube URL
  const saveYoutubeUrl = useCallback(async () => {
    if (!youtubeUrl.trim()) return;
    setSavingYoutube(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: youtubeUrl.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("YouTube URL salvato");
    } catch {
      toast.error("Errore salvataggio YouTube URL");
    } finally {
      setSavingYoutube(false);
    }
  }, [leadId, youtubeUrl]);

  // Create landing page
  const createLanding = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Inserisci prima il YouTube URL");
      return;
    }
    setCreatingLanding(true);
    try {
      // Save YouTube URL first
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoYoutubeUrl: youtubeUrl.trim() }),
      });

      const res = await fetch(`/api/leads/${leadId}/create-landing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore creazione landing");

      setLandingUrl(data.url);
      // Update message with new landing URL
      setMessage(generateMessage(leadName, data.url, channel));
      toast.success("Landing page creata!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore creazione landing");
    } finally {
      setCreatingLanding(false);
    }
  };

  // Switch channel
  const switchChannel = () => {
    const newChannel = channel === "WA" ? "EMAIL" : "WA";
    setChannel(newChannel);
    setMessage(generateMessage(leadName, landingUrl, newChannel));
  };

  // Send message
  const handleSend = async () => {
    if (channel === "WA") {
      const number = whatsappNumber || phone || "";
      const cleanNumber = number.replace(/[^0-9+]/g, "");
      if (!cleanNumber) {
        toast.error("Nessun numero WhatsApp disponibile");
        return;
      }
      window.open(
        `https://wa.me/${cleanNumber.replace("+", "")}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    } else {
      // Email via API
      if (!leadEmail.trim()) {
        toast.error("Inserisci l'email del prospect");
        return;
      }
      setSending(true);
      try {
        // Save email first
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: leadEmail.trim() }),
        });

        // Send email
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
        toast.success("Email inviata!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore invio email");
        setSending(false);
        return;
      }
    }

    // Log as sent + move to VIDEO_INVIATO
    try {
      await fetch(`/api/leads/${leadId}/quick-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VIDEO_SENT" }),
      });
      refreshBadges();
      onVideoSent();
      toast.success(`${leadName} → Video Inviato`);
    } catch {
      // non-critical
    } finally {
      setSending(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div
      className="mt-4 pt-4 border-t border-border space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Completa e Invia
      </p>

      {/* Step 1: Punto di dolore */}
      <div className="space-y-1">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-orange-500" />
          Punto di dolore
          {puntoDolore.trim() && <Check className="h-3 w-3 text-green-500" />}
        </Label>
        <Textarea
          value={puntoDolore}
          onChange={(e) => setPuntoDolore(e.target.value)}
          onBlur={savePuntoDolore}
          placeholder="Es: Il vostro sito non comunica cosa vi rende diversi..."
          className="text-sm min-h-[50px] resize-y"
          disabled={hasLanding}
        />
        {savingPuntoDolore && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Salvataggio...
          </span>
        )}
      </div>

      {/* Step 2: YouTube URL */}
      <div className="space-y-1">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Youtube className="h-3.5 w-3.5 text-red-600" />
          Video YouTube
          {hasYoutube && <Check className="h-3 w-3 text-green-500" />}
        </Label>
        <div className="flex gap-2">
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onBlur={saveYoutubeUrl}
            onKeyDown={(e) => e.key === "Enter" && saveYoutubeUrl()}
            placeholder="https://youtu.be/..."
            className="text-sm h-8"
            disabled={hasLanding}
          />
          {savingYoutube && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
        </div>
      </div>

      {/* Step 3: Landing Page */}
      <div className="space-y-1">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-blue-500" />
          Landing Page
          {hasLanding && <Check className="h-3 w-3 text-green-500" />}
        </Label>
        {!hasLanding ? (
          <Button
            onClick={createLanding}
            disabled={creatingLanding || !hasYoutube}
            className="w-full"
            size="sm"
          >
            {creatingLanding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {creatingLanding ? "Creazione..." : "Crea Landing Page"}
          </Button>
        ) : (
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
          >
            {landingUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Step 4: Invio messaggio */}
      {hasLanding && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Invia Messaggio
            </p>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={switchChannel}>
              {channel === "WA" ? (
                <><MessageCircle className="h-3 w-3 mr-1" /> WhatsApp</>
              ) : (
                <><Mail className="h-3 w-3 mr-1" /> Email</>
              )}
            </Button>
          </div>

          {channel === "EMAIL" && (
            <Input
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="email@azienda.it"
              className="text-sm h-8"
            />
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="text-sm min-h-[80px] resize-y"
          />

          <div className="flex gap-2">
            <Button onClick={copyMessage} variant="outline" size="sm" className="text-xs">
              {copiedMsg ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              Copia
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {channel === "WA" ? "Invia WhatsApp" : "Invia Email"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
