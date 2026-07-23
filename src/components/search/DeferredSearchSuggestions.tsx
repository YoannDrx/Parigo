"use client";

import { useEffect, useState, type ComponentType } from "react";

type Props = { locale: "fr" | "en"; onSelect: (suggestion: string) => void };

export function DeferredSearchSuggestions(props: Props) {
  const [Suggestions, setSuggestions] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    let active = true;
    void import("./SearchSuggestions").then((module) => {
      if (active) setSuggestions(() => module.SearchSuggestions);
    });
    return () => { active = false; };
  }, []);

  return Suggestions ? <Suggestions {...props} /> : <div aria-hidden="true" className="mb-5 h-20 border-y border-[var(--line)]" />;
}
