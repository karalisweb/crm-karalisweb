import { Suspense } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Video,
  Search,
  ChevronRight,
  Flame,
  Repeat,
  MessageCircle,
  AlertTriangle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { timeAgo } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

async function DashboardStats() {
  const [
    countDaQualificare,
    countVideoDaFare,
    countFollowUp,
    countRisposto,
    recentSearches,
    topLeads,
    // Funnel data
    countQualificati,
    countVideoInviato,
    countCallFissata,
    countProposta,
    countVinto,
    // Today items
    overdueFollowups,
    todayAppointments,
  ] = await Promise.all([
    db.lead.count({ where: { pipelineStage: "DA_QUALIFICARE" } }),
    db.lead.count({ where: { pipelineStage: "VIDEO_DA_FARE" } }),
    db.lead.count({
      where: {
        pipelineStage: {
          in: ["VIDEO_INVIATO", "LETTERA_INVIATA", "FOLLOW_UP_LINKEDIN"],
        },
      },
    }),
    db.lead.count({ where: { pipelineStage: "RISPOSTO" } }),
    db.search.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    db.lead.findMany({
      where: {
        pipelineStage: "DA_QUALIFICARE",
        opportunityScore: { not: null },
      },
      orderBy: { opportunityScore: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        category: true,
        opportunityScore: true,
        talkingPoints: true,
        commercialTag: true,
      },
    }),
    // Funnel counts
    db.lead.count({ where: { pipelineStage: "QUALIFICATO" } }),
    db.lead.count({ where: { pipelineStage: "VIDEO_INVIATO" } }),
    db.lead.count({ where: { pipelineStage: "CALL_FISSATA" } }),
    db.lead.count({ where: { pipelineStage: "PROPOSTA_INVIATA" } }),
    db.lead.count({ where: { pipelineStage: "VINTO" } }),
    // Overdue follow-ups
    db.lead.findMany({
      where: {
        nextFollowupAt: { lt: new Date() },
        pipelineStage: {
          in: [
            "VIDEO_INVIATO",
            "LETTERA_INVIATA",
            "FOLLOW_UP_LINKEDIN",
            "RISPOSTO",
            "IN_CONVERSAZIONE",
          ],
        },
      },
      take: 5,
      orderBy: { nextFollowupAt: "asc" },
      select: { id: true, name: true, nextFollowupAt: true, pipelineStage: true },
    }),
    // Today's appointments
    db.lead.findMany({
      where: {
        pipelineStage: "CALL_FISSATA",
        appointmentAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      take: 5,
      select: { id: true, name: true, appointmentAt: true },
    }),
  ]);

  const funnelData = [
    { name: "Qualifica", value: countDaQualificare, color: "#f59e0b" },
    { name: "Qualificati", value: countQualificati, color: "#8b5cf6" },
    { name: "Video", value: countVideoDaFare + countVideoInviato, color: "#a855f7" },
    { name: "Risposto", value: countRisposto, color: "#06b6d4" },
    { name: "Call", value: countCallFissata, color: "#3b82f6" },
    { name: "Proposta", value: countProposta, color: "#2d7d9a" },
    { name: "Vinto", value: countVinto, color: "#22c55e" },
  ];

  const hasUrgentItems = overdueFollowups.length > 0 || todayAppointments.length > 0;

  return (
    <>
      {/* Stats Cards with Animated Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Link href="/da-qualificare">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <ClipboardCheck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <AnimatedCounter
                    value={countDaQualificare}
                    className="text-2xl font-bold text-amber-500"
                  />
                  <p className="text-xs text-muted-foreground">Da qualificare</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/video-da-fare">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Video className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <AnimatedCounter
                    value={countVideoDaFare}
                    className="text-2xl font-bold text-purple-500"
                  />
                  <p className="text-xs text-muted-foreground">Video da fare</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/follow-up">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10">
                  <Repeat className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <AnimatedCounter
                    value={countFollowUp}
                    className="text-2xl font-bold text-cyan-500"
                  />
                  <p className="text-xs text-muted-foreground">Follow-up</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/risposto">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <AnimatedCounter
                    value={countRisposto}
                    className="text-2xl font-bold text-green-500"
                  />
                  <p className="text-xs text-muted-foreground">Hanno risposto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* "Oggi devi..." Section */}
      {hasUrgentItems && (
        <div className="mt-6">
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Oggi devi...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {todayAppointments.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Calendar className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      Call con <span className="font-medium">{lead.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lead.appointmentAt
                        ? new Date(lead.appointmentAt).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </Link>
              ))}
              {overdueFollowups.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Repeat className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      Follow-up scaduto: <span className="font-medium">{lead.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(lead.nextFollowupAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two Column Layout: Funnel + Quick Actions */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {/* Funnel Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Azioni rapide</h2>
          <Link href="/search">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary">
                  <Search className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nuova Ricerca</p>
                  <p className="text-xs text-muted-foreground">Google Maps</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/da-qualificare">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Da qualificare</p>
                  <p className="text-xs text-muted-foreground">
                    {countDaQualificare} lead
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Cmd+K hint */}
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-xs text-muted-foreground">Premi</span>
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-secondary px-1.5 text-[10px] text-muted-foreground">
              Cmd+K
            </kbd>
            <span className="text-xs text-muted-foreground">per cercare</span>
          </div>
        </div>
      </div>

      {/* Top Leads */}
      {topLeads.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Lead prioritari</h2>
            <Link
              href="/da-qualificare"
              className="text-sm text-primary hover:underline flex items-center"
            >
              Vedi tutti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="space-y-2">
            {topLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <Card className="card-hover">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {lead.name}
                          </p>
                          {lead.opportunityScore &&
                            lead.opportunityScore >= 80 && (
                              <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lead.talkingPoints && lead.talkingPoints.length > 0
                            ? lead.talkingPoints[0]
                            : lead.category || "Nessuna categoria"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge
                          variant={
                            lead.opportunityScore &&
                            lead.opportunityScore >= 80
                              ? "destructive"
                              : lead.opportunityScore &&
                                lead.opportunityScore >= 60
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {lead.opportunityScore || "-"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches with timeAgo */}
      {recentSearches.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-3">Ricerche recenti</h2>
          <div className="space-y-2">
            {recentSearches.map((search) => (
              <Card key={search.id} className="card-hover">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {search.query} - {search.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {search.leadsFound} lead &middot; {timeAgo(search.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        search.status === "COMPLETED"
                          ? "default"
                          : search.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {search.status === "COMPLETED"
                        ? "OK"
                        : search.status === "FAILED"
                        ? "Errore"
                        : "..."}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <div className="md:hidden mb-4">
        <h1 className="text-xl font-bold">Buongiorno!</h1>
        <p className="text-sm text-muted-foreground">
          Ecco il riepilogo di oggi
        </p>
      </div>

      <div className="hidden md:block mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Panoramica del tuo CRM</p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
