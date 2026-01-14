import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PIPELINE_STAGES, AUDIT_STATUSES, getScoreCategory, type AuditData } from "@/types";
import {
  ArrowLeft,
  Phone,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Clock,
} from "lucide-react";

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

  const scoreInfo = getScoreCategory(lead.opportunityScore);
  const stageInfo = PIPELINE_STAGES[lead.pipelineStage as keyof typeof PIPELINE_STAGES];
  const auditInfo = AUDIT_STATUSES[lead.auditStatus as keyof typeof AUDIT_STATUSES];
  const auditData = lead.auditData as AuditData | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          {lead.category && (
            <p className="text-muted-foreground">{lead.category}</p>
          )}
        </div>
        <Badge
          variant={
            scoreInfo.color === "red"
              ? "destructive"
              : scoreInfo.color === "green"
              ? "default"
              : "secondary"
          }
          className="text-lg px-4 py-1"
        >
          Score: {lead.opportunityScore ?? "N/A"}
        </Badge>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{stageInfo.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Stage Pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
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
            </div>
            <p className="text-sm text-muted-foreground mt-1">Stato Audit</p>
          </CardContent>
        </Card>

        {lead.googleRating && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{Number(lead.googleRating).toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({lead.googleReviewsCount} recensioni)
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Google Rating</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {lead.lastContactedAt
                  ? new Date(lead.lastContactedAt).toLocaleDateString("it-IT")
                  : "Mai"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Ultimo Contatto</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
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
                    <p className="font-medium">Indirizzo</p>
                    <p className="text-muted-foreground">{lead.address}</p>
                  </div>
                </div>
              )}

              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Telefono</p>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-blue-600 hover:underline"
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
                    <p className="font-medium">Sito Web</p>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
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
                    <p className="font-medium">Google Maps</p>
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
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
                    <p className="font-medium mb-2">Note</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {lead.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          {auditData ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Website Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Sito</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Performance</span>
                    <Badge
                      variant={
                        auditData.website.performance >= 70
                          ? "default"
                          : "destructive"
                      }
                    >
                      {auditData.website.performance}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Tempo caricamento</span>
                    <span>{auditData.website.loadTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile friendly</span>
                    <Badge variant={auditData.website.mobile ? "default" : "destructive"}>
                      {auditData.website.mobile ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>HTTPS</span>
                    <Badge variant={auditData.website.https ? "default" : "destructive"}>
                      {auditData.website.https ? "Si" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Meta Title</span>
                    <Badge variant={auditData.seo.hasMetaTitle ? "default" : "destructive"}>
                      {auditData.seo.hasMetaTitle ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Meta Description</span>
                    <Badge variant={auditData.seo.hasMetaDescription ? "default" : "destructive"}>
                      {auditData.seo.hasMetaDescription ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sitemap</span>
                    <Badge variant={auditData.seo.hasSitemap ? "default" : "destructive"}>
                      {auditData.seo.hasSitemap ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Schema Markup</span>
                    <Badge variant={auditData.seo.hasSchemaMarkup ? "default" : "destructive"}>
                      {auditData.seo.hasSchemaMarkup ? "Si" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle>Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Google Analytics</span>
                    <Badge
                      variant={
                        auditData.tracking.hasGA4 || auditData.tracking.hasGoogleAnalytics
                          ? "default"
                          : "destructive"
                      }
                    >
                      {auditData.tracking.hasGA4 ? "GA4" : auditData.tracking.hasGoogleAnalytics ? "UA" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Facebook Pixel</span>
                    <Badge variant={auditData.tracking.hasFacebookPixel ? "default" : "destructive"}>
                      {auditData.tracking.hasFacebookPixel ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Google Ads</span>
                    <Badge variant={auditData.tracking.hasGoogleAdsTag ? "default" : "destructive"}>
                      {auditData.tracking.hasGoogleAdsTag ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>GTM</span>
                    <Badge variant={auditData.tracking.hasGTM ? "default" : "destructive"}>
                      {auditData.tracking.hasGTM ? "Si" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Trust & Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle>Trust & Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cookie Banner</span>
                    <Badge variant={auditData.trust.hasCookieBanner ? "default" : "destructive"}>
                      {auditData.trust.hasCookieBanner ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Privacy Policy</span>
                    <Badge variant={auditData.trust.hasPrivacyPolicy ? "default" : "destructive"}>
                      {auditData.trust.hasPrivacyPolicy ? "Si" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Form Contatto</span>
                    <Badge variant={auditData.website.hasContactForm ? "default" : "destructive"}>
                      {auditData.website.hasContactForm ? "Si" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {lead.auditStatus === "PENDING"
                    ? "Audit non ancora eseguito"
                    : lead.auditStatus === "RUNNING"
                    ? "Audit in corso..."
                    : lead.auditStatus === "NO_WEBSITE"
                    ? "Nessun sito web da analizzare"
                    : "Audit non disponibile"}
                </p>
                {lead.website && lead.auditStatus === "PENDING" && (
                  <Button className="mt-4">Avvia Audit</Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Talking Points Tab */}
        <TabsContent value="talking-points">
          {lead.talkingPoints && lead.talkingPoints.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Talking Points per la Chiamata</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {lead.talkingPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
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
                          <Badge variant="outline">{activity.type}</Badge>
                          {activity.outcome && (
                            <Badge variant="secondary">{activity.outcome}</Badge>
                          )}
                        </div>
                        {activity.notes && (
                          <p className="mt-2 text-muted-foreground">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
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
