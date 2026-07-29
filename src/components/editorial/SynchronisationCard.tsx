import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface SynchronisationCardProps {
  href: string;
  image: string;
  title: string;
  client: string;
  detail?: string;
  className?: string;
  sizes?: string;
  headingLevel?: "h2" | "h3";
}

export function SynchronisationCard({
  href,
  image,
  title,
  client,
  detail,
  className,
  sizes = "(max-width: 768px) 86vw, 55vw",
  headingLevel = "h2",
}: SynchronisationCardProps) {
  const Heading = headingLevel;

  return (
    <Link href={href} className={cn("home-sync-card group block min-w-0", className)}>
      <div className="home-sync-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]">
        <Image
          src={image}
          alt={`${title} — ${client}`}
          fill
          sizes={sizes}
          className="home-sync-card__image object-contain transition duration-700"
        />
        <div className="home-sync-card__veil absolute inset-0 transition duration-500" />
        <span className="absolute left-5 top-5 z-[2] flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-black/22 text-white backdrop-blur-md transition group-hover:scale-110 group-hover:bg-[var(--signal)] group-focus-visible:scale-110 group-focus-visible:bg-[var(--signal)]">
          <Play size={17} fill="currentColor" />
        </span>
        <div className="home-sync-card__caption absolute inset-x-0 bottom-0 min-w-0 p-5 text-white transition duration-500 md:p-8">
          <p className="truncate font-mono text-[.6rem] uppercase tracking-[.13em] opacity-70">{client}</p>
          <Heading className="mt-2 line-clamp-2 text-2xl font-semibold md:text-4xl">{title}</Heading>
          {detail && <p className="mt-2 truncate text-sm text-white/72">{detail}</p>}
        </div>
      </div>
    </Link>
  );
}
