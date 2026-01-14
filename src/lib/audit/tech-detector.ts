import * as cheerio from "cheerio";
import type { TechAudit } from "@/types";

export function detectTech(html: string): TechAudit {
  const stack: string[] = [];
  let cms: string | null = null;
  let cmsVersion: string | null = null;

  // WordPress
  if (/wp-content|wp-includes|wordpress/i.test(html)) {
    cms = "WordPress";
    stack.push("WordPress");

    // Prova a trovare versione
    const versionMatch = html.match(
      /WordPress\s*(\d+\.\d+(?:\.\d+)?)/i
    );
    if (versionMatch) {
      cmsVersion = versionMatch[1];
    }
  }

  // Shopify
  if (/cdn\.shopify\.com|shopify/i.test(html)) {
    cms = "Shopify";
    stack.push("Shopify");
  }

  // Wix
  if (/wix\.com|parastorage\.com|wixstatic\.com/i.test(html)) {
    cms = "Wix";
    stack.push("Wix");
  }

  // Squarespace
  if (/squarespace\.com|sqsp/i.test(html)) {
    cms = "Squarespace";
    stack.push("Squarespace");
  }

  // Webflow
  if (/webflow\.com/i.test(html)) {
    cms = "Webflow";
    stack.push("Webflow");
  }

  // Joomla
  if (/joomla/i.test(html) || /\/media\/system\/js/i.test(html)) {
    cms = "Joomla";
    stack.push("Joomla");
  }

  // Drupal
  if (/drupal/i.test(html) || /\/sites\/default\/files/i.test(html)) {
    cms = "Drupal";
    stack.push("Drupal");
  }

  // PrestaShop
  if (/prestashop/i.test(html) || /\/modules\/ps_/i.test(html)) {
    cms = "PrestaShop";
    stack.push("PrestaShop");
  }

  // Magento
  if (/magento|mage/i.test(html)) {
    cms = "Magento";
    stack.push("Magento");
  }

  // WooCommerce (su WordPress)
  if (/woocommerce/i.test(html)) {
    stack.push("WooCommerce");
  }

  // Frameworks JS
  if (/__NEXT_DATA__|_next\/static/i.test(html)) {
    stack.push("Next.js");
  }
  if (/__NUXT__|_nuxt/i.test(html)) {
    stack.push("Nuxt.js");
  }
  if (/gatsby/i.test(html)) {
    stack.push("Gatsby");
  }
  if (/react|__react/i.test(html)) {
    stack.push("React");
  }
  if (/vue/i.test(html) && !stack.includes("Nuxt.js")) {
    stack.push("Vue.js");
  }
  if (/angular/i.test(html)) {
    stack.push("Angular");
  }

  // jQuery
  if (/jquery/i.test(html)) {
    stack.push("jQuery");
  }

  // Bootstrap
  if (/bootstrap/i.test(html)) {
    stack.push("Bootstrap");
  }

  // Tailwind
  if (/tailwind/i.test(html)) {
    stack.push("Tailwind CSS");
  }

  // PHP version detection (from headers would be better, but check meta)
  let phpVersion: string | null = null;
  const phpMatch = html.match(/PHP\/(\d+\.\d+(?:\.\d+)?)/i);
  if (phpMatch) {
    phpVersion = phpMatch[1];
    stack.push(`PHP ${phpVersion}`);
  }

  // Check if outdated
  const isOutdated =
    (phpVersion && parseFloat(phpVersion) < 8.0) ||
    (cmsVersion && cms === "WordPress" && parseFloat(cmsVersion) < 6.0);

  return {
    cms,
    cmsVersion,
    phpVersion,
    stack,
    isOutdated: isOutdated || false,
  };
}
