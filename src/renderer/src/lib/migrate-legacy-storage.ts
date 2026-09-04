/** One-time migrate localStorage keys from older product names. */
const NEXT_PREFIX = "mychapar.";
const LEGACY_PREFIXES = ["ghadirman.", "chapar."] as const;

const KEY_SUFFIXES = [
  "collections",
  "workspaces",
  "active-workspace",
  "history",
  "open-tabs",
  "theme",
  "right-panel",
  "code-panel-open",
  "request-response-split",
  "code-snippet-lang",
] as const;

export function migrateLegacyStorage(): void {
  try {
    for (const suffix of KEY_SUFFIXES) {
      const nextKey = `${NEXT_PREFIX}${suffix}`;
      if (localStorage.getItem(nextKey) != null) continue;
      for (const legacyPrefix of LEGACY_PREFIXES) {
        const legacyKey = `${legacyPrefix}${suffix}`;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy == null) continue;
        localStorage.setItem(nextKey, legacy);
        localStorage.removeItem(legacyKey);
        break;
      }
    }
  } catch {
    // ignore private mode / quota
  }
}
