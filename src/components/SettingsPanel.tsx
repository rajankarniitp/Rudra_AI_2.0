import React, { useState, useEffect } from "react";
import { PermissionPolicy, SessionSettings } from "../state/session/types";
import { HistoryEntry, getHistory, deleteHistoryEntry, clearHistory } from "../utils/storage";

interface SettingsPanelProps {
  settings: SessionSettings;
  onUpdate: (settings: Partial<SessionSettings>) => void;
  onClose: () => void;
  onHistoryNavigate?: (url: string) => void;
  onCloseAllTabs: () => void;
  onCloseCurrentTab: () => void;
}

type SettingsTab = "general" | "privacy" | "history";

const privacyToggles: Array<{
  key: keyof SessionSettings;
  label: string;
  description: string;
}> = [
    {
      key: "blockAds",
      label: "Block intrusive ads",
      description: "Reduce visual clutter and stop known advertising scripts from loading.",
    },
    {
      key: "blockTrackers",
      label: "Block trackers",
      description: "Prevent analytics beacons and fingerprinting scripts from following you across sites.",
    },
    {
      key: "blockThirdPartyCookies",
      label: "Block third-party cookies",
      description: "Limit cross-site tracking by blocking cookies from external domains.",
    },
    {
      key: "autoHttpsUpgrade",
      label: "Upgrade connections to HTTPS",
      description: "Automatically switch to secure versions of sites when available.",
    },
    {
      key: "sendDoNotTrack",
      label: "Send 'Do Not Track' requests",
      description: "Ask websites not to track your browsing activity.",
    },
    {
      key: "clearCookiesOnExit",
      label: "Clear site data on close",
      description: "Automatically remove cookies and storage when you quit the app.",
    },
  ];

const permissionOptions: Array<{ value: PermissionPolicy; label: string }> = [
  { value: "ask", label: "Ask every time" },
  { value: "allow", label: "Allow" },
  { value: "block", label: "Block" },
];

/* ── SVG Icons ── */
const GlobeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" /><ellipse cx="8" cy="8" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1" /><path d="M1.5 8h13" stroke="currentColor" strokeWidth="1" /><path d="M3 4.5h10" stroke="currentColor" strokeWidth="0.8" opacity="0.5" /><path d="M3 11.5h10" stroke="currentColor" strokeWidth="0.8" opacity="0.5" /></svg>
);

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.5a1 1 0 0 1-1 .9H4.7a1 1 0 0 1-1-.9L3 4z" stroke="currentColor" strokeWidth="1.2" fill="none" /><path d="M5.5 2.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M2 4h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
);

const SearchIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" fill="none" /><line x1="12" y1="12" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

