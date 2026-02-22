"use client";

import { FileText } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function PropostePage() {
  return (
    <PipelinePage
      title="Proposte Inviate"
      subtitle="Lead con proposta commerciale inviata"
      emptyIcon={<FileText className="h-12 w-12" />}
      emptyTitle="Nessuna proposta inviata"
      emptySubtitle="Le proposte inviate appariranno qui"
      stages={["PROPOSTA_INVIATA"]}
      showOfferSent
    />
  );
}
