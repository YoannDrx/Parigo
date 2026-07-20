"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex min-h-11 items-center justify-center gap-2 font-semibold transition-all duration-300 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2";

    const variants = {
      primary:
        "border border-[var(--signal)] bg-[var(--signal)] text-[#11120f] hover:-translate-y-0.5 hover:bg-[var(--signal-strong)] active:translate-y-0",
      secondary:
        "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--background)] hover:-translate-y-0.5 active:translate-y-0",
      outline:
        "border border-[var(--line)] bg-transparent text-[var(--foreground)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]",
      ghost:
        "border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
    };

    const sizes = {
      sm: "px-3.5 py-2 text-sm rounded-full",
      md: "px-5 py-2.5 text-sm rounded-full",
      lg: "px-7 py-3.5 text-base rounded-full",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
