"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Building2, MapPin, Search, X, ChevronDown, ChevronRight } from "lucide-react";

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

const emojiOptions = [
  "🏢", "🍽️", "🏨", "🦷", "💪", "✂️", "💅", "⚖️", "📊", "🏥",
  "🚗", "🏠", "🎨", "📸", "🎵", "🐕", "🌿", "💻", "📚", "🔧"
];

// Raggruppa categorie per tipo in base a keyword nel nome
function groupCategories(categories: Category[]): Record<string, Category[]> {
  const groups: Record<string, string[]> = {
    "Arredamento & Design": ["arredamento", "interior", "design", "mobili", "showroom", "architett", "consulente di arredamento"],
    "Salute & Benessere": ["dentist", "odontoiat", "ottic", "occhiali", "fisioterapi", "radiolog", "diagnostica", "sanitari", "medicali", "cliniche"],
    "Beauty & Fitness": ["estetico", "bellezza", "salone", "fitness", "personal trainer", "parrucchi"],
    "Ristorazione & Hospitality": ["ristorante", "hotel", "b&b", "bed", "affittacamere", "agriturismo", "gourmet", "fine dining"],
    "Edilizia & Impiantistica": ["infissi", "serrament", "finestre", "edil", "costruzion", "impianti", "condizionamento", "domotici", "elettric", "piscin", "ceramich", "ceramica", "materiali"],
    "Immobiliare": ["immobiliar", "property", "affitti"],
    "Eventi & Wedding": ["event", "matrimoni", "wedding", "organizzat"],
    "Servizi & Noleggio": ["noleggio", "piattaforme", "sollevamento", "attrezzatur", "macchinari"],
    "Verde & Outdoor": ["giardinier", "paesaggio", "manutenzione del verde"],
    "Moda & Artigianato": ["sart", "laboratorio", "ceramica"],
  };

  const result: Record<string, Category[]> = {};
  const assigned = new Set<string>();

  for (const [groupName, keywords] of Object.entries(groups)) {
    const matching = categories.filter((cat) =>
      keywords.some((kw) => cat.label.toLowerCase().includes(kw)) && !assigned.has(cat.id)
    );
    if (matching.length > 0) {
      result[groupName] = matching;
      matching.forEach((m) => assigned.add(m.id));
    }
  }

  // Tutto ciò che non è stato assegnato va in "Altro"
  const unassigned = categories.filter((cat) => !assigned.has(cat.id));
  if (unassigned.length > 0) {
    result["Altro"] = unassigned;
  }

  return result;
}

export function SearchConfigTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
    } catch {
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
    } catch {
      toast.error("Errore nell'aggiunta citta");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Eliminare questa categoria?")) return;
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
    } catch {
      toast.error("Errore nell'eliminazione categoria");
    }
  }

  async function deleteLocation(id: string) {
    if (!confirm("Eliminare questa citta?")) return;
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
    } catch {
      toast.error("Errore nell'eliminazione citta");
    }
  }

  // Categorie filtrate e raggruppate
  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    return categories.filter((c) =>
      c.label.toLowerCase().includes(catSearch.toLowerCase())
    );
  }, [categories, catSearch]);

  const groupedCategories = useMemo(
    () => groupCategories(filteredCategories),
    [filteredCategories]
  );

  // Città filtrate e ordinate alfabeticamente
  const filteredLocations = useMemo(() => {
    let locs = locations;
    if (locSearch.trim()) {
      locs = locs.filter((l) =>
        l.name.toLowerCase().includes(locSearch.toLowerCase())
      );
    }
    return [...locs].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations, locSearch]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (loading) {
    return <p className="text-muted-foreground">Caricamento...</p>;
  }

  return (
    <div className="space-y-6">
      {/* ========== CATEGORIE ========== */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Categorie ({categories.length})
            </CardTitle>
            <CardDescription>
              Scorciatoie per la pagina Nuova Ricerca
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
                <Button onClick={addCategory}>Aggiungi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Cerca categoria..."
              className="pl-9 h-9"
            />
            {catSearch && (
              <button
                onClick={() => setCatSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Gruppi */}
          {Object.keys(groupedCategories).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {catSearch ? "Nessuna categoria trovata" : "Nessuna categoria configurata"}
            </p>
          ) : (
            <div className="space-y-1">
              {Object.entries(groupedCategories).map(([groupName, cats]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                return (
                  <div key={groupName} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-sm font-medium flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        {groupName}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({cats.length})
                        </span>
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {cats.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md hover:bg-muted/40 group text-sm"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{cat.icon}</span>
                              <span className="truncate">{cat.label}</span>
                            </span>
                            <button
                              onClick={() => deleteCategory(cat.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== CITTA ========== */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Citta ({locations.length})
            </CardTitle>
            <CardDescription>
              Scorciatoie per la pagina Nuova Ricerca
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
                <Button onClick={addLocation}>Aggiungi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              placeholder="Cerca citta..."
              className="pl-9 h-9"
            />
            {locSearch && (
              <button
                onClick={() => setLocSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {locSearch ? "Nessuna citta trovata" : "Nessuna citta configurata"}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between gap-1 px-3 py-1.5 rounded-md hover:bg-muted/40 group text-sm"
                >
                  <span className="truncate">{loc.name}</span>
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
