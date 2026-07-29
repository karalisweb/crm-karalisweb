"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, AlertTriangle, Key, Target, Swords, Users } from "lucide-react";
import { toast } from "sonner";

/**
 * IMPORT MASSIVO MEMBRI BNI
 *
 * Popolare un capitolo a mano (30+ persone) non succede mai: senza anagrafica,
 * coda 121, capitoli e matcher restano schermate vuote. Qui si incolla la lista
 * e il CRM la interpreta.
 *
 * L'anteprima è obbligatoria: il parser è tollerante per accettare formati diversi,
 * quindi Alessio deve poter vedere cosa ha capito PRIMA di scrivere sul database.
 */

interface ImportRow {
  name: string;
  profession: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  warning: string | null;
  duplicate: boolean;
  memberRole: string;
  buyerPersona: string | null;
}

interface Summary {
  parsed: number;
  duplicates: number;
  newOnes: number;
  partners: number;
  clients: number;
  competitors: number;
  neutral: number;
  truncated: boolean;
}

const ROLE_ICON: Record<string, string> = {
  PARTNER: "🔑",
  CLIENTE: "🎯",
  CONCORRENTE: "⚔️",
  NEUTRO: "🤝",
};

const PERSONA_ICONS: Record<string, string> = {
  CASA: "🏠",
  MICROTURISMO: "🏡",
  PERSONA: "👤",
  ALTRO: "📦",
};

interface Props {
  chapters: string[];
  onImported?: () => void;
}

export function ImportMembriDialog({ chapters, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [chapter, setChapter] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  function reset() {
    setRaw("");
    setChapter("");
    setRows(null);
    setSummary(null);
  }

  async function run(mode: "preview" | "commit") {
    if (!raw.trim()) {
      toast.error("Incolla la lista dei membri");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/bni/membri/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, chapter: chapter.trim() || null, mode }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Errore nell'import");

      if (mode === "preview") {
        setRows(d.rows);
        setSummary(d.summary);
      } else {
        toast.success(
          d.created > 0
            ? `${d.created} membri importati${chapter ? ` in ${chapter}` : ""}`
            : "Nessun membro nuovo da importare"
        );
        setOpen(false);
        reset();
        onImported?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Importa
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importa membri di un capitolo
          </DialogTitle>
          <DialogDescription>
            Incolla la lista: il CRM la interpreta e classifica ogni membro su clienti e partner.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chapter">Capitolo (si applica a tutti)</Label>
            <Input
              id="chapter"
              list="bni-chapters-import"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="es. Atlantide"
            />
            <datalist id="bni-chapters-import">
              {chapters.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="raw">Lista membri — una riga per persona</Label>
            <Textarea
              id="raw"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setRows(null);
                setSummary(null);
              }}
              rows={8}
              className="font-mono text-xs"
              placeholder={`Mario Rossi - Commercialista - Studio Rossi
Anna Bianchi - Architetto - Bianchi Progetti
Luca Verdi - Infissi - Verdi Serramenti srl`}
            />
            <p className="text-xs text-muted-foreground">
              <strong>Suggerimento:</strong> apri la pagina del capitolo sul sito BNI,
              seleziona la tabella dei membri e incollala qui direttamente — il CRM
              riconosce le colonne (nome, società, professione) da solo. Funziona anche
              con Excel, punto e virgola o trattini. Email e telefoni vengono estratti in automatico.
            </p>
          </div>

          {/* Anteprima */}
          {summary && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {summary.parsed} righe lette
                </Badge>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">
                  <Key className="h-3 w-3 mr-1" />
                  {summary.partners} partner
                </Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-500/40">
                  <Target className="h-3 w-3 mr-1" />
                  {summary.clients} clienti
                </Badge>
                {summary.competitors > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-500/40">
                    <Swords className="h-3 w-3 mr-1" />
                    {summary.competitors} concorrenti
                  </Badge>
                )}
                {summary.duplicates > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                    {summary.duplicates} già presenti (saltati)
                  </Badge>
                )}
              </div>

              {summary.truncated && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Oltre 300 righe: importo le prime 300. Ripeti l&apos;operazione per il resto.</span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-2">
                {rows?.map((r, i) => (
                  <div
                    key={i}
                    className={`text-xs flex items-start justify-between gap-2 rounded-md px-2 py-1.5 ${
                      r.duplicate ? "opacity-50 bg-muted/40" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        <span>{ROLE_ICON[r.memberRole] ?? ""}</span>
                        {r.name}
                        {r.buyerPersona && <span>{PERSONA_ICONS[r.buyerPersona]}</span>}
                        {r.duplicate && (
                          <Badge variant="outline" className="text-[10px]">già presente</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {[r.profession, r.company].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {r.warning && (
                        <div className="text-amber-600 dark:text-amber-400 text-[11px] mt-0.5">
                          {r.warning}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!summary ? (
            <Button onClick={() => run("preview")} disabled={loading || !raw.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Anteprima
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setRows(null); setSummary(null); }} disabled={loading}>
                Modifica lista
              </Button>
              <Button onClick={() => run("commit")} disabled={loading || summary.newOnes === 0}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Importa {summary.newOnes} membri
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
