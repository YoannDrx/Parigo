import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HomeSectionCta({
  children,
  className,
  href,
  inverse = false,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      data-tone={inverse ? "inverse" : "default"}
      className={cn("home-section-cta inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-5 text-sm font-semibold", className)}
    >
      {children}
      <ArrowRight className="home-section-cta__arrow" size={15} aria-hidden="true" />
    </Link>
  );
}
