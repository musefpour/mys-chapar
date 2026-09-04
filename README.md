# MYs Chapar

HTTP API client for desktop (React + TypeScript), Chrome, and VS Code.  
کلاینت HTTP دسکتاپ (React + TypeScript)، افزونه کروم، و اکستنشن VS Code.

[English](#english) · [فارسی](#فارسی)

![MYs Chapar workspace](docs/images/workspace.png)

Screenshot walkthrough: [docs/GUIDE.md](./docs/GUIDE.md)  
راهنمای تصویری: [docs/GUIDE.md](./docs/GUIDE.md)

---

## English

### Develop

```bash
npm install
npm run dev
```

### Build macOS, Windows, Linux, Chrome, and VS Code

```bash
npm run dist
```

Same command:

```bash
npm run release
```

Chrome extension only:

```bash
npm run dist:chrome
```

VS Code extension only:

```bash
npm run dist:vscode
```

Built files land in `release/` (including `release/chrome-extension`, `MYs Chapar-*-chrome.zip`, `release/vscode-extension`, and `MYs Chapar-*-vscode.vsix`). Do not commit that folder.

### Publish a GitHub Release

```bash
npm run bump-version -- patch    # or minor / major / 1.2.3
npm run dist
git add -u && git commit -m "Release v$(node -p 'require("./package.json").version')"
npm run publish-release
```

The script creates tag `vX.Y.Z`, pushes it, and uploads `release/` assets to [Releases](https://github.com/musefpour/mys-chapar/releases).

---

## فارسی

### اجرا در حالت توسعه

```bash
npm install
npm run dev
```

### ساخت خروجی مک، ویندوز، لینوکس، کروم و VS Code

```bash
npm run dist
```

معادل:

```bash
npm run release
```

فقط اکستنشن کروم:

```bash
npm run dist:chrome
```

فقط اکستنشن VS Code:

```bash
npm run dist:vscode
```

فایل‌های آماده در `release/` قرار می‌گیرند (از جمله `release/chrome-extension`، `MYs Chapar-*-chrome.zip`، `release/vscode-extension` و `MYs Chapar-*-vscode.vsix`). این پوشه را در git commit نکنید.

### انتشار نسخه روی GitHub

```bash
npm run bump-version -- patch    # یا minor / major / 1.2.3
npm run dist
git add -u && git commit -m "Release v$(node -p 'require("./package.json").version')"
npm run publish-release
```

اسکریپت تگ `vX.Y.Z` می‌سازد، پوش می‌کند، و فایل‌های `release/` را به [Releases](https://github.com/musefpour/mys-chapar/releases) آپلود می‌کند.
