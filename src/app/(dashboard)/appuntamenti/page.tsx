"use client";

import { Calendar } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function AppuntamentiPage() {
  return (
    <PipelinePage
      title="Appuntamenti"
      subtitle="Call di vendita MSD fissate"
      emptyIcon={<Calendar className="h-12 w-12" />}
      emptyTitle="Nessun appuntamento"
      emptySubtitle="Le call fissate appariranno qui"
      stages={["CALL_FISSATA", "NON_PRESENTATO"]}
      showAppointment
    />
  );
}
