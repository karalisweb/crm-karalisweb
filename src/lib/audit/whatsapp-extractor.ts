/**
 * Estrae il numero WhatsApp da HTML di un sito web.
 * Cerca link wa.me/NUMERO e api.whatsapp.com/send?phone=NUMERO.
 */
export function extractWhatsAppNumber(html: string): string | null {
  // Pattern 1: wa.me/NUMERO
  const waMatch = html.match(/wa\.me\/(\d{10,15})/);
  if (waMatch) return waMatch[1];

  // Pattern 2: api.whatsapp.com/send?phone=NUMERO
  const apiMatch = html.match(/api\.whatsapp\.com\/send\?phone=(\d{10,15})/);
  if (apiMatch) return apiMatch[1];

  // Pattern 3: whatsapp.com/send/?phone=NUMERO (variante con slash)
  const apiMatch2 = html.match(/whatsapp\.com\/send\/?\?phone=(\d{10,15})/);
  if (apiMatch2) return apiMatch2[1];

  return null;
}

/**
 * Normalizza un numero di telefono italiano per WhatsApp.
 * Converte numeri locali (es. 0XX...) in formato internazionale (39...).
 */
export function normalizePhoneForWhatsApp(phone: string): string | null {
  // Rimuovi tutti i caratteri non numerici
  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned || cleaned.length < 9) return null;

  // Gia in formato internazionale con 39
  if (cleaned.startsWith("39") && cleaned.length >= 11) return cleaned;

  // Numero italiano con 0 iniziale (es. 02..., 06..., 3...)
  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    return "39" + cleaned.substring(1);
  }

  // Numero mobile italiano senza prefisso (3XX...)
  if (cleaned.startsWith("3") && cleaned.length >= 9 && cleaned.length <= 10) {
    return "39" + cleaned;
  }

  // Formato +39 gia pulito
  if (cleaned.length >= 11 && cleaned.length <= 13) return cleaned;

  return null;
}
