import { useEffect, useMemo, useRef, useState } from "react";
import type { AppMenuCommand } from "@shared/app-menu";
import { useT, type MessageKey } from "../../i18n";
import { useUiStore } from "../../stores/ui-store";
import { dispatchMenu } from "./menu-bridge";

type RootId = "file" | "edit" | "view" | "help";
type FlyoutId = RootId | "import" | "developer" | "region";

type MenuNode =
  | {
      kind: "cmd";
      id: AppMenuCommand;
      label: MessageKey;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
    }
  | { kind: "sep" }
  | { kind: "sub"; id: FlyoutId; label: MessageKey; children: MenuNode[] };

function isMac(): boolean {
  return window.mychapar?.platform === "darwin";
}

function shortcut(parts: string[]): string {
  const mac = isMac();
  return parts
    .map((part) => {
      if (part === "Mod") return mac ? "⌘" : "Ctrl";
      if (part === "Alt") return mac ? "⌥" : "Alt";
      if (part === "Shift") return mac ? "⇧" : "Shift";
      return part;
    })
    .join(mac ? "" : "+");
}

function MenuIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function AppMenu() {
  const t = useT();
  const hardwareAcceleration = useUiStore((state) => state.hardwareAcceleration);
  const region = useUiStore((state) => state.region);
  const [open, setOpen] = useState(false);
  const [flyout, setFlyout] = useState<FlyoutId>("file");
  const rootRef = useRef<HTMLDivElement>(null);

  const tree = useMemo<Record<RootId, MenuNode[]>>(
    () => ({
      file: [
        { kind: "cmd", id: "file.new", label: "menu.new", shortcut: shortcut(["Mod", "N"]) },
        { kind: "cmd", id: "file.newTab", label: "menu.newTab", shortcut: shortcut(["Mod", "T"]) },
        {
          kind: "cmd",
          id: "file.newRunnerTab",
          label: "menu.newRunnerTab",
          shortcut: shortcut(["Mod", "Shift", "R"]),
          disabled: true,
        },
        {
          kind: "cmd",
          id: "file.newWindow",
          label: "menu.newWindow",
          shortcut: shortcut(["Mod", "Shift", "N"]),
        },
        { kind: "sep" },
        {
          kind: "sub",
          id: "import",
          label: "menu.import",
          children: [
            {
              kind: "cmd",
              id: "file.importOpenapi",
              label: "menu.importOpenapi",
              shortcut: shortcut(["Mod", "O"]),
            },
            { kind: "cmd", id: "file.importCurl", label: "menu.importCurl" },
          ],
        },
        { kind: "cmd", id: "file.settings", label: "menu.settings", shortcut: shortcut(["Mod", ","]) },
        { kind: "sep" },
        {
          kind: "cmd",
          id: "file.closeWindow",
          label: "menu.closeWindow",
          shortcut: shortcut(["Mod", "Shift", "W"]),
        },
        { kind: "cmd", id: "file.closeTab", label: "menu.closeTab", shortcut: `${shortcut(["Mod", "W"])} / ${shortcut(["Mod", "F4"])}` },
        {
          kind: "cmd",
          id: "file.forceCloseTab",
          label: "menu.forceCloseTab",
          shortcut: shortcut(["Alt", "Mod", "W"]),
        },
        ...(!isMac()
          ? ([{ kind: "cmd", id: "file.exit", label: "menu.exit" }] as MenuNode[])
          : []),
      ],
      edit: [
        { kind: "cmd", id: "edit.undo", label: "menu.undo", shortcut: shortcut(["Mod", "Z"]) },
        { kind: "cmd", id: "edit.redo", label: "menu.redo", shortcut: shortcut(["Mod", "Shift", "Z"]) },
        { kind: "sep" },
        { kind: "cmd", id: "edit.cut", label: "menu.cut", shortcut: shortcut(["Mod", "X"]) },
        { kind: "cmd", id: "edit.copy", label: "menu.copy", shortcut: shortcut(["Mod", "C"]) },
        { kind: "cmd", id: "edit.paste", label: "menu.paste", shortcut: shortcut(["Mod", "V"]) },
        { kind: "cmd", id: "edit.pasteMatch", label: "menu.pasteMatch" },
        { kind: "cmd", id: "edit.delete", label: "menu.delete" },
        { kind: "cmd", id: "edit.selectAll", label: "menu.selectAll", shortcut: shortcut(["Mod", "A"]) },
      ],
      view: [
        { kind: "cmd", id: "view.fullScreen", label: "menu.fullScreen" },
        { kind: "cmd", id: "view.zoomIn", label: "menu.zoomIn", shortcut: shortcut(["Mod", "="]) },
        { kind: "cmd", id: "view.zoomOut", label: "menu.zoomOut", shortcut: shortcut(["Mod", "-"]) },
        { kind: "cmd", id: "view.resetZoom", label: "menu.resetZoom", shortcut: shortcut(["Mod", "0"]) },
        {
          kind: "cmd",
          id: "view.focusUrl",
          label: "menu.focusUrl",
          shortcut: shortcut(["Mod", "L"]),
        },
        {
          kind: "cmd",
          id: "view.toggleLeftSidebar",
          label: "menu.toggleLeftSidebar",
          shortcut: shortcut(["Mod", "\\"]),
        },
        {
          kind: "cmd",
          id: "view.toggleTwoPane",
          label: "menu.toggleTwoPane",
          shortcut: shortcut(["Alt", "Mod", "V"]),
        },
        {
          kind: "cmd",
          id: "view.toggleWorkbench",
          label: "menu.toggleWorkbench",
          shortcut: shortcut(["Alt", "Mod", "M"]),
        },
        {
          kind: "cmd",
          id: "view.toggleRightSidebar",
          label: "menu.toggleRightSidebar",
          shortcut: shortcut(["Alt", "Mod", "\\"]),
        },
        {
          kind: "cmd",
          id: "view.swapSidebars",
          label: "menu.swapSidebars",
          shortcut: shortcut(["Alt", "Mod", "S"]),
        },
        {
          kind: "cmd",
          id: "view.resetLayout",
          label: "menu.resetLayout",
          shortcut: shortcut(["Alt", "Mod", "R"]),
        },
        { kind: "sep" },
        { kind: "cmd", id: "view.goBack", label: "menu.goBack", shortcut: shortcut(["Alt", "←"]) },
        { kind: "cmd", id: "view.goForward", label: "menu.goForward", shortcut: shortcut(["Alt", "→"]) },
        { kind: "cmd", id: "view.nextTab", label: "menu.nextTab", shortcut: "Ctrl+Tab" },
        { kind: "cmd", id: "view.prevTab", label: "menu.prevTab", shortcut: "Ctrl+Shift+Tab" },
        { kind: "sep" },
        {
          kind: "cmd",
          id: "view.showConsole",
          label: "menu.showConsole",
          shortcut: shortcut(["Alt", "Mod", "C"]),
        },
        {
          kind: "sub",
          id: "developer",
          label: "menu.developer",
          children: [{ kind: "cmd", id: "view.toggleDevTools", label: "menu.toggleDevTools" }],
        },
      ],
      help: [
        { kind: "cmd", id: "help.checkUpdates", label: "menu.checkUpdates" },
        { kind: "cmd", id: "help.clearCacheReload", label: "menu.clearCache" },
        {
          kind: "cmd",
          id: "help.toggleHwAccel",
          label: "menu.hwAccel",
          checked: !hardwareAcceleration,
        },
        {
          kind: "sub",
          id: "region",
          label: "menu.region",
          children: [
            {
              kind: "cmd",
              id: "help.region.us",
              label: "menu.regionUs",
              checked: region === "us",
            },
            {
              kind: "cmd",
              id: "help.region.eu",
              label: "menu.regionEu",
              checked: region === "eu",
            },
            {
              kind: "cmd",
              id: "help.region.asia",
              label: "menu.regionAsia",
              checked: region === "asia",
            },
          ],
        },
        { kind: "sep" },
        { kind: "cmd", id: "help.docs", label: "menu.docs" },
        { kind: "cmd", id: "help.github", label: "menu.github" },
        {
          kind: "cmd",
          id: "help.twitter",
          label: "menu.twitter",
          disabled: true,
        },
        { kind: "cmd", id: "help.support", label: "menu.support" },
        { kind: "sep" },
        { kind: "cmd", id: "help.about", label: "menu.about" },
      ],
    }),
    [hardwareAcceleration, region],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (command: AppMenuCommand) => {
    setOpen(false);
    dispatchMenu(command);
  };

  const nested =
    flyout === "import" || flyout === "developer" || flyout === "region" ? flyout : null;
  const rootFlyout: RootId =
    flyout === "import" ? "file" : flyout === "developer" ? "view" : flyout === "region" ? "help" : flyout;

  const nestedParent = tree[rootFlyout].find(
    (item): item is Extract<MenuNode, { kind: "sub" }> =>
      item.kind === "sub" && nested !== null && item.id === nested,
  );

  const layerRef = useRef<HTMLDivElement>(null);
  const [nestedPos, setNestedPos] = useState<{ top: number; inlineStart: number } | null>(null);

  const placeNested = (id: FlyoutId, trigger: HTMLElement | null) => {
    setFlyout(id);
    const isNested = id === "import" || id === "developer" || id === "region";
    if (!isNested || !trigger || !layerRef.current) {
      setNestedPos(null);
      return;
    }
    const layerRect = layerRef.current.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const rtl = getComputedStyle(layerRef.current).direction === "rtl";
    setNestedPos({
      top: triggerRect.top - layerRect.top,
      inlineStart: rtl
        ? layerRect.right - triggerRect.left + 4
        : triggerRect.right - layerRect.left + 4,
    });
  };

  useEffect(() => {
    if (!nested) setNestedPos(null);
  }, [nested]);

  return (
    <div className="app-menu" ref={rootRef}>
      <button
        type="button"
        className={open ? "header-icon-btn active" : "header-icon-btn"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menu.open")}
        title={t("menu.file")}
        onClick={() => {
          setFlyout("file");
          setNestedPos(null);
          setOpen((value) => !value);
        }}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="app-menu-layer" ref={layerRef}>
          <div className="app-menu-root" role="menu">
            {(["file", "edit", "view", "help"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={rootFlyout === id ? "app-menu-root-item active" : "app-menu-root-item"}
                onMouseEnter={() => {
                  setFlyout(id);
                  setNestedPos(null);
                }}
                onFocus={() => {
                  setFlyout(id);
                  setNestedPos(null);
                }}
              >
                <span>{t(`menu.${id}` as MessageKey)}</span>
                <span className="app-menu-caret" aria-hidden>
                  ›
                </span>
              </button>
            ))}
          </div>
          <div className="app-menu-flyout" role="menu">
            {tree[rootFlyout].map((item, index) => (
              <MenuRow
                key={index}
                item={item}
                nested={nested}
                onOpenSub={placeNested}
                onRun={run}
              />
            ))}
          </div>
          {nestedParent && nestedPos ? (
            <div
              className="app-menu-nested"
              role="menu"
              style={{ top: nestedPos.top, insetInlineStart: nestedPos.inlineStart }}
              onMouseEnter={() => setFlyout(nestedParent.id)}
            >
              {nestedParent.children.map((child, index) => (
                <MenuRow
                  key={index}
                  item={child}
                  nested={null}
                  onOpenSub={placeNested}
                  onRun={run}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  item,
  nested,
  onOpenSub,
  onRun,
}: {
  item: MenuNode;
  nested: FlyoutId | null;
  onOpenSub: (id: FlyoutId, trigger: HTMLElement | null) => void;
  onRun: (command: AppMenuCommand) => void;
}) {
  const t = useT();
  if (item.kind === "sep") return <div className="app-menu-sep" role="separator" />;
  if (item.kind === "sub") {
    const active = nested === item.id;
    return (
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={active}
        className={active ? "app-menu-item has-sub active" : "app-menu-item has-sub"}
        onMouseEnter={(event) => onOpenSub(item.id, event.currentTarget)}
        onFocus={(event) => onOpenSub(item.id, event.currentTarget)}
      >
        <span>{t(item.label)}</span>
        <span className="app-menu-caret" aria-hidden>
          ›
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      className="app-menu-item"
      disabled={item.disabled}
      title={item.disabled ? t("common.comingSoon", { label: t(item.label) }) : undefined}
      onMouseEnter={() => {
        if (nested === "import" || nested === "developer" || nested === "region") {
          const parent = nested === "import" ? "file" : nested === "developer" ? "view" : "help";
          onOpenSub(parent, null);
        }
      }}
      onClick={() => {
        if (item.disabled) return;
        onRun(item.id);
      }}
    >
      <span className="app-menu-item-label">
        {item.checked ? <span className="app-menu-check">✓</span> : null}
        {t(item.label)}
      </span>
      {item.shortcut ? <span className="app-menu-shortcut">{item.shortcut}</span> : null}
    </button>
  );
}
