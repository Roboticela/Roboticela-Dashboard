"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type Option = { value: string; label: string };

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder,
  openAbove,
  "aria-label": ariaLabel,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** When true, dropdown opens above the button instead of below */
  openAbove?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-left text-sm flex items-center justify-between gap-2 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 w-full rounded-xl border border-border bg-card shadow-lg py-1 max-h-48 overflow-auto ${
            openAbove ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                opt.value === value
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
