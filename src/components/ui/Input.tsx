"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  isSearch?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, isSearch, type = "text", ...props }, ref) => {
    const hasIcon = icon || isSearch;

    return (
      <div className="parigo-field relative w-full">
        {hasIcon && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gray-500)]">
            {icon || <Search size={20} />}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "parigo-input min-h-11 w-full border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] transition-all duration-300 placeholder:text-[var(--text-muted)] focus:border-[var(--signal)] focus:outline-none focus:ring-4 focus:ring-[var(--signal)]/15",
            hasIcon ? "pl-12 pr-4 py-3" : "px-4 py-3",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
