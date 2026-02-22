"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <CommandPalette />

      <div
        className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden transition-all duration-300"
        style={{ marginLeft: undefined }}
      >
        <style>{`
          @media (min-width: 768px) {
            .main-content-area {
              margin-left: ${collapsed ? "64px" : "260px"};
            }
          }
        `}</style>
        <div className="main-content-area flex-1 flex flex-col min-h-screen">
          <MobileHeader />

          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="px-4 py-4 pb-24 md:container md:mx-auto md:p-6 md:pb-6 w-full overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          <BottomNav />
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
