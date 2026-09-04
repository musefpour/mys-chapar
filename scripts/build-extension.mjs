import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "release/chrome-extension");
const sharedAlias = {
  "@renderer": resolve(root, "src/renderer"),
  "@shared": resolve(root, "src/shared"),
};

function ensureIcons() {
  const iconsDir = resolve(root, "src/extension/icons");
  mkdirSync(iconsDir, { recursive: true });
  const source = resolve(root, "build/icon.png");
  if (!existsSync(source)) {
    throw new Error("Missing build/icon.png — needed for extension icons");
  }
  for (const size of [16, 48, 128]) {
    const dest = resolve(iconsDir, `icon${size}.png`);
    execFileSync("sips", ["-z", String(size), String(size), source, "--out", dest], {
      stdio: "ignore",
    });
  }
}

async function buildUi() {
  await build({
    configFile: resolve(root, "vite.extension.config.ts"),
  });
}

async function buildBackground() {
  await build({
    configFile: false,
    root,
    resolve: { alias: sharedAlias },
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: resolve(root, "src/extension/background.ts"),
        formats: ["es"],
        fileName: () => "background.js",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    plugins: [],
  });
}

function copyStatic() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const manifest = JSON.parse(
    readFileSync(resolve(root, "src/extension/manifest.json"), "utf8"),
  );
  manifest.version = pkg.version;
  writeFileSync(resolve(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const iconsOut = resolve(outDir, "icons");
  mkdirSync(iconsOut, { recursive: true });
  cpSync(resolve(root, "src/extension/icons"), iconsOut, { recursive: true });
}

function zipExtension() {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const zipPath = resolve(root, "release", `MYs Chapar-${pkg.version}-chrome.zip`);
  try {
    execFileSync("rm", ["-f", zipPath], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  execFileSync("zip", ["-r", "-q", zipPath, "."], {
    cwd: outDir,
    stdio: "inherit",
  });
  console.log(`Chrome extension folder: ${outDir}`);
  console.log(`Chrome extension zip:    ${zipPath}`);
}

ensureIcons();
await buildUi();
await buildBackground();
copyStatic();
zipExtension();
