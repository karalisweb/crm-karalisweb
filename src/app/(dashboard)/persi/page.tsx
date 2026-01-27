"use client";

import { XCircle } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function PersiPage() {
  return (
    <PipelinePage
      title="Persi"
      subtitle="Lead che non hanno convertito"
      emptyIcon={<XCircle className="h-12 w-12" />}
      emptyTitle="Nessun lead perso"
      emptySubtitle="I lead persi appariranno qui"
      stages={["PERSO"]}
      showLostReason
    />
  );
}
