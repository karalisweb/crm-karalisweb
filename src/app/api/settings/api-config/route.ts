import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const CONFIG_FILE = join(process.cwd(), ".env.local");

// GET /api/settings/api-config - Leggi configurazione API (mascherata)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    // Leggi le variabili d'ambiente correnti
    const config = {
      apifyToken: process.env.APIFY_TOKEN ? "••••" + (process.env.APIFY_TOKEN.slice(-4) || "") : "",
      apifyWebhookSecret: process.env.APIFY_WEBHOOK_SECRET ? "••••••••" : "",
      inngestEventKey: process.env.INNGEST_EVENT_KEY ? "••••" + (process.env.INNGEST_EVENT_KEY.slice(-4) || "") : "",
      inngestSigningKey: process.env.INNGEST_SIGNING_KEY ? "••••••••" : "",
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error reading API config:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// PUT /api/settings/api-config - Salva configurazione API
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { apifyToken, apifyWebhookSecret, inngestEventKey, inngestSigningKey } = await request.json();

    // Leggi file .env esistente o crea nuovo
    let envContent = "";
    try {
      envContent = await readFile(CONFIG_FILE, "utf-8");
    } catch {
      // File non esiste, crealo
      envContent = "";
    }

    // Funzione per aggiornare o aggiungere una variabile
    function updateEnvVar(content: string, key: string, value: string): string {
      if (!value || value.includes("••••")) {
        // Non aggiornare se vuoto o mascherato
        return content;
      }
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${value}"`);
      }
      return content + `\n${key}="${value}"`;
    }

    envContent = updateEnvVar(envContent, "APIFY_TOKEN", apifyToken);
    envContent = updateEnvVar(envContent, "APIFY_WEBHOOK_SECRET", apifyWebhookSecret);
    envContent = updateEnvVar(envContent, "INNGEST_EVENT_KEY", inngestEventKey);
    envContent = updateEnvVar(envContent, "INNGEST_SIGNING_KEY", inngestSigningKey);

    await writeFile(CONFIG_FILE, envContent.trim() + "\n", "utf-8");

    return NextResponse.json({ success: true, message: "Riavvia il server per applicare le modifiche" });
  } catch (error) {
    console.error("Error saving API config:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
