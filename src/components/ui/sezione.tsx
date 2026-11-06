"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Un blocco chiudibile con il conteggio nel titolo (Alessio, 2026-11-06: "in ogni pagina, se c'è una lista ci sia
 * anche un collapse"). Ricorda aperto/chiuso per `id`; `forzaAperta` lo apre comunque (es. arrivi su un'azienda dentro).
 */
export function Sezione({ id, titolo, conteggio, children, forzaAperta = false }: {
  id: string;
  titolo: ReactNode;
  conteggio?: ReactNode;
  children: ReactNode;
  forzaAperta?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (forzaAperta) ref.current.open = true;
    else if (localStorage.getItem(id) === "0") ref.current.open = false;
  }, [id, forzaAperta]);
  return (
    <details id={id} ref={ref} open className="group rounded-lg border overflow-hidden scroll-mt-4" onToggle={(e) => localStorage.setItem(id, e.currentTarget.open ? "1" : "0")}>
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 bg-muted/50 hover:bg-muted p-3 transition [&::-webkit-details-marker]:hidden" title="Tocca per chiudere o aprire">
        <span className="flex items-center gap-2 font-semibold min-w-0">
          <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-90" />
          <span className="min-w-0">{titolo}</span>
        </span>
        {conteggio != null && <span className="rounded-full bg-background px-2.5 py-0.5 text-sm text-muted-foreground shrink-0">{conteggio}</span>}
      </summary>
      <div className="space-y-2 p-3">{children}</div>
    </details>
  );
}
