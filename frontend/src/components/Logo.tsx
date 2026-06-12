import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      {/* Official Shield Shape */}
      <path
        d="M20 2L34 8V18C34 26.8 28.2 34.6 20 38C11.8 34.6 6 26.8 6 18V8L20 2Z"
        fill="currentColor"
      />
      {/* Inner Star */}
      <path
        d="M20 11L22.8 17.5H29.5L24 21.5L26 28L20 24L14 28L16 21.5L10.5 17.5H17.2L20 11Z"
        fill="white"
      />
      {/* Decorative lines */}
      <path
        d="M12 18H28"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
      <path
        d="M14 22H26"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
