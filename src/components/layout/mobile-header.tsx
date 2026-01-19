"use client";

import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";
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
  "/leads": "Da Chiamare",
  "/audit": "Audit",
  "/search": "Nuova Ricerca",
  "/searches": "Ricerche",
  "/parcheggiati": "Parcheggiati",
  "/settings": "Impostazioni",
};

export function MobileHeader() {
  const pathname = usePathname();

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname.startsWith("/leads/")) return "Dettaglio Lead";
    return pageNames[pathname] || "CRM";
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border pt-safe md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#0f1419] flex items-center justify-center border border-border">
            <span className="text-primary font-bold text-base">K</span>
            <span className="text-primary text-[10px]">sc</span>
          </div>
          <span className="font-semibold text-sm">{getPageTitle()}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Profilo</DropdownMenuItem>
              <DropdownMenuItem>Notifiche</DropdownMenuItem>
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
