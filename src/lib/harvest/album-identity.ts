const LEADING_SEPARATOR = /^[\s\-–—:|·]+/u;

function normalized(value: string): string {
  return value.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLocaleLowerCase("en");
}

export interface AlbumIdentity {
  title: string;
  code?: string;
}

export function albumIdentity(displayTitle: string, rawCode?: string | null): AlbumIdentity {
  const title = displayTitle.trim();
  const code = rawCode?.trim() || undefined;
  if (!code) return { title };

  const compactCode = normalized(code);
  if (!compactCode || !normalized(title).startsWith(compactCode)) return { title, code };

  let consumedAlphaNumeric = 0;
  let prefixEnd = 0;
  for (const character of title) {
    prefixEnd += character.length;
    if (/[a-z0-9]/i.test(character)) consumedAlphaNumeric += 1;
    if (consumedAlphaNumeric >= compactCode.length) break;
  }

  const editorialTitle = title.slice(prefixEnd).replace(LEADING_SEPARATOR, "").trim();
  return {
    title: editorialTitle || title,
    code,
  };
}
