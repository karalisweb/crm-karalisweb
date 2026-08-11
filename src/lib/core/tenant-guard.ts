/**
 * Isolamento fra clienti — imposto, non affidato alla disciplina.
 *
 * Piano, sezione 2: «Nessuna query di modulo interroga il database senza filtro
 * di tenant. Da imporre con Prisma middleware, non con disciplina.»
 * Criticità 8: «`organizationId` e `companyId` su ogni riga, imposti da Prisma
 * middleware; test automatico di isolamento in pipeline.»
 *
 * Uso:
 *   const ctx = await resolveAccessContext(userId);
 *   const db  = tenantScoped(ctx);
 *   await db.subject.findMany();   // già filtrato, non si può dimenticare
 *
 * Chi ha bisogno del client non filtrato deve importare `@/lib/db`
 * esplicitamente: la scelta resta visibile in revisione.
 */
import prisma from "@/lib/db";
import type { AccessContext } from "./access-context";
import { reachableCompanyIds } from "./access-context";

/** Modelli soggetti a isolamento e colonna su cui si filtra. */
const SCOPED_BY_COMPANY = ["subject", "project", "licence"] as const;
/** Modelli il cui identificativo È l'azienda. */
const SCOPED_BY_ID = ["company"] as const;
/** Visibili solo a chi ha dati commerciali (piano, sezione 2). */
const COMMERCIAL_ONLY = ["licence"] as const;
/**
 * Modelli senza `company_id` proprio, che ereditano l'ambito da una relazione.
 * Senza questa mappa passerebbero non filtrati: `subject_identities` non ha
 * una colonna di tenant, quindi un conteggio globale mostrerebbe righe di
 * aziende che non si possono vedere.
 */
const SCOPED_BY_RELATION: Record<string, (ids: string[]) => unknown> = {
  subjectIdentity: (ids) => ({ subject: { companyId: { in: ids } } }),
  reconciliationCandidate: (ids) => ({
    AND: [
      { leftSubject: { companyId: { in: ids } } },
      { rightSubject: { companyId: { in: ids } } },
    ],
  }),
};

const READ_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "findUnique",
  "findUniqueOrThrow", "count", "aggregate", "groupBy",
]);
const WRITE_OPS = new Set([
  "create", "createMany", "update", "updateMany", "upsert",
  "delete", "deleteMany",
]);

/** Condizione che non seleziona nulla, senza dipendere da valori dei dati. */
const NESSUNA_RIGA = { id: { in: [] as string[] } };

function mergeWhere(args: Record<string, unknown>, filtro: unknown) {
  const attuale = args.where as Record<string, unknown> | undefined;
  return { ...args, where: attuale ? { AND: [attuale, filtro] } : filtro };
}

/**
 * `query()` accetta l'unione tipizzata degli argomenti di ogni operazione di
 * ogni modello: da dentro `$allOperations` quel tipo non è ricostruibile.
 * La conversione è confinata qui, in una funzione sola, invece di essere
 * sparsa a ogni chiamata.
 */
type QueryFn = (args: unknown) => Promise<unknown>;
const run = (query: unknown, args: unknown) => (query as QueryFn)(args);

/**
 * Restituisce un client Prisma che applica il filtro di tenant a ogni lettura
 * e blocca ogni scrittura fuori ambito.
 */
export function tenantScoped(ctx: AccessContext) {
  const companyIds = reachableCompanyIds(ctx);

  return prisma.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Il PLATFORM_ADMIN vede tutto: è il ruolo di Alessio.
          if (ctx.isPlatformAdmin) return query(args);

          const m = (model ?? "").charAt(0).toLowerCase() + (model ?? "").slice(1);
          const perCompany = (SCOPED_BY_COMPANY as readonly string[]).includes(m);
          const perId = (SCOPED_BY_ID as readonly string[]).includes(m);
          const perRelazione = Object.prototype.hasOwnProperty.call(SCOPED_BY_RELATION, m);
          if (!perCompany && !perId && !perRelazione) return query(args);

          const a = (args ?? {}) as Record<string, unknown>;

          // Dati commerciali e di licenza: invisibili a PROJECT_MEMBER e GUEST_LINK.
          if ((COMMERCIAL_ONLY as readonly string[]).includes(m) && !ctx.canSeeCommercialData) {
            if (READ_OPS.has(operation)) return run(query, mergeWhere(a, NESSUNA_RIGA));
            throw new Error(`Isolamento: ${model}.${operation} non consentito a questo ruolo`);
          }

          // Nessuna azienda raggiungibile: nessuna riga, mai.
          if (companyIds.length === 0) {
            if (READ_OPS.has(operation)) return run(query, mergeWhere(a, NESSUNA_RIGA));
            throw new Error(`Isolamento: ${model}.${operation} senza alcuna azienda in ambito`);
          }

          const filtro = perId
            ? { id: { in: companyIds } }
            : perRelazione
              ? SCOPED_BY_RELATION[m](companyIds)
              : { companyId: { in: companyIds } };

          if (READ_OPS.has(operation)) return run(query, mergeWhere(a, filtro));

          if (WRITE_OPS.has(operation)) {
            // Le scritture con `where` si restringono come le letture.
            if ("where" in a) return run(query, mergeWhere(a, filtro));

            // Sui modelli che ereditano l'ambito da una relazione la creazione
            // non porta un company_id da controllare: si nega, e chi deve
            // scrivere usa il client non filtrato in modo esplicito.
            if (perRelazione) {
              throw new Error(
                `Isolamento: ${model}.${operation} passa dal client non filtrato`);
            }

            // Le creazioni devono dichiarare un'azienda in ambito.
            const data = a.data as Record<string, unknown> | undefined;
            const target = perId ? (data?.id as string | undefined)
                                 : (data?.companyId as string | undefined);
            if (!target || !companyIds.includes(target)) {
              throw new Error(
                `Isolamento: ${model}.${operation} verso un'azienda fuori ambito`);
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantScopedClient = ReturnType<typeof tenantScoped>;
