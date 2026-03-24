import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PIPELINE_STAGES } from "@/types";
import {
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { PipelineStageSelector } from "@/components/leads/pipeline-stage-selector";
import { GeminiAnalysisCard } from "@/components/leads/gemini-analysis-card";
import { AdsInvestigationButton } from "@/components/leads/ads-investigation-button";
import { VideoTrackingSection } from "@/components/leads/video-tracking-section";
import { OutreachSender } from "@/components/leads/outreach-sender";
import { ReadingScriptCard } from "@/components/leads/reading-script-card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { timeAgo } from "@/lib/date-utils";
import { VideoOutreachStepperWrapper } from "@/components/leads/video-outreach-stepper-wrapper";

export const dynamic = "force-dynamic";

interface LeadPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function LeadDetailPage({ params, searchParams }: LeadPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const validTabs = ["info", "analisi-strategica", "video-outreach", "activities"];
  const defaultTab = tab && validTabs.includes(tab) ? tab : "info";
  // Supporta anche vecchi alias
  const resolvedTab = tab === "ai-analysis" || tab === "analisi-ai"
    ? "analisi-strategica"
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Leads", href: "/leads" },
          { label: lead.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/leads">
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
          <TabsTrigger value="analisi-strategica">Analisi Strategica</TabsTrigger>
          <TabsTrigger value="video-outreach">Video Outreach</TabsTrigger>
          <TabsTrigger value="activities">Attivita</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli Contatto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Indirizzo</p>
                    <p className="text-sm text-muted-foreground">{lead.address}</p>
                  </div>
                </div>
              )}

              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Telefono</p>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {(lead.whatsappNumber || lead.phone) && (
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">
                      WhatsApp
                      {lead.whatsappSource === "website" && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 text-green-500 border-green-500/30">
                          dal sito
                        </Badge>
                      )}
                      {lead.whatsappSource === "google_maps" && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 text-yellow-500 border-yellow-500/30">
                          da Google Maps
                        </Badge>
                      )}
                      {!lead.whatsappNumber && lead.phone && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 text-gray-400 border-gray-500/30">
                          da verificare
                        </Badge>
                      )}
                    </p>
                    <a
                      href={`https://wa.me/${lead.whatsappNumber || lead.phone?.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-400 hover:underline flex items-center gap-1"
                    >
                      +{lead.whatsappNumber || lead.phone?.replace(/\D/g, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {lead.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Sito Web</p>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {lead.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {lead.socialUrl && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Profilo Social</p>
                    <a
                      href={lead.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {lead.socialUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {lead.googleMapsUrl && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Google Maps</p>
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Apri su Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {lead.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium text-sm mb-2">Note</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {lead.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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

          {/* Invio Messaggio WA/Email */}
          <OutreachSender
            leadId={lead.id}
            leadName={lead.name}
            whatsappNumber={lead.whatsappNumber}
            email={(lead as Record<string, unknown>).email as string | null}
            outreachChannel={lead.outreachChannel}
            landingUrl={lead.videoLandingUrl}
            phone={lead.phone}
          />
        </TabsContent>

        {/* Analisi Strategica Tab (Teleprompter) */}
        <TabsContent value="analisi-strategica" className="space-y-6">
          <GeminiAnalysisCard
            leadId={lead.id}
            hasWebsite={!!lead.website}
            geminiAnalysis={lead.geminiAnalysis as Parameters<typeof GeminiAnalysisCard>[0]["geminiAnalysis"]}
            geminiAnalyzedAt={lead.geminiAnalyzedAt?.toISOString() ?? null}
            adsCheckedAt={lead.adsCheckedAt?.toISOString() ?? null}
            googleAdsCopy={lead.googleAdsCopy}
            metaAdsCopy={lead.metaAdsCopy}
          />

          {/* Script di Lettura per Video */}
          <ReadingScriptCard
            leadId={lead.id}
            leadName={lead.name}
            hasGeminiAnalysis={!!lead.geminiAnalyzedAt}
            existingScript={
              (lead.geminiAnalysis as Record<string, unknown>)?.readingScript as string | null ?? null
            }
          />

          {lead.website && (
            <AdsInvestigationButton
              leadId={lead.id}
              leadName={lead.name}
              website={lead.website}
              hasActiveGoogleAds={lead.hasActiveGoogleAds}
              hasActiveMetaAds={lead.hasActiveMetaAds}
              adsCheckedAt={lead.adsCheckedAt?.toISOString() ?? null}
              adsCoherenceWarning={lead.adsCoherenceWarning}
              googleAdsCopy={lead.googleAdsCopy}
              metaAdsCopy={lead.metaAdsCopy}
              auditHasGoogleAdsTag={!!(lead.auditData as Record<string, unknown>)?.tracking && !!((lead.auditData as Record<string, Record<string, unknown>>)?.tracking?.hasGoogleAdsTag)}
              auditHasFacebookPixel={!!(lead.auditData as Record<string, unknown>)?.tracking && !!((lead.auditData as Record<string, Record<string, unknown>>)?.tracking?.hasFacebookPixel)}
            />
          )}
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
