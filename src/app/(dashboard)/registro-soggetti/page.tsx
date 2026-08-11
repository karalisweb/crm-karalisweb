import { auth } from "@/lib/auth";
import { resolveAccessContext } from "@/lib/core/access-context";
import { tenantScoped } from "@/lib/core/tenant-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Link2, HelpCircle, Database } from "lucide-react";

export const dynamic = "force-dynamic";

/** Etichette in italiano — nel codice il dominio resta in inglese (regola 0.9). */
const SOURCE_LABEL: Record<string, string> = {
  crm_lead: "CRM · Lead",
  crm_opportunita: "CRM · Opportunità",
  crm_bnimembro: "CRM · Membro BNI",
  gads_account: "GADS · Account",
  seoi_client: "SEOI · Cliente",
  hub_project: "HUB · Progetto",
};

const SOURCE_TONE: Record<string, string> = {
  crm_lead: "bg-blue-50 text-blue-700 border-blue-200",
  crm_opportunita: "bg-indigo-50 text-indigo-700 border-indigo-200",
  crm_bnimembro: "bg-violet-50 text-violet-700 border-violet-200",
  gads_account: "bg-amber-50 text-amber-700 border-amber-200",
  seoi_client: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hub_project: "bg-rose-50 text-rose-700 border-rose-200",
};

const REASON_LABEL: Record<string, string> = {
  shared_email_domain: "Stesso dominio di posta aziendale",
  domain_host_mismatch: "Uno è sottodominio dell'altro",
  same_normalized_name: "Stessa ragione sociale normalizzata",
  similar_name: "Ragione sociale molto simile",
  shared_distinctive_tokens: "Parole distintive in comune",
  shared_hosting_domain: "Stesso servizio di hosting (indizio debole)",
};

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground/80 mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default async function RegistroSoggettiPage() {
  // Il contesto si risolve a inizio richiesta e il client che ne esce e gia
  // filtrato: da qui in poi non e possibile leggere fuori dal proprio ambito
  // nemmeno dimenticandosene (piano, sezione 2).
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Sessione non valida.
      </div>
    );
  }
  const ctx = await resolveAccessContext(userId);
  const prisma = tenantScoped(ctx);

  const [subjects, identityCount, queue] = await Promise.all([
    prisma.subject.findMany({
      include: { identities: { orderBy: { source: "asc" } } },
      orderBy: [{ displayName: "asc" }],
      take: 500,
    }),
    // Le identita non hanno company_id: la guardia le filtra risalendo al
    // soggetto (SCOPED_BY_RELATION in tenant-guard.ts).
    prisma.subjectIdentity.count(),
    prisma.reconciliationCandidate.findMany({
      where: { status: "PENDING" },
      include: { leftSubject: true, rightSubject: true },
      orderBy: [{ score: "desc" }],
      take: 50,
    }),
  ]);

  const multi = subjects.filter((s) => s.identities.length > 1);
  const absorbed = identityCount - subjects.length;
  const dupRate = identityCount ? ((absorbed / identityCount) * 100).toFixed(1) : "0,0";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Database className="h-6 w-6" /> Registro unico dei soggetti
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Un soggetto è un&apos;azienda osservata, indipendentemente da quante volte compare
          nelle applicazioni. Questo registro è in <strong>sola lettura</strong>: viene
          ricostruito dall&apos;importazione e nessuna applicazione ci scrive sopra.
        </p>
      </header>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Identità importate" value={identityCount} />
        <Stat label="Soggetti distinti" value={subjects.length} />
        <Stat label="Sovrapposizioni certe" value={multi.length}
              hint={`${absorbed} identità assorbite · ${dupRate.replace(".", ",")} %`} />
        <Stat label="In attesa di verifica" value={queue.length}
              hint="mai unite dal programma" />
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Il registro è vuoto. Va popolato eseguendo l&apos;importazione.
          </CardContent>
        </Card>
      ) : null}

      {multi.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Aziende presenti in più applicazioni
          </h2>
          <p className="text-sm text-muted-foreground">
            Collegate automaticamente, e solo quando la corrispondenza è certa: stesso
            identificativo Google Maps, oppure stesso sito internet.
          </p>
          <div className="grid gap-3">
            {multi.map((s) => (
              <Link key={s.id} href={`/registro-soggetti/${s.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {s.displayName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                      {s.primaryDomain && <span>sito: {s.primaryDomain}</span>}
                      {s.googlePlaceId && <span>scheda Google presente</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.identities.map((i) => (
                      <Badge key={i.id} variant="outline"
                             className={SOURCE_TONE[i.source] ?? ""}>
                        {SOURCE_LABEL[i.source] ?? i.source}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <HelpCircle className="h-5 w-5" /> Da verificare a mano
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Coppie che <em>sembrano</em> la stessa azienda ma non lo sono con certezza.
          Il programma <strong>non</strong> le ha unite: la decisione è di una persona.
          Unire due aziende diverse è un errore che poi non si vede più.
        </p>
        {queue.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nessun caso in attesa.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {queue.map((q) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{q.leftSubject.displayName}</span>
                        <span className="text-muted-foreground px-2">e</span>
                        <span className="font-medium">{q.rightSubject.displayName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {REASON_LABEL[q.reason] ?? q.reason}
                      </div>
                    </div>
                    <Badge variant="outline" className="tabular-nums shrink-0">
                      fiducia {q.score != null ? q.score.toFixed(2).replace(".", ",") : "—"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
