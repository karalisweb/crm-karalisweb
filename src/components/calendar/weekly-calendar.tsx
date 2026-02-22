"use client";

import { useState, useMemo } from "react";
import {
  addDays,
  startOfWeek,
  format,
  isSameDay,
  isToday,
} from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";

interface CalendarLead {
  id: string;
  name: string;
  category: string | null;
  opportunityScore: number | null;
  appointmentAt: string | null;
  phone: string | null;
}

interface WeeklyCalendarProps {
  leads: CalendarLead[];
}

export function WeeklyCalendar({ leads }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const leadsByDay = useMemo(() => {
    const map: Record<string, CalendarLead[]> = {};
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      map[key] = leads.filter(
        (lead) =>
          lead.appointmentAt &&
          isSameDay(new Date(lead.appointmentAt), day)
      );
    });
    return map;
  }, [leads, weekDays]);

  const weekLabel = `${format(weekDays[0], "d MMM", { locale: it })} - ${format(
    weekDays[6],
    "d MMM yyyy",
    { locale: it }
  )}`;

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">{weekLabel}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(0)}
          className="text-xs"
        >
          Oggi
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLeads = leadsByDay[key] || [];
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-[120px] rounded-lg border p-2 ${
                today
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-medium uppercase ${
                    today ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "EEE", { locale: it })}
                </span>
                <span
                  className={`text-sm font-bold ${
                    today ? "text-primary" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Appointments */}
              <div className="space-y-1.5">
                {dayLeads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <Card className="card-hover cursor-pointer">
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium truncate">
                              {lead.name}
                            </p>
                            {lead.appointmentAt && (
                              <p className="text-[10px] text-muted-foreground">
                                {format(
                                  new Date(lead.appointmentAt),
                                  "HH:mm"
                                )}
                              </p>
                            )}
                          </div>
                          {lead.opportunityScore && (
                            <Badge
                              variant={
                                lead.opportunityScore >= 80
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[9px] px-1 py-0 shrink-0"
                            >
                              {lead.opportunityScore}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {dayLeads.length === 0 && (
                  <div className="flex items-center justify-center h-[60px]">
                    <Calendar className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
