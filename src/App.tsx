import React, { useState, useEffect } from "react";
import AddressBar from "./components/AddressBar";
import TabManager from "./components/TabManager";
import PageView from "./components/PageView";
import NewTabPage, { quickLinks as newTabQuickLinks } from "./components/NewTabPage";
import SidebarChat from "./components/SidebarChat";
import SettingsPanel from "./components/SettingsPanel";
import SummaryCard from "./components/SummaryCard";
import {
  summarizePagePrompt,
  translatePagePrompt,
  explainSelectedTextPrompt
} from "./ai/prompts";
import { callAI } from "./ai/aiAdapter";
import { saveSummary, saveBookmark, getBookmarks, saveHistoryEntry } from "./utils/storage";
import { useSessionSelector, useSessionActions, useActiveTab } from "./state/session/store";

import { getWebviewSelectedText } from "./utils/context";

const App: React.FC = () => {
  const tabs = useSessionSelector(state => state.tabs);
  const suggestionHistory = useSessionSelector(state => state.suggestionHistory);
  const settings = useSessionSelector(state => state.settings);
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
    updateSettings,
    closeAllTabs
  } = useSessionActions();
  const [bookmarkedUrls, setBookmarkedUrls] = useState<Record<string, boolean>>({});
  const [toolbarNotice, setToolbarNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const noticeTimerRef = React.useRef<number | undefined>();
  const webviewRef = React.useRef<any>(null);

  // Navigation state for back/forward buttons
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  React.useEffect(() => {
    getBookmarks()
      .then(entries => {
        const map: Record<string, boolean> = {};
        entries.forEach((entry: any) => {
          if (entry?.url) {
            map[entry.url] = true;
          }
        });
        setBookmarkedUrls(map);
      })
      .catch(err => console.warn("Unable to load bookmarks", err));
  }, []);

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
    // Save to browsing history (only actual URL navigations)
    if (url && url !== "about:blank") {
      saveHistoryEntry({
        url,
        title: input || url,
        date: Date.now()
      }).catch(err => console.warn("Failed to save history", err));
    }
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
  };

  const handleTabReorder = (pinnedIds: string[], regularIds: string[]) => {
    reorderTabs(pinnedIds, regularIds);
  };

  const showNotice = React.useCallback((message: string, kind: "success" | "error" = "success") => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setToolbarNotice({ message, kind });
    noticeTimerRef.current = window.setTimeout(() => {
      setToolbarNotice(null);
      noticeTimerRef.current = undefined;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleBookmark = async () => {
    if (!currentTab || !currentTab.url || currentTab.url === "about:blank") {
      showNotice("Nothing to bookmark", "error");
      return;
    }
    try {
      await saveBookmark({
        url: currentTab.url,
        title: currentTab.pageTitle || currentTab.title || currentTab.url,
        date: Date.now()
      });
      setBookmarkedUrls(prev => ({
        ...prev,
        [currentTab.url]: true
      }));
      showNotice("Saved to bookmarks");
    } catch (err) {
      console.warn("Failed to save bookmark", err);
      showNotice("Bookmark failed", "error");
    }
  };

  const handleCopyLink = async () => {
    if (!currentTab?.url) {
      showNotice("No link to copy", "error");
      return;
    }
    if (!navigator.clipboard?.writeText) {
      showNotice("Clipboard unavailable", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentTab.url);
      showNotice("Link copied");
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
      showNotice("Copy failed", "error");
    }
  };

  // handleVoiceSearch removed
  // OpenAI Whisper transcription helper
  async function transcribeWithWhisper(audioBlob: Blob, mimeType: string = "audio/webm"): Promise<string | null> {
    // Convert Blob to File for FormData
    const audioFile = new File([audioBlob], "voice.webm", { type: mimeType });
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    // Get OpenAI API key from environment
    let apiKey = "";
    if (window.electronAPI && window.electronAPI.getEnv) {
      apiKey = (await window.electronAPI.getEnv("OPEN_AI_API_KEY")) || "";
    }
    if (!apiKey) {
      throw new Error("OpenAI API key not set for Whisper.");
    }

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Whisper API fetch failed:", {
        status: res.status,
        statusText: res.statusText,
        body: errText
      });
      throw new Error("Whisper API error: " + errText);
    }
    const transcript = await res.text();
    console.log("Voice: Whisper API response:", transcript);
    return transcript.trim() || null;
  }

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

  const isCurrentTabBookmarked = React.useMemo(() => {
    if (!currentTab?.url) return false;
    return !!bookmarkedUrls[currentTab.url];
  }, [currentTab?.url, bookmarkedUrls]);

  const ensurePageText = React.useCallback(async () => {
    if (!currentTab) return "";
    if (currentTab.pageText) return currentTab.pageText;
    if (!webviewRef.current) return "";
    try {
      const raw = await webviewRef.current.executeJavaScript("document.body.innerText", false);
      const compact = (raw || "").replace(/\s+/g, " ").trim();
      if (compact) {
        patchTab(currentTab.id, { pageText: compact.slice(0, 4000) });
      }
      return compact;
    } catch (err) {
      console.warn("Failed to extract page text", err);
      return "";
    }
  }, [currentTab, patchTab]);

  // AI sidebar action handler
  // Handle AI chat from NewTabPage (Perplexity-style, no page context needed)
  const handleNewTabAIChat = async (query: string) => {
    if (!currentTab) return;
    if (latestAiController.current) {
      latestAiController.current.abort();
      latestAiController.current = null;
    }
    appendChatMessage(currentTab.id, { role: "user", content: query });
    setAiLoading(true);
    const controller = new AbortController();
    latestAiController.current = controller;
    try {
      const systemInstruction = "You are Rudra AI, created by Rajan Kumar Karn, founder of DocMateX (currently pursuing his Bachelors from IIT Patna). Provide a concise, helpful response (medium length). Expand only if explicitly asked for details. ";
      const aiRes = await callAI({
        prompt: systemInstruction + query,
        max_tokens: 1024,
        temperature: 0.7,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      appendChatMessage(currentTab.id, { role: "ai", content: aiRes.text });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      appendChatMessage(currentTab.id, {
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

  const handleAIAction = async (
    action: "summarize" | "translate" | "explain" | "custom",
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
      const identityPrompt = "You are Rudra AI, created by Rajan Kumar Karn (founder of DocMateX, IIT Patna).";
      prompt = `${identityPrompt}\nGiven the following page context:\nTitle: ${currentTab.pageTitle}\nURL: ${currentTab.url}\nText: ${currentTab.pageText?.slice(0, 2000) || ""}\n\nAnswer the user's question:\n${payload?.text || ""}`;
      userMsg = payload?.text || "";
    } else {
      let workingText = currentTab.pageText;
      if (!workingText) {
        workingText = await ensurePageText();
        if (!workingText) {
          showNotice("Page content not ready", "error");
          return;
        }
      }
      if (action === "summarize") {
        prompt = summarizePagePrompt(workingText, currentTab.url, currentTab.pageTitle);
        userMsg = "Summarize this page";
      } else if (action === "translate") {
        prompt = translatePagePrompt(workingText, currentTab.url, currentTab.pageTitle, "en");
        userMsg = "Translate this page to English";
      } else if (action === "explain") {
        // Try to get selected text from webview
        let selectedText = "";
        if (webviewRef.current) {
          selectedText = await getWebviewSelectedText(webviewRef.current);
        }
        if (!selectedText) {
          selectedText = workingText.slice(0, 400);
        }
        prompt = explainSelectedTextPrompt(selectedText, currentTab.url, currentTab.pageTitle);
        userMsg = "Explain selected text";
      }
    }

    if (latestAiController.current) {
      latestAiController.current.abort();
      latestAiController.current = null;
    }

    appendChatMessage(targetTabMeta.id, { role: "user", content: userMsg });
    if (action === "summarize") {
      showNotice("Summarizing page...");
    }
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
        showNotice("Summary saved to assistant");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      appendChatMessage(targetTabMeta.id, {
        role: "ai",
        content: "AI error: " + (err?.message || "Unknown error")
      });
      if (action === "summarize") {
        showNotice("Summarization failed", "error");
      }
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
            onTabAdd={handleTabAdd}
            onTabClose={handleTabClose}
            onTabPinToggle={handleTabPinToggle}
            onTabReorder={handleTabReorder}
          />
        </div>
        <div className="topbar-row topbar-row--address">
          <div className="topbar-omnibox">
            <AddressBar
              variant="default"
              suggestions={suggestionPool}
              onNavigate={handleNavigate}
              value={currentTab?.addressInput ?? ""}
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
              // onVoiceSearch removed
              onBookmark={handleBookmark}
              onCopyLink={handleCopyLink}
              onSummarize={() => handleAIAction("summarize")}
              bookmarked={isCurrentTabBookmarked}
              disableBookmark={!currentTab?.url || currentTab.url === "about:blank"}
              disableCopy={!currentTab?.url}
              disableSummarize={!currentTab?.pageText}
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
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <circle cx="9" cy="9" r="2.3" fill="currentColor" />
                  <path
                    d="M15.3 9.7a6.4 6.4 0 0 0 0-1.4l1.5-1.2a.5.5 0 0 0 .1-.7l-1.4-2.4a.5.5 0 0 0-.6-.2l-1.8.7a6.3 6.3 0 0 0-1.2-.7l-.3-1.9a.5.5 0 0 0-.5-.4H7.9a.5.5 0 0 0-.5.4l-.3 1.9a6.3 6.3 0 0 0-1.2.7l-1.8-.7a.5.5 0 0 0-.6.2L2.1 6.4a.5.5 0 0 0 .1.7l1.5 1.2a6.4 6.4 0 0 0 0 1.4l-1.5 1.2a.5.5 0 0 0-.1.7l1.4 2.4a.5.5 0 0 0 .6.2l1.8-.7c.4.3.8.5 1.2.7l.3 1.9a.5.5 0 0 0 .5.4h2.9a.5.5 0 0 0 .5-.4l.3-1.9c.4-.2.8-.4 1.2-.7l1.8.7a.5.5 0 0 0 .6-.2l1.4-2.4a.5.5 0 0 0-.1-.7l-1.5-1.2z"
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
              <span className="assistant-toggle__icon" aria-hidden="true">R</span>
              <span className="assistant-toggle__label">Assistant</span>
            </button>
          </div>
        </div>
        {toolbarNotice ? (
          <div className={`topbar-toast topbar-toast--${toolbarNotice.kind}`}>{toolbarNotice.message}</div>
        ) : null}
      </header>

      <div className="app-main">
        <section className="browser-shell">
          <div className="page-stage">
            {currentTab && (
              (!currentTab.url || currentTab.url === "about:blank") ? (
                <NewTabPage
                  variant="hero"
                  suggestions={suggestionPool}
                  value={(currentTab?.addressInput ?? "") + ""}
                  onNavigate={handleNavigate}
                  onChange={e => {
                    const value = e.target.value;
                    if (!currentTab) return;
                    patchTab(currentTab.id, { addressInput: value });
                  }}
                  onAIChat={handleNewTabAIChat}
                  chatHistory={chatHistory}
                  aiLoading={aiLoading}
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
          onHistoryNavigate={(url: string) => handleNavigate(url)}
          onCloseAllTabs={closeAllTabs}
          onCloseCurrentTab={() => {
            if (currentTab) closeTab(currentTab.id);
          }}
        />
      ) : null}
    </div>
  );
};

export default App;
