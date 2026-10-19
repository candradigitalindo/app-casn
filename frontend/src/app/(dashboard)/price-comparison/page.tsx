"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  SearchableSelect, type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  Scale, Search, Loader2, ShieldCheck, Cpu, Armchair, Boxes, Trophy, Star,
} from "lucide-react";
import { useItemComparison, useProvinces, usePermissions } from "@/lib/hooks";
import { SarprasCategoryLabels, type SarprasCategory } from "@/lib/api/master-data";
import { PriceUnitLabels, type ItemComparison, type ItemOffer } from "@/lib/api/vendors";

const CategoryBadgeStyles: Record<SarprasCategory, string> = {
  SARPRAS_IT: "bg-blue-100 text-blue-700 border-blue-200",
  SARPRAS_NON_IT: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// Format angka gaya Indonesia (pemisah ribuan titik) tanpa prefix "Rp".
const formatNumber = (n: number | string) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(n));

function OfferChip({ offer, best, days }: { offer: ItemOffer; best?: boolean; days: number }) {
  const perHari = offer.priceUnit === "PER_HARI";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
        best
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
          : "border-border bg-muted/30 text-foreground"
      }`}
      title={`${offer.notes ? offer.notes + " · " : ""}Estimasi ${days} hari: ${formatNumber(offer.effectivePerEvent)}/unit`}
    >
      {best && <Trophy className="h-3 w-3 text-emerald-600" />}
      <span className="truncate max-w-[160px]">{offer.vendorName}</span>
      {offer.vendorRating ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{offer.vendorRating}
        </span>
      ) : null}
      <span className="tabular-nums">
        {formatNumber(offer.unitPrice)}
        <span className={`text-[9px] ml-0.5 ${best ? "text-emerald-700" : "text-muted-foreground"}`}>
          /{perHari ? "hari" : "event"}
        </span>
      </span>
      {perHari && (
        <span className="text-[10px] text-muted-foreground tabular-nums">
          ≈{formatNumber(offer.effectivePerEvent)}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground tabular-nums">maks {formatNumber(offer.qty)}</span>
    </span>
  );
}

export default function PriceComparisonPage() {
  const { canManageProcurement } = usePermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SarprasCategory | "ALL">("ALL");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [daysInput, setDaysInput] = useState("5");
  const days = Math.max(1, Number(daysInput) || 5);

  const { data, isLoading } = useItemComparison({
    ...(search ? { search } : {}),
    ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
    ...(provinceFilter ? { provinceId: provinceFilter } : {}),
    days,
  });
  const { data: provincesRes } = useProvinces();

  const items: ItemComparison[] = data?.data ?? [];
  const provinceOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "Semua wilayah" },
      ...(provincesRes?.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [provincesRes],
  );

  if (!canManageProcurement) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center gap-2 min-h-[60vh]">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Modul Pengadaan hanya dapat diakses oleh Super Admin dan Tim Logistik.
        </p>
      </div>
    );
  }

  const coveredCount = items.filter((i) => i.offers.length > 0).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Perbandingan Harga Vendor</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Harga per item dari seluruh vendor rekanan, urut termurah — dasar memilih harga terbaik
          saat menyusun penawaran. Filter wilayah untuk melihat vendor yang melayani provinsi tertentu.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {([
            { key: "ALL" as const, label: "Semua", icon: Boxes },
            { key: "SARPRAS_IT" as const, label: "Sarpras IT", icon: Cpu },
            { key: "SARPRAS_NON_IT" as const, label: "Sarpras Non IT", icon: Armchair },
          ]).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              size="sm"
              variant={categoryFilter === key ? "default" : "outline"}
              onClick={() => setCategoryFilter(key)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
        <div className="w-full lg:w-64">
          <SearchableSelect
            options={provinceOptions}
            value={provinceFilter}
            onValueChange={setProvinceFilter}
            placeholder="Filter wilayah layanan..."
            searchPlaceholder="Cari provinsi..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Jumlah hari:</span>
          <Input
            type="number" min={1}
            className="h-9 w-20 text-center tabular-nums"
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada item ditemukan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead className="min-w-[240px]">Item</TableHead>
                  <TableHead className="w-28">Kategori</TableHead>
                  <TableHead className="min-w-[320px]">Harga Vendor — Rp (urut estimasi termurah)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm align-top pt-3.5">{item.no}</TableCell>
                    <TableCell className="align-top pt-3.5">
                      <p className="text-sm font-medium leading-snug">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">satuan: {item.unit}</p>
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <Badge variant="outline" className={`text-[10px] ${CategoryBadgeStyles[item.category]}`}>
                        {SarprasCategoryLabels[item.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      {item.offers.length === 0 ? (
                        <span className="text-xs text-amber-600">
                          Belum ada vendor yang menawarkan item ini
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {item.offers.map((o, idx) => (
                            <OfferChip key={o.vendorItemId} offer={o} best={idx === 0} days={item.days} />
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        {items.length} item · {coveredCount} item sudah memiliki harga vendor ·
        🏆 = termurah berdasarkan <span className="font-medium">estimasi biaya per event {days} hari</span>
        {" "}(harga/hari × {days}, harga/event apa adanya; nilai &ldquo;≈&rdquo; pada chip) ·
        &ldquo;maks n&rdquo; = jumlah maksimal yang sanggup dipasok
      </p>
    </div>
  );
}