/* ── Helpers ── */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const groups: Record<string, HistoryEntry[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  for (const entry of entries) {
    let label: string;
    if (entry.date >= today) {
      label = "Today";
    } else if (entry.date >= yesterday) {
      label = "Yesterday";
    } else if (entry.date >= weekAgo) {
      label = "Last 7 days";
    } else {
      const d = new Date(entry.date);
      label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }

  return Object.entries(groups).map(([label, entries]) => ({ label, entries }));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose, onHistoryNavigate, onCloseAllTabs, onCloseCurrentTab }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      const entries = await getHistory();
      setHistoryEntries(entries);
    } catch (err) {
      console.warn("Failed to load history", err);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteHistoryEntry(id);
    setHistoryEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = async () => {
    if (window.confirm("Clear all browsing history? This cannot be undone.")) {
      await clearHistory();
      setHistoryEntries([]);
    }
  };

  const handleToggle = (key: keyof SessionSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ [key]: event.target.checked } as Partial<SessionSettings>);
  };

  const handlePermissionChange =
    (key: keyof SessionSettings["permissionPolicy"]) =>
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate({
          permissionPolicy: {
            ...settings.permissionPolicy,
            [key]: event.target.value as PermissionPolicy,
          },
        });
      };

  // Filter history by search
  const filteredHistory = historySearch.trim()
    ? historyEntries.filter(
      e =>
        (e.title || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        e.url.toLowerCase().includes(historySearch.toLowerCase())
    )
    : historyEntries;

  const groupedHistory = groupByDate(filteredHistory);

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Browser settings">
      <div className="settings-panel">
        <header className="settings-panel__header">
          <div>
            <h2 className="settings-panel__title">Settings</h2>
            <p className="settings-panel__subtitle">Control privacy, security, and browsing preferences</p>
          </div>
          <button type="button" className="settings-panel__close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>

        {/* ── Tab Navigation ── */}
        <nav className="settings-tabs">
          <button
            className={`settings-tabs__btn ${activeTab === "general" ? "settings-tabs__btn--active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l5.5 3.5v7L8 14.5 2.5 12V5L8 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" /><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
            General
          </button>
          <button
            className={`settings-tabs__btn ${activeTab === "privacy" ? "settings-tabs__btn--active" : ""}`}
            onClick={() => setActiveTab("privacy")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1C5 1 3 3.5 3 3.5V7c0 4 2.5 6.5 5 8 2.5-1.5 5-4 5-8V3.5S11 1 8 1z" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
            Privacy & Security
          </button>
          <button
            className={`settings-tabs__btn ${activeTab === "history" ? "settings-tabs__btn--active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" /><polyline points="8,4 8,8 11,10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            History
          </button>
        </nav>

        {/* ── General Tab ── */}
        {activeTab === "general" && (
          <>
            <section className="settings-section">
              <h3 className="settings-section__title">General</h3>
              <div className="settings-permission-row">
                <span className="settings-permission__label">Default search engine</span>
                <select
                  value={settings.defaultSearchEngine}
                  onChange={event => onUpdate({ defaultSearchEngine: event.target.value })}
                  aria-label="Default search engine"
                >
                  <option value="google">Google</option>
                  <option value="duckduckgo">DuckDuckGo</option>
                  <option value="bing">Bing</option>
                  <option value="perplexity">Perplexity</option>
                </select>
              </div>
              <div className="settings-permission-row">
                <span className="settings-permission__label">Confirm close threshold</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={settings.confirmCloseThreshold}
                  onChange={event =>
                    onUpdate({
                      confirmCloseThreshold: Number.parseInt(event.target.value || "1", 10),
                    })
                  }
                  aria-label="Confirm close threshold"
                />
              </div>
              <label className="settings-toggle settings-toggle--inline">
                <div className="settings-toggle__meta">
                  <span className="settings-toggle__label">Restore assistant sidebar</span>
                  <span className="settings-toggle__description">
                    Reopen the AI assistant panel automatically for tabs that had it active.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.restoreSidebar}
                  onChange={handleToggle("restoreSidebar")}
                  aria-label="Restore assistant sidebar"
                />
              </label>
            </section>

            <section className="settings-section">
              <h3 className="settings-section__title">Site Permissions</h3>
              <div className="settings-permissions">
                {(["camera", "microphone", "screen", "clipboard"] as const).map(perm => (
                  <div key={perm} className="settings-permission-row">
                    <span className="settings-permission__label">{perm.charAt(0).toUpperCase() + perm.slice(1)}{perm === "screen" ? " Capture" : ""}</span>
                    <select
                      value={settings.permissionPolicy[perm]}
                      onChange={handlePermissionChange(perm)}
                      aria-label={`${perm} permission`}
                    >
                      {permissionOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Privacy & Security Tab ── */}
        {activeTab === "privacy" && (
          <section className="settings-section">
            <h3 className="settings-section__title">Privacy & Security</h3>
            <div className="settings-grid">
              {privacyToggles.map(toggle => (
                <label key={toggle.key as string} className="settings-toggle">
                  <div className="settings-toggle__meta">
                    <span className="settings-toggle__label">{toggle.label}</span>
                    <span className="settings-toggle__description">{toggle.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[toggle.key])}
                    onChange={handleToggle(toggle.key)}
                    aria-label={toggle.label}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        {/* ── History Tab (Chrome-style) ── */}
        {activeTab === "history" && (
          <section className="settings-section settings-history">
            <div className="settings-history__toolbar">
              <div className="settings-history__search">
                <span className="settings-history__search-icon"><SearchIcon /></span>
                <input
                  type="text"
                  className="settings-history__search-input"
                  placeholder="Search history..."
                  value={historySearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHistorySearch(e.target.value)}
                  autoFocus
                />
              </div>
              {historyEntries.length > 0 && (
                <button className="settings-history__clear-btn" onClick={handleClearAll}>
                  <TrashIcon />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            <div className="settings-history__list">
              {filteredHistory.length === 0 ? (
                <div className="settings-history__empty">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.3">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
                    <polyline points="24,12 24,24 32,28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <p>{historySearch ? "No results found" : "No browsing history yet"}</p>
                  <span className="settings-history__empty-hint">
                    {historySearch ? "Try a different search term" : "Pages you visit will appear here"}
                  </span>
                </div>
              ) : (
                groupedHistory.map((group) => (
                  <div key={group.label} className="settings-history__group">
                    <div className="settings-history__group-label">{group.label}</div>
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="settings-history__item">
                        <button
                          className="settings-history__item-link"
                          onClick={() => {
                            if (onHistoryNavigate) {
                              onHistoryNavigate(entry.url);
                              onClose();
                            }
                          }}
                        >
                          <span className="settings-history__item-icon"><GlobeIcon /></span>
                          <div className="settings-history__item-info">
                            <span className="settings-history__item-title">{entry.title || entry.url}</span>
                            <span className="settings-history__item-url">{getDomain(entry.url)}</span>
                          </div>
                          <span className="settings-history__item-time">{formatDate(entry.date)}</span>
                        </button>
                        <button
                          className="settings-history__item-delete"
                          onClick={() => {
                            if (entry.id !== undefined) handleDeleteEntry(entry.id);
                          }}
                          aria-label="Delete entry"
                          title="Remove from history"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
