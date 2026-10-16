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
import { ArrowLeft, Bot, Loader2, Save, Inbox } from "lucide-react";
import { toast } from "sonner";
import { CorpoDopoCall, CorpoNurturing, CorpoPreparazione, CorpoRecall } from "@/components/agents/voci-cassetta";
import { localeAIso } from "@/components/vendita/call-fissata-dialog";
import { MOTIVI_USCITA, ORIGINI, STADI, TRASCRIZIONE_MINIMA, type AgenteVendita, type Origine, type Stadio } from "@/lib/vendita/regole";

interface Evento { id: string; tipo: string; testo: string | null; da: string | null; a: string | null; createdAt: string }
interface Referto { id: string; agent: string; summary: string; findings: Record<string, unknown>; collectedAt: string }
interface Voce { id: string; kind: string; status: string; title: string }
interface Dettaglio {
  id: string; nome: string; origine: string; stadio: Stadio; referente: string | null; telefono: string | null; email: string | null;
  callAt: string | null; trascrizione: string | null; valoreEuro: number | null; prossimoPasso: string | null; prossimaData: string | null;
  recallFatti: number; motivoUscita: string | null; inRitardo: boolean; transizioni: Stadio[];
  eventi: Evento[]; agentReports: Referto[]; approvalItems: Voce[];
  lead: { id: string; name: string; website: string | null } | null;
  bniMembro: { id: string; name: string; company: string | null; chapter: string | null } | null;
  opportunita: { id: string; name: string } | null;
}

const NOMI_AGENTI: Record<string, string> = {
  preparazione_call: "V1 Preparatore call",
  dopo_call: "V2 Dopo-call",
  recall: "V3 Recall",
  nurturing: "V4 Nurturing",
};

