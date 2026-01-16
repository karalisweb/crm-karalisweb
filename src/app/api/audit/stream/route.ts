import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Import singoli moduli audit per eseguirli step by step
import { checkSEO } from "@/lib/audit/seo-checker";
import { checkBlog } from "@/lib/audit/blog-detector";
import { detectTracking } from "@/lib/audit/tracking-detector";
import { detectSocialLinks } from "@/lib/audit/social-detector";
import { checkTrust } from "@/lib/audit/trust-checker";
import { detectEmailMarketing } from "@/lib/audit/email-detector";
import { detectTech } from "@/lib/audit/tech-detector";
import { runPageSpeedAnalysis, isPageSpeedConfigured } from "@/lib/audit/pagespeed";
import { calculateOpportunityScore } from "@/lib/audit/score-calculator";
import { generateTalkingPoints, flattenTalkingPoints } from "@/lib/audit/talking-points";

/**
 * GET /api/audit/stream?leadId=xxx
 * Esegue audit con Server-Sent Events per mostrare progresso in tempo reale
 */
export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("leadId");

  if (!leadId) {
    return new Response("leadId is required", { status: 400 });
  }

  // Trova il lead
  const lead = await db.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return new Response("Lead not found", { status: 404 });
  }

  if (!lead.website) {
    return new Response("Lead has no website", { status: 400 });
  }

  const website = lead.website;

  // Crea stream per Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (step: string, status: "running" | "done" | "error", data?: Record<string, unknown>) => {
        const event = JSON.stringify({ step, status, data, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      };

      try {
        // Aggiorna stato a RUNNING
        await db.lead.update({
          where: { id: leadId },
          data: { auditStatus: "RUNNING" },
        });

        sendEvent("init", "running", { website, message: "Avvio audit..." });

        // Step 1: Fetch HTML
        sendEvent("fetch", "running", { message: "Scaricamento pagina web..." });

        let html: string;
        let url = website;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; SalesAuditBot/1.0)",
            },
          });
          html = await response.text();
          sendEvent("fetch", "done", { message: "Pagina scaricata", size: html.length });
        } catch (fetchError) {
          sendEvent("fetch", "error", { message: "Errore download pagina" });
          throw fetchError;
        }

        const baseUrl = new URL(url).origin;

        // Step 2: SEO Check
        sendEvent("seo", "running", { message: "Analisi SEO..." });
        const seoResult = await checkSEO(html, baseUrl);
        sendEvent("seo", "done", {
          message: "SEO completato",
          metaTitle: seoResult.hasMetaTitle ? "✓" : "✗",
          metaDescription: seoResult.hasMetaDescription ? "✓" : "✗",
          h1: seoResult.hasH1 ? "✓" : "✗",
          sitemap: seoResult.hasSitemap ? "✓" : "✗",
          schemaMarkup: seoResult.hasSchemaMarkup ? "✓" : "✗",
        });

        // Step 3: Blog Check
        sendEvent("blog", "running", { message: "Ricerca blog..." });
        const blogResult = await checkBlog(html, baseUrl);
        sendEvent("blog", "done", {
          message: blogResult.hasBlog ? "Blog trovato" : "Nessun blog",
          hasBlog: blogResult.hasBlog,
          daysSinceLastPost: blogResult.daysSinceLastPost,
        });

        // Step 4: Tracking
        sendEvent("tracking", "running", { message: "Rilevamento tracking..." });
        const trackingResult = detectTracking(html);
        sendEvent("tracking", "done", {
          message: "Tracking completato",
          googleAnalytics: trackingResult.hasGoogleAnalytics || trackingResult.hasGA4 ? "✓" : "✗",
          gtm: trackingResult.hasGTM ? "✓" : "✗",
          facebookPixel: trackingResult.hasFacebookPixel ? "✓" : "✗",
          googleAds: trackingResult.hasGoogleAdsTag ? "✓" : "✗",
        });

        // Step 5: Social
        sendEvent("social", "running", { message: "Ricerca link social..." });
        const socialResult = detectSocialLinks(html);
        sendEvent("social", "done", {
          message: "Social completato",
          facebook: socialResult.facebook.linkedFromSite ? "✓" : "✗",
          instagram: socialResult.instagram.linkedFromSite ? "✓" : "✗",
          linkedin: socialResult.linkedin.linkedFromSite ? "✓" : "✗",
        });

        // Step 6: Trust
        sendEvent("trust", "running", { message: "Verifica trust & compliance..." });
        const trustResult = checkTrust(html);
        sendEvent("trust", "done", {
          message: "Trust completato",
          cookieBanner: trustResult.hasCookieBanner ? "✓" : "✗",
          privacyPolicy: trustResult.hasPrivacyPolicy ? "✓" : "✗",
          contactForm: trustResult.hasContactForm ? "✓" : "✗",
        });

        // Step 7: Email Marketing
        sendEvent("email", "running", { message: "Analisi email marketing..." });
        const emailResult = detectEmailMarketing(html);
        sendEvent("email", "done", {
          message: "Email marketing completato",
          newsletter: emailResult.hasNewsletterForm ? "✓" : "✗",
          popup: emailResult.hasPopup ? "✓" : "✗",
        });

        // Step 8: Tech Stack
        sendEvent("tech", "running", { message: "Rilevamento tecnologie..." });
        const techResult = detectTech(html);
        sendEvent("tech", "done", {
          message: techResult.cms ? `CMS: ${techResult.cms}` : "Tech completato",
          cms: techResult.cms,
          stack: techResult.stack,
        });

        // Step 9: PageSpeed (se configurato)
        let pageSpeedResult = null;
        if (isPageSpeedConfigured()) {
          sendEvent("pagespeed", "running", { message: "Analisi PageSpeed (può richiedere 30-60s)..." });
          pageSpeedResult = await runPageSpeedAnalysis(url, "mobile");
          if (pageSpeedResult) {
            sendEvent("pagespeed", "done", {
              message: "PageSpeed completato",
              performance: pageSpeedResult.performance,
              lcp: `${(pageSpeedResult.largestContentfulPaint / 1000).toFixed(1)}s`,
              cls: pageSpeedResult.cumulativeLayoutShift.toFixed(2),
            });
          } else {
            sendEvent("pagespeed", "done", { message: "PageSpeed non disponibile" });
          }
        } else {
          sendEvent("pagespeed", "done", { message: "PageSpeed API non configurata (usando valori default)" });
        }

        // Step 10: Calcolo score
        sendEvent("score", "running", { message: "Calcolo opportunity score..." });

        // Costruisci audit data
        const websiteAudit = {
          performance: pageSpeedResult?.performance ?? 50,
          accessibility: pageSpeedResult?.accessibility ?? 50,
          bestPractices: pageSpeedResult?.bestPractices ?? 50,
          seoScore: pageSpeedResult?.seo ?? 50,
          loadTime: pageSpeedResult?.loadTime ?? 3.0,
          mobile: pageSpeedResult?.mobile ?? true,
          https: url.startsWith("https://"),
          hasContactForm: trustResult.hasContactForm,
          hasWhatsApp: trustResult.hasWhatsApp,
          hasLiveChat: trustResult.hasLiveChat,
        };

        const seoAudit = {
          hasMetaTitle: seoResult.hasMetaTitle ?? false,
          metaTitle: seoResult.metaTitle ?? null,
          metaTitleLength: seoResult.metaTitleLength ?? 0,
          hasMetaDescription: seoResult.hasMetaDescription ?? false,
          metaDescription: seoResult.metaDescription ?? null,
          metaDescriptionLength: seoResult.metaDescriptionLength ?? 0,
          hasH1: seoResult.hasH1 ?? false,
          h1Count: seoResult.h1Count ?? 0,
          h1Text: seoResult.h1Text ?? [],
          hasSitemap: seoResult.hasSitemap ?? false,
          hasRobotsTxt: seoResult.hasRobotsTxt ?? false,
          hasSchemaMarkup: seoResult.hasSchemaMarkup ?? false,
          hasCanonical: seoResult.hasCanonical ?? false,
          canonicalUrl: seoResult.canonicalUrl ?? null,
          hasOpenGraph: seoResult.hasOpenGraph ?? false,
          openGraph: seoResult.openGraph ?? {},
          imagesWithoutAlt: seoResult.imagesWithoutAlt ?? 0,
          totalImages: seoResult.totalImages ?? 0,
          coreWebVitals: {
            lcp: pageSpeedResult?.largestContentfulPaint ?? 2500,
            fid: pageSpeedResult?.totalBlockingTime ?? 100,
            cls: pageSpeedResult?.cumulativeLayoutShift ?? 0.1,
          },
        };

        // Genera issues prima di costruire auditData
        const issues: string[] = [];
        if (!seoResult.hasMetaTitle) issues.push("Manca meta title");
        if (!seoResult.hasMetaDescription) issues.push("Manca meta description");
        if (!seoResult.hasH1) issues.push("Manca H1");
        if (!trackingResult.hasGoogleAnalytics && !trackingResult.hasGA4) issues.push("Manca Google Analytics");
        if (!trackingResult.hasFacebookPixel) issues.push("Manca Facebook Pixel");
        if (!trustResult.hasCookieBanner) issues.push("Manca cookie banner GDPR");
        if (blogResult.hasBlog && blogResult.daysSinceLastPost && blogResult.daysSinceLastPost > 180) {
          issues.push(`Blog fermo da ${Math.floor(blogResult.daysSinceLastPost / 30)} mesi`);
        }

        const auditData = {
          website: websiteAudit,
          seo: seoAudit,
          tracking: trackingResult,
          social: socialResult,
          googleBusiness: {
            rating: lead.googleRating ? Number(lead.googleRating) : null,
            reviewsCount: lead.googleReviewsCount,
            hasPhotos: false,
            photosCount: 0,
          },
          content: blogResult,
          emailMarketing: emailResult,
          trust: trustResult,
          tech: techResult,
          issues,
        };

        const opportunityScore = calculateOpportunityScore(auditData);
        const talkingPointsByService = generateTalkingPoints(auditData);
        const talkingPoints = flattenTalkingPoints(talkingPointsByService);

        sendEvent("score", "done", {
          message: `Score: ${opportunityScore}/100`,
          score: opportunityScore,
          issuesCount: issues.length,
        });

        // Step 11: Salvataggio
        sendEvent("save", "running", { message: "Salvataggio risultati..." });

        await db.lead.update({
          where: { id: leadId },
          data: {
            auditStatus: "COMPLETED",
            auditCompletedAt: new Date(),
            opportunityScore,
            auditData: auditData as unknown as Prisma.InputJsonValue,
            talkingPoints,
          },
        });

        sendEvent("save", "done", { message: "Audit completato!" });

        // Evento finale
        sendEvent("complete", "done", {
          message: "Audit completato con successo",
          score: opportunityScore,
          issues,
          talkingPointsCount: talkingPoints.length,
        });

      } catch (error) {
        console.error("Audit stream error:", error);

        // Aggiorna stato a FAILED
        await db.lead.update({
          where: { id: leadId },
          data: {
            auditStatus: "FAILED",
            auditData: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          },
        });

        sendEvent("error", "error", {
          message: error instanceof Error ? error.message : "Errore sconosciuto",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
