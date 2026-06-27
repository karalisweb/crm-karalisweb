/**
 * Helper per le mail di outreach opt-in.
 *
 * Placeholder usati nelle mail generate dall'AI:
 *   {nome}            — Nome di battesimo del lead
 *   {azienda}         — Nome completo azienda/lead
 *   {settore}         — Categoria/settore del lead
 *   {metodoSD}        — Landing del Metodo SD
 *   {linkedinAlessio} — Profilo LinkedIn di Alessio (prova sociale)
 */

/**
 * Sceglie una variante di OGGETTO email. Le varianti sono righe separate da
 * "\n" nel campo `optInSubjects`. Ruota in base a `seed` cosi' l'oggetto
 * cambia (quasi) ad ogni invio: utile per la deliverability (niente subject
 * identico su tutta la lista). Con una sola riga non ruota nulla.
 */
export function pickSubjectVariant(subjectField: string, seed: number): string {
  const variants = subjectField
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (variants.length === 0) return subjectField.trim();
  if (variants.length === 1) return variants[0];
  const idx = ((seed % variants.length) + variants.length) % variants.length;
  return variants[idx];
}

/** Elenco placeholder con descrizione (per UI) */
export const AVAILABLE_PLACEHOLDERS = [
  { key: "{nome}", label: "Nome", description: "Nome di battesimo del prospect" },
  { key: "{azienda}", label: "Azienda", description: "Nome completo dell'azienda" },
  { key: "{settore}", label: "Settore", description: "Categoria/settore del lead" },
  { key: "{metodoSD}", label: "Metodo SD", description: "Landing del Metodo SD (configurata qui sotto)" },
  { key: "{linkedinAlessio}", label: "LinkedIn", description: "Profilo LinkedIn di Alessio (configurato qui sotto)" },
];
