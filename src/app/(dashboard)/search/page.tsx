"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  MapPin,
  Building2,
  Sparkles,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// Fallback quando il DB è vuoto
const defaultCategories = [
  { label: "Ristoranti", icon: "🍽️" },
  { label: "Hotel", icon: "🏨" },
  { label: "Dentisti", icon: "🦷" },
  { label: "Palestre", icon: "💪" },
  { label: "Parrucchieri", icon: "✂️" },
  { label: "Estetisti", icon: "💅" },
  { label: "Avvocati", icon: "⚖️" },
  { label: "Commercialisti", icon: "📊" },
];

const defaultLocations = [
  "Milano",
  "Roma",
  "Napoli",
  "Torino",
];

interface Category {
  id: string;
  label: string;
  icon: string;
  cluster: string;
  subcluster: string;
  priority: number;
}

interface Location {
  id: string;
  name: string;
  region: string;
  wave?: number;
  isCapoluogo: boolean;
}

const WAVE_COLORS: Record<number, string> = {
  1: "border-red-300 hover:bg-red-100",
  2: "border-orange-300 hover:bg-orange-100",
  3: "border-yellow-300 hover:bg-yellow-100",
};

const CLUSTER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  casa: { label: "Casa", icon: "🏠", color: "border-blue-300 bg-blue-50/50" },
  microturismo: { label: "Microturismo", icon: "🏡", color: "border-emerald-300 bg-emerald-50/50" },
};

const SUBCLUSTER_LABELS: Record<string, string> = {
  infissi: "Infissi e Serramenti",
  edilizia_alto: "Edilizia — Alto Volume",
  impiantistica: "Impiantistica",
  arredo: "Arredo",
  pavimenti: "Pavimenti e Rivestimenti",
  clima: "Clima",
  edilizia_finiture: "Edilizia — Finiture",
  edilizia_nicchia: "Edilizia — Nicchia",
  macchinari: "Macchinari",
  giardinaggio: "Giardinaggio",
  property_manager: "Property Manager",
  agenzie_immobiliari: "Agenzie Immobiliari",
  strutture_ricettive: "Strutture Ricettive",
  altro: "Altro",
};

