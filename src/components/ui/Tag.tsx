"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "genre" | "mood" | "instrument";
  size?: "sm" | "md";
  clickable?: boolean;
}

const Tag = forwardRef<HTMLSpanElement, TagProps>(
  (
    { className, variant = "default", size = "md", clickable = false, children, ...props },
    ref
  ) => {
    const variants = {
      default: "bg-[var(--color-cream)] text-[var(--color-black)]",
      primary: "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]",
      genre: "bg-[#DBEAFE] text-[#1E40AF]",
      mood: "bg-[#F3E8FF] text-[#6B21A8]",
      instrument: "bg-[#FEF3C7] text-[#92400E]",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium border-2 border-[var(--color-black)] rounded-full transition-all duration-150",
          variants[variant],
          sizes[size],
          clickable &&
            "cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_var(--color-black)] active:translate-x-0 active:translate-y-0 active:shadow-none",
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Tag.displayName = "Tag";

export { Tag };
