import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CarouselNavButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  direction: "previous" | "next";
  inverse?: boolean;
};

export function CarouselNavButton({
  className,
  direction,
  inverse = false,
  type = "button",
  ...props
}: CarouselNavButtonProps) {
  const previous = direction === "previous";

  return (
    <button
      type={type}
      className={cn(
        "carousel-nav-button relative grid h-10 w-10 place-items-center",
        previous ? "carousel-nav-button--previous" : "carousel-nav-button--next",
        inverse && "carousel-nav-button--inverse",
        className,
      )}
      {...props}
    >
      <svg className="carousel-nav-button__icon" viewBox="0 0 20 14" aria-hidden="true">
        <path d={previous ? "M8 2.5 3.5 7 8 11.5M4 7h12.5" : "m12 2.5 4.5 4.5-4.5 4.5M3.5 7H16"} />
      </svg>
    </button>
  );
}
