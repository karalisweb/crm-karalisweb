"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { VideoOutreachStepper } from "./video-outreach-stepper";

interface WrapperProps {
  leadId: string;
}

export function VideoOutreachStepperWrapper({ leadId }: WrapperProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch (err) {
      console.error("Error fetching lead:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Errore nel caricamento dei dati del lead.
      </p>
    );
  }

  return (
    <VideoOutreachStepper
      leadId={lead.id}
      leadName={lead.name}
      website={lead.website}
      analystOutput={lead.analystOutput}
      analystApprovedAt={lead.analystApprovedAt}
      geminiAnalysis={lead.geminiAnalysis}
      scriptApprovedAt={lead.scriptApprovedAt}
      puntoDoloreBreve={lead.puntoDoloreBreve}
      puntoDoloreLungo={lead.puntoDoloreLungo}
      videoYoutubeUrl={lead.videoYoutubeUrl}
      videoLandingUrl={lead.videoLandingUrl}
      videoTrackingToken={lead.videoTrackingToken}
      videoSentAt={lead.videoSentAt}
      outreachChannel={lead.outreachChannel}
      whatsappNumber={lead.whatsappNumber}
      email={lead.email}
      phone={lead.phone}
      videoViewsCount={lead.videoViewsCount || 0}
      videoFirstPlayAt={lead.videoFirstPlayAt}
      videoMaxWatchPercent={lead.videoMaxWatchPercent}
      videoCompletedAt={lead.videoCompletedAt}
      onRefresh={fetchLead}
    />
  );
}
