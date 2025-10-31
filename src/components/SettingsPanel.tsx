import React from "react";
import { PermissionPolicy, SessionSettings } from "../state/session/types";

interface SettingsPanelProps {
  settings: SessionSettings;
  onUpdate: (settings: Partial<SessionSettings>) => void;
  onClose: () => void;
}

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
    label: "Block third‑party cookies",
    description: "Limit cross-site tracking by blocking cookies from external domains.",
  },
  {
    key: "autoHttpsUpgrade",
    label: "Upgrade connections to HTTPS",
    description: "Automatically switch to secure versions of sites when available.",
  },
  {
    key: "sendDoNotTrack",
    label: "Send “Do Not Track” requests",
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
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

        <section className="settings-section">
          <h3 className="settings-section__title">Privacy &amp; Security</h3>
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

        <section className="settings-section">
          <h3 className="settings-section__title">Site Permissions</h3>
          <div className="settings-permissions">
            <div className="settings-permission-row">
              <span className="settings-permission__label">Camera</span>
              <select
                value={settings.permissionPolicy.camera}
                onChange={handlePermissionChange("camera")}
                aria-label="Camera permission"
              >
                {permissionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-permission-row">
              <span className="settings-permission__label">Microphone</span>
              <select
                value={settings.permissionPolicy.microphone}
                onChange={handlePermissionChange("microphone")}
                aria-label="Microphone permission"
              >
                {permissionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-permission-row">
              <span className="settings-permission__label">Screen Capture</span>
              <select
                value={settings.permissionPolicy.screen}
                onChange={handlePermissionChange("screen")}
                aria-label="Screen capture permission"
              >
                {permissionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-permission-row">
              <span className="settings-permission__label">Clipboard</span>
              <select
                value={settings.permissionPolicy.clipboard}
                onChange={handlePermissionChange("clipboard")}
                aria-label="Clipboard permission"
              >
                {permissionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

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
      </div>
    </div>
  );
};

export default SettingsPanel;
