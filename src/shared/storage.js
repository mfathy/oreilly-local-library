import { normalizeLibraryRecords, toIdIndex } from "./normalize.js";

const STORAGE_KEYS = {
  records: "libraryRecords",
  idIndex: "libraryIdIndex",
  updatedAt: "libraryUpdatedAt"
};

function chromeStorageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

function chromeStorageSet(payload) {
  return new Promise((resolve) => {
    chrome.storage.local.set(payload, () => {
      resolve();
    });
  });
}

export async function getLibraryState() {
  const result = await chromeStorageGet([
    STORAGE_KEYS.records,
    STORAGE_KEYS.idIndex,
    STORAGE_KEYS.updatedAt
  ]);

  const records = Array.isArray(result[STORAGE_KEYS.records])
    ? result[STORAGE_KEYS.records]
    : [];
  const idIndex =
    result[STORAGE_KEYS.idIndex] && typeof result[STORAGE_KEYS.idIndex] === "object"
      ? result[STORAGE_KEYS.idIndex]
      : {};

  return {
    records,
    idIndex,
    updatedAt: result[STORAGE_KEYS.updatedAt] || null
  };
}

export async function saveLibraryRecords(inputRecords) {
  const records = normalizeLibraryRecords(inputRecords);
  const idIndex = toIdIndex(records);
  const updatedAt = new Date().toISOString();

  await chromeStorageSet({
    [STORAGE_KEYS.records]: records,
    [STORAGE_KEYS.idIndex]: idIndex,
    [STORAGE_KEYS.updatedAt]: updatedAt
  });

  return {
    records,
    idIndex,
    updatedAt
  };
}
