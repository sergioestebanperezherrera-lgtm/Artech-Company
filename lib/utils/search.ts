export function normalizeSearchText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-GT");
}

export function matchesSearchQuery(value: string, query: string) {
  const normalizedValue = normalizeSearchText(value);
  const queryParts = normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean);

  return queryParts.every((part) => normalizedValue.includes(part));
}
