import { exec } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
import type { ShellInfo, ShellRunPayload, ShellRunResult } from "@shared/types";

const execAsync = promisify(exec);

export class ShellSession {
  private cwd: string;

  constructor(startCwd?: string) {
    const home = homedir();
    const initial = startCwd && existsSync(startCwd) ? startCwd : home;
    this.cwd = initial;
  }

  info(): ShellInfo {
    let user = "user";
    try {
      user = userInfo().username || user;
    } catch {
      // ignore
    }
    return {
      user,
      host: hostname().replace(/\.local$/i, ""),
      cwd: this.cwd,
      home: homedir(),
      promptChar: promptChar(),
    };
  }

  async run(payload: ShellRunPayload): Promise<ShellRunResult> {
    const command = payload?.command?.trim() ?? "";
    const cwd = this.cwd;
    const home = homedir();

    if (!command) {
      return { stdout: "", stderr: "", exitCode: 0, cwd };
    }

    const cdArg = parseCd(command);
    if (cdArg !== null && !/[|&;]/.test(command)) {
      const next = expandPath(cdArg, cwd, home);
      try {
        if (!existsSync(next) || !statSync(next).isDirectory()) {
          return {
            stdout: "",
            stderr: `cd: no such directory: ${next}`,
            exitCode: 1,
            cwd,
          };
        }
        this.cwd = next;
        return { stdout: "", stderr: "", exitCode: 0, cwd: next };
      } catch (error) {
        const message = error instanceof Error ? error.message : "cd failed";
        return { stdout: "", stderr: message, exitCode: 1, cwd };
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
        env: process.env,
        shell:
          process.env.SHELL ||
          (process.platform === "win32" ? process.env.COMSPEC : "/bin/bash"),
      });
      return {
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: 0,
        cwd,
      };
    } catch (error) {
      const err = error as {
        stdout?: string;
        stderr?: string;
        code?: number | string;
        message?: string;
        killed?: boolean;
      };
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr || err.message || "Command failed",
        exitCode: typeof err.code === "number" ? err.code : 1,
        cwd,
        error: err.killed ? "Command timed out" : undefined,
      };
    }
  }
}

function promptChar(): string {
  if (process.platform === "win32") return ">";
  const shell = process.env.SHELL ?? "";
  return shell.includes("zsh") ? "%" : "$";
}

function parseCd(command: string): string | null {
  const match = command.match(/^\s*cd(?:\s+(.*))?$/);
  if (!match) return null;
  return (match[1] ?? "").trim();
}

function expandPath(input: string, cwd: string, home: string): string {
  const trimmed = input.trim() || home;
  const expanded = trimmed.replace(/^~(?=$|[/\\])/, home);
  return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}
