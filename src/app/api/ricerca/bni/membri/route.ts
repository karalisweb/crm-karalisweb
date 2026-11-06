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
  // v3.76 (Alessio: "il Lazio per il momento non mi serve"): una regione alla volta, la Sardegna se non si chiede
  // altro (?regione=Lazio per le altre). Prima il tetto di 1000 tagliava fuori la Sardegna dietro i "BNI …" del Lazio.
  const regione = request.nextUrl.searchParams.get("regione")?.trim() || "Sardegna";
  const tutti = (await db.bniChapter.findMany({ select: { id: true, name: true, region: true, regioneItaliana: true, isMine: true } }))
    .map((c) => ({ id: c.id, name: c.name, isMine: c.isMine, regione: eSardo(c) ? "Sardegna" : c.regioneItaliana?.trim() || "Regione non indicata" }));
  const capitoli = tutti.filter((c) => norm(c.regione) === norm(regione));
  const altreRegioni = [...new Set(tutti.map((c) => c.regione))]
    .filter((r) => norm(r) !== norm(regione))
    .map((r) => ({ regione: r, capitoli: tutti.filter((c) => c.regione === r).length }))
    .sort((a, b) => Number(a.regione !== "Sardegna") - Number(b.regione !== "Sardegna") || a.regione.localeCompare(b.regione, "it"));
  const scelti = new Set(capitoli.map((c) => norm(c.name)));
  // v3.114 (Alessio: "mi serve sapere a chi ho scritto"): l'ultima richiesta di 121 mandata a ogni membro.
  const mandate = await db.approvalItem.findMany({
    where: { kind: "MESSAGGIO_BNI", status: "APPROVATO", bniMembroId: { not: null } },
    orderBy: { decidedAt: "desc" },
    select: { bniMembroId: true, decidedAt: true, createdAt: true },
  });
  const scrittoIl = new Map<string, Date>();
  for (const v of mandate) if (!scrittoIl.has(v.bniMembroId!)) scrittoIl.set(v.bniMembroId!, v.decidedAt ?? v.createdAt);
  const righe = membri
    .filter((m) => scelti.has(norm(m.chapter)))
    .map((m) => ({ ...m, conosciuto: !!m.conosciutoAt || m.oneToOneCount > 0 || m.isCustomer, scrittoAt: scrittoIl.get(m.id)?.toISOString() ?? null }));
  if (!q) {
    righe.sort((a, b) => norm(a.chapter).localeCompare(norm(b.chapter)) || a.name.localeCompare(b.name, "it"));
    return NextResponse.json({ membri: righe, totale: righe.length, capitoli, regione, altreRegioni });
  }
  const trovati = righe
    .map((m) => ({ ...m, punteggio: punteggioBisogno(q, m) }))
    .filter((m) => m.punteggio > 0)
    .sort((a, b) => b.punteggio - a.punteggio || a.name.localeCompare(b.name, "it"));
  return NextResponse.json({ membri: trovati.slice(0, 50), totale: trovati.length, q, regione, altreRegioni });
}
