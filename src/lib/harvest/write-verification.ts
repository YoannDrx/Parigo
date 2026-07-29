import "server-only";

export const WRITE_VERIFICATION_OFFSETS_MS = [0, 250, 1_000, 3_000, 10_000, 30_000] as const;

export async function waitForVerificationOffset(index: number): Promise<void> {
  const previous = index === 0 ? 0 : WRITE_VERIFICATION_OFFSETS_MS[index - 1];
  const delay = WRITE_VERIFICATION_OFFSETS_MS[index] - previous;
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}
