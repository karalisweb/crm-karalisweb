import * as cheerio from "cheerio";
import type { EmailMarketingAudit } from "@/types";

export function detectEmailMarketing(html: string): EmailMarketingAudit {
  const $ = cheerio.load(html);

  // Newsletter form
  const newsletterPatterns = [
    /newsletter/i,
    /iscriviti/i,
    /subscribe/i,
    /mailing[- ]?list/i,
    /email.+aggiorn/i,
    /resta.+aggiornato/i,
    /rimani.+aggiornato/i,
  ];

  const hasNewsletterForm =
    $("form").filter((_, el) => {
      const formHtml = $(el).html() || "";
      return (
        newsletterPatterns.some((p) => p.test(formHtml)) &&
        /type=['"]email['"]/i.test(formHtml)
      );
    }).length > 0;

  // Popup (classi comuni)
  const popupPatterns = [
    /popup/i,
    /modal/i,
    /overlay/i,
    /lightbox/i,
    /exit[- ]?intent/i,
  ];
  const hasPopup =
    popupPatterns.some((p) => p.test(html)) &&
    newsletterPatterns.some((p) => p.test(html));

  // Lead magnet
  const leadMagnetPatterns = [
    /download.+gratis/i,
    /free.+download/i,
    /ebook/i,
    /guida.+gratuita/i,
    /scarica.+gratis/i,
    /white[- ]?paper/i,
    /pdf.+gratis/i,
    /risorsa.+gratuita/i,
  ];
  const hasLeadMagnet = leadMagnetPatterns.some((p) => p.test(html));

  // Email provider detection
  const providers: Record<string, RegExp> = {
    Mailchimp: /mailchimp|list-manage\.com/i,
    Mailerlite: /mailerlite/i,
    Sendinblue: /sendinblue|sibforms|brevo/i,
    ActiveCampaign: /activecampaign/i,
    ConvertKit: /convertkit/i,
    GetResponse: /getresponse/i,
    Klaviyo: /klaviyo/i,
    HubSpot: /hubspot.*form/i,
    Drip: /getdrip\.com/i,
    AWeber: /aweber/i,
  };

  let emailProvider: string | null = null;
  for (const [name, pattern] of Object.entries(providers)) {
    if (pattern.test(html)) {
      emailProvider = name;
      break;
    }
  }

  return {
    hasNewsletterForm,
    hasPopup,
    hasLeadMagnet,
    emailProvider,
  };
}
