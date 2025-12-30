import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Get the current session from the request headers
 * Use this in API routes and server components
 */
export async function getServerSession() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  return session;
}

/**
 * Check if the user is authenticated and return the session
 * Throws an error if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Check if the user has admin role
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
