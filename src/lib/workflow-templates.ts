/**
 * Workflow Template Engine
 *
 * Renderizza i template dei workflow step sostituendo i placeholder.
 *
 * Placeholder disponibili:
 *   {nome}        — Nome di battesimo del lead
 *   {azienda}     — Nome completo azienda/lead
 *   {settore}     — Categoria/settore del lead
 *   {landingUrl}  — URL landing page video (con utm=client)
 *   {linkPrenotazione} — Link prenotazione consulenza (Google Calendar)
 *   {firma}       — Firma email (Alessio o Francesca, basato su fromName)
 *   {casiStudio}  — Blocco casi studio
 */

export interface TemplateLead {
  name: string;
  category: string | null;
  segment: string | null;
  videoLandingUrl: string | null;
}

export interface TemplateSettings {
  bookingUrl: string | null;
  signatureAlessio: string | null;
  signatureFrancesca: string | null;
  caseStudiesBlock: string | null;
  sdLandingUrl?: string | null;
  alessioLinkedinUrl?: string | null;
}

export interface TemplateStep {
  fromName: string | null;
}

function addUtm(url: string | null): string {
  if (!url) return "[link analisi]";
  return url + (url.includes("?") ? "&" : "?") + "utm=client";
}

export function renderTemplate(
  template: string,
  lead: TemplateLead,
  settings: TemplateSettings,
  step: TemplateStep,
): string {
  const firstName = lead.name.split(" ")[0];
  const isFrancesca = step.fromName?.toLowerCase().includes("francesca") ?? false;
  const firma = isFrancesca
    ? settings.signatureFrancesca || "Francesca\nKaralisweb"
    : settings.signatureAlessio || "Alessio Loi\nKaralisweb";

  return template
    .replace(/\{nome\}/g, firstName)
    .replace(/\{azienda\}/g, lead.name)
    .replace(/\{settore\}/g, lead.segment || lead.category || "")
    .replace(/\{landingUrl\}/g, addUtm(lead.videoLandingUrl))
    .replace(/\{linkPrenotazione\}/g, settings.bookingUrl || "[link prenotazione]")
    .replace(/\{calendlyUrl\}/g, settings.bookingUrl || "[link prenotazione]")
    .replace(/\{bookingUrl\}/g, settings.bookingUrl || "[link prenotazione]")
    .replace(/\{firma\}/g, firma)
    .replace(/\{metodoSD\}/g, settings.sdLandingUrl || "https://www.karalisweb.net/web-marketing")
    .replace(/\{linkedinAlessio\}/g, settings.alessioLinkedinUrl || "")
    .replace(/\{casiStudio\}/g, settings.caseStudiesBlock || "");
}

/**
 * Sceglie una variante di OGGETTO email. Le varianti sono righe separate da
 * "\n" nel campo `subject` dello step. Ruota in base a `seed` cosi' l'oggetto
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
  { key: "{landingUrl}", label: "Link Video", description: "URL landing page video (con tracking)" },
  { key: "{metodoSD}", label: "Metodo SD", description: "Landing del Metodo SD (Impostazioni → Workflow)" },
  { key: "{linkedinAlessio}", label: "LinkedIn", description: "Profilo LinkedIn di Alessio (Impostazioni → Workflow)" },
  { key: "{linkPrenotazione}", label: "Prenotazione", description: "Link prenotazione consulenza (Google Calendar)" },
  { key: "{firma}", label: "Firma", description: "Firma email (Alessio o Francesca)" },
  { key: "{casiStudio}", label: "Casi Studio", description: "Blocco casi studio configurato" },
];
