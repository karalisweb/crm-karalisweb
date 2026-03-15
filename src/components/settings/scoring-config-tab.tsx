"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Tab Scoring v3.0 — "Disallineamento Strategico"
 * Il disallineamento è il driver principale, le ads sono aggravanti.
 * Pesi definiti in lead-score.ts e documentati qui per l'utente.
 */
export function ScoringConfigTab() {
  const scoringRules = [
    {
      category: "Errore Strategico",
      description: "L'AI ha trovato un disallineamento nel sito (DRIVER PRINCIPALE)",
      points: 50,
      color: "bg-red-500/15 text-red-400 border-red-500/25",
      logic: 'Gemini rileva pattern come "Lista della Spesa", "Sindrome dell\'Ego", "Target Fantasma", ecc. Questo e il segnale piu forte: il sito comunica male.',
    },
    {
      category: "Ads Attive",
      description: "Stanno spendendo soldi in pubblicita (aggravante)",
      points: 20,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
      logic: "Se vengono rilevate ads attive (Google Ads o Meta Ads). Aggravante: se il sito ha un errore strategico E spendono in ads, stanno bruciando budget.",
    },
    {
      category: "Ads Senza Tracking",
      description: "Spendono in ads ma non tracciano le conversioni",
      points: 10,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
      logic: "Se hanno ads attive MA non hanno pixel di tracking (Meta Pixel, Google Analytics, GTM, ecc.). Aggravante ulteriore.",
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
    { label: "FARE VIDEO", range: "80-100", color: "bg-red-600 text-white", description: "Massimo potenziale: errore strategico + ads + senza tracking + high-ticket = 100" },
    { label: "WARM", range: "50-79", color: "bg-yellow-600 text-white", description: "Buon potenziale: errore strategico + settore high-ticket (70) o errore + ads (70)" },
    { label: "COLD", range: "0-49", color: "bg-blue-600 text-white", description: "Basso potenziale: solo ads senza errore strategico, o solo settore" },
  ];

  const examples = [
    {
      name: "FARE VIDEO (100 punti)",
      items: ["Errore strategico: +50", "Ads attive: +20", "Ads senza tracking: +10", "Settore high-ticket: +20"],
      total: 100,
    },
    {
      name: "FARE VIDEO (90 punti)",
      items: ["Errore strategico: +50", "Ads attive: +20", "Settore high-ticket: +20"],
      total: 90,
    },
    {
      name: "WARM (70 punti)",
      items: ["Errore strategico: +50", "Settore high-ticket: +20"],
      total: 70,
    },
    {
      name: "WARM (60 punti)",
      items: ["Errore strategico: +50", "Settore standard: +10"],
      total: 60,
    },
    {
      name: "COLD (40 punti)",
      items: ["Ads attive: +20", "Settore high-ticket: +20"],
      total: 40,
    },
    {
      name: "COLD (30 punti)",
      items: ["Ads attive: +20", "Settore standard: +10"],
      total: 30,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Regole di Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Regole di Scoring v3.0</CardTitle>
          <CardDescription>
            Come viene calcolato il punteggio di ogni lead (0-100). Il driver principale e il &quot;Disallineamento Strategico&quot;: se il sito comunica male, e il segnale piu forte. Le ads sono un&apos;aggravante.
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
              <strong>Nota:</strong> Il punteggio massimo e 100. Formula: Errore strategico (50) + Ads attive (20) + Ads senza tracking (10) + High-ticket (20) = 100. Senza errore strategico, il max e 50 (sempre COLD).
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
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-400">
              <strong>Implicazione chiave:</strong> Un lead con solo ads attive ma senza errore strategico non puo superare 50 punti → resta sempre COLD. Per essere WARM o FARE VIDEO serve almeno un errore strategico rilevato.
            </p>
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
                        <span className={`font-bold ${pts >= 50 ? "text-red-400" : pts >= 20 ? "text-orange-400" : "text-yellow-400"}`}>
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
