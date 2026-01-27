import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: "postgresql://alessio@localhost:5432/sales_app" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Import diretto delle funzioni
import { runFullAudit } from './src/lib/audit/index.js';
import { detectCommercialSignals, assignCommercialTag } from './src/lib/commercial/index.js';

async function main() {
  // Test su un sito reale
  const testWebsite = "https://www.subito.it";
  
  console.log("=== TEST AUDIT COMPLETO ===");
  console.log("Website:", testWebsite);
  
  try {
    // 1. Audit tecnico
    console.log("\n1. Eseguendo audit tecnico...");
    const auditResult = await runFullAudit({
      website: testWebsite,
      googleRating: 4.2,
      googleReviewsCount: 150,
    });
    
    console.log("Score:", auditResult.opportunityScore);
    console.log("Issues:", auditResult.issues.length);
    console.log("Talking Points:", auditResult.talkingPoints.length);
    
    // 2. Fetch HTML per segnali commerciali
    console.log("\n2. Analizzando segnali commerciali...");
    
    const response = await fetch(testWebsite, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const html = await response.text();
    const domain = new URL(testWebsite).hostname;
    
    const signals = await detectCommercialSignals({
      html,
      domain,
      brandName: "Subito",
      skipSerp: true, // Skip SERP check (costa soldi)
    });
    
    console.log("Commercial Signals:", JSON.stringify(signals, null, 2));
    
    // 3. Assegna tag commerciale
    console.log("\n3. Assegnando tag commerciale...");
    const tagResult = assignCommercialTag({ signals });
    
    console.log("Tag:", tagResult.tag);
    console.log("Reason:", tagResult.tagReason);
    console.log("Is Callable:", tagResult.isCallable);
    console.log("Priority:", tagResult.priority);
    
    // 4. Mostra audit data completo
    console.log("\n4. Audit Data (chiavi):", Object.keys(auditResult.auditData));
    if (auditResult.auditData.tracking) {
      console.log("Tracking:", JSON.stringify(auditResult.auditData.tracking, null, 2));
    }
    
    console.log("\n5. Issues completi:");
    auditResult.issues.forEach((issue, i) => console.log("  " + (i+1) + ". " + issue));
    
    console.log("\n6. Talking Points (primi 10):");
    auditResult.talkingPoints.slice(0, 10).forEach((tp, i) => console.log("  " + (i+1) + ". " + tp));
    
  } catch (error) {
    console.error("ERRORE:", error.message);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
