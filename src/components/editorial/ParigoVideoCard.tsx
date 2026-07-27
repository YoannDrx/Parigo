import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function ParigoVideoCard({
  href,
  image,
  title,
  eyebrow,
  detail,
  sizes = "(max-width: 1024px) 100vw, 50vw",
  className,
  headingLevel = "h2",
}: {
  href: string;
  image: string;
  title: string;
  eyebrow: string;
  detail?: string;
  sizes?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <Link href={href} className={cn("home-sync-card parigo-video-card group block min-w-0", className)}>
      <div className="home-sync-card__frame parigo-video-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]">
        <Image
          src={image}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.025] group-focus-visible:scale-[1.025]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/8 to-black/10" />
        <span className="absolute left-4 top-4 z-[2] flex h-10 w-10 items-center justify-center rounded-full border border-white/45 bg-black/25 text-white shadow-xl backdrop-blur-md transition duration-500 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-[var(--signal)] group-focus-visible:rotate-[8deg] group-focus-visible:scale-110 group-focus-visible:bg-[var(--signal)]">
          <Play size={16} fill="currentColor" />
        </span>
        <div className="absolute inset-x-0 bottom-0 z-[2] min-w-0 p-4 text-white sm:p-6">
          <p className="truncate font-mono text-[.54rem] uppercase tracking-[.13em] text-white/68">{eyebrow}</p>
          <Heading className="mt-1.5 line-clamp-2 text-2xl font-semibold tracking-[-.045em] sm:text-3xl">{title}</Heading>
          {detail && <p className="mt-2 line-clamp-1 text-sm text-white/72">{detail}</p>}
        </div>
        <span aria-hidden="true" className="parigo-video-card__ring" />
      </div>
    </Link>
  );
}
