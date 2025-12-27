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
      "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-[var(--color-primary)] text-white border-2 border-[var(--color-black)] shadow-[5px_5px_0px_var(--color-black)] hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_var(--color-black)] active:translate-x-[2px] active:translate-y-[2px]",
      secondary:
        "bg-[var(--color-cream)] text-[var(--color-black)] border-2 border-[var(--color-black)] shadow-[5px_5px_0px_var(--color-black)] hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_var(--color-black)] active:translate-x-[2px] active:translate-y-[2px]",
      outline:
        "bg-transparent text-[var(--color-black)] border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)] hover:bg-[var(--color-primary-light)] hover:shadow-[5px_5px_0px_var(--color-black)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-[1px_1px_0px_var(--color-black)] active:translate-x-[1px] active:translate-y-[1px]",
      ghost:
        "bg-transparent text-[var(--color-black)] border-2 border-transparent hover:bg-[var(--color-gray-100)] hover:border-[var(--color-black)] active:bg-[var(--color-gray-100)]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-[var(--radius-sm)]",
      md: "px-5 py-2.5 text-base rounded-[var(--radius-sm)]",
      lg: "px-7 py-3.5 text-lg rounded-[var(--radius-md)]",
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
