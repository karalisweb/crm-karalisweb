"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Search,
  Megaphone,
  Instagram,
  Share2,
  MapPin,
  FileText,
  Mail,
  Shield,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import type { AuditData } from "@/types";

interface ServiceCategory {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  points: string[];
}

function generateGroupedPoints(audit: AuditData): ServiceCategory[] {
  const categories: ServiceCategory[] = [];

  // Web Design
  const webDesign: string[] = [];
  if (audit.website) {
    if ((audit.website.performance ?? 100) < 50) {
      webDesign.push(
        `Il sito ha un performance score di ${audit.website.performance}/100 - molto lento, perde visitatori`
      );
    }
    if (audit.website.mobile === false) {
      webDesign.push(
        "Il sito non e ottimizzato per mobile - il 60% del traffico oggi e da smartphone"
      );
    }
    if (audit.website.https === false) {
      webDesign.push(
        'Il sito mostra "Non sicuro" su Chrome - spaventa i clienti e penalizza il ranking'
      );
    }
    if (!audit.website.hasContactForm) {
      webDesign.push("Nessun form di contatto - i clienti non possono contattarvi facilmente");
    }
    if (!audit.website.hasWhatsApp && !audit.website.hasLiveChat) {
      webDesign.push("Nessun canale di contatto immediato (WhatsApp, chat)");
    }
  }
  if (webDesign.length > 0) {
    categories.push({
      key: "webDesign",
      label: "Web Design",
      icon: Palette,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      points: webDesign,
    });
  }

  // SEO
  const seo: string[] = [];
  if (audit.seo) {
    if (!audit.seo.hasMetaTitle) {
      seo.push("Manca il meta title - Google non sa di cosa parla il sito");
    }
    if (!audit.seo.hasMetaDescription) {
      seo.push("Manca la meta description - nei risultati Google appare testo casuale");
    }
    if (!audit.seo.hasH1) {
      seo.push("Manca il tag H1 - la struttura della pagina confonde i motori di ricerca");
    }
    if (!audit.seo.hasSitemap) {
      seo.push("Nessuna sitemap.xml - Google non indicizza tutte le pagine");
    }
    if (!audit.seo.hasSchemaMarkup) {
      seo.push("Nessuno schema markup - non appare con rich snippet nei risultati");
    }
    if (audit.seo.coreWebVitals && (audit.seo.coreWebVitals.lcp ?? 0) > 4000) {
      seo.push("Core Web Vitals critici - Google penalizza nel ranking");
    }
    if (!audit.seo.hasCanonical) {
      seo.push("Manca canonical URL - rischio contenuti duplicati");
    }
    if ((audit.seo.imagesWithoutAlt ?? 0) > 5) {
      seo.push(`${audit.seo.imagesWithoutAlt} immagini senza alt text - non vengono indicizzate`);
    }
  }
  if (seo.length > 0) {
    categories.push({
      key: "seo",
      label: "SEO",
      icon: Search,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      points: seo,
    });
  }

  // Google Ads
  const googleAds: string[] = [];
  if (audit.tracking) {
    if (!audit.tracking.hasGA4 && !audit.tracking.hasGoogleAnalytics) {
      googleAds.push("Nessun Google Analytics - non sapete quanti visitatori avete");
    }
    if (!audit.tracking.hasGoogleAdsTag) {
      googleAds.push("Nessun tracking Google Ads - se fate campagne, non sapete quali convertono");
    }
    if (!audit.tracking.hasGTM) {
      googleAds.push("Nessun Google Tag Manager - gestione tag inefficiente");
    }
  }
  if (googleAds.length > 0) {
    categories.push({
      key: "googleAds",
      label: "Google Ads",
      icon: Megaphone,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      points: googleAds,
    });
  }

  // Meta Ads
  const metaAds: string[] = [];
  if (audit.tracking) {
    if (!audit.tracking.hasFacebookPixel) {
      metaAds.push("Nessun Facebook Pixel - non potete fare remarketing ne tracciare conversioni da Meta");
    }
  }
  if (metaAds.length > 0) {
    categories.push({
      key: "metaAds",
      label: "Meta Ads",
      icon: Instagram,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      points: metaAds,
    });
  }

  // Social Media
  const socialMedia: string[] = [];
  if (audit.social) {
    if (!audit.social.facebook?.linkedFromSite) {
      socialMedia.push("Facebook non collegato al sito - perdete traffico social");
    }
    if (!audit.social.instagram?.linkedFromSite) {
      socialMedia.push("Instagram non collegato al sito");
    }
    if (!audit.social.linkedin?.linkedFromSite) {
      socialMedia.push("LinkedIn non collegato - perdete opportunita B2B");
    }
    if (!audit.social.youtube?.linkedFromSite) {
      socialMedia.push("Nessun canale YouTube collegato");
    }
  }
  if (socialMedia.length > 0) {
    categories.push({
      key: "socialMedia",
      label: "Social Media",
      icon: Share2,
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      points: socialMedia,
    });
  }

  // Local Marketing
  const localMarketing: string[] = [];
  if (audit.googleBusiness) {
    if ((audit.googleBusiness.reviewsCount ?? 0) < 20) {
      localMarketing.push(
        `Solo ${audit.googleBusiness.reviewsCount || 0} recensioni Google - i competitor ne hanno molte di piu`
      );
    }
    if ((audit.googleBusiness.rating ?? 5) < 4.0) {
      localMarketing.push(
        `Rating ${audit.googleBusiness.rating} stelle - sotto la soglia psicologica di 4.0`
      );
    }
  }
  if (localMarketing.length > 0) {
    categories.push({
      key: "localMarketing",
      label: "Local Marketing",
      icon: MapPin,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      points: localMarketing,
    });
  }

  // Content Marketing
  const contentMarketing: string[] = [];
  if (audit.content) {
    if (!audit.content.hasBlog) {
      contentMarketing.push("Nessun blog - perdete traffico SEO ogni giorno");
    } else if ((audit.content.daysSinceLastPost ?? 0) > 180) {
      contentMarketing.push(
        `Blog fermo da ${Math.floor((audit.content.daysSinceLastPost || 0) / 30)} mesi - perdete posizionamento`
      );
    } else if ((audit.content.daysSinceLastPost ?? 0) > 90) {
      contentMarketing.push(
        `Blog poco aggiornato - ultimo post ${Math.floor((audit.content.daysSinceLastPost || 0) / 30)} mesi fa`
      );
    }
  }
  if (contentMarketing.length > 0) {
    categories.push({
      key: "contentMarketing",
      label: "Content",
      icon: FileText,
      color: "text-teal-400",
      bgColor: "bg-teal-500/10",
      points: contentMarketing,
    });
  }

  // Email Marketing
  const emailMarketing: string[] = [];
  if (audit.emailMarketing) {
    if (!audit.emailMarketing.hasNewsletterForm) {
      emailMarketing.push("Nessun form newsletter - ogni visitatore che se ne va e un contatto perso");
    }
    if (!audit.emailMarketing.hasLeadMagnet) {
      emailMarketing.push("Nessun lead magnet - nessun incentivo all'iscrizione");
    }
  }
  if (emailMarketing.length > 0) {
    categories.push({
      key: "emailMarketing",
      label: "Email Marketing",
      icon: Mail,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      points: emailMarketing,
    });
  }

  // Compliance
  const compliance: string[] = [];
  if (audit.trust) {
    if (!audit.trust.hasCookieBanner) {
      compliance.push("Manca cookie banner GDPR - rischiate sanzioni");
    }
    if (!audit.trust.hasPrivacyPolicy) {
      compliance.push("Privacy policy mancante o non raggiungibile");
    }
    if (!audit.trust.hasTerms) {
      compliance.push("Mancano i termini e condizioni");
    }
  }
  if (compliance.length > 0) {
    categories.push({
      key: "compliance",
      label: "Compliance",
      icon: Shield,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      points: compliance,
    });
  }

  return categories;
}

