import React, { useState, useEffect } from "react";
import AddressBar from "./components/AddressBar";
import TabManager from "./components/TabManager";
import PageView from "./components/PageView";
import NewTabPage, { quickLinks as newTabQuickLinks } from "./components/NewTabPage";
import SidebarChat from "./components/SidebarChat";
import SummaryCard from "./components/SummaryCard";
import SettingsPanel from "./components/SettingsPanel";
import {
  summarizePagePrompt,
  translatePagePrompt,
  explainSelectedTextPrompt,
  generateLinkedInPostPrompt
} from "./ai/prompts";
import { callAI } from "./ai/aiAdapter";
import { saveSummary } from "./utils/storage";
import { useSessionSelector, useSessionActions, useActiveTab } from "./state/session/store";

import { getWebviewSelectedText } from "./utils/context";

const GROUP_COLORS = ["#5A8DEE", "#8B5CF6", "#10B981", "#F97316", "#F59E0B", "#EC4899", "#38BDF8"];

const App: React.FC = () => {
  const tabs = useSessionSelector(state => state.tabs);
  const suggestionHistory = useSessionSelector(state => state.suggestionHistory);
  const settings = useSessionSelector(state => state.settings);
  const tabGroups = useSessionSelector(state => state.tabGroups);
  const currentTab = useActiveTab();
  const {
    addTab,
    closeTab,
    setActiveTab,
    patchTab,
    setAssistantOpen,
    appendChatMessage,
    recordSuggestion,
    reorderTabs,
    assignGroup,
    upsertGroup,
    deleteGroup,
    toggleGroupCollapse,
    updateSettings
  } = useSessionActions();
  const webviewRef = React.useRef<any>(null);
  const groupColorIndexRef = React.useRef(0);

  // Navigation state for back/forward buttons
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const buildSearchUrl = React.useCallback(
    (query: string) => {
      const encoded = encodeURIComponent(query);
      switch (settings.defaultSearchEngine) {
        case "duckduckgo":
          return `https://duckduckgo.com/?q=${encoded}`;
        case "bing":
          return `https://www.bing.com/search?q=${encoded}`;
        case "perplexity":
          return `https://www.perplexity.ai/search?q=${encoded}`;
        case "google":
        default:
          return `https://www.google.com/search?q=${encoded}`;
      }
    },
    [settings.defaultSearchEngine]
  );

  const handleNavigate = (input: string) => {
    const trimmedInput = input.trim();
    if (trimmedInput.length > 0) {
      recordSuggestion(trimmedInput);
    }
    if (!currentTab) return;
    let url = input;
    if (!isValidUrl(input)) {
      url = buildSearchUrl(trimmedInput);
    }
    patchTab(currentTab.id, {
      url,
      addressValue: url,
      addressInput: url,
      title: input,
      pageTitle: input || currentTab.pageTitle,
      pageText: ""
    });
  };

  const handleTabSelect = (id: string) => {
    setActiveTab(id);
  };

  const handleTabAdd = () => {
    addTab();
  };

  const handleTabClose = (id: string) => {
    const tabCount = tabs.length;
    if (tabCount <= 1) return;
    const threshold = settings?.confirmCloseThreshold ?? 12;
    if (tabCount > threshold) {
      const confirmed = window.confirm(
        `You have ${tabCount} tabs open. Are you sure you want to close this tab?`
      );
      if (!confirmed) return;
    }
    closeTab(id);
  };

  const handleTabPinToggle = (id: string, pinned: boolean) => {
    const pinnedIds: string[] = [];
    const regularIds: string[] = [];
    tabs.forEach(tab => {
      if (tab.id === id) {
        return;
      }
      if (tab.status === "pinned") {
        pinnedIds.push(tab.id);
      } else {
        regularIds.push(tab.id);
      }
    });
    if (pinned) {
      pinnedIds.push(id);
    } else {
      regularIds.push(id);
    }
    reorderTabs(pinnedIds, regularIds);
    if (pinned) {
      assignGroup(id, null);
    }
  };

  const handleTabReorder = (pinnedIds: string[], regularIds: string[]) => {
    reorderTabs(pinnedIds, regularIds);
  };

  const handleTabAssignGroup = (tabId: string, groupId: string | null) => {
    assignGroup(tabId, groupId);
  };

  const handleGroupCreate = () => {
    const palette = GROUP_COLORS;
    const color = palette[groupColorIndexRef.current % palette.length];
    groupColorIndexRef.current += 1;
    const groupCount = Object.keys(tabGroups).length + 1;
    const newId = `group-${Date.now()}`;
    upsertGroup({
      id: newId,
      title: `Group ${groupCount}`,
      color,
      collapsed: false
    });
  };

  const handleGroupToggle = (groupId: string) => {
    toggleGroupCollapse(groupId);
  };

  const handleGroupRename = (groupId: string) => {
    const existing = tabGroups[groupId];
    if (!existing) return;
    const nextTitle = window.prompt("Rename group", existing.title || "Group");
    if (!nextTitle) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    upsertGroup({
      ...existing,
      id: groupId,
      title: trimmed
    });
  };

  const handleGroupDelete = (groupId: string) => {
    const existing = tabGroups[groupId];
    if (!existing) return;
    const confirmed = window.confirm(`Remove "${existing.title || "Group"}"? Tabs will be ungrouped.`);
    if (!confirmed) return;
    deleteGroup(groupId);
  };

  // Per-tab chat state and assistant open state
  const [aiLoading, setAiLoading] = useState(false);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const latestAiController = React.useRef<AbortController | null>(null);
  const chatHistory = currentTab?.chatHistory || [];
  const assistantOpen = currentTab?.assistantOpen || false;

  const suggestionPool = React.useMemo(() => {
    const quickLinkQueries = newTabQuickLinks.map(link => link.query);
    const combined: string[] = [];
    const seen = new Set<string>();
    [...suggestionHistory, ...quickLinkQueries].forEach(item => {
      const normalized = item.trim();
      const key = normalized.toLowerCase();
      if (normalized && !seen.has(key)) {
        seen.add(key);
        combined.push(normalized);
      }
    });
    return combined;
  }, [suggestionHistory]);

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
    const targetTabMeta = {
      id: currentTab.id,
      url: currentTab.url,
      pageTitle: currentTab.pageTitle
    };
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

    appendChatMessage(targetTabMeta.id, { role: "user", content: userMsg });
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
      appendChatMessage(targetTabMeta.id, { role: "ai", content: aiRes.text });
      // Save summary to local storage if action is summarize
      if (action === "summarize") {
        await saveSummary({
          url: targetTabMeta.url,
          title: targetTabMeta.pageTitle,
          content: aiRes.text,
          date: Date.now()
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      appendChatMessage(targetTabMeta.id, {
        role: "ai",
        content: "AI error: " + (err?.message || "Unknown error")
      });
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
            groups={tabGroups}
            onTabSelect={handleTabSelect}
            onTabAdd={handleTabAdd}
            onTabClose={handleTabClose}
            onTabPinToggle={handleTabPinToggle}
            onTabReorder={handleTabReorder}
            onTabAssignGroup={handleTabAssignGroup}
            onGroupCreate={handleGroupCreate}
            onGroupToggleCollapse={handleGroupToggle}
            onGroupRename={handleGroupRename}
            onGroupDelete={handleGroupDelete}
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
                if (!currentTab) return;
                patchTab(currentTab.id, { addressInput: value });
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
          <div className="topbar-actions">
            <button
              className={`settings-trigger ${settingsOpen ? "is-active" : ""}`}
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              aria-haspopup="dialog"
            >
              <span className="settings-trigger__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    d="M8.94 2.25l.5-1.25h-.5a.75.75 0 00-.69.44l-.54 1.22a5.7 5.7 0 00-1.4.58l-1.2-.7a.75.75 0 00-.9.12l-.36.36a.75.75 0 00-.1.9l.68 1.16a5.78 5.78 0 00-.38 1.52l-1.27.53a.75.75 0 00-.45.7v.5c0 .31.18.58.46.7l1.27.53c.08.54.23 1.05.44 1.52l-.7 1.2a.75.75 0 00.1.9l.36.36c.25.25.65.3.96.12l1.16-.68c.47.21.98.36 1.52.44l.53 1.27c.12.28.4.46.7.46h.5a.75.75 0 00.69-.45l.53-1.27a5.76 5.76 0 001.52-.44l1.16.68c.3.18.7.13.95-.12l.36-.36a.75.75 0 00.12-.9l-.68-1.16c.21-.47.36-.98.44-1.52l1.27-.53c.28-.12.46-.4.46-.7v-.5a.75.75 0 00-.45-.69l-1.27-.53a5.7 5.7 0 00-.44-1.52l.68-1.16a.75.75 0 00-.12-.9l-.36-.36a.75.75 0 00-.9-.1l-1.16.68a5.7 5.7 0 00-1.52-.44l-.53-1.27a.75.75 0 00-.69-.45h-.5l.5 1.25-1.06 2.75a2.25 2.25 0 102.12 0L8.94 2.25z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="settings-trigger__label">Settings</span>
            </button>
            <button
              className={`assistant-toggle ${assistantOpen ? "is-active" : ""}`}
              onClick={() => {
                if (!currentTab) return;
                setAssistantOpen(currentTab.id, !currentTab.assistantOpen);
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
                    if (!currentTab) return;
                    patchTab(currentTab.id, { addressInput: value });
                  }}
                />
              ) : (
                <PageView
                  url={currentTab.url}
                  onTitleChange={title => {
                    if (!currentTab) return;
                    patchTab(currentTab.id, { pageTitle: title, title });
                  }}
                  onDomExtract={text => {
                    const compact = text.replace(/\s+/g, " ").trim();
                    const limited = compact.slice(0, 4000);
                    if (!currentTab) return;
                    patchTab(currentTab.id, { pageText: limited });
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
                if (currentTab) {
                  setAssistantOpen(currentTab.id, false);
                }
              }}
            />
          </aside>
        ) : null}
      </div>
      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default App;
