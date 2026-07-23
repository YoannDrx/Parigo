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
      default: "bg-[var(--surface)] text-[var(--foreground)]",
      primary: "bg-[var(--signal-soft)] text-[var(--foreground)]",
      genre: "bg-[color-mix(in_srgb,var(--signal)_16%,var(--surface))] text-[var(--foreground)]",
      mood: "bg-[color-mix(in_srgb,#b9a4ff_22%,var(--surface))] text-[var(--foreground)]",
      instrument: "bg-[color-mix(in_srgb,#f0b34c_20%,var(--surface))] text-[var(--foreground)]",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "parigo-tag inline-flex min-h-7 items-center border border-[var(--line)] font-medium transition-all duration-200",
          variants[variant],
          sizes[size],
          clickable &&
            "cursor-pointer hover:border-[var(--line-strong)] hover:bg-[var(--signal-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]",
          className
        )}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.currentTarget.click();
          }
        } : undefined}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Tag.displayName = "Tag";

export { Tag };
