import React from "react";
import {
  ChatMessage,
  CreateTabOptions,
  RecentlyClosedEntry,
  SessionSettings,
  SessionSnapshot,
  SessionState,
  Tab,
  TabGroup,
  TabSnapshot,
  TabStatus,
} from "./types";
import { loadSessionSnapshot, saveSessionSnapshot, SESSION_STATE_VERSION } from "./persistence";

type SessionAction =
  | { type: "TAB_ADD"; payload: { tab: Tab; makeActive: boolean } }
  | { type: "TAB_CLOSE"; payload: { tabId: string; reason?: RecentlyClosedEntry["reason"] } }
  | { type: "TAB_SET_ACTIVE"; payload: { tabId: string } }
  | { type: "TAB_PATCH"; payload: { tabId: string; patch: Partial<Tab> } }
  | { type: "TAB_SET_ASSISTANT"; payload: { tabId: string; open: boolean } }
  | { type: "TAB_APPEND_CHAT"; payload: { tabId: string; message: ChatMessage } }
  | { type: "TAB_SET_STATUS"; payload: { tabId: string; status: TabStatus } }
  | { type: "TAB_ASSIGN_GROUP"; payload: { tabId: string; groupId: string | null } }
  | { type: "TAB_REORDER"; payload: { pinnedIds: string[]; regularIds: string[] } }
  | { type: "TAB_REOPEN"; payload: { entry?: RecentlyClosedEntry } }
  | { type: "SUGGESTION_ADD"; payload: { value: string } }
  | { type: "SESSION_REHYDRATE"; payload: SessionSnapshot }
  | { type: "SESSION_READY" }
  | { type: "SESSION_UPDATE_SETTINGS"; payload: Partial<SessionSettings> }
  | { type: "TAB_GROUP_UPSERT"; payload: TabGroup }
  | { type: "TAB_GROUP_DELETE"; payload: { groupId: string } }
  | { type: "TAB_GROUP_DELETE"; payload: { groupId: string } }
  | { type: "TAB_GROUP_TOGGLE_COLLAPSE"; payload: { groupId: string } }
  | { type: "TAB_CLOSE_ALL"; payload: { newTab: Tab } };

const SessionStateContext = React.createContext<SessionState | undefined>(undefined);
const SessionDispatchContext = React.createContext<React.Dispatch<SessionAction> | undefined>(undefined);

let tabSequence = 0;

const DEFAULT_HOME_URL = "about:blank";
const DEFAULT_TAB_TITLE = "New Tab";

function generateTabId() {
  tabSequence += 1;
  return `tab-${Date.now()}-${tabSequence}`;
}

export function createBlankTab(id: string, options: CreateTabOptions = {}): Tab {
  const createdAt = Date.now();
  const url = options.url ?? DEFAULT_HOME_URL;
  const isHome = url === DEFAULT_HOME_URL;
  const title = options.title ?? (isHome ? DEFAULT_TAB_TITLE : url);
  const addressInput = options.addressInput ?? (isHome ? "" : url);
  return {
    id,
    title,
    url,
    addressValue: url,
    addressInput,
    pageTitle: title,
    pageText: "",
    chatHistory: [],
    assistantOpen: false,
    active: false,
    status: options.status ?? "normal",
    incognito: options.incognito ?? false,
    groupId: options.groupId ?? null,
    history: [
      {
        id: `${id}-history-${createdAt}`,
        url,
        title,
        timestamp: createdAt,
      },
    ],
    historyIndex: 0,
    createdAt,
    lastActiveAt: createdAt,
  };
}

const defaultTab = createBlankTab("tab-1");
defaultTab.title = DEFAULT_TAB_TITLE;
defaultTab.pageTitle = DEFAULT_TAB_TITLE;
defaultTab.active = true;

const defaultState: SessionState = {
  tabs: [defaultTab],
  activeTabId: defaultTab.id,
  tabGroups: {},
  recentlyClosed: [],
  suggestionHistory: [],
  settings: {
    confirmCloseThreshold: 12,
    restoreSidebar: true,
    defaultSearchEngine: "google",
    blockAds: true,
    blockTrackers: true,
    blockThirdPartyCookies: true,
    autoHttpsUpgrade: true,
    clearCookiesOnExit: false,
    sendDoNotTrack: true,
    permissionPolicy: {
      camera: "ask",
      microphone: "ask",
      screen: "ask",
      clipboard: "ask",
    },
  },
  version: SESSION_STATE_VERSION,
  hydrated: false,
};

