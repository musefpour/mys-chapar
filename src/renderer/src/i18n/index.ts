import { useCallback } from "react";
import { en, type MessageKey } from "./en";
import { catalog } from "./catalog";
import { useLocaleStore } from "../stores/locale-store";
import type { LocaleId } from "./locales";

export type { MessageKey, Messages } from "./en";
export type { LocaleId } from "./locales";
export { LOCALES, localeMeta } from "./locales";
export { en };

export function translate(
  locale: LocaleId,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const table = locale === "en" ? en : catalog[locale];
  let text = (table[key] as string | undefined) ?? en[key] ?? key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) {
        return String(vars[name]);
      }
      return match;
    });
  }
  return text;
}

export function useT(): (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string {
  const locale = useLocaleStore((state) => state.locale);
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );
}
