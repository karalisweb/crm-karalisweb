"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SearchRecord {
  id: string;
  query: string;
  location: string;
  status: string;
  leadsFound: number;
  leadsWithWebsite: number;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "In attesa", variant: "outline" },
  RUNNING: { label: "In corso", variant: "default" },
  COMPLETED: { label: "Completata", variant: "secondary" },
  FAILED: { label: "Fallita", variant: "destructive" },
};

export function SearchHistoryTab() {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/searches")
      .then((res) => res.json())
      .then((data) => setSearches(Array.isArray(data) ? data : []))
      .catch(() => setSearches([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Storico Ricerche ({searches.length})
        </CardTitle>
        <CardDescription>
          Tutte le ricerche eseguite, con data e risultati.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessuna ricerca ancora eseguita.
          </p>
        ) : (
          <div className="space-y-2">
            {searches.map((s) => {
              const badge = STATUS_BADGES[s.status] || STATUS_BADGES.PENDING;
              return (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {s.query} — {s.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("it-IT", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                        {s.leadsFound > 0 && ` · ${s.leadsFound} lead trovati`}
                        {s.leadsWithWebsite > 0 && ` (${s.leadsWithWebsite} con sito)`}
                      </p>
                    </div>
                  </div>
                  <Link href={`/searches/${s.id}`} className="text-muted-foreground hover:text-foreground shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
