#!/usr/bin/env python3
"""Generate src/renderer/src/i18n/catalog.ts from locale dictionaries."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/renderer/src/i18n/catalog.ts"

# Shared names of languages (shown inside each UI language)
LANG_NAMES = {
    "en": {
        "lang.en": "English", "lang.nl": "Dutch", "lang.de": "German",
        "lang.de-AT": "Austrian German", "lang.fr": "French", "lang.zh": "Chinese",
        "lang.hi": "Hindi", "lang.es": "Spanish", "lang.pt": "Portuguese",
        "lang.pt-BR": "Brazilian Portuguese", "lang.el": "Greek", "lang.tr": "Turkish",
        "lang.ar": "Arabic", "lang.fa": "Persian", "lang.ru": "Russian", "lang.da": "Danish",
    }
}


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def emit(locale: str, messages: dict[str, str]) -> str:
    lines = [f'  "{locale}": {{']
    for key, value in messages.items():
        lines.append(f"    {ts_string(key)}: {ts_string(value)},")
    lines.append("  },")
    return "\n".join(lines)


# Locale dictionaries are imported from sibling JSON to keep this file readable.
DATA = Path(__file__).with_name("i18n-locales.json")
payload = json.loads(DATA.read_text(encoding="utf-8"))

parts = [
    'import type { Messages } from "./en";',
    'import type { LocaleId } from "./locales";',
    "",
    "export const catalog: Record<Exclude<LocaleId, \"en\">, Partial<Messages>> = {",
]
for locale, messages in payload.items():
    parts.append(emit(locale, messages))
parts.append("};")
parts.append("")

OUT.write_text("\n".join(parts), encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
