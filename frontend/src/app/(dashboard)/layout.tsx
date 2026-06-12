import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { AuthGuard } from "@/components/AuthGuard";
import { LocationScopeBanner } from "@/components/LocationScopeBanner";

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
          <LocationScopeBanner />
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
