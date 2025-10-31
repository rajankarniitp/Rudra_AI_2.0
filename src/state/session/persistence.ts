import { SessionSnapshot, SessionState } from "./types";

export const SESSION_STATE_VERSION = 1;
const STORAGE_KEY = "rudra.session.snapshot.v1";

type SessionBridge = {
  readSession?: () => Promise<string | null>;
  writeSession?: (snapshot: string) => Promise<void>;
  clearSession?: () => Promise<void>;
};

function getBridge(): SessionBridge | null {
  if (typeof window === "undefined") return null;
  const api = (window as any).electronAPI as SessionBridge | undefined;
  return api ?? null;
}

export async function loadSessionSnapshot(): Promise<SessionSnapshot | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const bridge = getBridge();
    let raw: string | null = null;
    if (bridge?.readSession) {
      raw = await bridge.readSession();
    } else if (window.localStorage) {
      raw = window.localStorage.getItem(STORAGE_KEY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== SESSION_STATE_VERSION) return null;
    return parsed;
  } catch (err) {
    console.warn("Unable to load session snapshot", err);
    return null;
  }
}

export async function saveSessionSnapshot(state: SessionState): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const { hydrated, ...persistable } = state;
    const snapshot: SessionSnapshot = {
      version: SESSION_STATE_VERSION,
      savedAt: Date.now(),
      state: persistable,
    };
    const bridge = getBridge();
    const serialized = JSON.stringify(snapshot);
    if (bridge?.writeSession) {
      await bridge.writeSession(serialized);
    } else if (window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn("Unable to persist session snapshot", err);
  }
}

export async function clearSessionSnapshot(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const bridge = getBridge();
    if (bridge?.clearSession) {
      await bridge.clearSession();
    } else if (window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Unable to clear session snapshot", err);
  }
}
