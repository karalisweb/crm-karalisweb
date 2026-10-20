import {
  Home,
  BookOpen,
  User,
  CalendarCheck,
  Handshake,
  Archive,
  Trophy,
  MessageCircle,
  Target,
  Bot,
  Users,
  FileText,
  Building2,
  Gauge,
  Route,
} from "lucide-react";

// Badge types per colore
export type BadgeColor = "red" | "yellow" | "blue" | "default" | "green";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badgeKey?: string;
  badgeColor?: BadgeColor;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Struttura di navigazione UNICA — usata sia dalla sidebar desktop
 * (`sidebar.tsx`) sia dal menu mobile (`mobile-menu.tsx`), così le due
 * non divergono mai (prima il mobile mostrava solo 5 voci su ~25).
 */
export const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { href: "/", label: "Oggi", icon: Home },
    ],
  },
  {
    // Il Motore 121 (PROGETTO-AGENTI.md): BNI per primo, poi i clienti dai casi studio.
    title: "MOTORE 121",
    items: [
      { href: "/bni", label: "Incontri BNI", icon: Handshake },
      { href: "/cruscotto", label: "Cruscotto", icon: Gauge },
      { href: "/bni/membri", label: "Rubrica BNI", icon: Users },
      { href: "/casi-studio", label: "Casi studio", icon: FileText },
      { href: "/aziende-trovate", label: "Aziende trovate", icon: Building2 },
      { href: "/lavorazione", label: "In lavorazione", icon: Route },
    ],
  },
  {
    title: "VENDITA",
    items: [
      { href: "/risposto", label: "Ha Risposto", icon: MessageCircle, badgeKey: "risposto", badgeColor: "green" },
      { href: "/trattative", label: "Trattative", icon: CalendarCheck, badgeKey: "trattative", badgeColor: "red" },
      { href: "/opportunita", label: "Opportunità", icon: Target, badgeKey: "opportunitaFollowup", badgeColor: "red" },
      { href: "/clienti", label: "Clienti", icon: Trophy, badgeKey: "clienti", badgeColor: "green" },
    ],
  },
  {
    title: "ALTRO",
    items: [
      { href: "/agenti", label: "Agenti", icon: Bot },
      { href: "/archivio", label: "Archivio", icon: Archive },
    ],
  },
];

/** Voci fisse in fondo (profilo/guida), comuni a sidebar e menu mobile. */
export const fixedNavItems: NavItem[] = [
  { href: "/profile", label: "Profilo", icon: User },
  { href: "/guida", label: "Guida", icon: BookOpen },
];

export const badgeColorClasses: Record<BadgeColor, string> = {
  red: "bg-red-500/90 text-white",
  yellow: "bg-amber-500/90 text-white",
  blue: "bg-blue-500/90 text-white",
  green: "bg-green-500/90 text-white",
  default: "bg-[#1a2d44] text-[#a1a1aa]",
};

export const dotColorClasses: Record<BadgeColor, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  default: "bg-[#d4a726]",
};

/**
 * La voce attiva per un percorso: la più specifica che corrisponde (così "/bni/membri" accende
 * "Membri BNI" e non anche "121 BNI").
 */
export function voceAttiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname !== href && !pathname.startsWith(href + "/")) return false;
  const tutte = [...navSections.flatMap((s) => s.items), ...fixedNavItems].map((i) => i.href);
  return !tutte.some((h) => h.length > href.length && h.startsWith(href + "/") && (pathname === h || pathname.startsWith(h + "/")));
}
