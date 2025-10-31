import { contextBridge, ipcRenderer } from "electron";

/**
 * Expose a secure API to the renderer process.
 * Only allow whitelisted methods for security.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  getEnv: (key: string) => ipcRenderer.invoke("get-env", key),
  readSession: () => ipcRenderer.invoke("session:read"),
  writeSession: (snapshot: string) => ipcRenderer.invoke("session:write", snapshot),
  clearSession: () => ipcRenderer.invoke("session:clear"),
});

// TypeScript: declare the API for the renderer
declare global {
  interface Window {
    electronAPI: {
      getEnv: (key: string) => Promise<string | undefined>;
      readSession: () => Promise<string | null>;
      writeSession: (snapshot: string) => Promise<void>;
      clearSession: () => Promise<void>;
    };
  }
}
