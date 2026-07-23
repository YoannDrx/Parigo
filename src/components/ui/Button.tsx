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
      "parigo-button inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2";

    const variants = {
      primary:
        "border border-[var(--signal-strong)] bg-[var(--signal-strong)] text-[var(--signal-contrast)] hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)] hover:!text-[var(--background)]",
      secondary:
        "border border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--background)] hover:border-[var(--signal-strong)] hover:bg-[var(--signal-strong)] hover:text-white",
      outline:
        "border border-[var(--line-strong)] bg-transparent text-[var(--foreground)] hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]",
      ghost:
        "border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
    };

    const sizes = {
      sm: "px-3.5 py-2 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3.5 text-base",
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
