import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Album, Label, Playlist, Track } from "@/types";
import { HarvestError } from "./errors";
import { logEvent } from "@/lib/logger";

export function requestId(): string {
  return crypto.randomUUID();
}

export function apiError(
  error: unknown,
  id = requestId(),
  options: {
    surface?: "catalog" | "account";
    operation?: "saved-search-list" | "saved-search-create" | "playlist-create" | "cue-sheet";
  } = {},
): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: error.issues[0]?.message || "Invalid request",
          retryable: false,
          requestId: id,
        },
      },
      { status: 400, headers: { "X-Request-ID": id } },
    );
  }
  const normalized = error instanceof HarvestError
    ? error
    : new HarvestError(
        error instanceof Error ? error.message : "Unexpected server error",
        "HARVEST_UNAVAILABLE",
        500,
        false,
      );
  const publicCode = normalized.code === "HARVEST_INVALID_RESPONSE"
    ? "INVALID_UPSTREAM_RESPONSE"
    : normalized.code === "HARVEST_UNAVAILABLE"
      ? options.surface === "account" ? "ACCOUNT_UNAVAILABLE" : "CATALOG_UNAVAILABLE"
      : normalized.code;
  const operationMessage =
    options.operation === "saved-search-list" && normalized.code === "HARVEST_UNAVAILABLE"
      ? "Vos recherches sauvegardées mettent trop de temps à répondre. Vous pouvez réessayer sans recréer la recherche."
      : options.operation === "saved-search-create" && ["HARVEST_INVALID_RESPONSE", "HARVEST_UNAVAILABLE"].includes(normalized.code)
        ? "La demande a été envoyée, mais Parigo n’a pas pu confirmer la recherche sauvegardée. Vérifiez votre compte avant de la recréer."
        : options.operation === "playlist-create" && normalized.code === "HARVEST_INVALID_RESPONSE"
          ? "La création de playlists n’est pas disponible pour ce compte pour le moment."
          : options.operation === "cue-sheet" && normalized.code === "VALIDATION_FAILED"
            ? "Impossible de générer la cue sheet avec les informations acceptées par le service."
            : undefined;
  const publicMessage = operationMessage || (normalized.code === "HARVEST_INVALID_RESPONSE"
    ? "Le service Parigo a renvoyé une réponse inattendue."
    : normalized.code === "HARVEST_UNAVAILABLE"
      ? "Le service Parigo est temporairement indisponible."
      : normalized.message.replace(/Harvest/gi, "Parigo"));
  logEvent({
    level: normalized.status >= 500 ? "error" : "warn",
    message: "api_request_failed",
    route: options.operation || options.surface || "catalog",
    requestId: id,
    status: normalized.status,
    code: normalized.code,
  });
  return NextResponse.json(
    {
      error: {
        code: publicCode,
        message: publicMessage,
        retryable: normalized.retryable,
        ...(normalized.upstreamCode ? { upstreamCode: normalized.upstreamCode } : {}),
        ...(options.operation ? { operation: options.operation } : {}),
        requestId: id,
      },
    },
    { status: normalized.status, headers: { "X-Request-ID": id } },
  );
}

export function apiAlbum(album: Album) {
  return album;
}

export function apiTrack(track: Track) {
  return track;
}

export function apiPlaylist(playlist: Playlist) {
  return playlist;
}

export function apiLabel(label: Label) {
  return label;
}
