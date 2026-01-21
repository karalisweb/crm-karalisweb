import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/audit/status
 * Ritorna lo stato degli audit: pending, running, failed
 */
export async function GET() {
  try {
    // Lead PENDING
    const pending = await db.lead.findMany({
      where: {
        website: { not: null },
        auditStatus: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        website: true,
        category: true,
        auditStatus: true,
        search: {
          select: {
            query: true,
            location: true,
          },
        },
      },
    });

    // Lead RUNNING
    const running = await db.lead.findMany({
      where: {
        website: { not: null },
        auditStatus: "RUNNING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        website: true,
        category: true,
        auditStatus: true,
        search: {
          select: {
            query: true,
            location: true,
          },
        },
      },
    });

    // Lead FAILED (ultimi 20)
    const failed = await db.lead.findMany({
      where: {
        website: { not: null },
        auditStatus: "FAILED",
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        website: true,
        category: true,
        auditStatus: true,
        search: {
          select: {
            query: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      pending,
      running,
      failed,
    });
  } catch (error) {
    console.error("Error fetching audit status:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit status" },
      { status: 500 }
    );
  }
}
