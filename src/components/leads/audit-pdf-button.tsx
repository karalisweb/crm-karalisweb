"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AuditData } from "@/types";

interface AuditPdfButtonProps {
  leadName: string;
  website: string | null;
  opportunityScore: number | null;
  auditData: AuditData;
  talkingPoints: string[];
}

function calcSeoScore(seo: AuditData["seo"]): number {
  if (!seo) return 0;
  const checks = [
    seo.hasMetaTitle,
    seo.hasMetaDescription,
    seo.hasH1,
    seo.hasSitemap,
    seo.hasRobotsTxt,
    seo.hasSchemaMarkup,
    seo.hasCanonical,
    seo.hasOpenGraph,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcTrackingScore(tracking: AuditData["tracking"]): number {
  if (!tracking) return 0;
  const checks = [
    tracking.hasGA4 || tracking.hasGoogleAnalytics,
    tracking.hasGTM,
    tracking.hasFacebookPixel,
    tracking.hasGoogleAdsTag,
    tracking.hasHotjar || tracking.hasClarity,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcSocialScore(social: AuditData["social"]): number {
  if (!social) return 0;
  const platforms = [
    social.facebook?.linkedFromSite,
    social.instagram?.linkedFromSite,
    social.linkedin?.linkedFromSite,
    social.youtube?.linkedFromSite,
    social.tiktok?.linkedFromSite,
    social.twitter?.linkedFromSite,
  ];
  return Math.round((platforms.filter(Boolean).length / platforms.length) * 100);
}

function calcTrustScore(trust: AuditData["trust"], website: AuditData["website"]): number {
  if (!trust) return 0;
  const checks = [
    trust.hasCookieBanner,
    trust.hasPrivacyPolicy,
    trust.hasTerms,
    trust.hasTestimonials,
    website?.hasContactForm,
    website?.https,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcContentScore(content: AuditData["content"]): number {
  if (!content) return 0;
  if (!content.hasBlog) return 0;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 30) return 100;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 90) return 60;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 180) return 30;
  return 10;
}

export function AuditPdfButton({
  leadName,
  website,
  opportunityScore,
  auditData,
  talkingPoints,
}: AuditPdfButtonProps) {
  const [generating, setGenerating] = useState(false);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const gold = [212, 167, 38] as [number, number, number];
      const dark = [13, 21, 33] as [number, number, number];
      const gray = [113, 113, 122] as [number, number, number];
      const white = [255, 255, 255] as [number, number, number];

      // --- Header ---
      doc.setFillColor(...dark);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(...gold);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("AUDIT REPORT", margin, 18);

      doc.setTextColor(...white);
      doc.setFontSize(14);
      doc.text(leadName, margin, 28);

      if (website) {
        doc.setFontSize(9);
        doc.setTextColor(160, 160, 170);
        doc.text(website, margin, 35);
      }

      doc.setFontSize(9);
      doc.setTextColor(160, 160, 170);
      doc.text(
        `Generato il ${new Date().toLocaleDateString("it-IT")}`,
        pageWidth - margin,
        35,
        { align: "right" }
      );

      y = 55;

      // --- Score ---
      const scoreColor: [number, number, number] =
        (opportunityScore ?? 0) >= 80
          ? [239, 68, 68]
          : (opportunityScore ?? 0) >= 60
          ? [245, 158, 11]
          : (opportunityScore ?? 0) >= 40
          ? [34, 197, 94]
          : [59, 130, 246];

      doc.setFillColor(245, 245, 247);
      doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");

      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.text("Opportunity Score", margin + 8, y + 9);

      doc.setFontSize(24);
      doc.setTextColor(...scoreColor);
      doc.text(
        `${opportunityScore ?? "N/A"}/100`,
        pageWidth - margin - 8,
        y + 15,
        { align: "right" }
      );

      y += 30;

      // --- Area Scores ---
      const areas = [
        { name: "Performance", score: auditData.website?.performance ?? 0 },
        { name: "SEO", score: calcSeoScore(auditData.seo) },
        { name: "Tracking", score: calcTrackingScore(auditData.tracking) },
        { name: "Social", score: calcSocialScore(auditData.social) },
        { name: "Trust", score: calcTrustScore(auditData.trust, auditData.website) },
        { name: "Content", score: calcContentScore(auditData.content) },
      ];

      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.text("Panoramica per Area", margin, y);
      y += 8;

      const barWidth = contentWidth - 40;
      for (const area of areas) {
        doc.setFontSize(9);
        doc.setTextColor(...gray);
        doc.setFont("helvetica", "normal");
        doc.text(area.name, margin, y + 4);

        // Background bar
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(margin + 35, y, barWidth, 5, 2, 2, "F");

        // Filled bar
        const fillColor: [number, number, number] =
          area.score >= 70 ? [34, 197, 94] : area.score >= 40 ? [245, 158, 11] : [239, 68, 68];
        const fillWidth = Math.max(2, (area.score / 100) * barWidth);
        doc.setFillColor(...fillColor);
        doc.roundedRect(margin + 35, y, fillWidth, 5, 2, 2, "F");

        // Score text
        doc.setTextColor(...dark);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`${area.score}%`, margin + 35 + barWidth + 2, y + 4);

        y += 9;
      }

      y += 6;

      // --- Audit Details ---
      const checkItem = (label: string, value: boolean | undefined | null) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const icon = value ? "+" : "-";
        const color: [number, number, number] = value ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(icon, margin + 2, y + 3.5);
        doc.setTextColor(...dark);
        doc.setFont("helvetica", "normal");
        doc.text(label, margin + 8, y + 3.5);
        y += 6;
      };

      const sectionTitle = (title: string) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        y += 3;
        doc.setFillColor(...gold);
        doc.rect(margin, y, 3, 5, "F");
        doc.setFontSize(11);
        doc.setTextColor(...dark);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 6, y + 4);
        y += 10;
      };

      // SEO
      sectionTitle("SEO");
      checkItem("Meta Title", auditData.seo?.hasMetaTitle);
      checkItem("Meta Description", auditData.seo?.hasMetaDescription);
      checkItem("Tag H1", auditData.seo?.hasH1);
      checkItem("Sitemap.xml", auditData.seo?.hasSitemap);
      checkItem("Robots.txt", auditData.seo?.hasRobotsTxt);
      checkItem("Schema Markup", auditData.seo?.hasSchemaMarkup);
      checkItem("Canonical URL", auditData.seo?.hasCanonical);
      checkItem("Open Graph", auditData.seo?.hasOpenGraph);

      // Tracking
      sectionTitle("Tracking & Analytics");
      checkItem("Google Analytics / GA4", auditData.tracking?.hasGA4 || auditData.tracking?.hasGoogleAnalytics);
      checkItem("Google Tag Manager", auditData.tracking?.hasGTM);
      checkItem("Facebook Pixel", auditData.tracking?.hasFacebookPixel);
      checkItem("Google Ads Tag", auditData.tracking?.hasGoogleAdsTag);
      checkItem("Hotjar / Clarity", auditData.tracking?.hasHotjar || auditData.tracking?.hasClarity);

      // Social
      sectionTitle("Social Media");
      checkItem("Facebook collegato", auditData.social?.facebook?.linkedFromSite);
      checkItem("Instagram collegato", auditData.social?.instagram?.linkedFromSite);
      checkItem("LinkedIn collegato", auditData.social?.linkedin?.linkedFromSite);
      checkItem("YouTube collegato", auditData.social?.youtube?.linkedFromSite);

      // Trust
      sectionTitle("Trust & Compliance");
      checkItem("HTTPS", auditData.website?.https);
      checkItem("Cookie Banner", auditData.trust?.hasCookieBanner);
      checkItem("Privacy Policy", auditData.trust?.hasPrivacyPolicy);
      checkItem("Termini e Condizioni", auditData.trust?.hasTerms);
      checkItem("Form di contatto", auditData.website?.hasContactForm);

      // Content
      sectionTitle("Content");
      checkItem("Blog presente", auditData.content?.hasBlog);
      if (auditData.content?.hasBlog && auditData.content?.daysSinceLastPost) {
        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.text(
          `Ultimo post: ${auditData.content.daysSinceLastPost} giorni fa`,
          margin + 8,
          y + 2
        );
        y += 6;
      }

      // --- Talking Points ---
      if (talkingPoints && talkingPoints.length > 0) {
        doc.addPage();
        y = 20;

        doc.setFillColor(...dark);
        doc.rect(0, 0, pageWidth, 18, "F");
        doc.setTextColor(...gold);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Talking Points per la Chiamata", margin, 12);

        y = 28;

        for (const point of talkingPoints) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFillColor(245, 245, 247);
          const lines = doc.splitTextToSize(point, contentWidth - 12);
          const boxHeight = lines.length * 5 + 6;
          doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "F");

          doc.setFontSize(9);
          doc.setTextColor(...dark);
          doc.setFont("helvetica", "normal");
          doc.text(lines, margin + 6, y + 5);
          y += boxHeight + 3;
        }
      }

      // --- Footer on last page ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 170);
        doc.text(
          `Report generato da KW Sales CRM - Pagina ${i}/${pageCount}`,
          pageWidth / 2,
          292,
          { align: "center" }
        );
      }

      // Save
      const safeName = leadName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      doc.save(`audit_${safeName}.pdf`);
      toast.success("PDF scaricato con successo");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Errore nella generazione del PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePdf}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {generating ? "Generando..." : "Scarica Report PDF"}
    </Button>
  );
}
