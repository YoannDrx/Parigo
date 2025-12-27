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
      <div className="relative w-full">
        {hasIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]">
            {icon || <Search size={20} />}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full bg-[var(--color-white)] text-[var(--color-black)] border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] shadow-[3px_3px_0px_var(--color-black)] transition-all duration-150 placeholder:text-[var(--color-gray-400)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[5px_5px_0px_var(--color-primary)]",
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
