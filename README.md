# MYs Chapar

[English](#english) · [فارسی](#فارسی)

HTTP API client for desktop, Chrome, and VS Code.  
کلاینت HTTP برای دسکتاپ، کروم و VS Code.

[Website](https://myschapar.ir) · [Releases](https://github.com/musefpour/mys-chapar/releases/latest) · [Guide](docs/GUIDE.md)

[![Latest release](https://img.shields.io/github/v/release/musefpour/mys-chapar)](https://github.com/musefpour/mys-chapar/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Chrome%20%7C%20VS%20Code-555)](https://github.com/musefpour/mys-chapar/releases/latest)

![MYs Chapar workspace](docs/images/workspace.png)

---

<a id="english"></a>

## English

Send requests, organize collections, import OpenAPI or cURL, and generate client snippets. Built with React, TypeScript, and Electron.

### Features

- Request builder with params, headers, and body
- Collections, folders, history, and variables
- OpenAPI / Swagger and cURL import
- Code snippets (cURL, JavaScript, Python, Go, and more)
- Light and dark themes, multiple UI languages
- Optional sign-in to sync work (Google or email)
- Same app on macOS, Windows, Linux, Chrome, and VS Code

Screenshot walkthrough: [docs/GUIDE.md](docs/GUIDE.md)

### Install

Download the latest build from [Releases](https://github.com/musefpour/mys-chapar/releases/latest).

| Platform | Artifact |
| --- | --- |
| macOS (Apple Silicon) | `MYs Chapar-*-arm64.dmg` |
| Windows | `MYs Chapar-*-win.zip` |
| Linux | `mychapar-linux-*.zip` |
| Chrome | `MYs Chapar-*-chrome.zip` |
| VS Code | `MYs Chapar-*-vscode.vsix` |

Chrome: unzip the archive and load it as an unpacked extension.  
VS Code: **Extensions → ⋯ → Install from VSIX…**

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run dist          # macOS, Windows, Linux, Chrome, and VS Code
npm run dist:chrome   # Chrome extension only
npm run dist:vscode   # VS Code extension only
```

`npm run release` and `npm run خروجی` are aliases for `npm run dist`.

Output goes to `release/`. Do not commit that folder; binaries are published as GitHub Release assets.

### Publish a release

```bash
npm run bump-version -- patch    # or minor / major / 1.2.3
npm run dist
git add -u && git commit -m "Release v$(node -p 'require("./package.json").version')"
npm run publish-release
```

Creates tag `vX.Y.Z`, pushes it, and uploads artifacts to [Releases](https://github.com/musefpour/mys-chapar/releases).

### License

[MIT](https://opensource.org/licenses/MIT) © [Mahdi Usefpour](https://github.com/musefpour)

---

<div dir="rtl">

<a id="فارسی"></a>

## فارسی

درخواست بفرستید، مجموعه بسازید، OpenAPI یا cURL وارد کنید، و snippet کلاینت بگیرید. با React، TypeScript و Electron ساخته شده است.

### امکانات

- سازندهٔ درخواست با Params، Headers و Body
- مجموعه، پوشه، تاریخچه و متغیر
- ایمپورت OpenAPI / Swagger و cURL
- تولید کد (cURL، JavaScript، Python، Go و زبان‌های دیگر)
- تم روشن و تاریک، چند زبان رابط
- ورود اختیاری برای همگام‌سازی (Google یا ایمیل)
- همان برنامه روی مک، ویندوز، لینوکس، کروم و VS Code

راهنمای تصویری: [docs/GUIDE.md](docs/GUIDE.md)

### نصب

آخرین نسخه را از [Releases](https://github.com/musefpour/mys-chapar/releases/latest) بگیرید.

| پلتفرم | فایل |
| --- | --- |
| مک (Apple Silicon) | `MYs Chapar-*-arm64.dmg` |
| ویندوز | `MYs Chapar-*-win.zip` |
| لینوکس | `mychapar-linux-*.zip` |
| کروم | `MYs Chapar-*-chrome.zip` |
| VS Code | `MYs Chapar-*-vscode.vsix` |

کروم: زیپ را باز کنید و به‌صورت unpacked بارگذاری کنید.  
VS Code: **Extensions → ⋯ → Install from VSIX…**

### توسعه

```bash
npm install
npm run dev
```

### ساخت خروجی

```bash
npm run dist          # مک، ویندوز، لینوکس، کروم و VS Code
npm run dist:chrome   # فقط اکستنشن کروم
npm run dist:vscode   # فقط اکستنشن VS Code
```

`npm run release` و `npm run خروجی` معادل `npm run dist` هستند.

فایل‌ها در `release/` ساخته می‌شوند. این پوشه را commit نکنید؛ باینری‌ها روی GitHub Release آپلود می‌شوند.

### انتشار نسخه

```bash
npm run bump-version -- patch    # یا minor / major / 1.2.3
npm run dist
git add -u && git commit -m "Release v$(node -p 'require("./package.json").version')"
npm run publish-release
```

تگ `vX.Y.Z` ساخته می‌شود، پوش می‌شود، و فایل‌ها به [Releases](https://github.com/musefpour/mys-chapar/releases) می‌روند.

### مجوز

[MIT](https://opensource.org/licenses/MIT) © [Mahdi Usefpour](https://github.com/musefpour)

</div>
