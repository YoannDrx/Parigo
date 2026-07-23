"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)); }, [error]);
  return (
    <html lang="fr">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1>Une erreur inattendue est survenue.</h1>
            <p>Unexpected error. Please try again.</p>
            <button type="button" onClick={reset}>Réessayer · Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
