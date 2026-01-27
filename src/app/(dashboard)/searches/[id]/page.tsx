import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  PackageX,
  Phone,
  ClipboardCheck,
  ChevronRight,
  Calendar,
  Ban,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function SearchDetailContent({ searchId }: { searchId: string }) {
  const search = await db.search.findUnique({
    where: { id: searchId },
  });

  if (!search) {
    notFound();
  }

  // Conta i lead per stato audit e tag commerciali
  const [
    completedCount,
    runningCount,
    pendingCount,
    failedCount,
    noWebsiteCount,
    readyToCallCount,
    noTargetCount,
  ] = await Promise.all([
    db.lead.count({ where: { searchId, auditStatus: "COMPLETED" } }),
    db.lead.count({ where: { searchId, auditStatus: "RUNNING" } }),
    db.lead.count({ where: { searchId, auditStatus: "PENDING" } }),
    db.lead.count({ where: { searchId, auditStatus: "FAILED" } }),
    db.lead.count({ where: { searchId, auditStatus: "NO_WEBSITE" } }),
    // Pronti da chiamare: audit completato E tag commerciale valido (non NON_TARGET)
    db.lead.count({
      where: {
        searchId,
        auditStatus: "COMPLETED",
        OR: [
          { commercialTag: null },
          { commercialTag: { not: "NON_TARGET" } }
        ]
      }
    }),
    // No target: audit completato ma scartati
    db.lead.count({
      where: {
        searchId,
        auditStatus: "COMPLETED",
        commercialTag: "NON_TARGET"
      }
    }),
  ]);

  const totalLeads = completedCount + runningCount + pendingCount + failedCount + noWebsiteCount;
  const withSite = completedCount + runningCount + pendingCount + failedCount;
  const auditInProgress = runningCount + pendingCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/searches"
          className="mt-1 p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{search.query}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span>{search.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(new Date(search.createdAt))}</span>
          </div>
        </div>
      </div>

      {/* Riepilogo stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{totalLeads}</div>
            <div className="text-sm text-muted-foreground">Contatti trovati</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{readyToCallCount}</div>
            <div className="text-sm text-muted-foreground">Pronti da chiamare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{auditInProgress}</div>
            <div className="text-sm text-muted-foreground">In audit</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{noWebsiteCount}</div>
            <div className="text-sm text-muted-foreground">Parcheggiati</div>
          </CardContent>
        </Card>
      </div>

      {/* Link alle pagine dedicate */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Vai a</h2>

        {/* Da chiamare */}
        {readyToCallCount > 0 && (
          <Link href="/leads">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Phone className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Da Chiamare</p>
                      <p className="text-sm text-muted-foreground">
                        {readyToCallCount} lead con audit completato
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{readyToCallCount}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Audit in corso/attesa */}
        {auditInProgress > 0 && (
          <Link href="/audit">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <ClipboardCheck className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Audit</p>
                      <p className="text-sm text-muted-foreground">
                        {runningCount > 0 && `${runningCount} in corso`}
                        {runningCount > 0 && pendingCount > 0 && ", "}
                        {pendingCount > 0 && `${pendingCount} in attesa`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {runningCount > 0 && (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {runningCount}
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge variant="secondary">{pendingCount}</Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* No Target (scartati) */}
        {noTargetCount > 0 && (
          <Link href="/no-target">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-500/10">
                      <Ban className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium">No Target</p>
                      <p className="text-sm text-muted-foreground">
                        {noTargetCount} lead scartati
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{noTargetCount}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Parcheggiati (senza sito) */}
        {noWebsiteCount > 0 && (
          <Link href="/parcheggiati">
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <PackageX className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium">Parcheggiati</p>
                      <p className="text-sm text-muted-foreground">
                        {noWebsiteCount} contatti senza sito web
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{noWebsiteCount}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Falliti */}
        {failedCount > 0 && (
          <Link href="/audit">
            <Card className="card-hover cursor-pointer border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Audit falliti</p>
                      <p className="text-sm text-muted-foreground">
                        {failedCount} siti non raggiungibili
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{failedCount}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Empty state */}
      {totalLeads === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-secondary mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Ricerca in corso</h3>
          <p className="text-sm text-muted-foreground">
            I contatti appariranno qui una volta trovati
          </p>
        </div>
      )}
    </div>
  );
}

function SearchDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-9 w-9" />
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-9 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function SearchDetailPage({ params }: SearchDetailPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<SearchDetailSkeleton />}>
      <SearchDetailContent searchId={id} />
    </Suspense>
  );
}
