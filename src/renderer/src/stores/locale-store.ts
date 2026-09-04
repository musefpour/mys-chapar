import { create } from "zustand";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocaleId, localeMeta, type LocaleId } from "../i18n/locales";

function detectLocale(): LocaleId {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && isLocaleId(saved)) return saved;
  } catch {
    // ignore
  }
  if (typeof navigator !== "undefined") {
    const candidates = [navigator.language, ...(navigator.languages ?? [])];
    for (const raw of candidates) {
      const tag = raw.toLowerCase();
      if (tag.startsWith("de-at") && isLocaleId("de-AT")) return "de-AT";
      if (tag.startsWith("pt-br") && isLocaleId("pt-BR")) return "pt-BR";
      const short = raw.split("-")[0];
      if (short && isLocaleId(short)) return short;
    }
  }
  return DEFAULT_LOCALE;
}

function applyDocumentLocale(id: LocaleId): void {
  const meta = localeMeta(id);
  document.documentElement.lang = id;
  document.documentElement.dir = meta.dir;
  document.documentElement.dataset.locale = id;
}

interface LocaleState {
  locale: LocaleId;
  setLocale: (id: LocaleId, options?: { skipCloud?: boolean }) => void;
}

export const useLocaleStore = create<LocaleState>((set) => {
  const locale = detectLocale();
  if (typeof document !== "undefined") applyDocumentLocale(locale);

  return {
    locale,
    setLocale: (id, options) => {
      applyDocumentLocale(id);
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, id);
      } catch {
        // ignore
      }
      set({ locale: id });
      // Keep main-process prefs in sync so the OAuth browser page can localize
      // even if the IPC payload omits locale.
      void window.mychapar?.setPrefs?.({ locale: id });
      if (!options?.skipCloud) {
        void import("../lib/cloud-sync").then((mod) => mod.queuePreferencesPush());
      }
    },
  };
});
