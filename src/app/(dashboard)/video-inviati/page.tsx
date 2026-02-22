"use client";

import { Send } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function VideoInviatiPage() {
  return (
    <PipelinePage
      title="Video Inviati"
      subtitle="Lead a cui e stato inviato il video personalizzato"
      emptyIcon={<Send className="h-12 w-12" />}
      emptyTitle="Nessun video inviato"
      emptySubtitle="I video inviati appariranno qui"
      stages={["VIDEO_INVIATO"]}
    />
  );
}