function groupByCluster(categories: Category[]): Record<string, Record<string, Category[]>> {
  const result: Record<string, Record<string, Category[]>> = {};
  for (const cat of categories) {
    const cl = cat.cluster || "casa";
    const sub = cat.subcluster || "altro";
    if (!result[cl]) result[cl] = {};
    if (!result[cl][sub]) result[cl][sub] = [];
    result[cl][sub].push(cat);
  }
  // Sort by priority within each subcluster
  for (const cl of Object.keys(result)) {
    for (const sub of Object.keys(result[cl])) {
      result[cl][sub].sort((a, b) => a.priority - b.priority);
    }
  }
  return result;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("50");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  // Configurazioni da DB
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch("/api/settings/search-config");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Error fetching search config:", error);
    } finally {
      setConfigLoading(false);
    }
  }

  const clusteredCategories = groupByCluster(categories);

  const displayLocations = locations.length > 0
    ? locations
    : defaultLocations.map(name => ({ id: name, name, wave: 1 }));

  const toggleSub = (key: string) => {
    setCollapsedSubs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || !location.trim()) {
      toast.error("Inserisci categoria e località");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          location: location.trim(),
          limit: parseInt(limit),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore durante la ricerca");
      }

      const data = await response.json();
      toast.success(`Ricerca avviata! Trovati ${data.leadsFound || 0} lead`);

      // Redirect alla pagina dei risultati
      router.push(`/leads?searchId=${data.searchId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore durante la ricerca"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCategory = (category: string) => {
    setQuery(category);
  };

  const handleQuickLocation = (loc: string) => {
    setLocation(loc);
  };

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header - Mobile optimized */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Nuova Ricerca</h1>
        <p className="text-sm text-muted-foreground">
          Trova nuovi lead su Google Maps
        </p>
      </div>

      {/* Categorie per Cluster > Subcluster */}
      {configLoading ? (
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(CLUSTER_INFO).map(([clusterKey, info]) => {
            const subclusters = clusteredCategories[clusterKey];
            if (!subclusters) return null;
            return (
              <div key={clusterKey} className={`border rounded-xl overflow-hidden ${info.color}`}>
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="font-semibold text-sm">{info.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Object.values(subclusters).reduce((s, c) => s + c.length, 0)})
                  </span>
                </div>
                <div className="bg-background/80 px-2 pb-2 space-y-1">
                  {Object.entries(subclusters).map(([subKey, cats]) => {
                    const subLabel = SUBCLUSTER_LABELS[subKey] || subKey;
                    const groupKey = `${clusterKey}_${subKey}`;
                    const collapsed = collapsedSubs.has(groupKey);
                    return (
                      <div key={groupKey}>
                        <button
                          onClick={() => toggleSub(groupKey)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {subLabel} ({cats.length})
                        </button>
                        {!collapsed && (
                          <div className="flex gap-1.5 flex-wrap px-2 pb-1.5">
                            {cats.map((cat) => (
                              <Badge
                                key={cat.id}
                                variant={query === cat.label ? "default" : "outline"}
                                className="cursor-pointer px-2.5 py-1 text-xs hover:bg-primary/20 transition-colors"
                                onClick={() => handleQuickCategory(cat.label)}
                              >
                                <span className="mr-1">{cat.icon}</span>
                                {cat.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {defaultCategories.map((cat) => (
            <Badge
              key={cat.label}
              variant={query === cat.label ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/20 transition-colors"
              onClick={() => handleQuickCategory(cat.label)}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Search Form - Mobile first card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="query" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Categoria
              </Label>
              <Input
                id="query"
                placeholder="es. Ristoranti, Dentisti..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                className="h-12 text-base"
              />
            </div>

            {/* Località */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Località
              </Label>
              <Input
                id="location"
                placeholder="es. Milano, Roma centro..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                className="h-12 text-base"
              />
              {/* Location per regione */}
              <div className="space-y-2 pt-1">
                {configLoading ? (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-6 w-16" />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const byRegion: Record<string, Location[]> = {};
                    for (const loc of displayLocations) {
                      const r = (loc as Location).region || "Altro";
                      if (!byRegion[r]) byRegion[r] = [];
                      byRegion[r].push(loc as Location);
                    }
                    return Object.entries(byRegion).map(([region, locs]) => (
                      <div key={region} className="flex items-start gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium min-w-[90px] pt-1 shrink-0">{region}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {locs.map((loc) => (
                            <Badge
                              key={loc.id}
                              variant={location === loc.name ? "default" : "outline"}
                              className={`cursor-pointer text-xs transition-colors ${
                                location === loc.name
                                  ? ""
                                  : WAVE_COLORS[loc.wave || 1] || ""
                              }`}
                              onClick={() => handleQuickLocation(loc.name)}
                            >
                              {loc.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            {/* Limite risultati - Slider style */}
            <div className="space-y-2">
              <Label htmlFor="limit" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Numero lead
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="limit"
                  type="number"
                  min="10"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  disabled={loading}
                  className="h-12 text-base w-24 text-center"
                />
                <div className="flex gap-2">
                  {["20", "50", "100"].map((val) => (
                    <Badge
                      key={val}
                      variant={limit === val ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => setLimit(val)}
                    >
                      {val}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Consigliato: 50 per bilanciare qualità e costi
              </p>
            </div>

            {/* Submit button - Full width on mobile */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading || !query.trim() || !location.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Avvia Ricerca
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview card */}
      {query && location && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cercherai</p>
                <p className="font-semibold text-primary">
                  {query} a {location}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fino a {limit} risultati
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Examples - Compact on mobile */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Esempi di ricerca</p>
          <div className="space-y-2">
            {[
              { query: "Ristoranti", location: "Milano centro", desc: "Food & Beverage" },
              { query: "Dentisti", location: "Roma EUR", desc: "Healthcare" },
              { query: "Palestre", location: "Torino", desc: "Fitness" },
            ].map((example, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                onClick={() => {
                  setQuery(example.query);
                  setLocation(example.location);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {example.query} - {example.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {example.desc}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Usa
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
