import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: "postgresql://alessio@localhost:5432/sales_app" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  // Creo un lead con un sito REALE (karalisweb.com)
  const testLead = await db.lead.create({
    data: {
      name: "Karalisweb Test",
      website: "https://karalisweb.com",
      category: "Web Agency",
      address: "Quartu Sant'Elena, Sardegna",
      auditStatus: "PENDING",
    }
  });
  
  console.log("Lead creato con ID:", testLead.id);
  console.log("Website:", testLead.website);
  
  // Ora chiamo l'API di audit
  console.log("\n=== Avvio audit via API ===");
  
  const response = await fetch('http://localhost:3003/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: testLead.id })
  });
  
  const result = await response.json();
  console.log("Risposta API:", JSON.stringify(result, null, 2));
  
  // Ricarico il lead per vedere i dati salvati
  const updatedLead = await db.lead.findUnique({
    where: { id: testLead.id }
  });
  
  console.log("\n=== LEAD DOPO AUDIT ===");
  console.log("Audit Status:", updatedLead.auditStatus);
  console.log("Opportunity Score:", updatedLead.opportunityScore);
  console.log("Commercial Tag:", updatedLead.commercialTag);
  console.log("Commercial Tag Reason:", updatedLead.commercialTagReason);
  console.log("Is Callable:", updatedLead.isCallable);
  console.log("Talking Points count:", updatedLead.talkingPoints?.length || 0);
  console.log("Talking Points:", JSON.stringify(updatedLead.talkingPoints, null, 2));
  
  console.log("\n=== AUDIT DATA ===");
  if (updatedLead.auditData) {
    const ad = updatedLead.auditData;
    console.log("Keys:", Object.keys(ad));
    if (ad.website) {
      console.log("Website Performance:", ad.website.performance);
      console.log("Website LoadTime:", ad.website.loadTime);
      console.log("Has ContactForm:", ad.website.hasContactForm);
    }
    if (ad.tracking) {
      console.log("Has GA4:", ad.tracking.hasGA4);
      console.log("Has Facebook Pixel:", ad.tracking.hasFacebookPixel);
      console.log("Has Google Ads:", ad.tracking.hasGoogleAdsTag);
    }
    if (ad.issues) {
      console.log("Issues:", ad.issues);
    }
  } else {
    console.log("AuditData: NULL");
  }
  
  console.log("\n=== COMMERCIAL SIGNALS ===");
  console.log(JSON.stringify(updatedLead.commercialSignals, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
