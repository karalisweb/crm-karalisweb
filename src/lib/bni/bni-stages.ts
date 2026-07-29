/**
 * PIPELINE DI VENDITA BNI — le tappe della relazione con ogni membro.
 *
 * È una pipeline PARALLELA a quella dei lead freddi, con le sue regole:
 * qui non si "vende a freddo", si costruisce fiducia e reciprocità (Givers Gain).
 * I passi sono quelli dettati da Alessio (2026-07-28).
 *
 * Le prime due tappe del suo elenco (visita al capitolo, pitch dedicato) vivono
 * sul CAPITOLO (BniChapter.visitStatus), non sul membro. Da "recupero bigliettini
 * e richiesta 121" in poi si lavora sul singolo membro: questa è quella pipeline.
 */

export type BniStageKey =
  | "DA_AVVICINARE"
  | "RICHIESTA_121"
  | "PREP_REFERENZE"
  | "FATTO_121"
  | "OFFERTA"
  | "RECALL"
  | "CONSOLIDATO";

export interface BniStageConfig {
  key: BniStageKey;
  label: string;
  /** Ordine nella pipeline (0 = inizio). */
  order: number;
  icon: string;
  color: string;
  /** Cosa vuol dire essere qui, e qual è la prossima azione. */
  hint: string;
}

export const BNI_STAGES: BniStageConfig[] = [
  {
    key: "DA_AVVICINARE",
    label: "Da avvicinare",
    order: 0,
    icon: "👋",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    hint: "Conosciuto (bigliettino recuperato o importato). Prossimo passo: chiedergli un 121.",
  },
  {
    key: "RICHIESTA_121",
    label: "121 richiesto",
    order: 1,
    icon: "📨",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    hint: "Gli ho chiesto il 121 / è da fissare. Prossimo passo: preparare cosa dargli.",
  },
  {
    key: "PREP_REFERENZE",
    label: "Preparo referenze",
    order: 2,
    icon: "🎁",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    hint: "121 in agenda: uso il Memo 121 per trovare chi regalargli. Prossimo passo: fare il 121.",
  },
  {
    key: "FATTO_121",
    label: "121 fatto",
    order: 3,
    icon: "🤝",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    hint: "121 fatto e referenze scambiate. Prossimo passo: mandare la nostra offerta (per lui o per un suo cliente).",
  },
  {
    key: "OFFERTA",
    label: "Offerta inviata",
    order: 4,
    icon: "📄",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    hint: "Offerta mandata (per lui o per un suo cliente). Prossimo passo: ricontattarlo dopo il tempo giusto.",
  },
  {
    key: "RECALL",
    label: "Recall programmato",
    order: 5,
    icon: "⏰",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    hint: "In attesa del ricontatto. Quando arriva la data, il membro risale in cima.",
  },
  {
    key: "CONSOLIDATO",
    label: "Consolidato",
    order: 6,
    icon: "⭐",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    hint: "Rapporto attivo e ricorrente: partner che porta referenze o cliente acquisito.",
  },
];

const BY_KEY = new Map<BniStageKey, BniStageConfig>(BNI_STAGES.map((s) => [s.key, s]));

export function getStage(key?: string | null): BniStageConfig | null {
  if (!key) return null;
  return BY_KEY.get(key as BniStageKey) ?? null;
}

export function getStageLabel(key?: string | null): string {
  return getStage(key)?.label ?? "Da avvicinare";
}

export const DEFAULT_BNI_STAGE: BniStageKey = "DA_AVVICINARE";

export function isValidStage(key?: string | null): key is BniStageKey {
  return !!key && BY_KEY.has(key as BniStageKey);
}
