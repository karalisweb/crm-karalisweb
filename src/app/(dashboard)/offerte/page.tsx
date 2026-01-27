"use client";

import { Mail } from "lucide-react";
import { PipelinePage } from "@/components/leads/pipeline-page";

export default function OffertePage() {
  return (
    <PipelinePage
      title="Offerte Inviate"
      subtitle="In attesa di pagamento MSD (600 + IVA)"
      emptyIcon={<Mail className="h-12 w-12" />}
      emptyTitle="Nessuna offerta in attesa"
      emptySubtitle="Le offerte inviate appariranno qui"
      stages={["OFFERTA_INVIATA"]}
      showOfferSent
    />
  );
}
