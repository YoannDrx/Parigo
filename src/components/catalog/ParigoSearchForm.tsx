import { Search } from "lucide-react";
import type { Locale } from "@/i18n/messages";

export function ParigoSearchForm({
  action,
  defaultValue,
  placeholder,
  label,
  locale,
  hiddenFields,
}: {
  action: string;
  defaultValue: string;
  placeholder: string;
  label: string;
  locale: Locale;
  hiddenFields?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="catalog-toolbar search-toolbar mb-10 max-w-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 sm:p-4">
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        value ? <input key={name} type="hidden" name={name} value={value} /> : null
      ))}
      <label className="catalog-search-frame search-query-frame relative flex min-h-14 items-center border border-[var(--line-strong)] bg-[var(--background)]">
        <Search aria-hidden="true" size={18} className="ml-4 shrink-0 text-[var(--signal-strong)]" />
        <span className="sr-only">{label}</span>
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="ai-search-input h-14 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
        />
        <button type="submit" className="mr-1 min-h-11 border-l border-[var(--line)] px-4 text-xs font-semibold uppercase tracking-[.08em] transition hover:bg-[var(--surface-soft)]">
          {locale === "fr" ? "Rechercher" : "Search"}
        </button>
      </label>
    </form>
  );
}
