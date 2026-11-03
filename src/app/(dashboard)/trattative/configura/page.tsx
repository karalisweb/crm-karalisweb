import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { PannelloVendita } from "@/components/vendita/pannello-vendita";

/** Impostazioni → Vendita, raggiungibile anche dalla pagina Trattative. */
export default function ConfiguraVenditaPage() {
  return (
    <div className="space-y-4 max-w-2xl min-w-0">
      <Link href="/trattative" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Trattative
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings2 className="h-6 w-6 text-primary" /> Vendita: la fila</h1>
      <PannelloVendita />
    </div>
  );
}
