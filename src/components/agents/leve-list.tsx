import { SERVIZI, type Leva, type Servizio } from "@/lib/agents/tipi";

/** Le leve raggruppate per servizio vendibile, ognuna con la sua prova. */
export function LeveList({ leve }: { leve: Leva[] }) {
  if (!leve.length) {
    return <p className="text-xs text-muted-foreground">Nessuna leva trovata.</p>;
  }
  const gruppi = new Map<Servizio, Leva[]>();
  for (const l of leve) gruppi.set(l.servizio, [...(gruppi.get(l.servizio) ?? []), l]);

  return (
    <div className="space-y-3">
      {[...gruppi.entries()].map(([servizio, voci]) => (
        <div key={servizio} className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {SERVIZI[servizio] ?? servizio}
          </div>
          <ul className="mt-1 space-y-1.5">
            {voci.map((l, i) => (
              <li key={i} className="text-sm leading-snug">
                {l.testo}
                <div className="text-xs text-muted-foreground break-words">Prova: {l.prova}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
