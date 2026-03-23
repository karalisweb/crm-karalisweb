/**
 * WordPress REST API Client
 *
 * Crea post nel CPT "prospect" su karalisweb.net
 * tramite WordPress REST API + Application Passwords.
 *
 * Requisiti WordPress:
 * 1. CPT "prospect" registrato (via ACF → Post Types)
 *    - show_in_rest: true
 * 2. ACF Field Group "Dati Prospect" collegato al CPT con campi:
 *    - nome_prospect (testo)
 *    - video_youtube_id (testo) — ID video YouTube per embed + tracking
 *    - punto_di_dolore (textarea) — copy personalizzato hero
 *    - tracking_token (testo)
 *    - video_youtube_url (url) — URL completo YouTube
 * 3. Application Password generata per l'utente admin
 *
 * Variabili .env:
 * - WP_URL=https://karalisweb.net
 * - WP_USER=admin
 * - WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

const WP_URL = process.env.WP_URL || "https://karalisweb.net";
const WP_USER = process.env.WP_USER || "";
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";

function getAuthHeader(): string {
  if (!WP_USER || !WP_APP_PASSWORD) {
    throw new Error("Credenziali WordPress non configurate (WP_USER, WP_APP_PASSWORD)");
  }
  return `Basic ${Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64")}`;
}

interface CreateLandingPageParams {
  title: string;
  nomeProspect: string;
  videoYoutubeId: string;
  videoYoutubeUrl: string;
  puntoDiDolore: string;
  trackingToken: string;
  slug?: string;
}

interface WPPostResponse {
  id: number;
  slug: string;
  link: string;
  status: string;
}

/**
 * Crea un nuovo Video Prospect su WordPress
 */
export async function createLandingPage(params: CreateLandingPageParams): Promise<{
  wpPostId: number;
  slug: string;
  url: string;
}> {
  const { title, nomeProspect, videoYoutubeId, videoYoutubeUrl, puntoDiDolore, trackingToken, slug } = params;

  const acf: Record<string, string> = {
    nome_prospect: nomeProspect,
    video_youtube_id: videoYoutubeId,
    video_youtube_url: videoYoutubeUrl,
    punto_di_dolore: puntoDiDolore,
    tracking_token: trackingToken,
  };

  const body: Record<string, unknown> = {
    title,
    status: "publish",
    acf,
  };

  if (slug) {
    body.slug = slug;
  }

  const response = await fetch(`${WP_URL}/wp-json/wp/v2/prospect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    if (response.status === 401) {
      throw new Error("Autenticazione WordPress fallita — verifica WP_USER e WP_APP_PASSWORD");
    }
    if (response.status === 404) {
      throw new Error("CPT 'prospect' non trovato — verifica che sia registrato con show_in_rest: true");
    }
    throw new Error(`WordPress API error ${response.status}: ${errorText}`);
  }

  const data: WPPostResponse = await response.json();

  return {
    wpPostId: data.id,
    slug: data.slug,
    url: data.link,
  };
}

/**
 * Elimina un Video Prospect da WordPress
 */
export async function deleteLandingPage(wpPostId: number): Promise<void> {
  const response = await fetch(`${WP_URL}/wp-json/wp/v2/prospect/${wpPostId}`, {
    method: "DELETE",
    headers: { Authorization: getAuthHeader() },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok && response.status !== 410) {
    throw new Error(`WordPress delete error: ${response.status}`);
  }
}
