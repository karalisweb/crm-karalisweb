import { inngest } from "../client";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Funzione Inngest cron che controlla i lead DA_RICHIAMARE_6M
 * Eseguita ogni giorno alle 8:00
 *
 * Se recontactAt <= now(), sposta il lead a DA_QUALIFICARE
 * e crea un'attivita di log
 */
export const checkRecontactFunction = inngest.createFunction(
  {
    id: "check-recontact",
    name: "Check 6-Month Recontact",
  },
  { cron: "0 8 * * *" }, // Ogni giorno alle 8:00
  async ({ step }) => {
    // Step 1: Trova lead pronti per il recontact
    const leadsToRecontact = await step.run("find-leads", async () => {
      return db.lead.findMany({
        where: {
          pipelineStage: "DA_RICHIAMARE_6M",
          recontactAt: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
          name: true,
          recontactAt: true,
        },
      });
    });

    if (leadsToRecontact.length === 0) {
      return { moved: 0 };
    }

    // Step 2: Sposta ogni lead a DA_QUALIFICARE
    const movedCount = await step.run("move-leads", async () => {
      let count = 0;

      for (const lead of leadsToRecontact) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            pipelineStage: "DA_QUALIFICARE",
            recontactAt: null,
            // Reset touchpoint per nuovo ciclo
            videoSentAt: null,
            videoViewedAt: null,
            letterSentAt: null,
            linkedinSentAt: null,
            respondedAt: null,
            respondedVia: null,
            videoScriptData: Prisma.DbNull,
          },
        });

        // Crea activity log
        await db.activity.create({
          data: {
            leadId: lead.id,
            type: "STAGE_CHANGE",
            notes: `Ritornato in pipeline dopo periodo di attesa 6 mesi. Pronto per nuova qualificazione.`,
          },
        });

        count++;
      }

      return count;
    });

    return {
      moved: movedCount,
      leads: leadsToRecontact.map((l) => l.name),
    };
  }
);
