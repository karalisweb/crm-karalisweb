"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CosaDirgli } from "./cosa-dirgli";

export type Azione =
  | { tipo: "decidi" }
  | { tipo: "cassetta"; voceId: string; si: string; no: string; testo: string | null; link: string | null; whatsapp?: string | null; email?: string | null; linkedin?: string | null; casoId?: string | null }
  | { tipo: "conosco"; nomi: string[] }
  | { tipo: "presentato" }
  | { tipo: "incontro" };

export interface AziendaPercorso {
  leadId: string; lavorazioneId: string | null; nome: string; zona: string | null; categoria: string | null;
  passo: 1 | 2 | 3 | 4; tocca: "te" | "crm" | "attesa"; stato: string; statoNome: string; cosa: string; azione: Azione | null;
}
export type CosaDiOggi = "contatta" | "scalda" | "valida";
export interface PassoPercorso { n: 1 | 2 | 3 | 4; nome: string; spiega: string; quante: number; toccaATe: number }
export interface DatiPercorso {
  passi: PassoPercorso[];
  oggi: Record<CosaDiOggi, AziendaPercorso[]>;
  fatte: Record<CosaDiOggi, number>;
  aziende: AziendaPercorso[];
  dopo: number;
  inPausa: number;
}

const TOCCA: Record<AziendaPercorso["tocca"], { testo: string; classe: string }> = {
  te: { testo: "tocca a te", classe: "bg-primary/15 text-primary" },
  crm: { testo: "ci pensa il CRM", classe: "bg-muted text-muted-foreground" },
  attesa: { testo: "si aspetta", classe: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100" },
};

async function chiama(url: string, metodo: string, body?: unknown): Promise<boolean> {
  const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) toast.error("Non sono riuscito a salvare");
  return r.ok;
}

