import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content area - offset per sidebar fissa 260px su desktop */}
      <div className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden md:ml-[260px]">
        {/* Mobile Header - hidden on desktop */}
        <MobileHeader />

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* Mobile: full width with padding, Desktop: container */}
          <div className="px-4 py-4 pb-24 md:container md:mx-auto md:p-6 md:pb-6 w-full overflow-hidden">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav - hidden on desktop */}
        <BottomNav />
      </div>

      <Toaster />
    </div>
  );
}
