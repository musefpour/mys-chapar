# My Chapar

کلاینت HTTP دسکتاپ (React + TypeScript)، افزونه کروم، و اکستنشن VS Code.

![فضای کار MYs Chapar](docs/images/workspace.png)

راهنمای تصویری: [docs/GUIDE.md](./docs/GUIDE.md)

## اجرا در حالت توسعه

```bash
cd apps/mychapar
npm install
npm run dev
```

## ساخت خروجی مک، ویندوز، لینوکس، کروم و VS Code

```bash
cd apps/mychapar
npm run خروجی
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

فایل‌های آماده در `release/` قرار می‌گیرند (از جمله `release/chrome-extension`، `My Chapar-*-chrome.zip`، `release/vscode-extension` و `MYs Chapar-*-vscode.vsix`). این پوشه را در git commit نکنید.

## انتشار نسخه روی GitHub

```bash
npm run bump-version -- patch    # یا minor / major / 1.2.3
npm run dist
git add -u && git commit -m "Release v$(node -p 'require("./package.json").version')"
npm run publish-release
```

اسکریپت تگ `vX.Y.Z` می‌سازد، پوش می‌کند، و فایل‌های `release/` را به [Releases](https://github.com/musefpour/mys-chapar/releases) آپلود می‌کند.

ورود و ثبت‌نام (Google / ایمیل): [docs/AUTH.md](./docs/AUTH.md)

جزئیات بیشتر ساخت: [docs/BUILD-RELEASE.md](./docs/BUILD-RELEASE.md)
