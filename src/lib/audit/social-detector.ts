import * as cheerio from "cheerio";
import type { SocialAudit } from "@/types";

export function detectSocialLinks(html: string): SocialAudit {
  const $ = cheerio.load(html);

  const findSocialLink = (patterns: RegExp[]): string | null => {
    let found: string | null = null;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && patterns.some((p) => p.test(href))) {
        found = href;
        return false; // break
      }
    });
    return found;
  };

  const facebook = findSocialLink([
    /facebook\.com\/(?!sharer)/,
    /fb\.com\//,
  ]);
  const instagram = findSocialLink([/instagram\.com\//]);
  const linkedin = findSocialLink([
    /linkedin\.com\/company\//,
    /linkedin\.com\/in\//,
  ]);
  const youtube = findSocialLink([/youtube\.com\/(channel|c|user|@)/]);
  const tiktok = findSocialLink([/tiktok\.com\/@/]);
  const twitter = findSocialLink([/twitter\.com\//, /x\.com\//]);

  return {
    facebook: { linkedFromSite: !!facebook, url: facebook },
    instagram: { linkedFromSite: !!instagram, url: instagram },
    linkedin: { linkedFromSite: !!linkedin, url: linkedin },
    youtube: { linkedFromSite: !!youtube, url: youtube },
    tiktok: { linkedFromSite: !!tiktok, url: tiktok },
    twitter: { linkedFromSite: !!twitter, url: twitter },
  };
}
