import "server-only";

import type { SearchFieldProfile, SearchMode } from "@/types";
import { cloudSearch } from "@/lib/harvest/catalog";
import type { HarvestSearchInput } from "@/lib/harvest/search";

export interface SearchProvider {
  readonly id: "harvest-keyword" | "aims-prompt";
  readonly mode: SearchMode;
  search(input: HarvestSearchInput, memberToken?: string): ReturnType<typeof cloudSearch>;
}

export const harvestKeywordProvider: SearchProvider = {
  id: "harvest-keyword",
  mode: "keyword",
  search: (input, memberToken) => cloudSearch(input, memberToken),
};

export interface SearchCapabilities {
  keywordSearchAvailable: true;
  aiPromptSearchAvailable: boolean;
  keywordFieldProfiles: SearchFieldProfile[];
}

export function getSearchCapabilities(aiPromptSearchAvailable = false): SearchCapabilities {
  return {
    keywordSearchAvailable: true,
    aiPromptSearchAvailable,
    keywordFieldProfiles: ["title", "aggregate-title-first"],
  };
}
