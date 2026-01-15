"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Building2, MapPin } from "lucide-react";

interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
}

interface Location {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

// Emoji picker semplice per le categorie
const emojiOptions = [
  "🏢", "🍽️", "🏨", "🦷", "💪", "✂️", "💅", "⚖️", "📊", "🏥",
  "🚗", "🏠", "🎨", "📸", "🎵", "🐕", "🌿", "💻", "📚", "🔧"
];

export function SearchConfigTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: "", icon: "🏢" });
  const [newLocation, setNewLocation] = useState({ name: "" });

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
      setLoading(false);
    }
  }

  async function addCategory() {
    if (!newCategory.label.trim()) {
      toast.error("Inserisci il nome della categoria");
      return;
    }

    try {
      const res = await fetch("/api/settings/search-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          label: newCategory.label.trim(),
          icon: newCategory.icon,
          order: categories.length,
        }),
      });

      if (res.ok) {
        toast.success("Categoria aggiunta");
        setNewCategory({ label: "", icon: "🏢" });
        setCategoryDialogOpen(false);
        fetchConfig();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nell'aggiunta");
      }
    } catch (error) {
      toast.error("Errore nell'aggiunta categoria");
    }
  }

  async function addLocation() {
    if (!newLocation.name.trim()) {
      toast.error("Inserisci il nome della citta");
      return;
    }

    try {
      const res = await fetch("/api/settings/search-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "location",
          name: newLocation.name.trim(),
          order: locations.length,
        }),
      });

      if (res.ok) {
        toast.success("Citta aggiunta");
        setNewLocation({ name: "" });
        setLocationDialogOpen(false);
        fetchConfig();
      } else {
        const error = await res.json();
        toast.error(error.error || "Errore nell'aggiunta");
      }
    } catch (error) {
      toast.error("Errore nell'aggiunta citta");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa categoria?")) return;

    try {
      const res = await fetch(`/api/settings/search-config?type=category&id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Categoria eliminata");
        fetchConfig();
      } else {
        toast.error("Errore nell'eliminazione");
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione categoria");
    }
  }

  async function deleteLocation(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa citta?")) return;

    try {
      const res = await fetch(`/api/settings/search-config?type=location&id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Citta eliminata");
        fetchConfig();
      } else {
        toast.error("Errore nell'eliminazione");
      }
    } catch (error) {
      toast.error("Errore nell'eliminazione citta");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Caricamento...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Categorie */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Categorie Popolari
            </CardTitle>
            <CardDescription>
              Le categorie mostrate come scorciatoie nella pagina di ricerca
            </CardDescription>
          </div>
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Categoria</DialogTitle>
                <DialogDescription>
                  Aggiungi una categoria rapida per la ricerca
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="catLabel">Nome categoria</Label>
                  <Input
                    id="catLabel"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                    placeholder="es. Ristoranti, Dentisti..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icona</Label>
                  <div className="flex flex-wrap gap-2">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                          newCategory.icon === emoji
                            ? "border-primary bg-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={addCategory}>Aggiungi Categoria</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna categoria configurata. Aggiungi la prima!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg group"
                >
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.label}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Citta */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Citta Rapide
            </CardTitle>
            <CardDescription>
              Le citta mostrate come scorciatoie nella pagina di ricerca
            </CardDescription>
          </div>
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Citta</DialogTitle>
                <DialogDescription>
                  Aggiungi una citta rapida per la ricerca
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="locName">Nome citta</Label>
                  <Input
                    id="locName"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ name: e.target.value })}
                    placeholder="es. Milano, Roma centro..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={addLocation}>Aggiungi Citta</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna citta configurata. Aggiungi la prima!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg group"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{loc.name}</span>
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Suggerimento:</strong> Le categorie e citta configurate
            appariranno nella pagina &quot;Nuova Ricerca&quot; come scorciatoie rapide per velocizzare
            l&apos;inserimento dei dati.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
