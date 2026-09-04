const EDITABLE_SELECTOR =
  'input, textarea, [contenteditable="true"], .kv-cell-input, .modal-input, .curl-input, .url-input, .raw-code-input, .raw-body, .code-panel-pre, .code-block, .response-body-pane, .allow-text-select';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(EDITABLE_SELECTOR);
  if (!el) return false;
  if (el instanceof HTMLInputElement) {
    const type = el.type;
    if (
      type === "button" ||
      type === "submit" ||
      type === "reset" ||
      type === "checkbox" ||
      type === "radio" ||
      type === "file"
    ) {
      return false;
    }
  }
  return true;
}

/** Block drag-select on chrome UI; keep copy working in editors / response. */
export function installUiSelectionGuard(): void {
  document.addEventListener(
    "selectstart",
    (event) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    },
    true,
  );
}
