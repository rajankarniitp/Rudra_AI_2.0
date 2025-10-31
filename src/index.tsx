import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./state/session/store";
import "./app.css";

console.log("Rudra AI 2.0: React entry point loaded");

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <SessionProvider>
      <App />
    </SessionProvider>
  );
} else {
  console.error("Rudra AI 2.0: #root element not found in index.html");
}
