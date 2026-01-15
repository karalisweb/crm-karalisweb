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
}

interface Location {
  id: string;
  name: string;
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

  // Usa configurazioni da DB o fallback
  const displayCategories = categories.length > 0
    ? categories.map(c => ({ label: c.label, icon: c.icon }))
    : defaultCategories;

  const displayLocations = locations.length > 0
    ? locations.map(l => l.name)
    : defaultLocations;

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

      {/* Quick Categories - Wrap on mobile instead of scroll */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Categorie popolari
        </p>
        {configLoading ? (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {displayCategories.map((cat) => (
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
      </div>

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
              {/* Quick location chips */}
              <div className="flex gap-2 flex-wrap pt-1">
                {configLoading ? (
                  <>
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-6 w-16" />
                    ))}
                  </>
                ) : (
                  displayLocations.slice(0, 6).map((loc) => (
                    <Badge
                      key={loc}
                      variant={location === loc ? "default" : "secondary"}
                      className="cursor-pointer text-xs hover:bg-primary/20 transition-colors"
                      onClick={() => handleQuickLocation(loc)}
                    >
                      {loc}
                    </Badge>
                  ))
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
