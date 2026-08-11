"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Search, FileText, Users, Loader2, ExternalLink } from "lucide-react";

/**
 * Facciata unica (piano, Fase 3). I quattro moduli raggiungibili da un solo
 * posto, senza reinserire le credenziali: il collegamento passa da un token
 * firmato di vita breve emesso dal CRM.
 */
const MODULI = [
  {
    app: null,
    nome: "Acquisizione clienti",
    descrizione: "Ricerca aziende, analizza i loro siti, gestisce la trattativa.",
    icona: Users,
    tono: "bg-blue-50 text-blue-700 border-blue-200",
    href: "/",
  },
  {
    app: "gads" as const,
    nome: "Rendimento attività digitali",
    descrizione: "Analizza i dati di rendimento delle attività su Google.",
    icona: BarChart3,
    tono: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    app: "seoi" as const,
    nome: "Visibilità organica",
    descrizione: "Misura le posizioni, i concorrenti e lo stato di salute dei siti.",
    icona: Search,
    tono: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    app: "hub" as const,
    nome: "Produzione contenuti",
    descrizione: "Pianifica, scrive e pubblica articoli e contenuti social.",
    icona: FileText,
    tono: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

export default function ModuliPage() {
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function apri(app: string) {
    setErrore(null);
    setInCorso(app);
    try {
      const r = await fetch("/api/sso/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app }),
      });
      const dati = await r.json();
      if (!r.ok) throw new Error(dati?.error ?? "Errore imprevisto");
      window.location.href = dati.url;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto");
      setInCorso(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">OrchestraAI</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          I quattro moduli della piattaforma. Sei già dentro: aprendone uno non
          ti verranno richieste di nuovo le credenziali.
        </p>
      </header>

      {errore && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{errore}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {MODULI.map((m) => {
          const Icona = m.icona;
          const attesa = inCorso === m.app;
          return (
            <Card key={m.nome} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`rounded-lg border p-2 ${m.tono}`}>
                      <Icona className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{m.nome}</div>
                      <div className="text-xs text-muted-foreground">{m.descrizione}</div>
                    </div>
                  </div>
                  {!m.app && <Badge variant="outline">sei qui</Badge>}
                </div>

                {m.app ? (
                  <button
                    onClick={() => apri(m.app!)}
                    disabled={attesa}
                    className="inline-flex items-center gap-2 text-sm font-medium
                               rounded-md border px-3 py-1.5 hover:bg-accent
                               disabled:opacity-60 disabled:cursor-wait"
                  >
                    {attesa ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <ExternalLink className="h-4 w-4" />}
                    {attesa ? "Apertura…" : "Apri il modulo"}
                  </button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    È il modulo in cui ti trovi adesso.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
