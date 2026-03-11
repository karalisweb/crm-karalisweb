/**
 * Utility per classificare URL: sito reale vs link social/fake
 */

const SOCIAL_PATTERNS: Array<{ pattern: RegExp; platform: string }> = [
  { pattern: /facebook\.com/i, platform: "facebook" },
  { pattern: /fb\.com/i, platform: "facebook" },
  { pattern: /instagram\.com/i, platform: "instagram" },
  { pattern: /linkedin\.com/i, platform: "linkedin" },
  { pattern: /twitter\.com/i, platform: "twitter" },
  { pattern: /x\.com/i, platform: "twitter" },
  { pattern: /tiktok\.com/i, platform: "tiktok" },
  { pattern: /youtube\.com/i, platform: "youtube" },
  { pattern: /wa\.me/i, platform: "whatsapp" },
  { pattern: /whatsapp\.com/i, platform: "whatsapp" },
  { pattern: /t\.me/i, platform: "telegram" },
  { pattern: /maps\.google\./i, platform: "google_maps" },
  { pattern: /goo\.gl\/maps/i, platform: "google_maps" },
  { pattern: /google\.com\/maps/i, platform: "google_maps" },
  { pattern: /example\.com/i, platform: "test" },
  { pattern: /example\d+\.com/i, platform: "test" },
];

/**
 * Verifica se un URL è un link social/non-sito-reale
 */
export function isSocialLink(url: string): boolean {
  return SOCIAL_PATTERNS.some(({ pattern }) => pattern.test(url));
}

/**
 * Ritorna la piattaforma social se l'URL è un link social, null altrimenti
 */
export function getSocialPlatform(url: string): string | null {
  const match = SOCIAL_PATTERNS.find(({ pattern }) => pattern.test(url));
  return match?.platform ?? null;
}

/**
 * Classifica un URL come sito reale o social/fake
 */
export function isRealWebsite(url: string | null | undefined): {
  isReal: boolean;
  platform: string | null;
} {
  if (!url || url.trim() === "") {
    return { isReal: false, platform: null };
  }
  const platform = getSocialPlatform(url);
  return { isReal: !platform, platform };
}
