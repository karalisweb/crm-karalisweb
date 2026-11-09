"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, FileText, Loader2, Minus } from "lucide-react";
import { toast } from "sonner";
import { CosaDirgli } from "./cosa-dirgli";
import { AggiungiContatto } from "./aggiungi-contatto";
import { canaliInOrdine } from "@/lib/agents/rete-regole";

export type Azione =
  | { tipo: "decidi" }
  | { tipo: "cassetta"; voceId: string; si: string; no: string; testo: string | null; link: string | null; whatsapp?: string | null; email?: string | null; linkedin?: string | null; casoId?: string | null; pagina?: string | null; piattaforma?: string | null }
  | { tipo: "conosco"; nomi: string[] }
  | { tipo: "presentato" }
  | { tipo: "incontro" };

export interface AziendaPercorso {
  leadId: string; lavorazioneId: string | null; nome: string; zona: string | null; categoria: string | null;
  passo: 1 | 2 | 3 | 4; tocca: "te" | "crm" | "attesa"; stato: string; statoNome: string; cosa: string; azione: Azione | null;
  /** v3.112: lavoro in coda o in corso sul Mac. */
  mac?: { stato: "in_coda" | "in_corso"; dal: string } | null;
  /** v3.113: passo 4. */
  contatto?: {
    caso: { id: string; titolo: string } | null;
    inviato: { quando: string; aChi: string; canale: string; dove: string | null; testo: string | null; tipo: "contatto" | "pagina" | "followup" | "caso" } | null;
    ricerche: { linkedin: string | null; linkedinFatto: boolean; facebook: boolean; instagram: boolean; bni: string[] };
    followupPossibile: boolean;
    rispostaPossibile?: boolean;
  };
}

