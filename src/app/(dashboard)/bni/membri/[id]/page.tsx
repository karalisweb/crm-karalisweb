"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, CalendarClock, FileText, Linkedin, Loader2, Mail, MessageCircle, MessageSquarePlus, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";
import { localeAIso } from "@/components/vendita/call-fissata-dialog";
import { FORMATI, data, dataOra } from "@/components/ricerca/etichette";
import { ImbutoPresentazione, PuntiContatto, Segnalazioni, type PresentazioneImbuto, type Segnalazione } from "@/components/ricerca/motore-121";
import { etichettePunti } from "@/lib/agents/motore-121";
import { CorpoPreparazione121, CorpoPresentazioneBni, CorpoVisitaCapitolo } from "@/components/agents/voci-cassetta";
import { DaMandare } from "@/components/ricerca/tracker-incontri";

interface Scheda {
  membro: {
    id: string; nome: string; azienda: string | null; categoria: string | null; capitolo: string | null; telefono: string | null; email: string | null;
    sito: string | null; linkedin: string | null; ruolo: string | null; cosaFa: string | null; referenzeCerca: string | null; referenzePuoDare: string | null;
    prossimoPasso: string | null; prossimoPassoAt: string | null; next121At: string | null; indicatoDa: string | null; reteLettaAt: string | null;
    reteInCorso: boolean; personeInRete: number; note: string | null; stato: "DA_INCONTRARE" | "FISSATO" | "CONOSCIUTO";
    azienda_collegata: { id: string; name: string; website: string | null } | null;
    linkedinStato: string | null; newsletterAt: string | null; studiatoAt: string | null;
  };
  capitolo: { id: string; name: string; mode: string | null; meetingDay: string | null; meetingTime: string | null; sede: string | null } | null;
  capitoli: string[];
  storia: { id: string; date: string; formato: string | null; location: string | null; notes: string | null; riassunto: string | null; promesse: string | null; haTrascrizione: boolean }[];
  presentazioni: (PresentazioneImbuto & { linkedinUrl: string | null; perche: string | null; puntiContatto: unknown; forza: number })[];
  segnalazioni: Segnalazione[];
  inCassetta: { id: string; kind: string; title: string; payload: Record<string, unknown> }[];
}

const STATI: Record<Scheda["membro"]["stato"], string> = { DA_INCONTRARE: "da incontrare", FISSATO: "121 fissato", CONOSCIUTO: "conosciuto" };

function Sezione({ n, titolo, children, azione }: { n: number; titolo: string; children: React.ReactNode; azione?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm"><span className="text-muted-foreground mr-1">{n}.</span>{titolo}</CardTitle>
        {azione}
      </CardHeader>
      <CardContent className="text-sm break-words">{children}</CardContent>
    </Card>
  );
}

