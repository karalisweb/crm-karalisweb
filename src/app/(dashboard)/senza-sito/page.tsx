"use client";

import { Globe } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function SenzaSitoPage() {
  return (
    <PipelinePage
      title="Senza Sito"
      subtitle="Lead senza website (archivio morto)"
      emptyIcon={<Globe className="h-12 w-12" />}
      emptyTitle="Nessun lead senza sito"
      emptySubtitle="I lead senza website appariranno qui"
      stages={["SENZA_SITO"]}
    />
  );
}
