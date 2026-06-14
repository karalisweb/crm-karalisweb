/**
 * Difesa SSRF per il fetch di URL forniti dall'utente (siti dei lead).
 * Blocca IP privati / loopback / link-local / metadata cloud, sia come letterale
 * sia DOPO la risoluzione DNS (anti DNS-rebinding di base), e copre IPv6 + IPv4
 * in forma decimale/esadecimale/ottale.
 */

import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "[::]",
  "[::1]",
  "metadata.google.internal",
]);

/** Normalizza un IPv4 (dotted / decimale / hex / ottale) in 4 ottetti, o null. */
function ipv4ToParts(ip: string): number[] | null {
  // Dotted decimal classico: 192.168.0.1
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map((p) => Number(p));
    return parts.every((p) => p >= 0 && p <= 255) ? parts : null;
  }
  // Intero singolo decimale (2130706433) o esadecimale (0x7f000001)
  let n: number | null = null;
  if (/^0x[0-9a-f]+$/i.test(ip)) n = parseInt(ip, 16);
  else if (/^0[0-7]+$/.test(ip)) n = parseInt(ip, 8); // ottale
  else if (/^\d+$/.test(ip)) n = parseInt(ip, 10);
  if (n !== null && Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }
  return null;
}

function isPrivateIPv4Parts(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  let h = ip.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80")) return true; // link-local fe80::/10
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA fc00::/7
  // IPv4-mapped: ::ffff:127.0.0.1
  const mapped = h.match(/(?:::ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) {
    const parts = ipv4ToParts(mapped[1]);
    if (parts && isPrivateIPv4Parts(parts)) return true;
  }
  return false;
}

/** True se l'host (IP letterale in qualsiasi forma) è privato/non instradabile. */
export function isPrivateAddress(host: string): boolean {
  let h = host.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  if (isIP(h) === 6 || h.includes(":")) return isPrivateIPv6(h);
  const parts = ipv4ToParts(h);
  if (parts) return isPrivateIPv4Parts(parts);
  return false;
}

function assertHostAllowed(parsed: URL): void {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Protocollo non permesso: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`URL bloccato (hostname privato): ${hostname}`);
  }
  if (isPrivateAddress(hostname)) {
    throw new Error(`URL bloccato (IP privato): ${hostname}`);
  }
}

/**
 * Validazione sincrona sui soli letterali (protocollo, hostname, IP letterale).
 * Mantiene la firma storica usata in vari punti del codice.
 */
export function validatePublicUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`URL non valido: ${urlString}`);
  }
  assertHostAllowed(parsed);
}

/**
 * Validazione COMPLETA: letterali + risoluzione DNS con verifica che TUTTI gli
 * IP risolti siano pubblici. Da usare PRIMA di ogni fetch verso URL non fidati.
 */
export async function assertPublicUrl(urlString: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error(`URL non valido: ${urlString}`);
  }
  assertHostAllowed(parsed);

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  // IP letterale: già verificato da assertHostAllowed.
  if (isIP(hostname)) return;

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`URL bloccato (host non risolvibile): ${hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(
        `URL bloccato (risolve a IP privato): ${hostname} -> ${address}`
      );
    }
  }
}
