"use client"

import * as React from "react"
import { Combobox } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

export interface SearchableSelectOption {
  value: string
  label: string
  /** Teks tambahan yang ikut dicocokkan saat pencarian (mis. kode, singkatan). */
  keywords?: string
  disabled?: boolean
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string | null
  /** Menerima string kosong saat pilihan dikosongkan. */
  onValueChange?: (value: string) => void
  placeholder?: React.ReactNode
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  id?: string
  size?: "sm" | "default"
  className?: string
  /** Render kustom untuk tiap baris opsi (default: label). */
  renderOption?: (option: SearchableSelectOption) => React.ReactNode
  /** Render kustom untuk nilai terpilih pada trigger (default: label). */
  renderValue?: (option: SearchableSelectOption) => React.ReactNode
}

function filterOption(option: SearchableSelectOption, query: string) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    option.label.toLowerCase().includes(q) ||
    (option.keywords?.toLowerCase().includes(q) ?? false)
  )
}

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyMessage = "Tidak ada hasil.",
  disabled,
  id,
  size = "default",
  className,
  renderOption,
  renderValue,
}: SearchableSelectProps) {
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange?.(next?.value ?? "")}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={filterOption}
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
      >
        <span
          data-slot="select-value"
          className={cn(
            "flex flex-1 items-center gap-1.5 truncate text-left",
            !selected && "text-muted-foreground"
          )}
        >
          {selected ? (renderValue?.(selected) ?? selected.label) : placeholder}
        </span>
        <Combobox.Icon
          render={
            <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
          }
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          side="bottom"
          sideOffset={4}
          className="isolate z-50"
        >
          <Combobox.Popup
            data-slot="select-content"
            className="isolate z-50 flex max-h-[min(24rem,var(--available-height))] w-(--anchor-width) min-w-48 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-2.5">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Combobox.Empty className="px-2.5 py-4 text-center text-sm text-muted-foreground empty:hidden">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List className="scroll-py-1 overflow-y-auto p-1">
              {(option: SearchableSelectOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  data-slot="select-item"
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                >
                  <span className="flex flex-1 items-center gap-2">
                    {renderOption?.(option) ?? option.label}
                  </span>
                  <Combobox.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                    }
                  >
                    <CheckIcon className="pointer-events-none" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export { SearchableSelect }
