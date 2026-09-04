import type { AppMenuCommand } from "@shared/app-menu";

type CloseTabHandler = (force: boolean) => void;
type FocusUrlHandler = () => void;

let closeTabHandler: CloseTabHandler | null = null;
let focusUrlHandler: FocusUrlHandler | null = null;

export function registerCloseTabHandler(handler: CloseTabHandler): () => void {
  closeTabHandler = handler;
  return () => {
    if (closeTabHandler === handler) closeTabHandler = null;
  };
}

export function requestCloseTab(force: boolean): void {
  closeTabHandler?.(force);
}

export function registerFocusUrlHandler(handler: FocusUrlHandler): () => void {
  focusUrlHandler = handler;
  return () => {
    if (focusUrlHandler === handler) focusUrlHandler = null;
  };
}

export function requestFocusUrl(): void {
  focusUrlHandler?.();
}

export function dispatchMenu(command: AppMenuCommand): void {
  if (window.mychapar?.invokeMenu) {
    void window.mychapar.invokeMenu(command);
    return;
  }
  window.dispatchEvent(new CustomEvent<AppMenuCommand>("mychapar:menu", { detail: command }));
}
