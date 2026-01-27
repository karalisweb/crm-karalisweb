import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: "postgresql://alessio@localhost:5432/sales_app" });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const leads = await db.lead.findMany({
    select: {
      id: true,
      name: true,
      website: true,
      auditStatus: true,
      opportunityScore: true,
      commercialTag: true,
    }
  });
  
  console.log('=== TUTTI I LEAD NEL DATABASE ===');
  console.log('Totale:', leads.length);
  
  for (const lead of leads) {
    console.log('- ' + lead.name + ' | ' + (lead.website || 'NO WEBSITE') + ' | Status: ' + lead.auditStatus + ' | Score: ' + (lead.opportunityScore || 'N/A') + ' | Tag: ' + (lead.commercialTag || 'N/A'));
  }
}

main().catch(console.error).finally(() => db.$disconnect());
