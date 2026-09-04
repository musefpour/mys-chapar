import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "release/vscode-extension");
const webviewDir = resolve(outDir, "webview");
const sharedAlias = {
  "@renderer": resolve(root, "src/renderer"),
  "@shared": resolve(root, "src/shared"),
};

function ensureIcons() {
  const iconsDir = resolve(outDir, "icons");
  mkdirSync(iconsDir, { recursive: true });
  const source = resolve(root, "build/icon.png");
  if (!existsSync(source)) {
    throw new Error("Missing build/icon.png — needed for VS Code extension icons");
  }
  for (const size of [16, 48, 128]) {
    const dest = resolve(iconsDir, `icon${size}.png`);
    execFileSync("sips", ["-z", String(size), String(size), source, "--out", dest], {
      stdio: "ignore",
    });
  }
  cpSync(source, resolve(iconsDir, "icon.png"));
  cpSync(resolve(root, "src/vscode/activitybar.svg"), resolve(iconsDir, "activitybar.svg"));
}

async function buildUi() {
  await build({
    configFile: resolve(root, "vite.vscode.config.ts"),
  });
}

async function buildHost() {
  await build({
    configFile: false,
    root,
    resolve: { alias: sharedAlias },
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: true,
      minify: false,
      ssr: true,
      lib: {
        entry: resolve(root, "src/vscode/extension.ts"),
        formats: ["cjs"],
        fileName: () => "extension.js",
      },
      rollupOptions: {
        external: (id) => id === "vscode" || id.startsWith("node:"),
        output: {
          entryFileNames: "extension.js",
          format: "cjs",
          exports: "named",
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [],
  });
}

function writePackage() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const manifest = {
    name: "mychapar",
    displayName: "MYs Chapar",
    description: "MYs Chapar — API client",
    version: pkg.version,
    publisher: "mys-group",
    author: pkg.author,
    license: "MIT",
    engines: { vscode: "^1.85.0" },
    categories: ["Testing", "Other"],
    keywords: ["http", "api", "rest", "graphql", "postman", "client"],
    activationEvents: [],
    main: "./extension.js",
    icon: "icons/icon128.png",
    contributes: {
      commands: [
        {
          command: "mychapar.open",
          title: "Open",
          category: "MYs Chapar",
          icon: "$(globe)",
        },
        {
          command: "mychapar.newWindow",
          title: "New Window",
          category: "MYs Chapar",
        },
      ],
      keybindings: [
        {
          command: "mychapar.open",
          key: "ctrl+alt+m",
          mac: "cmd+alt+m",
        },
      ],
      viewsContainers: {
        activitybar: [
          {
            id: "mychapar",
            title: "MYs Chapar",
            icon: "icons/activitybar.svg",
          },
        ],
      },
      views: {
        mychapar: [
          {
            id: "mychapar.explorer",
            name: "MYs Chapar",
          },
        ],
      },
      viewsWelcome: [
        {
          view: "mychapar.explorer",
          contents:
            "Build and send HTTP requests without leaving the editor.\n[Open MYs Chapar](command:mychapar.open)",
        },
      ],
    },
  };
  writeFileSync(resolve(outDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  cpSync(resolve(root, "src/vscode/README.md"), resolve(outDir, "README.md"));
  writeFileSync(
    resolve(outDir, "LICENSE"),
    "MIT License\n\nCopyright (c) Mahdi Usefpour\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n",
  );
  writeFileSync(
    resolve(outDir, ".vscodeignore"),
    "*.map\n",
  );
}

function packageVsix() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const vsixPath = resolve(root, "release", `MYs Chapar-${pkg.version}-vscode.vsix`);
  try {
    rmSync(vsixPath, { force: true });
  } catch {
    /* ignore */
  }

  const vsceBin = resolve(root, "node_modules", ".bin", "vsce");
  const args = [
    "package",
    "--no-dependencies",
    "--allow-missing-repository",
    "--out",
    vsixPath,
  ];
  if (existsSync(vsceBin)) {
    execFileSync(vsceBin, args, {
      cwd: outDir,
      stdio: "inherit",
    });
  } else {
    execFileSync("npx", ["--yes", "@vscode/vsce", ...args], {
      cwd: outDir,
      stdio: "inherit",
    });
  }
  console.log(`VS Code extension folder: ${outDir}`);
  console.log(`VS Code extension vsix:   ${vsixPath}`);
  console.log(`Webview assets:           ${webviewDir}`);
}

mkdirSync(outDir, { recursive: true });
await buildUi();
await buildHost();
ensureIcons();
writePackage();
packageVsix();
