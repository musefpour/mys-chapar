export const LOCALES = [
  { id: "en", nativeName: "English", dir: "ltr" },
  { id: "nl", nativeName: "Nederlands", dir: "ltr" },
  { id: "de", nativeName: "Deutsch", dir: "ltr" },
  { id: "de-AT", nativeName: "Österreichisches Deutsch", dir: "ltr" },
  { id: "fr", nativeName: "Français", dir: "ltr" },
  { id: "zh", nativeName: "中文", dir: "ltr" },
  { id: "hi", nativeName: "हिन्दी", dir: "ltr" },
  { id: "es", nativeName: "Español", dir: "ltr" },
  { id: "pt", nativeName: "Português", dir: "ltr" },
  { id: "pt-BR", nativeName: "Português (Brasil)", dir: "ltr" },
  { id: "el", nativeName: "Ελληνικά", dir: "ltr" },
  { id: "tr", nativeName: "Türkçe", dir: "ltr" },
  { id: "ar", nativeName: "العربية", dir: "rtl" },
  { id: "fa", nativeName: "فارسی", dir: "rtl" },
  { id: "ru", nativeName: "Русский", dir: "ltr" },
  { id: "da", nativeName: "Dansk", dir: "ltr" },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

export const DEFAULT_LOCALE: LocaleId = "en";
export const LOCALE_STORAGE_KEY = "mychapar.locale";

export function isLocaleId(value: string): value is LocaleId {
  return LOCALES.some((item) => item.id === value);
}

export function localeMeta(id: LocaleId) {
  return LOCALES.find((item) => item.id === id) ?? LOCALES[0];
}
