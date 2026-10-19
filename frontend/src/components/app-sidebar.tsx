"use client";

import { useState } from "react";
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
  FileText,
  UserCog,
  LogOut,
  BookOpen,
  Bell,
  Settings,
  Activity,
  CalendarCheck,
  Database,
  Handshake,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutSession } from "@/lib/auth-actions";
import { useAuthStore } from "@/lib/stores/auth";
import { UserRoleLabels, UserRole } from "@/types/enums";
import { Logo } from "./Logo";

// Role pengawasan instansi: dashboard, monitoring, dan laporan (hanya lihat)
const OVERSIGHT_ROLES = [UserRole.SUPERVISOR, UserRole.PIMPINAN, UserRole.PPK, UserRole.INSPEKTORAT];

export interface NavGroup {
  label: string; // judul sub-menu (mis. "Data Lokasi")
  items: { href: string; label: string }[];
}

export interface NavItem {
  href?: string; // link langsung; kosong bila punya children
  label: string;
  icon: LucideIcon;
  roles: UserRole[] | null; // null = semua role
  children?: NavGroup[];
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { href: "/locations", label: "Titik Lokasi", icon: MapPin, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, ...OVERSIGHT_ROLES] },
  { href: "/logistics", label: "Logistik", icon: Truck, roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR, ...OVERSIGHT_ROLES] },
  { href: "/installations", label: "Instalasi", icon: Wrench, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TECHNICAL_IT, UserRole.TECHNICAL_ELECTRICAL, UserRole.TECHNICAL_SARPRAS, ...OVERSIGHT_ROLES] },
  { href: "/incidents", label: "Insiden", icon: AlertTriangle, roles: null },
  { href: "/personnel", label: "Tenaga Teknis", icon: HardHat, roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR, UserRole.REGISTRAR, ...OVERSIGHT_ROLES] },
  { href: "/attendance", label: "Presensi", icon: CalendarCheck, roles: [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.REGISTRAR, ...OVERSIGHT_ROLES] },
  { href: "/documents", label: "Dokumen", icon: FolderOpen, roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR, ...OVERSIGHT_ROLES] },
  { href: "/reports", label: "Laporan", icon: FileText, roles: [UserRole.SUPER_ADMIN, ...OVERSIGHT_ROLES] },
  {
    label: "Pengadaan",
    icon: Handshake,
    roles: [UserRole.SUPER_ADMIN, UserRole.LOGISTICS],
    children: [
      {
        label: "Proyek & Pemasok",
        items: [
          { href: "/projects", label: "Proyek & Penawaran" },
          { href: "/vendors", label: "Vendor Rekanan" },
          { href: "/price-comparison", label: "Perbandingan Harga" },
        ],
      },
    ],
  },
  {
    label: "Master Data",
    icon: Database,
    roles: [UserRole.SUPER_ADMIN],
    children: [
      {
        label: "Data Lokasi",
        items: [
          { href: "/master/provinsi", label: "Provinsi" },
          { href: "/master/kabupaten-kota", label: "Kabupaten / Kota" },
        ],
      },
      {
        label: "Standar Kepsesma 240/2026",
        items: [
          { href: "/master/barang", label: "Barang Sarpras" },
          { href: "/master/tenaga-teknis", label: "Tenaga Teknis" },
        ],
      },
    ],
  },
  { href: "/users", label: "Pengguna", icon: UserCog, roles: [UserRole.SUPER_ADMIN] },
  { href: "/notifications", label: "Notifikasi", icon: Bell, roles: null },
  { href: "/account", label: "Akun & Sesi", icon: Settings, roles: null },
  { href: "/operations", label: "Operasional Sistem", icon: Activity, roles: [UserRole.SUPER_ADMIN] },
  { href: "/panduan", label: "Panduan", icon: BookOpen, roles: null },
];

export function filterNavByRole(role: UserRole | undefined, locationId?: string | null): NavItem[] {
  return ALL_NAV_ITEMS.filter(
    (item) => (item.roles === null || (role && item.roles.includes(role))) && !(locationId && item.label === "Pengadaan")
  );
}

/** Cari label halaman aktif (termasuk sub-menu) untuk judul header mobile. */
export function findActiveNavLabel(pathname: string | null, items: NavItem[]): string | undefined {
  for (const item of items) {
    if (item.href && (pathname === item.href || pathname?.startsWith(item.href + "/"))) return item.label;
    for (const group of item.children ?? []) {
      for (const sub of group.items) {
        if (pathname === sub.href || pathname?.startsWith(sub.href + "/")) return sub.label;
      }
    }
  }
  return undefined;
}

/** Daftar link navigasi — dipakai sidebar desktop dan sheet mobile. */
export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Menu ber-children otomatis terbuka bila salah satu sub-link sedang aktif
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  return (
    <>
      {items.map((item) => {
        if (!item.children) {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onNavigate}
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
        }

        const hasActiveChild = item.children.some((g) =>
          g.items.some((s) => pathname === s.href || pathname?.startsWith(s.href + "/"))
        );
        const isOpen = openMenus[item.label] ?? hasActiveChild;

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => setOpenMenus((m) => ({ ...m, [item.label]: !isOpen }))}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                hasActiveChild
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", hasActiveChild && "text-primary")} />
              {item.label}
              <ChevronDown
                className={cn("h-3.5 w-3.5 ml-auto transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen &&
              item.children.map((group) => (
                <div key={group.label} className="ml-4 border-l pl-3 py-1 space-y-0.5">
                  <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((sub) => {
                    const isActive = pathname === sub.href || pathname?.startsWith(sub.href + "/");
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
          </div>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  const router = useRouter();
  const { user } = useAuthStore();

  const navItems = filterNavByRole(user?.role as UserRole | undefined, user?.locationId);

  async function handleLogout() {
    try {
      await logoutSession();
    } catch {
      // Cookie server tidak tersedia saat offline; sesi lokal tetap dibersihkan.
    }
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Logo />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground leading-tight tracking-tight">Pengelolaan &amp; Pengendalian</span>
          <span className="text-[10px] text-muted-foreground leading-tight font-medium">Pelaksanaan Seleksi</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLinks items={navItems} />
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
