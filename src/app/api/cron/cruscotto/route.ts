import { NextRequest, NextResponse } from "next/server";
import { cruscottoSettimana } from "@/lib/agents/cruscotto";
import { sendInternalHtmlEmail } from "@/lib/email";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const COLORE: Record<string, string> = { ok: "#0b6e4f", attenzione: "#b86a00", allarme: "#b3261e", nd: "#666" };
const PAROLA: Record<string, string> = { ok: "ok", attenzione: "attenzione", allarme: "allarme", nd: "—" };

/**
 * POST /api/cron/cruscotto — il venerdì pomeriggio, la mail con gli 11 numeri della settimana
 * (Motore 121). Protetto da CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const c = await cruscottoSettimana();
    const base = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://crm.karalisdemo.it").replace(/\/$/, "");
    const valore = (m: (typeof c.misure)[number]) => (m.valore === null ? "—" : m.unita === "%" ? `${m.valore}%` : m.unita === "per121" ? `${m.valore} per 121` : String(m.valore));
    const righe = c.misure.map((m) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #eee">${esc(m.nome)}${m.dettaglio ? `<div style="font-size:12px;color:#666">${esc(m.dettaglio)}</div>` : ""}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap">${esc(valore(m))}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;color:${COLORE[m.stato]};white-space:nowrap">${PAROLA[m.stato]}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#444">${m.stato === "allarme" || m.stato === "attenzione" ? esc(m.azione) : ""}</td>
</tr>`).join("");
    const titolo = c.allarmi ? `Cruscotto 121: ${c.allarmi} ${c.allarmi === 1 ? "allarme" : "allarmi"}` : "Cruscotto 121: settimana in linea";
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;margin:0 auto;color:#111">
<p style="font-size:15px">Ciao Alessio, ecco i numeri della settimana. Accanto agli allarmi c'è cosa fare.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">${righe}</table>
<p style="font-size:13px;color:#666">Le soglie sono una prima taratura: si correggono dopo 4 settimane. <a href="${base}/cruscotto">Apri il cruscotto</a></p>
</div>`;
    const testo = c.misure.map((m) => `${m.nome}: ${valore(m)} (${PAROLA[m.stato]})${m.stato === "allarme" ? ` → ${m.azione}` : ""}`).join("\n");
    const inviata = await sendInternalHtmlEmail(titolo, html, testo);
    return NextResponse.json({ success: true, inviata, allarmi: c.allarmi });
  } catch (error) {
    console.error("[cruscotto] fallito:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Errore" }, { status: 500 });
  }
}
