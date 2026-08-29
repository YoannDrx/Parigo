import type { Label } from "@/types";

export function normalizeLabelSearchValue(value: string, locale: "fr" | "en"): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function labelMatchesQuery(
  label: Pick<Label, "name" | "references"> & { description?: string | null },
  query: string,
  locale: "fr" | "en",
): boolean {
  const terms = normalizeLabelSearchValue(query, locale).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const searchable = normalizeLabelSearchValue(
    [label.name, label.description, ...(label.references ?? [])].filter(Boolean).join(" "),
    locale,
  );
  return terms.every((term) => searchable.includes(term));
}
