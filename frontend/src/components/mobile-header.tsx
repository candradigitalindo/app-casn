"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/auth";
import { UserRoleLabels, UserRole } from "@/types/enums";
import { Logo } from "./Logo";
import { ALL_NAV_ITEMS } from "@/components/app-sidebar";

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const userRole = user?.role as UserRole | undefined;

  // Menu sama persis dengan sidebar desktop (termasuk filter role)
  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.roles === null || (userRole && item.roles.includes(userRole))
  );

  const currentPage = navItems.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );

  function handleLogout() {
    setOpen(false);
    logout();
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
            <Logo className="text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight tracking-tight">SIPP SELEKSI</span>
              <span className="text-[10px] text-muted-foreground leading-tight font-medium">Pengelolaan &amp; Pengendalian Pelaksanaan Seleksi</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
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
        <Logo className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">{currentPage?.label || "SIPP Seleksi"}</span>
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