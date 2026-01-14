import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Crea utente admin
  const hashedPassword = await hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@agenzia.it" },
    update: {},
    create: {
      email: "admin@agenzia.it",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log("Created admin user:", adminUser.email);

  // Crea alcuni lead di esempio
  const exampleLeads = [
    {
      name: "Ristorante Da Mario",
      address: "Via Roma 123, Milano",
      phone: "+39 02 12345678",
      website: "https://example.com",
      category: "Ristorante",
      googleRating: 4.2,
      googleReviewsCount: 45,
      placeId: "example_place_1",
      pipelineStage: "NEW" as const,
    },
    {
      name: "Hotel Bellavista",
      address: "Piazza Duomo 1, Firenze",
      phone: "+39 055 87654321",
      website: "https://example2.com",
      category: "Hotel",
      googleRating: 3.8,
      googleReviewsCount: 120,
      placeId: "example_place_2",
      pipelineStage: "TO_CALL" as const,
    },
    {
      name: "Palestra FitLife",
      address: "Via Garibaldi 45, Torino",
      phone: "+39 011 11223344",
      website: null,
      category: "Palestra",
      googleRating: 4.5,
      googleReviewsCount: 28,
      placeId: "example_place_3",
      pipelineStage: "NEW" as const,
      auditStatus: "NO_WEBSITE" as const,
    },
  ];

  for (const leadData of exampleLeads) {
    const lead = await prisma.lead.upsert({
      where: { placeId: leadData.placeId },
      update: {},
      create: leadData,
    });
    console.log("Created lead:", lead.name);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
