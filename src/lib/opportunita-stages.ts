/**
 * OPPORTUNITA' EXTRA-BNI — stadi e fonti.
 *
 * Opportunita' calde che arrivano da fuori (non lead freddi, non membri BNI):
 * un collega per una collaborazione, un preventivo da lavorare, un referral.
 * Pipeline volutamente corta e leggibile.
 */

export type OppStageKey = "DA_SENTIRE" | "IN_CORSO" | "PREVENTIVO" | "VINTO" | "PERSO";

export interface OppStageConfig {
  key: OppStageKey;
  label: string;
  order: number;
  icon: string;
  color: string;
  /** true = stadio chiuso (non conta fra le opportunita' aperte). */
  closed?: boolean;
}

export const OPP_STAGES: OppStageConfig[] = [
  { key: "DA_SENTIRE", label: "Da sentire", order: 0, icon: "📇", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "IN_CORSO", label: "In corso", order: 1, icon: "💬", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "PREVENTIVO", label: "Preventivo", order: 2, icon: "📄", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "VINTO", label: "Vinto", order: 3, icon: "✅", color: "bg-emerald-100 text-emerald-700 border-emerald-200", closed: true },
  { key: "PERSO", label: "Perso", order: 4, icon: "✖️", color: "bg-red-100 text-red-700 border-red-200", closed: true },
];

const STAGE_BY_KEY = new Map(OPP_STAGES.map((s) => [s.key, s]));
export const getOppStage = (k?: string | null) => (k ? STAGE_BY_KEY.get(k as OppStageKey) ?? null : null);
export const isValidOppStage = (k?: string | null): k is OppStageKey => !!k && STAGE_BY_KEY.has(k as OppStageKey);
export const OPEN_OPP_STAGES: OppStageKey[] = OPP_STAGES.filter((s) => !s.closed).map((s) => s.key);

export interface OppSourceConfig {
  key: string;
  label: string;
  icon: string;
}

export const OPP_SOURCES: OppSourceConfig[] = [
  { key: "collega", label: "Collega / Partner", icon: "🤝" },
  { key: "referral", label: "Referral / Passaparola", icon: "🎁" },
  { key: "evento", label: "Evento / Networking", icon: "📅" },
  { key: "ex_cliente", label: "Ex-cliente", icon: "🔁" },
  { key: "bni", label: "BNI", icon: "🔵" },
  { key: "altro", label: "Altro", icon: "•" },
];

const SOURCE_BY_KEY = new Map(OPP_SOURCES.map((s) => [s.key, s]));
export const getOppSource = (k?: string | null) => (k ? SOURCE_BY_KEY.get(k) ?? null : null);
export const OPP_SOURCE_KEYS = OPP_SOURCES.map((s) => s.key);
