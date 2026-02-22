"use client";

import { Trophy } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function ClientiPage() {
  return (
    <PipelinePage
      title="Clienti"
      subtitle="Clienti acquisiti"
      emptyIcon={<Trophy className="h-12 w-12" />}
      emptyTitle="Nessun cliente ancora"
      emptySubtitle="I clienti acquisiti appariranno qui"
      stages={["VINTO"]}
    />
  );
}
