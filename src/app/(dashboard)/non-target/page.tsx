"use client";

import { XCircle } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function NonTargetPage() {
  return (
    <PipelinePage
      title="Non Target"
      subtitle="Lead senza segnali ads (potrebbero essere falsi negativi)"
      emptyIcon={<XCircle className="h-12 w-12" />}
      emptyTitle="Nessun lead non target"
      emptySubtitle="I lead classificati come NON_TARGET appariranno qui"
      stages={["NON_TARGET"]}
    />
  );
}
