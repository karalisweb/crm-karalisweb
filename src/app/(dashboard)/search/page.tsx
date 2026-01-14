"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState("50");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || !location.trim()) {
      toast.error("Inserisci categoria e localita");
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
      toast.success(`Ricerca avviata! ID: ${data.searchId}`);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuova Ricerca</h1>
        <p className="text-muted-foreground">
          Cerca attivita su Google Maps per trovare nuovi lead
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parametri Ricerca</CardTitle>
          <CardDescription>
            Inserisci la categoria di attivita e la zona geografica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="query">Categoria</Label>
              <Input
                id="query"
                placeholder="es. Ristoranti, Hotel, Dentisti..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Tipo di attivita da cercare
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localita</Label>
              <Input
                id="location"
                placeholder="es. Milano centro, Roma EUR, Napoli..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Zona geografica della ricerca
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Numero massimo risultati</Label>
              <Input
                id="limit"
                type="number"
                min="10"
                max="100"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Consigliato: 50-100 per ottimizzare costi Apify
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Avvia Ricerca
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Esempi di Ricerca</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Ristoranti Milano centro</span> -
              Trova ristoranti nella zona centrale di Milano
            </p>
            <p>
              <span className="font-medium">Dentisti Roma EUR</span> -
              Studi dentistici nel quartiere EUR
            </p>
            <p>
              <span className="font-medium">Hotel Firenze</span> -
              Strutture alberghiere a Firenze
            </p>
            <p>
              <span className="font-medium">Palestre Torino</span> -
              Centri fitness a Torino
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
