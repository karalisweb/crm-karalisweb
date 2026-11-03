import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { caricaConfigVendita, ErroreConfig, salvaConfigVendita } from "@/lib/vendita/config";
import { PASSI_DEFAULT } from "@/lib/vendita/fila";

/** GET /api/vendita/config — la fila della vendita e le origini (Impostazioni → Vendita). */
export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ ...(await caricaConfigVendita()), fissi: PASSI_DEFAULT.map((p) => p.id) });
}

/** PUT /api/vendita/config — salva fila e origini. I passi fissi restano, accesi e nel loro ordine. */
export async function PUT(request: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;
  try {
    const body = await request.json();
    return NextResponse.json(await salvaConfigVendita({ passi: body?.passi, origini: body?.origini }));
  } catch (err) {
    if (err instanceof ErroreConfig) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[vendita/config] salvataggio fallito:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
