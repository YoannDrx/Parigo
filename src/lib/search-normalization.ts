export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchTerms(value: string): string[] {
  return [...new Set(normalizeSearchText(value).split(" ").filter(Boolean))];
}

export function containsNormalizedExpression(source: string, expression: string): boolean {
  const normalizedSource = ` ${normalizeSearchText(source)} `;
  const normalizedExpression = normalizeSearchText(expression);
  return Boolean(normalizedExpression) && normalizedSource.includes(` ${normalizedExpression} `);
}
