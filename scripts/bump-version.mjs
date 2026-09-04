import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];

if (!arg) {
  console.error("Usage: node scripts/bump-version.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

execFileSync("npm", ["version", arg, "--no-git-tag-version"], {
  cwd: root,
  stdio: "inherit",
});

const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

const appVersionPath = resolve(root, "src/shared/app-version.ts");
writeFileSync(
  appVersionPath,
  readFileSync(appVersionPath, "utf8").replace(
    /export const APP_VERSION = "[^"]+"/,
    `export const APP_VERSION = "${version}"`,
  ),
);

const manifestPath = resolve(root, "src/extension/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Version is now ${version}`);
console.log("Next: npm run dist   then commit   then npm run publish-release");
