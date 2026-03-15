"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  badges: Record<string, number>;
  refreshBadges: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
  badges: {},
  refreshBadges: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const refreshBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/mission");
      if (res.ok) {
        const data = await res.json();
        if (data.badges) {
          setBadges(data.badges);
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  // Polling ogni 60s + fetch iniziale
  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, 60000);
    return () => clearInterval(interval);
  }, [refreshBadges]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, badges, refreshBadges }}>
      {children}
    </SidebarContext.Provider>
  );
}
