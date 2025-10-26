import React, { useState, useEffect } from "react";
import AddressBar from "./components/AddressBar";
import TabManager from "./components/TabManager";
import PageView from "./components/PageView";
import NewTabPage, { quickLinks as newTabQuickLinks } from "./components/NewTabPage";
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

  // Get current tab URL
  const currentTab = tabs.find(t => t.id === currentTabId);

  // Navigation state for back/forward buttons
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);

  // Reset webviewReady on tab/url change
  useEffect(() => {
    setWebviewReady(false);
  }, [currentTab?.url]);

  // Update navigation state when webview navigates
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const updateNavState = () => {
      if (webviewReady) {
        setCanGoBack(webview.canGoBack ? webview.canGoBack() : false);
        setCanGoForward(webview.canGoForward ? webview.canGoForward() : false);
      }
    };

    const handleDomReady = () => {
      setWebviewReady(true);
      setTimeout(updateNavState, 0);
    };

    webview.addEventListener("did-navigate", updateNavState);
    webview.addEventListener("did-navigate-in-page", updateNavState);
    webview.addEventListener("did-frame-navigate", updateNavState);
    webview.addEventListener("dom-ready", handleDomReady);

    // Only update state if already ready
    if (webviewReady) updateNavState();

    return () => {
      webview.removeEventListener("did-navigate", updateNavState);
      webview.removeEventListener("did-navigate-in-page", updateNavState);
      webview.removeEventListener("did-frame-navigate", updateNavState);
      webview.removeEventListener("dom-ready", handleDomReady);
    };
  }, [currentTab?.url, webviewReady]);

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
    const trimmedInput = input.trim();
    if (trimmedInput.length > 0) {
      setRecentSuggestions(prev => {
        const normalized = trimmedInput.toLowerCase();
        const deduped = [trimmedInput, ...prev.filter(entry => entry.toLowerCase() !== normalized)];
        return deduped.slice(0, 12);
      });
    }
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

  // Per-tab chat history and assistant open state
  const chatHistory = currentTab?.chatHistory || [];
  const assistantOpen = currentTab?.assistantOpen || false;

  // Per-tab chat state and assistant open state
  const [aiLoading, setAiLoading] = useState(false);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [recentSuggestions, setRecentSuggestions] = useState<string[]>([]);
  const latestAiController = React.useRef<AbortController | null>(null);

  const suggestionPool = React.useMemo(() => {
    const quickLinkQueries = newTabQuickLinks.map(link => link.query);
    const combined: string[] = [];
    const seen = new Set<string>();
    [...recentSuggestions, ...quickLinkQueries].forEach(item => {
      const normalized = item.trim();
      const key = normalized.toLowerCase();
      if (normalized && !seen.has(key)) {
        seen.add(key);
        combined.push(normalized);
      }
    });
    return combined;
  }, [recentSuggestions]);

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

    if (latestAiController.current) {
      latestAiController.current.abort();
      latestAiController.current = null;
    }

    setTabs(tabs =>
      tabs.map(tab =>
        tab.id === currentTabId
          ? { ...tab, chatHistory: [...(tab.chatHistory || []), { role: "user", content: userMsg }] }
          : tab
      )
    );
    setAiLoading(true);
    const controller = new AbortController();
    latestAiController.current = controller;
    try {
      // Patch: Pass provider to callAI via global (since env is read in callAI)
      const aiRes = await callAI({
        prompt,
        model: provider === "gemini" ? "models/gemini-2.5-pro" : undefined,
        max_tokens: 400,
        temperature: provider === "gemini" ? 0.6 : 0.5,
        signal: controller.signal
      });
      if (controller.signal.aborted) {
        return;
      }
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
      if (err?.name === "AbortError") {
        return;
      }
      setTabs(tabs =>
        tabs.map(tab =>
          tab.id === currentTabId
            ? { ...tab, chatHistory: [...(tab.chatHistory || []), { role: "ai", content: "AI error: " + (err.message || "Unknown error") }] }
            : tab
        )
      );
    } finally {
      if (latestAiController.current === controller) {
        latestAiController.current = null;
      }
    }
    setAiLoading(false);
  };

  return (
    <div className="app-root">
      <header className="primary-topbar">
        <div className="topbar-row topbar-row--tabs">
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
        </div>
        <div className="topbar-row topbar-row--address">
          <div className="topbar-omnibox">
            <AddressBar
              variant="default"
              suggestions={suggestionPool}
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
              onBack={() => {
                if (webviewRef.current && webviewRef.current.canGoBack && webviewRef.current.canGoBack()) {
                  webviewRef.current.goBack();
                }
              }}
              onForward={() => {
                if (webviewRef.current && webviewRef.current.canGoForward && webviewRef.current.canGoForward()) {
                  webviewRef.current.goForward();
                }
              }}
              onRefresh={() => {
                if (webviewRef.current && webviewRef.current.reload) {
                  webviewRef.current.reload();
                }
              }}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
            />
          </div>
          <button
            className={`assistant-toggle ${assistantOpen ? "is-active" : ""}`}
            onClick={() => {
              setTabs(tabs =>
                tabs.map(tab =>
                  tab.id === currentTabId
                    ? { ...tab, assistantOpen: !tab.assistantOpen }
                    : tab
                )
              );
            }}
            aria-label="Toggle assistant panel"
          >
            <span className="assistant-toggle__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  d="M5 7a4 4 0 118 0v1h1.2a1.8 1.8 0 010 3.6h-0.5A4.5 4.5 0 019 15a4.5 4.5 0 01-4.7-3.4H3.8a1.8 1.8 0 010-3.6H5z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="assistant-toggle__label">Assistant</span>
          </button>
        </div>
      </header>

      <div className="app-main">
        <section className="browser-shell">
          <div className="page-stage">
            {currentTab && (
              (!currentTab.url || currentTab.url === "about:blank") ? (
                <NewTabPage
                  variant="hero"
                  suggestions={suggestionPool}
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
                    const compact = text.replace(/\s+/g, " ").trim();
                    const limited = compact.slice(0, 4000);
                    setTabs(tabs =>
                      tabs.map(tab =>
                        tab.id === currentTabId
                          ? { ...tab, pageText: limited }
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
        {assistantOpen ? (
          <aside className="assistant-panel">
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
      </div>
    </div>
  );
};

export default App;
