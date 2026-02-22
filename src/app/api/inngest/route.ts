import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { runAuditFunction, runAuditBatchFunction } from "@/inngest/functions/run-audit";
import { checkRecontactFunction } from "@/inngest/functions/check-recontact";

// Esporta handler per Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runAuditFunction, runAuditBatchFunction, checkRecontactFunction],
});
