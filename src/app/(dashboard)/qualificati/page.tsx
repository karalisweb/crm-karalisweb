"use client";

import { UserCheck } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function QualificatiPage() {
  return (
    <PipelinePage
      title="Qualificati"
      subtitle="Lead qualificati da Daniela, pronti per lo script video"
      emptyIcon={<UserCheck className="h-12 w-12" />}
      emptyTitle="Nessun lead qualificato"
      emptySubtitle="I lead qualificati appariranno qui"
      stages={["QUALIFICATO"]}
    />
  );
}
