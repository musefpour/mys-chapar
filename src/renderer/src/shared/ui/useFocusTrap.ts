import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isFocusable(el: HTMLElement): boolean {
  if (el.closest("[inert]")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (getComputedStyle(el).visibility === "hidden") return false;
  return el.getClientRects().length > 0;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable);
}

function inertAncestorSiblings(node: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  let current: HTMLElement | null = node;
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === current || !(sibling instanceof HTMLElement)) continue;
      if (sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
    current = parent;
  }
  return () => {
    for (const el of changed) el.removeAttribute("inert");
  };
}

interface FocusTrapOptions {
  /** When true, layers under the overlay cannot receive focus or pointer input. */
  inertBackground?: boolean;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {},
) {
  const { inertBackground = false } = options;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let restoreInert: (() => void) | undefined;
    let previous: HTMLElement | null = null;
    let attached: HTMLElement | null = null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !attached) return;
      const items = getFocusable(attached);
      if (items.length === 0) {
        event.preventDefault();
        attached.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey) {
        if (current === first || !attached.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || !attached.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    };

    const attach = () => {
      if (cancelled) return;
      const node = containerRef.current;
      if (!node) {
        requestAnimationFrame(attach);
        return;
      }
      attached = node;
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (node.tabIndex < 0 && !node.hasAttribute("tabindex")) {
        node.tabIndex = -1;
      }
      if (inertBackground) {
        restoreInert = inertAncestorSiblings(node);
      }
      if (!node.contains(document.activeElement)) {
        const items = getFocusable(node);
        (items[0] ?? node).focus();
      }
      document.addEventListener("keydown", onKeyDown, true);
    };

    attach();

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown, true);
      restoreInert?.();
      const activeEl = document.activeElement;
      const stillInside = Boolean(attached && activeEl && attached.contains(activeEl));
      if (stillInside && previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [active, containerRef, inertBackground]);
}
