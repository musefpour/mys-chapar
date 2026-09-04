import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ShellInfo } from "@shared/types";
import { isIssueEntry, useConsoleStore, type ConsoleEntry } from "../../stores/console-store";
import { useUiStore, type BottomPanelTab } from "../../stores/ui-store";
import { useT } from "../../i18n";
import { useLocaleStore } from "../../stores/locale-store";

function formatPromptPath(info: ShellInfo): string {
  if (info.cwd === info.home) return "~";
  if (info.cwd.startsWith(`${info.home}/`) || info.cwd.startsWith(`${info.home}\\`)) {
    return `~${info.cwd.slice(info.home.length)}`;
  }
  return info.cwd;
}

const TABS: BottomPanelTab[] = ["console", "terminal", "issues"];

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M10 7V5h4v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function formatTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleTimeString(locale, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ConsoleList({ entries }: { entries: ConsoleEntry[] }) {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries[entries.length - 1]?.id]);

  if (entries.length === 0) {
    return <p className="bottom-panel-empty">{t("bottom.noMessages")}</p>;
  }

  return (
    <div className="bottom-panel-log" ref={scroller}>
      {entries.map((entry) => (
        <article key={entry.id} className={`console-row level-${entry.level}`}>
          <time dateTime={new Date(entry.ts).toISOString()}>{formatTime(entry.ts, locale)}</time>
          <span className="console-level">{entry.level}</span>
          <div className="console-body">
            <strong>{entry.title}</strong>
            {entry.detail ? <span>{entry.detail}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

interface TerminalLine {
  id: number;
  kind: "command" | "stdout" | "stderr" | "system";
  text: string;
}

function TerminalView() {
  const t = useT();
  const [info, setInfo] = useState<ShellInfo | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const available = typeof window.mychapar?.runShell === "function";

  useEffect(() => {
    if (!available) return;
    void window.mychapar.getShellInfo?.().then(setInfo).catch(() => setInfo(null));
  }, [available]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, running]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const prompt = info
    ? `${info.user}@${info.host} ${formatPromptPath(info)} ${info.promptChar}`
    : "MYs Chapar ~ %";

  const push = (kind: TerminalLine["kind"], text: string) => {
    lineId.current += 1;
    setLines((current) => [...current, { id: lineId.current, kind, text }]);
  };

  const run = async (raw: string) => {
    const value = raw.trimEnd();
    if (!value || running) return;
    setCommand("");
    push("command", `${prompt} ${value}`);
    if (!available || !window.mychapar.runShell) {
      push("system", t("bottom.terminalOnlyDesktop"));
      return;
    }
    setRunning(true);
    try {
      const result = await window.mychapar.runShell({ command: value });
      if (result.stdout) push("stdout", result.stdout.replace(/\n$/, ""));
      if (result.stderr) push("stderr", result.stderr.replace(/\n$/, ""));
      if (result.error) push("system", result.error);
      setInfo((current) => (current ? { ...current, cwd: result.cwd } : current));
    } catch (error) {
      push("stderr", error instanceof Error ? error.message : t("bottom.commandFailed"));
    } finally {
      setRunning(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void run(command);
    }
  };

  return (
    <div
      className="terminal-view"
      ref={scroller}
      onClick={() => inputRef.current?.focus()}
    >
      {!available && (
        <p className="terminal-system">{t("bottom.terminalOnlyDesktop")}</p>
      )}
      {lines.map((line) => (
        <pre key={line.id} className={`terminal-line kind-${line.kind}`}>
          {line.text}
        </pre>
      ))}
      <label className="terminal-input-row">
        <span className="terminal-prompt">{prompt}</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={command}
          disabled={running || !available}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={t("bottom.command")}
        />
      </label>
    </div>
  );
}

export function BottomPanel() {
  const t = useT();
  const tab = useUiStore((state) => state.bottomPanelTab);
  const setTab = useUiStore((state) => state.setBottomPanelTab);
  const close = useUiStore((state) => state.closeBottomPanel);
  const entries = useConsoleStore((state) => state.entries);
  const clear = useConsoleStore((state) => state.clear);
  const clearIssues = useConsoleStore((state) => state.clearIssues);
  const issues = entries.filter(isIssueEntry);
  const [terminalKey, setTerminalKey] = useState(0);

  const onClear = () => {
    if (tab === "issues") clearIssues();
    else if (tab === "console") clear();
    else setTerminalKey((value) => value + 1);
  };

  const onTrash = () => {
    if (tab === "terminal") onClear();
    else if (tab === "issues") clearIssues();
    else clear();
  };

  return (
    <section className="bottom-panel">
      <header className="bottom-panel-header">
        <div className="bottom-panel-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "bottom-panel-tab active" : "bottom-panel-tab"}
              onClick={() => setTab(item)}
            >
              {item === "console" ? t("status.console") : item === "terminal" ? t("status.terminal") : t("bottom.issues")}
              {item === "issues" && issues.length > 0 ? (
                <span className="bottom-panel-count">{issues.length}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="bottom-panel-actions">
          <button type="button" className="bottom-panel-clear" onClick={onClear}>
            {t("common.clear")}
          </button>
          {tab === "terminal" && (
            <button type="button" className="bottom-panel-icon-btn" onClick={onClear} title={t("bottom.newTerminal")} aria-label={t("bottom.newTerminal")}>
              <PlusIcon />
            </button>
          )}
          <button
            type="button"
            className="bottom-panel-icon-btn"
            onClick={onTrash}
            title={tab === "terminal" ? t("bottom.killTerminal") : t("common.clear")}
            aria-label={tab === "terminal" ? t("bottom.killTerminal") : t("common.clear")}
          >
            <TrashIcon />
          </button>
          <button type="button" className="bottom-panel-icon-btn" onClick={close} title={t("bottom.close")} aria-label={t("bottom.close")}>
            <CloseIcon />
          </button>
        </div>
      </header>
      <div className="bottom-panel-body">
        <div className="bottom-panel-page" hidden={tab !== "console"}>
          {entries.length === 0 ? (
            <p className="bottom-panel-empty">{t("bottom.noMessages")}</p>
          ) : (
            <ConsoleList entries={entries} />
          )}
        </div>
        <div className="bottom-panel-page" hidden={tab !== "issues"}>
          {issues.length === 0 ? (
            <p className="bottom-panel-empty">{t("bottom.noIssues")}</p>
          ) : (
            <ConsoleList entries={issues} />
          )}
        </div>
        <div className="bottom-panel-page terminal-host" hidden={tab !== "terminal"}>
          <TerminalView key={terminalKey} />
        </div>
      </div>
    </section>
  );
}
