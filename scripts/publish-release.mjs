import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const releaseDir = resolve(root, "release");

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function githubToken() {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  }
  const filled = execSync("git credential fill", {
    cwd: root,
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
  });
  const password = filled
    .split("\n")
    .find((line) => line.startsWith("password="))
    ?.slice("password=".length);
  if (!password) {
    throw new Error("No GitHub token. Set GITHUB_TOKEN or log in with git credential.");
  }
  return password;
}

function repoSlug() {
  const url = git(["remote", "get-url", "origin"]);
  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match) throw new Error(`origin is not GitHub: ${url}`);
  return match[1];
}

function expectedAssets() {
  return [
    `MYs Chapar-${version}-arm64.dmg`,
    `MYs Chapar-${version}-win.zip`,
    `mychapar-linux-${version}.zip`,
    `MYs Chapar-${version}-chrome.zip`,
    `MYs Chapar-${version}-vscode.vsix`,
  ].map((name) => resolve(releaseDir, name));
}

function api(path, { method = "GET", token, body, slug } = {}) {
  const res = execFileSync(
    "curl",
    [
      "-sS",
      "-X",
      method,
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2022-11-28",
      "-H",
      "User-Agent: mys-chapar-release",
      ...(body ? ["-H", "Content-Type: application/json", "-d", JSON.stringify(body)] : []),
      `https://api.github.com/repos/${slug}${path}`,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(res);
}

if (!existsSync(releaseDir)) {
  throw new Error("release/ is missing. Run npm run dist first.");
}

const assets = expectedAssets();
const missing = assets.filter((file) => !existsSync(file));
if (missing.length) {
  const found = readdirSync(releaseDir).filter((name) => !name.startsWith("."));
  throw new Error(
    `Missing artifacts for ${version}:\n${missing.map((file) => `  ${basename(file)}`).join("\n")}\nFound:\n${found.map((name) => `  ${name}`).join("\n")}`,
  );
}

const status = git(["status", "--porcelain"]);
if (status) {
  throw new Error("Working tree is dirty. Commit (or stash) before publishing a release.");
}

const token = githubToken();
const slug = repoSlug();

const existingTag = git(["tag", "-l", tag]);
if (!existingTag) {
  git(["tag", "-a", tag, "-m", `MYs Chapar ${version}`], { stdio: "inherit" });
  console.log(`Created tag ${tag}`);
} else {
  console.log(`Tag ${tag} already exists`);
}

execFileSync("git", ["push", "origin", "HEAD", tag], { cwd: root, stdio: "inherit" });

let release;
try {
  release = api(`/releases/tags/${tag}`, { token, slug });
  if (release.message === "Not Found") release = null;
} catch {
  release = null;
}

if (!release || release.message === "Not Found") {
  release = api("/releases", {
    token,
    slug,
    method: "POST",
    body: {
      tag_name: tag,
      name: `MYs Chapar ${version}`,
      body: [
        `Desktop, Chrome, and VS Code builds for **${version}**.`,
        "",
        "| File | Platform |",
        "| --- | --- |",
        `| \`MYs Chapar-${version}-arm64.dmg\` | macOS Apple Silicon |`,
        `| \`MYs Chapar-${version}-win.zip\` | Windows |`,
        `| \`mychapar-linux-${version}.zip\` | Linux |`,
        `| \`MYs Chapar-${version}-chrome.zip\` | Chrome extension |`,
        `| \`MYs Chapar-${version}-vscode.vsix\` | VS Code |`,
      ].join("\n"),
    },
  });
  console.log(`Created GitHub release ${tag}`);
} else {
  console.log(`GitHub release ${tag} already exists`);
}

if (!release?.id) {
  throw new Error(`Could not create or load release: ${JSON.stringify(release)}`);
}

const uploaded = new Set((release.assets || []).map((asset) => asset.name));

for (const file of assets) {
  const name = basename(file);
  if (uploaded.has(name)) {
    console.log(`Skip existing asset ${name}`);
    continue;
  }
  console.log(`Uploading ${name}...`);
  const encoded = encodeURIComponent(name);
  const result = execFileSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "Content-Type: application/octet-stream",
      "-H",
      "User-Agent: mys-chapar-release",
      "--data-binary",
      `@${file}`,
      `https://uploads.github.com/repos/${slug}/releases/${release.id}/assets?name=${encoded}`,
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const parsed = JSON.parse(result);
  if (!parsed.browser_download_url) {
    throw new Error(`Upload failed for ${name}: ${result}`);
  }
  console.log(`  ${parsed.browser_download_url}`);
}

console.log(`Release published: https://github.com/${slug}/releases/tag/${tag}`);
