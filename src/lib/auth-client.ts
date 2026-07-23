"use client";

import { useSyncExternalStore } from "react";

interface ClientSession {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: string;
    createdAt: string;
  };
  session: { expiresAt: string };
}

interface SessionState {
  data: ClientSession | null;
  isPending: boolean;
}

let state: SessionState = { data: null, isPending: true };
const serverState: SessionState = { data: null, isPending: true };
let sessionPromise: Promise<void> | undefined;
const listeners = new Set<() => void>();

function emit(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (state.isPending) void loadSession();
  return () => listeners.delete(listener);
}

async function loadSession(force = false): Promise<void> {
  if (sessionPromise && !force) return sessionPromise;
  sessionPromise = fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => {
      const payload = response.ok ? await response.json() : { data: { session: null } };
      emit({ data: payload.data?.session || null, isPending: false });
    })
    .catch(() => emit({ data: null, isPending: false }))
    .finally(() => { sessionPromise = undefined; });
  return sessionPromise;
}

async function authRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || "Authentication failed";
    return { error: { message }, data: null };
  }
  await loadSession(true);
  return { error: null, data: payload.data ?? null };
}

export const signIn = {
  email: ({ email, password }: { email: string; password: string }) =>
    authRequest("/api/auth/login", { email, password }),
};

export const signUp = {
  email: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    country: string;
    company?: string;
    production?: string;
    subProduction?: string;
    position?: string;
    address1?: string;
    address2?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    phone?: string;
    fileFormatId?: string;
    subscribe?: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  }) => authRequest("/api/auth/register", input),
};

export async function signOut() {
  const result = await authRequest("/api/auth/logout");
  emit({ data: null, isPending: false });
  return result;
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export async function getSession() {
  await loadSession(true);
  return state;
}

export const authClient = { signIn, signUp, signOut, useSession, getSession };
