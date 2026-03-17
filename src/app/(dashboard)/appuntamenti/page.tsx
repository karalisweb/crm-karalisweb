"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelinePage } from "@/components/leads/pipeline-page";
import { WeeklyCalendar } from "@/components/calendar/weekly-calendar";

interface Lead {
  id: string;
  name: string;
  category: string | null;
  opportunityScore: number | null;
  appointmentAt: string | null;
  phone: string | null;
}

export default function AppuntamentiPage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads?stages=CALL_FISSATA&pageSize=100");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Fissate</h1>
          <p className="text-sm text-muted-foreground">
            Call conoscitive programmate
          </p>
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <Button
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
            className="h-8 px-3"
          >
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            Calendario
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1.5" />
            Lista
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "calendar" ? (
        loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-7 gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </div>
          </div>
        ) : (
          <WeeklyCalendar leads={leads} />
        )
      ) : (
        <PipelinePage
          title=""
          subtitle=""
          emptyIcon={<CalendarIcon className="h-12 w-12" />}
          emptyTitle="Nessuna call fissata"
          emptySubtitle="Le call fissate appariranno qui"
          stages={["CALL_FISSATA"]}
          showAppointment
          hideHeader
        />
      )}
    </div>
  );
}
