/**
 * I social cercati per nome: quando il sito non c'è (o non ha i link), si cerca su Google
 * "<nome> <città>" e si tengono i profili Facebook, Instagram e LinkedIn il cui titolo
 * contiene il nome dell'azienda. È la strada di chi non ha il sito: si va subito sui social.
 */
import { chiamaDataForSeo, dataForSeoConfigurato, LOCATION_ITALIA } from "./dataforseo";
import { nomeConfrontabile } from "@/lib/ricerca/regole";

export interface ProfiliSocial {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
}

interface ItemSerp {
  type: string;
  url?: string;
  title?: string;
}

/** Parole del nome che bastano a riconoscerlo (non "impresa", "costruzioni", "srl"…). */
const COMUNI = new Set(["impresa", "ditta", "studio", "societa", "costruzioni", "edile", "edilizia", "servizi", "group", "gruppo", "italia", "sardegna", "piscine", "the", "and"]);

export function profiliDaRisultati(items: ItemSerp[], nome: string): ProfiliSocial {
  const parole = nomeConfrontabile(nome).split(" ").filter((p) => p.length >= 3 && !COMUNI.has(p));
  const chiave = parole.length ? parole : nomeConfrontabile(nome).split(" ").filter((p) => p.length >= 3);
  const somiglia = (titolo: string | undefined) => {
    const t = nomeConfrontabile(titolo);
    return chiave.length > 0 && chiave.every((p) => t.includes(p));
  };
  const out: ProfiliSocial = { facebook: null, instagram: null, linkedin: null };
  for (const i of items) {
    if (i.type !== "organic" || !i.url || !somiglia(i.title)) continue;
    let u: URL;
    try {
      u = new URL(i.url);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^(www|m|it-it|it)\./, "");
    const primo = u.pathname.split("/").filter(Boolean)[0] ?? "";
    const pulito = `https://www.${host}/${u.pathname.split("/").filter(Boolean).slice(0, host === "linkedin.com" ? 2 : 1).join("/")}`;
    if (!out.facebook && host === "facebook.com" && primo && !/^(sharer|groups|events|watch|photo|story|reel|people|public|hashtag)/i.test(primo)) out.facebook = primo === "p" || primo === "pages" ? i.url.split("?")[0] : pulito;
    if (!out.instagram && host === "instagram.com" && primo && !/^(p|reel|explore|stories|tv)$/i.test(primo)) out.instagram = pulito;
    if (!out.linkedin && host === "linkedin.com" && primo === "company") out.linkedin = pulito;
  }
  return out;
}

export async function cercaSocialPerNome(nome: string, citta: string | null): Promise<{ profili: ProfiliSocial; costCents: number }> {
  if (!dataForSeoConfigurato()) return { profili: { facebook: null, instagram: null, linkedin: null }, costCents: 0 };
  const { result, costCents } = await chiamaDataForSeo<{ items?: ItemSerp[] }>("/serp/google/organic/live/advanced", {
    keyword: `${nome} ${citta ?? ""} facebook instagram linkedin`.replace(/\s+/g, " ").trim(),
    location_code: LOCATION_ITALIA,
    language_code: "it",
    depth: 20,
  });
  return { profili: profiliDaRisultati(result?.items ?? [], nome), costCents };
}