/** ISO → valore per <input type="datetime-local"> nell'ora locale. */
function isoALocale(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

export default function TrattativaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [form, setForm] = useState({ callAt: "", referente: "", telefono: "", email: "", valoreEuro: "", prossimoPasso: "", prossimaData: "", trascrizione: "", nota: "" });
  const [occupato, setOccupato] = useState<string | null>(null);
  const [uscita, setUscita] = useState<{ a: Stadio; motivo: string } | null>(null);

  const carica = useCallback(async () => {
    try {
      const r = await fetch(`/api/trattative/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      const x: Dettaglio = d.trattativa;
      setT(x);
      setForm((f) => ({
        ...f,
        callAt: isoALocale(x.callAt),
        referente: x.referente ?? "",
        telefono: x.telefono ?? "",
        email: x.email ?? "",
        valoreEuro: x.valoreEuro != null ? String(x.valoreEuro) : "",
        prossimoPasso: x.prossimoPasso ?? "",
        prossimaData: isoALocale(x.prossimaData),
        trascrizione: x.trascrizione ?? "",
      }));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore");
    }
  }, [id]);

  useEffect(() => {
    carica();
  }, [carica]);

  async function patch(body: Record<string, unknown>, chi: string, ok: string) {
    setOccupato(chi);
    try {
      const r = await fetch(`/api/trattative/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success(ok);
      await carica();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
      return false;
    } finally {
      setOccupato(null);
    }
  }

  async function agente(a: AgenteVendita) {
    setOccupato(a);
    try {
      const r = await fetch(`/api/trattative/${id}/agente`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agente: a }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore");
      toast.success("Fatto: lo trovi qui sotto e in Cassetta");
      await carica();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setOccupato(null);
    }
  }

  async function vaiA(a: Stadio) {
    if (a === "EXIT" || a === "NURTURING") {
      setUscita({ a, motivo: "" });
      return;
    }
    await patch({ stadio: a }, `stadio-${a}`, `Ora: ${STADI[a].label}`);
  }

  async function salvaDati() {
    await patch(
      {
        callAt: localeAIso(form.callAt),
        referente: form.referente || null,
        telefono: form.telefono || null,
        email: form.email || null,
        valoreEuro: form.valoreEuro ? Number(form.valoreEuro) : null,
        prossimoPasso: form.prossimoPasso || null,
        prossimaData: localeAIso(form.prossimaData),
        ...(form.nota.trim() ? { nota: form.nota } : {}),
      },
      "dati",
      "Salvato"
    );
    setForm((f) => ({ ...f, nota: "" }));
  }

  async function salvaTrascrizione(ePrepara: boolean) {
    const ok = await patch({ trascrizione: form.trascrizione }, "trascrizione", "Trascrizione salvata");
    if (ok && ePrepara) await agente("dopo_call");
  }

  if (errore) return <Card className="border-red-500"><CardContent className="p-4 text-red-500">{errore}</CardContent></Card>;
  if (!t) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  const aperta = STADI[t.stadio].aperto;
  const inCassetta = t.approvalItems.filter((v) => v.status === "IN_ATTESA");
  const corti = form.trascrizione.trim().length < TRASCRIZIONE_MINIMA;

  return (
    <div className="space-y-4 min-w-0">
      <Link href="/trattative" className="text-sm text-muted-foreground hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Trattative</Link>

      <div className="min-w-0">
        <h1 className="text-2xl font-bold break-words">{t.nome}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="outline">{STADI[t.stadio].icona} {STADI[t.stadio].label}</Badge>
          <Badge variant="secondary">{ORIGINI[t.origine as Origine] ?? t.origine}</Badge>
          {t.inRitardo && <Badge className="bg-rose-500/90 text-white">in ritardo</Badge>}
          {t.lead && <Link href={`/leads/${t.lead.id}`} className="text-xs underline">scheda azienda</Link>}
          {t.bniMembro && <Link href="/rete-bni" className="text-xs underline">membro BNI · {t.bniMembro.chapter}</Link>}
          {t.opportunita && <Link href="/opportunita" className="text-xs underline">opportunità</Link>}
        </div>
        {t.motivoUscita && <p className="text-xs text-muted-foreground mt-1">Motivo: {t.motivoUscita}</p>}
      </div>

      {inCassetta.length > 0 && (
        <Link href="/cassetta" className="block">
          <Card className="border-amber-400"><CardContent className="p-3 text-sm flex items-center gap-2"><Inbox className="h-4 w-4 text-amber-500" /> In cassetta: {inCassetta.map((v) => v.title.split(": ").pop()).join(", ")}</CardContent></Card>
        </Link>
      )}

      {aperta && t.transizioni.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Passa a</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {t.transizioni.map((a) => (
                <Button key={a} size="sm" variant={a === "EXIT" ? "outline" : "secondary"} onClick={() => vaiA(a)} disabled={!!occupato}>
                  {occupato === `stadio-${a}` && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{STADI[a].icona} {STADI[a].label}
                </Button>
              ))}
            </div>
            {uscita && (
              <div className="rounded-lg border p-3 space-y-2">
                <Label htmlFor="motivo">{uscita.a === "EXIT" ? "Perché si chiude?" : "Perché non è il momento?"}</Label>
                <select id="motivo" value={uscita.motivo} onChange={(e) => setUscita({ ...uscita, motivo: e.target.value })} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                  <option value="">Scegli…</option>
                  {MOTIVI_USCITA.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!uscita.motivo || !!occupato} onClick={async () => { if (await patch({ stadio: uscita.a, motivo: uscita.motivo }, `stadio-${uscita.a}`, `Ora: ${STADI[uscita.a].label}`)) setUscita(null); }}>Conferma</Button>
                  <Button size="sm" variant="ghost" onClick={() => setUscita(null)}>Annulla</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {aperta && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Fai lavorare un agente adesso</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(["preparazione_call", "dopo_call", "recall", "nurturing"] as AgenteVendita[]).map((a) => (
              <Button key={a} size="sm" variant="outline" onClick={() => agente(a)} disabled={!!occupato || (a === "dopo_call" && !t.trascrizione)}>
                {occupato === a && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{NOMI_AGENTI[a]}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trascrizione della call</CardTitle>
          <p className="text-xs text-muted-foreground">Incolla la trascrizione di Google Meet (o gli appunti di Gemini). Il Dopo-call ne ricava la lettera strategica.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={form.trascrizione} onChange={(e) => setForm({ ...form, trascrizione: e.target.value })} rows={8} placeholder="Incolla qui…" className="text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => salvaTrascrizione(true)} disabled={!!occupato || corti}>
              {(occupato === "trascrizione" || occupato === "dopo_call") && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salva e prepara il dopo-call
            </Button>
            <Button size="sm" variant="outline" onClick={() => salvaTrascrizione(false)} disabled={!!occupato}>Salva soltanto</Button>
            {corti && form.trascrizione.trim() && <span className="text-xs text-muted-foreground">Troppo corta: servono almeno {TRASCRIZIONE_MINIMA} caratteri</span>}
          </div>
          {t.stadio === "CALL_FISSATA" && <p className="text-xs text-muted-foreground">Dopo la call premi &quot;Call fatta&quot; qui sopra.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Dati</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="d-call">Call</Label><Input id="d-call" type="datetime-local" value={form.callAt} onChange={(e) => setForm({ ...form, callAt: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-ref">Con chi parli</Label><Input id="d-ref" value={form.referente} onChange={(e) => setForm({ ...form, referente: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-tel">Telefono</Label><Input id="d-tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-mail">Email</Label><Input id="d-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-passo">Prossimo passo</Label><Input id="d-passo" value={form.prossimoPasso} onChange={(e) => setForm({ ...form, prossimoPasso: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-data">Entro</Label><Input id="d-data" type="datetime-local" value={form.prossimaData} onChange={(e) => setForm({ ...form, prossimaData: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="d-val">Valore stimato (€)</Label><Input id="d-val" type="number" min={0} value={form.valoreEuro} onChange={(e) => setForm({ ...form, valoreEuro: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="d-nota">Nota nel diario</Label><Textarea id="d-nota" rows={2} value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></div>
          <Button size="sm" onClick={salvaDati} disabled={!!occupato}>{occupato === "dati" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salva</Button>
        </CardContent>
      </Card>

      {t.agentReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Il lavoro degli agenti</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {t.agentReports.map((r, i) => (
              <details key={r.id} className="rounded-lg border p-3 min-w-0" open={i === 0}>
                <summary className="cursor-pointer list-none">
                  <div className="text-sm font-medium">{NOMI_AGENTI[r.agent] ?? r.agent} <span className="text-xs text-muted-foreground font-normal">· {new Date(r.collectedAt).toLocaleDateString("it-IT")}</span></div>
                  <div className="text-xs text-muted-foreground break-words">{r.summary}</div>
                </summary>
                <div className="mt-3">
                  {r.agent === "preparazione_call" && <CorpoPreparazione p={r.findings} />}
                  {r.agent === "dopo_call" && <CorpoDopoCall p={r.findings} telefono={t.telefono} />}
                  {r.agent === "recall" && <CorpoRecall p={r.findings} telefono={t.telefono} />}
                  {r.agent === "nurturing" && <CorpoNurturing p={r.findings} telefono={t.telefono} />}
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Diario</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {t.eventi.map((e) => (
            <div key={e.id} className="text-sm border-l-2 border-primary/30 pl-2">
              <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</div>
              {e.tipo === "STADIO" && e.a ? <div>{e.da ? `${STADI[e.da as Stadio]?.label} → ` : ""}<strong>{STADI[e.a as Stadio]?.label}</strong></div> : null}
              {e.testo && <div className="break-words">{e.testo}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
