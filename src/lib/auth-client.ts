"use client";

import { createAuthClient } from "better-auth/react";

// Better Auth resolves relative endpoints against the current browser origin.
// Keeping the client same-origin also makes previews and non-default dev ports work.
export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
