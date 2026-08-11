/**
 * Test di isolamento fra clienti.
 *
 * È il criterio di completamento della Fase 1 del piano, testuale:
 *
 *   «Un `PROJECT_MEMBER` non riesce, in nessun modo, a leggere dati di
 *    un'altra Company. Verificato da test automatico, non da ispezione.»
 *
 * Il test costruisce due aziende con dati propri e verifica che nessun ruolo
 * limitato riesca a vedere oltre il proprio ambito, né leggendo né scrivendo.
 *
 * Richiede un PostgreSQL di sviluppo: `DATABASE_URL` deve puntare a localhost.
 * Rifiuta di girare contro qualunque altro host.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { tenantScoped } from "../tenant-guard";
import type { AccessContext } from "../access-context";
import { emptyContext } from "../access-context";

const URL = process.env.DATABASE_URL ?? "";
const isLocal = /localhost|127\.0\.0\.1/.test(URL);

let pool: Pool;
let db: PrismaClient;

const ids = {
  orgA: "", companyA: "", projectA: "", subjectA: "",
  orgB: "", companyB: "", projectB: "", subjectB: "",
  userAdmin: "", userOwnerA: "", userProjectA: "",
};

/** Contesto costruito a mano: il test verifica la guardia, non la risoluzione. */
function ctx(over: Partial<AccessContext>): AccessContext {
  return { ...emptyContext("test-user"), ...over };
}

describe.runIf(isLocal)("isolamento fra aziende", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: URL });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });

    const u = () => crypto.randomUUID();
    Object.assign(ids, {
      orgA: u(), companyA: u(), projectA: u(), subjectA: u(),
      orgB: u(), companyB: u(), projectB: u(), subjectB: u(),
      userAdmin: u(), userOwnerA: u(), userProjectA: u(),
    });

    for (const [org, comp, proj, subj, nome] of [
      [ids.orgA, ids.companyA, ids.projectA, ids.subjectA, "a"],
      [ids.orgB, ids.companyB, ids.projectB, ids.subjectB, "b"],
    ] as const) {
      await db.organization.create({ data: { id: org, name: `Org ${nome}`, slug: `org-${nome}-${org.slice(0, 8)}` } });
      await db.company.create({ data: { id: comp, organizationId: org, name: `Azienda ${nome}`, slug: `az-${nome}-${comp.slice(0, 8)}` } });
      await db.project.create({ data: { id: proj, companyId: comp, name: `Progetto ${nome}`, slug: "principale" } });
      await db.licence.create({ data: { companyId: comp } });
      await db.subject.create({ data: { id: subj, displayName: `Soggetto ${nome}`, companyId: comp } });
    }
  });

  afterAll(async () => {
    if (!db) return;
    for (const comp of [ids.companyA, ids.companyB]) {
      await db.subject.deleteMany({ where: { companyId: comp } });
      await db.licence.deleteMany({ where: { companyId: comp } });
      await db.project.deleteMany({ where: { companyId: comp } });
      await db.company.deleteMany({ where: { id: comp } });
    }
    await db.organization.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } });
    await db.$disconnect();
    await pool.end();
  });

  it("il PLATFORM_ADMIN vede entrambe le aziende", async () => {
    const scoped = tenantScoped(ctx({ isPlatformAdmin: true }));
    const trovati = await scoped.subject.findMany({
      where: { id: { in: [ids.subjectA, ids.subjectB] } },
    });
    expect(trovati).toHaveLength(2);
  });

  it("il COMPANY_OWNER di A vede solo i soggetti di A", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    const trovati = await scoped.subject.findMany({
      where: { id: { in: [ids.subjectA, ids.subjectB] } },
    });
    expect(trovati.map((s) => s.id)).toEqual([ids.subjectA]);
  });

  it("chiedere esplicitamente il soggetto di B non lo restituisce", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    const diretto = await scoped.subject.findFirst({ where: { id: ids.subjectB } });
    expect(diretto).toBeNull();
    expect(await scoped.subject.count({ where: { id: ids.subjectB } })).toBe(0);
  });

  it("PROJECT_MEMBER di A: nessun soggetto, nemmeno della propria azienda", async () => {
    // I soggetti stanno a livello di Azienda. Chi ha accesso a un solo
    // Progetto non ha accesso di Azienda: vedere tutto sarebbe una scalata.
    const scoped = tenantScoped(ctx({ projectIds: [ids.projectA], canSeeCommercialData: false }));
    expect(await scoped.subject.findMany()).toHaveLength(0);
  });

  it("PROJECT_MEMBER non vede alcuna licenza: nessun dato commerciale", async () => {
    const scoped = tenantScoped(ctx({ projectIds: [ids.projectA], canSeeCommercialData: false }));
    expect(await scoped.licence.findMany()).toHaveLength(0);
    expect(await scoped.licence.count()).toBe(0);
  });

  it("un utente senza alcuna membership non vede nulla", async () => {
    const scoped = tenantScoped(ctx({}));
    expect(await scoped.subject.findMany()).toHaveLength(0);
    expect(await scoped.company.findMany()).toHaveLength(0);
  });

  it("il COMPANY_OWNER di A vede la propria azienda e non quella di B", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    const aziende = await scoped.company.findMany({
      where: { id: { in: [ids.companyA, ids.companyB] } },
    });
    expect(aziende.map((a) => a.id)).toEqual([ids.companyA]);
  });

  it("non si scrive in un'azienda fuori ambito", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    await expect(
      scoped.subject.create({ data: { displayName: "Intruso", companyId: ids.companyB } }),
    ).rejects.toThrow(/Isolamento/);
  });

  it("non si modifica un soggetto di un'altra azienda", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    const esito = await scoped.subject.updateMany({
      where: { id: ids.subjectB },
      data: { displayName: "Dirottato" },
    });
    expect(esito.count).toBe(0);

    const controllo = await db.subject.findUnique({ where: { id: ids.subjectB } });
    expect(controllo?.displayName).toBe("Soggetto b");
  });

  it("non si cancella un soggetto di un'altra azienda", async () => {
    const scoped = tenantScoped(ctx({ companyIds: [ids.companyA], canSeeCommercialData: true }));
    const esito = await scoped.subject.deleteMany({ where: { id: ids.subjectB } });
    expect(esito.count).toBe(0);
    expect(await db.subject.findUnique({ where: { id: ids.subjectB } })).not.toBeNull();
  });
});
