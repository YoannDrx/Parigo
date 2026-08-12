import "server-only";

import type { SearchFieldProfile, SearchMode } from "@/types";
import { cloudSearch } from "@/lib/harvest/catalog";
import type { HarvestSearchInput } from "@/lib/harvest/search";
export { AIMS_FILTER_FIELD_MAP } from "./aims-contract";

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
  aiPromptSearchAvailable: false;
  keywordFieldProfiles: SearchFieldProfile[];
}

export function getSearchCapabilities(): SearchCapabilities {
  return {
    keywordSearchAvailable: true,
    aiPromptSearchAvailable: false,
    keywordFieldProfiles: ["title", "editorial"],
  };
}
