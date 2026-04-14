/**
 * WordPress REST API Client
 *
 * Crea post nel CPT "prospect" su karalisweb.net
 * tramite WordPress REST API + Application Passwords.
 *
 * Requisiti WordPress:
 * 1. CPT "prospect" registrato (via ACF → Post Types)
 *    - show_in_rest: true
 * 2. ACF Field Group "Dati Prospect" con campi:
 *    - prospect_nome_azienda (testo)
 *    - prospect_punto_di_dolore (textarea)
 *    - prospect_video_youtube (url)
 *    - prospect_nome_titolare (testo)
 *    - prospect_tracking_token (testo)
 * 3. Application Password generata per l'utente admin
 *
 * Variabili .env:
 * - WP_URL=https://www.karalisweb.net
 * - WP_USER=alessioloi
 * - WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

const WP_URL = process.env.WP_URL || "https://www.karalisweb.net";
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
  nomeAzienda: string;
  nomeTitolare?: string;
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
 * Crea un nuovo Prospect su WordPress con campi ACF
 */
export async function createLandingPage(params: CreateLandingPageParams): Promise<{
  wpPostId: number;
  slug: string;
  url: string;
}> {
  const { title, nomeAzienda, nomeTitolare, videoYoutubeUrl, puntoDiDolore, trackingToken, slug } = params;

  const acf: Record<string, string> = {
    prospect_nome_azienda: nomeAzienda,
    prospect_punto_di_dolore: puntoDiDolore,
    prospect_video_youtube: videoYoutubeUrl,
    prospect_tracking_token: trackingToken,
  };

  if (nomeTitolare) {
    acf.prospect_nome_titolare = nomeTitolare;
  }

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
 * Aggiorna i campi ACF di un Prospect esistente su WordPress.
 * Usato quando l'utente modifica il video YouTube o il punto di dolore
 * dopo aver gia creato la landing page.
 */
export async function updateLandingPage(
  wpPostId: number,
  fields: Partial<{
    videoYoutubeUrl: string;
    puntoDiDolore: string;
    nomeAzienda: string;
    nomeTitolare: string;
  }>,
): Promise<void> {
  const acf: Record<string, string> = {};
  if (fields.videoYoutubeUrl !== undefined) acf.prospect_video_youtube = fields.videoYoutubeUrl;
  if (fields.puntoDiDolore !== undefined) acf.prospect_punto_di_dolore = fields.puntoDiDolore;
  if (fields.nomeAzienda !== undefined) acf.prospect_nome_azienda = fields.nomeAzienda;
  if (fields.nomeTitolare !== undefined) acf.prospect_nome_titolare = fields.nomeTitolare;

  if (Object.keys(acf).length === 0) return;

  const response = await fetch(`${WP_URL}/wp-json/wp/v2/prospect/${wpPostId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({ acf }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`WordPress update error ${response.status}: ${errorText}`);
  }
}

/**
 * Elimina un Prospect da WordPress
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
