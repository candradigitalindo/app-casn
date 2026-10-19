import { cn } from "@/lib/utils";

// Logo aplikasi: komputer (monitor) hitam dengan grafik monitoring di layar.
// Warna hitam disengaja permanen (tidak mengikuti text-*) sesuai identitas aplikasi.
const BLACK = "#0A0A0A";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      {/* Bodi monitor */}
      <rect x="3" y="5" width="34" height="23" rx="3" fill={BLACK} />
      {/* Layar */}
      <rect x="6" y="8" width="28" height="17" rx="1.5" fill="white" />
      {/* Grafik monitoring di layar */}
      <rect x="9.5" y="18" width="4" height="4.5" rx="1" fill={BLACK} />
      <rect x="15.5" y="14.5" width="4" height="8" rx="1" fill={BLACK} />
      <rect x="21.5" y="11" width="4" height="11.5" rx="1" fill={BLACK} />
      <path
        d="M28 14.5L30.5 12L33 14.5"
        stroke={BLACK}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leher penyangga */}
      <path d="M17 28H23V32H17V28Z" fill={BLACK} />
      {/* Kaki monitor */}
      <rect x="10" y="32" width="20" height="3" rx="1.5" fill={BLACK} />
    </svg>
  );
}
