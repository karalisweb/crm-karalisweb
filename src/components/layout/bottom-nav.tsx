"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Phone,
  Search,
  Settings,
  ClipboardCheck,
  FolderSearch,
  Target,
  UserCog,
} from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  const navigation = [
    { name: "Chiama", href: "/da-chiamare", icon: Phone },
    { name: "Cerca", href: "/search", icon: Search },
    { name: "Ricerche", href: "/searches", icon: FolderSearch },
    // Se admin mostra Settings, altrimenti mostra Profilo
    isAdmin
      ? { name: "Menu", href: "/settings", icon: Settings }
      : { name: "Profilo", href: "/profile", icon: UserCog },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "stroke-[2.5px]"
                )}
              />
              <span className="text-[10px] font-medium">{item.name}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
