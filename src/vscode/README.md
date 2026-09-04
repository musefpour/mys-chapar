# MYs Chapar for VS Code

HTTP API client — same app as the desktop and Chrome builds, inside VS Code.

Created by Mahdi Usefpour.

## Open

- Command Palette: `MYs Chapar: Open`
- Activity bar: MYs Chapar → **Open MYs Chapar**
- Status bar: **MYs Chapar**

Shortcut: `Ctrl+Alt+M` (`Cmd+Alt+M` on macOS)

Requests run in the extension host (no browser CORS). Collections stay in this webview’s local storage.

## Install (development)

From the `mychapar-web-electron` repo:

```bash
npm run dist:vscode
```

Then in VS Code: **Extensions → ⋯ → Install from VSIX…** and pick

`release/MYs Chapar-<version>-vscode.vsix`

Or launch an Extension Development Host:

```bash
code --extensionDevelopmentPath=./release/vscode-extension
```
