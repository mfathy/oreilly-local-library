const OREILLY_BOOK_URL_PATTERN = /\/library\/view\/-\/([^/?#]+)/i;

function asNonEmptyString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function parseBookIdFromUrl(url) {
  const normalizedUrl = asNonEmptyString(url);
  if (!normalizedUrl) {
    return "";
  }
  const match = normalizedUrl.match(OREILLY_BOOK_URL_PATTERN);
  return match?.[1]?.trim() || "";
}

export function normalizeId(value) {
  return asNonEmptyString(value).replace(/[-\s]/g, "").toLowerCase();
}

function simplifyRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const bookId = asNonEmptyString(record.bookId);
  const isbn = asNonEmptyString(record.isbn);
  const title = asNonEmptyString(record.title);
  const url = asNonEmptyString(record.url);
  const description = asNonEmptyString(record.description);
  const parsedBookIdFromUrl = parseBookIdFromUrl(url);
  const resolvedBookId = bookId || isbn || parsedBookIdFromUrl;

  if (!resolvedBookId || !title) {
    return null;
  }

  return {
    bookId: resolvedBookId,
    isbn: isbn || resolvedBookId,
    title,
    url,
    description
  };
}

export function normalizeLibraryRecords(inputRecords) {
  const list = Array.isArray(inputRecords) ? inputRecords : [];
  const dedupedById = new Map();

  for (const record of list) {
    const simplified = simplifyRecord(record);
    if (!simplified) {
      continue;
    }
    const dedupeKey = normalizeId(simplified.bookId);
    if (!dedupeKey) {
      continue;
    }
    dedupedById.set(dedupeKey, simplified);
  }

  return Array.from(dedupedById.values()).sort((a, b) =>
    a.title.localeCompare(b.title, undefined, {
      sensitivity: "base",
      numeric: true
    })
  );
}

export function toIdIndex(records) {
  const index = {};
  for (const record of records) {
    const bookId = normalizeId(record.bookId);
    const isbn = normalizeId(record.isbn);
    const urlBookId = normalizeId(parseBookIdFromUrl(record.url));
    if (bookId) {
      index[bookId] = true;
    }
    if (isbn) {
      index[isbn] = true;
    }
    if (urlBookId) {
      index[urlBookId] = true;
    }
  }
  return index;
}