/** Un testo della scheda che si corregge a mano. */
function TestoModificabile({ valore, campo, id, vuoto, onSalvato }: { valore: string | null; campo: string; id: string; vuoto: string; onSalvato: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState(valore ?? "");
  async function salva() {
    const r = await fetch(`/api/ricerca/bni/membri/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [campo]: testo }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    setAperto(false);
    onSalvato();
  }
  if (aperto) {
    return (
      <div className="space-y-2">
        <Textarea value={testo} onChange={(e) => setTesto(e.target.value)} rows={4} />
        <div className="flex gap-2"><Button size="sm" onClick={salva}>Salva</Button><Button size="sm" variant="ghost" onClick={() => setAperto(false)}>Annulla</Button></div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-2">
      <p className={`whitespace-pre-wrap ${valore ? "" : "text-muted-foreground"}`}>{valore || vuoto}</p>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setTesto(valore ?? ""); setAperto(true); }} aria-label="Modifica"><Pencil className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function TelefonoModificabile({ valore, id, onSalvato }: { valore: string | null; id: string; onSalvato: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState(valore ?? "");
  async function salva() {
    const r = await fetch(`/api/ricerca/bni/membri/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: testo.trim() || null }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    setAperto(false);
    onSalvato();
  }
  if (aperto) {
    return (
      <span className="flex items-center gap-2">
        <Input value={testo} onChange={(e) => setTesto(e.target.value)} type="tel" placeholder="+39 ..." className="h-8 w-44" autoFocus onKeyDown={(e) => e.key === "Enter" && salva()} />
        <Button size="sm" className="h-8" onClick={salva}>Salva</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setAperto(false)}>Annulla</Button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {valore ? <a href={`tel:${valore}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5" />{valore}</a> : <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" />Nessun telefono</span>}
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setTesto(valore ?? ""); setAperto(true); }} aria-label="Modifica telefono"><Pencil className="h-3 w-3" /></Button>
    </span>
  );
}

function Registra121({ id, formatoCapitolo, onFatto }: { id: string; formatoCapitolo: string | null; onFatto: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [quando, setQuando] = useState("");
  const [formato, setFormato] = useState(formatoCapitolo === "ONLINE" ? "ONLINE" : "PRESENZA");
  const [testo, setTesto] = useState("");
  const [salvo, setSalvo] = useState(false);
  async function salva() {
    const iso = localeAIso(quando) ?? new Date().toISOString();
    setSalvo(true);
    try {
      const r = await fetch(`/api/ricerca/bni/membri/${id}/121`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: iso, formato, testo: testo || null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success(d.aiUsata ? `121 registrato: scheda compilata${d.presentazioni ? `, ${d.presentazioni} persone da farti presentare` : ""}` : d.motivo ?? "121 registrato");
      setAperto(false);
      setTesto("");
      onFatto();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSalvo(false);
    }
  }
  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild><Button size="sm"><MessageSquarePlus className="h-4 w-4 mr-1" /> Registra il 121</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registra il 121</DialogTitle>
          <DialogDescription>Online: incolla la trascrizione di Google Meet. Di persona: detta un vocale di 2 minuti (cosa fa, che referenze cerca, chi conosce, cosa vi siete promessi). Anche un 121 di tempo fa, senza testo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="q121">Quando (vuoto = adesso)</Label><Input id="q121" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
            <div className="space-y-1">
              <Label htmlFor="f121">Come</Label>
              <select id="f121" value={formato} onChange={(e) => setFormato(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="PRESENZA">Di persona</option>
                <option value="ONLINE">Online (Meet)</option>
              </select>
            </div>
          </div>
          <div className="space-y-1"><Label htmlFor="t121">Trascrizione o vocale</Label><Textarea id="t121" value={testo} onChange={(e) => setTesto(e.target.value)} rows={8} placeholder="Incolla qui…" /></div>
        </div>
        <DialogFooter><Button onClick={salva} disabled={salvo}>{salvo && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salva</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SchedaMembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Scheda | null>(null);
  const [quando121, setQuando121] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [versione, setVersione] = useState(0);
  const carica = useCallback(() => setVersione((v) => v + 1), []);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/ricerca/bni/membri/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const x: Scheda = await r.json();
        if (!vivo) return;
        setD(x);
        setLinkedin(x.membro.linkedin ?? "");
      })
      .catch(() => toast.error("Membro non trovato"));
    return () => {
      vivo = false;
    };
  }, [id, versione]);

  async function patch(body: Record<string, unknown>, ok = "Salvato") {
    const r = await fetch(`/api/ricerca/bni/membri/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success(ok);
    carica();
  }
  const [invitando, setInvitando] = useState(false);
  async function invita() {
    setInvitando(true);
    try {
      const r = await fetch(`/api/ricerca/bni/membri/${id}/invito`, { method: "POST" });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error || "Errore");
      toast.success("Messaggio pronto: controllalo e mandalo su WhatsApp");
      carica();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setInvitando(false);
    }
  }
  async function decidi(voceId: string, decisione: "APPROVATO" | "SCARTATO") {
    const r = await fetch(`/api/cassetta/${voceId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decisione }) });
    if (!r.ok) return toast.error("Non sono riuscito a salvare");
    toast.success("Fatto");
    carica();
  }

  if (!d) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
  const m = d.membro;

  return (
    <div className="space-y-4 min-w-0">
      <Link href="/bni/membri" className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Rubrica BNI</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{m.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={m.stato === "CONOSCIUTO" ? "outline" : "secondary"}>{STATI[m.stato]}</Badge>
            {m.stato === "FISSATO" && m.next121At && <span className="text-sm">{dataOra(m.next121At)}</span>}
            {m.indicatoDa && <span className="text-xs text-muted-foreground">indicato da {m.indicatoDa}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!d.inCassetta.some((v) => v.kind === "MESSAGGIO_BNI") && (
            <Button size="sm" variant="outline" onClick={invita} disabled={invitando}>
              {invitando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-1" />} Invitalo a un 121
            </Button>
          )}
          {m.stato === "FISSATO" && (
            <Link href={`/bni/121/${m.id}`}><Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" /> Pagina del 121</Button></Link>
          )}
          <Registra121 id={m.id} formatoCapitolo={d.capitolo?.mode ?? null} onFatto={carica} />
        </div>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
        <CalendarClock className="h-4 w-4 text-blue-600" />
        <span>{m.next121At ? `Incontro fissato: ${dataOra(m.next121At)}` : "Hai fissato un incontro?"}</span>
        <Input type="datetime-local" value={quando121} onChange={(e) => setQuando121(e.target.value)} className="h-8 w-auto" />
        <Button size="sm" onClick={() => { const iso = localeAIso(quando121); if (iso) patch({ next121At: iso }, "Incontro fissato: lo trovi in Incontri BNI"); else toast.error("Scegli data e ora"); }}>
          {m.next121At ? "Sposta" : "Segna come fissato"}
        </Button>
        {m.next121At && <Button size="sm" variant="ghost" onClick={() => patch({ next121At: null }, "Incontro tolto dal calendario")}>Annulla l&apos;incontro</Button>}
      </CardContent></Card>

      {d.inCassetta.map((v) => (
        <Card key={v.id} className="border-amber-400"><CardContent className="p-3 space-y-2">
          <div className="text-sm font-semibold">
            {v.kind === "PREPARAZIONE_121" ? "Il foglio per l'incontro" : v.kind === "VISITA_CAPITOLO" ? "Chiedi la visita al capitolo" : v.kind === "DOPO_121" ? "Com'è andato il 121?" : v.kind === "PRESENTAZIONE_BNI" ? v.title : "Messaggio da mandare"}
          </div>
          {v.kind === "PREPARAZIONE_121" && <CorpoPreparazione121 p={v.payload} />}
          {v.kind === "VISITA_CAPITOLO" && <CorpoVisitaCapitolo p={v.payload} telefono={m.telefono} />}
          {v.kind === "PRESENTAZIONE_BNI" && <CorpoPresentazioneBni p={v.payload} telefono={m.telefono} />}
          {v.kind === "MESSAGGIO_BNI" && (
            <DaMandare
              r={{ voceId: v.id, membroId: m.id, nome: m.nome, capitolo: m.capitolo ?? "", telefono: m.telefono, perche: (v.payload.perche as string) ?? null, messaggio: (v.payload.messaggio as string) ?? "", formato: (v.payload.formato as string) ?? null, mandataIl: null }}
              onFatto={carica}
            />
          )}
          {v.kind !== "MESSAGGIO_BNI" && <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => decidi(v.id, "APPROVATO")}>{v.kind === "PREPARAZIONE_121" ? "Letto" : v.kind === "DOPO_121" ? "Fatto" : "Mandato"}</Button>
            <Button size="sm" variant="ghost" onClick={() => decidi(v.id, "SCARTATO")}>{v.kind === "PREPARAZIONE_121" ? "Non serve" : "Non ora"}</Button>
          </div>}
        </CardContent></Card>
      ))}

      <Sezione n={1} titolo="Chi è">
        <div className="space-y-1">
          <div>{[m.categoria, m.azienda].filter(Boolean).join(" · ") || "—"}</div>
          {d.capitolo && (
            <div className="text-muted-foreground">
              <Link href={`/bni/capitoli/${d.capitolo.id}`} className="hover:underline">{d.capitolo.name}</Link>
              {d.capitolo.mode && ` · ${FORMATI[d.capitolo.mode] ?? d.capitolo.mode}`}
              {m.ruolo && ` · ${m.ruolo.toLowerCase()}`}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <TelefonoModificabile id={m.id} valore={m.telefono} onSalvato={carica} />
            {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3.5 w-3.5" />{m.email}</a>}
            {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
            {m.azienda_collegata && <Link href={`/aziende-trovate/${m.azienda_collegata.id}`} className="hover:underline">Scheda azienda{m.studiatoAt ? ` (studiata il ${data(m.studiatoAt)})` : ""}</Link>}
          </div>
          {(m.linkedinStato === "COLLEGATI" || m.linkedinStato === "RICHIESTA_INVIATA") && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-muted-foreground">Newsletter LinkedIn e Substack:</span>
              {m.newsletterAt ? (
                <>
                  <span>invitato il {data(m.newsletterAt)}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => patch({ newsletter: false }, "Tolto")}>Annulla</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => patch({ newsletter: true }, "Segnato: invitato alle newsletter")}>L&apos;ho invitato</Button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <select
              value={m.capitolo ?? ""}
              onChange={(e) => e.target.value && e.target.value !== m.capitolo && patch({ capitolo: e.target.value }, `Spostato in ${e.target.value}`)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
              aria-label="Capitolo"
            >
              {d.capitoli.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600" onClick={() => { if (confirm(`${m.nome} non è più nel capitolo ${m.capitolo ?? ""}? Sparisce dalla Rubrica e dagli incontri (i dati restano).`)) patch({ stato: "EX_MEMBRO" }, "Tolto dal capitolo"); }}>
              Non è più nel capitolo
            </Button>
          </div>
          {!m.linkedin && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="Profilo LinkedIn" className="h-8 max-w-xs" />
              <Button size="sm" variant="outline" onClick={() => patch({ linkedin })} disabled={!linkedin}>Salva</Button>
            </div>
          )}
        </div>
      </Sezione>

      <Sezione n={2} titolo="Cosa fa">
        <TestoModificabile id={m.id} campo="cosaFa" valore={m.cosaFa} vuoto="Si compila dal 121 (trascrizione o vocale)." onSalvato={carica} />
      </Sezione>
      <Sezione n={3} titolo="Referenze che cerca">
        <TestoModificabile id={m.id} campo="referenzeCerca" valore={m.referenzeCerca} vuoto="Il suo cliente ideale: si compila dal 121." onSalvato={carica} />
      </Sezione>
      <Sezione n={4} titolo="Referenze che può dare">
        <TestoModificabile id={m.id} campo="referenzePuoDare" valore={m.referenzePuoDare} vuoto="Chi conosce, i suoi clienti, il suo giro: si compila dal 121." onSalvato={carica} />
        <div className="text-xs text-muted-foreground mt-2">
          Rete LinkedIn: {m.reteInCorso ? "in lettura…" : m.reteLettaAt ? `letta il ${data(m.reteLettaAt)} · ${m.personeInRete} persone trovate` : "non ancora letta (si legge quando fissi il 121)"}
        </div>
      </Sezione>

      <Sezione n={5} titolo="Persone da farsi presentare">
        {d.presentazioni.length === 0 ? (
          <p className="text-muted-foreground">Ancora nessuna: arrivano dalla sua rete LinkedIn (le aziende del serbatoio che conosce) e da quello che vi dite al 121.</p>
        ) : (
          <div className="space-y-2">
            {d.presentazioni.map((p) => (
              <div key={p.id} className="border-b last:border-0 pb-2 space-y-1">
                <div className="min-w-0">
                  <div>{p.nome} {p.ruolo && <span className="text-muted-foreground">— {p.ruolo}</span>} {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">profilo</a>}</div>
                  {p.perche && <div className="text-xs text-muted-foreground">{p.perche}</div>}
                  <PuntiContatto punti={etichettePunti(p.puntiContatto)} forza={p.forza} />
                </div>
                <ImbutoPresentazione p={p} onCambio={carica} />
              </div>
            ))}
          </div>
        )}
      </Sezione>

      <Sezione n={6} titolo="Contatti da segnalargli">
        <Segnalazioni lista={d.segnalazioni} onCambio={carica} />
      </Sezione>

      <Sezione n={7} titolo="La vostra storia">
        {d.storia.length === 0 ? (
          <p className="text-muted-foreground">Nessun 121 registrato.</p>
        ) : (
          <div className="space-y-3">
            {d.storia.map((o) => (
              <div key={o.id} className="border-l-2 border-primary/40 pl-3">
                <div className="font-medium">{data(o.date)} · {o.formato === "ONLINE" ? "online" : o.formato === "PRESENZA" ? "di persona" : o.location ?? "121"}</div>
                {o.riassunto && <p className="whitespace-pre-wrap">{o.riassunto}</p>}
                {!o.riassunto && o.notes && <p className="whitespace-pre-wrap">{o.notes}</p>}
                {o.promesse && <div className="text-xs mt-1"><span className="text-muted-foreground">Promesse:</span> <span className="whitespace-pre-wrap">{o.promesse}</span></div>}
              </div>
            ))}
          </div>
        )}
      </Sezione>

      <Sezione n={8} titolo="Prossimo passo">
        <TestoModificabile id={m.id} campo="prossimoPasso" valore={m.prossimoPasso} vuoto="Nessuno." onSalvato={carica} />
        {m.prossimoPassoAt && <div className="text-xs text-muted-foreground mt-1">entro il {data(m.prossimoPassoAt)}</div>}
      </Sezione>
    </div>
  );
}
