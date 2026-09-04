import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRequestStore } from "../../stores/request-store";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { requestDisplayName } from "../../lib/request-display-name";
import { useT } from "../../i18n";

const SHRINK_TAB_LIMIT = 12;

type TabMenuState = { tabId: string; x: number; y: number };

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 3a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.1 1.6l-.3-.2-1.2 6.2a1 1 0 0 1-1.2.8l-3.4-.7-3.2 3.2a1 1 0 0 1-1.4 0l-1.1-1.1 4.6-4.6-.7-3.4a1 1 0 0 1 .8-1.2l6.2-1.2-.2-.3A1 1 0 0 1 16 3zM5.2 18.8 3 21l2.2-2.2z" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      {dir === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

function scrollChildIntoView(container: HTMLElement, child: HTMLElement) {
  const extra = 10;
  const cRect = container.getBoundingClientRect();
  const tRect = child.getBoundingClientRect();
  if (tRect.left < cRect.left) {
    container.scrollLeft += tRect.left - cRect.left - extra;
  } else if (tRect.right > cRect.right) {
    container.scrollLeft += tRect.right - cRect.right + extra;
  }
}

function clampMenuPos(x: number, y: number, width: number, height: number) {
  const pad = 8;
  return {
    left: Math.min(Math.max(pad, x), window.innerWidth - width - pad),
    top: Math.min(Math.max(pad, y), window.innerHeight - height - pad),
  };
}

function RequestTabMenu({
  tabId,
  x,
  y,
  pinned,
  canCloseOthers,
  onCloseMenu,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
}: {
  tabId: string;
  x: number;
  y: number;
  pinned: boolean;
  canCloseOthers: boolean;
  onCloseMenu: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
}) {
  const t = useT();
  const menuRef = useRef<HTMLDivElement>(null);
  const togglePinTab = useRequestStore((state) => state.togglePinTab);
  useFocusTrap(menuRef, true);

  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    setPos(clampMenuPos(x, y, el.offsetWidth, el.offsetHeight));
  }, [x, y]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onCloseMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMenu();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCloseMenu]);

  return createPortal(
    <div
      ref={menuRef}
      className="tree-menu request-tab-menu"
      role="menu"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          togglePinTab(tabId);
          onCloseMenu();
        }}
      >
        {pinned ? t("tabs.unpin") : t("tabs.pin")}
      </button>
      <div className="menu-sep" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCloseTab(tabId);
          onCloseMenu();
        }}
      >
        {t("tabs.closeThis")}
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canCloseOthers}
        onClick={() => {
          onCloseOtherTabs(tabId);
          onCloseMenu();
        }}
      >
        {t("tabs.closeOthers")}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCloseAllTabs();
          onCloseMenu();
        }}
      >
        {t("tabs.closeAll")}
      </button>
    </div>,
    document.body,
  );
}

export function RequestTabsBar({
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
}: {
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
}) {
  const t = useT();
  const tabs = useRequestStore((state) => state.tabs);
  const activeTabId = useRequestStore((state) => state.activeTabId);
  const setActiveTab = useRequestStore((state) => state.setActiveTab);
  const openNewTab = useRequestStore((state) => state.openNewTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabCountRef = useRef(tabs.length);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [menu, setMenu] = useState<TabMenuState | null>(null);
  const scrollable = tabs.length > SHRINK_TAB_LIMIT;
  const menuTab = menu ? tabs.find((tab) => tab.id === menu.tabId) : null;

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tabsEls = el.querySelectorAll<HTMLElement>("[data-tab-id]");
    if (!tabsEls.length) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const frame = el.getBoundingClientRect();
    const first = tabsEls[0].getBoundingClientRect();
    const last = tabsEls[tabsEls.length - 1].getBoundingClientRect();
    const overflow = el.scrollWidth > el.clientWidth + 2;
    const nextLeft = overflow && first.left < frame.left - 2;
    const nextRight = overflow && last.right > frame.right + 2;
    setCanScrollLeft((prev) => (prev === nextLeft ? prev : nextLeft));
    setCanScrollRight((prev) => (prev === nextRight ? prev : nextRight));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(updateOverflow);
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateOverflow);
    });
    observer.observe(el);
    el.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("scroll", updateOverflow);
    };
  }, [tabs.length, updateOverflow]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prevCount = tabCountRef.current;
    tabCountRef.current = tabs.length;
    const frame = requestAnimationFrame(() => {
      if (tabs.length > prevCount) {
        const last = el.querySelector<HTMLElement>("[data-tab-id]:last-child");
        if (last) scrollChildIntoView(el, last);
        return;
      }
      const active = el.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
      if (active) scrollChildIntoView(el, active);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTabId, tabs.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollable]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(80, Math.round(el.clientWidth / 3));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div
      className={scrollable ? "request-tabs-bar is-scrollable" : "request-tabs-bar"}
      data-tab-count={tabs.length}
    >
      <div className="request-tabs-viewport">
        {scrollable && (
          <button
            type="button"
            className={canScrollLeft ? "request-tabs-more is-start" : "request-tabs-more is-start is-idle"}
            title={t("tabs.scrollLeft")}
            aria-label={t("tabs.scrollLeft")}
            tabIndex={canScrollLeft ? 0 : -1}
            disabled={!canScrollLeft}
            onClick={() => scrollByPage(-1)}
          >
            <ChevronIcon dir="left" />
          </button>
        )}
        <div className="request-tabs-scroll" ref={scrollRef}>
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            const title = requestDisplayName(tab.request.name, tab.request.url);
            const className = [
              "request-tab-item",
              active ? "active" : "",
              tab.pinned ? "is-pinned" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={className}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setActiveTab(tab.id);
                  setMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    onCloseTab(tab.id);
                  }
                }}
              >
                {tab.pinned && (
                  <span className="request-tab-pin" title={t("tabs.pinned")} aria-hidden>
                    <PinIcon />
                  </span>
                )}
                <span className={`method-tag method-${tab.request.method.toLowerCase()}`}>
                  {tab.request.method}
                </span>
                <span className="request-tab-title" title={tab.request.url || title}>
                  {title}
                </span>
                {tab.isSending && <span className="request-tab-dot" />}
                <button
                  type="button"
                  className="request-tab-close"
                  title={t("tabs.close")}
                  aria-label={t("tabs.close")}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        {scrollable && (
          <button
            type="button"
            className={canScrollRight ? "request-tabs-more is-end" : "request-tabs-more is-end is-idle"}
            title={t("tabs.scrollRight")}
            aria-label={t("tabs.scrollRight")}
            tabIndex={canScrollRight ? 0 : -1}
            disabled={!canScrollRight}
            onClick={() => scrollByPage(1)}
          >
            <ChevronIcon dir="right" />
          </button>
        )}
      </div>
      <button
        type="button"
        className="request-tab-add"
        title={t("tabs.new")}
        aria-label={t("tabs.new")}
        onClick={openNewTab}
      >
        <PlusIcon />
      </button>
      {menu && menuTab && (
        <RequestTabMenu
          tabId={menu.tabId}
          x={menu.x}
          y={menu.y}
          pinned={menuTab.pinned}
          canCloseOthers={tabs.length > 1}
          onCloseMenu={() => setMenu(null)}
          onCloseTab={onCloseTab}
          onCloseOtherTabs={onCloseOtherTabs}
          onCloseAllTabs={onCloseAllTabs}
        />
      )}
    </div>
  );
}
