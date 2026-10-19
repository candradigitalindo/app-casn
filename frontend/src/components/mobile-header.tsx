"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutSession } from "@/lib/auth-actions";
import { useAuthStore } from "@/lib/stores/auth";
import { UserRoleLabels, UserRole } from "@/types/enums";
import { Logo } from "./Logo";
import { filterNavByRole, findActiveNavLabel, NavLinks } from "@/components/app-sidebar";

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const userRole = user?.role as UserRole | undefined;

  // Menu sama persis dengan sidebar desktop (termasuk filter role & sub-menu)
  const navItems = filterNavByRole(userRole, user?.locationId);
  const currentLabel = findActiveNavLabel(pathname, navItems);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutSession();
    } catch {
      // Cookie server tidak tersedia saat offline; sesi lokal tetap dibersihkan.
    }
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <div className="flex h-16 items-center gap-3 border-b px-6 shrink-0">
            <Logo />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight tracking-tight">Pengelolaan &amp; Pengendalian</span>
              <span className="text-[10px] text-muted-foreground leading-tight font-medium">Pelaksanaan Seleksi</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            <NavLinks items={navItems} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="border-t p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "Administrator"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role ? UserRoleLabels[user.role as UserRole] : "Super Admin"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <Logo className="h-5 w-5" />
        <span className="text-sm font-semibold">{currentLabel || "Pengelolaan & Pengendalian"}</span>
      </div>
      <div className="ml-auto">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "AD"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}