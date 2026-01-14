"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PIPELINE_STAGES, getScoreCategory } from "@/types";
import { Phone, Globe, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  opportunityScore: number | null;
  googleRating: number | null;
  pipelineStage: string;
}

interface ColumnData {
  [key: string]: Lead[];
}

const stageOrder = [
  "NEW",
  "TO_CALL",
  "CALLED",
  "INTERESTED",
  "AUDIT_SENT",
  "MEETING",
  "PROPOSAL",
  "WON",
  "LOST",
];

export default function PipelinePage() {
  const [columns, setColumns] = useState<ColumnData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/leads?pageSize=500");
      const data = await response.json();

      // Organizza lead per stage
      const grouped: ColumnData = {};
      for (const stage of stageOrder) {
        grouped[stage] = [];
      }

      for (const lead of data.leads) {
        if (grouped[lead.pipelineStage]) {
          grouped[lead.pipelineStage].push(lead);
        }
      }

      // Ordina per score in ogni colonna
      for (const stage of stageOrder) {
        grouped[stage].sort((a, b) => {
          const scoreA = a.opportunityScore ?? 0;
          const scoreB = b.opportunityScore ?? 0;
          return scoreB - scoreA;
        });
      }

      setColumns(grouped);
    } catch (error) {
      toast.error("Errore nel caricamento dei lead");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Se non c'e destinazione o e la stessa posizione, ignora
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Aggiorna UI ottimisticamente
    const newColumns = { ...columns };
    const sourceColumn = [...newColumns[source.droppableId]];
    const destColumn =
      source.droppableId === destination.droppableId
        ? sourceColumn
        : [...newColumns[destination.droppableId]];

    const [removed] = sourceColumn.splice(source.index, 1);
    destColumn.splice(destination.index, 0, {
      ...removed,
      pipelineStage: destination.droppableId,
    });

    newColumns[source.droppableId] = sourceColumn;
    newColumns[destination.droppableId] = destColumn;
    setColumns(newColumns);

    // Aggiorna sul server
    try {
      const response = await fetch(`/api/leads/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineStage: destination.droppableId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      const stageInfo = PIPELINE_STAGES[destination.droppableId as keyof typeof PIPELINE_STAGES];
      toast.success(`Lead spostato in "${stageInfo.label}"`);
    } catch {
      // Rollback
      toast.error("Errore nell'aggiornamento");
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stageOrder.slice(0, 5).map((stage) => (
            <div key={stage} className="flex-shrink-0 w-72">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">
          Trascina i lead tra le colonne per aggiornare lo stato
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stageOrder.map((stageKey) => {
            const stage = PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
            const leads = columns[stageKey] || [];

            return (
              <div key={stageKey} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{stage.label}</h3>
                  <Badge variant="secondary">{leads.length}</Badge>
                </div>

                <Droppable droppableId={stageKey}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-accent"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {leads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2 ${
                                snapshot.isDragging ? "opacity-80" : ""
                              }`}
                            >
                              <LeadCard lead={lead} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {leads.length === 0 && (
                        <p className="text-center text-muted-foreground py-8 text-sm">
                          Nessun lead
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const scoreInfo = getScoreCategory(lead.opportunityScore);

  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardContent className="p-3">
        <Link href={`/leads/${lead.id}`} className="block">
          <h4 className="font-medium truncate hover:underline">{lead.name}</h4>
        </Link>

        {lead.category && (
          <p className="text-xs text-muted-foreground truncate">
            {lead.category}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {lead.opportunityScore !== null && (
              <Badge
                variant={
                  scoreInfo.color === "red"
                    ? "destructive"
                    : scoreInfo.color === "green"
                    ? "default"
                    : "secondary"
                }
                className="text-xs"
              >
                {lead.opportunityScore}
              </Badge>
            )}

            {lead.googleRating && (
              <span className="flex items-center text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-0.5" />
                {Number(lead.googleRating).toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-accent rounded"
              >
                <Phone className="h-3 w-3" />
              </a>
            )}
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-accent rounded"
              >
                <Globe className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
