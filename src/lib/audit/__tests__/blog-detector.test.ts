import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkBlog } from "../blog-detector";

// Mock fetch globale
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("checkBlog", () => {
  const baseUrl = "https://example.com";

  it("rileva link /blog nella homepage", async () => {
    const html = `<html><body><a href="/blog">Blog</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body><article class="post">Post 1</article></body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
    expect(result.blogUrl).toBe("https://example.com/blog");
  });

  it("rileva link /news", async () => {
    const html = `<html><body><a href="/news">Notizie</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body></body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
  });

  it("rileva link /articoli (italiano)", async () => {
    const html = `<html><body><a href="/articoli">Articoli</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body></body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
  });

  it("ritorna hasBlog false se nessun link blog", async () => {
    const html = `<html><body><a href="/contatti">Contatti</a></body></html>`;
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(false);
    expect(result.blogUrl).toBeNull();
    expect(result.estimatedPostCount).toBe(0);
  });

  it("conta articoli nella pagina blog", async () => {
    const html = `<html><body><a href="/blog">Blog</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body>
        <article>Post 1</article>
        <article>Post 2</article>
        <article>Post 3</article>
      </body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.estimatedPostCount).toBe(3);
  });

  it("estrae data da tag time[datetime]", async () => {
    const html = `<html><body><a href="/blog">Blog</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body>
        <article>
          <time datetime="2025-06-15">15 Giugno 2025</time>
          <p>Post recente</p>
        </article>
      </body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.lastPostDate).toBe("2025-06-15");
    expect(result.daysSinceLastPost).toBeGreaterThanOrEqual(0);
  });

  it("gestisce URL blog assoluto", async () => {
    const html = `<html><body><a href="https://blog.example.com/blog">Blog</a></body></html>`;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><body></body></html>`,
    });
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
    expect(result.blogUrl).toBe("https://blog.example.com/blog");
  });

  it("gestisce fetch fallito gracefully", async () => {
    const html = `<html><body><a href="/blog">Blog</a></body></html>`;
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
    expect(result.blogUrl).toBe("https://example.com/blog");
    expect(result.lastPostDate).toBeNull();
    expect(result.estimatedPostCount).toBe(0);
  });

  it("gestisce risposta non ok", async () => {
    const html = `<html><body><a href="/blog">Blog</a></body></html>`;
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await checkBlog(html, baseUrl);
    expect(result.hasBlog).toBe(true);
    expect(result.lastPostDate).toBeNull();
    expect(result.estimatedPostCount).toBe(0);
  });
});
