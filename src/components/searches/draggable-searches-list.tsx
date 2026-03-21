"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Users,
  Globe,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

interface SearchItem {
  id: string;
  query: string;
  location: string;
  status: string;
  leadsFound: number;
  leadsWithWebsite: number;
  errorMessage: string | null;
  sortOrder: number | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  PENDING: { label: "In attesa", icon: Clock, color: "bg-gray-500/10 text-gray-500" },
  RUNNING: { label: "In corso...", icon: Loader2, color: "bg-blue-500/10 text-blue-500" },
  COMPLETED: { label: "Completata", icon: CheckCircle, color: "bg-green-500/10 text-green-500" },
  FAILED: { label: "Errore", icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return diffDays === 1 ? "ieri" : `${diffDays} giorni fa`;
  if (diffHours > 0) return diffHours === 1 ? "1 ora fa" : `${diffHours} ore fa`;
  if (diffMins > 0) return diffMins === 1 ? "1 minuto fa" : `${diffMins} minuti fa`;
  return "adesso";
}

export function DraggableSearchesList({
  initialSearches,
}: {
  initialSearches: SearchItem[];
}) {
  const [searches, setSearches] = useState(initialSearches);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;

      const items = Array.from(searches);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      setSearches(items);

      try {
        const res = await fetch("/api/searches/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: items.map((s) => s.id) }),
        });
        if (!res.ok) throw new Error();
        toast.success("Ordine salvato");
      } catch {
        // Rollback
        setSearches(initialSearches);
        toast.error("Errore nel salvataggio dell'ordine");
      }
    },
    [searches, initialSearches]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="searches">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-3"
          >
            {searches.map((search, index) => {
              const statusConfig =
                STATUS_CONFIG[search.status as keyof typeof STATUS_CONFIG] ||
                STATUS_CONFIG.PENDING;
              const StatusIcon = statusConfig.icon;

              return (
                <Draggable key={search.id} draggableId={search.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? "opacity-90" : ""}
                    >
                      <Card className={`card-hover cursor-pointer ${snapshot.isDragging ? "ring-2 ring-primary shadow-lg" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                              onClick={(e) => e.preventDefault()}
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>

                            <Link
                              href={`/searches/${search.id}`}
                              className="flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">
                                  {search.query}
                                </h3>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">
                                  {search.location}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <Badge
                                  variant="outline"
                                  className={statusConfig.color}
                                >
                                  <StatusIcon
                                    className={`h-3 w-3 mr-1 ${search.status === "RUNNING" ? "animate-spin" : ""}`}
                                  />
                                  {statusConfig.label}
                                </Badge>

                                {search.leadsFound > 0 && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    {search.leadsFound} trovati
                                  </span>
                                )}

                                {search.leadsWithWebsite > 0 && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Globe className="h-3.5 w-3.5" />
                                    {search.leadsWithWebsite} con sito
                                  </span>
                                )}

                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <Calendar className="h-3 w-3" />
                                  {formatTimeAgo(search.createdAt)}
                                </span>
                              </div>

                              {search.errorMessage && (
                                <div className="mt-3 p-2 bg-red-500/10 rounded-lg text-sm text-red-500">
                                  {search.errorMessage}
                                </div>
                              )}
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