/** Un'azienda del percorso: il passo, chi deve muoversi e la cosa da fare (v3.62). Solo in Percorso: Oggi ne mostra il riassunto (v3.78). */
export function SchedaPercorso({ a, passi, onCambio, evidenziata }: { a: AziendaPercorso; passi: PassoPercorso[]; onCambio: () => void; evidenziata?: boolean }) {
  const [inCorso, setInCorso] = useState<string | null>(null);
  // Al contatto il foglio "Cosa dirgli": ganci, scheda tecnica e commenti fatti (v3.65).
  const [foglio, setFoglio] = useState(false);
  const fai = async (chiave: string, url: string, metodo: string, body: unknown, ok: string) => {
    setInCorso(chiave);
    if (await chiama(url, metodo, body)) {
      toast.success(ok);
      onCambio();
    }
    setInCorso(null);
  };
  const bottone = (chiave: string, etichetta: string, run: () => void, variante: "default" | "outline" | "ghost" = "outline") => (
    <Button key={chiave} size="sm" variant={variante} className="h-8 text-xs" disabled={!!inCorso} onClick={run}>
      {inCorso === chiave && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}{etichetta}
    </Button>
  );
  // v3.103: WhatsApp e LinkedIn si registrano al tocco; l'email parte dal CRM. Tutto finisce nelle attività dell'azienda.
  const traccia = (canale: "whatsapp" | "linkedin") => {
    if (x?.tipo !== "cassetta") return;
    void fetch("/api/percorso/invio", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voceId: x.voceId, canale }) })
      .then((r) => { if (r.ok) { toast.success(`Segnato: mandato via ${canale === "whatsapp" ? "WhatsApp" : "LinkedIn"}`); onCambio(); } });
  };
  const mandaEmail = async () => {
    if (x?.tipo !== "cassetta" || !x.email) return;
    if (!confirm(`Mando l'email a ${x.email} dal CRM? Resta registrata nell'azienda.`)) return;
    setInCorso("email");
    const r = await fetch("/api/percorso/invio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voceId: x.voceId, canale: "email" }) }).catch(() => null);
    setInCorso(null);
    if (!r?.ok) return toast.error((await r?.json().catch(() => null))?.error ?? "L'email non è partita");
    toast.success("Email mandata e registrata");
    onCambio();
  };
  const x = a.azione;
  const lav = a.lavorazioneId ? `/api/rete/lavorazioni/${a.lavorazioneId}` : null;
  return (
    // L'id serve a Oggi per aprire il Percorso proprio su quest'azienda (v3.78).
    <Card id={`azienda-${a.leadId}`} className={`scroll-mt-24 ${evidenziata ? "ring-2 ring-primary" : ""}`}><CardContent className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/aziende-trovate/${a.leadId}`} className="font-medium hover:underline break-words">{a.nome}</Link>
        <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{a.passo}. {passi.find((p) => p.n === a.passo)?.nome}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded ${TOCCA[a.tocca].classe}`}>{TOCCA[a.tocca].testo}</span>
      </div>
      {(a.zona || a.categoria) && <div className="text-xs text-muted-foreground break-words">{[a.categoria, a.zona].filter(Boolean).join(" · ")}</div>}
      <div className="text-sm">{a.cosa}</div>
      {a.passo === 4 && (
        <Button size="sm" variant={foglio ? "secondary" : "outline"} className="h-8 text-xs" onClick={() => setFoglio((v) => !v)}>
          <FileText className="h-3 w-3 mr-1" />{foglio ? "Chiudi il foglio" : "Cosa dirgli"}
        </Button>
      )}
      {foglio && <CosaDirgli leadId={a.leadId} />}

      {x?.tipo === "cassetta" && x.testo && (
        <div className="rounded-md border bg-muted/40 p-2 text-sm whitespace-pre-wrap break-words">{x.testo}</div>
      )}
      {x?.tipo === "conosco" && (
        <div className="space-y-1.5">
          {x.nomi.map((n) => (
            <div key={n} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 break-words">{n}</span>
              {bottone(`${n}-si`, "Lo conosco", () => fai(`${n}-si`, "/api/rete/cerchia", "POST", { nome: n, conosco: true, lavorazioneId: a.lavorazioneId ?? undefined }, `${n} è nella tua cerchia`))}
              {bottone(`${n}-no`, "No", () => fai(`${n}-no`, "/api/rete/cerchia", "POST", { nome: n, conosco: false, lavorazioneId: a.lavorazioneId ?? undefined }, "Ok, non lo propongo più"), "ghost")}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {x?.tipo === "decidi" && <>
          {bottone("si", "Approfondisci", () => fai("si", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "approfondisci" }, "Approfondita: entra al passo 2"), "default")}
          {bottone("no", "Scarta", () => fai("no", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "scarta" }, "Scartata"), "ghost")}
        </>}
        {x?.tipo === "cassetta" && <>
          {x.testo && bottone("copia", "Copia il testo", () => { void navigator.clipboard.writeText(x.testo!).then(() => toast.success("Copiato")); })}
          {x.link && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={x.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Apri il post</a></Button>}
          {/* Scrivere subito, col testo già dentro (v3.87). */}
          {x.whatsapp && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={`https://wa.me/${x.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(x.testo ?? "")}`} target="_blank" rel="noopener noreferrer" onClick={() => traccia("whatsapp")}>WhatsApp</a></Button>}
          {x.email && x.testo && bottone("email", `Manda email a ${x.email}`, () => { void mandaEmail(); })}
          {/* v3.90: il caso studio da mandare appena dice sì. */}
          {x.casoId && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={`/api/ricerca/casi-studio/${x.casoId}/pdf`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Caso studio (PDF)</a></Button>}
          {x.linkedin && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={x.linkedin} target="_blank" rel="noopener noreferrer" title="Copia il testo, apre il profilo e lo segna come mandato" onClick={() => { if (x.testo) void navigator.clipboard.writeText(x.testo); traccia("linkedin"); }}>Copia e apri LinkedIn</a></Button>}
          {bottone("si", x.si, () => fai("si", `/api/cassetta/${x.voceId}`, "POST", { decisione: "APPROVATO" }, "Fatto: un passo avanti"), "default")}
          {bottone("no", x.no, () => fai("no", `/api/cassetta/${x.voceId}`, "POST", { decisione: "SCARTATO" }, "Segnato"), "ghost")}
        </>}
        {x?.tipo === "presentato" && lav && bottone("presentato", "Me l'ha presentata", () => fai("presentato", lav, "PATCH", { azione: "presentato" }, "Presentata: ora al passo 4"))}
        {x?.tipo === "incontro" && lav && bottone("incontro", "Incontro fissato", () => fai("incontro", lav, "PATCH", { azione: "incontro" }, "Incontro fissato: va in Trattative"), a.tocca === "te" ? "default" : "outline")}
        {lav && x?.tipo !== "cassetta" && bottone("pausa", "Pausa 3 mesi", () => fai("pausa", lav, "PATCH", { azione: "pausa" }, "In pausa: torna fra 3 mesi"), "ghost")}
        {/* v3.99: Elimina a qualunque passo (contatto, scaldare, approfondire): esce dal percorso per sempre. */}
        {bottone("elimina", "Elimina", () => { if (confirm(`Elimino ${a.nome}? Esce dal percorso e il CRM non la propone più.`)) void fai("elimina", `/api/percorso/${a.leadId}`, "DELETE", undefined, "Eliminata"); }, "ghost")}
      </div>
    </CardContent></Card>
  );
}