function generateOpeningHook(audit: AuditData, score: number | null): string {
  const problems: string[] = [];

  if (audit.website && (audit.website.performance ?? 100) < 50) {
    problems.push(`il sito carica lentamente (performance ${audit.website.performance}/100)`);
  }
  if (audit.tracking && !audit.tracking.hasGA4 && !audit.tracking.hasGoogleAnalytics) {
    problems.push("non ha analytics installato");
  }
  if (audit.trust && !audit.trust.hasCookieBanner) {
    problems.push("manca il cookie banner GDPR");
  }
  if (audit.seo && !audit.seo.hasMetaDescription) {
    problems.push("manca la meta description");
  }

  const totalIssues = problems.length;
  const topIssue = problems[0] || "diversi margini di miglioramento";

  return `"Buongiorno, sono [Nome] di [Agenzia]. Ho fatto un'analisi gratuita del vostro sito e ho trovato ${totalIssues > 0 ? totalIssues + " aree" : "diverse aree"} di miglioramento. La piu urgente: ${topIssue}. Ha 10 minuti per vedere il report insieme?"`;
}

interface TalkingPointsGroupedProps {
  auditData: AuditData;
  opportunityScore: number | null;
}

export function TalkingPointsGrouped({
  auditData,
  opportunityScore,
}: TalkingPointsGroupedProps) {
  const categories = generateGroupedPoints(auditData);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const openingHook = generateOpeningHook(auditData, opportunityScore);
  const totalProblems = categories.reduce((sum, cat) => sum + cat.points.length, 0);

  const toggleCategory = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Nessun talking point disponibile. Esegui l'audit per generarli.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Opening Hook */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1 text-primary">
                Suggerimento apertura chiamata
              </p>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                {openingHook}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-3 px-1">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {totalProblems} problemi trovati in {categories.length} aree
        </span>
      </div>

      {/* Categories Accordion */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isOpen = expanded[cat.key] ?? true; // default open

          return (
            <Card key={cat.key}>
              <button
                onClick={() => toggleCategory(cat.key)}
                className="w-full text-left"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cat.bgColor} shrink-0`}>
                      <Icon className={`h-4 w-4 ${cat.color}`} />
                    </div>
                    <CardTitle className="text-sm font-medium flex-1">
                      {cat.label}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {cat.points.length}
                    </Badge>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {isOpen && (
                <CardContent className="pt-0 px-4 pb-4">
                  <ul className="space-y-2.5">
                    {cat.points.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${cat.color.replace("text-", "bg-")}`} />
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
