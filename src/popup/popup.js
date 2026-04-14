import { normalizeLibraryRecords } from "../shared/normalize.js";
import { getLibraryState, saveLibraryRecords } from "../shared/storage.js";

const fileInput = document.getElementById("fileInput");
const addBookForm = document.getElementById("addBookForm");
const bookList = document.getElementById("bookList");
const count = document.getElementById("count");
const statusText = document.getElementById("statusText");
const exportButton = document.getElementById("exportButton");

const bookIdInput = document.getElementById("bookIdInput");
const titleInput = document.getElementById("titleInput");
const isbnInput = document.getElementById("isbnInput");
const urlInput = document.getElementById("urlInput");
const descriptionInput = document.getElementById("descriptionInput");

let records = [];

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#fecaca" : "#bfdbfe";
}

function renderList() {
  bookList.innerHTML = "";
  count.textContent = String(records.length);

  if (!records.length) {
    const empty = document.createElement("li");
    empty.className = "book-item";
    empty.textContent = "No books loaded yet.";
    bookList.appendChild(empty);
    return;
  }

  for (const record of records) {
    const item = document.createElement("li");
    item.className = "book-item";

    const header = document.createElement("div");
    header.className = "book-header";

    const title = document.createElement("p");
    title.className = "book-title";
    title.textContent = record.title;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeBook(record.bookId));

    header.appendChild(title);
    header.appendChild(removeButton);

    const meta = document.createElement("p");
    meta.className = "book-meta";
    meta.textContent = `bookId: ${record.bookId}${record.url ? ` | ${record.url}` : ""}`;

    item.appendChild(header);
    item.appendChild(meta);
    bookList.appendChild(item);
  }
}

async function persistRecords(nextRecords, successMessage) {
  const state = await saveLibraryRecords(nextRecords);
  records = state.records;
  renderList();
  if (successMessage) {
    setStatus(successMessage);
  }
}

async function removeBook(bookId) {
  const nextRecords = records.filter((record) => record.bookId !== bookId);
  await persistRecords(nextRecords, `Removed book ${bookId}.`);
}

function parseJsonSafe(content) {
  try {
    return JSON.parse(content);
  } catch (_error) {
    return null;
  }
}

async function onFileLoaded(file) {
  const rawText = await file.text();
  const parsed = parseJsonSafe(rawText);
  if (!Array.isArray(parsed)) {
    setStatus("Invalid JSON. Expected an array of books.", true);
    return;
  }

  const normalized = normalizeLibraryRecords(parsed);
  await persistRecords(normalized, `Imported ${normalized.length} books.`);
}

async function onFileInputChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    await onFileLoaded(file);
  } catch (error) {
    setStatus(`Import failed: ${error.message}`, true);
  } finally {
    fileInput.value = "";
  }
}

async function onAddBookSubmit(event) {
  event.preventDefault();

  const newRecord = {
    bookId: bookIdInput.value.trim(),
    isbn: isbnInput.value.trim(),
    title: titleInput.value.trim(),
    url: urlInput.value.trim(),
    description: descriptionInput.value.trim()
  };

  if (!newRecord.bookId || !newRecord.title) {
    setStatus("Book ID and Title are required.", true);
    return;
  }

  const nextRecords = normalizeLibraryRecords([...records, newRecord]);
  await persistRecords(nextRecords, `Added "${newRecord.title}".`);
  addBookForm.reset();
}

function downloadJson(text, filename) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true
    },
    () => {
      URL.revokeObjectURL(url);
    }
  );
}

function onExportClick() {
  const exportPayload = normalizeLibraryRecords(records);
  const text = JSON.stringify(exportPayload, null, 2);
  const filename = `oreilly-local-library-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJson(text, filename);
  setStatus("Export started.");
}

async function loadInitialState() {
  const state = await getLibraryState();
  records = normalizeLibraryRecords(state.records);
  renderList();
  if (records.length) {
    setStatus(`Loaded ${records.length} books from local storage.`);
  } else {
    setStatus("Load a JSON file to begin.");
  }
}

fileInput.addEventListener("change", onFileInputChange);
addBookForm.addEventListener("submit", onAddBookSubmit);
exportButton.addEventListener("click", onExportClick);

loadInitialState();
