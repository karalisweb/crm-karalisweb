"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, User, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/da-analizzare": "Da Analizzare",
  "/hot-leads": "Hot Leads",
  "/warm-leads": "Warm Leads",
  "/fare-video": "Fare Video",
  "/video-inviati": "Video Inviati",
  "/follow-up": "Follow-up",
  "/linkedin": "LinkedIn",
  "/telefonate": "Telefonate",
  "/call-fissate": "Call Fissate",
  "/trattative": "In Trattativa",
  "/clienti": "Clienti",
  "/archivio": "Archivio",
  "/search": "Nuova Ricerca",
  "/searches": "Ricerche",
  "/settings": "Impostazioni",
  "/profile": "Profilo",
  "/guida": "Guida",
};

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname.startsWith("/leads/")) return "Dettaglio Lead";
    return pageNames[pathname] || "CRM";
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border pt-safe md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo - Design System */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
            <Target className="h-[18px] w-[18px] text-primary" />
          </div>
          <span className="font-semibold text-sm">{getPageTitle()}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Cerca/Naviga: apre la command palette (unico modo per raggiungere
              tutte le pagine da mobile, dove sidebar e Cmd+K non sono disponibili). */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Cerca e naviga"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          >
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profilo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
