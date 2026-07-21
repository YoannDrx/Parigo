import { publicSession, readHarvestSession, requireHarvestSession } from "./harvest/session";

export async function getServerSession() {
  return publicSession(await readHarvestSession());
}

export async function requireAuth() {
  const session = await requireHarvestSession();
  return publicSession(session)!;
}

export async function requireAdmin(): Promise<never> {
  throw new Error("Harvest member sessions do not expose a Parigo admin role");
}
