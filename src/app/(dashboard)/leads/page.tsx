"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { PIPELINE_STAGES, getScoreCategory } from "@/types";
import {
  Phone,
  Globe,
  Star,
  ChevronLeft,
  ChevronRight,
  Flame,
  GripVertical,
  Search,
  Plus,
  List,
  Kanban,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  website: string | null;
  opportunityScore: number | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  pipelineStage: string;
  auditStatus: string;
}

interface ColumnData {
  [key: string]: Lead[];
}

// Stages rilevanti per il commerciale (escludiamo NEW che sono solo importati)
const ACTIVE_STAGES = [
  "TO_CALL",
  "CALLED",
  "INTERESTED",
  "AUDIT_SENT",
  "MEETING",
  "PROPOSAL",
  "WON",
  "LOST",
];

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

// Lead Card per la lista
function LeadListCard({
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
  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/leads/${lead.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate hover:underline">{lead.name}</h3>
                {isHot && <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />}
              </div>
            </Link>

            {lead.category && (
              <p className="text-sm text-muted-foreground truncate mb-2">
                {lead.category}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm">
              {lead.googleRating && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {Number(lead.googleRating).toFixed(1)}
                  {lead.googleReviewsCount && (
                    <span className="text-xs">({lead.googleReviewsCount})</span>
                  )}
                </span>
              )}
              {lead.address && (
                <span className="text-muted-foreground truncate text-xs">
                  {lead.address.split(",")[0]}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {stageInfo?.label || lead.pipelineStage}
            </Badge>

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
                Score: {lead.opportunityScore}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-sm hover:bg-green-500/20 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Chiama
              </a>
            )}
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                Sito
              </a>
            )}
          </div>

          {/* Stage change buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveLeft}
              disabled={!canMoveLeft}
              className="h-8 px-2"
              title={canMoveLeft ? `Sposta indietro` : undefined}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveRight}
              disabled={!canMoveRight}
              className="h-8 px-2"
              title={canMoveRight ? `Sposta avanti` : undefined}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile stage selector per Kanban
const MobileStageSelector = ({
  currentIndex,
  onSelect,
  columns,
  visibleStages,
}: {
  currentIndex: number;
  onSelect: (index: number) => void;
  columns: ColumnData;
  visibleStages: string[];
}) => {
  return (
    <div className="mb-4 md:hidden">
      <div className="flex gap-2 flex-wrap">
        {visibleStages.map((stageKey, index) => {
          const stage = PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
          const leads = columns[stageKey] || [];
          const isActive = index === currentIndex;

          return (
            <button
              key={stageKey}
              onClick={() => onSelect(index)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
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
    </div>
  );
};

// Mobile Lead Card per Kanban
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
          <div className="flex-shrink-0 pt-1 text-muted-foreground/50">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
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

            <div className="flex items-center justify-between">
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

// Desktop Lead Card per Kanban
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

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<ColumnData>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const KANBAN_PAGE_SIZE = 200; // Kanban carica più lead per avere tutte le colonne popolate

  // View mode: "list" o "kanban"
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // Kanban state
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  // Ref per infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filtri selezionati (per la pipeline)
  const [selectedStages, setSelectedStages] = useState<string[]>(() => {
    const stagesParam = searchParams.get("stages");
    if (stagesParam) {
      return stagesParam.split(",");
    }
    // Default: TO_CALL (Da Chiamare)
    return ["TO_CALL"];
  });

  // Fetch leads con paginazione
  const fetchLeads = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Sempre filtra per audit completato e con sito web
      const params = new URLSearchParams();
      params.set("audit", "COMPLETED");
      params.set("website", "yes");
      params.set("page", String(pageNum));
      // Kanban carica più lead per popolare tutte le colonne
      const currentPageSize = viewMode === "kanban" ? KANBAN_PAGE_SIZE : PAGE_SIZE;
      params.set("pageSize", String(currentPageSize));

      // Per la lista, filtra anche per stage selezionati
      if (viewMode === "list" && selectedStages.length > 0) {
        params.set("stages", selectedStages.join(","));
      }

      // Richiedi i conteggi per stage solo al primo caricamento
      if (pageNum === 1) {
        params.set("stageCounts", "true");
      }

      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();

      const newLeads = data.leads || [];
      const totalCount = data.total || 0;

      if (append) {
        setLeads(prev => [...prev, ...newLeads]);
      } else {
        setLeads(newLeads);
      }

      setTotal(totalCount);
      setHasMore(newLeads.length === currentPageSize && (pageNum * currentPageSize) < totalCount);

      // Usa i conteggi dall'API se disponibili (solo al primo caricamento)
      if (data.stageCounts) {
        const counts: Record<string, number> = {};
        for (const stage of stageOrder) {
          counts[stage] = data.stageCounts[stage] || 0;
        }
        setStageCounts(counts);
      }

      // Organizza per Kanban
      if (append) {
        setColumns(prev => {
          const newColumns = { ...prev };
          for (const lead of newLeads) {
            if (newColumns[lead.pipelineStage]) {
              newColumns[lead.pipelineStage] = [...newColumns[lead.pipelineStage], lead];
              // Riordina per score
              newColumns[lead.pipelineStage].sort((a, b) =>
                (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0)
              );
            }
          }
          return newColumns;
        });
      } else {
        const grouped: ColumnData = {};
        for (const stage of stageOrder) {
          grouped[stage] = [];
        }
        for (const lead of newLeads) {
          if (grouped[lead.pipelineStage]) {
            grouped[lead.pipelineStage].push(lead);
          }
        }
        // Ordina per score dentro ogni colonna
        for (const stage of stageOrder) {
          grouped[stage].sort((a, b) => {
            const scoreA = a.opportunityScore ?? 0;
            const scoreB = b.opportunityScore ?? 0;
            return scoreB - scoreA;
          });
        }
        setColumns(grouped);
      }
    } catch (error) {
      toast.error("Errore nel caricamento dei lead");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [viewMode, selectedStages]);

  // Carica altri lead (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLeads(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchLeads]);

  // Reset paginazione e ricarica quando cambiano filtri o vista
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeads(1, false);
  }, [viewMode, selectedStages]);

  // Intersection Observer per infinite scroll
  useEffect(() => {
    if (viewMode !== "list") return; // Solo per vista lista

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, loading, loadMore, viewMode]);

  // Aggiorna URL quando cambiano i filtri
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedStages.length > 0 && selectedStages.length < ACTIVE_STAGES.length) {
      params.set("stages", selectedStages.join(","));
    }
    if (viewMode !== "list") {
      params.set("view", viewMode);
    }
    const newUrl = params.toString() ? `/leads?${params.toString()}` : "/leads";
    router.replace(newUrl, { scroll: false });
  }, [selectedStages, viewMode, router]);

  // Toggle uno stage
  const toggleStage = (stage: string) => {
    setSelectedStages((prev) => {
      if (prev.includes(stage)) {
        // Se rimane almeno uno, rimuovi
        if (prev.length > 1) {
          return prev.filter((s) => s !== stage);
        }
        return prev;
      } else {
        return [...prev, stage];
      }
    });
  };

  // Kanban: update lead stage
  const updateLeadStage = async (leadId: string, newStage: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const stageInfo = PIPELINE_STAGES[newStage as keyof typeof PIPELINE_STAGES];
      toast.success(`Lead spostato in "${stageInfo.label}"`);
      return true;
    } catch {
      toast.error("Errore nell'aggiornamento");
      return false;
    }
  };

  const moveLead = async (leadId: string, fromStage: string, toStage: string) => {
    // Optimistic update per Kanban columns
    const newColumns = { ...columns };
    const fromLeads = [...(newColumns[fromStage] || [])];
    const toLeads = [...(newColumns[toStage] || [])];

    const leadIndex = fromLeads.findIndex((l) => l.id === leadId);
    if (leadIndex !== -1) {
      const [lead] = fromLeads.splice(leadIndex, 1);
      toLeads.unshift({ ...lead, pipelineStage: toStage });
      toLeads.sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));

      newColumns[fromStage] = fromLeads;
      newColumns[toStage] = toLeads;
      setColumns(newColumns);
    }

    // Optimistic update per lista leads
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, pipelineStage: toStage } : lead
      )
    );

    // Optimistic update per conteggi stage
    setStageCounts((prev) => ({
      ...prev,
      [fromStage]: Math.max(0, (prev[fromStage] || 0) - 1),
      [toStage]: (prev[toStage] || 0) + 1,
    }));

    const success = await updateLeadStage(leadId, toStage);
    if (!success) {
      // Rollback: ricarica tutto
      fetchLeads(1, false);
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

  // Filtra lead per la lista
  const filteredLeads = viewMode === "list"
    ? leads.filter((lead) => selectedStages.includes(lead.pipelineStage))
    : leads;

  // Stages visibili nel Kanban (escluso NEW, solo quelli con lead + quelli selezionati)
  const visibleKanbanStages = stageOrder.filter(
    (stage) => stage !== "NEW" && ((columns[stage]?.length || 0) > 0 || selectedStages.includes(stage))
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const activeStage = visibleKanbanStages[activeStageIndex] || visibleKanbanStages[0];
  const activeLeads = columns[activeStage] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Da Chiamare</h1>
          <p className="text-sm text-muted-foreground">
            {total} lead qualificati (sito + audit)
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Nuova Ricerca</span>
        </Link>
      </div>

      {/* Filtri e toggle vista */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tab per tutti gli stage (escluso NEW) */}
        {ACTIVE_STAGES.map((stageKey) => {
          const stage = PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
          const isActive = selectedStages.includes(stageKey);
          const count = stageCounts[stageKey] || 0;
          return (
            <Button
              key={stageKey}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => toggleStage(stageKey)}
              className="gap-1.5"
            >
              {stage.label}
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className="text-xs px-1.5"
              >
                {count}
              </Badge>
            </Button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Toggle vista */}
        <div className="flex items-center rounded-lg border border-input p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1.5 h-7 px-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-1.5 h-7 px-2"
          >
            <Kanban className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
        </div>
      </div>

      {/* Contenuto */}
      {filteredLeads.length === 0 && viewMode === "list" ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-secondary mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nessun lead trovato</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedStages.length === 0
              ? "Seleziona almeno uno stato dal filtro"
              : "Nessun lead con audit completato in questi stati"}
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-4 w-4 mr-2" />
            Nuova Ricerca
          </Link>
        </div>
      ) : viewMode === "list" ? (
        /* Vista Lista */
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const currentStageIdx = stageOrder.indexOf(lead.pipelineStage);
            const prevStage = currentStageIdx > 0 ? stageOrder[currentStageIdx - 1] : null;
            const nextStage = currentStageIdx < stageOrder.length - 1 ? stageOrder[currentStageIdx + 1] : null;
            // Permettiamo di tornare indietro solo fino a TO_CALL (non a NEW)
            const canMoveLeft = currentStageIdx > 1; // > 1 perché NEW è index 0, TO_CALL è index 1
            const canMoveRight = nextStage !== null;

            return (
              <LeadListCard
                key={lead.id}
                lead={lead}
                onMoveLeft={() => {
                  if (prevStage && canMoveLeft) {
                    moveLead(lead.id, lead.pipelineStage, prevStage);
                  }
                }}
                onMoveRight={() => {
                  if (nextStage) {
                    moveLead(lead.id, lead.pipelineStage, nextStage);
                  }
                }}
                canMoveLeft={canMoveLeft}
                canMoveRight={canMoveRight}
              />
            );
          })}

          {/* Infinite scroll trigger e indicatore */}
          <div ref={loadMoreRef} className="py-4">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Caricamento...</span>
              </div>
            )}
            {!hasMore && filteredLeads.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Hai visualizzato tutti i {filteredLeads.length} lead
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Vista Kanban */
        <>
          {/* Mobile View - Single column with stage selector */}
          <div className="md:hidden">
            <MobileStageSelector
              currentIndex={activeStageIndex}
              onSelect={setActiveStageIndex}
              columns={columns}
              visibleStages={visibleKanbanStages}
            />

            <div className="space-y-2">
              {activeLeads.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Nessun lead in questa fase</p>
                  </CardContent>
                </Card>
              ) : (
                activeLeads.map((lead) => {
                  const currentIdx = visibleKanbanStages.indexOf(activeStage);
                  return (
                    <MobileLeadCard
                      key={lead.id}
                      lead={lead}
                      onMoveLeft={() => {
                        if (currentIdx > 0) {
                          const prevStage = visibleKanbanStages[currentIdx - 1];
                          moveLead(lead.id, activeStage, prevStage);
                        }
                      }}
                      onMoveRight={() => {
                        if (currentIdx < visibleKanbanStages.length - 1) {
                          const nextStage = visibleKanbanStages[currentIdx + 1];
                          moveLead(lead.id, activeStage, nextStage);
                        }
                      }}
                      canMoveLeft={currentIdx > 0}
                      canMoveRight={currentIdx < visibleKanbanStages.length - 1}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Desktop View - Kanban board */}
          <div className="hidden md:block">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {/* Escludiamo NEW dal Kanban - i lead vanno direttamente in TO_CALL dopo l'audit */}
                {stageOrder.filter(s => s !== "NEW").map((stageKey) => {
                  const stage = PIPELINE_STAGES[stageKey as keyof typeof PIPELINE_STAGES];
                  const stageLeads = columns[stageKey] || [];

                  return (
                    <div key={stageKey} className="flex-shrink-0 w-72">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {stageLeads.length}
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
                            {stageLeads.map((lead, index) => (
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

                            {stageLeads.length === 0 && (
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
        </>
      )}
    </div>
  );
}

// Loading skeleton per Suspense
function LeadsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageSkeleton />}>
      <LeadsPageContent />
    </Suspense>
  );
}
