/**
 * AccessContext — risolto a inizio richiesta (piano, sezione 2).
 *
 * Il permesso è sempre `(ruolo, scope)`, mai `ruolo` da solo. Da qui in poi
 * nessuna query di modulo deve interrogare il database senza filtro di tenant:
 * l'imposizione è in `tenant-guard.ts`, non nella disciplina di chi scrive.
 */
import type { MembershipRole, ScopeType } from "@prisma/client";
import prisma from "@/lib/db";

export interface MembershipEntry {
  role: MembershipRole;
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface AccessContext {
  userId: string;
  memberships: MembershipEntry[];
  /** Vede e amministra tutto. Salta ogni filtro. */
  isPlatformAdmin: boolean;
  /** Organizzazioni di cui è titolare. */
  organizationIds: string[];
  /** Aziende raggiungibili, già espanse dalle organizzazioni. */
  companyIds: string[];
  /** Progetti raggiungibili quando l'accesso è limitato a singoli progetti. */
  projectIds: string[];
  /** Falso per PROJECT_MEMBER e GUEST_LINK: nessun dato commerciale o di licenza. */
  canSeeCommercialData: boolean;
}

/** Insieme vuoto: non vede nulla. È il valore di partenza, non un caso d'errore. */
export function emptyContext(userId: string): AccessContext {
  return {
    userId,
    memberships: [],
    isPlatformAdmin: false,
    organizationIds: [],
    companyIds: [],
    projectIds: [],
    canSeeCommercialData: false,
  };
}

const COMMERCIAL_BLIND: MembershipRole[] = ["PROJECT_MEMBER", "GUEST_LINK"];

/**
 * Costruisce il contesto leggendo le Membership dell'utente ed espandendo gli
 * scope: chi possiede un'Organizzazione raggiunge tutte le sue Aziende, chi
 * possiede un'Azienda raggiunge tutti i suoi Progetti.
 */
export async function resolveAccessContext(userId: string): Promise<AccessContext> {
  const rows = await prisma.membership.findMany({
    where: { userId },
    select: { role: true, scopeType: true, scopeId: true },
  });

  const ctx = emptyContext(userId);
  ctx.memberships = rows;

  if (rows.length === 0) return ctx;

  ctx.isPlatformAdmin = rows.some((m) => m.role === "PLATFORM_ADMIN");

  const orgIds = new Set<string>();
  const companyIds = new Set<string>();
  const projectIds = new Set<string>();

  for (const m of rows) {
    if (!m.scopeId) continue;
    if (m.scopeType === "ORGANIZATION") orgIds.add(m.scopeId);
    if (m.scopeType === "COMPANY") companyIds.add(m.scopeId);
    if (m.scopeType === "PROJECT") projectIds.add(m.scopeId);
  }

  // Un'organizzazione porta con sé tutte le proprie aziende.
  if (orgIds.size > 0) {
    const companies = await prisma.company.findMany({
      where: { organizationId: { in: [...orgIds] } },
      select: { id: true },
    });
    for (const c of companies) companyIds.add(c.id);
  }

  ctx.organizationIds = [...orgIds];
  ctx.companyIds = [...companyIds];
  ctx.projectIds = [...projectIds];

  const soloRuoliCiechi =
    rows.length > 0 && rows.every((m) => COMMERCIAL_BLIND.includes(m.role));
  ctx.canSeeCommercialData = ctx.isPlatformAdmin || !soloRuoliCiechi;

  return ctx;
}

/**
 * Aziende di cui il contesto puo leggere i dati.
 *
 * NON risale dal Progetto all'Azienda. Sembrerebbe comodo, ma un
 * PROJECT_MEMBER si ritroverebbe a vedere tutti i soggetti dell'Azienda,
 * che e esattamente cio che il criterio di completamento della Fase 1 vieta.
 * Chi ha solo uno scope di Progetto non ha accesso a livello di Azienda:
 * finche i soggetti non sono legati a un Progetto, non ne vede nessuno.
 */
export function reachableCompanyIds(ctx: AccessContext): string[] {
  return ctx.isPlatformAdmin ? [] : [...ctx.companyIds];
}