const NOME_PIATTAFORMA: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Dove si è cercato chi decide (v3.113, Alessio: "l'ho cercato in BNI? su Facebook? su Instagram? su LinkedIn?"). */
function Ricerche({ r }: { r: NonNullable<AziendaPercorso["contatto"]>["ricerche"] }) {
  const voce = (nome: string, ok: boolean, dettaglio?: string) => (
    <span className="inline-flex items-center gap-1">
      {ok ? <Check className="h-3 w-3 text-green-600" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
      {nome}{dettaglio && <span className="text-muted-foreground">: {dettaglio}</span>}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      <span className="text-muted-foreground">Chi decide, cercato su:</span>
      {voce("LinkedIn", !!r.linkedin, r.linkedinFatto ? (r.linkedin ?? "nessuno trovato") : "non ancora")}
      {voce("Facebook", r.facebook, r.linkedinFatto ? (r.facebook ? "profilo trovato" : "nessun profilo") : "non ancora")}
      {voce("Instagram", r.instagram, r.linkedinFatto ? (r.instagram ? "profilo trovato" : "nessun profilo") : "non ancora")}
      {voce("BNI", r.bni.length > 0, r.bni.length ? r.bni.join(", ") : "nessun membro la conosce")}
    </div>
  );
}

/** "in coda per il Mac dalle 10:32" / "dal 5 nov alle 10:32". */
export function testoMac(m: NonNullable<AziendaPercorso["mac"]>): string {
  if (m.stato === "in_corso") return "il Mac ci sta lavorando";
  const d = new Date(m.dal);
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const stessoGiorno = d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }) === new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  return stessoGiorno ? `in coda per il Mac dalle ${ora}` : `in coda per il Mac dal ${d.toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "Europe/Rome" })} alle ${ora}`;
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
  // v3.116 (Alessio: "il clic su WhatsApp di fatto non invia nulla, solo apre: devo confermare"): il canale aperto
  // aspetta la conferma. Resta ricordato (per voce) anche se ricarichi la pagina.
  const voceId = a.azione?.tipo === "cassetta" ? a.azione.voceId : null;
  // Le schede si disegnano solo nel browser (dopo il fetch), quindi localStorage c'è già.
  const [aperto, setAperto] = useState<"whatsapp" | "linkedin" | "pagina" | null>(() =>
    voceId && typeof window !== "undefined" ? ((localStorage.getItem(`aperto:${voceId}`) as "whatsapp" | "linkedin" | "pagina" | null) ?? null) : null);
  const apri = (canale: "whatsapp" | "linkedin" | "pagina") => {
    if (voceId) localStorage.setItem(`aperto:${voceId}`, canale);
    setAperto(canale);
  };
  const chiudiConferma = () => {
    if (voceId) localStorage.removeItem(`aperto:${voceId}`);
    setAperto(null);
  };
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
  const traccia = (canale: "whatsapp" | "linkedin" | "pagina") => {
    if (x?.tipo !== "cassetta") return;
    void fetch("/api/percorso/invio", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voceId: x.voceId, canale }) })
      .then((r) => { if (r.ok) { toast.success(`Segnato: mandato via ${canale === "whatsapp" ? "WhatsApp" : canale === "linkedin" ? "LinkedIn" : "messaggio alla pagina"}`); onCambio(); } });
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
  // I canali per mandare il messaggio, in ordine di preferenza (v3.115, Alessio: WhatsApp, mail, LinkedIn della
  // persona, pagina Instagram, Facebook, LinkedIn). Il primo è il pulsante principale, gli altri sono alternative.
  const ordine = x?.tipo === "cassetta" && a.passo >= 2
    ? canaliInOrdine({ whatsapp: x.whatsapp, email: x.testo ? x.email : null, linkedin: x.linkedin, pagina: x.pagina, piattaformaPagina: (x.piattaforma as "facebook" | "instagram" | "linkedin" | null) ?? null })
    : [];
  const descr = (k: (typeof ordine)[number]) => x?.tipo !== "cassetta" ? "" : k === "whatsapp" ? `WhatsApp al ${x.whatsapp}` : k === "email" ? `email a ${x.email} (la manda il CRM)` : k === "linkedin" ? "LinkedIn di chi decide" : `messaggio alla pagina ${NOME_PIATTAFORMA[x.piattaforma ?? ""] ?? ""}`.trim();
  const canali = ordine.map((k) => ({ k, descrizione: descr(k) }));
  const variante = (k: string): "default" | "outline" => (ordine[0] === k ? "default" : "outline");
  const paginaK = x?.tipo === "cassetta" && x.pagina ? `pagina_${x.piattaforma}` : "";
  const lav = a.lavorazioneId ? `/api/rete/lavorazioni/${a.lavorazioneId}` : null;
  return (
    // L'id serve a Oggi per aprire il Percorso proprio su quest'azienda (v3.78).
    <Card id={`azienda-${a.leadId}`} className={`scroll-mt-24 ${evidenziata ? "ring-2 ring-primary" : ""}`}><CardContent className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/aziende-trovate/${a.leadId}`} className="font-medium hover:underline break-words">{a.nome}</Link>
        <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{a.passo}. {passi.find((p) => p.n === a.passo)?.nome}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded ${TOCCA[a.tocca].classe}`}>{TOCCA[a.tocca].testo}</span>
        {a.mac && <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100">{testoMac(a.mac)}</span>}
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
      {/* v3.113: da contattare. Il canale e il caso studio si vedono prima di premere. */}
      {a.passo === 4 && x?.tipo === "cassetta" && a.stato !== "ha_risposto" && (
        <div className="space-y-1 text-xs">
          <div><span className="text-muted-foreground">Canale: </span>{canali.length ? <><strong>{canali[0].descrizione}</strong>{canali.length > 1 && <span className="text-muted-foreground"> · in alternativa: {canali.slice(1).map((c) => c.descrizione).join(", ")}</span>}</> : "nessun canale trovato: copia il testo e mandalo tu"}</div>
          {a.contatto?.caso && (
            <div><span className="text-muted-foreground">Caso studio citato nel messaggio: </span>
              <a href={`/api/ricerca/casi-studio/${a.contatto.caso.id}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">{a.contatto.caso.titolo}</a>
              <span className="text-muted-foreground"> (non è allegato: il messaggio chiede se può mandarlo; lo mandi quando dice sì)</span>
            </div>
          )}
        </div>
      )}
      {/* v3.113: aspetti la risposta. Quando, a chi, su che canale, cosa. */}
      {a.passo === 4 && a.contatto?.inviato && x?.tipo !== "cassetta" && (
        <div className="rounded-md border p-2 space-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">Scritto il </span>{quando(a.contatto.inviato.quando)}
            <span className="text-muted-foreground"> a </span>{a.contatto.inviato.aChi}
            {a.contatto.inviato.canale === "segnato a mano"
              ? <span className="text-muted-foreground"> · segnato a mano, canale non registrato</span>
              : <><span className="text-muted-foreground"> via </span>{a.contatto.inviato.canale}</>}{a.contatto.inviato.dove && <span className="text-muted-foreground"> ({a.contatto.inviato.dove})</span>}
            {a.contatto.inviato.tipo === "followup" && <span className="text-muted-foreground"> · era il follow-up</span>}
            {a.contatto.inviato.tipo === "caso" && <span className="text-muted-foreground"> · era il caso studio che ti aveva chiesto</span>}
          </div>
          {a.contatto.caso && <div><span className="text-muted-foreground">Caso studio citato: </span><a href={`/api/ricerca/casi-studio/${a.contatto.caso.id}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">{a.contatto.caso.titolo}</a></div>}
          {a.contatto.inviato.testo && (
            <details><summary className="cursor-pointer text-muted-foreground hover:text-foreground">Cosa gli hai scritto</summary>
              <div className="mt-1 rounded bg-muted/40 p-2 text-sm whitespace-pre-wrap break-words">{a.contatto.inviato.testo}</div>
            </details>
          )}
        </div>
      )}
      {a.passo === 4 && a.contatto && <Ricerche r={a.contatto.ricerche} />}
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
      {x?.tipo === "cassetta" && aperto && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/50 bg-primary/10 p-2 text-sm">
          <span>Hai aperto {aperto === "whatsapp" ? "WhatsApp" : aperto === "linkedin" ? "LinkedIn" : "la pagina"}: l&apos;hai mandato?</span>
          {bottone("conferma", "Sì, mandato", () => { traccia(aperto); chiudiConferma(); }, "default")}
          {bottone("annulla", "No, non ancora", chiudiConferma, "ghost")}
        </div>
      )}
      {a.stato === "caso" && x?.tipo === "cassetta" && (
        <div className="text-xs text-muted-foreground">Con la mail il PDF parte allegato dal CRM. Su WhatsApp o LinkedIn allegalo tu{x.casoId && <> (<a href={`/api/ricerca/casi-studio/${x.casoId}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">scarica il PDF</a>)</>}, poi conferma.</div>
      )}
      <div className="flex flex-wrap gap-2">
        {a.stato === "ha_risposto" && bottone("vuole-caso", "Vuole il caso studio", () => fai("vuole-caso", `/api/percorso/${a.leadId}/risposta`, "POST", undefined, "Segnato: il messaggio col caso studio è pronto qui sopra"), "default")}
        {a.contatto?.rispostaPossibile && x?.tipo !== "cassetta" && bottone("risposta", "Mi ha risposto: vuole il caso studio", () => fai("risposta", `/api/percorso/${a.leadId}/risposta`, "POST", undefined, "Segnato: il messaggio col caso studio è pronto qui sopra"), "default")}
        {x?.tipo === "decidi" && <>
          {bottone("si", "Approfondisci", () => fai("si", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "approfondisci" }, "Approfondita: entra al passo 2"), "default")}
          {bottone("no", "Scarta", () => fai("no", `/api/ricerca/aziende/${a.leadId}/decisione`, "POST", { azione: "scarta" }, "Scartata"), "ghost")}
        </>}
        {x?.tipo === "cassetta" && <>
          {/* v3.113: copia e "Mandato" solo se non c'è un canale: con WhatsApp, email o LinkedIn l'invio si registra da solo. */}
          {x.testo && !canali.length && bottone("copia", "Copia il testo", () => { void navigator.clipboard.writeText(x.testo!).then(() => toast.success("Copiato")); })}
          {x.link && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={x.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Apri il post</a></Button>}
          {/* Scrivere subito, col testo già dentro (v3.87). */}
          {x.whatsapp && <Button asChild size="sm" variant={variante("whatsapp")} className="h-8 text-xs"><a href={`https://wa.me/${x.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(x.testo ?? "")}`} target="_blank" rel="noopener noreferrer" onClick={() => apri("whatsapp")}>Apri WhatsApp col testo</a></Button>}
          {x.email && x.testo && bottone("email", `Manda email a ${x.email}`, () => { void mandaEmail(); }, variante("email"))}
          {/* v3.90: il caso studio da mandare appena dice sì. */}
          {x.casoId && a.passo !== 4 && <Button asChild size="sm" variant="outline" className="h-8 text-xs"><a href={`/api/ricerca/casi-studio/${x.casoId}/pdf`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Caso studio (PDF)</a></Button>}
          {x.linkedin && <Button asChild size="sm" variant={variante("linkedin")} className="h-8 text-xs"><a href={x.linkedin} target="_blank" rel="noopener noreferrer" title="Copia il testo e apre il profilo" onClick={() => { if (x.testo) void navigator.clipboard.writeText(x.testo); apri("linkedin"); }}>Apri LinkedIn (testo copiato)</a></Button>}
          {x.pagina && <Button asChild size="sm" variant={variante(paginaK)} className="h-8 text-xs"><a href={x.pagina} target="_blank" rel="noopener noreferrer" title="Copia il testo e apre la pagina" onClick={() => { if (x.testo) void navigator.clipboard.writeText(x.testo); apri("pagina"); }}>Apri la pagina {NOME_PIATTAFORMA[x.piattaforma ?? ""] ?? ""} (testo copiato)</a></Button>}
          {!canali.length && bottone("si", x.testo ? "L'ho mandato" : x.si, () => fai("si", `/api/cassetta/${x.voceId}`, "POST", { decisione: "APPROVATO" }, "Fatto: un passo avanti"), "default")}
          {a.stato !== "pagina" && bottone("no", x.no, () => fai("no", `/api/cassetta/${x.voceId}`, "POST", { decisione: "SCARTATO" }, "Segnato"), "ghost")}
        </>}
        {a.contatto?.followupPossibile && x?.tipo !== "cassetta" && bottone("followup", "Manda il follow-up adesso", () => fai("followup", `/api/percorso/${a.leadId}/followup`, "POST", undefined, "Follow-up pronto: lo trovi qui sopra, in Follow-up da mandare"))}
        {x?.tipo === "presentato" && lav && bottone("presentato", "Me l'ha presentata", () => fai("presentato", lav, "PATCH", { azione: "presentato" }, "Presentata: ora al passo 4"))}
        {x?.tipo === "incontro" && lav && bottone("incontro", "Incontro fissato", () => fai("incontro", lav, "PATCH", { azione: "incontro" }, "Incontro fissato: va in Trattative"), a.tocca === "te" ? "default" : "outline")}
        {lav && x?.tipo !== "cassetta" && bottone("pausa", "Pausa 3 mesi", () => fai("pausa", lav, "PATCH", { azione: "pausa" }, "In pausa: torna fra 3 mesi"), "ghost")}
        {/* v3.99: Elimina a qualunque passo (contatto, scaldare, approfondire): esce dal percorso per sempre. */}
        {bottone("elimina", "Elimina", () => { if (confirm(`Elimino ${a.nome}? Esce dal percorso e il CRM non la propone più.`)) void fai("elimina", `/api/percorso/${a.leadId}`, "DELETE", undefined, "Eliminata"); }, "ghost")}
      </div>
      {a.passo >= 2 && <AggiungiContatto leadId={a.leadId} onFatto={onCambio} />}
    </CardContent></Card>
  );
}
