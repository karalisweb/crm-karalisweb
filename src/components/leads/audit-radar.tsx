"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { AuditData } from "@/types";

interface AuditRadarProps {
  auditData: AuditData;
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
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
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
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
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
  const linked = platforms.filter(Boolean).length;
  return Math.round((linked / platforms.length) * 100);
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
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function calcContentScore(content: AuditData["content"]): number {
  if (!content) return 0;
  if (!content.hasBlog) return 0;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 30) return 100;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 90) return 60;
  if (content.daysSinceLastPost && content.daysSinceLastPost < 180) return 30;
  return 10;
}

export function AuditRadar({ auditData }: AuditRadarProps) {
  const data = [
    { area: "Performance", value: auditData.website?.performance ?? 0 },
    { area: "SEO", value: calcSeoScore(auditData.seo) },
    { area: "Tracking", value: calcTrackingScore(auditData.tracking) },
    { area: "Social", value: calcSocialScore(auditData.social) },
    { area: "Trust", value: calcTrustScore(auditData.trust, auditData.website) },
    { area: "Content", value: calcContentScore(auditData.content) },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#2a2a35" />
        <PolarAngleAxis
          dataKey="area"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
        />
        <Radar
          dataKey="value"
          stroke="#d4a726"
          fill="#d4a726"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
