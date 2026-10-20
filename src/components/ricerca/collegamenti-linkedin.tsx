"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Copy, ExternalLink, Linkedin, Mail, X } from "lucide-react";
import { toast } from "sonner";

export interface DaCollegare {
  id: string;
  name: string;
  company: string | null;
  profession: string | null;
  chapter: string | null;
  linkedinUrl: string | null;
  conosciutoAt: string | null;
}
export interface StatoLinkedin {
  conteggi: Record<string, number>;
  daCollegare: DaCollegare[];
  /** Motore 121: 12 inviti al giorno nei feriali, 100 a settimana. */
  inviti?: { oggi: number; settimana: number; restantiOggi: number };
  blocco?: boolean;
  bloccoFinoAl?: string | null;
  letture?: { usate: number; disponibili: number };
  daNewsletter?: { id: string; name: string; chapter: string | null; linkedinUrl: string | null }[];
  daNewsletterTotale?: number;
}

function nota(m: DaCollegare): string {
  const nome = m.name.split(" ")[0];
  return m.conosciutoAt
    ? `Ciao ${nome}, sono Alessio Loi di Karalisweb (BNI Atlantide). Dopo il nostro 121 mi fa piacere restare in contatto anche qui.`
    : `Ciao ${nome}, sono Alessio Loi di Karalisweb, Capitolo Atlantide di Cagliari. Siamo entrambi in BNI Sardegna: mi fa piacere collegarci anche qui.`;
}

/** Collegarsi su LinkedIn con tutti i membri BNI: l'agente trova i profili, Alessio preme "Collegati". */
export function CollegamentiLinkedin({ dati, onCambio }: { dati: StatoLinkedin; onCambio: () => void }) {
  const c = dati.conteggi;
  const totale = Object.values(c).reduce((a, b) => a + b, 0);
  const collegati = (c.COLLEGATI ?? 0) + (c.RICHIESTA_INVIATA ?? 0);
  async function segnaNewsletter(id: string) {
    const r = await fetch(`/api/ricerca/bni/membri/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newsletter: true }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success("Segnato: invitato alle newsletter");
    onCambio();
  }
  async function segna(id: string, linkedinStato: string, ok: string) {
    const r = await fetch(`/api/ricerca/bni/membri/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkedinStato }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success(ok);
    onCambio();
  }
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold flex items-center gap-2"><Linkedin className="h-4 w-4 text-[#0a66c2]" /> Collegati su LinkedIn con tutti i membri</div>
        <div className="text-xs text-muted-foreground">
          {c.COLLEGATI ?? 0} collegati · {c.RICHIESTA_INVIATA ?? 0} richieste inviate · {c.DA_COLLEGARE ?? 0} da collegare · {c.DA_CERCARE ?? 0} da cercare · {c.NON_TROVATO ?? 0} non trovati
        </div>
      </div>
      <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-[#0a66c2]" style={{ width: `${totale ? (collegati / totale) * 100 : 0}%` }} /></div>
      {dati.inviti && (
        <div className="text-xs text-muted-foreground">
          Inviti oggi {dati.inviti.oggi}/12 · questa settimana {dati.inviti.settimana}/100 — solo nei giorni feriali, per non farsi notare da LinkedIn.
        </div>
      )}
      {dati.blocco && (
        <div className="text-xs text-red-600 flex items-start gap-1">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          LinkedIn ha chiesto una verifica o ha bloccato una ricerca: niente inviti né letture{dati.bloccoFinoAl ? ` fino a ${new Date(dati.bloccoFinoAl).toLocaleString("it-IT", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : " per 48 ore"}.
        </div>
      )}
      {dati.daCollegare.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {dati.inviti && dati.inviti.restantiOggi === 0 && !dati.blocco
            ? "Per oggi basta: hai mandato gli inviti del giorno (o è fine settimana)."
            : "Nessun profilo pronto. L'agente sul tuo Mac ne trova qualcuno ogni giorno, dentro il budget LinkedIn (serve l'attività programmata attiva)."}
        </p>
      ) : (
        <div className="space-y-2">
          {dati.daCollegare.map((m) => (
            <div key={m.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{[m.profession, m.chapter].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.linkedinUrl && (
                    <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Apri il profilo</Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(nota(m)).then(() => toast.success("Nota copiata"))}><Copy className="h-3.5 w-3.5 mr-1" /> Nota</Button>
                  <Button size="sm" variant="outline" onClick={() => segna(m.id, "RICHIESTA_INVIATA", "Richiesta inviata")}><Check className="h-3.5 w-3.5 mr-1" /> Inviata</Button>
                  <Button size="sm" variant="ghost" onClick={() => segna(m.id, "COLLEGATI", "Già collegati")}>Già collegati</Button>
                  <Button size="sm" variant="ghost" onClick={() => segna(m.id, "NON_TROVATO", "Profilo tolto: lo ricerco")}><X className="h-3.5 w-3.5 mr-1" /> Profilo sbagliato</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!!dati.daNewsletter?.length && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> Invitali alle newsletter (LinkedIn e Substack) · {dati.daNewsletterTotale ?? dati.daNewsletter.length}</div>
          <p className="text-xs text-muted-foreground">Già collegati: dalla tua newsletter su LinkedIn usa &quot;Invita&quot;, e mandagli il link di Substack.</p>
          {dati.daNewsletter.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0">{m.name} <span className="text-xs text-muted-foreground">{m.chapter}</span></span>
              <div className="flex gap-1.5">
                {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" className="h-7 text-xs"><ExternalLink className="h-3 w-3 mr-1" /> Profilo</Button></a>}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => segnaNewsletter(m.id)}><Check className="h-3 w-3 mr-1" /> Invitato</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}
