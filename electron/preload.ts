import { contextBridge, ipcRenderer } from "electron";

/**
 * Expose a secure API to the renderer process.
 * Only allow whitelisted methods for security.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  getEnv: (key: string) => ipcRenderer.invoke("get-env", key),
  // Add more APIs as needed, e.g. for storage, AI, etc.
});

// TypeScript: declare the API for the renderer
declare global {
  interface Window {
    electronAPI: {
      getEnv: (key: string) => Promise<string | undefined>;
      // Extend with more methods as needed
    };
  }
}
