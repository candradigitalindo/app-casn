"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth";
import { apiClient } from "@/lib/api-client";
import type { User } from "@/types/models";
import { Logo } from "@/components/Logo";

const DEMO_ACCOUNTS = [
  { email: "admin@nbp.co.id", label: "Super Admin" },
  { email: "logistik@nbp.co.id", label: "Tim Logistik" },
  { email: "korlok@nbp.co.id", label: "Koordinator Lokasi" },
  { email: "it@nbp.co.id", label: "Tenaga Teknis IT" },
  { email: "registrasi@nbp.co.id", label: "Petugas Registrasi" },
  { email: "pengawas@nbp.co.id", label: "Pengawas" },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("admin@nbp.co.id");
  const [password, setPassword] = useState("andalan123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<{ user: User; tokens: { accessToken: string } }>(
        "/api/v1/auth/login",
        { email, password }
      );
      login(res.data.user, res.data.tokens.accessToken);
      router.replace("/dashboard");
    } catch {
      setError("Email atau password salah. Coba akun demo di bawah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      {/* ── Card login ── */}
      <div className="bg-white p-7 sm:p-10">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <Logo className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <p className="text-base font-bold uppercase leading-tight tracking-tight">SIPP Seleksi</p>
              <p className="text-[11px] font-medium text-muted-foreground">Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi di Seluruh Titik Lokasi</p>
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Masuk ke akun Anda</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gunakan kredensial yang telah diberikan.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@nbp.co.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Akun demo (password: andalan123)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => setEmail(acc.email)}
                className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                  email === acc.email
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : "border-muted bg-muted text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
