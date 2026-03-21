import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/youtube";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const CONFIG_FILE = join(process.cwd(), ".env.local");

/**
 * GET /api/youtube/callback
 *
 * Callback OAuth2 di Google. Riceve il code, lo scambia per i token,
 * e salva automaticamente il refresh_token nel .env.local.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: `Google OAuth error: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Nessun code ricevuto da Google" },
      { status: 400 }
    );
  }

  try {
    const { refreshToken } = await exchangeCode(code);

    if (!refreshToken) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>YouTube — Errore</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 4rem auto; padding: 2rem; }
          .error { color: #dc2626; font-size: 1.25rem; font-weight: 600; }
        </style>
        </head>
        <body>
          <p class="error">⚠️ Nessun refresh token ricevuto</p>
          <p>Google non ha restituito il refresh token. Questo succede se l'app era già autorizzata.</p>
          <p><strong>Soluzione:</strong> Vai su <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>,
          revoca l'accesso a questa app, poi riprova "Autorizza YouTube" dalle impostazioni.</p>
          <p><a href="/settings">← Torna alle impostazioni</a></p>
        </body>
        </html>
      `;
      return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
    }

    // Salva automaticamente nel .env.local
    let envContent = "";
    try {
      envContent = await readFile(CONFIG_FILE, "utf-8");
    } catch {
      envContent = "";
    }

    // Aggiorna o aggiungi YOUTUBE_REFRESH_TOKEN
    process.env.YOUTUBE_REFRESH_TOKEN = refreshToken;
    const regex = /^YOUTUBE_REFRESH_TOKEN=.*$/m;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `YOUTUBE_REFRESH_TOKEN="${refreshToken}"`);
    } else {
      envContent = envContent.trimEnd() + `\nYOUTUBE_REFRESH_TOKEN="${refreshToken}"\n`;
    }

    await writeFile(CONFIG_FILE, envContent.trim() + "\n", "utf-8");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>YouTube Autorizzato</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 4rem auto; padding: 2rem; }
        .success { color: #16a34a; font-size: 1.5rem; font-weight: 600; }
        .note { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 8px; margin-top: 1rem; }
      </style>
      </head>
      <body>
        <p class="success">✅ YouTube autorizzato con successo!</p>
        <div class="note">
          <p><strong>Refresh token salvato automaticamente</strong> nel file .env.local</p>
          <p>Puoi verificare la connessione dalla pagina impostazioni con "Test Connessione".</p>
        </div>
        <p style="margin-top: 1.5rem;"><a href="/settings">← Torna alle impostazioni</a></p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("[youtube/callback] Errore:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore scambio token" },
      { status: 500 }
    );
  }
}
