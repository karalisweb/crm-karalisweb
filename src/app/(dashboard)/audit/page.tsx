import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function AuditContent() {
  // Lead con sito che hanno bisogno di audit (PENDING) o sono in corso (RUNNING)
  const leadsNeedingAudit = await db.lead.findMany({
    where: {
      website: { not: null },
      auditStatus: { in: ["PENDING", "RUNNING"] },
    },
    orderBy: [
      { auditStatus: "asc" }, // RUNNING prima di PENDING
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      website: true,
      category: true,
      auditStatus: true,
      createdAt: true,
      search: {
        select: {
          query: true,
          location: true,
        },
      },
    },
  });

  // Lead con audit fallito (possono essere ri-auditati)
  const failedAudits = await db.lead.findMany({
    where: {
      website: { not: null },
      auditStatus: "FAILED",
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      website: true,
      category: true,
      auditStatus: true,
      search: {
        select: {
          query: true,
          location: true,
        },
      },
    },
  });

  const runningCount = leadsNeedingAudit.filter(l => l.auditStatus === "RUNNING").length;
  const pendingCount = leadsNeedingAudit.filter(l => l.auditStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lead con sito in attesa di analisi
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{runningCount}</div>
            <div className="text-xs text-muted-foreground">In corso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-500">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">In attesa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{failedAudits.length}</div>
            <div className="text-xs text-muted-foreground">Falliti</div>
          </CardContent>
        </Card>
      </div>

      {/* Audit in corso */}
      {runningCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            Audit in corso ({runningCount})
          </h2>
          <div className="grid gap-3">
            {leadsNeedingAudit
              .filter(l => l.auditStatus === "RUNNING")
              .map((lead) => (
                <AuditLeadCard key={lead.id} lead={lead} />
              ))}
          </div>
        </div>
      )}

      {/* In attesa */}
      {pendingCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            In attesa ({pendingCount})
          </h2>
          <div className="grid gap-3">
            {leadsNeedingAudit
              .filter(l => l.auditStatus === "PENDING")
              .map((lead) => (
                <AuditLeadCard key={lead.id} lead={lead} />
              ))}
          </div>
        </div>
      )}

      {/* Falliti */}
      {failedAudits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Falliti ({failedAudits.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Questi siti non sono stati raggiungibili durante l'audit
          </p>
          <div className="grid gap-3">
            {failedAudits.map((lead) => (
              <AuditLeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {leadsNeedingAudit.length === 0 && failedAudits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="font-semibold mb-1">Tutti gli audit completati</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Non ci sono lead in attesa di audit
          </p>
          <Link
            href="/search"
            className="text-sm text-primary hover:underline"
          >
            Lancia una nuova ricerca
          </Link>
        </div>
      )}
    </div>
  );
}

interface AuditLeadCardProps {
  lead: {
    id: string;
    name: string;
    website: string | null;
    category: string | null;
    auditStatus: string;
    search: {
      query: string;
      location: string;
    } | null;
  };
}

function AuditLeadCard({ lead }: AuditLeadCardProps) {
  const statusConfig = {
    RUNNING: {
      label: "In corso...",
      icon: Loader2,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      spin: true,
    },
    PENDING: {
      label: "In attesa",
      icon: Clock,
      color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      spin: false,
    },
    FAILED: {
      label: "Fallito",
      icon: AlertCircle,
      color: "bg-red-500/10 text-red-500 border-red-500/20",
      spin: false,
    },
  };

  const config = statusConfig[lead.auditStatus as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{lead.name}</h3>

            {lead.category && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {lead.category}
              </p>
            )}

            {lead.website && (
              <a
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-[200px]">
                  {lead.website.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {lead.search && (
              <p className="text-xs text-muted-foreground mt-2">
                Da: {lead.search.query} - {lead.search.location}
              </p>
            )}
          </div>

          <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
            <StatusIcon className={`h-3 w-3 mr-1 ${config.spin ? "animate-spin" : ""}`} />
            {config.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
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
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditSkeleton />}>
      <AuditContent />
    </Suspense>
  );
}
