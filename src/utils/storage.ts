/**
 * Simple IndexedDB wrapper for storing AI summaries, bookmarks, and browsing history.
 * Uses the 'rudra-ai' database.
 */

const DB_NAME = "rudra-ai";
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains("history")) {
        const historyStore = db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
        historyStore.createIndex("date", "date", { unique: false });
        historyStore.createIndex("url", "url", { unique: false });
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

// ── Browsing History ──

export interface HistoryEntry {
  id?: number;
  url: string;
  title: string;
  date: number;
  favicon?: string;
}

export async function saveHistoryEntry(entry: Omit<HistoryEntry, "id">) {
  const db = await openDB();
  const tx = db.transaction("history", "readwrite");
  tx.objectStore("history").add(entry);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = await openDB();
  const tx = db.transaction("history", "readonly");
  const store = tx.objectStore("history");
  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => {
      // Return newest first
      const results = (req.result || []) as HistoryEntry[];
      results.sort((a, b) => b.date - a.date);
      resolve(results);
    };
    req.onerror = () => resolve([]);
  });
}

export async function deleteHistoryEntry(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("history", "readwrite");
  tx.objectStore("history").delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHistory(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("history", "readwrite");
  tx.objectStore("history").clear();
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
