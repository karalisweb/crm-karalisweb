import { Inngest } from "inngest";

// Crea client Inngest
export const inngest = new Inngest({
  id: "sales-support-crm",
  name: "Sales Support CRM",
});

// Definisci i tipi di eventi
export type AuditRunEvent = {
  name: "audit/run";
  data: {
    leadId: string;
    website: string;
    googleRating?: number | null;
    googleReviewsCount?: number | null;
  };
};

export type AuditBatchEvent = {
  name: "audit/batch";
  data: {
    searchId: string;
  };
};

export type Events = {
  "audit/run": AuditRunEvent;
  "audit/batch": AuditBatchEvent;
};
