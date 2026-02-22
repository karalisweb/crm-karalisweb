/**
 * Script diagnostico per verificare lo stato isCallable dei lead
 */
import { db } from "../src/lib/db";

async function main() {
  console.log("=== Diagnosi isCallable ===\n");

  // 1. Conta per commercial_tag e is_callable
  const byTag = await db.lead.groupBy({
    by: ["commercialTag", "isCallable"],
    where: { auditStatus: "COMPLETED" },
    _count: true,
  });

  console.log("Lead completati per commercial_tag e isCallable:");
  console.table(byTag.map(r => ({
    commercialTag: r.commercialTag || "NULL",
    isCallable: r.isCallable,
    count: r._count,
  })));

  // 2. Lead in DA_CHIAMARE che non sono callable
  const dachiamarNotCallable = await db.lead.findMany({
    where: {
      pipelineStage: "DA_QUALIFICARE",
      isCallable: false,
    },
    select: {
      id: true,
      name: true,
      commercialTag: true,
      opportunityScore: true,
      isCallable: true,
    },
  });

  console.log("\n\nLead in DA_QUALIFICARE ma con isCallable=false:");
  console.table(dachiamarNotCallable);

  // 3. Verifica quanti dovrebbero essere callable in base al tag
  const shouldBeCallable = await db.lead.count({
    where: {
      auditStatus: "COMPLETED",
      commercialTag: {
        in: ["ADS_ATTIVE_CONTROLLO_ASSENTE", "TRAFFICO_SENZA_DIREZIONE", "STRUTTURA_OK_NON_PRIORITIZZATA", "DA_APPROFONDIRE"],
      },
      isCallable: false, // Questi dovrebbero essere true!
    },
  });

  console.log(`\n\nLead che DOVREBBERO essere callable ma hanno isCallable=false: ${shouldBeCallable}`);

  // 4. Conta lead per pipeline stage
  const byStage = await db.lead.groupBy({
    by: ["pipelineStage"],
    _count: true,
  });

  console.log("\n\nLead per pipeline stage:");
  console.table(byStage.map(r => ({
    pipelineStage: r.pipelineStage,
    count: r._count,
  })));

  await db.$disconnect();
}

main().catch(console.error);
