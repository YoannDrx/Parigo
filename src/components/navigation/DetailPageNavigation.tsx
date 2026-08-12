import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/messages";
import type { DetailNavigation, DetailNavigationItem } from "@/lib/navigation/detail-navigation";
import { localizedPath } from "@/lib/locale";

function NavigationLink({
  direction,
  item,
  locale,
}: {
  direction: "previous" | "next";
  item: DetailNavigationItem;
  locale: Locale;
}) {
  const isPrevious = direction === "previous";
  const label = locale === "fr"
    ? isPrevious ? "Précédent" : "Suivant"
    : isPrevious ? "Previous" : "Next";
  const Arrow = isPrevious ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={localizedPath(locale, item.href)}
      rel={direction}
      aria-label={`${label} : ${item.title}`}
      className={`detail-nav-card detail-nav-card--${direction} group relative isolate grid min-w-0 grid-cols-1 content-start overflow-hidden border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_8px_26px_rgba(15,22,16,.045)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--surface-soft)] hover:shadow-[0_14px_36px_rgba(15,22,16,.08)] focus-visible:-translate-y-0.5 focus-visible:bg-[var(--surface-soft)] sm:min-h-36 sm:items-stretch sm:gap-2 ${isPrevious ? "text-left sm:grid-cols-[7rem_minmax(0,1fr)]" : "text-right sm:grid-cols-[minmax(0,1fr)_7rem]"}`}
    >
      {item.image ? (
        <div className={`detail-nav-image detail-nav-image--${direction} relative aspect-square w-full self-start overflow-hidden border border-[var(--line)] bg-[var(--background)] sm:self-center ${isPrevious ? "order-1" : "order-1 sm:order-2"}`}>
          <Image
            src={item.image}
            alt=""
            fill
            sizes="112px"
            className={`${item.imageFit === "contain" ? "object-contain p-1.5" : "object-cover"} transition duration-500 group-hover:scale-[1.025]`}
          />
        </div>
      ) : (
        <div className={`detail-nav-image detail-nav-image--${direction} grid aspect-square w-full self-start place-items-center border border-[var(--line)] bg-[var(--background)] text-[var(--text-muted)] sm:self-center ${isPrevious ? "order-1" : "order-1 sm:order-2"}`} aria-hidden="true">
          <Arrow size={21} />
        </div>
      )}
      <div className={`flex min-w-0 flex-col justify-center px-2 py-4 sm:px-5 ${isPrevious ? "order-2 items-start" : "order-2 items-end sm:order-1"}`}>
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[.48rem] uppercase tracking-[.1em] text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--signal-strong)] group-focus-visible:text-[var(--signal-strong)] sm:gap-2 sm:text-[.57rem] sm:tracking-[.13em]">
          {isPrevious ? <Arrow className="detail-nav-arrow shrink-0" size={14} strokeWidth={1.6} /> : null}
          {label}
          {!isPrevious ? <Arrow className="detail-nav-arrow shrink-0" size={14} strokeWidth={1.6} /> : null}
        </span>
        <span className="mt-2 line-clamp-2 text-sm font-semibold leading-snug tracking-[-.025em] sm:mt-3 sm:text-xl">{item.title}</span>
        {item.eyebrow ? <span className="mt-1 line-clamp-1 text-[.65rem] text-[var(--text-muted)] sm:text-xs">{item.eyebrow}</span> : null}
      </div>
    </Link>
  );
}

export function DetailPageNavigation({
  navigation,
  locale,
}: {
  navigation?: DetailNavigation;
  locale: Locale;
}) {
  if (!navigation?.previous && !navigation?.next) return null;

  return (
    <nav data-testid="detail-page-navigation" aria-label={locale === "fr" ? "Navigation entre les pages de détail" : "Detail page navigation"} className="border-t border-[var(--line)] bg-[var(--background)] px-4 py-12 sm:px-6 lg:px-8 md:py-16">
      <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2 sm:gap-3">
        {navigation.previous ? <NavigationLink direction="previous" item={navigation.previous} locale={locale} /> : <div aria-hidden="true" />}
        {navigation.next ? <NavigationLink direction="next" item={navigation.next} locale={locale} /> : null}
      </div>
    </nav>
  );
}
