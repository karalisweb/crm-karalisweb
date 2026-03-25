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
import { Plus, Trash2, Building2, MapPin, Search, X, ChevronDown, ChevronRight, Pencil, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
  cluster: string;
  subcluster: string;
  priority: number;
}

const CLUSTER_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  casa: { label: "Casa", icon: "🏠", color: "text-blue-700 bg-blue-50 border-blue-200" },
  microturismo: { label: "Microturismo", icon: "🏡", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

const SUBCLUSTER_OPTIONS: Record<string, { label: string; priority: number }[]> = {
  casa: [
    { label: "infissi", priority: 10 },
    { label: "edilizia_alto", priority: 15 },
    { label: "impiantistica", priority: 20 },
    { label: "arredo", priority: 25 },
    { label: "pavimenti", priority: 30 },
    { label: "clima", priority: 35 },
    { label: "edilizia_finiture", priority: 40 },
    { label: "edilizia_nicchia", priority: 45 },
    { label: "macchinari", priority: 50 },
    { label: "giardinaggio", priority: 55 },
  ],
  microturismo: [
    { label: "property_manager", priority: 10 },
    { label: "agenzie_immobiliari", priority: 20 },
    { label: "strutture_ricettive", priority: 30 },
  ],
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
  macchinari: "Macchinari Edilizia",
  giardinaggio: "Giardinaggio",
  property_manager: "Case Vacanza e Property Manager",
  agenzie_immobiliari: "Agenzie Immobiliari",
  strutture_ricettive: "Strutture Ricettive Boutique",
  altro: "Altro",
};

interface Location {
  id: string;
  name: string;
  order: number;
  active: boolean;
  wave: number;
}

const emojiOptions = [
  "🏢", "🍽️", "🏨", "🦷", "💪", "✂️", "💅", "⚖️", "📊", "🏥",
  "🚗", "🏠", "🎨", "📸", "🎵", "🐕", "🌿", "💻", "📚", "🔧"
];

// Mappa città → regione + abitanti (capoluoghi e città principali italiane)
const CITY_DATA: Record<string, { regione: string; abitanti: number }> = {
  // Lombardia
  "milano": { regione: "Lombardia", abitanti: 1396059 },
  "brescia": { regione: "Lombardia", abitanti: 196745 },
  "monza": { regione: "Lombardia", abitanti: 124197 },
  "bergamo": { regione: "Lombardia", abitanti: 122946 },
  "como": { regione: "Lombardia", abitanti: 84834 },
  "varese": { regione: "Lombardia", abitanti: 80929 },
  "cremona": { regione: "Lombardia", abitanti: 72672 },
  "pavia": { regione: "Lombardia", abitanti: 73086 },
  "mantova": { regione: "Lombardia", abitanti: 49482 },
  "lecco": { regione: "Lombardia", abitanti: 48637 },
  "lodi": { regione: "Lombardia", abitanti: 47305 },
  "sondrio": { regione: "Lombardia", abitanti: 21876 },
  "lumezzane": { regione: "Lombardia", abitanti: 22478 },
  // Lazio
  "roma": { regione: "Lazio", abitanti: 2761632 },
  "latina": { regione: "Lazio", abitanti: 127279 },
  "frosinone": { regione: "Lazio", abitanti: 45803 },
  "viterbo": { regione: "Lazio", abitanti: 67798 },
  "civita castellana": { regione: "Lazio", abitanti: 16217 },
  "rieti": { regione: "Lazio", abitanti: 47656 },
  // Campania
  "napoli": { regione: "Campania", abitanti: 914758 },
  "salerno": { regione: "Campania", abitanti: 129234 },
  "caserta": { regione: "Campania", abitanti: 76326 },
  "avellino": { regione: "Campania", abitanti: 53407 },
  "benevento": { regione: "Campania", abitanti: 58958 },
  // Piemonte
  "torino": { regione: "Piemonte", abitanti: 848885 },
  "novara": { regione: "Piemonte", abitanti: 104183 },
  "alessandria": { regione: "Piemonte", abitanti: 92816 },
  "asti": { regione: "Piemonte", abitanti: 75521 },
  "cuneo": { regione: "Piemonte", abitanti: 56116 },
  "vercelli": { regione: "Piemonte", abitanti: 45999 },
  "biella": { regione: "Piemonte", abitanti: 43818 },
  "verbania": { regione: "Piemonte", abitanti: 30541 },
  "valenza": { regione: "Piemonte", abitanti: 19287 },
  "alba": { regione: "Piemonte", abitanti: 31437 },
  "langhirano": { regione: "Emilia-Romagna", abitanti: 10461 },
  // Veneto
  "venezia": { regione: "Veneto", abitanti: 254661 },
  "verona": { regione: "Veneto", abitanti: 259608 },
  "padova": { regione: "Veneto", abitanti: 212395 },
  "vicenza": { regione: "Veneto", abitanti: 112953 },
  "treviso": { regione: "Veneto", abitanti: 85308 },
  "rovigo": { regione: "Veneto", abitanti: 51149 },
  "belluno": { regione: "Veneto", abitanti: 35596 },
  "montebelluna": { regione: "Veneto", abitanti: 31361 },
  "arzignano": { regione: "Veneto", abitanti: 25686 },
  // Emilia-Romagna
  "bologna": { regione: "Emilia-Romagna", abitanti: 394463 },
  "modena": { regione: "Emilia-Romagna", abitanti: 187938 },
  "parma": { regione: "Emilia-Romagna", abitanti: 198292 },
  "reggio emilia": { regione: "Emilia-Romagna", abitanti: 172525 },
  "ravenna": { regione: "Emilia-Romagna", abitanti: 160275 },
  "rimini": { regione: "Emilia-Romagna", abitanti: 151200 },
  "ferrara": { regione: "Emilia-Romagna", abitanti: 130992 },
  "forlì": { regione: "Emilia-Romagna", abitanti: 117913 },
  "forli": { regione: "Emilia-Romagna", abitanti: 117913 },
  "cesena": { regione: "Emilia-Romagna", abitanti: 97484 },
  "piacenza": { regione: "Emilia-Romagna", abitanti: 104458 },
  "sassuolo": { regione: "Emilia-Romagna", abitanti: 40890 },
  "carpi": { regione: "Emilia-Romagna", abitanti: 72629 },
  "faenza": { regione: "Emilia-Romagna", abitanti: 58786 },
  "san mauro pascoli": { regione: "Emilia-Romagna", abitanti: 12018 },
  // Toscana
  "firenze": { regione: "Toscana", abitanti: 367048 },
  "prato": { regione: "Toscana", abitanti: 195089 },
  "livorno": { regione: "Toscana", abitanti: 157052 },
  "arezzo": { regione: "Toscana", abitanti: 99543 },
  "pisa": { regione: "Toscana", abitanti: 91104 },
  "lucca": { regione: "Toscana", abitanti: 89539 },
  "pistoia": { regione: "Toscana", abitanti: 90315 },
  "grosseto": { regione: "Toscana", abitanti: 82259 },
  "siena": { regione: "Toscana", abitanti: 53903 },
  "massa": { regione: "Toscana", abitanti: 68872 },
  "santa croce sull'arno": { regione: "Toscana", abitanti: 14702 },
  // Sicilia
  "palermo": { regione: "Sicilia", abitanti: 630828 },
  "catania": { regione: "Sicilia", abitanti: 300356 },
  "messina": { regione: "Sicilia", abitanti: 227424 },
  "siracusa": { regione: "Sicilia", abitanti: 119056 },
  "ragusa": { regione: "Sicilia", abitanti: 73756 },
  "trapani": { regione: "Sicilia", abitanti: 68370 },
  "agrigento": { regione: "Sicilia", abitanti: 58183 },
  "caltanissetta": { regione: "Sicilia", abitanti: 60221 },
  "enna": { regione: "Sicilia", abitanti: 26396 },
  // Puglia
  "bari": { regione: "Puglia", abitanti: 316140 },
  "taranto": { regione: "Puglia", abitanti: 192359 },
  "foggia": { regione: "Puglia", abitanti: 148895 },
  "lecce": { regione: "Puglia", abitanti: 95441 },
  "brindisi": { regione: "Puglia", abitanti: 86262 },
  "andria": { regione: "Puglia", abitanti: 99028 },
  "barletta": { regione: "Puglia", abitanti: 94239 },
  // Sardegna
  "cagliari": { regione: "Sardegna", abitanti: 151005 },
  "sassari": { regione: "Sardegna", abitanti: 126769 },
  "quartu sant'elena": { regione: "Sardegna", abitanti: 70879 },
  "olbia": { regione: "Sardegna", abitanti: 63223 },
  "nuoro": { regione: "Sardegna", abitanti: 35003 },
  "oristano": { regione: "Sardegna", abitanti: 30778 },
  // Calabria
  "reggio calabria": { regione: "Calabria", abitanti: 175165 },
  "catanzaro": { regione: "Calabria", abitanti: 85799 },
  "cosenza": { regione: "Calabria", abitanti: 66809 },
  "crotone": { regione: "Calabria", abitanti: 63941 },
  "vibo valentia": { regione: "Calabria", abitanti: 32640 },
  // Liguria
  "genova": { regione: "Liguria", abitanti: 566410 },
  "la spezia": { regione: "Liguria", abitanti: 94192 },
  "savona": { regione: "Liguria", abitanti: 60640 },
  "imperia": { regione: "Liguria", abitanti: 42754 },
  // Friuli Venezia Giulia
  "trieste": { regione: "Friuli Venezia Giulia", abitanti: 204338 },
  "udine": { regione: "Friuli Venezia Giulia", abitanti: 99518 },
  "pordenone": { regione: "Friuli Venezia Giulia", abitanti: 51127 },
  "gorizia": { regione: "Friuli Venezia Giulia", abitanti: 34411 },
  "manzano": { regione: "Friuli Venezia Giulia", abitanti: 6508 },
  // Marche
  "ancona": { regione: "Marche", abitanti: 100282 },
  "pesaro": { regione: "Marche", abitanti: 96786 },
  "pesaro-urbino": { regione: "Marche", abitanti: 96786 },
  "fano": { regione: "Marche", abitanti: 60888 },
  "civitanova marche": { regione: "Marche", abitanti: 41548 },
  "ascoli piceno": { regione: "Marche", abitanti: 48656 },
  "macerata": { regione: "Marche", abitanti: 42468 },
  "fermo": { regione: "Marche", abitanti: 37341 },
  "montegranaro": { regione: "Marche", abitanti: 12584 },
  // Abruzzo
  "pescara": { regione: "Abruzzo", abitanti: 121014 },
  "l'aquila": { regione: "Abruzzo", abitanti: 69753 },
  "chieti": { regione: "Abruzzo", abitanti: 49898 },
  "teramo": { regione: "Abruzzo", abitanti: 54591 },
  // Umbria
  "perugia": { regione: "Umbria", abitanti: 166134 },
  "terni": { regione: "Umbria", abitanti: 111501 },
  // Trentino-Alto Adige
  "trento": { regione: "Trentino-Alto Adige", abitanti: 119121 },
  "bolzano": { regione: "Trentino-Alto Adige", abitanti: 108245 },
  // Basilicata
  "potenza": { regione: "Basilicata", abitanti: 66083 },
  "matera": { regione: "Basilicata", abitanti: 60797 },
  // Molise
  "campobasso": { regione: "Molise", abitanti: 49762 },
  "isernia": { regione: "Molise", abitanti: 21620 },
  // Valle d'Aosta
  "aosta": { regione: "Valle d'Aosta", abitanti: 33916 },
};

const WAVE_CONFIG: Record<number, { label: string; color: string; badge: string; description: string }> = {
  1: { label: "Ondata 1", color: "text-red-600 bg-red-50 border-red-200", badge: "bg-red-500", description: "Province principali" },
  2: { label: "Ondata 2", color: "text-orange-600 bg-orange-50 border-orange-200", badge: "bg-orange-500", description: "Province minori" },
  3: { label: "Ondata 3", color: "text-yellow-600 bg-yellow-50 border-yellow-200", badge: "bg-yellow-500", description: "Distretti merceologici" },
};

function formatAbitanti(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toString();
}

function getCityInfo(name: string): { regione: string; abitanti: number } | null {
  const normalized = name.toLowerCase().trim()
    .replace(/\s+centro$/i, "")
    .replace(/\s+nord$/i, "")
    .replace(/\s+sud$/i, "")
    .replace(/\s+est$/i, "")
    .replace(/\s+ovest$/i, "")
    .replace(/\s+provincia$/i, "")
    .trim();
  return CITY_DATA[normalized] || null;
}

function groupLocationsByRegion(locations: Location[]): Record<string, (Location & { info: { regione: string; abitanti: number } | null })[]> {
  const result: Record<string, (Location & { info: { regione: string; abitanti: number } | null })[]> = {};

  for (const loc of locations) {
    const info = getCityInfo(loc.name);
    const regione = info?.regione || "Altro";
    if (!result[regione]) result[regione] = [];
    result[regione].push({ ...loc, info });
  }

  // Ordina regioni: prima per numero di città desc, "Altro" sempre in fondo
  const sorted: Record<string, (Location & { info: { regione: string; abitanti: number } | null })[]> = {};
  const keys = Object.keys(result).sort((a, b) => {
    if (a === "Altro") return 1;
    if (b === "Altro") return -1;
    return result[b].length - result[a].length;
  });
  for (const k of keys) {
    // Ordina città dentro la regione per abitanti desc
    sorted[k] = result[k].sort((a, b) => (b.info?.abitanti || 0) - (a.info?.abitanti || 0));
  }
  return sorted;
}

function groupCategoriesByCluster(categories: Category[]): Record<string, Record<string, Category[]>> {
  const result: Record<string, Record<string, Category[]>> = {};
  for (const cat of categories) {
    const cluster = cat.cluster || "casa";
    const sub = cat.subcluster || "altro";
    if (!result[cluster]) result[cluster] = {};
    if (!result[cluster][sub]) result[cluster][sub] = [];
    result[cluster][sub].push(cat);
  }
  // Sort subclusters by priority within each cluster
  for (const cluster of Object.keys(result)) {
    const subs = SUBCLUSTER_OPTIONS[cluster] || [];
    const ordered: Record<string, Category[]> = {};
    for (const s of subs) {
      if (result[cluster][s.label]) {
        ordered[s.label] = result[cluster][s.label].sort((a, b) => a.priority - b.priority);
      }
    }
    // Add any subclusters not in the predefined list
    for (const [sub, cats] of Object.entries(result[cluster])) {
      if (!ordered[sub]) ordered[sub] = cats.sort((a, b) => a.priority - b.priority);
    }
    result[cluster] = ordered;
  }
  return result;
}

export function SearchConfigTab({ section = "all" }: { section?: "categories" | "locations" | "all" }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: "", icon: "🏢", cluster: "casa", subcluster: "arredo", priority: 50 });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newLocation, setNewLocation] = useState({ name: "", wave: 1 });

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
          cluster: newCategory.cluster,
          subcluster: newCategory.subcluster,
          priority: newCategory.priority,
        }),
      });
      if (res.ok) {
        toast.success("Categoria aggiunta");
        setNewCategory({ label: "", icon: "🏢", cluster: "casa", subcluster: "arredo", priority: 50 });
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

  async function reorderItem(type: "category" | "location", id: string, direction: "up" | "down") {
    const items = type === "category" ? categories : locations;
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const current = sorted[idx];
    const swap = sorted[swapIdx];

    // Swap orders
    try {
      await Promise.all([
        fetch("/api/settings/search-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id: current.id, order: swap.order }),
        }),
        fetch("/api/settings/search-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id: swap.id, order: current.order }),
        }),
      ]);
      fetchConfig();
    } catch {
      toast.error("Errore nel riordino");
    }
  }

  async function updateCategory(id: string, data: Partial<Category>) {
    try {
      const res = await fetch("/api/settings/search-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", id, ...data }),
      });
      if (res.ok) {
        toast.success("Categoria aggiornata");
        setEditingCategory(null);
        fetchConfig();
      } else {
        toast.error("Errore nell'aggiornamento");
      }
    } catch {
      toast.error("Errore nell'aggiornamento");
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
          wave: newLocation.wave,
        }),
      });
      if (res.ok) {
        toast.success("Citta aggiunta");
        setNewLocation({ name: "", wave: 1 });
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

  async function updateLocationWave(id: string, wave: number) {
    try {
      const res = await fetch("/api/settings/search-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "location", id, wave }),
      });
      if (res.ok) {
        toast.success(`Spostata in ${WAVE_CONFIG[wave].label}`);
        fetchConfig();
      } else {
        toast.error("Errore nello spostamento");
      }
    } catch {
      toast.error("Errore nello spostamento");
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
    () => groupCategoriesByCluster(filteredCategories),
    [filteredCategories]
  );

  // Città filtrate e raggruppate per regione
  const filteredLocations = useMemo(() => {
    let locs = locations;
    if (locSearch.trim()) {
      const q = locSearch.toLowerCase();
      locs = locs.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        (getCityInfo(l.name)?.regione.toLowerCase().includes(q))
      );
    }
    return locs;
  }, [locations, locSearch]);

  const locationsByWave = useMemo(() => {
    const byWave: Record<number, Location[]> = { 1: [], 2: [], 3: [] };
    for (const loc of filteredLocations) {
      const w = loc.wave || 1;
      if (!byWave[w]) byWave[w] = [];
      byWave[w].push(loc);
    }
    return byWave;
  }, [filteredLocations]);

  const groupedLocationsByWave = useMemo(() => {
    const result: Record<number, Record<string, (Location & { info: { regione: string; abitanti: number } | null })[]>> = {};
    for (const [wave, locs] of Object.entries(locationsByWave)) {
      result[Number(wave)] = groupLocationsByRegion(locs);
    }
    return result;
  }, [locationsByWave]);

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
      {(section === "all" || section === "categories") && <>
      {/* ========== CATEGORIE ========== */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Categorie GMB ({categories.length})
            </CardTitle>
            <CardDescription>
              Organizzate per Cluster e Sottocluster. Clicca la matita per modificare.
            </CardDescription>
          </div>
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuova Categoria</DialogTitle>
                <DialogDescription>Categoria GMB per il prospecting</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome categoria GMB</Label>
                  <Input
                    value={newCategory.label}
                    onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                    placeholder="es. Negozio di infissi"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cluster</Label>
                    <Select value={newCategory.cluster} onValueChange={(v) => {
                      const subs = SUBCLUSTER_OPTIONS[v] || [];
                      setNewCategory({ ...newCategory, cluster: v, subcluster: subs[0]?.label || "altro" });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLUSTER_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sottocluster</Label>
                    <Select value={newCategory.subcluster} onValueChange={(v) => setNewCategory({ ...newCategory, subcluster: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(SUBCLUSTER_OPTIONS[newCategory.cluster] || []).map((s) => (
                          <SelectItem key={s.label} value={s.label}>{SUBCLUSTER_LABELS[s.label] || s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Icona</Label>
                  <div className="flex flex-wrap gap-2">
                    {emojiOptions.map((emoji) => (
                      <button key={emoji} type="button"
                        className={`w-9 h-9 text-lg rounded-lg border transition-colors ${newCategory.icon === emoji ? "border-primary bg-primary/20" : "border-border hover:border-primary/50"}`}
                        onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                      >{emoji}</button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Annulla</Button>
                <Button onClick={addCategory}>Aggiungi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Cerca categoria, sottocluster o cluster..." className="pl-9 h-9" />
            {catSearch && (
              <button onClick={() => setCatSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nessuna categoria configurata</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(CLUSTER_CONFIG).map(([clusterKey, clusterConf]) => {
                const subclusters = groupedCategories[clusterKey] || {};
                const clusterCount = Object.values(subclusters).reduce((sum, cats) => sum + cats.length, 0);
                const isClusterCollapsed = collapsedGroups.has(`cluster_${clusterKey}`);

                return (
                  <div key={clusterKey} className={`border rounded-xl overflow-hidden ${clusterConf.color}`}>
                    <button
                      onClick={() => toggleGroup(`cluster_${clusterKey}`)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-semibold flex items-center gap-2">
                        {isClusterCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="text-lg">{clusterConf.icon}</span>
                        Cluster {clusterConf.label}
                        <span className="text-xs font-normal opacity-70">({clusterCount})</span>
                      </span>
                    </button>

                    {!isClusterCollapsed && (
                      <div className="bg-background px-2 pb-2 space-y-1">
                        {clusterCount === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">Nessuna categoria in questo cluster</p>
                        ) : (
                          Object.entries(subclusters).map(([subKey, cats]) => {
                            const subLabel = SUBCLUSTER_LABELS[subKey] || subKey;
                            const groupKey = `cluster_${clusterKey}_${subKey}`;
                            const isSubCollapsed = collapsedGroups.has(groupKey);
                            return (
                              <div key={groupKey} className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleGroup(groupKey)}
                                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    {isSubCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                    {subLabel}
                                    <span className="text-xs text-muted-foreground font-normal">({cats.length})</span>
                                  </span>
                                </button>
                                {!isSubCollapsed && (
                                  <div className="px-3 py-2 space-y-0.5">
                                    {cats.map((cat, catIdx) => (
                                      <div key={cat.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 group text-sm">
                                        <span className="flex items-center gap-2 min-w-0">
                                          <span className="text-base shrink-0">{cat.icon}</span>
                                          <span className="truncate">{cat.label}</span>
                                        </span>
                                        <span className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            onClick={() => reorderItem("category", cat.id, "up")}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ${catIdx === 0 ? "invisible" : ""}`}
                                          >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => reorderItem("category", cat.id, "down")}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ${catIdx === cats.length - 1 ? "invisible" : ""}`}
                                          >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setEditingCategory(cat)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => deleteCategory(cat.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== EDIT CATEGORY DIALOG ========== */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editingCategory.label} onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cluster</Label>
                  <Select value={editingCategory.cluster} onValueChange={(v) => {
                    const subs = SUBCLUSTER_OPTIONS[v] || [];
                    setEditingCategory({ ...editingCategory, cluster: v, subcluster: subs[0]?.label || "altro" });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLUSTER_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sottocluster</Label>
                  <Select value={editingCategory.subcluster} onValueChange={(v) => setEditingCategory({ ...editingCategory, subcluster: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(SUBCLUSTER_OPTIONS[editingCategory.cluster] || []).map((s) => (
                        <SelectItem key={s.label} value={s.label}>{SUBCLUSTER_LABELS[s.label] || s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icona</Label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button key={emoji} type="button"
                      className={`w-9 h-9 text-lg rounded-lg border transition-colors ${editingCategory.icon === emoji ? "border-primary bg-primary/20" : "border-border hover:border-primary/50"}`}
                      onClick={() => setEditingCategory({ ...editingCategory, icon: emoji })}
                    >{emoji}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>Annulla</Button>
            <Button onClick={() => editingCategory && updateCategory(editingCategory.id, {
              label: editingCategory.label,
              icon: editingCategory.icon,
              cluster: editingCategory.cluster,
              subcluster: editingCategory.subcluster,
            })}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </>}

      {(section === "all" || section === "locations") && <>
      {/* ========== CITTA ========== */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Citta ({locations.length})
            </CardTitle>
            <CardDescription>
              Organizzate per ondata di priorita. Clicca 1/2/3 per spostare.
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
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="es. Modena, Sassuolo..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ondata</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setNewLocation({ ...newLocation, wave: w })}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          newLocation.wave === w
                            ? `${WAVE_CONFIG[w].color} border-current`
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {WAVE_CONFIG[w].label}
                        <span className="block text-[11px] font-normal opacity-70">{WAVE_CONFIG[w].description}</span>
                      </button>
                    ))}
                  </div>
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
              placeholder="Cerca citta o regione..."
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

          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessuna citta configurata
            </p>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3].map((wave) => {
                const waveLocations = groupedLocationsByWave[wave] || {};
                const waveCount = locationsByWave[wave]?.length || 0;
                const waveConf = WAVE_CONFIG[wave];
                const isWaveCollapsed = collapsedGroups.has(`wave_${wave}`);

                return (
                  <div key={wave} className={`border rounded-xl overflow-hidden ${waveConf.color}`}>
                    {/* Wave header */}
                    <button
                      onClick={() => toggleGroup(`wave_${wave}`)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-semibold flex items-center gap-2">
                        {isWaveCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className={`w-2.5 h-2.5 rounded-full ${waveConf.badge}`} />
                        {waveConf.label}
                        <span className="text-xs font-normal opacity-70">
                          — {waveConf.description} ({waveCount})
                        </span>
                      </span>
                    </button>

                    {!isWaveCollapsed && (
                      <div className="bg-background px-2 pb-2 space-y-1">
                        {waveCount === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">
                            Nessuna citta in questa ondata
                          </p>
                        ) : (
                          Object.entries(waveLocations).map(([regione, cities]) => {
                            const regionKey = `wave${wave}_${regione}`;
                            const isRegCollapsed = collapsedGroups.has(regionKey);
                            return (
                              <div key={regionKey} className="border rounded-lg overflow-hidden">
                                <button
                                  onClick={() => toggleGroup(regionKey)}
                                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                                >
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    {isRegCollapsed ? (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    {regione}
                                    <span className="text-xs text-muted-foreground font-normal">
                                      ({cities.length})
                                    </span>
                                  </span>
                                </button>
                                {!isRegCollapsed && (
                                  <div className="px-3 py-2 space-y-0.5">
                                    {cities.map((loc, locIdx) => (
                                      <div
                                        key={loc.id}
                                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 group text-sm"
                                      >
                                        <span className="flex items-center gap-2 min-w-0">
                                          <span className="truncate">{loc.name}</span>
                                          {loc.info && (
                                            <span className="text-[11px] text-muted-foreground shrink-0">
                                              {formatAbitanti(loc.info.abitanti)} ab.
                                            </span>
                                          )}
                                        </span>
                                        <span className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            onClick={() => reorderItem("location", loc.id, "up")}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ${locIdx === 0 ? "invisible" : ""}`}
                                          >
                                            <ArrowUp className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => reorderItem("location", loc.id, "down")}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ${locIdx === cities.length - 1 ? "invisible" : ""}`}
                                          >
                                            <ArrowDown className="h-3.5 w-3.5" />
                                          </button>
                                          {[1, 2, 3].map((w) => (
                                            <button
                                              key={w}
                                              onClick={() => w !== wave && updateLocationWave(loc.id, w)}
                                              className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${
                                                w === wave
                                                  ? `${WAVE_CONFIG[w].badge} text-white`
                                                  : "bg-muted/50 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted"
                                              }`}
                                            >
                                              {w}
                                            </button>
                                          ))}
                                          <button
                                            onClick={() => deleteLocation(loc.id)}
                                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </>}
    </div>
  );
}
