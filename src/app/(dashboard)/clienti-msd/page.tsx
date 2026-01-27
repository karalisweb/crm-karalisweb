"use client";

import { Trophy } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function ClientiMSDPage() {
  return (
    <PipelinePage
      title="Clienti MSD"
      subtitle="Clienti che hanno acquistato MSD"
      emptyIcon={<Trophy className="h-12 w-12" />}
      emptyTitle="Nessun cliente MSD"
      emptySubtitle="I clienti vinti appariranno qui"
      stages={["VINTO"]}
    />
  );
}
