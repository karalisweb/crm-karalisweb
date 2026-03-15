/**
 * Validates that a URL points to a public internet address.
 * Blocks private IPs, loopback, link-local, and cloud metadata endpoints.
 * Prevents SSRF attacks when fetching user-supplied URLs.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "[::]",
  "[::1]",
  "metadata.google.internal",
]);

function isPrivateIP(ip: string): boolean {
  // IPv4 patterns
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local, AWS metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts.every((p) => p === 0)) return true;
  }

  return false;
}

export function validatePublicUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`URL non valido: ${urlString}`);
  }

  // Only allow http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Protocollo non permesso: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known private hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`URL bloccato (hostname privato): ${hostname}`);
  }

  // Block IPv6 loopback
  if (hostname === "::1" || hostname === "[::1]") {
    throw new Error(`URL bloccato (IPv6 loopback)`);
  }

  // Block private IPv4 addresses
  if (isPrivateIP(hostname)) {
    throw new Error(`URL bloccato (IP privato): ${hostname}`);
  }
}
