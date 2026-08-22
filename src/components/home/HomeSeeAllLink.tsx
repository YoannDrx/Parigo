import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function HomeSeeAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="home-see-all group">
      <span>{children}</span>
      <span className="home-see-all__icon" aria-hidden="true">
        <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}
