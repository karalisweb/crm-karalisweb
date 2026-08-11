import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveAccessContext } from "@/lib/core/access-context";
import { tenantScoped } from "@/lib/core/tenant-guard";
import { leggiGads } from "@/lib/adapters/gads";
import { leggiSeoi } from "@/lib/adapters/seoi";
import { leggiHub } from "@/lib/adapters/hub";
import type { EsitoModulo } from "@/lib/adapters/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, BarChart3, Search, FileText, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  crm_lead: "CRM · Lead",
  crm_opportunita: "CRM · Opportunità",
  crm_bnimembro: "CRM · Membro BNI",
  gads_account: "GADS · Account",
  seoi_client: "SEOI · Cliente",
  hub_project: "HUB · Progetto",
};

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const numero = (n: number) => new Intl.NumberFormat("it-IT").format(n);
const data = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(d)) : "—";

function Riquadro({
  titolo, icona: Icona, tono, esito, children,
}: {
  titolo: string;
  icona: React.ComponentType<{ className?: string }>;
  tono: string;
  esito: EsitoModulo<unknown>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-lg border p-1.5 ${tono}`}><Icona className="h-4 w-4" /></span>
          <span className="font-medium">{titolo}</span>
        </div>
        {esito.stato === "non_configurato" && (
          <p className="text-sm text-muted-foreground">
            Modulo non collegato su questo server.
          </p>
        )}
        {esito.stato === "errore" && (
          <p className="text-sm text-destructive">
            Non raggiungibile: {esito.messaggio}
          </p>
        )}
        {esito.stato === "ok" && children}
      </CardContent>
    </Card>
  );
}

function Voce({ etichetta, valore }: { etichetta: string; valore: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{etichetta}</span>
      <span className="font-medium tabular-nums">{valore}</span>
    </div>
  );
}

export default async function SchedaSoggetto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return <div className="p-6 text-sm text-muted-foreground">Sessione non valida.</div>;

  const ctx = await resolveAccessContext(userId);
  const db = tenantScoped(ctx);

  // Passa dal client filtrato: un soggetto fuori ambito non si apre nemmeno
  // conoscendone l'indirizzo esatto.
  const soggetto = await db.subject.findFirst({
    where: { id },
    include: { identities: { orderBy: { source: "asc" } } },
  });
  if (!soggetto) notFound();

  const [gads, seoi, hub] = await Promise.all([
    leggiGads(soggetto.displayName, soggetto.primaryDomain),
    leggiSeoi(soggetto.primaryDomain),
    leggiHub(soggetto.primaryDomain),
  ]);

  const identitaCrm = soggetto.identities.filter((i) => i.source.startsWith("crm_"));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Link href="/registro-soggetti"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Registro soggetti
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6 shrink-0" /> {soggetto.displayName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {soggetto.primaryDomain && <span>{soggetto.primaryDomain}</span>}
          {soggetto.googlePlaceId && <span>· scheda Google presente</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {soggetto.identities.map((i) => (
            <Badge key={i.id} variant="outline">{SOURCE_LABEL[i.source] ?? i.source}</Badge>
          ))}
        </div>
      </header>

      <p className="text-sm text-muted-foreground max-w-3xl">
        Quello che i quattro moduli sanno di questa azienda, in un posto solo.
        I dati restano nei rispettivi moduli: qui vengono <strong>letti</strong>,
        mai copiati e mai modificati.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Riquadro titolo="Acquisizione clienti" icona={Users}
                  tono="bg-blue-50 text-blue-700 border-blue-200"
                  esito={{ stato: "ok", dati: null }}>
          {identitaCrm.length === 0 ? (
            <p className="text-sm text-muted-foreground">Non presente nel CRM.</p>
          ) : (
            <div className="space-y-1.5">
              {identitaCrm.map((i) => (
                <Voce key={i.id} etichetta={SOURCE_LABEL[i.source] ?? i.source}
                      valore={<span className="font-mono text-xs">{i.externalId.slice(0, 8)}…</span>} />
              ))}
            </div>
          )}
        </Riquadro>

        <Riquadro titolo="Rendimento attività digitali" icona={BarChart3}
                  tono="bg-amber-50 text-amber-700 border-amber-200" esito={gads}>
          {gads.stato === "ok" && (gads.dati ? (
            <div className="space-y-1.5">
              <Voce etichetta="Account" valore={gads.dati.customerId} />
              <Voce etichetta="Campagne" valore={numero(gads.dati.campagne)} />
              <Voce etichetta="Investito" valore={euro(gads.dati.costoTotaleEuro)} />
              <Voce etichetta="Conversioni" valore={numero(Math.round(gads.dati.conversioni))} />
              <Voce etichetta="Modifiche in attesa" valore={numero(gads.dati.modifichePendenti)} />
              <Voce etichetta="Ultima importazione" valore={data(gads.dati.ultimaImportazione)} />
            </div>
          ) : <p className="text-sm text-muted-foreground">Nessun account collegato.</p>)}
        </Riquadro>

        <Riquadro titolo="Visibilità organica" icona={Search}
                  tono="bg-emerald-50 text-emerald-700 border-emerald-200" esito={seoi}>
          {seoi.stato === "ok" && (seoi.dati ? (
            <div className="space-y-1.5">
              <Voce etichetta="Keyword monitorate" valore={numero(seoi.dati.keywordMonitorate)} />
              <Voce etichetta="Posizione media"
                    valore={seoi.dati.posizioneMedia != null ? seoi.dati.posizioneMedia.toFixed(1).replace(".", ",") : "—"} />
              <Voce etichetta="Nelle prime dieci" valore={numero(seoi.dati.inTopDieci)} />
              <Voce etichetta="Salute tecnica"
                    valore={seoi.dati.punteggioTecnico != null ? `${seoi.dati.punteggioTecnico}/100` : "—"} />
              <Voce etichetta="Ultima rilevazione" valore={data(seoi.dati.ultimaRilevazione)} />
            </div>
          ) : <p className="text-sm text-muted-foreground">Non seguito da questo modulo.</p>)}
        </Riquadro>

        <Riquadro titolo="Produzione contenuti" icona={FileText}
                  tono="bg-rose-50 text-rose-700 border-rose-200" esito={hub}>
          {hub.stato === "ok" && (hub.dati ? (
            <div className="space-y-1.5">
              <Voce etichetta="Articoli" valore={numero(hub.dati.articoli)} />
              <Voce etichetta="Pubblicati" valore={numero(hub.dati.articoliPubblicati)} />
              <Voce etichetta="Contenuti derivati" valore={numero(hub.dati.contenutiDerivati)} />
              <Voce etichetta="Ultima pubblicazione" valore={data(hub.dati.ultimaPubblicazione)} />
            </div>
          ) : <p className="text-sm text-muted-foreground">Non seguito da questo modulo.</p>)}
        </Riquadro>
      </div>
    </div>
  );
}
