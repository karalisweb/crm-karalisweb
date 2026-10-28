"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Foglio {
  decisore: string | null;
  apertura: string | null;
  ganci: { frase: string; prova: string }[];
  aree: { titolo: string; righe: { nome: string; testo: string }[] }[];
  note: { titolo: string; testo: string }[];
  commenti: { quando: string; piattaforma: string | null; post: string | null; estratto: string | null; commento: string | null }[];
}

const giorno = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

/** Il foglio da leggere prima del contatto (v3.65): ganci, scheda tecnica per area, le tue note, i commenti fatti. */
export function CosaDirgli({ leadId }: { leadId: string }) {
  const [f, setF] = useState<Foglio | null>(null);
  const [errore, setErrore] = useState(false);
  useEffect(() => {
    fetch(`/api/percorso/${leadId}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setF).catch(() => setErrore(true));
  }, [leadId]);

  if (errore) return <div className="text-sm text-red-600">Non riesco a leggere il foglio.</div>;
  if (!f) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Preparo il foglio…</div>;

  const titolo = (t: string) => <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t}</div>;
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-sm min-w-0">
      <div className="space-y-1">
        {titolo(f.decisore ? `Per aprire con ${f.decisore}` : "Per aprire")}
        {f.apertura ? <p className="font-medium break-words">{f.apertura}</p> : <p className="text-muted-foreground">I 3 ganci non sono ancora pronti: li prepara il CRM al prossimo giro.</p>}
        {f.ganci.length > 0 && (
          <ol className="list-decimal pl-5 space-y-1">
            {f.ganci.map((g, i) => <li key={i} className="break-words">{g.frase}{g.prova && <span className="block text-xs text-muted-foreground">{g.prova}</span>}</li>)}
          </ol>
        )}
      </div>

      {f.commenti.length > 0 && (
        <div className="space-y-1">
          {titolo(`I tuoi commenti (${f.commenti.length})`)}
          <ul className="space-y-1.5">
            {f.commenti.map((c, i) => (
              <li key={i} className="break-words">
                <span className="text-xs text-muted-foreground">{giorno(c.quando)}{c.piattaforma ? ` · ${c.piattaforma}` : ""} </span>
                {c.estratto && <span className="text-muted-foreground">sul post «{c.estratto.slice(0, 120)}{c.estratto.length > 120 ? "…" : ""}»: </span>}
                {c.commento ?? <span className="text-muted-foreground">segnato a mano</span>}
                {c.post && <a href={c.post} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs underline">post</a>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {f.note.length > 0 && (
        <div className="space-y-1">
          {titolo("Le tue note")}
          {f.note.map((n) => <p key={n.titolo} className="break-words"><b>{n.titolo}:</b> {n.testo}</p>)}
        </div>
      )}

      {f.aree.map((a) => (
        <div key={a.titolo} className="space-y-1">
          {titolo(a.titolo)}
          {a.righe.map((r) => <p key={r.nome} className="break-words"><b>{r.nome}:</b> {r.testo}</p>)}
        </div>
      ))}
      {f.aree.length === 0 && <p className="text-muted-foreground">La scheda tecnica non c&apos;è ancora: l&apos;analisi completa non è finita.</p>}
    </div>
  );
}
