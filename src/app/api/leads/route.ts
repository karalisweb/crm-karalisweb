import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const stage = searchParams.get("stage");
    const stages = searchParams.get("stages"); // Supporta multipli stage separati da virgola
    const auditStatus = searchParams.get("auditStatus") || searchParams.get("audit");
    const website = searchParams.get("website");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    // Filtro per singolo stage
    if (stage) {
      where.pipelineStage = stage;
    }

    // Filtro per multipli stage (stages=TO_CALL,CALLED,INTERESTED)
    if (stages) {
      const stageList = stages.split(",").filter(Boolean);
      if (stageList.length > 0) {
        where.pipelineStage = { in: stageList };
      }
    }

    if (auditStatus) {
      where.auditStatus = auditStatus;
    }

    // Filtro per presenza sito web
    if (website === "yes") {
      where.website = { not: null };
    } else if (website === "no") {
      where.website = null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lead = await db.lead.create({
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        website: body.website,
        category: body.category,
        googleRating: body.googleRating,
        googleReviewsCount: body.googleReviewsCount,
        googleMapsUrl: body.googleMapsUrl,
        placeId: body.placeId,
        source: body.source || "manual",
        searchId: body.searchId,
        notes: body.notes,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
