"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Tab Scoring v3.1 — "Segnali Digitali"
 * Il disallineamento è il driver principale, le ads sono aggravanti.
 * Tracking e recensioni sono segnali di maturità digitale.
 * Il tier è sovrascrivibile manualmente dalla card.
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
      logic: "Verificato manualmente su Google Ads Transparency e Meta Ad Library. Se il sito ha un errore strategico E spendono in ads, stanno bruciando budget.",
    },
    {
      category: "Tracking Attivo",
      description: "Hanno strumenti di tracking nel sito (segnale digitale)",
      points: 10,
      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
      logic: "GA4, GTM, Meta Pixel, Google Ads Tag, ecc. trovati nel DOM. Un lead con tracking investe nel digitale = piu vicino al nostro target.",
    },
    {
      category: "Recensioni Forti",
      description: "50+ recensioni Google con rating > 4.0 (business solido)",
      points: 10,
      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
      logic: "Un business con molte recensioni positive e consolidato, ha fatturato e puo investire in marketing. Soglia: 50+ recensioni E rating superiore a 4.0.",
    },
    {
      category: "Settore High-Ticket",
      description: "Operano in un settore ad alto margine",
      points: 20,
      color: "bg-orange-500/15 text-orange-400 border-orange-500/25",
      logic: "Edilizia, serramenti, piscine, immobiliare, dentisti, software, automotive, fotovoltaico... Sovrascrivibile manualmente dalla card.",
    },
    {
      category: "Settore Standard",
      description: "Settore con margine nella media",
      points: 10,
      color: "bg-gray-500/15 text-gray-400 border-gray-500/25",
      logic: "Categorie non classificate come high-ticket o low-ticket. Sovrascrivibile manualmente.",
    },
    {
      category: "Settore Low-Ticket",
      description: "Settore con margine basso",
      points: 5,
      color: "bg-gray-500/15 text-gray-400 border-gray-500/25",
      logic: "Ristoranti, parrucchieri, bar, gelaterie, tabacchi, lavanderie... Sovrascrivibile manualmente.",
    },
  ];

  const thresholds = [
    { label: "HOT LEAD", range: "80-100", color: "bg-red-600 text-white", description: "Massimo potenziale: errore strategico (50) + ads (20) + tracking (10) + high-ticket (20) = 100. Tu decidi se fare il video." },
    { label: "WARM", range: "50-79", color: "bg-yellow-600 text-white", description: "Buon potenziale: errore strategico + high-ticket (70) o errore + ads (70)" },
    { label: "COLD", range: "0-49", color: "bg-blue-600 text-white", description: "Basso potenziale: senza errore strategico il max e 40 (ads + high-ticket)" },
  ];

  const examples = [
    {
      name: "HOT LEAD (100 punti)",
      items: ["Errore strategico: +50", "Ads attive: +20", "Tracking attivo: +10", "Settore high-ticket: +20"],
      total: 100,
    },
    {
      name: "HOT LEAD (90 punti)",
      items: ["Errore strategico: +50", "Ads attive: +20", "Settore high-ticket: +20"],
      total: 90,
    },
    {
      name: "HOT LEAD (80 punti)",
      items: ["Errore strategico: +50", "Tracking attivo: +10", "Settore high-ticket: +20"],
      total: 80,
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
  ];

  return (
    <div className="space-y-4">
      {/* Regole di Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Regole di Scoring v3.1</CardTitle>
          <CardDescription>
            Come viene calcolato il punteggio di ogni lead (0-100). Il driver principale e il &quot;Disallineamento Strategico&quot;. Le ads sono un&apos;aggravante. Tracking e recensioni sono segnali di maturita digitale.
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
              <strong>Nota:</strong> Il punteggio massimo e 100 (cap). Formula massima: Errore strategico (50) + Ads attive (20) + Tracking attivo (10) + Recensioni forti (10) + High-ticket (20) = 110 → cap a 100. Senza errore strategico, il max e 40-50 (sempre COLD). Score ≥80 → HOT LEAD (sei tu a decidere se fare il video).
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
              <strong>Implicazione chiave:</strong> Un lead con solo ads attive ma senza errore strategico non puo superare 50 punti → resta sempre COLD. Per essere WARM o HOT LEAD serve almeno un errore strategico rilevato. Da HOT LEAD sei tu a decidere se fare il video.
            </p>
          </div>
          <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-xs text-emerald-400">
              <strong>Tier override:</strong> Puoi cambiare manualmente il settore (High-Ticket / Standard / Low-Ticket) direttamente dalla card del lead, cliccando sul tier nel breakdown score. Il cambio ricalcola automaticamente il punteggio.
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
            Come la categoria Google Maps influenza il punteggio. Il tier e sovrascrivibile manualmente dalla card di ogni lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <p className="font-semibold text-sm text-orange-400 mb-2">High-Ticket (+20)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Edilizia, serramenti, infissi, piscine, immobiliare, studi legali, commercialisti, concessionarie, fotovoltaico, arredamento, dentisti, cliniche, software, web agency
              </p>
            </div>
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <p className="font-semibold text-sm text-yellow-400 mb-2">Standard (+10)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tutte le categorie non classificate come high-ticket o low-ticket
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-500/30 bg-gray-500/5">
              <p className="font-semibold text-sm text-gray-400 mb-2">Low-Ticket (+5)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ristoranti, pizzerie, bar, parrucchieri, barbieri, estetiste, fiorai, tabacchi, edicole, lavanderie, gelaterie
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Override manuale:</strong> Se la classificazione automatica e sbagliata (es. un &quot;Centro Design&quot; classificato high-ticket che in realta e un negozio piccolo), puoi cambiare il tier direttamente dalla card del lead nel breakdown score. Il cambio viene salvato e usato in tutti i ricalcoli futuri.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
