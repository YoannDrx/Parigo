"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { useI18n } from "@/components/providers/I18nProvider";
import type { CatalogCategory } from "@/types";

export default function CollectionsPage() {
  const { locale } = useI18n();
  const [items, setItems] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collections", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Collections unavailable")))
      .then((payload) => setItems(payload.data?.collections || []))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CatalogHero
          eyebrow="Parigo / Styles"
          title={locale === "fr" ? "Les collections" : "Collections"}
          intro={locale === "fr" ? "Explorez le catalogue par esthétique, époque et territoire musical." : "Explore the catalogue by style, period and musical territory."}
          meta={`${items.length} collections`}
        />
        <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
          <label className="mb-10 flex max-w-xl items-center gap-3 border-b border-[var(--line-strong)] py-3">
            <Search size={18} />
            <span className="sr-only">{locale === "fr" ? "Rechercher une collection" : "Search collections"}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder={locale === "fr" ? "Rechercher une collection" : "Search collections"} />
          </label>
          {loading ? <Loader2 className="mx-auto animate-spin" /> : (
            <div className="grid border-l border-t border-[var(--line)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item, index) => (
                <Link key={item.id} href={`/collections/${item.id}`} className="group flex min-h-40 flex-col justify-between border-b border-r border-[var(--line)] p-5 transition hover:bg-[var(--signal-soft)]">
                  <span className="font-mono text-[.62rem] opacity-40">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="font-[var(--font-editorial)] text-3xl font-normal tracking-[-.04em] group-hover:italic">{item.name}</h2>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
