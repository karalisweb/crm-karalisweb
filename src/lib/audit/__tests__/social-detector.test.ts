import { describe, it, expect } from "vitest";
import { detectSocialLinks } from "../social-detector";

describe("detectSocialLinks", () => {
  it("rileva link Facebook (esclude sharer)", () => {
    const html = `<html><body>
      <a href="https://facebook.com/sharer/sharer.php?u=test">Share</a>
      <a href="https://facebook.com/mia-azienda">Facebook</a>
    </body></html>`;
    const result = detectSocialLinks(html);
    expect(result.facebook.linkedFromSite).toBe(true);
    expect(result.facebook.url).toBe("https://facebook.com/mia-azienda");
  });

  it("esclude link Facebook sharer quando unico link", () => {
    const html = `<html><body>
      <a href="https://facebook.com/sharer/sharer.php?u=test">Share</a>
    </body></html>`;
    const result = detectSocialLinks(html);
    expect(result.facebook.linkedFromSite).toBe(false);
  });

  it("rileva link fb.com", () => {
    const html = `<html><body><a href="https://fb.com/pagina">FB</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.facebook.linkedFromSite).toBe(true);
  });

  it("rileva Instagram", () => {
    const html = `<html><body><a href="https://instagram.com/mio_profilo">IG</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.instagram.linkedFromSite).toBe(true);
    expect(result.instagram.url).toBe("https://instagram.com/mio_profilo");
  });

  it("rileva LinkedIn company", () => {
    const html = `<html><body><a href="https://linkedin.com/company/azienda">LinkedIn</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.linkedin.linkedFromSite).toBe(true);
  });

  it("rileva LinkedIn personal", () => {
    const html = `<html><body><a href="https://linkedin.com/in/persona">LinkedIn</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.linkedin.linkedFromSite).toBe(true);
  });

  it("rileva YouTube (channel, @, user)", () => {
    const html = `<html><body><a href="https://youtube.com/@miocanale">YT</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.youtube.linkedFromSite).toBe(true);
  });

  it("rileva TikTok", () => {
    const html = `<html><body><a href="https://tiktok.com/@mio_tiktok">TikTok</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.tiktok.linkedFromSite).toBe(true);
  });

  it("rileva Twitter/X", () => {
    const html = `<html><body><a href="https://x.com/mio_profilo">X</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.twitter.linkedFromSite).toBe(true);
  });

  it("rileva twitter.com", () => {
    const html = `<html><body><a href="https://twitter.com/vecchio_profilo">Twitter</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.twitter.linkedFromSite).toBe(true);
  });

  it("ritorna tutto false se non ci sono social", () => {
    const html = `<html><body><a href="https://example.com">Link</a></body></html>`;
    const result = detectSocialLinks(html);
    expect(result.facebook.linkedFromSite).toBe(false);
    expect(result.instagram.linkedFromSite).toBe(false);
    expect(result.linkedin.linkedFromSite).toBe(false);
    expect(result.youtube.linkedFromSite).toBe(false);
    expect(result.tiktok.linkedFromSite).toBe(false);
    expect(result.twitter.linkedFromSite).toBe(false);
  });

  it("rileva tutti i social insieme", () => {
    const html = `<html><body>
      <a href="https://facebook.com/azienda">FB</a>
      <a href="https://instagram.com/azienda">IG</a>
      <a href="https://linkedin.com/company/azienda">LI</a>
      <a href="https://youtube.com/@azienda">YT</a>
      <a href="https://tiktok.com/@azienda">TK</a>
      <a href="https://x.com/azienda">X</a>
    </body></html>`;
    const result = detectSocialLinks(html);
    expect(result.facebook.linkedFromSite).toBe(true);
    expect(result.instagram.linkedFromSite).toBe(true);
    expect(result.linkedin.linkedFromSite).toBe(true);
    expect(result.youtube.linkedFromSite).toBe(true);
    expect(result.tiktok.linkedFromSite).toBe(true);
    expect(result.twitter.linkedFromSite).toBe(true);
  });
});
