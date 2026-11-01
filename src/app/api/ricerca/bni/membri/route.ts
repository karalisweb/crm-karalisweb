import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { eSardo, norm } from "@/lib/agents/bni-regole";
import { punteggioBisogno } from "@/lib/ricerca/regole";

/**
 * GET /api/ricerca/bni/membri?q=commercialista%20a%20Cagliari&capitolo=Karalis
 * Con `q`: la ricerca per bisogno (mestiere, cosa fa, referenze che può dare…), i migliori prima.
 * Senza: l'elenco, per capitolo e nome.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const capitolo = request.nextUrl.searchParams.get("capitolo")?.trim() ?? "";
  const membri = await db.bniMembro.findMany({
    where: { status: "ATTIVO", ...(capitolo ? { chapter: { equals: capitolo, mode: "insensitive" } } : {}) },
    select: {
      id: true, name: true, profession: true, company: true, chapter: true, phone: true, linkedinUrl: true,
      cosaFa: true, seeking: true, referenzePuoDare: true, conosciutoAt: true, leadershipRole: true, oneToOneCount: true, isCustomer: true, next121At: true,
    },
  });
  // v3.76 (Alessio: "il Lazio per il momento non mi serve"): la Rubrica mostra solo i capitoli sardi.
  // Prima il tetto di 1000 tagliava fuori la Sardegna: i capitoli del Lazio ("BNI …") venivano prima.
  const capitoli = (await db.bniChapter.findMany({ select: { id: true, name: true, region: true, regioneItaliana: true, isMine: true } }))
    .filter((c) => eSardo(c))
    .map((c) => ({ id: c.id, name: c.name, isMine: c.isMine, regione: "Sardegna" }));
  const sardi = new Set(capitoli.map((c) => norm(c.name)));
  const righe = membri
    .filter((m) => sardi.has(norm(m.chapter)))
    .map((m) => ({ ...m, conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer }));
  if (!q) {
    righe.sort((a, b) => norm(a.chapter).localeCompare(norm(b.chapter)) || a.name.localeCompare(b.name, "it"));
    return NextResponse.json({ membri: righe, totale: righe.length, capitoli });
  }
  const trovati = righe
    .map((m) => ({ ...m, punteggio: punteggioBisogno(q, m) }))
    .filter((m) => m.punteggio > 0)
    .sort((a, b) => b.punteggio - a.punteggio || a.name.localeCompare(b.name, "it"));
  return NextResponse.json({ membri: trovati.slice(0, 50), totale: trovati.length, q });
}
