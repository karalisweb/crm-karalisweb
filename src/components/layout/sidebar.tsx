"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import {
  LayoutDashboard,
  Search,
  LogOut,
  FolderSearch,
  Calendar,
  FileText,
  Trophy,
  Target,
  BookOpen,
  User,
  Settings,
  ClipboardCheck,
  UserCheck,
  Video,
  Send,
  Repeat,
  MessageCircle,
  Archive,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const stageMapping: Record<string, string[]> = {
  "/da-qualificare": ["DA_QUALIFICARE"],
  "/qualificati": ["QUALIFICATO"],
  "/video-da-fare": ["VIDEO_DA_FARE"],
  "/video-inviati": ["VIDEO_INVIATO"],
  "/follow-up": ["VIDEO_INVIATO", "LETTERA_INVIATA", "FOLLOW_UP_LINKEDIN"],
  "/risposto": ["RISPOSTO"],
  "/appuntamenti": ["CALL_FISSATA"],
  "/proposte": ["PROPOSTA_INVIATA"],
  "/clienti": ["VINTO"],
  "/archivio": ["PERSO", "DA_RICHIAMARE_6M", "RICICLATO", "NON_TARGET", "SENZA_SITO"],
};

const navSections = [
  {
    title: "SCOUTING",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/search", label: "Nuova Ricerca", icon: Search },
      { href: "/searches", label: "Ricerche", icon: FolderSearch },
    ],
  },
  {
    title: "QUALIFICAZIONE",
    items: [
      { href: "/da-qualificare", label: "Da Qualificare", icon: ClipboardCheck },
      { href: "/qualificati", label: "Qualificati", icon: UserCheck },
    ],
  },
  {
    title: "OUTREACH",
    items: [
      { href: "/video-da-fare", label: "Video da Fare", icon: Video },
      { href: "/video-inviati", label: "Video Inviati", icon: Send },
      { href: "/follow-up", label: "Follow-up", icon: Repeat },
    ],
  },
  {
    title: "VENDITA",
    items: [
      { href: "/risposto", label: "Ha Risposto", icon: MessageCircle },
      { href: "/appuntamenti", label: "Call Fissate", icon: Calendar },
      { href: "/proposte", label: "Proposte", icon: FileText },
      { href: "/clienti", label: "Clienti", icon: Trophy },
    ],
  },
  {
    title: "ARCHIVIO",
    items: [
      { href: "/archivio", label: "Archivio", icon: Archive },
    ],
  },
];

const fixedNavItems = [
  { href: "/profile", label: "Profilo", icon: User },
  { href: "/guida", label: "Guida", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggle } = useSidebar();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/leads?stageCounts=true&pageSize=0");
      if (res.ok) {
        const data = await res.json();
        if (data.stageCounts) {
          setCounts(data.stageCounts);
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const getCount = (href: string): number => {
    const stages = stageMapping[href];
    if (!stages) return 0;
    return stages.reduce((sum, stage) => sum + (counts[stage] || 0), 0);
  };

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
      {/* Zona 1 - Header */}
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
            <span className="text-xs text-[#71717a]">v2.1.0</span>
          </div>
        )}
      </div>

      {/* Zona 2 - Navigazione */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {navSections.map((section, idx) => (
          <div key={section.title}>
            {!collapsed && (
              <div
                className={cn(
                  "px-6 mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-[#71717a]",
                  idx === 0 ? "mt-0" : "mt-4"
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
                const count = getCount(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
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
                      {/* Notification dot for urgent items */}
                      {collapsed && count > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#d4a726]" />
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#1a2d44] text-[#a1a1aa] min-w-[20px] text-center">
                            {count}
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

      {/* Zona 3 - Footer */}
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
