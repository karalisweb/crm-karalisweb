"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Phone,
  Search,
  Settings,
  LogOut,
  FolderSearch,
  UserCog,
  Calendar,
  Mail,
  Trophy,
  XCircle,
  Globe,
  AlertCircle,
  Users,
  Target,
  BookOpen,
  User,
} from "lucide-react";

// === SELEZIONE (pre-chiamata) ===
const selectionNav = [
  { name: "Oggi", href: "/oggi", icon: Phone, description: "Da chiamare oggi" },
  { name: "Da Verificare", href: "/da-verificare", icon: AlertCircle, description: "Verifica manuale" },
];

// === VENDITA MSD (post-chiamata) ===
const salesNav = [
  { name: "Appuntamenti", href: "/appuntamenti", icon: Calendar, description: "Call fissate" },
  { name: "Offerte", href: "/offerte", icon: Mail, description: "In attesa pagamento" },
  { name: "Clienti MSD", href: "/clienti-msd", icon: Trophy, description: "Vinti" },
];

// === ARCHIVIO ===
const archiveNav = [
  { name: "Non Target", href: "/non-target", icon: XCircle, description: "Rivedibile" },
  { name: "Senza Sito", href: "/senza-sito", icon: Globe, description: "No website" },
  { name: "Persi", href: "/persi", icon: XCircle, description: "Archivio" },
];

// === STRUMENTI ===
const toolsNav = [
  { name: "Nuova Ricerca", href: "/search", icon: Search },
  { name: "Ricerche", href: "/searches", icon: FolderSearch },
  { name: "Tutti i Lead", href: "/leads", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  const NavLink = ({ item }: { item: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; description?: string } }) => (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all mx-0.5",
        isActive(item.href)
          ? "bg-[rgba(255,107,53,0.1)] text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-5 w-5", isActive(item.href) ? "opacity-100" : "opacity-70")} />
      {item.name}
    </Link>
  );

  return (
    <div className="hidden md:flex h-screen w-64 flex-col bg-card border-r border-border">
      {/* Header App - Design System Zona 1 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
          <Target className="h-[22px] w-[22px] text-primary" />
        </div>
        <div>
          <h1 className="text-[0.95rem] font-semibold">KW Sales CRM</h1>
          <p className="text-xs text-muted-foreground">v2.0.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Dashboard */}
        <div>
          <NavLink item={{ name: "Dashboard", href: "/", icon: LayoutDashboard }} />
        </div>

        {/* SELEZIONE */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Selezione
          </p>
          <div className="space-y-1">
            {selectionNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* VENDITA MSD */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Vendita MSD
          </p>
          <div className="space-y-1">
            {salesNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* ARCHIVIO */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Archivio
          </p>
          <div className="space-y-1">
            {archiveNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* STRUMENTI */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Strumenti
          </p>
          <div className="space-y-1">
            {toolsNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer - Design System Zona 3 (navigazione fissa) */}
      <div className="border-t border-border p-3 space-y-1">
        <NavLink item={{ name: "Profilo", href: "/profile", icon: User }} />
        {isAdmin && (
          <NavLink item={{ name: "Impostazioni", href: "/settings", icon: Settings }} />
        )}
        <NavLink item={{ name: "Guida", href: "/guida", icon: BookOpen }} />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg mx-0.5"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5 opacity-70" />
          Esci
        </Button>
      </div>
    </div>
  );
}
