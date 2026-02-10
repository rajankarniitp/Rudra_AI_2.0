# Rudra AI 2.0 Browser

**Rudra AI 2.0** is a next-generation AI-powered web browser designed for productivity, research, and seamless browsing. Built with Electron and React, it integrates advanced LLMs (OpenAI, Gemini) directly into the browsing experience.

## 🚀 Features

### 🧠 Integrated AI Assistant
- **Context-Aware Sidebar**: Chat with an AI that understands the current webpage content.
- **Smart Actions**: One-click **Summarize**, **Translate**, and **Explain** for any page.
- **Model Switching**: Choose between **Advanced (OpenAI)** and **Best (Gemini)** models.
- **Identity**: Proudly powered by Rudra AI, created by **Rajan Kumar Karn** (Founder of DocMateX, IIT Patna).

### 🎨 Modern & Stylish UI
- **Glassmorphism Design**: Sleek, dark-themed UI with ambient gradients.
- **Colorful Suggestion Chips**: Professional, color-coded quick actions (Quantum, Market Insights, Tech, etc.) to jumpstart your research.
- **Dynamic Icons**: High-quality SVG icons for a polished look.
- **Adaptive Viewing**: Smart rendering ensuring web pages look correct (e.g., proper white backgrounds for transparent sites like LinkedIn).

### ⚡ Performance & Privacy
- **Secure Webview**: Isolated browsing context with `contextIsolation`.
- **Local History**: Chat history and settings are stored locally on your device.
- **Efficient Tokens**: AI responses are optimized for conciseness and relevance.

## 🛠️ Tech Stack
- **Framework**: Electron (Main Process), React (Renderer)
- **Language**: TypeScript
- **Styling**: CSS Modules, CSS Variables (Theming), Glassmorphism
- **AI Integration**: OpenAI API, Google Gemini API
- **State Management**: React Hooks & Local Storage

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Rudra_AI_2.0.git
   cd Rudra_AI_2.0
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Create a `.env` file in the root directory.
   - Add your API keys:
     ```env
     OPEN_AI_API_KEY=your_openai_key
     GEMINI_API_KEY=your_gemini_key
     AI_PROVIDER=gemini # or openai
     AI_MODE=standard
     ```

4. **Run Development Mode**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## 👨‍💻 Creator

**Rudra AI** was created by **Rajan Kumar Karn**.
- **Role**: Founder of **DocMateX**
- **Education**: Pursuing Bachelors at **IIT Patna**

---
*Empowering the web with intelligence.*
