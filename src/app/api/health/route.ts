import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health
 * Health check endpoint per monitoring e Docker healthcheck.
 */
export async function GET() {
  try {
    await db.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      { status: "error", detail: "Database non raggiungibile" },
      { status: 503 }
    );
  }
}
