import { describe, it, expect } from "vitest";
import { detectEmailMarketing } from "../email-detector";

describe("detectEmailMarketing", () => {
  it("rileva form newsletter con input email", () => {
    const html = `<html><body>
      <form>
        <p>Iscriviti alla newsletter</p>
        <input type="email" name="email" />
        <button>Iscriviti</button>
      </form>
    </body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasNewsletterForm).toBe(true);
  });

  it("rileva form subscribe (inglese)", () => {
    const html = `<html><body>
      <form>
        <label>Subscribe to our newsletter</label>
        <input type="email" />
        <button>Subscribe</button>
      </form>
    </body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasNewsletterForm).toBe(true);
  });

  it("non rileva form senza email input come newsletter", () => {
    const html = `<html><body>
      <form>
        <p>Newsletter</p>
        <input type="text" name="name" />
        <button>Invia</button>
      </form>
    </body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasNewsletterForm).toBe(false);
  });

  it("rileva popup newsletter (popup + newsletter pattern)", () => {
    const html = `<html><body>
      <div class="popup-overlay">
        <p>Iscriviti alla newsletter</p>
      </div>
    </body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasPopup).toBe(true);
  });

  it("non rileva popup senza pattern newsletter", () => {
    const html = `<html><body>
      <div class="popup-overlay">
        <p>Cookie settings</p>
      </div>
    </body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasPopup).toBe(false);
  });

  it("rileva lead magnet (ebook)", () => {
    const html = `<html><body><p>Scarica il nostro ebook gratuito!</p></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasLeadMagnet).toBe(true);
  });

  it("rileva lead magnet (guida gratuita)", () => {
    const html = `<html><body><p>Scarica la guida gratuita</p></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasLeadMagnet).toBe(true);
  });

  it("rileva lead magnet (white paper)", () => {
    const html = `<html><body><p>Download our white paper</p></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasLeadMagnet).toBe(true);
  });

  // Provider detection
  it("rileva Mailchimp", () => {
    const html = `<html><body><form action="https://xyz.list-manage.com/subscribe/post"></form></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.emailProvider).toBe("Mailchimp");
  });

  it("rileva Sendinblue/Brevo", () => {
    const html = `<html><body><script src="https://sibforms.com/serve/abc"></script></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.emailProvider).toBe("Sendinblue");
  });

  it("rileva Klaviyo", () => {
    const html = `<html><body><script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.emailProvider).toBe("Klaviyo");
  });

  it("rileva ActiveCampaign", () => {
    const html = `<html><body><script src="https://xyz.activecampaign.com/f/embed.php"></script></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.emailProvider).toBe("ActiveCampaign");
  });

  it("ritorna tutto null/false su sito senza email marketing", () => {
    const html = `<html><body><p>Sito semplice senza form</p></body></html>`;
    const result = detectEmailMarketing(html);
    expect(result.hasNewsletterForm).toBe(false);
    expect(result.hasPopup).toBe(false);
    expect(result.hasLeadMagnet).toBe(false);
    expect(result.emailProvider).toBeNull();
  });
});
