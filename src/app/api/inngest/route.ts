import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { runAuditFunction, runAuditBatchFunction } from "@/inngest/functions/run-audit";
import { checkRecontactFunction } from "@/inngest/functions/check-recontact";
import { runScheduledSearchesFunction } from "@/inngest/functions/scheduled-search";
import { runGeminiFunction } from "@/inngest/functions/run-gemini";

// Esporta handler per Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runAuditFunction, runAuditBatchFunction, checkRecontactFunction, runScheduledSearchesFunction, runGeminiFunction],
});
