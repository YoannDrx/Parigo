"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, padding = "md", children, ...props }, ref) => {
    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-7",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-[var(--color-white)] border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[5px_5px_0px_var(--color-black)] transition-all duration-200",
          hover &&
            "hover:shadow-[8px_8px_0px_var(--color-black)] hover:translate-x-[-3px] hover:translate-y-[-3px]",
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