function toSnapshot(tab: Tab): TabSnapshot {
  const { active, ...rest } = tab;
  return rest;
}

function applyActiveState(tabs: Tab[], activeTabId: string | null, timestamp: number): Tab[] {
  return tabs.map(tab => {
    if (tab.id === activeTabId) {
      return tab.active
        ? { ...tab, lastActiveAt: timestamp }
        : { ...tab, active: true, lastActiveAt: timestamp };
    }
    if (!tab.active) return tab;
    return { ...tab, active: false };
  });
}

function normalizeTab(raw: Tab): Tab {
  const status = raw.status ?? "normal";
  const history = Array.isArray(raw.history) && raw.history.length > 0 ? raw.history : [
    {
      id: `${raw.id}-history-${raw.createdAt ?? Date.now()}`,
      url: raw.url,
      title: raw.title,
      timestamp: raw.createdAt ?? Date.now(),
    },
  ];
  const historyIndex =
    typeof raw.historyIndex === "number" && raw.historyIndex >= 0 && raw.historyIndex < history.length
      ? raw.historyIndex
      : history.length - 1;
  return {
    ...raw,
    status,
    groupId: raw.groupId ?? null,
    chatHistory: Array.isArray(raw.chatHistory) ? raw.chatHistory : [],
    history,
    historyIndex,
  };
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "TAB_ADD": {
      const timestamp = Date.now();
      const tabs = state.tabs.map(tab => (tab.active ? { ...tab, active: false } : tab));
      const newTab = action.payload.makeActive
        ? { ...action.payload.tab, active: true, lastActiveAt: timestamp }
        : action.payload.tab;
      return {
        ...state,
        tabs: [...tabs, newTab],
        activeTabId: action.payload.makeActive ? newTab.id : state.activeTabId,
      };
    }
    case "TAB_SET_ACTIVE": {
      if (state.activeTabId === action.payload.tabId) {
        return state;
      }
      const tabExists = state.tabs.some(tab => tab.id === action.payload.tabId);
      if (!tabExists) {
        return state;
      }
      const nextTabs = applyActiveState(state.tabs, action.payload.tabId, Date.now());
      return { ...state, tabs: nextTabs, activeTabId: action.payload.tabId };
    }
    case "TAB_PATCH": {
      const { tabId, patch } = action.payload;
      let changed = false;
      const nextTabs = state.tabs.map(tab => {
        if (tab.id !== tabId) return tab;
        changed = true;
        const nextHistory =
          patch.url && patch.url !== tab.url
            ? [
              ...tab.history.slice(0, tab.historyIndex + 1),
              {
                id: `${tab.id}-history-${Date.now()}`,
                url: patch.url,
                title: patch.title ?? patch.pageTitle ?? tab.title,
                timestamp: Date.now(),
              },
            ]
            : tab.history;
        const nextHistoryIndex = nextHistory === tab.history ? tab.historyIndex : nextHistory.length - 1;
        return {
          ...tab,
          ...patch,
          history: nextHistory,
          historyIndex: nextHistoryIndex,
        };
      });
      if (!changed) return state;
      return { ...state, tabs: nextTabs };
    }
    case "TAB_SET_ASSISTANT": {
      const nextTabs = state.tabs.map(tab => {
        if (tab.id !== action.payload.tabId) return tab;
        if (tab.assistantOpen === action.payload.open) return tab;
        return { ...tab, assistantOpen: action.payload.open };
      });
      return { ...state, tabs: nextTabs };
    }
    case "TAB_APPEND_CHAT": {
      const nextTabs = state.tabs.map(tab => {
        if (tab.id !== action.payload.tabId) return tab;
        return { ...tab, chatHistory: [...tab.chatHistory, action.payload.message] };
      });
      return { ...state, tabs: nextTabs };
    }
    case "TAB_SET_STATUS": {
      const nextTabs = state.tabs.map(tab => {
        if (tab.id !== action.payload.tabId) return tab;
        if (tab.status === action.payload.status) return tab;
        return { ...tab, status: action.payload.status };
      });
      return { ...state, tabs: nextTabs };
    }
    case "TAB_ASSIGN_GROUP": {
      const nextTabs = state.tabs.map(tab =>
        tab.id === action.payload.tabId ? { ...tab, groupId: action.payload.groupId } : tab
      );
      return { ...state, tabs: nextTabs };
    }
    case "TAB_CLOSE": {
      if (state.tabs.length <= 1) {
        return state;
      }
      const index = state.tabs.findIndex(tab => tab.id === action.payload.tabId);
      if (index === -1) {
        return state;
      }
      const removedTab = state.tabs[index];
      const remainingTabs = state.tabs.filter(tab => tab.id !== removedTab.id);
      let nextActiveId = state.activeTabId;
      if (removedTab.id === state.activeTabId) {
        const fallback = remainingTabs[index - 1] ?? remainingTabs[0] ?? null;
        nextActiveId = fallback ? fallback.id : null;
      }
      const nextTabs = applyActiveState(remainingTabs, nextActiveId, Date.now());
      const entry: RecentlyClosedEntry = {
        tab: toSnapshot({ ...removedTab, active: false }),
        closedAt: Date.now(),
        reason: action.payload.reason ?? "user",
      };
      const recentlyClosed = [entry, ...state.recentlyClosed].slice(0, 15);
      return {
        ...state,
        tabs: nextTabs,
        activeTabId: nextActiveId,
        recentlyClosed,
      };
    }
    case "TAB_REORDER": {
      const idToTab = new Map(state.tabs.map(tab => [tab.id, tab] as const));
      const collect = (ids: string[]) =>
        ids
          .map(id => idToTab.get(id))
          .filter((tab): tab is Tab => Boolean(tab));
      const pinnedTabs = collect(action.payload.pinnedIds).map(tab =>
        tab.status === "pinned" ? tab : { ...tab, status: "pinned" as TabStatus }
      );
      const regularTabs = collect(action.payload.regularIds).map(tab =>
        tab.status === "pinned" ? { ...tab, status: "normal" as TabStatus } : tab
      );
      const leftovers = state.tabs.filter(
        tab => !action.payload.pinnedIds.includes(tab.id) && !action.payload.regularIds.includes(tab.id)
      );
      const merged = [...pinnedTabs, ...regularTabs, ...leftovers];
      const nextTabs = applyActiveState(merged, state.activeTabId, Date.now());
      return { ...state, tabs: nextTabs };
    }
    case "TAB_REOPEN": {
      const entry = action.payload.entry ?? state.recentlyClosed[0];
      if (!entry) return state;
      const restoredTab = normalizeTab({ ...entry.tab, active: false } as Tab);
      const timestamp = Date.now();
      const mutedTabs = state.tabs.map(tab => (tab.active ? { ...tab, active: false } : tab));
      const restoredActive = { ...restoredTab, active: true, lastActiveAt: timestamp };
      return {
        ...state,
        tabs: [...mutedTabs, restoredActive],
        activeTabId: restoredActive.id,
        recentlyClosed: state.recentlyClosed.filter(rc => rc !== entry),
      };
    }
    case "SUGGESTION_ADD": {
      const trimmed = action.payload.value.trim();
      if (!trimmed) return state;
      const normalized = trimmed.toLowerCase();
      const filtered = state.suggestionHistory.filter(
        suggestion => suggestion.toLowerCase() !== normalized
      );
      const suggestionHistory = [trimmed, ...filtered].slice(0, 24);
      return { ...state, suggestionHistory };
    }
    case "SESSION_REHYDRATE": {
      const normalizedTabs = action.payload.state.tabs.map(normalizeTab);
      const hydratedTabs = applyActiveState(
        normalizedTabs,
        action.payload.state.activeTabId,
        Date.now()
      );
      const incomingSettings = action.payload.state.settings ?? defaultState.settings;
      const normalizedSettings = {
        ...defaultState.settings,
        ...incomingSettings,
        permissionPolicy: {
          ...defaultState.settings.permissionPolicy,
          ...(incomingSettings.permissionPolicy ?? {}),
        },
      };
      const normalizedRecentlyClosed = (action.payload.state.recentlyClosed || []).map(entry => ({
        ...entry,
        tab: { ...entry.tab, status: entry.tab.status ?? "normal", groupId: entry.tab.groupId ?? null },
      }));
      return {
        ...state,
        ...action.payload.state,
        tabs: hydratedTabs,
        recentlyClosed: normalizedRecentlyClosed,
        settings: normalizedSettings,
        hydrated: true,
      };
    }
    case "SESSION_READY": {
      if (state.hydrated) return state;
      return { ...state, hydrated: true };
    }
    case "SESSION_UPDATE_SETTINGS": {
      const incomingPolicy = action.payload.permissionPolicy;
      const nextPermissionPolicy = incomingPolicy
        ? { ...state.settings.permissionPolicy, ...incomingPolicy }
        : state.settings.permissionPolicy;
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
          permissionPolicy: nextPermissionPolicy,
        },
      };
    }
    case "TAB_GROUP_UPSERT": {
      return {
        ...state,
        tabGroups: {
          ...state.tabGroups,
          [action.payload.id]: {
            ...state.tabGroups[action.payload.id],
            ...action.payload,
            collapsed: action.payload.collapsed ?? state.tabGroups[action.payload.id]?.collapsed ?? false,
          },
        },
      };
    }
    case "TAB_GROUP_DELETE": {
      const { [action.payload.groupId]: _removed, ...rest } = state.tabGroups;
      const nextTabs = state.tabs.map(tab =>
        tab.groupId === action.payload.groupId ? { ...tab, groupId: null } : tab
      );
      return {
        ...state,
        tabGroups: rest,
        tabs: nextTabs,
      };
    }
    case "TAB_GROUP_TOGGLE_COLLAPSE": {
      const group = state.tabGroups[action.payload.groupId];
      if (!group) return state;
      return {
        ...state,
        tabGroups: {
          ...state.tabGroups,
          [action.payload.groupId]: {
            ...group,
            collapsed: !group.collapsed,
          },
        },
      };
    }
    case "TAB_CLOSE_ALL": {
      return {
        ...state,
        tabs: [action.payload.newTab],
        activeTabId: action.payload.newTab.id,
      };
    }
    default:
      return state;
  }
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(sessionReducer, defaultState);

  React.useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const snapshot = await loadSessionSnapshot();
      if (cancelled) return;
      if (snapshot) {
        dispatch({ type: "SESSION_REHYDRATE", payload: snapshot });
      } else {
        dispatch({ type: "SESSION_READY" });
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!state.hydrated) return;
    let cancelled = false;
    saveSessionSnapshot(state).catch(err => {
      if (!cancelled) {
        console.warn("Failed to persist session snapshot", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <SessionDispatchContext.Provider value={dispatch}>
      <SessionStateContext.Provider value={state}>{children}</SessionStateContext.Provider>
    </SessionDispatchContext.Provider>
  );
};

function useSessionStateContext(): SessionState {
  const ctx = React.useContext(SessionStateContext);
  if (!ctx) {
    throw new Error("useSessionState must be used within a SessionProvider");
  }
  return ctx;
}

function useSessionDispatch(): React.Dispatch<SessionAction> {
  const ctx = React.useContext(SessionDispatchContext);
  if (!ctx) {
    throw new Error("useSessionDispatch must be used within a SessionProvider");
  }
  return ctx;
}

export function useSessionState(): SessionState {
  return useSessionStateContext();
}

export function useSessionSelector<T>(selector: (state: SessionState) => T): T {
  const state = useSessionStateContext();
  return selector(state);
}

export function useActiveTab(): Tab | undefined {
  const state = useSessionStateContext();
  if (!state.activeTabId) return undefined;
  return state.tabs.find(tab => tab.id === state.activeTabId);
}

function ensureChatMessage(message: ChatMessage | Omit<ChatMessage, "createdAt">): ChatMessage {
  if ("createdAt" in message) {
    return message as ChatMessage;
  }
  return { ...message, createdAt: Date.now() };
}

export function useSessionActions() {
  const dispatch = useSessionDispatch();

  const addTab = React.useCallback(
    (options: CreateTabOptions = {}) => {
      const id = generateTabId();
      const tab = createBlankTab(id, options);
      dispatch({ type: "TAB_ADD", payload: { tab, makeActive: true } });
      return id;
    },
    [dispatch]
  );

  const closeTab = React.useCallback(
    (tabId: string, reason?: RecentlyClosedEntry["reason"]) => {
      dispatch({ type: "TAB_CLOSE", payload: { tabId, reason } });
    },
    [dispatch]
  );

  const setActiveTab = React.useCallback(
    (tabId: string) => {
      dispatch({ type: "TAB_SET_ACTIVE", payload: { tabId } });
    },
    [dispatch]
  );

  const patchTab = React.useCallback(
    (tabId: string, patch: Partial<Tab>) => {
      dispatch({ type: "TAB_PATCH", payload: { tabId, patch } });
    },
    [dispatch]
  );

  const setAssistantOpen = React.useCallback(
    (tabId: string, open: boolean) => {
      dispatch({ type: "TAB_SET_ASSISTANT", payload: { tabId, open } });
    },
    [dispatch]
  );

  const appendChatMessage = React.useCallback(
    (tabId: string, message: ChatMessage | Omit<ChatMessage, "createdAt">) => {
      dispatch({ type: "TAB_APPEND_CHAT", payload: { tabId, message: ensureChatMessage(message) } });
    },
    [dispatch]
  );

  const recordSuggestion = React.useCallback(
    (value: string) => {
      dispatch({ type: "SUGGESTION_ADD", payload: { value } });
    },
    [dispatch]
  );

  const updateSettings = React.useCallback(
    (settings: Partial<SessionSettings>) => {
      dispatch({ type: "SESSION_UPDATE_SETTINGS", payload: settings });
    },
    [dispatch]
  );

  const setTabStatus = React.useCallback(
    (tabId: string, status: TabStatus) => {
      dispatch({ type: "TAB_SET_STATUS", payload: { tabId, status } });
    },
    [dispatch]
  );

  const assignGroup = React.useCallback(
    (tabId: string, groupId: string | null) => {
      dispatch({ type: "TAB_ASSIGN_GROUP", payload: { tabId, groupId } });
    },
    [dispatch]
  );

  const reorderTabs = React.useCallback(
    (pinnedIds: string[], regularIds: string[]) => {
      dispatch({ type: "TAB_REORDER", payload: { pinnedIds, regularIds } });
    },
    [dispatch]
  );

  const reopenRecentlyClosed = React.useCallback(
    () => {
      dispatch({ type: "TAB_REOPEN", payload: {} });
    },
    [dispatch]
  );

  const upsertGroup = React.useCallback(
    (group: TabGroup) => {
      dispatch({ type: "TAB_GROUP_UPSERT", payload: group });
    },
    [dispatch]
  );

  const deleteGroup = React.useCallback(
    (groupId: string) => {
      dispatch({ type: "TAB_GROUP_DELETE", payload: { groupId } });
    },
    [dispatch]
  );

  const toggleGroupCollapse = React.useCallback(
    (groupId: string) => {
      dispatch({ type: "TAB_GROUP_TOGGLE_COLLAPSE", payload: { groupId } });
    },
    [dispatch]
  );

  const closeAllTabs = React.useCallback(() => {
    const id = generateTabId();
    const newTab = createBlankTab(id);
    newTab.active = true;
    dispatch({ type: "TAB_CLOSE_ALL", payload: { newTab } });
  }, [dispatch]);

  return {
    addTab,
    closeTab,
    setActiveTab,
    patchTab,
    setAssistantOpen,
    appendChatMessage,
    recordSuggestion,
    updateSettings,
    setTabStatus,
    assignGroup,
    reorderTabs,
    reopenRecentlyClosed,
    upsertGroup,
    deleteGroup,
    toggleGroupCollapse,
    closeAllTabs,
  };
}
