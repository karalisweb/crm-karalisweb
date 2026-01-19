import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Users,
  Globe
} from "lucide-react";
export const dynamic = "force-dynamic";

// Funzione helper per formattare la data in italiano
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "ieri" : `${diffDays} giorni fa`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 ora fa" : `${diffHours} ore fa`;
  }
  if (diffMins > 0) {
    return diffMins === 1 ? "1 minuto fa" : `${diffMins} minuti fa`;
  }
  return "adesso";
}

const STATUS_CONFIG = {
  PENDING: { label: "In attesa", icon: Clock, color: "bg-gray-500/10 text-gray-500" },
  RUNNING: { label: "In corso...", icon: Loader2, color: "bg-blue-500/10 text-blue-500" },
  COMPLETED: { label: "Completata", icon: CheckCircle, color: "bg-green-500/10 text-green-500" },
  FAILED: { label: "Errore", icon: AlertCircle, color: "bg-red-500/10 text-red-500" },
};

async function SearchesList() {
  const searches = await db.search.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (searches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">Nessuna ricerca effettuata</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Inizia una nuova ricerca per trovare potenziali clienti
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

  return (
    <div className="space-y-3">
      {searches.map((search) => {
        const statusConfig = STATUS_CONFIG[search.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
        const StatusIcon = statusConfig.icon;

        return (
          <Link key={search.id} href={`/searches/${search.id}`}>
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{search.query}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{search.location}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge variant="outline" className={statusConfig.color}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${search.status === "RUNNING" ? "animate-spin" : ""}`} />
                        {statusConfig.label}
                      </Badge>

                      {search.leadsFound !== null && search.leadsFound > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {search.leadsFound} trovati
                        </span>
                      )}

                      {search.leadsWithWebsite !== null && search.leadsWithWebsite > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" />
                          {search.leadsWithWebsite} con sito
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="h-3 w-3" />
                        {formatTimeAgo(new Date(search.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>

                {search.errorMessage && (
                  <div className="mt-3 p-2 bg-red-500/10 rounded-lg text-sm text-red-500">
                    {search.errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function SearchesListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SearchesPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Ricerche</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Storico delle ricerche effettuate su Google Maps
          </p>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Nuova Ricerca</span>
        </Link>
      </div>

      {/* Lista ricerche */}
      <Suspense fallback={<SearchesListSkeleton />}>
        <SearchesList />
      </Suspense>
    </div>
  );
}
