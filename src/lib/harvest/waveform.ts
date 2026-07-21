import { isRecord } from "./errors";

export function normalizeWaveform(payload: unknown, target = 1000): number[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  const values = payload.data.map(Number).filter(Number.isFinite);
  const peaks: number[] = [];
  for (let index = 0; index < values.length; index += 2) {
    peaks.push(Math.min(1, Math.max(Math.abs(values[index] || 0), Math.abs(values[index + 1] || 0)) / 128));
  }
  if (peaks.length <= target) return peaks;
  const bucketSize = peaks.length / target;
  return Array.from({ length: target }, (_, bucket) => {
    const start = Math.floor(bucket * bucketSize);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * bucketSize));
    return Math.max(...peaks.slice(start, end));
  });
}
