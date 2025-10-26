import React from "react";

/**
 * TabManager component.
 * - Manages browser tabs (MVP: single tab, but extendable).
 * - Displays tab(s) and allows switching/closing in future.
 */
interface Tab {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

interface TabManagerProps {
  tabs: Tab[];
  onTabSelect: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
}

const TabManager: React.FC<TabManagerProps> = ({ tabs, onTabSelect, onTabClose, onTabAdd }) => {
  return (
    <nav className="tab-strip">
      <div className="tab-strip__rail">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab-chip ${tab.active ? "is-active" : ""}`}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="tab-chip__indicator" aria-hidden="true" />
            <span className="tab-chip__label">{tab.title || tab.url || "New tab"}</span>
            {onTabClose && tabs.length > 1 && (
              <span
                className="tab-chip__close"
                role="button"
                aria-label="Close tab"
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }
                }}
              >
                ×
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="tab-chip tab-chip--ghost"
          onClick={onTabAdd}
          aria-label="Open a new tab"
        >
          <span className="tab-chip__indicator" aria-hidden="true" />
          <span className="tab-chip__label">New tab</span>
        </button>
      </div>
    </nav>
  );
};

export default TabManager;
