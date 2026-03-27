import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PIPELINE_STAGES, STAGE_ROUTES } from "@/types";
import {
  ArrowLeft,
  Star,
  Target,
  MessageSquare,
} from "lucide-react";
import { PipelineStageSelector } from "@/components/leads/pipeline-stage-selector";
import { VideoTrackingSection } from "@/components/leads/video-tracking-section";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { timeAgo } from "@/lib/date-utils";
import { VideoOutreachStepperWrapper } from "@/components/leads/video-outreach-stepper-wrapper";
import { ContactInfoEditor } from "@/components/leads/contact-info-editor";
import { MessagingHub } from "@/components/leads/messaging-hub";

export const dynamic = "force-dynamic";

interface LeadPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function LeadDetailPage({ params, searchParams }: LeadPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const validTabs = ["info", "messaggi", "video-outreach", "activities"];
  const defaultTab = tab && validTabs.includes(tab) ? tab : "info";
  // Supporta anche vecchi alias — redirect to video-outreach
  const resolvedTab = tab === "ai-analysis" || tab === "analisi-ai" || tab === "analisi-strategica"
    ? "video-outreach"
    : defaultTab;

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tasks: {
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];
  const stageRoute = STAGE_ROUTES[lead.pipelineStage] || "/da-analizzare";
  const stageLabel = stageInfo?.label || "Leads";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: stageLabel, href: stageRoute },
          { label: lead.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={stageRoute}>
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{lead.name}</h1>
          {lead.category && (
            <p className="text-sm text-muted-foreground">{lead.category}</p>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <PipelineStageSelector
              leadId={lead.id}
              currentStage={lead.pipelineStage}
              lostReason={lead.lostReason}
              lostReasonNotes={lead.lostReasonNotes}
            />
            <p className="text-xs text-muted-foreground mt-1">Stage Pipeline</p>
          </CardContent>
        </Card>

        {lead.googleRating && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {Number(lead.googleRating).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({lead.googleReviewsCount} rec.)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Google Rating</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-5 pb-4">
            <span className="text-sm font-medium">
              {lead.lastContactedAt ? timeAgo(lead.lastContactedAt) : "Mai"}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Ultimo Contatto</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={resolvedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informazioni</TabsTrigger>
          <TabsTrigger value="messaggi">Messaggi</TabsTrigger>
          <TabsTrigger value="video-outreach">Video Outreach</TabsTrigger>
          <TabsTrigger value="activities">Attivita</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Contatto</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactInfoEditor
                lead={{
                  id: lead.id,
                  address: lead.address,
                  phone: lead.phone,
                  phoneVerified: lead.phoneVerified,
                  whatsappNumber: lead.whatsappNumber,
                  whatsappSource: lead.whatsappSource,
                  email: lead.email,
                  website: lead.website,
                  socialUrl: lead.socialUrl,
                  googleMapsUrl: lead.googleMapsUrl,
                  notes: lead.notes,
                }}
              />
            </CardContent>
          </Card>

          {/* Punto di dolore (read-only) */}
          {lead.landingPuntoDolore && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Punto di dolore</p>
                    <p className="text-sm">{lead.landingPuntoDolore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Tracking Section */}
          <VideoTrackingSection
            leadId={lead.id}
            leadName={lead.name}
            videoTrackingToken={lead.videoTrackingToken}
            videoViewsCount={lead.videoViewsCount}
            videoViewedAt={lead.videoViewedAt?.toISOString() ?? null}
            videoYoutubeUrl={lead.videoYoutubeUrl ?? null}
            videoLandingUrl={lead.videoLandingUrl ?? null}
            videoLandingSlug={lead.videoLandingSlug ?? null}
            videoSentAt={lead.videoSentAt?.toISOString() ?? null}
            videoFirstPlayAt={lead.videoFirstPlayAt?.toISOString() ?? null}
            videoMaxWatchPercent={lead.videoMaxWatchPercent ?? null}
            videoCompletedAt={lead.videoCompletedAt?.toISOString() ?? null}
            landingPuntoDolore={lead.landingPuntoDolore ?? null}
          />
        </TabsContent>

        {/* Messaggi Tab */}
        <TabsContent value="messaggi">
          <MessagingHub
            leadId={lead.id}
            leadName={lead.name}
            whatsappNumber={lead.whatsappNumber}
            email={(lead as Record<string, unknown>).email as string | null}
            outreachChannel={lead.outreachChannel}
            landingUrl={lead.videoLandingUrl}
            phone={lead.phone}
            landingPuntoDolore={lead.landingPuntoDolore}
            videoViewsCount={lead.videoViewsCount}
            videoFirstPlayAt={lead.videoFirstPlayAt?.toISOString() ?? null}
            videoMaxWatchPercent={lead.videoMaxWatchPercent ?? null}
            videoCompletedAt={lead.videoCompletedAt?.toISOString() ?? null}
            unsubscribed={lead.unsubscribed}
            activities={lead.activities.map(a => ({
              id: a.id,
              type: a.type,
              notes: a.notes,
              createdAt: a.createdAt.toISOString(),
            }))}
          />
        </TabsContent>

        {/* Video Outreach Tab */}
        <TabsContent value="video-outreach">
          <Card>
            <CardHeader>
              <CardTitle>Video Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoOutreachStepperWrapper leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Storico Attivita</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.activities.length > 0 ? (
                <div className="space-y-4">
                  {lead.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 pb-4 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                          {activity.outcome && (
                            <Badge variant="secondary" className="text-xs">{activity.outcome}</Badge>
                          )}
                        </div>
                        {activity.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nessuna attivita registrata
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
