"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import {
  Home,
  Search,
  LogOut,
  FolderSearch,
  BookOpen,
  User,
  Settings,
  Send,
  Repeat,
  CalendarCheck,
  Handshake,
  Flame,
  Sun,
  Archive,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  ScanSearch,
  Video,
  Linkedin,
  Phone,
  Trophy,
  Snowflake,
} from "lucide-react";

// Badge types per colore
type BadgeColor = "red" | "yellow" | "blue" | "default" | "green";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badgeKey?: string;
  badgeColor?: BadgeColor;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { href: "/", label: "Home", icon: Home },
    ],
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
    title: "VIDEO",
    items: [
      { href: "/fare-video", label: "Fare Video", icon: Video, badgeKey: "fareVideo", badgeColor: "red" },
      { href: "/video-inviati", label: "Video Inviati", icon: Send, badgeKey: "videoInviati", badgeColor: "blue" },
    ],
  },
  {
    title: "FOLLOW-UP",
    items: [
      { href: "/follow-up", label: "Follow-up", icon: Repeat, badgeKey: "followUp", badgeColor: "yellow" },
      { href: "/linkedin", label: "LinkedIn", icon: Linkedin, badgeKey: "linkedin", badgeColor: "blue" },
      { href: "/telefonate", label: "Telefonate", icon: Phone, badgeKey: "telefonate", badgeColor: "default" },
    ],
  },
  {
    title: "VENDITA",
    items: [
      { href: "/call-fissate", label: "Call Fissate", icon: CalendarCheck, badgeKey: "callFissate" },
      { href: "/trattative", label: "In Trattativa", icon: Handshake, badgeKey: "inTrattativa" },
      { href: "/clienti", label: "Clienti", icon: Trophy, badgeKey: "clienti", badgeColor: "green" },
    ],
  },
  {
    title: "SCOUTING",
    items: [
      { href: "/search", label: "Nuova Ricerca", icon: Search },
      { href: "/searches", label: "Ricerche", icon: FolderSearch },
    ],
  },
  {
    title: "ALTRO",
    items: [
      { href: "/archivio", label: "Archivio", icon: Archive },
    ],
  },
];

const fixedNavItems = [
  { href: "/profile", label: "Profilo", icon: User },
  { href: "/guida", label: "Guida", icon: BookOpen },
];

const badgeColorClasses: Record<BadgeColor, string> = {
  red: "bg-red-500/90 text-white",
  yellow: "bg-amber-500/90 text-white",
  blue: "bg-blue-500/90 text-white",
  green: "bg-green-500/90 text-white",
  default: "bg-[#1a2d44] text-[#a1a1aa]",
};

const dotColorClasses: Record<BadgeColor, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  default: "bg-[#d4a726]",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggle, badges } = useSidebar();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col border-r border-[#2a2a35] bg-[#132032] transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 border-b border-[#2a2a35]",
        collapsed ? "px-3 py-5 justify-center" : "px-6 py-5"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d1521] shrink-0">
          <Target size={22} className="text-[#d4a726]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-[0.95rem] text-[#f5f5f7]">
              KW Sales CRM
            </span>
            <span className="text-xs text-[#71717a]">v3.7.0</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {navSections.map((section, idx) => (
          <div key={section.title || `section-${idx}`}>
            {!collapsed && section.title && (
              <div
                className={cn(
                  "px-6 mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em]",
                  idx === 0 ? "mt-0" : "mt-4",
                  "text-[#71717a]"
                )}
              >
                {section.title}
              </div>
            )}
            {collapsed && idx > 0 && (
              <div className="mx-3 my-3 border-t border-[#2a2a35]" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const count = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
                const badgeColor = item.badgeColor || "default";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? `${item.label}${count > 0 ? ` (${count})` : ""}` : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      collapsed
                        ? "px-0 py-2.5 mx-2 justify-center"
                        : "px-4 py-2.5 mx-2",
                      active
                        ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                        : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          active ? "opacity-100" : "opacity-70"
                        )}
                      />
                      {/* Notification dot when collapsed */}
                      {collapsed && count > 0 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-[#132032]",
                          dotColorClasses[badgeColor]
                        )} />
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {count > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                            badgeColorClasses[badgeColor]
                          )}>
                            {item.badgeKey === "fareVideo"
                              ? `${badges["fareVideoReady"] || 0}/${count}`
                              : count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="py-3 border-t border-[#2a2a35]">
        <div className="space-y-0.5">
          {fixedNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed
                    ? "px-0 py-2.5 mx-2 justify-center"
                    : "px-4 py-2.5 mx-2",
                  active
                    ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                    : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "opacity-100" : "opacity-70"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/settings"
              title={collapsed ? "Impostazioni" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                collapsed
                  ? "px-0 py-2.5 mx-2 justify-center"
                  : "px-4 py-2.5 mx-2",
                isActive("/settings")
                  ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                  : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
              )}
            >
              <Settings
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive("/settings") ? "opacity-100" : "opacity-70"
                )}
              />
              {!collapsed && <span>Impostazioni</span>}
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Esci" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm font-medium text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7] transition-all duration-200",
              collapsed
                ? "px-0 py-2.5 mx-2 justify-center w-[calc(100%-1rem)]"
                : "px-4 py-2.5 mx-2 w-[calc(100%-1rem)] text-left"
            )}
          >
            <LogOut className="h-5 w-5 opacity-70 shrink-0" />
            {!collapsed && <span>Esci</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={toggle}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm font-medium text-[#71717a] hover:bg-[#1a2d44] hover:text-[#f5f5f7] transition-all duration-200 mt-2",
              collapsed
                ? "px-0 py-2 mx-2 justify-center w-[calc(100%-1rem)]"
                : "px-4 py-2 mx-2 w-[calc(100%-1rem)] text-left"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="text-xs">Comprimi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
