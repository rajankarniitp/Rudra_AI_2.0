# Rudra AI 2.0 - Project Structure

```
Rudra_AI_2.0/
├── electron/               # Electron main process
│   ├── main.ts             # Main entry point, window management
│   ├── preload.ts          # Context bridge and IPC APIs
│   └── security.ts         # Security policies (CSP, permissions)
│
├── public/                 # Static assets
│   ├── background/         # Background images
│   ├── icons/              # App icons
│   └── index.html          # HTML entry point
│
├── src/                    # React Renderer process
│   ├── ai/                 # AI Integration
│   │   ├── aiAdapter.ts    # centralized AI service (OpenAI/Gemini)
│   │   └── prompts.ts      # System prompts (Summarize, Translate, etc.)
│   │
│   ├── components/         # React Components
│   │   ├── AddressBar.tsx   # Navigation bar & URL input
│   │   ├── NewTabPage.tsx   # Custom Start Page (NTP)
│   │   ├── PageView.tsx     # Webview wrapper
│   │   ├── SettingsPanel.tsx# Settings & Chat History
│   │   ├── SidebarChat.tsx  # AI Assistant Sidebar
│   │   ├── SummaryCard.tsx  # Floating summary/action card
│   │   └── TabManager.tsx   # Tab handling logic
│   │
│   ├── state/              # State Management
│   │   └── session/        # Session types & atoms
│   │
│   ├── types/              # TypeScript definitions
│   │   └── index.d.ts      # Global types
│   │
│   ├── utils/              # Utilities
│   │   ├── context.ts      # Page context extraction
│   │   └── storage.ts      # LocalStorage wrapper (History, Settings)
│   │
│   ├── App.tsx             # Main Application Component
│   ├── app.css             # Global Styles & Animations
│   └── index.tsx           # React DOM render entry
│
├── test/                   # Unit Tests
│   └── AddressBar.test.tsx
│
├── .env.example            # Environment variables template
├── package.json            # Dependencies & Scripts
├── tsconfig.json           # TypeScript configuration
└── webpack.renderer.js     # Webpack configuration
```
