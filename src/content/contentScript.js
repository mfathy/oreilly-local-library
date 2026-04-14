const CONTROL_CLASS = "oreilly-local-library-control";
let libraryRecords = [];
let libraryIdIndex = {};
const OREILLY_BOOK_URL_PATTERN = /\/library\/view\/-\/([^/?#]+)/i;
const STORAGE_KEYS = {
  records: "libraryRecords",
  idIndex: "libraryIdIndex",
  updatedAt: "libraryUpdatedAt"
};

function asNonEmptyString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function parseBookIdFromUrl(url) {
  const normalizedUrl = asNonEmptyString(url);
  if (!normalizedUrl) {
    return "";
  }
  const match = normalizedUrl.match(OREILLY_BOOK_URL_PATTERN);
  return match?.[1]?.trim() || "";
}

function normalizeId(value) {
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

function normalizeLibraryRecords(inputRecords) {
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

function toIdIndex(records) {
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

function extractPossibleIdsFromElement(element) {
  const ids = new Set();

  if (!(element instanceof Element)) {
    return ids;
  }

  for (const attr of ["href", "data-id", "data-book-id", "data-isbn"]) {
    const value = element.getAttribute(attr);
    if (!value) {
      continue;
    }
    const normalized = normalizeId(value);
    if (normalized) {
      ids.add(normalized);
    }
    const fromUrl = normalizeId(parseBookIdFromUrl(value));
    if (fromUrl) {
      ids.add(fromUrl);
    }
  }

  return ids;
}

function isOwnedById(element) {
  const candidates = new Set();
  const parentLink = element.closest("a[href]");
  const ownLink = element.matches("a[href]") ? element : null;

  for (const id of extractPossibleIdsFromElement(element)) {
    candidates.add(id);
  }
  if (parentLink) {
    for (const id of extractPossibleIdsFromElement(parentLink)) {
      candidates.add(id);
    }
  }
  if (ownLink) {
    for (const id of extractPossibleIdsFromElement(ownLink)) {
      candidates.add(id);
    }
  }

  for (const id of candidates) {
    if (libraryIdIndex[id]) {
      return true;
    }
  }
  return false;
}

function extractRecordFromAnchor(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  const title = asNonEmptyString(anchor.textContent);
  const url = asNonEmptyString(anchor.href);
  const parsedId = parseBookIdFromUrl(url);
  const fallbackId = normalizeId(anchor.getAttribute("data-book-id"));
  const bookId = parsedId || fallbackId;

  return simplifyRecord({
    bookId,
    isbn: bookId,
    title,
    url,
    description: ""
  });
}

function createActionButton(label, isDanger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = CONTROL_CLASS;
  button.textContent = label;
  button.style.marginLeft = "6px";
  button.style.padding = "1px 8px";
  button.style.borderRadius = "999px";
  button.style.fontSize = "11px";
  button.style.fontWeight = "700";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.gap = "4px";
  button.style.verticalAlign = "middle";
  button.style.cursor = "pointer";
  button.style.border = "none";
  button.style.color = "#ffffff";
  button.style.background = isDanger ? "#dc2626" : "#2563eb";
  return button;
}

function createOwnedControl(anchor, record) {
  const button = createActionButton("Owned \u00d7", true);
  button.title = "Remove from your local JSON library";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await removeRecord(record.bookId);
  });
  return button;
}

function createAddControl(anchor, record) {
  const button = createActionButton("Add");
  button.title = "Add this book to your local JSON library";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await addRecord(record);
  });
  return button;
}

function clearExistingControl(anchor) {
  const existing = anchor.querySelector(`:scope > .${CONTROL_CLASS}`);
  if (existing) {
    existing.remove();
  }
}

function maybeInjectControl(target) {
  if (!(target instanceof HTMLAnchorElement)) {
    return;
  }
  const titleHeader = target.closest("h3[data-testid^='title-link-']");
  if (!titleHeader) {
    return;
  }

  const record = extractRecordFromAnchor(target);
  if (!record) {
    return;
  }

  clearExistingControl(target);
  const control = isOwnedById(target)
    ? createOwnedControl(target, record)
    : createAddControl(target, record);
  target.appendChild(control);
}

function scanPage() {
  const selectors = [
    "h3[data-testid^='title-link-'] a[href*='/library/view/-/']"
  ];

  const targets = document.querySelectorAll(selectors.join(","));
  for (const target of targets) {
    maybeInjectControl(target);
  }
}

function debounce(fn, delayMs) {
  let timer = null;
  return function debounced() {
    clearTimeout(timer);
    timer = setTimeout(() => fn(), delayMs);
  };
}

function watchDomChanges() {
  const debouncedScan = debounce(scanPage, 200);
  const observer = new MutationObserver(() => {
    debouncedScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function refreshIndexFromStorage() {
  chrome.storage.local.get(
    [STORAGE_KEYS.records, STORAGE_KEYS.idIndex],
    (result) => {
      libraryRecords = Array.isArray(result[STORAGE_KEYS.records])
        ? result[STORAGE_KEYS.records]
        : [];
      libraryIdIndex = result[STORAGE_KEYS.idIndex] || {};
      scanPage();
    }
  );
}

function saveLibraryState(nextRecords) {
  const records = normalizeLibraryRecords(nextRecords);
  const idIndex = toIdIndex(records);
  const updatedAt = new Date().toISOString();

  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [STORAGE_KEYS.records]: records,
        [STORAGE_KEYS.idIndex]: idIndex,
        [STORAGE_KEYS.updatedAt]: updatedAt
      },
      () => {
        libraryRecords = records;
        libraryIdIndex = idIndex;
        resolve();
      }
    );
  });
}

async function addRecord(record) {
  const nextRecords = normalizeLibraryRecords([...libraryRecords, record]);
  await saveLibraryState(nextRecords);
  scanPage();
}

async function removeRecord(bookId) {
  const id = normalizeId(bookId);
  const nextRecords = libraryRecords.filter((record) => {
    const bookRecordId = normalizeId(record.bookId);
    const isbnId = normalizeId(record.isbn);
    const urlId = normalizeId(parseBookIdFromUrl(record.url));
    return bookRecordId !== id && isbnId !== id && urlId !== id;
  });
  await saveLibraryState(nextRecords);
  scanPage();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }
  if (changes[STORAGE_KEYS.records]) {
    libraryRecords = Array.isArray(changes[STORAGE_KEYS.records].newValue)
      ? changes[STORAGE_KEYS.records].newValue
      : [];
  }
  if (changes[STORAGE_KEYS.idIndex]) {
    libraryIdIndex = changes[STORAGE_KEYS.idIndex].newValue || {};
  }
  if (changes[STORAGE_KEYS.records] || changes[STORAGE_KEYS.idIndex]) {
    scanPage();
  }
});

refreshIndexFromStorage();
watchDomChanges();
