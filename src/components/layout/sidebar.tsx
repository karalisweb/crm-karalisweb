"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Phone,
  Search,
  Settings,
  LogOut,
  FolderSearch,
  PackageX,
  ClipboardCheck,
  Target,
  Users,
  UserCog,
} from "lucide-react";

const navigation = [
  { name: "Oggi (5 call)", href: "/oggi", icon: Target },
  { name: "Tutti i Lead", href: "/leads", icon: Users },
  { name: "Audit", href: "/audit", icon: ClipboardCheck },
  { name: "Nuova Ricerca", href: "/search", icon: Search },
  { name: "Ricerche", href: "/searches", icon: FolderSearch },
  { name: "Parcheggiati", href: "/parcheggiati", icon: PackageX },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex h-screen w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-[#0f1419] flex items-center justify-center border border-border">
          <span className="text-primary font-bold text-lg">K</span>
          <span className="text-primary text-xs">sc</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Sales CRM</h1>
          <p className="text-xs text-muted-foreground">by Karalisweb v. 2.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // Matching esatto per evitare che /search matchi /searches
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            pathname === "/"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            pathname === "/profile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <UserCog className="h-5 w-5" />
          Profilo
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          Impostazioni
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5" />
          Esci
        </Button>
      </div>
    </div>
  );
}
