import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          orderBy: { dueAt: "asc" },
        },
        search: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate that lead exists
    const existingLead = await db.lead.findUnique({ where: { id } });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // If changing pipeline stage, log activity
    if (body.pipelineStage && body.pipelineStage !== existingLead.pipelineStage) {
      await db.activity.create({
        data: {
          leadId: id,
          type: "STAGE_CHANGE",
          notes: `Stage cambiato da ${existingLead.pipelineStage} a ${body.pipelineStage}`,
        },
      });
    }

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.pipelineStage !== undefined && { pipelineStage: body.pipelineStage }),
        ...(body.lostReason !== undefined && { lostReason: body.lostReason }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.nextFollowupAt !== undefined && {
          nextFollowupAt: body.nextFollowupAt ? new Date(body.nextFollowupAt) : null,
        }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await db.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
