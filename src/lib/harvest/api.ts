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
  options: { surface?: "catalog" | "account" } = {},
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
  const publicMessage = normalized.code === "HARVEST_INVALID_RESPONSE"
    ? "Le service Parigo a renvoyé une réponse inattendue."
    : normalized.code === "HARVEST_UNAVAILABLE"
      ? "Le service Parigo est temporairement indisponible."
      : normalized.message.replace(/Harvest/gi, "Parigo");
  logEvent({
    level: normalized.status >= 500 ? "error" : "warn",
    message: "api_request_failed",
    route: options.surface || "catalog",
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
