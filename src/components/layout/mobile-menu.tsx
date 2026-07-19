"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { navSections, fixedNavItems, badgeColorClasses, type BadgeColor } from "./nav-items";
import { LogOut, Settings, X } from "lucide-react";

/**
 * Menu mobile a tutta altezza con TUTTE le sezioni della sidebar (prima da mobile
 * erano raggiungibili solo 5 voci su ~25). Si apre con l'evento window
 * "open-mobile-menu" (lanciato dal pulsante "Menu" della bottom-nav) — stesso
 * pattern disaccoppiato della command palette.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { badges } = useSidebar();
  const [open, setOpen] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

  // Chiudi al cambio pagina.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Blocca lo scroll del body quando aperto.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className={cn("md:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Pannello */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-[320px] flex-col bg-[#132032] border-l border-[#2a2a35] shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu di navigazione"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a35] px-5 py-4 pt-safe">
          <span className="font-semibold text-[0.95rem] text-[#f5f5f7]">Menu</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          {navSections.map((section, idx) => (
            <div key={section.title || `section-${idx}`}>
              {section.title && (
                <div className="px-5 mb-1 mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-[#71717a]">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const count = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
                  const badgeColor: BadgeColor = item.badgeColor || "default";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-2.5 mx-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                          : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", active ? "opacity-100" : "opacity-70")} />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                            badgeColorClasses[badgeColor]
                          )}
                        >
                          {item.badgeKey === "fareVideo"
                            ? `${badges["fareVideoReady"] || 0}/${count}`
                            : count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#2a2a35] py-3 pb-safe">
          <div className="space-y-0.5">
            {fixedNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 mx-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                      : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "opacity-100" : "opacity-70")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 mx-2 text-sm font-medium transition-colors",
                  isActive("/settings")
                    ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                    : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                )}
              >
                <Settings className={cn("h-5 w-5 shrink-0", isActive("/settings") ? "opacity-100" : "opacity-70")} />
                <span>Impostazioni</span>
              </Link>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-2.5 mx-2 text-left text-sm font-medium text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7] transition-colors"
            >
              <LogOut className="h-5 w-5 opacity-70 shrink-0" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
