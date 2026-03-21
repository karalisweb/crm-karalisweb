import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { DraggableSearchesList } from "@/components/searches/draggable-searches-list";
import { AddManualProspect } from "@/components/leads/add-manual-prospect";

export const dynamic = "force-dynamic";

async function SearchesList() {
  const searches = await db.search.findMany({
    orderBy: [
      { sortOrder: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
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

  // Serializza le date per passarle al client component
  const serialized = searches.map((s) => ({
    id: s.id,
    query: s.query,
    location: s.location,
    status: s.status,
    leadsFound: s.leadsFound,
    leadsWithWebsite: s.leadsWithWebsite,
    errorMessage: s.errorMessage,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
  }));

  return <DraggableSearchesList initialSearches={serialized} />;
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
            Storico delle ricerche — trascina per riordinare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddManualProspect />
          <Link
            href="/search"
            className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Nuova Ricerca</span>
          </Link>
        </div>
      </div>

      {/* Lista ricerche con drag & drop */}
      <Suspense fallback={<SearchesListSkeleton />}>
        <SearchesList />
      </Suspense>
    </div>
  );
}
