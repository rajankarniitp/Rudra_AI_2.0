# Rudra AI 2.0 – Project Folder Structure

```
Rudra_AI_2.0/
├── electron/
│   ├── main.ts           # Electron main process (Node backend)
│   ├── preload.ts        # Preload script for secure context bridging
│   └── security.ts       # Security settings and hardening
├── src/
│   ├── App.tsx           # Main React app entry
│   ├── index.tsx         # React renderer entry
│   ├── components/
│   │   ├── AddressBar.tsx
│   │   ├── TabManager.tsx
│   │   ├── PageView.tsx
│   │   ├── SidebarChat.tsx
│   │   └── SummaryCard.tsx
│   ├── ai/
│   │   ├── aiAdapter.ts   # Generic AI integration layer
│   │   └── prompts.ts     # Prompt templates
│   ├── utils/
│   │   ├── storage.ts     # IndexedDB/SQLite helpers
│   │   └── context.ts     # Context extraction helpers
│   ├── hooks/
│   │   └── useVoice.ts    # Voice command hook (bonus)
│   └── types/
│       └── index.d.ts     # Shared TypeScript types
├── public/
│   ├── index.html
│   └── icons/
│       └── ...            # App icons, favicon, etc.
├── test/
│   ├── App.test.tsx
│   └── ...                # Other component tests
├── .env.example           # API key placeholder
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
