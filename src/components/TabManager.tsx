import React from "react";
import { TabStatus } from "../state/session/types";

interface TabSummary {
  id: string;
  title: string;
  url: string;
  active: boolean;
  status: TabStatus;
}

interface TabManagerProps {
  tabs: TabSummary[];
  onTabSelect: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
  onTabPinToggle?: (id: string, pinned: boolean) => void;
  onTabReorder?: (pinnedIds: string[], regularIds: string[]) => void;
}

const PinIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M6.5 1h3a.5.5 0 01.5.5l-.2 4.4 2.2 2.2a.5.5 0 01-.35.85H10v2.7l-2 2-2-2V9H4.35a.5.5 0 01-.35-.85L6.2 5.9 6 1.5A.5.5 0 016.5 1z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.2}
      strokeLinejoin="round"
    />
  </svg>
);

const reorderIds = (ids: string[], draggedId: string, targetId: string | null, before: boolean) => {
  const filtered = ids.filter(id => id !== draggedId);
  if (!targetId) {
    filtered.push(draggedId);
    return filtered;
  }
  const targetIndex = filtered.indexOf(targetId);
  if (targetIndex === -1) {
    filtered.push(draggedId);
    return filtered;
  }
  const insertIndex = before ? targetIndex : targetIndex + 1;
  filtered.splice(insertIndex, 0, draggedId);
  return filtered;
};

const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabPinToggle,
  onTabReorder,
}) => {
  const draggedIdRef = React.useRef<string | null>(null);
  const pinnedTabs = React.useMemo(() => tabs.filter(tab => tab.status === "pinned"), [tabs]);
  const regularTabs = React.useMemo(() => tabs.filter(tab => tab.status !== "pinned"), [tabs]);
  const pinnedIds = React.useMemo(() => pinnedTabs.map(tab => tab.id), [pinnedTabs]);
  const regularIds = React.useMemo(() => regularTabs.map(tab => tab.id), [regularTabs]);
  const totalTabs = tabs.length;

  const commitReorder = React.useCallback(
    (nextPinned: string[], nextRegular: string[]) => {
      if (!onTabReorder) return;
      const samePinned =
        nextPinned.length === pinnedIds.length && nextPinned.every((id, idx) => id === pinnedIds[idx]);
      const sameRegular =
        nextRegular.length === regularIds.length && nextRegular.every((id, idx) => id === regularIds[idx]);
      if (samePinned && sameRegular) return;
      onTabReorder(nextPinned, nextRegular);
    },
    [onTabReorder, pinnedIds, regularIds]
  );

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, tabId: string) => {
    draggedIdRef.current = tabId;
    event.dataTransfer.setData("text/tab-id", tabId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
  };

  const readDraggedId = (event: React.DragEvent) => {
    return draggedIdRef.current || event.dataTransfer.getData("text/tab-id");
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDropOnTab = (
    event: React.DragEvent<HTMLButtonElement>,
    section: "pinned" | "regular",
    targetId: string
  ) => {
    event.preventDefault();
    const draggedId = readDraggedId(event);
    if (!draggedId || draggedId === targetId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientX < rect.left + rect.width / 2;

    const currentPinned = pinnedIds.filter(id => id !== draggedId);
    const currentRegular = regularIds.filter(id => id !== draggedId);

    if (section === "pinned") {
      const nextPinned = reorderIds(currentPinned, draggedId, targetId, before);
      commitReorder(nextPinned, currentRegular);
    } else {
      const nextRegular = reorderIds(currentRegular, draggedId, targetId, before);
      commitReorder(currentPinned, nextRegular);
    }
  };

  const handleDropOnSection = (event: React.DragEvent<HTMLDivElement>, section: "pinned" | "regular") => {
    event.preventDefault();
    const draggedId = readDraggedId(event);
    if (!draggedId) return;
    const currentPinned = pinnedIds.filter(id => id !== draggedId);
    const currentRegular = regularIds.filter(id => id !== draggedId);

    if (section === "pinned") {
      const nextPinned = reorderIds(currentPinned, draggedId, null, true);
      commitReorder(nextPinned, currentRegular);
    } else {
      const nextRegular = reorderIds(currentRegular, draggedId, null, true);
      commitReorder(currentPinned, nextRegular);
    }
  };

  const renderTab = (tab: TabSummary, section: "pinned" | "regular") => {
    const pinned = tab.status === "pinned";
    return (
      <button
        key={tab.id}
        type="button"
        className={`tab-chip ${tab.active ? "is-active" : ""} ${pinned ? "is-pinned" : ""}`}
        onClick={() => onTabSelect(tab.id)}
        draggable
        onDragStart={event => handleDragStart(event, tab.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={event => handleDropOnTab(event, section, tab.id)}
      >
        <span className="tab-chip__indicator" aria-hidden="true" />
        <span className="tab-chip__label">{tab.title || tab.url || "New tab"}</span>
        {onTabPinToggle ? (
          <span
            className={`tab-chip__pin ${pinned ? "is-active" : ""}`}
            role="button"
            aria-label={pinned ? "Unpin tab" : "Pin tab"}
            aria-pressed={pinned}
            tabIndex={0}
            onClick={event => {
              event.stopPropagation();
              onTabPinToggle(tab.id, !pinned);
            }}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onTabPinToggle(tab.id, !pinned);
              }
            }}
          >
            <PinIcon filled={pinned} />
          </span>
        ) : null}
        {onTabClose && totalTabs > 1 && (
          <span
            className="tab-chip__close"
            role="button"
            aria-label="Close tab"
            tabIndex={0}
            onClick={event => {
              event.stopPropagation();
              onTabClose(tab.id);
            }}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onTabClose(tab.id);
              }
            }}
          >
            ×
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="tab-strip">
      <div className="tab-strip__rail">
        <div
          className="tab-strip__section tab-strip__section--pinned"
          onDragOver={handleDragOver}
          onDrop={event => handleDropOnSection(event, "pinned")}
        >
          {pinnedTabs.map(tab => renderTab(tab, "pinned"))}
        </div>
        {pinnedTabs.length > 0 ? <div className="tab-strip__divider" aria-hidden="true" /> : null}
        <div
          className="tab-strip__section tab-strip__section--regular"
          onDragOver={handleDragOver}
          onDrop={event => handleDropOnSection(event, "regular")}
        >
          {regularTabs.map(tab => renderTab(tab, "regular"))}
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
      </div>
    </nav>
  );
};

export default TabManager;
