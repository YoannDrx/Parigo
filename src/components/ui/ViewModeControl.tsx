"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

export interface ViewModeOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

export function ViewModeControl<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: readonly ViewModeOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("view-mode-control inline-flex", className)} role="group" aria-label={ariaLabel}>
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;
        return (
          <Tooltip key={optionValue} label={label} side="bottom">
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => onValueChange(optionValue)}
              className="view-mode-control__button"
            >
              <Icon size={16} strokeWidth={1.7} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
