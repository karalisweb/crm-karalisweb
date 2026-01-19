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
  Star,
  Phone,
  Globe,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  PackageX,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchDetailPageProps {
  params: Promise<{ id: string }>;
}

const AUDIT_STATUS_CONFIG = {
  PENDING: {
    label: "Da auditare",
    icon: Clock,
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20"
  },
  RUNNING: {
    label: "Audit in corso...",
    icon: Loader2,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  },
  COMPLETED: {
    label: "Audit completato",
    icon: CheckCircle,
    color: "bg-green-500/10 text-green-500 border-green-500/20"
  },
  FAILED: {
    label: "Audit fallito",
    icon: AlertCircle,
    color: "bg-red-500/10 text-red-500 border-red-500/20"
  },
  NO_WEBSITE: {
    label: "Senza sito",
    icon: PackageX,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
  },
};

async function SearchDetailContent({ searchId }: { searchId: string }) {
  const search = await db.search.findUnique({
    where: { id: searchId },
  });

  if (!search) {
    notFound();
  }

  // Recupera tutti i lead associati a questa ricerca
  const leads = await db.lead.findMany({
    where: { searchId: searchId },
    orderBy: [
      { auditStatus: "asc" }, // COMPLETED prima
      { opportunityScore: "desc" },
      { googleRating: "desc" },
    ],
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      website: true,
      category: true,
      googleRating: true,
      googleReviewsCount: true,
      googleMapsUrl: true,
      auditStatus: true,
      opportunityScore: true,
      pipelineStage: true,
    },
  });

  // Raggruppa per stato audit
  const grouped = {
    COMPLETED: leads.filter(l => l.auditStatus === "COMPLETED"),
    RUNNING: leads.filter(l => l.auditStatus === "RUNNING"),
    PENDING: leads.filter(l => l.auditStatus === "PENDING"),
    FAILED: leads.filter(l => l.auditStatus === "FAILED"),
    NO_WEBSITE: leads.filter(l => l.auditStatus === "NO_WEBSITE"),
  };

  const stats = {
    total: leads.length,
    withSite: leads.filter(l => l.website).length,
    noSite: leads.filter(l => !l.website || l.auditStatus === "NO_WEBSITE").length,
    audited: grouped.COMPLETED.length,
    running: grouped.RUNNING.length,
    pending: grouped.PENDING.length,
    failed: grouped.FAILED.length,
  };

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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Totali</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.audited}</div>
            <div className="text-xs text-muted-foreground">Auditati</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
            <div className="text-xs text-muted-foreground">In corso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">In attesa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.noSite}</div>
            <div className="text-xs text-muted-foreground">Senza sito</div>
          </CardContent>
        </Card>
      </div>

      {/* Lead completati (pronti da chiamare) */}
      {grouped.COMPLETED.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Pronti da chiamare ({grouped.COMPLETED.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.COMPLETED.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* Audit in corso */}
      {grouped.RUNNING.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            Audit in corso ({grouped.RUNNING.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.RUNNING.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* In attesa */}
      {grouped.PENDING.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            In attesa di audit ({grouped.PENDING.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.PENDING.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* Falliti */}
      {grouped.FAILED.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Audit falliti ({grouped.FAILED.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.FAILED.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* Senza sito */}
      {grouped.NO_WEBSITE.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackageX className="h-5 w-5 text-yellow-500" />
            Senza sito web ({grouped.NO_WEBSITE.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Questi contatti non hanno un sito web - parcheggiati per altri servizi
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.NO_WEBSITE.map((lead) => (
              <LeadCard key={lead.id} lead={lead} showNoWebsite />
            ))}
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-secondary mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nessun lead trovato</h3>
          <p className="text-sm text-muted-foreground">
            La ricerca non ha prodotto risultati
          </p>
        </div>
      )}
    </div>
  );
}

// googleRating può essere Decimal da Prisma, usiamo unknown e convertiamo a Number
interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    website: string | null;
    category: string | null;
    googleRating: unknown; // Decimal from Prisma, converted to number via Number()
    googleReviewsCount: number | null;
    googleMapsUrl: string | null;
    auditStatus: string;
    opportunityScore: number | null;
    pipelineStage: string;
  };
  showNoWebsite?: boolean;
}

function LeadCard({ lead, showNoWebsite }: LeadCardProps) {
  const statusConfig = AUDIT_STATUS_CONFIG[lead.auditStatus as keyof typeof AUDIT_STATUS_CONFIG]
    || AUDIT_STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const isClickable = lead.auditStatus === "COMPLETED";

  const cardContent = (
    <Card className={`transition-all ${isClickable ? "card-hover cursor-pointer" : "opacity-80"}`}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate flex-1">
              {lead.name}
            </h3>
            {lead.opportunityScore && lead.auditStatus === "COMPLETED" && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  lead.opportunityScore >= 70
                    ? "border-green-500 text-green-500"
                    : lead.opportunityScore >= 40
                    ? "border-yellow-500 text-yellow-500"
                    : "border-gray-500 text-gray-500"
                }`}
              >
                Score: {lead.opportunityScore}
              </Badge>
            )}
            {!lead.opportunityScore && lead.googleRating != null && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(lead.googleRating).toFixed(1)}
              </Badge>
            )}
          </div>

          {lead.category && (
            <p className="text-xs text-muted-foreground truncate">
              {lead.category}
            </p>
          )}

          {lead.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{lead.address.split(",")[0]}</span>
            </p>
          )}

          {/* Stato audit */}
          <div className="pt-2 border-t border-border">
            <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
              <StatusIcon className={`h-3 w-3 mr-1 ${lead.auditStatus === "RUNNING" ? "animate-spin" : ""}`} />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Azioni per lead senza sito */}
          {showNoWebsite && (
            <div className="flex items-center gap-2 pt-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs hover:bg-green-500/20 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  Chiama
                </a>
              )}
              {lead.googleMapsUrl && (
                <a
                  href={lead.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs hover:bg-blue-500/20 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Maps
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isClickable) {
    return (
      <Link href={`/leads/${lead.id}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
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
