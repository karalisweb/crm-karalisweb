import {
  Home,
  BookOpen,
  User,
  Send,
  Repeat,
  CalendarCheck,
  Handshake,
  Flame,
  Sun,
  Archive,
  ScanSearch,
  Video,
  Phone,
  Trophy,
  Snowflake,
  MessageCircle,
  Mail,
  Eye,
  ClipboardCheck,
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
    items: [{ href: "/", label: "Home", icon: Home }],
  },
  {
    title: "ANALISI",
    items: [
      { href: "/da-analizzare", label: "Da Analizzare", icon: ScanSearch, badgeKey: "daAnalizzare", badgeColor: "default" },
      { href: "/hot-leads", label: "Hot Leads", icon: Flame, badgeKey: "hotLeads", badgeColor: "red" },
      { href: "/warm-leads", label: "Warm Leads", icon: Sun, badgeKey: "warmLeads", badgeColor: "yellow" },
      { href: "/cold-leads", label: "Cold Leads", icon: Snowflake, badgeKey: "coldLeads", badgeColor: "blue" },
    ],
  },
  {
    title: "RETE BNI",
    items: [
      { href: "/rete-bni", label: "Rete BNI", icon: Handshake, badgeKey: "bniDaLavorare", badgeColor: "green" },
    ],
  },
  {
    title: "OUTREACH",
    items: [
      { href: "/approvazione", label: "Approvazione", icon: ClipboardCheck, badgeKey: "daApprovare", badgeColor: "yellow" },
      { href: "/registro-email", label: "Email Inviate", icon: Mail, badgeKey: "emailInviate", badgeColor: "blue" },
      { href: "/follow-up", label: "Follow-up", icon: Repeat, badgeKey: "followUp", badgeColor: "yellow" },
      { href: "/fare-video", label: "Fare Video", icon: Video, badgeKey: "fareVideo", badgeColor: "red" },
      { href: "/video-inviati", label: "Video Inviati", icon: Send, badgeKey: "videoInviati", badgeColor: "blue" },
      { href: "/video-visti", label: "Video Visti", icon: Eye, badgeKey: "videoVisti", badgeColor: "green" },
      { href: "/telefonate", label: "Telefonate", icon: Phone, badgeKey: "telefonate", badgeColor: "default" },
    ],
  },
  {
    title: "VENDITA",
    items: [
      { href: "/risposto", label: "Ha Risposto", icon: MessageCircle, badgeKey: "risposto", badgeColor: "green" },
      { href: "/call-fissate", label: "Call Fissate", icon: CalendarCheck, badgeKey: "callFissate" },
      { href: "/trattative", label: "In Trattativa", icon: Handshake, badgeKey: "inTrattativa" },
      { href: "/clienti", label: "Clienti", icon: Trophy, badgeKey: "clienti", badgeColor: "green" },
    ],
  },
  {
    title: "ALTRO",
    items: [{ href: "/archivio", label: "Archivio", icon: Archive }],
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
