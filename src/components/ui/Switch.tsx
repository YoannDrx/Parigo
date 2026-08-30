"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "onClick" | "type" | "role" | "aria-checked"> {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  loading?: boolean;
}

export function Switch({ checked, label, onCheckedChange, className, disabled, loading = false, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-state={checked ? "checked" : "unchecked"}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("parigo-switch", className)}
      {...props}
    >
      <span aria-hidden="true" className="parigo-switch__track">
        <span className="parigo-switch__rail" />
        <span className="parigo-switch__thumb">{loading && <span className="parigo-switch__spinner" />}</span>
      </span>
    </button>
  );
}
