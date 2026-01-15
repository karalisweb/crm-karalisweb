"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PIPELINE_STAGES, getScoreCategory } from "@/types";
import {
  Phone,
  Globe,
  Star,
  ChevronLeft,
  ChevronRight,
  Flame,
  GripVertical,
} from "lucide-react";
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

// Mobile stage selector - shows only 3 stages at a time
const MobileStageSelector = ({
  currentIndex,
  onSelect,
  columns,
}: {
  currentIndex: number;
  onSelect: (index: number) => void;
  columns: ColumnData;
}) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSelect(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="flex-shrink-0"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <ScrollArea className="flex-1">
        <div className="flex gap-2 px-2">
          {stageOrder.map((stageKey, index) => {
            const stage =
              PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
            const leads = columns[stageKey] || [];
            const isActive = index === currentIndex;

            return (
              <button
                key={stageKey}
                onClick={() => onSelect(index)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {stage.label}
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {leads.length}
                </Badge>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSelect(Math.min(stageOrder.length - 1, currentIndex + 1))}
        disabled={currentIndex === stageOrder.length - 1}
        className="flex-shrink-0"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};

// Mobile Lead Card - Optimized for touch
function MobileLeadCard({
  lead,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
}: {
  lead: Lead;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const scoreInfo = getScoreCategory(lead.opportunityScore);
  const isHot = lead.opportunityScore && lead.opportunityScore >= 80;

  return (
    <Card className="card-hover mb-3">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag handle indicator */}
          <div className="flex-shrink-0 pt-1 text-muted-foreground/50">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate hover:underline">
                  {lead.name}
                </h4>
              </Link>
              <div className="flex items-center gap-1 ml-2">
                {isHot && <Flame className="h-4 w-4 text-red-500" />}
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
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {lead.category && (
                <span className="truncate">{lead.category}</span>
              )}
              {lead.googleRating && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {Number(lead.googleRating).toFixed(1)}
                </span>
              )}
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between">
              {/* Quick actions */}
              <div className="flex items-center gap-1">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-green-500/10 rounded-lg touch-target"
                  >
                    <Phone className="h-4 w-4 text-green-500" />
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-blue-500/10 rounded-lg touch-target"
                  >
                    <Globe className="h-4 w-4 text-blue-500" />
                  </a>
                )}
              </div>

              {/* Stage movement buttons - Mobile only */}
              <div className="flex items-center gap-1 md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMoveLeft();
                  }}
                  disabled={!canMoveLeft}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMoveRight();
                  }}
                  disabled={!canMoveRight}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Desktop Lead Card - Original style optimized
function DesktopLeadCard({ lead }: { lead: Lead }) {
  const scoreInfo = getScoreCategory(lead.opportunityScore);
  const isHot = lead.opportunityScore && lead.opportunityScore >= 80;

  return (
    <Card className="cursor-grab active:cursor-grabbing card-hover">
      <CardContent className="p-3">
        <Link href={`/leads/${lead.id}`} className="block">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate hover:underline flex-1">
              {lead.name}
            </h4>
            {isHot && <Flame className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
          </div>
        </Link>

        {lead.category && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                className="p-1.5 hover:bg-accent rounded-lg"
              >
                <Phone className="h-3.5 w-3.5 text-green-500" />
              </a>
            )}
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 hover:bg-accent rounded-lg"
              >
                <Globe className="h-3.5 w-3.5 text-blue-500" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState<ColumnData>({});
  const [loading, setLoading] = useState(true);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/leads?pageSize=500");
      const data = await response.json();

      const grouped: ColumnData = {};
      for (const stage of stageOrder) {
        grouped[stage] = [];
      }

      for (const lead of data.leads) {
        if (grouped[lead.pipelineStage]) {
          grouped[lead.pipelineStage].push(lead);
        }
      }

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

  const updateLeadStage = async (leadId: string, newStage: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const stageInfo =
        PIPELINE_STAGES[newStage as keyof typeof PIPELINE_STAGES];
      toast.success(`Lead spostato in "${stageInfo.label}"`);
      return true;
    } catch {
      toast.error("Errore nell'aggiornamento");
      return false;
    }
  };

  const moveLead = async (
    leadId: string,
    fromStage: string,
    toStage: string
  ) => {
    // Optimistic update
    const newColumns = { ...columns };
    const fromLeads = [...newColumns[fromStage]];
    const toLeads = [...newColumns[toStage]];

    const leadIndex = fromLeads.findIndex((l) => l.id === leadId);
    if (leadIndex === -1) return;

    const [lead] = fromLeads.splice(leadIndex, 1);
    toLeads.unshift({ ...lead, pipelineStage: toStage });

    // Sort by score
    toLeads.sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));

    newColumns[fromStage] = fromLeads;
    newColumns[toStage] = toLeads;
    setColumns(newColumns);

    // Update on server
    const success = await updateLeadStage(leadId, toStage);
    if (!success) {
      fetchLeads(); // Rollback on error
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

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

    const success = await updateLeadStage(draggableId, destination.droppableId);
    if (!success) {
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl md:text-3xl font-bold">Pipeline</h1>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          <Skeleton className="h-10 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>

        {/* Desktop skeleton */}
        <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
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

  const activeStage = stageOrder[activeStageIndex];
  const activeLeads = columns[activeStage] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Trascina i lead tra le colonne per aggiornare lo stato
          </p>
        </div>
      </div>

      {/* Mobile View - Single column with stage selector */}
      <div className="md:hidden">
        <MobileStageSelector
          currentIndex={activeStageIndex}
          onSelect={setActiveStageIndex}
          columns={columns}
        />

        <div className="space-y-2">
          {activeLeads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nessun lead in questa fase</p>
              </CardContent>
            </Card>
          ) : (
            activeLeads.map((lead) => (
              <MobileLeadCard
                key={lead.id}
                lead={lead}
                onMoveLeft={() => {
                  if (activeStageIndex > 0) {
                    const prevStage = stageOrder[activeStageIndex - 1];
                    moveLead(lead.id, activeStage, prevStage);
                  }
                }}
                onMoveRight={() => {
                  if (activeStageIndex < stageOrder.length - 1) {
                    const nextStage = stageOrder[activeStageIndex + 1];
                    moveLead(lead.id, activeStage, nextStage);
                  }
                }}
                canMoveLeft={activeStageIndex > 0}
                canMoveRight={activeStageIndex < stageOrder.length - 1}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop View - Kanban board */}
      <div className="hidden md:block">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {stageOrder.map((stageKey) => {
              const stage =
                PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
              const leads = columns[stageKey] || [];

              return (
                <div key={stageKey} className="flex-shrink-0 w-72">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {leads.length}
                    </Badge>
                  </div>

                  <Droppable droppableId={stageKey}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[500px] p-2 rounded-xl transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-primary/10"
                            : "bg-secondary/50"
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
                                  snapshot.isDragging ? "opacity-80 rotate-2" : ""
                                }`}
                              >
                                <DesktopLeadCard lead={lead} />
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
    </div>
  );
}
