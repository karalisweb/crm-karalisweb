import { describe, it, expect } from "vitest";
import { checkTrust } from "../trust-checker";

describe("checkTrust", () => {
  // Cookie banner
  it("rileva cookie banner (iubenda)", () => {
    const html = `<html><body><script src="https://cdn.iubenda.com/consent_solution.js"></script></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(true);
  });

  it("rileva cookie banner (cookiebot)", () => {
    const html = `<html><body><div id="cookiebot-consent">Accetta</div></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(true);
  });

  it("rileva cookie banner (onetrust)", () => {
    const html = `<html><body><div class="onetrust-banner">Cookie</div></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(true);
  });

  it("rileva cookie-consent class", () => {
    const html = `<html><body><div class="cookie-consent">Accetta i cookie</div></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(true);
  });

  it("non rileva cookie banner se assente", () => {
    const html = `<html><body><p>Sito semplice</p></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(false);
  });

  // Privacy policy
  it("rileva privacy policy tramite link href", () => {
    const html = `<html><body><a href="/privacy-policy">Privacy</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasPrivacyPolicy).toBe(true);
    expect(result.privacyPolicyUrl).toBe("/privacy-policy");
  });

  it("rileva informativa privacy (italiano)", () => {
    const html = `<html><body><a href="/informativa-privacy">Informativa</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasPrivacyPolicy).toBe(true);
  });

  // Terms
  it("rileva termini e condizioni", () => {
    const html = `<html><body><a href="/terms">Termini</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasTerms).toBe(true);
  });

  it("rileva condizioni (italiano)", () => {
    const html = `<html><body><a href="/condizioni-vendita">Condizioni</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasTerms).toBe(true);
  });

  // Testimonials
  it("rileva testimonial", () => {
    const html = `<html><body><section class="testimonial"><p>Ottimo servizio!</p></section></body></html>`;
    const result = checkTrust(html);
    expect(result.hasTestimonials).toBe(true);
  });

  it("rileva 'cosa dicono di noi'", () => {
    const html = `<html><body><h2>Cosa dicono di noi</h2><p>Bravi!</p></body></html>`;
    const result = checkTrust(html);
    expect(result.hasTestimonials).toBe(true);
  });

  // Contact form
  it("rileva form di contatto", () => {
    const html = `<html><body><form><input type="email" /><textarea name="messaggio"></textarea><button>Invia</button></form></body></html>`;
    const result = checkTrust(html);
    expect(result.hasContactForm).toBe(true);
  });

  it("non rileva form search senza keyword contatto come form contatto", () => {
    const html = `<html><body><form><input type="text" placeholder="Cerca..." /><button>Cerca</button></form></body></html>`;
    const result = checkTrust(html);
    expect(result.hasContactForm).toBe(false);
  });

  // WhatsApp
  it("rileva WhatsApp con wa.me e estrae numero", () => {
    const html = `<html><body><a href="https://wa.me/393331234567">WhatsApp</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasWhatsApp).toBe(true);
    expect(result.whatsappNumber).toBe("393331234567");
  });

  it("rileva WhatsApp con api.whatsapp e estrae numero", () => {
    const html = `<html><body><a href="https://api.whatsapp.com/send?phone=393331234567">Scrivici</a></body></html>`;
    const result = checkTrust(html);
    expect(result.hasWhatsApp).toBe(true);
    expect(result.whatsappNumber).toBe("393331234567");
  });

  // Live chat
  it("rileva Tawk.to", () => {
    const html = `<html><body><script src="https://embed.tawk.to/abc123/default"></script></body></html>`;
    const result = checkTrust(html);
    expect(result.hasLiveChat).toBe(true);
  });

  it("rileva Tidio", () => {
    const html = `<html><body><script src="https://code.tidio.co/abc123.js"></script></body></html>`;
    const result = checkTrust(html);
    expect(result.hasLiveChat).toBe(true);
  });

  it("rileva Crisp", () => {
    const html = `<html><body><script src="https://client.crisp.chat/l.js"></script></body></html>`;
    const result = checkTrust(html);
    expect(result.hasLiveChat).toBe(true);
  });

  // Tutto vuoto
  it("ritorna tutto false su sito minimale", () => {
    const html = `<html><head><title>Test</title></head><body><p>Ciao</p></body></html>`;
    const result = checkTrust(html);
    expect(result.hasCookieBanner).toBe(false);
    expect(result.hasPrivacyPolicy).toBe(false);
    expect(result.hasTerms).toBe(false);
    expect(result.hasTestimonials).toBe(false);
    expect(result.hasTrustBadges).toBe(false);
    expect(result.hasContactForm).toBe(false);
    expect(result.hasWhatsApp).toBe(false);
    expect(result.hasLiveChat).toBe(false);
  });
});
