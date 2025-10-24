import { app, BrowserWindow, ipcMain, shell, session } from "electron";
import path from "path";
import { setupSecurity } from "./security";
import dotenv from "dotenv";

/* Load .env file at startup (try process.cwd() for reliability) */
const dotenvPath = require("path").resolve(process.cwd(), ".env");
console.log("Trying to load .env from:", dotenvPath);
dotenv.config({ path: dotenvPath });
console.log("Loaded AI_API_KEY (main):", process.env.AI_API_KEY ? process.env.AI_API_KEY : "[not set]");
console.log("Loaded OPEN_AI_API_KEY (main):", process.env.OPEN_AI_API_KEY ? process.env.OPEN_AI_API_KEY : "[not set]");
console.log("Loaded AI_PROVIDER (main):", process.env.AI_PROVIDER);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#181A20",
    title: "Rudra AI 2.0",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
      spellcheck: true,
      webviewTag: true,
    },
    icon: path.join(__dirname, "../public/icons/app-icon.png"),
  });

  // Load the React app (served by webpack-dev-server or built index.html)
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3001");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../public/index.html"));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Optionally: Remove menu for cleaner UI
  mainWindow.removeMenu();

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.on("ready", async () => {
  setupSecurity();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// IPC handlers (add more as needed)
ipcMain.handle("get-env", (_, key: string) => {
  return process.env[key];
});
