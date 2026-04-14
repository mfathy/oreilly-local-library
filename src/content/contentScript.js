const BADGE_CLASS = "oreilly-local-library-badge";
let libraryIdIndex = {};
const OREILLY_BOOK_URL_PATTERN = /\/library\/view\/-\/([^/?#]+)/i;

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

function createBadge() {
  const badge = document.createElement("span");
  badge.className = BADGE_CLASS;
  badge.textContent = "Owned";
  badge.style.marginLeft = "6px";
  badge.style.padding = "1px 6px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "11px";
  badge.style.fontWeight = "700";
  badge.style.background = "#16a34a";
  badge.style.color = "#ffffff";
  badge.style.display = "inline-flex";
  badge.style.verticalAlign = "middle";
  return badge;
}

function maybeInjectBadge(target) {
  if (!(target instanceof HTMLAnchorElement)) {
    return;
  }
  if (target.classList.contains(BADGE_CLASS) || target.closest(`.${BADGE_CLASS}`)) {
    return;
  }
  const titleHeader = target.closest("h3[data-testid^='title-link-']");
  if (!titleHeader) {
    return;
  }
  if (!isOwnedById(target)) {
    return;
  }
  if (target.querySelector(`:scope > .${BADGE_CLASS}`)) {
    return;
  }
  target.appendChild(createBadge());
}

function scanPage() {
  if (!libraryIdIndex || Object.keys(libraryIdIndex).length === 0) {
    return;
  }

  const selectors = [
    "h3[data-testid^='title-link-'] a[href*='/library/view/-/']"
  ];

  const targets = document.querySelectorAll(selectors.join(","));
  for (const target of targets) {
    maybeInjectBadge(target);
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
  chrome.storage.local.get(["libraryIdIndex"], (result) => {
    libraryIdIndex = result.libraryIdIndex || {};
    scanPage();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.libraryIdIndex) {
    return;
  }
  libraryIdIndex = changes.libraryIdIndex.newValue || {};
  scanPage();
});

refreshIndexFromStorage();
watchDomChanges();
