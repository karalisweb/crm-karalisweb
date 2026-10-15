import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SQUADRA } from "@/lib/agents/registro";
import type { Leva, Prova } from "@/lib/agents/tipi";
import { LeveList } from "./leve-list";

const FIDUCIA: Record<string, string> = { ALTA: "fiducia alta", MEDIA: "fiducia media", BASSA: "fiducia bassa" };

/** Il fascicolo dell'azienda: l'ultimo referto di ogni agente, con leve e prove. */
export async function FascicoloCard({ leadId }: { leadId: string }) {
  const referti = await db.agentReport.findMany({
    where: { leadId },
    orderBy: { collectedAt: "desc" },
    distinct: ["agent"],
  });
  const falliti = await db.agentRun.findMany({
    where: { leadId, status: "FALLITO" },
    orderBy: { finishedAt: "desc" },
    distinct: ["agent"],
    select: { agent: true, error: true, finishedAt: true },
  });

  if (!referti.length && !falliti.length) return null;
  const oggi = new Date();
  const nome = (chiave: string) => SQUADRA.find((a) => a.chiave === chiave);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fascicolo della squadra</CardTitle>
        <p className="text-xs text-muted-foreground">Cosa hanno trovato gli agenti, con le prove.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {referti.map((r) => {
          const scheda = nome(r.agent);
          const scaduto = r.validUntil <= oggi;
          const leve = r.levers as unknown as Leva[];
          const prove = r.evidence as unknown as Prova[];
          return (
            <details key={r.id} className="rounded-lg border p-3 min-w-0" open={leve.length > 0}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {scheda ? `${scheda.numero} · ${scheda.nome}` : r.agent}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{FIDUCIA[r.confidence]}</Badge>
                  {scaduto && <Badge variant="secondary" className="text-[10px]">da rifare</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 break-words">{r.summary}</div>
              </summary>
              <div className="mt-3 space-y-3">
                <LeveList leve={leve} />
                {prove.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prove raccolte</div>
                    <ul className="mt-1 space-y-1">
                      {prove.map((p, i) => (
                        <li key={i} className="text-xs break-words">
                          {p.cosa}
                          {p.citazione && <span className="text-muted-foreground"> — “{p.citazione}”</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  Raccolto il {r.collectedAt.toLocaleDateString("it-IT")} · valido fino al {r.validUntil.toLocaleDateString("it-IT")}
                </div>
              </div>
            </details>
          );
        })}
        {falliti
          .filter((f) => !referti.some((r) => r.agent === f.agent))
          .map((f) => (
            <div key={f.agent} className="rounded-lg border border-dashed p-3 text-xs">
              <span className="font-medium">{nome(f.agent)?.nome ?? f.agent}</span>: non ha potuto lavorare — {f.error}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
