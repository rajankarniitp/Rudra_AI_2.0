import React, { useState } from "react";
import AddressBar from "./components/AddressBar";
import TabManager from "./components/TabManager";
import PageView from "./components/PageView";
import NewTabPage from "./components/NewTabPage";
import SidebarChat from "./components/SidebarChat";
import SummaryCard from "./components/SummaryCard";
import {
  summarizePagePrompt,
  translatePagePrompt,
  explainSelectedTextPrompt,
  generateLinkedInPostPrompt
} from "./ai/prompts";
import { callAI } from "./ai/aiAdapter";
import { saveSummary } from "./utils/storage";

/**
 * Main App component.
 * Sets up the layout: address bar, tab manager, page view, and AI sidebar.
 * Uses CSS variables for dark mode and responsive design.
 */
const DEFAULT_HOME = "https://www.perplexity.ai/";

import { getWebviewSelectedText } from "./utils/context";

interface Tab {
  id: string;
  title: string;
  url: string;
  addressValue: string;
  addressInput: string;
  pageTitle: string;
  pageText: string;
  chatHistory: { role: "user" | "ai"; content: string }[];
  assistantOpen: boolean;
  active: boolean;
}

const App: React.FC = () => {
  // MVP: single tab, but structure for multi-tab
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "tab-1",
      title: "New Tab",
      url: "about:blank",
      addressValue: "about:blank",
      addressInput: "",
      pageTitle: "New Tab",
      pageText: "",
      chatHistory: [],
      assistantOpen: false,
      active: true
    }
  ]);
  const [currentTabId, setCurrentTabId] = useState("tab-1");
  const webviewRef = React.useRef<any>(null);

  // Hybrid search/navigation logic
  function isValidUrl(input: string) {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }

  const handleNavigate = (input: string) => {
    let url = input;
    if (!isValidUrl(input)) {
      // Redirect to Google search for MVP
      url = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
    setTabs(tabs =>
      tabs.map(tab =>
        tab.id === currentTabId
          ? { ...tab, url, addressValue: url, addressInput: url, title: input }
          : tab
      )
    );
  };

  const handleTabSelect = (id: string) => {
    setCurrentTabId(id);
  };

  // For MVP, no tab close/add logic yet

  // Get current tab URL
  const currentTab = tabs.find(t => t.id === currentTabId);

  // Per-tab chat history and assistant open state
  const chatHistory = currentTab?.chatHistory || [];
  const assistantOpen = currentTab?.assistantOpen || false;

  // Per-tab chat state and assistant open state
  const [aiLoading, setAiLoading] = useState(false);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");

  // AI sidebar action handler
  const handleAIAction = async (
    action: "summarize" | "translate" | "explain" | "linkedin" | "custom",
    payload?: any
  ) => {
    // Set provider for AI call
    if (provider) {
      // @ts-ignore
      window.__RUDRA_AI_PROVIDER = provider;
    }
    let prompt = "";
    let userMsg = "";
    if (!currentTab) return;
    if (action === "custom") {
      // Always include tab context in freeform chat
      prompt = `Given the following page context:\nTitle: ${currentTab.pageTitle}\nURL: ${currentTab.url}\nText: ${currentTab.pageText?.slice(0, 2000) || ""}\n\nAnswer the user's question:\n${payload?.text || ""}`;
      userMsg = payload?.text || "";
    } else {
      if (!currentTab.pageText) return; // Wait for page text extraction

      if (action === "summarize") {
        prompt = summarizePagePrompt(currentTab.pageText, currentTab.url, currentTab.pageTitle);
        userMsg = "Summarize this page";
      } else if (action === "translate") {
        prompt = translatePagePrompt(currentTab.pageText, currentTab.url, currentTab.pageTitle, "en");
        userMsg = "Translate this page to English";
      } else if (action === "explain") {
        // Try to get selected text from webview
        let selectedText = "";
        if (webviewRef.current) {
          selectedText = await getWebviewSelectedText(webviewRef.current);
        }
        if (!selectedText) {
          selectedText = currentTab.pageText.slice(0, 300);
        }
        prompt = explainSelectedTextPrompt(selectedText, currentTab.url, currentTab.pageTitle);
        userMsg = "Explain selected text";
      } else if (action === "linkedin") {
        prompt = generateLinkedInPostPrompt(currentTab.pageText, currentTab.url, currentTab.pageTitle);
        userMsg = "Generate LinkedIn post for this page";
      }
    }

    setTabs(tabs =>
      tabs.map(tab =>
        tab.id === currentTabId
          ? { ...tab, chatHistory: [...(tab.chatHistory || []), { role: "user", content: userMsg }] }
          : tab
      )
    );
    setAiLoading(true);
    try {
      // Patch: Pass provider to callAI via global (since env is read in callAI)
      const aiRes = await callAI({ prompt, model: provider === "gemini" ? "models/gemini-2.5-pro" : undefined });
      setTabs(tabs =>
        tabs.map(tab =>
          tab.id === currentTabId
            ? { ...tab, chatHistory: [...(tab.chatHistory || []), { role: "ai", content: aiRes.text }] }
            : tab
        )
      );
      // Save summary to local storage if action is summarize
      if (action === "summarize") {
        await saveSummary({
          url: currentTab.url,
          title: currentTab.pageTitle,
          content: aiRes.text,
          date: Date.now()
        });
      }
    } catch (err: any) {
      setTabs(tabs =>
        tabs.map(tab =>
          tab.id === currentTabId
            ? { ...tab, chatHistory: [...(tab.chatHistory || []), { role: "ai", content: "AI error: " + (err.message || "Unknown error") }] }
            : tab
        )
      );
    }
    setAiLoading(false);
  };

  return (
    <div className="app-root">
      {/* Address Bar */}
      <header className="app-header" style={{ background: "#333", borderBottom: "2px solid #00bcd4", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: "100%",
          maxWidth: 700,
          margin: "0 auto",
          background: "#222",
          borderRadius: 8,
          boxShadow: "0 2px 8px #0003",
          zIndex: 2,
          position: "relative"
        }}>
          <AddressBar
            onNavigate={handleNavigate}
            value={currentTab?.addressInput || ""}
            onChange={e => {
              const value = e.target.value;
              setTabs(tabs =>
                tabs.map(tab =>
                  tab.id === currentTabId
                    ? { ...tab, addressInput: value }
                    : tab
                )
              );
            }}
          />
        </div>
        <button
          style={{
            marginLeft: 16,
            background: "none",
            border: "none",
            color: "#00bcd4",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: 8,
            transition: "background 0.2s"
          }}
          onClick={() => {
            setTabs(tabs =>
              tabs.map(tab =>
                tab.id === currentTabId
                  ? { ...tab, assistantOpen: !tab.assistantOpen }
                  : tab
              )
            );
          }}
          aria-label="Toggle Assistant"
        >
          <span style={{ fontSize: 22, display: "inline-block", transform: "translateY(2px)" }}>🤖</span>
          Assistant
        </button>
      </header>

      {/* Main Content: Tabs + PageView + Sidebar */}
      <div className="app-main" style={{ display: "flex", height: "100%" }}>
        {assistantOpen ? (
          <aside
            className="sidebar"
            style={{
              transition: "width 0.3s, opacity 0.3s",
              width: "340px",
              minWidth: "220px",
              opacity: 1,
              overflow: "hidden"
            }}
          >
            <SidebarChat
              onAction={handleAIAction}
              chatHistory={chatHistory}
              loading={aiLoading}
              provider={provider}
              onProviderChange={prov => setProvider(prov)}
              onClose={() => {
                setTabs(tabs =>
                  tabs.map(tab =>
                    tab.id === currentTabId
                      ? { ...tab, assistantOpen: false }
                      : tab
                  )
                );
              }}
            />
          </aside>
        ) : null}
        <section className="browser-shell" style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          transition: "width 0.3s"
        }}>
          <TabManager
            tabs={tabs}
            onTabSelect={handleTabSelect}
            onTabAdd={() => {
              const newId = `tab-${Date.now()}`;
              setTabs(tabs => [
                ...tabs.map(tab => ({ ...tab, active: false })),
                {
                  id: newId,
                  title: "New Tab",
                  url: "about:blank",
                  addressValue: "about:blank",
                  addressInput: "",
                  pageTitle: "New Tab",
                  pageText: "",
                  chatHistory: [],
                  assistantOpen: false,
                  active: true
                }
              ]);
              setCurrentTabId(newId);
            }}
            onTabClose={id => {
              setTabs(tabs => {
                const idx = tabs.findIndex(tab => tab.id === id);
                if (tabs.length === 1) return tabs; // Don't close last tab
                const newTabs = tabs.filter(tab => tab.id !== id);
                // If closing current tab, switch to previous or next
                if (id === currentTabId) {
                  const nextIdx = idx > 0 ? idx - 1 : 0;
                  setCurrentTabId(newTabs[nextIdx].id);
                }
                return newTabs;
              });
            }}
          />
          <div style={{
            flex: 1,
            border: "2px solid #00bcd4",
            marginTop: 8,
            background: "#181a20",
            borderRadius: 8,
            height: "calc(100vh - 120px)",
            minHeight: 0,
            display: "flex",
            flexDirection: "column"
          }}>
            {currentTab && (
              (!currentTab.url || currentTab.url === "about:blank") ? (
                <NewTabPage
                  value={currentTab.addressInput || ""}
                  onNavigate={handleNavigate}
                  onChange={e => {
                    const value = e.target.value;
                    setTabs(tabs =>
                      tabs.map(tab =>
                        tab.id === currentTabId
                          ? { ...tab, addressInput: value }
                          : tab
                      )
                    );
                  }}
                />
              ) : (
                <PageView
                  url={currentTab.url}
                  onTitleChange={title => {
                    setTabs(tabs =>
                      tabs.map(tab =>
                        tab.id === currentTabId
                          ? { ...tab, pageTitle: title }
                          : tab
                      )
                    );
                  }}
                  onDomExtract={text => {
                    setTabs(tabs =>
                      tabs.map(tab =>
                        tab.id === currentTabId
                          ? { ...tab, pageText: text }
                          : tab
                      )
                    );
                  }}
                  webviewRef={webviewRef}
                />
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
