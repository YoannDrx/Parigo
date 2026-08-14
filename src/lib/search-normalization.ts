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

interface SearchTokenSpan {
  start: number;
  end: number;
  normalized: string;
}

function searchTokenSpans(value: string): SearchTokenSpan[] {
  return [...value.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    normalized: normalizeSearchText(match[0]),
  }));
}

function sourcePrefixEnd(source: string, span: SearchTokenSpan, normalizedPrefix: string): number {
  let normalized = "";
  let consumedLength = 0;
  for (const character of source.slice(span.start, span.end)) {
    normalized += normalizeSearchText(character);
    consumedLength += character.length;
    if (normalized.length >= normalizedPrefix.length) return span.start + consumedLength;
  }
  return span.end;
}

function normalizedExpressionSpan(source: string, expression: string): { start: number; end: number } | undefined {
  const sourceTokens = searchTokenSpans(source);
  const expressionTokens = searchTokenSpans(expression).map((token) => token.normalized);
  if (!expressionTokens.length || sourceTokens.length < expressionTokens.length) return undefined;
  for (let index = 0; index <= sourceTokens.length - expressionTokens.length; index += 1) {
    if (expressionTokens.every((token, offset) => sourceTokens[index + offset].normalized === token)) {
      return {
        start: sourceTokens[index].start,
        end: sourceTokens[index + expressionTokens.length - 1].end,
      };
    }
  }
  return undefined;
}

export function matchedSearchExpression(source: string, expression: string): string | undefined {
  const span = normalizedExpressionSpan(source, expression);
  return span ? source.slice(span.start, span.end) : undefined;
}

function cleanConsumedSearchText(value: string): string {
  return value
    .replace(/\(\s*\)|\[\s*\]|\{\s*\}|(["'])\s*\1/gu, " ")
    .replace(/^[\s,;:+/|–—-]+|[\s,;:+/|–—-]+$/gu, "")
    .replace(/\s+([,;:.!?)}\]])/gu, "$1")
    .replace(/([{([])\s+/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

export function consumeSearchExpression(source: string, expression?: string): string {
  if (!expression?.trim()) return source.trim();
  let remaining = source;
  let span = normalizedExpressionSpan(remaining, expression);
  while (span) {
    const before = remaining.slice(0, span.start).replace(/[\s,;:+/|–—-]+$/u, "");
    const after = remaining.slice(span.end).replace(/^[\s,;:+/|–—-]+/u, "");
    remaining = cleanConsumedSearchText([before, after].filter(Boolean).join(" "));
    span = normalizedExpressionSpan(remaining, expression);
  }
  return remaining;
}

export function searchExpressionsCoverQuery(source: string, expressions: Array<string | null | undefined>): boolean {
  const uniqueExpressions = [...new Set(expressions.map((expression) => expression?.trim()).filter((expression): expression is string => Boolean(expression)))]
    .toSorted((left, right) => normalizeSearchText(right).length - normalizeSearchText(left).length);
  const remaining = uniqueExpressions.reduce((value, expression) => consumeSearchExpression(value, expression), source);
  return normalizeSearchText(remaining) === "";
}

export interface SearchTextSegment {
  text: string;
  matched: boolean;
}

export function searchTextSegments(source: string, expression?: string): SearchTextSegment[] {
  if (!source || !expression?.trim()) return source ? [{ text: source, matched: false }] : [];
  const segments: SearchTextSegment[] = [];
  let remaining = source;
  let span = normalizedExpressionSpan(remaining, expression);
  while (span) {
    if (span.start > 0) segments.push({ text: remaining.slice(0, span.start), matched: false });
    segments.push({ text: remaining.slice(span.start, span.end), matched: true });
    remaining = remaining.slice(span.end);
    span = normalizedExpressionSpan(remaining, expression);
  }
  if (remaining) segments.push({ text: remaining, matched: false });
  return segments.length ? segments : [{ text: source, matched: false }];
}

/**
 * Lyrics search accepts a conservative word-prefix fallback because the catalog
 * can return inflected words for a shorter query (for example `balad` for
 * `balade`). Structured filters deliberately keep their exact-match contract.
 */
export function searchLyricsTextSegments(source: string, expression?: string): SearchTextSegment[] {
  const exactSegments = searchTextSegments(source, expression);
  if (!source || !expression?.trim() || exactSegments.some((segment) => segment.matched)) return exactSegments;

  const terms = searchTerms(expression);
  const matchingSpans = searchTokenSpans(source).flatMap((span) => {
    const matchingTerm = terms
      .filter((term) => span.normalized === term || (term.length >= 4 && span.normalized.startsWith(term)))
      .toSorted((left, right) => right.length - left.length)[0];
    if (!matchingTerm) return [];
    return [{
      ...span,
      end: span.normalized === matchingTerm ? span.end : sourcePrefixEnd(source, span, matchingTerm),
    }];
  });
  if (!matchingSpans.length) return exactSegments;

  const segments: SearchTextSegment[] = [];
  let cursor = 0;
  for (const span of matchingSpans) {
    if (span.start > cursor) segments.push({ text: source.slice(cursor, span.start), matched: false });
    segments.push({ text: source.slice(span.start, span.end), matched: true });
    cursor = span.end;
  }
  if (cursor < source.length) segments.push({ text: source.slice(cursor), matched: false });
  return segments;
}
