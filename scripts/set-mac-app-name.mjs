import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const appName = pkg.build?.productName || "MYs Chapar";

if (process.platform !== "darwin") process.exit(0);

const electronBinary = createRequire(import.meta.url)("electron");
const plist = join(electronBinary, "../../Info.plist");
if (!existsSync(plist)) process.exit(0);

function setPlistString(key, value) {
  const quoted = JSON.stringify(value);
  try {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${quoted}`, plist], {
      stdio: "pipe",
    });
  } catch {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", `Add :${key} string ${quoted}`, plist], {
      stdio: "pipe",
    });
  }
}

setPlistString("CFBundleName", appName);
setPlistString("CFBundleDisplayName", appName);
execFileSync("touch", [join(plist, "../..")], { stdio: "ignore" });
