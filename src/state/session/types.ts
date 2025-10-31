export type TabStatus = "normal" | "pinned" | "sleeping" | "discarded";

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  createdAt: number;
}

export interface TabHistoryEntry {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  addressValue: string;
  addressInput: string;
  pageTitle: string;
  pageText: string;
  chatHistory: ChatMessage[];
  assistantOpen: boolean;
  active: boolean;
  status: TabStatus;
  incognito: boolean;
  groupId: string | null;
  history: TabHistoryEntry[];
  historyIndex: number;
  createdAt: number;
  lastActiveAt: number;
}

export type TabSnapshot = Omit<Tab, "active">;

export interface TabGroup {
  id: string;
  title: string;
  color?: string;
  collapsed?: boolean;
}

export interface RecentlyClosedEntry {
  tab: TabSnapshot;
  closedAt: number;
  reason?: "user" | "system" | "crash";
}

export type PermissionPolicy = "allow" | "ask" | "block";

export interface PermissionSettings {
  camera: PermissionPolicy;
  microphone: PermissionPolicy;
  screen: PermissionPolicy;
  clipboard: PermissionPolicy;
}

export interface SessionSettings {
  confirmCloseThreshold: number;
  restoreSidebar: boolean;
  defaultSearchEngine: string;
  blockAds: boolean;
  blockTrackers: boolean;
  blockThirdPartyCookies: boolean;
  autoHttpsUpgrade: boolean;
  clearCookiesOnExit: boolean;
  sendDoNotTrack: boolean;
  permissionPolicy: PermissionSettings;
}

export interface SessionState {
  tabs: Tab[];
  activeTabId: string | null;
  tabGroups: Record<string, TabGroup>;
  recentlyClosed: RecentlyClosedEntry[];
  suggestionHistory: string[];
  settings: SessionSettings;
  version: number;
  hydrated: boolean;
}

export interface SessionSnapshot {
  version: number;
  savedAt: number;
  state: Omit<SessionState, "hydrated">;
}

export interface CreateTabOptions {
  url?: string;
  title?: string;
  incognito?: boolean;
  status?: TabStatus;
  groupId?: string | null;
  addressInput?: string;
}
