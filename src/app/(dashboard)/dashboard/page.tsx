import { Suspense } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Target,
  Trophy,
  ChevronRight,
  Flame,
  Video,
  Send,
  MessageCircle,
  ClipboardCheck,
  BarChart3,
  CalendarCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { timeAgo } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function DashboardStats() {
  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  const [
    // KPI globali
    totalLeads,
    leadsThisWeek,
    leadsThisMonth,
    totalAuditCompleted,
    totalVinto,
    totalRisposto,
    // Funnel data
    countDaQualificare,
    countQualificati,
    countVideoDaFare,
    countVideoInviato,
    countFollowUp,
    countRisposti,
    countCallFissata,
    countInConversazione,
    countProposta,
    countVinto,
    // Attività questa settimana
    auditThisWeek,
    geminiThisWeek,
    videoSentThisWeek,
    letterSentThisWeek,
    linkedinSentThisWeek,
    respondedThisWeek,
    qualifiedThisWeek,
    // Lead prioritari
    topLeads,
    // Ricerche recenti
    recentSearches,
  ] = await Promise.all([
    // KPI
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.lead.count({ where: { auditStatus: "COMPLETED" } }),
    db.lead.count({ where: { pipelineStage: "VINTO" } }),
    db.lead.count({
      where: {
        pipelineStage: {
          in: ["RISPOSTO", "CALL_FISSATA", "IN_CONVERSAZIONE", "PROPOSTA_INVIATA", "VINTO"],
        },
      },
    }),
    // Funnel
    db.lead.count({ where: { pipelineStage: "DA_QUALIFICARE" } }),
    db.lead.count({ where: { pipelineStage: "QUALIFICATO" } }),
    db.lead.count({ where: { pipelineStage: "VIDEO_DA_FARE" } }),
    db.lead.count({ where: { pipelineStage: "VIDEO_INVIATO" } }),
    db.lead.count({
      where: {
        pipelineStage: { in: ["VIDEO_INVIATO", "LETTERA_INVIATA", "FOLLOW_UP_LINKEDIN"] },
      },
    }),
    db.lead.count({ where: { pipelineStage: "RISPOSTO" } }),
    db.lead.count({ where: { pipelineStage: "CALL_FISSATA" } }),
    db.lead.count({ where: { pipelineStage: "IN_CONVERSAZIONE" } }),
    db.lead.count({ where: { pipelineStage: "PROPOSTA_INVIATA" } }),
    db.lead.count({ where: { pipelineStage: "VINTO" } }),
    // Attività settimana
    db.lead.count({ where: { auditCompletedAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { geminiAnalyzedAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { videoSentAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { letterSentAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { linkedinSentAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { respondedAt: { gte: startOfWeek } } }),
    db.lead.count({ where: { qualifiedAt: { gte: startOfWeek } } }),
    // Top leads
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
    // Ricerche
    db.search.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Calcoli derivati
  const conversionRate = totalAuditCompleted > 0
    ? Math.round((totalRisposto / totalAuditCompleted) * 100)
    : 0;

  const touchpointsThisWeek = videoSentThisWeek + letterSentThisWeek + linkedinSentThisWeek;

  const funnelData = [
    { name: "Qualifica", value: countDaQualificare, color: "#f59e0b" },
    { name: "Qualificati", value: countQualificati, color: "#8b5cf6" },
    { name: "Video", value: countVideoDaFare + countVideoInviato, color: "#a855f7" },
    { name: "Follow-up", value: countFollowUp, color: "#06b6d4" },
    { name: "Trattative", value: countRisposti + countCallFissata + countInConversazione, color: "#3b82f6" },
    { name: "Proposte", value: countProposta, color: "#2d7d9a" },
    { name: "Vinti", value: countVinto, color: "#22c55e" },
  ];

  return (
    <>
      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <AnimatedCounter
                  value={totalLeads}
                  className="text-2xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground">Lead totali</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-green-500 font-medium">+{leadsThisWeek}</span>
              <span className="text-xs text-muted-foreground">questa settimana</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <AnimatedCounter
                  value={totalAuditCompleted}
                  className="text-2xl font-bold text-foreground"
                />
                <p className="text-xs text-muted-foreground">Audit completati</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-green-500 font-medium">+{auditThisWeek}</span>
              <span className="text-xs text-muted-foreground">questa settimana</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10">
                <MessageCircle className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <span className="text-2xl font-bold">{conversionRate}%</span>
                <p className="text-xs text-muted-foreground">Tasso risposta</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {totalRisposto} risposte su {totalAuditCompleted} contattati
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <AnimatedCounter
                  value={totalVinto}
                  className="text-2xl font-bold text-green-500"
                />
                <p className="text-xs text-muted-foreground">Clienti acquisiti</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {leadsThisMonth} lead questo mese
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Pipeline + Attività Settimana */}
      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        {/* Pipeline Funnel - 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* Attività Settimana - 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Attività questa settimana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <ActivityRow
              icon={<ClipboardCheck className="h-4 w-4 text-amber-500" />}
              label="Lead qualificati"
              value={qualifiedThisWeek}
            />
            <ActivityRow
              icon={<CalendarCheck className="h-4 w-4 text-purple-500" />}
              label="Analisi Gemini"
              value={geminiThisWeek}
            />
            <ActivityRow
              icon={<Video className="h-4 w-4 text-violet-500" />}
              label="Video inviati"
              value={videoSentThisWeek}
            />
            <ActivityRow
              icon={<Send className="h-4 w-4 text-blue-500" />}
              label="Touchpoint totali"
              value={touchpointsThisWeek}
              sublabel={`${videoSentThisWeek}V + ${letterSentThisWeek}L + ${linkedinSentThisWeek}LI`}
            />
            <ActivityRow
              icon={<MessageCircle className="h-4 w-4 text-green-500" />}
              label="Risposte ricevute"
              value={respondedThisWeek}
              highlight
            />
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Lead Prioritari */}
      {topLeads.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Lead prioritari
            </h2>
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
                            lead.opportunityScore && lead.opportunityScore >= 80
                              ? "destructive"
                              : lead.opportunityScore && lead.opportunityScore >= 60
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

      {/* ROW 4: Ricerche Recenti */}
      {recentSearches.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Ricerche recenti</h2>
            <Link
              href="/searches"
              className="text-sm text-primary hover:underline flex items-center"
            >
              Tutte
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
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

      {/* Cmd+K hint */}
      <div className="flex items-center justify-center gap-2 py-4 mt-2">
        <span className="text-xs text-muted-foreground">Premi</span>
        <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-secondary px-1.5 text-[10px] text-muted-foreground">
          Cmd+K
        </kbd>
        <span className="text-xs text-muted-foreground">per cercare</span>
      </div>
    </>
  );
}

function ActivityRow({
  icon,
  label,
  value,
  sublabel,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2.5">
        {icon}
        <div>
          <span className="text-sm">{label}</span>
          {sublabel && (
            <p className="text-[10px] text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </div>
      <span
        className={`text-lg font-bold tabular-nums ${
          highlight && value > 0 ? "text-green-500" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <Skeleton className="h-[220px] w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Skeleton className="h-[220px] w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <Skeleton className="h-6 w-32 mb-3" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full mb-2" />
        ))}
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-2">
      <div className="md:hidden mb-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica del tuo CRM
        </p>
      </div>

      <div className="hidden md:block mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Statistiche e performance commerciale</p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
