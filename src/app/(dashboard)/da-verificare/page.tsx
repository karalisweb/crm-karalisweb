"use client";

import { AlertCircle } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function DaVerificarePage() {
  return (
    <PipelinePage
      title="Da Verificare"
      subtitle="Lead con segnali incerti che richiedono verifica manuale"
      emptyIcon={<AlertCircle className="h-12 w-12" />}
      emptyTitle="Nessun lead da verificare"
      emptySubtitle="I lead con tag DA_APPROFONDIRE appariranno qui"
      stages={["DA_VERIFICARE"]}
    />
  );
}
