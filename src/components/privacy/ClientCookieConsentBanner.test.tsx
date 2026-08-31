import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONSENT_BANNER_ID,
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  createDefaultConsentPreferences,
} from "@/lib/consent";
import { ClientCookieConsentBanner } from "./ClientCookieConsentBanner";

describe("ClientCookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${CONSENT_COOKIE_NAME}=;path=/;max-age=0`;
  });

  afterEach(cleanup);

  it("sérialise le bandeau pour les nouveaux visiteurs dans la coque HTML partagée", () => {
    expect(renderToString(<ClientCookieConsentBanner locale="fr" />)).toContain(CONSENT_BANNER_ID);
  });

  it("respecte après hydratation un choix conservé uniquement dans le cookie", async () => {
    const snapshot = JSON.stringify({
      ...createDefaultConsentPreferences(),
      updatedAt: "2026-08-31T22:00:00.000Z",
    });
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(snapshot)};path=/`;

    render(<ClientCookieConsentBanner locale="fr" />);

    await waitFor(() => {
      expect(screen.queryByRole("complementary", { name: "Préférences de cookies" })).not.toBeInTheDocument();
    });
  });

  it("affiche le bandeau après hydratation lorsqu’aucun choix n’existe", async () => {
    render(<ClientCookieConsentBanner locale="fr" />);

    expect(await screen.findByRole("complementary", { name: "Préférences de cookies" })).toBeVisible();
  });

  it("ne sérialise pas le choix du visiteur dans le rendu partagé", async () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      ...createDefaultConsentPreferences(),
      updatedAt: "2026-08-06T09:00:00.000Z",
    }));

    render(<ClientCookieConsentBanner locale="fr" />);

    await waitFor(() => {
      expect(screen.queryByRole("complementary", { name: "Préférences de cookies" })).not.toBeInTheDocument();
    });
  });
});
