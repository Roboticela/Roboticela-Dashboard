"use client";

import { Check } from "lucide-react";

export function CustomCheckbox({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background
        ${checked
          ? "bg-primary border-primary text-background"
          : "bg-background border-border text-transparent hover:border-primary/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <Check className="w-3 h-3 stroke-[3]" strokeWidth={3} />
    </button>
  );
}
