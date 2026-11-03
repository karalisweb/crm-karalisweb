"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Loader2, Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ORIGINI_DEFAULT, PASSI_DEFAULT, slug, type Origine, type Passo } from "@/lib/vendita/fila";

/**
 * Impostazioni → Vendita (v3.93): la fila dei passi, da trascinare, e le origini delle richieste.
 * I passi fissi (quelli che muovono la trattativa) si rinominano e si cambiano i giorni, non si spengono.
 */
export function PannelloVendita() {
  const [passi, setPassi] = useState<Passo[]>([]);
  const [origini, setOrigini] = useState<Origine[]>([]);
  const [fissi, setFissi] = useState<string[]>([]);
  const [nuovaOrigine, setNuovaOrigine] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modificato, setModificato] = useState(false);

  useEffect(() => {
    fetch("/api/vendita/config")
      .then((r) => r.json())
      .then((d) => {
        setPassi(d.passi ?? []);
        setOrigini(d.origini ?? []);
        setFissi(d.fissi ?? []);
      })
      .catch(() => toast.error("Configurazione non caricata"))
      .finally(() => setLoading(false));
  }, []);

  const cambia = (i: number, campo: Partial<Passo>) => {
    setPassi((p) => p.map((x, j) => (j === i ? { ...x, ...campo } : x)));
    setModificato(true);
  };

  function trascinato(r: DropResult) {
    if (!r.destination || r.destination.index === r.source.index) return;
    const nuovi = [...passi];
    const [mosso] = nuovi.splice(r.source.index, 1);
    nuovi.splice(r.destination.index, 0, mosso);
    // I passi fissi restano nel loro ordine: chi li scavalca viene rimesso a posto.
    const ordine = nuovi.filter((p) => fissi.includes(p.id)).map((p) => p.id);
    if (ordine.some((id, i) => i > 0 && fissi.indexOf(id) < fissi.indexOf(ordine[i - 1]))) {
      toast.error(`"${mosso.nome}" non può scavalcare un altro passo fisso`);
      return;
    }
    setPassi(nuovi);
    setModificato(true);
  }

  function aggiungiPasso() {
    const id = `p_${Date.now().toString(36)}`;
    setPassi((p) => [...p, { id, nome: "Nuovo passo", attivo: true, giorni: 2, promemoria: "Muovi {nome}" }]);
    setModificato(true);
  }

  function aggiungiOrigine() {
    const nome = nuovaOrigine.trim();
    if (!nome) return;
    const id = slug(nome);
    if (!id || origini.some((o) => o.id === id)) {
      toast.error("C'è già");
      return;
    }
    setOrigini((o) => [...o, { id, nome }]);
    setNuovaOrigine("");
    setModificato(true);
  }

  async function salva() {
    setSaving(true);
    try {
      const r = await fetch("/api/vendita/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passi, origini }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore nel salvataggio");
      setPassi(d.passi);
      setOrigini(d.origini);
      setModificato(false);
      toast.success("Salvato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  function ripristina() {
    setPassi(PASSI_DEFAULT);
    setOrigini(ORIGINI_DEFAULT);
    setModificato(true);
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline mr-2 animate-spin" />Carico…</div>;

  return (
    <div className="space-y-4 min-w-0">
      <Card>
        <CardHeader>
          <CardTitle>La fila della vendita</CardTitle>
          <CardDescription>
            Trascina i passi per cambiare l&apos;ordine. Se una trattativa resta ferma in un passo più dei giorni scritti, te lo ricordo in Oggi e nel report del mattino.
            Nel promemoria, {"{nome}"} diventa il nome del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <DragDropContext onDragEnd={trascinato}>
            <Droppable droppableId="passi">
              {(drop) => (
                <div ref={drop.innerRef} {...drop.droppableProps} className="space-y-2">
                  {passi.map((p, i) => {
                    const fisso = fissi.includes(p.id);
                    return (
                      <Draggable key={p.id} draggableId={p.id} index={i}>
                        {(drag, stato) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`rounded-lg border bg-card p-3 ${stato.isDragging ? "shadow-lg border-primary" : ""} ${p.attivo ? "" : "opacity-60"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span {...drag.dragHandleProps} className="cursor-grab touch-none text-muted-foreground p-1 -m-1" aria-label="Trascina">
                                <GripVertical className="h-5 w-5" />
                              </span>
                              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                              <Input value={p.nome} onChange={(e) => cambia(i, { nome: e.target.value })} className="h-9 flex-1 min-w-0 font-medium" aria-label="Nome del passo" />
                              {fisso ? (
                                <Badge variant="secondary" className="text-[10px] shrink-0">fisso</Badge>
                              ) : (
                                <>
                                  <Switch checked={p.attivo} onCheckedChange={(v) => cambia(i, { attivo: v })} aria-label="Acceso" />
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setPassi((x) => x.filter((_, j) => j !== i)); setModificato(true); }} aria-label="Togli il passo">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:pl-9 items-center">
                              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                Ricordamelo dopo
                                <Input
                                  type="number"
                                  min={0}
                                  max={365}
                                  value={p.giorni ?? ""}
                                  placeholder="mai"
                                  onChange={(e) => cambia(i, { giorni: e.target.value === "" ? null : Number(e.target.value) })}
                                  className="h-8 w-16"
                                />
                                {p.id === "call_fissata" ? "giorni dalla call" : "giorni"}
                              </label>
                              <Input
                                value={p.promemoria}
                                onChange={(e) => cambia(i, { promemoria: e.target.value })}
                                placeholder="Cosa ti scrivo nel promemoria"
                                className="h-8 text-sm"
                                disabled={p.giorni == null}
                                aria-label="Testo del promemoria"
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {drop.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Button variant="outline" size="sm" onClick={aggiungiPasso}><Plus className="h-4 w-4 mr-1" /> Aggiungi un passo</Button>
          <p className="text-xs text-muted-foreground">
            Fuori dalla fila restano le regole fisse: se dopo il preventivo non risponde, il CRM prepara i richiami; poi nurturing o uscita.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Da dove arrivano le richieste</CardTitle>
          <CardDescription>La lista che trovi in &quot;Nuova richiesta&quot;.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {origini.map((o) => (
              <Badge key={o.id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 text-sm font-normal">
                {o.nome}
                <button onClick={() => { setOrigini((x) => x.filter((y) => y.id !== o.id)); setModificato(true); }} className="rounded p-0.5 hover:bg-muted" aria-label={`Togli ${o.nome}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={nuovaOrigine} onChange={(e) => setNuovaOrigine(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aggiungiOrigine()} placeholder="Es. Fiera, Instagram…" className="h-9" />
            <Button variant="outline" size="sm" onClick={aggiungiOrigine}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-2">
        <Button onClick={salva} disabled={saving || !modificato}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salva
        </Button>
        <Button variant="outline" onClick={ripristina}><RotateCcw className="h-4 w-4 mr-1" /> Torna ai valori iniziali</Button>
      </div>
    </div>
  );
}
