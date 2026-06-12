"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Wrench,
  AlertTriangle,
  HardHat,
  FolderOpen,
  UserCog,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/auth";
import { UserRoleLabels, UserRole } from "@/types/enums";
import { Logo } from "./Logo";

export const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { href: "/locations", label: "Titik Lokasi", icon: MapPin, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.SUPERVISOR] },
  { href: "/logistics", label: "Logistik", icon: Truck, roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR, UserRole.SUPERVISOR] },
  { href: "/installations", label: "Instalasi", icon: Wrench, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TECHNICAL_IT, UserRole.TECHNICAL_ELECTRICAL, UserRole.TECHNICAL_SARPRAS, UserRole.SUPERVISOR] },
  { href: "/incidents", label: "Insiden", icon: AlertTriangle, roles: null },
  { href: "/attendance", label: "Tenaga Teknis", icon: HardHat, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.REGISTRAR, UserRole.SUPERVISOR] },
  { href: "/documents", label: "Dokumen", icon: FolderOpen, roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR, UserRole.SUPERVISOR] },
  { href: "/users", label: "Pengguna", icon: UserCog, roles: [UserRole.SUPER_ADMIN] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const userRole = user?.role as UserRole | undefined;

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.roles === null || (userRole && item.roles.includes(userRole))
  );

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b px-6">
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 space-y-3">
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
    </aside>
  );
}
