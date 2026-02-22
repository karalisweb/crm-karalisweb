import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PIPELINE_STAGES, AUDIT_STATUSES, type AuditData } from "@/types";
import {
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { AuditButton } from "@/components/leads/audit-button";
import { PipelineStageSelector } from "@/components/leads/pipeline-stage-selector";
import { ScoreRing } from "@/components/leads/score-ring";
import { AuditCheck } from "@/components/leads/audit-check";
import { AuditRadar } from "@/components/leads/audit-radar";
import { TalkingPointsGrouped } from "@/components/leads/talking-points-grouped";
import { AuditPdfButton } from "@/components/leads/audit-pdf-button";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { timeAgo } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

interface LeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadPageProps) {
  const { id } = await params;

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
  const auditInfo = AUDIT_STATUSES[lead.auditStatus as keyof typeof AUDIT_STATUSES];
  const auditData = lead.auditData as AuditData | null;

  // Critical issues for alert
  const criticalIssues: string[] = [];
  if (auditData) {
    if (auditData.website && (auditData.website.performance ?? 100) < 40)
      criticalIssues.push("Performance sito critica (<40/100)");
    if (auditData.website && auditData.website.https === false)
      criticalIssues.push("Sito senza HTTPS - mostra 'Non sicuro'");
    if (
      auditData.tracking &&
      !auditData.tracking.hasGA4 &&
      !auditData.tracking.hasGoogleAnalytics
    )
      criticalIssues.push("Nessun Google Analytics installato");
    if (auditData.trust && !auditData.trust.hasPrivacyPolicy)
      criticalIssues.push("Privacy policy mancante");
    if (auditData.trust && !auditData.trust.hasCookieBanner)
      criticalIssues.push("Cookie banner GDPR mancante");
  }

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

      {/* Header with Score Ring */}
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
        <ScoreRing score={lead.opportunityScore} size={90} strokeWidth={6} />
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

        <Card>
          <CardContent className="pt-5 pb-4">
            <Badge
              variant={
                auditInfo.color === "green"
                  ? "default"
                  : auditInfo.color === "red"
                  ? "destructive"
                  : "secondary"
              }
            >
              {auditInfo.label}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Stato Audit</p>
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
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informazioni</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="talking-points">Talking Points</TabsTrigger>
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
        </TabsContent>

        {/* Audit Tab - Visual Overhaul */}
        <TabsContent value="audit">
          {auditData && auditData.website && auditData.seo && auditData.tracking && auditData.trust ? (
            <div className="space-y-4">
              {/* Critical Issues Alert */}
              {criticalIssues.length > 0 && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">
                        {criticalIssues.length} problemi critici
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {criticalIssues.map((issue, i) => (
                        <li key={i} className="text-xs text-red-300/80 flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* PDF Download */}
              <div className="flex justify-end">
                <AuditPdfButton
                  leadName={lead.name}
                  website={lead.website}
                  opportunityScore={lead.opportunityScore}
                  auditData={auditData}
                  talkingPoints={lead.talkingPoints || []}
                />
              </div>

              {/* Radar Chart + Performance */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Panoramica Audit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AuditRadar auditData={auditData} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Performance Sito</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <AuditCheck label="Performance" value={auditData.website.performance ?? 0} type="score" />
                    <AuditCheck label="Tempo caricamento" value={auditData.website.loadTime ?? 0} type="time" suffix="s" goodThreshold={3} warnThreshold={5} />
                    <AuditCheck label="Mobile friendly" value={auditData.website.mobile} />
                    <AuditCheck label="HTTPS" value={auditData.website.https} />
                    <AuditCheck label="Form contatto" value={auditData.website.hasContactForm} />
                    <AuditCheck label="WhatsApp" value={auditData.website.hasWhatsApp} />
                  </CardContent>
                </Card>
              </div>

              {/* SEO + Tracking + CWV + Trust */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">SEO</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <AuditCheck label="Meta Title" value={auditData.seo.hasMetaTitle} />
                    <AuditCheck label="Meta Description" value={auditData.seo.hasMetaDescription} />
                    <AuditCheck label="H1" value={auditData.seo.hasH1} />
                    <AuditCheck label="Sitemap" value={auditData.seo.hasSitemap} />
                    <AuditCheck label="Schema Markup" value={auditData.seo.hasSchemaMarkup} />
                    <AuditCheck label="Canonical" value={auditData.seo.hasCanonical} />
                    <AuditCheck label="Open Graph" value={auditData.seo.hasOpenGraph} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tracking & Ads</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <AuditCheck label="Google Analytics" value={auditData.tracking.hasGA4 || auditData.tracking.hasGoogleAnalytics} />
                    <AuditCheck label="Google Tag Manager" value={auditData.tracking.hasGTM} />
                    <AuditCheck label="Facebook Pixel" value={auditData.tracking.hasFacebookPixel} />
                    <AuditCheck label="Google Ads" value={auditData.tracking.hasGoogleAdsTag} />
                    <AuditCheck label="Hotjar/Clarity" value={auditData.tracking.hasHotjar || auditData.tracking.hasClarity} />
                  </CardContent>
                </Card>

                {auditData.seo.coreWebVitals && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Core Web Vitals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <AuditCheck label="LCP" value={(auditData.seo.coreWebVitals.lcp ?? 0) / 1000} type="time" suffix="s" goodThreshold={2.5} warnThreshold={4} />
                      <AuditCheck label="FID/TBT" value={auditData.seo.coreWebVitals.fid ?? 0} type="time" suffix="ms" goodThreshold={100} warnThreshold={300} />
                      <AuditCheck label="CLS" value={auditData.seo.coreWebVitals.cls ?? 0} type="time" suffix="" goodThreshold={0.1} warnThreshold={0.25} />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Trust & Compliance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <AuditCheck label="Cookie Banner" value={auditData.trust.hasCookieBanner} />
                    <AuditCheck label="Privacy Policy" value={auditData.trust.hasPrivacyPolicy} />
                    <AuditCheck label="Termini" value={auditData.trust.hasTerms} />
                    <AuditCheck label="Testimonianze" value={auditData.trust.hasTestimonials} />
                    <AuditCheck label="Trust Badges" value={auditData.trust.hasTrustBadges} />
                  </CardContent>
                </Card>
              </div>

              {/* Re-run audit */}
              {lead.website && (
                <div className="flex justify-center pt-2">
                  <AuditButton leadId={lead.id} auditStatus={lead.auditStatus} />
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  {lead.auditStatus === "PENDING"
                    ? "Audit non ancora eseguito"
                    : lead.auditStatus === "RUNNING"
                    ? "Audit in corso..."
                    : lead.auditStatus === "NO_WEBSITE"
                    ? "Nessun sito web da analizzare"
                    : "Audit non disponibile"}
                </p>
                {lead.website && (lead.auditStatus === "PENDING" || lead.auditStatus === "FAILED" || lead.auditStatus === "RUNNING") && (
                  <AuditButton leadId={lead.id} auditStatus={lead.auditStatus} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Talking Points - Grouped by Service */}
        <TabsContent value="talking-points">
          {auditData && auditData.website && auditData.seo && auditData.tracking ? (
            <TalkingPointsGrouped
              auditData={auditData}
              opportunityScore={lead.opportunityScore}
            />
          ) : lead.talkingPoints && lead.talkingPoints.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Talking Points per la Chiamata</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {lead.talkingPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nessun talking point disponibile. Esegui l&#39;audit per generarli.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activities Tab with timeAgo */}
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
