"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Button } from "@/components/ui";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  size?: "md" | "lg";
  onSearch?: (query: string) => void;
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Rechercher par mot-clé, genre, mood...",
  size = "md",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            isSearch
            className={size === "lg" ? "py-4 text-lg" : ""}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size={size}
          className="px-6"
        >
          <Search size={size === "lg" ? 22 : 18} className="sm:mr-2" />
          <span className="hidden sm:inline">Rechercher</span>
        </Button>
      </div>
    </form>
  );
}
