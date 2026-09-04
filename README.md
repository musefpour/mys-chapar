# My Chapar

کلاینت HTTP دسکتاپ (React + TypeScript)، افزونه کروم، و اکستنشن VS Code.

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

فایل‌های آماده در `release/` قرار می‌گیرند (از جمله `release/chrome-extension`، `My Chapar-*-chrome.zip`، `release/vscode-extension` و `MYs Chapar-*-vscode.vsix`).

ورود و ثبت‌نام (Google / ایمیل): [docs/AUTH.md](./docs/AUTH.md)

جزئیات بیشتر ساخت: [docs/BUILD-RELEASE.md](./docs/BUILD-RELEASE.md)
