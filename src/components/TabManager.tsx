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
    <div className="tab-manager" style={{ position: "relative", overflow: "visible" }}>
      {/* Curved SVG background */}
      <svg
        width="100%"
        height="60"
        viewBox="0 0 900 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: -18,
          left: 0,
          width: "100%",
          zIndex: 0,
          pointerEvents: "none"
        }}
      >
        <path
          d="M0,60 Q450,-40 900,60"
          stroke="#00bcd4"
          strokeWidth="3"
          fill="none"
          opacity="0.13"
        />
      </svg>
      {/* RUDRA watermark */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 18,
          width: "100%",
          textAlign: "center",
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#00bcd4",
          opacity: 0.13,
          letterSpacing: 10,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
          fontFamily: "'Sora', 'Inter', 'Segoe UI', Arial, sans-serif"
        }}
      >
        RUDRA
      </div>
      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.active ? "active" : ""}`}
            onClick={() => onTabSelect(tab.id)}
            style={{ display: "flex", alignItems: "center" }}
          >
            <span className="tab-title">{tab.title || tab.url}</span>
            {onTabClose && tabs.length > 1 && (
              <button
                className="tab-close-btn"
                onClick={e => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                aria-label="Close tab"
                title="Close tab"
                style={{
                  marginLeft: 4,
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "1.1rem",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="add-tab-btn"
          style={{
            marginLeft: 8,
            background: "#23272f",
            color: "#00bcd4",
            border: "1px solid #00bcd4",
            borderRadius: 6,
            fontSize: "1.2rem",
            padding: "0 1rem",
            cursor: "pointer"
          }}
          onClick={onTabAdd}
          aria-label="New Tab"
          title="New Tab"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default TabManager;
