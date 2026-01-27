import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: "postgresql://alessio@localhost:5432/sales_app" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const leads = await db.lead.findMany({
    where: { auditStatus: 'COMPLETED' },
    take: 5,
    select: {
      id: true,
      name: true,
      website: true,
      auditStatus: true,
      opportunityScore: true,
      commercialTag: true,
      talkingPoints: true,
      auditData: true,
      commercialSignals: true,
    }
  });
  
  console.log('=== LEAD CON AUDIT COMPLETATI ===');
  console.log('Totale trovati:', leads.length);
  
  for (const lead of leads) {
    console.log('\n---');
    console.log('Nome:', lead.name);
    console.log('Website:', lead.website);
    console.log('Score:', lead.opportunityScore);
    console.log('Commercial Tag:', lead.commercialTag);
    console.log('Talking Points count:', lead.talkingPoints?.length || 0);
    console.log('Talking Points (primi 3):', JSON.stringify(lead.talkingPoints?.slice(0, 3)) || 'VUOTI');
    console.log('AuditData keys:', lead.auditData ? Object.keys(lead.auditData) : 'NULL');
    
    if (lead.auditData) {
      const ad = lead.auditData;
      console.log('  - website:', ad.website ? 'presente' : 'MANCANTE');
      console.log('  - seo:', ad.seo ? 'presente' : 'MANCANTE');
      console.log('  - tracking:', ad.tracking ? 'presente' : 'MANCANTE');
      console.log('  - issues:', ad.issues?.length || 0, 'problemi');
    }
    
    console.log('Commercial Signals:', JSON.stringify(lead.commercialSignals, null, 2) || 'NULL');
  }
  
  // Conta totali per status
  const stats = await db.lead.groupBy({
    by: ['auditStatus'],
    _count: true
  });
  console.log('\n=== STATISTICHE AUDIT ===');
  console.log(JSON.stringify(stats, null, 2));
  
  // Conta per commercial tag
  const tagStats = await db.lead.groupBy({
    by: ['commercialTag'],
    _count: true
  });
  console.log('\n=== STATISTICHE COMMERCIAL TAG ===');
  console.log(JSON.stringify(tagStats, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
