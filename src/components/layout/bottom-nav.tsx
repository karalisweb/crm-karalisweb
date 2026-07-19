"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Video,
  Repeat,
  Search,
  Menu,
} from "lucide-react";

const links = [
  { name: "Analizza", href: "/da-analizzare", icon: ClipboardCheck },
  { name: "Video", href: "/fare-video", icon: Video },
  { name: "Follow-up", href: "/follow-up", icon: Repeat },
  { name: "Cerca", href: "/search", icon: Search },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {links.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.name}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* Menu completo: apre il drawer con tutte le sezioni (vedi MobileMenu). */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-mobile-menu"))}
          className="flex flex-col items-center justify-center flex-1 h-full touch-target text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
