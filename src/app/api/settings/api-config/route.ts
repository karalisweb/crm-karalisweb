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

    const config = {
      apifyToken: process.env.APIFY_TOKEN ? "••••" + (process.env.APIFY_TOKEN.slice(-4) || "") : "",
      apifyWebhookSecret: process.env.APIFY_WEBHOOK_SECRET ? "••••••••" : "",
      cronSecret: process.env.CRON_SECRET ? "••••" + (process.env.CRON_SECRET.slice(-4) || "") : "",
      geminiApiKey: process.env.GEMINI_API_KEY ? "••••" + (process.env.GEMINI_API_KEY.slice(-4) || "") : "",
      geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      // WordPress
      wpUrl: process.env.WP_URL || "",
      wpUser: process.env.WP_USER || "",
      wpAppPassword: process.env.WP_APP_PASSWORD ? "••••" + (process.env.WP_APP_PASSWORD.slice(-4) || "") : "",
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

    const {
      apifyToken, apifyWebhookSecret, cronSecret,
      geminiApiKey, geminiModel,
      wpUrl, wpUser, wpAppPassword,
    } = await request.json();

    let envContent = "";
    try {
      envContent = await readFile(CONFIG_FILE, "utf-8");
    } catch {
      envContent = "";
    }

    function updateEnvVar(content: string, key: string, value: string): string {
      if (!value || value.includes("••••")) {
        return content;
      }
      process.env[key] = value;
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${value}"`);
      }
      return content + `\n${key}="${value}"`;
    }

    envContent = updateEnvVar(envContent, "APIFY_TOKEN", apifyToken);
    envContent = updateEnvVar(envContent, "APIFY_WEBHOOK_SECRET", apifyWebhookSecret);
    envContent = updateEnvVar(envContent, "CRON_SECRET", cronSecret);
    envContent = updateEnvVar(envContent, "GEMINI_API_KEY", geminiApiKey);
    envContent = updateEnvVar(envContent, "GEMINI_MODEL", geminiModel);
    envContent = updateEnvVar(envContent, "WP_URL", wpUrl);
    envContent = updateEnvVar(envContent, "WP_USER", wpUser);
    envContent = updateEnvVar(envContent, "WP_APP_PASSWORD", wpAppPassword);

    await writeFile(CONFIG_FILE, envContent.trim() + "\n", "utf-8");

    return NextResponse.json({ success: true, message: "Configurazione salvata e attiva" });
  } catch (error) {
    console.error("Error saving API config:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
