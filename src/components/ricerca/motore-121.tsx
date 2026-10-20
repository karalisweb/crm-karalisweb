"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { data } from "@/components/ricerca/etichette";

/** Motore 121: i pezzi comuni a scheda del membro, pagina Incontri BNI e pagina del 121. */

export interface PresentazioneImbuto {
  id: string;
  nome: string;
  ruolo: string | null;
  stato: string;
  chiestaAt: string | null;
  presentatoAt: string | null;
  incontroAt: string | null;
  propostaAt: string | null;
  clienteAt: string | null;
  leadId: string | null;
  confermata?: boolean | null;
}

async function patchPresentazione(id: string, body: Record<string, unknown>, ok: string): Promise<boolean> {
  const r = await fetch(`/api/ricerca/bni/presentazioni/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    toast.error("Non sono riuscito a salvare");
    return false;
  }
  toast.success(ok);
  return true;
}

/** I punti di contatto di un ponte, come etichette. */
export function PuntiContatto({ punti, forza }: { punti: string[]; forza?: number }) {
  if (!punti.length && !forza) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {typeof forza === "number" && forza > 0 && <Badge variant="outline" className="text-[10px]">ponte {forza >= 6 ? "forte" : forza >= 3 ? "medio" : "debole"}</Badge>}
      {punti.map((p) => <Badge key={p} variant="secondary" className="text-[10px] font-normal">{p}</Badge>)}
    </div>
  );
}

/**
 * L'imbuto di una presentazione: chiesta → presentato → incontro → proposta → cliente.
 * Un passo alla volta, con la data di quando è successo.
 */
export function ImbutoPresentazione({ p, onCambio }: { p: PresentazioneImbuto; onCambio: () => void }) {
  const passi: { chiave: string; etichetta: string; quando: string | null; body: Record<string, unknown> }[] = [
    { chiave: "chiesta", etichetta: "Chiesta", quando: p.chiestaAt ?? (p.stato === "CHIESTA" || p.stato === "PRESENTATO" ? "" : null), body: { stato: "CHIESTA" } },
    { chiave: "presentato", etichetta: "Presentato", quando: p.presentatoAt ?? (p.stato === "PRESENTATO" ? "" : null), body: { stato: "PRESENTATO" } },
    { chiave: "incontro", etichetta: "Incontro", quando: p.incontroAt, body: { incontro: true } },
    { chiave: "proposta", etichetta: "Proposta", quando: p.propostaAt, body: { proposta: true } },
    { chiave: "cliente", etichetta: "Cliente", quando: p.clienteAt, body: { cliente: true } },
  ];
  const prossimo = passi.find((x) => x.quando === null);
  if (p.stato === "NO") return <span className="text-xs text-muted-foreground">non lo conosce bene / non serve</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {passi.filter((x) => x.quando !== null).map((x) => (
        <span key={x.chiave} className="text-xs text-green-700 dark:text-green-400 flex items-center gap-0.5">
          <Check className="h-3 w-3" />{x.etichetta}{x.quando ? ` ${data(x.quando)}` : ""}
        </span>
      ))}
      {prossimo && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => { if (await patchPresentazione(p.id, prossimo.body, prossimo.chiave === "presentato" ? "Presentato: parte l'analisi della sua azienda" : "Segnato")) onCambio(); }}>
          {prossimo.etichetta}
        </Button>
      )}
      {!p.presentatoAt && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { if (await patchPresentazione(p.id, { stato: "NO" }, "Tolta")) onCambio(); }}>
          <X className="h-3 w-3 mr-0.5" /> Non serve
        </Button>
      )}
      {p.leadId && <Link href={`/aziende-trovate/${p.leadId}`} className="text-xs underline">scheda azienda</Link>}
    </div>
  );
}

export interface Segnalazione {
  id: string;
  nome: string;
  motivo: string | null;
  stato: string;
  leadId: string | null;
  dataAt?: string | null;
}

/** I contatti da segnalare al membro: "Segnalato" quando glielo hai dato. */
export function Segnalazioni({ lista, onCambio }: { lista: Segnalazione[]; onCambio: () => void }) {
  async function segna(id: string, stato: string, ok: string) {
    const r = await fetch(`/api/ricerca/bni/segnalazioni/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stato }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success(ok);
    onCambio();
  }
  if (!lista.length) return <p className="text-muted-foreground">Nessuno ancora: l&apos;agente li prepara il giorno prima del 121, dalle aziende del CRM utili al suo mestiere.</p>;
  return (
    <div className="space-y-2">
      {lista.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 pb-2">
          <div className="min-w-0">
            <div>{s.leadId ? <Link href={`/aziende-trovate/${s.leadId}`} className="hover:underline">{s.nome}</Link> : s.nome}</div>
            {s.motivo && <div className="text-xs text-muted-foreground">{s.motivo}</div>}
          </div>
          {s.stato === "DA_DARE" ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => segna(s.id, "DATA", "Segnalato")}><Check className="h-3 w-3 mr-0.5" /> Segnalato</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => segna(s.id, "NON_SERVE", "Tolto")}>Non serve</Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{s.stato === "DATA" ? `segnalato${s.dataAt ? ` il ${data(s.dataAt)}` : ""}` : "non serve"}</span>
          )}
        </div>
      ))}
    </div>
  );
}
