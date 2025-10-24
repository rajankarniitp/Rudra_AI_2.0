/**
 * Simple IndexedDB wrapper for storing AI summaries and bookmarks.
 * Uses the 'rudra-ai' database with 'summaries' and 'bookmarks' object stores.
 */

const DB_NAME = "rudra-ai";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("summaries")) {
        db.createObjectStore("summaries", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("bookmarks")) {
        db.createObjectStore("bookmarks", { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Summaries
export async function saveSummary(summary: { url: string; title: string; content: string; date: number }) {
  const db = await openDB();
  const tx = db.transaction("summaries", "readwrite");
  tx.objectStore("summaries").add(summary);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSummaries(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction("summaries", "readonly");
  const store = tx.objectStore("summaries");
  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

// Bookmarks
export async function saveBookmark(bookmark: { url: string; title: string; date: number }) {
  const db = await openDB();
  const tx = db.transaction("bookmarks", "readwrite");
  tx.objectStore("bookmarks").put(bookmark);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBookmarks(): Promise<any[]> {
  const db = await openDB();
  const tx = db.transaction("bookmarks", "readonly");
  const store = tx.objectStore("bookmarks");
  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}
