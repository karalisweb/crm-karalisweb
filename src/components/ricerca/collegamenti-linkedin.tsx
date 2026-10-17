"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, Linkedin, X } from "lucide-react";
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
      {dati.daCollegare.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun profilo pronto. L&apos;agente sul tuo Mac ne trova 20 al giorno (serve l&apos;attività programmata attiva).</p>
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
    </CardContent></Card>
  );
}
