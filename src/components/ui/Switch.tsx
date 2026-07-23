"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "onClick" | "type" | "role" | "aria-checked"> {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, label, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("parigo-switch", className)}
      {...props}
    >
      <span aria-hidden="true" className="parigo-switch__corner parigo-switch__corner--top" />
      <span aria-hidden="true" className="parigo-switch__track">
        <span className="parigo-switch__rail" />
        <span className="parigo-switch__thumb">
          <span className="parigo-switch__state">{checked ? "1" : "0"}</span>
        </span>
      </span>
      <span aria-hidden="true" className="parigo-switch__corner parigo-switch__corner--bottom" />
    </button>
  );
}
