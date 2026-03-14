"use client";

import { MessageCircle } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function TrattativePage() {
  return (
    <PipelinePage
      title="Trattative"
      subtitle="Lead che hanno risposto, call fissate e conversazioni in corso"
      emptyIcon={<MessageCircle className="h-12 w-12" />}
      emptyTitle="Nessuna trattativa in corso"
      emptySubtitle="I lead che rispondono ai tuoi touchpoint appariranno qui"
      stages={["CALL_FISSATA", "IN_TRATTATIVA"]}
      showAppointment
    />
  );
}
