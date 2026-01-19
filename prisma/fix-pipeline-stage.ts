/**
 * Script di migrazione per correggere i lead con audit completato
 * che sono ancora in stato NEW invece di TO_CALL.
 *
 * Eseguire con: npx tsx prisma/fix-pipeline-stage.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Cercando lead con audit completato ma ancora in NEW...\n");

  // Trova i lead da aggiornare
  const leadsToUpdate = await prisma.lead.findMany({
    where: {
      auditStatus: "COMPLETED",
      pipelineStage: "NEW",
    },
    select: {
      id: true,
      name: true,
      opportunityScore: true,
    },
  });

  console.log(`📊 Trovati ${leadsToUpdate.length} lead da aggiornare:\n`);

  if (leadsToUpdate.length === 0) {
    console.log("✅ Nessun lead da aggiornare!");
    return;
  }

  // Mostra i lead che verranno aggiornati
  leadsToUpdate.forEach((lead, index) => {
    console.log(`  ${index + 1}. ${lead.name} (Score: ${lead.opportunityScore ?? "N/A"})`);
  });

  console.log("\n🔄 Aggiornamento in corso...\n");

  // Aggiorna tutti i lead
  const result = await prisma.lead.updateMany({
    where: {
      auditStatus: "COMPLETED",
      pipelineStage: "NEW",
    },
    data: {
      pipelineStage: "TO_CALL",
    },
  });

  console.log(`✅ Aggiornati ${result.count} lead da NEW a TO_CALL!`);
}

main()
  .catch((e) => {
    console.error("❌ Errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
