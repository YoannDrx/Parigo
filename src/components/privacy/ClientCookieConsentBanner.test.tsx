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

  it("réserve le bandeau dans le rendu initial pour éviter un LCP tardif", () => {
    expect(renderToString(<ClientCookieConsentBanner locale="fr" />)).toContain(CONSENT_BANNER_ID);
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
