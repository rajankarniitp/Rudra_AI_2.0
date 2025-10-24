# Rudra AI 2.0

An advanced, Comet-like AI browser with a sidebar assistant. Built with Electron, React, and a modular AI integration layer.

---

## Features

- **Browser shell**: Embedded Chromium, address bar (URL or search), tab manager (MVP: single tab), page viewer.
- **AI sidebar assistant**: Chat UI, action buttons (Summarize, Translate, Explain, LinkedIn post), context-aware.
- **Hybrid search**: Navigate to URL or search via Google (MVP), AI-enhanced search (extensible).
- **Context awareness**: Explain selected text, send page context to AI.
- **AI integration**: Generic adapter for OpenAI, Gemini, etc. (`callAI(payload)`).
- **Voice commands**: (Bonus, see hooks/useVoice.ts for extension)
- **Local storage**: IndexedDB for AI summaries and bookmarks.
- **Modern UX**: Dark mode, responsive, sidebar animation-ready.
- **Security**: Private mode, disables cookies by default, context isolation.
- **Developer friendly**: Modular code, TypeScript, minimal tests, easy to extend.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set your AI API key

Copy `.env.example` to `.env` and add your API key:

```
AI_API_KEY=your_openai_or_gemini_key
AI_PROVIDER=openai
```

### 3. Run in development

```bash
npm run dev
```

- Electron main process runs with hot reload.
- React renderer runs on http://localhost:3000.

### 4. Build for production

```bash
npm run build
```

### 5. Package the app

```bash
npm run package
```

- Output in `dist/` for macOS, Windows, Linux.

### 6. Run tests

```bash
npm test
```

---

## Security & Privacy Checklist

- [x] Context isolation enabled (Electron best practice)
- [x] Node integration disabled in renderer
- [x] Preload script exposes only whitelisted APIs
- [x] No cookies sent by default (webview is sandboxed)
- [x] API key is read from environment, not bundled
- [x] No analytics or telemetry
- [x] Local storage is private (IndexedDB)
- [x] External links open in system browser

**Recommended:**
- Use a dedicated API key with least privileges.
- Do not share your `.env` file.
- Review Electron security docs: https://www.electronjs.org/docs/latest/tutorial/security

---

## How to swap LLM providers

- Set `AI_PROVIDER` in your `.env` to `openai` or `gemini`.
- The adapter in `src/ai/aiAdapter.ts` is modular—add more providers as needed.

---

## Extending the App

- Add more actions to the sidebar by extending `SidebarChat` and prompt templates.
- Add multi-tab support by updating `TabManager` and tab state.
- Add voice command support in `src/hooks/useVoice.ts`.
- Add more storage features in `src/utils/storage.ts`.

---

## Design Decisions

- **TypeScript** for type safety and maintainability.
- **IndexedDB** for local storage (cross-platform, no native deps).
- **Electron security**: context isolation, no node integration, secure preload.
- **No paid UI libraries**: all UI is custom CSS.

---

## Example Usage

1. Open a public article in the address bar.
2. Click "Summarize page" in the sidebar.
3. The AI output appears in the chat, and the summary is saved locally.

---

## License

MIT
