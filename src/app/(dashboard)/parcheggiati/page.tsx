import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Star,
  Phone,
  ExternalLink,
  PackageX,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function ParcheggiatiList() {
  // Carica tutti i parcheggiati (di solito sono pochi)
  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where: {
        auditStatus: "NO_WEBSITE",
      },
      orderBy: [{ googleRating: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        category: true,
        googleRating: true,
        googleReviewsCount: true,
        googleMapsUrl: true,
        website: true,
        auditData: true,
      },
    }),
    db.lead.count({
      where: {
        auditStatus: "NO_WEBSITE",
      },
    }),
  ]);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <PackageX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Nessun contatto parcheggiato</h3>
        <p className="text-sm text-muted-foreground mb-4">
          I contatti senza sito web appariranno qui
        </p>
        <Link
          href="/search"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4 mr-2" />
          Nuova Ricerca
        </Link>
      </div>
    );
  }

  // Raggruppa per motivo
  const noWebsite = leads.filter(l => !l.website);
  const socialLinks = leads.filter(l => l.website);

  return (
    <div className="space-y-6">
      {/* Conteggio totale */}
      <p className="text-sm text-muted-foreground">
        {total} contatti parcheggiati
      </p>

      {/* Tabella - versione desktop */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Categoria</th>
              <th className="text-left px-4 py-3 font-medium">Motivo</th>
              <th className="text-center px-4 py-3 font-medium">Rating</th>
              <th className="text-right px-4 py-3 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => {
              const isSocial = !!lead.website;
              const reason = isSocial ? "Link social" : "Nessun sito";

              return (
                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[200px]">{lead.name}</div>
                    {lead.address && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {lead.address.split(",")[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                    {lead.category || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      isSocial
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-gray-500/10 text-gray-500"
                    }`}>
                      {reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.googleRating ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {Number(lead.googleRating).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1.5 hover:bg-green-500/10 rounded text-green-500"
                          title="Chiama"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {lead.googleMapsUrl && (
                        <a
                          href={lead.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-blue-500/10 rounded text-blue-500"
                          title="Apri su Maps"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Lista mobile - più compatta */}
      <div className="md:hidden space-y-1">
        {leads.map((lead) => {
          const isSocial = !!lead.website;

          return (
            <div
              key={lead.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border-b border-border last:border-0"
            >
              {/* Info principale */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{lead.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lead.category && <span className="truncate">{lead.category}</span>}
                  {lead.googleRating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(lead.googleRating).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Tag motivo */}
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] ${
                isSocial
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-gray-500/10 text-gray-500"
              }`}>
                {isSocial ? "Social" : "No sito"}
              </span>

              {/* Azioni */}
              <div className="flex items-center gap-1 shrink-0">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="p-2 bg-green-500/10 rounded-lg"
                  >
                    <Phone className="h-4 w-4 text-green-500" />
                  </a>
                )}
                {lead.googleMapsUrl && (
                  <a
                    href={lead.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-500/10 rounded-lg"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
          Nessun sito: {noWebsite.length}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Link social: {socialLinks.length}
        </div>
      </div>
    </div>
  );
}

function ParcheggiatiListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParcheggiatiPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Parcheggiati</h1>
        <p className="text-sm text-muted-foreground">
          Contatti non target per servizi digitali
        </p>
      </div>

      {/* Lista */}
      <Suspense fallback={<ParcheggiatiListSkeleton />}>
        <ParcheggiatiList />
      </Suspense>
    </div>
  );
}
