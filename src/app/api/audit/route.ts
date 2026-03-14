import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractStrategicData } from "@/lib/audit/strategic-extractor";
import { isSocialLink } from "@/lib/url-utils";
import { Prisma, PipelineStage } from "@prisma/client";

/**
 * POST /api/audit
 * Esegue l'estrazione strategica per un lead:
 * 1. Scarica HTML del sito
 * 2. Estrae home_text, about_text, services_text, has_active_ads
 * 3. Salva i dati nel lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: "Lead has no website" },
        { status: 400 }
      );
    }

    // Controlla se è un link social
    if (isSocialLink(lead.website)) {
      await db.lead.update({
        where: { id: leadId },
        data: {
          auditStatus: "NO_WEBSITE",
          pipelineStage: "SENZA_SITO",
          socialUrl: lead.website,
          website: null,
          auditData: {
            error: "Link social - non è un sito web aziendale",
            originalUrl: lead.website,
          },
        },
      });
      return NextResponse.json({
        success: true,
        leadId,
        message: "Link social spostato in SENZA_SITO",
        isSocialLink: true,
      });
    }

    // Marca come running
    await db.lead.update({
      where: { id: leadId },
      data: { auditStatus: "RUNNING" },
    });

    // Normalizza URL
    let url = lead.website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // 1. Fetch HTML
    let html: string;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchErr) {
      const msg =
        fetchErr instanceof Error ? fetchErr.message : "Errore sconosciuto";

      await db.lead.update({
        where: { id: leadId },
        data: {
          auditStatus: "FAILED",
          auditData: { error: `Sito non raggiungibile: ${msg}` },
        },
      });

      return NextResponse.json({
        success: false,
        leadId,
        error: `Sito non raggiungibile: ${msg}`,
      });
    }

    const baseUrl = new URL(url).origin;

    // 2. Estrazione strategica
    const strategicData = await extractStrategicData(
      html,
      baseUrl,
      lead.name
    );

    // 3. Salva risultati
    await db.lead.update({
      where: { id: leadId },
      data: {
        auditStatus: "COMPLETED",
        auditCompletedAt: new Date(),
        auditData: strategicData as unknown as Prisma.InputJsonValue,
        pipelineStage: PipelineStage.DA_ANALIZZARE,
      },
    });

    return NextResponse.json({
      success: true,
      leadId,
      strategicData,
    });
  } catch (error) {
    console.error("Error starting audit:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/audit
 * Batch: esegue estrazione strategica per tutti i lead PENDING
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchId, limit = 50 } = body;

    const leads = await db.lead.findMany({
      where: {
        ...(searchId ? { searchId } : {}),
        website: { not: null },
        auditStatus: "PENDING",
      },
      take: limit,
      select: {
        id: true,
        name: true,
        website: true,
      },
    });

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads to process",
        processed: 0,
        parked: 0,
      });
    }

    let processed = 0;
    let parked = 0;
    const results: Array<{
      id: string;
      name: string;
      status: string;
      reason?: string;
    }> = [];

    for (const lead of leads) {
      // Controlla se è un link social
      if (lead.website && isSocialLink(lead.website)) {
        await db.lead.update({
          where: { id: lead.id },
          data: {
            auditStatus: "NO_WEBSITE",
            pipelineStage: "SENZA_SITO",
            socialUrl: lead.website,
            website: null,
            auditData: {
              error: "Link social - non è un sito web aziendale",
              originalUrl: lead.website,
            },
          },
        });
        parked++;
        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "parked",
          reason: "Link social",
        });
        continue;
      }

      // Marca come running
      await db.lead.update({
        where: { id: lead.id },
        data: { auditStatus: "RUNNING" },
      });

      // Normalizza URL
      let url = lead.website!;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const baseUrl = new URL(url).origin;

        const strategicData = await extractStrategicData(
          html,
          baseUrl,
          lead.name || ""
        );

        await db.lead.update({
          where: { id: lead.id },
          data: {
            auditStatus: "COMPLETED",
            auditCompletedAt: new Date(),
            auditData: strategicData as unknown as Prisma.InputJsonValue,
            pipelineStage: PipelineStage.DA_ANALIZZARE,
          },
        });

        processed++;
        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "completed",
        });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown error";

        await db.lead.update({
          where: { id: lead.id },
          data: {
            auditStatus: "FAILED",
            auditData: { error: `Sito non raggiungibile: ${msg}` },
          },
        });

        results.push({
          id: lead.id,
          name: lead.name || "N/A",
          status: "failed",
          reason: msg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} leads, ${parked} parked as social links`,
      processed,
      parked,
      results,
    });
  } catch (error) {
    console.error("Error in batch audit:", error);
    return NextResponse.json(
      { error: "Failed to run batch audit" },
      { status: 500 }
    );
  }
}
