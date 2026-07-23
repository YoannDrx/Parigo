import "server-only";

import { notFound } from "next/navigation";
import { HarvestError } from "./errors";

export function rethrowCatalogError(error: unknown): never {
  if (error instanceof HarvestError && error.code === "NOT_FOUND") notFound();
  throw error;
}
