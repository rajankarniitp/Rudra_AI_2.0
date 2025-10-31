import React from "react";
import { TabGroup, TabStatus } from "../state/session/types";

interface TabSummary {
  id: string;
  title: string;
  url: string;
  active: boolean;
  status: TabStatus;
  groupId?: string | null;
}

interface TabManagerProps {
  tabs: TabSummary[];
  groups: Record<string, TabGroup>;
  onTabSelect: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
  onTabPinToggle?: (id: string, pinned: boolean) => void;
  onTabReorder?: (pinnedIds: string[], regularIds: string[]) => void;
  onTabAssignGroup?: (tabId: string, groupId: string | null) => void;
  onGroupCreate?: () => void;
  onGroupToggleCollapse?: (groupId: string) => void;
  onGroupRename?: (groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
}

type SectionType = "pinned" | "regular";

const DEFAULT_GROUP_COLOR = "#5A8DEE";

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

const ChevronIcon: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
    <path
      d="M4.2 5.2L7 8l2.8-2.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={collapsed ? "rotate(-90 7 7)" : undefined}
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
  groups,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabPinToggle,
  onTabReorder,
  onTabAssignGroup,
  onGroupCreate,
  onGroupToggleCollapse,
  onGroupRename,
  onGroupDelete,
}) => {
  const draggedIdRef = React.useRef<string | null>(null);

  const pinnedTabs = React.useMemo(() => tabs.filter(tab => tab.status === "pinned"), [tabs]);
  const regularTabs = React.useMemo(() => tabs.filter(tab => tab.status !== "pinned"), [tabs]);

  const pinnedIds = React.useMemo(() => pinnedTabs.map(tab => tab.id), [pinnedTabs]);
  const regularIds = React.useMemo(() => regularTabs.map(tab => tab.id), [regularTabs]);

  const tabGroupMap = React.useMemo(() => {
    const map = new Map<string, string | null>();
    tabs.forEach(tab => {
      map.set(tab.id, tab.groupId ?? null);
    });
    return map;
  }, [tabs]);

  const grouping = React.useMemo(() => {
    const grouped = new Map<string, TabSummary[]>();
    const order: string[] = [];
    const ungrouped: TabSummary[] = [];

    regularTabs.forEach(tab => {
      const groupId = tab.groupId && groups[tab.groupId] ? tab.groupId : null;
      if (groupId) {
        if (!grouped.has(groupId)) {
          grouped.set(groupId, []);
          order.push(groupId);
        }
        grouped.get(groupId)!.push(tab);
      } else {
        ungrouped.push(tab);
      }
    });

    Object.keys(groups).forEach(groupId => {
      if (!order.includes(groupId)) {
        order.push(groupId);
      }
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
    });

    return { grouped, order, ungrouped };
  }, [regularTabs, groups]);

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
    section: SectionType,
    targetId: string,
    targetGroupId: string | null
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
      if (onTabAssignGroup && tabGroupMap.get(draggedId) !== null) {
        onTabAssignGroup(draggedId, null);
      }
      return;
    }

    const nextRegular = reorderIds(currentRegular, draggedId, targetId, before);
    commitReorder(currentPinned, nextRegular);

    const desiredGroup = targetGroupId ?? null;
    if (onTabAssignGroup && tabGroupMap.get(draggedId) !== desiredGroup) {
      onTabAssignGroup(draggedId, desiredGroup);
    }
  };

  const handleDropOnSection = (event: React.DragEvent<HTMLDivElement>, section: SectionType) => {
    event.preventDefault();
    const draggedId = readDraggedId(event);
    if (!draggedId) return;

    const currentPinned = pinnedIds.filter(id => id !== draggedId);
    const currentRegular = regularIds.filter(id => id !== draggedId);

    if (section === "pinned") {
      const nextPinned = reorderIds(currentPinned, draggedId, null, true);
      commitReorder(nextPinned, currentRegular);
      if (onTabAssignGroup && tabGroupMap.get(draggedId) !== null) {
        onTabAssignGroup(draggedId, null);
      }
    } else {
      const nextRegular = reorderIds(currentRegular, draggedId, null, true);
      commitReorder(currentPinned, nextRegular);
      if (onTabAssignGroup && tabGroupMap.get(draggedId) !== null) {
        onTabAssignGroup(draggedId, null);
      }
    }
  };

  const handleDropOnGroup = (event: React.DragEvent<HTMLDivElement>, groupId: string) => {
    event.preventDefault();
    const draggedId = readDraggedId(event);
    if (!draggedId) return;

    const currentPinned = pinnedIds.filter(id => id !== draggedId);
    const currentRegular = regularIds.filter(id => id !== draggedId);
    const nextRegular = reorderIds(currentRegular, draggedId, null, true);
    commitReorder(currentPinned, nextRegular);

    if (onTabAssignGroup && tabGroupMap.get(draggedId) !== groupId) {
      onTabAssignGroup(draggedId, groupId);
    }
  };

  const totalTabs = tabs.length;

  const renderTab = (tab: TabSummary, section: SectionType, groupId: string | null) => {
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
        onDrop={event => handleDropOnTab(event, section, tab.id, groupId)}
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

  const renderGroup = (groupId: string, members: TabSummary[]) => {
    const group = groups[groupId];
    const collapsed = group?.collapsed ?? false;
    const color = group?.color || DEFAULT_GROUP_COLOR;
    const title = group?.title || "Group";

    return (
      <div className="tab-group" key={groupId}>
        <div
          className="tab-group__header"
          onDragOver={handleDragOver}
          onDrop={event => handleDropOnGroup(event, groupId)}
        >
          <button
            type="button"
            className="tab-group__toggle"
            onClick={() => onGroupToggleCollapse?.(groupId)}
            aria-label={collapsed ? "Expand group" : "Collapse group"}
            aria-expanded={!collapsed}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
          <span className="tab-group__badge" style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="tab-group__title">{title}</span>
          <div className="tab-group__actions">
            {onGroupRename && (
              <button
                type="button"
                className="tab-group__action"
                onClick={() => onGroupRename(groupId)}
              >
                Rename
              </button>
            )}
            {onGroupDelete && (
              <button
                type="button"
                className="tab-group__action tab-group__action--danger"
                onClick={() => onGroupDelete(groupId)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {!collapsed && (
          <div className="tab-group__tabs">
            {members.map(member => renderTab(member, "regular", groupId))}
            {members.length === 0 ? (
              <div className="tab-group__empty">Drag tabs here</div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderUngrouped = () => {
    if (grouping.ungrouped.length === 0) {
      return null;
    }
    return (
      <div className="tab-group tab-group--ungrouped" key="ungrouped">
        <div
          className="tab-group__header tab-group__header--ungrouped"
          onDragOver={handleDragOver}
          onDrop={event => handleDropOnSection(event, "regular")}
        >
          <span className="tab-group__title">Ungrouped</span>
        </div>
        <div className="tab-group__tabs">
          {grouping.ungrouped.map(member => renderTab(member, "regular", null))}
        </div>
      </div>
    );
  };

  return (
    <nav className="tab-strip">
      <div className="tab-strip__rail">
        {pinnedTabs.length > 0 ? (
          <div
            className="tab-strip__section tab-strip__section--pinned"
            onDragOver={handleDragOver}
            onDrop={event => handleDropOnSection(event, "pinned")}
          >
            {pinnedTabs.map(tab => renderTab(tab, "pinned", null))}
          </div>
        ) : (
          <div
            className="tab-strip__section tab-strip__section--pinned tab-strip__section--empty"
            onDragOver={handleDragOver}
            onDrop={event => handleDropOnSection(event, "pinned")}
            aria-hidden="true"
          />
        )}
        {pinnedTabs.length > 0 ? <div className="tab-strip__divider" role="separator" aria-hidden="true" /> : null}
        <div className="tab-strip__section tab-strip__section--regular">
          <div className="tab-group-collection">
            {grouping.order.map(groupId => renderGroup(groupId, grouping.grouped.get(groupId) || []))}
            {renderUngrouped()}
          </div>
          <div className="tab-strip__actions">
            {onGroupCreate ? (
              <button
                type="button"
                className="tab-chip tab-chip--ghost tab-chip--group"
                onClick={onGroupCreate}
                aria-label="Create a new tab group"
              >
                <span className="tab-chip__indicator" aria-hidden="true" />
                <span className="tab-chip__label">New group</span>
              </button>
            ) : null}
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
      </div>
    </nav>
  );
};

export default TabManager;
