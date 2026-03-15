"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Tab Scoring — visualizza come funziona il punteggio lead.
 * I pesi sono definiti in lead-score.ts e qui vengono documentati per l'utente.
 */
export function ScoringConfigTab() {
  const scoringRules = [
    {
      category: "Ads Attive",
      description: "Il lead sta spendendo soldi in pubblicita",
      points: 40,
      color: "bg-red-500/15 text-red-400 border-red-500/25",
      logic: "Se vengono rilevate ads attive (Google Ads o Meta Ads) dal sito o da Apify",
    },
    {
      category: "Ads Senza Pixel",
      description: "Spendono in ads ma non tracciano le conversioni",
      points: 20,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
      logic: "Se hanno ads attive MA non hanno pixel di tracking (Meta Pixel, Google Analytics, GTM, ecc.)",
    },
    {
      category: "Errore Strategico",
      description: "L'AI ha trovato un errore nel loro marketing",
      points: 20,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
      logic: 'Gemini rileva pattern come "Lista della Spesa", "Ego Trip", "Cliche Factory", ecc.',
    },
    {
      category: "Settore High-Ticket",
      description: "Operano in un settore ad alto margine",
      points: 20,
      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
      logic: "Edilizia, serramenti, piscine, immobiliare, dentisti, software, automotive, fotovoltaico...",
    },
    {
      category: "Settore Standard",
      description: "Settore con margine nella media",
      points: 10,
      color: "bg-gray-500/15 text-gray-400 border-gray-500/25",
      logic: "Categorie non classificate come high-ticket o low-ticket",
    },
    {
      category: "Settore Low-Ticket",
      description: "Settore con margine basso",
      points: 5,
      color: "bg-gray-500/15 text-gray-400 border-gray-500/25",
      logic: "Ristoranti, parrucchieri, bar, gelaterie, tabacchi, lavanderie...",
    },
  ];

  const thresholds = [
    { label: "HOT", range: "80-100", color: "bg-red-600 text-white", description: "Massimo potenziale: ads attive + senza tracking + errore strategico + high-ticket" },
    { label: "WARM", range: "50-79", color: "bg-yellow-600 text-white", description: "Buon potenziale: combinazione di 2-3 fattori positivi" },
    { label: "COLD", range: "0-49", color: "bg-blue-600 text-white", description: "Basso potenziale: pochi segnali commerciali rilevati" },
  ];

  const examples = [
    {
      name: "Esempio HOT (100 punti)",
      items: ["Ads attive: +40", "Ads senza pixel: +20", "Errore strategico: +20", "Settore high-ticket: +20"],
      total: 100,
    },
    {
      name: "Esempio WARM (60 punti)",
      items: ["Ads attive: +40", "Settore high-ticket: +20"],
      total: 60,
    },
    {
      name: "Esempio COLD (30 punti)",
      items: ["Settore standard: +10", "Errore strategico: +20"],
      total: 30,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Regole di Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Regole di Scoring</CardTitle>
          <CardDescription>
            Come viene calcolato il punteggio di ogni lead (0-100). Basato sul concetto di &quot;Sanguinamento Finanziario&quot;: piu soldi sprecano, piu alto il potenziale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scoringRules.map((rule) => (
              <div key={rule.category} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className={`${rule.color} border font-black text-sm px-3 py-1 flex-shrink-0`}>
                  +{rule.points}
                </Badge>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{rule.category}</p>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{rule.logic}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> Il punteggio massimo e 100. I fattori sono cumulativi: Ads attive (40) + Ads senza pixel (20) + Errore strategico (20) + High-ticket (20) = 100 punti.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Soglie di Classificazione */}
      <Card>
        <CardHeader>
          <CardTitle>Soglie di Classificazione</CardTitle>
          <CardDescription>
            Come il punteggio determina la classificazione automatica del lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {thresholds.map((t) => (
              <div key={t.label} className="flex items-center gap-3 p-3 rounded-lg border">
                <Badge className={`${t.color} font-bold text-sm px-3 py-1`}>
                  {t.label}
                </Badge>
                <div>
                  <p className="font-semibold text-sm">Score {t.range}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Esempi */}
      <Card>
        <CardHeader>
          <CardTitle>Esempi di Calcolo</CardTitle>
          <CardDescription>
            Come si compone il punteggio in scenari tipici
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {examples.map((ex) => (
              <div key={ex.name} className="p-4 rounded-lg border space-y-2">
                <p className="font-semibold text-sm">{ex.name}</p>
                <div className="space-y-1">
                  {ex.items.map((item, i) => {
                    const match = item.match(/\+(\d+)/);
                    const pts = match ? parseInt(match[1]) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.split(":")[0]}</span>
                        <span className={`font-bold ${pts >= 40 ? "text-red-400" : pts >= 20 ? "text-orange-400" : "text-yellow-400"}`}>
                          +{pts}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs font-semibold">Totale</span>
                  <span className="text-lg font-black">{ex.total}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settori */}
      <Card>
        <CardHeader>
          <CardTitle>Classificazione Settori</CardTitle>
          <CardDescription>
            Come la categoria Google Maps influenza il punteggio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <p className="font-semibold text-sm text-yellow-400 mb-2">High-Ticket (+20)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Edilizia, serramenti, infissi, piscine, immobiliare, studi legali, commercialisti, concessionarie, fotovoltaico, arredamento, dentisti, cliniche, software, web agency
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-500/30 bg-gray-500/5">
              <p className="font-semibold text-sm text-gray-400 mb-2">Standard (+10)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tutte le categorie non classificate come high-ticket o low-ticket
              </p>
            </div>
            <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <p className="font-semibold text-sm text-blue-400 mb-2">Low-Ticket (+5)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ristoranti, pizzerie, bar, parrucchieri, barbieri, estetiste, fiorai, tabacchi, edicole, lavanderie, gelaterie
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
