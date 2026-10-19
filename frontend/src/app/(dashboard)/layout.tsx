import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { AuthGuard } from "@/components/AuthGuard";
import { LocationScopeBanner } from "@/components/LocationScopeBanner";

import { NotificationLink } from "@/components/notification-link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50/50">
        <AppSidebar />
        <MobileHeader />
        <main className="lg:pl-64">
          <div className="flex justify-end px-4 py-2 border-b bg-white print:hidden"><NotificationLink /></div>
          <LocationScopeBanner />
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
