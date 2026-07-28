export const PARIGO_TIME_ZONE = "Europe/Paris";

function dateValue(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatParigoDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = dateValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: PARIGO_TIME_ZONE,
  }).format(date);
}

export function formatParigoTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = dateValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
    timeZone: PARIGO_TIME_ZONE,
  }).format(date);
}
