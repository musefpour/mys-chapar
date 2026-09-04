import { useMemo, useState } from "react";
import type { ResponseSnapshot } from "@shared/types";
import { useLibraryStore } from "../../stores/library-store";
import { JsonTree } from "../../shared/ui/JsonTree";
import { useT } from "../../i18n";

interface ResponseViewerProps {
  response: ResponseSnapshot | null;
  error: string | null;
  isSending: boolean;
  requestUrl?: string;
  onSaveResponse?: () => void;
}

type ResponseTab = "body" | "cookies" | "headers" | "tests";
type BodyView = "pretty" | "raw" | "preview";
type PrettyFormat = "JSON" | "XML" | "HTML" | "Text";

function tryParseJson(body: string, contentType: string | null): unknown | null {
  const looksJson = contentType?.includes("json") || /^\s*[{\[]/.test(body);
  if (!looksJson) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function detectFormat(body: string, contentType: string | null): PrettyFormat {
  const type = contentType?.toLowerCase() ?? "";
  if (type.includes("json") || tryParseJson(body, contentType) !== null) return "JSON";
  if (type.includes("xml") || /^\s*</.test(body) && body.includes("</")) {
    if (type.includes("html") || /<html/i.test(body)) return "HTML";
    return "XML";
  }
  if (type.includes("html")) return "HTML";
  return "Text";
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return "status-ok";
  if (status >= 300 && status < 400) return "status-redirect";
  if (status >= 400) return "status-error";
  return "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseCookies(headers: Record<string, string>): Array<{ name: string; value: string; raw: string }> {
  const cookies: Array<{ name: string; value: string; raw: string }> = [];
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== "set-cookie") continue;
    const parts = value.split(/,(?=\s*[^;=]+=[^;]+)/);
    for (const part of parts) {
      const raw = part.trim();
      if (!raw) continue;
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) {
        cookies.push({ name: pair.trim(), value: "", raw });
      } else {
        cookies.push({
          name: pair.slice(0, eq).trim(),
          value: pair.slice(eq + 1).trim(),
          raw,
        });
      }
    }
  }
  return cookies;
}

function isHttpsFromHeaders(headers: Record<string, string>): boolean {
  return Object.entries(headers).some(
    ([key, value]) =>
      key.toLowerCase() === "strict-transport-security" ||
      (key.toLowerCase() === "content-security-policy" && /https:/i.test(value)),
  );
}

function IconBraces() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4c-2 1-3 2-3 5v2c0 2-1 3-2 3 1 0 2 1 2 3v2c0 3 1 4 3 5" />
      <path d="M16 4c2 1 3 2 3 5v2c0 2 1 3 2 3-1 0-2 1-2 3v2c0 3-1 4-3 5" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  );
}

function IconWrap() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h10a4 4 0 010 8H8" />
      <path d="M10 16l-2 2 2 2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 012-2h10" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5h11l3 3v11H5V5z" />
      <path d="M8 5v5h8V5" />
      <path d="M8 16h8" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 5v4h4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 11V9a4 4 0 018 0v2" />
      <rect x="8" y="11" width="8" height="7" rx="1" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

export function ResponseViewer({
  response,
  error,
  isSending,
  requestUrl,
  onSaveResponse,
}: ResponseViewerProps) {
  const t = useT();
  const [tab, setTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("pretty");
  const [format, setFormat] = useState<PrettyFormat>("JSON");
  const [wrap, setWrap] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const setSidebarTab = useLibraryStore((state) => state.setSidebarTab);

  const jsonData = useMemo(() => {
    if (!response) return null;
    return tryParseJson(response.body, response.contentType);
  }, [response]);

  const cookies = useMemo(
    () => (response ? parseCookies(response.headers) : []),
    [response],
  );

  const headerEntries = useMemo(
    () => (response ? Object.entries(response.headers) : []),
    [response],
  );

  const prettyText = useMemo(() => {
    if (!response) return "";
    if (jsonData !== null) {
      try {
        return JSON.stringify(jsonData, null, 2);
      } catch {
        return response.body;
      }
    }
    return response.body;
  }, [response, jsonData]);

  const filteredBody = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return prettyText
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter((item) => item.line.toLowerCase().includes(q));
  }, [prettyText, search]);

  if (isSending) {
    return (
      <div className="response-empty">
        <div className="spinner" />
        <p>{t("response.sending")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-empty error">
        <h3>{t("response.failed")}</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-empty">
        <h3>{t("response.title")}</h3>
        <p>{t("response.empty")}</p>
      </div>
    );
  }

  const detected = detectFormat(response.body, response.contentType);
  const activeFormat = format || detected;
  const secure =
    requestUrl?.startsWith("https://") || isHttpsFromHeaders(response.headers);

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(
        bodyView === "raw" ? response.body : prettyText,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const saveBody = () => {
    onSaveResponse?.();
  };

  return (
    <div className="response-viewer">
      <div className="response-topbar">
        <div className="response-tabs">
          {(
            [
              { id: "body", label: t("response.body") },
              { id: "cookies", label: t("response.cookies"), count: cookies.length || undefined },
              { id: "headers", label: t("response.headers"), count: headerEntries.length },
              {
                id: "tests",
                label: t("response.tests"),
                disabled: true,
                title: t("common.comingSoon", { label: t("response.tests") }),
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "response-tab active" : "response-tab"}
              disabled={"disabled" in item && item.disabled}
              title={"title" in item ? item.title : undefined}
              onClick={() => {
                if ("disabled" in item && item.disabled) return;
                setTab(item.id);
              }}
            >
              {item.label}
              {"count" in item && item.count != null ? (
                <span className="response-tab-badge">{item.count}</span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            className="response-icon-btn"
            title={t("response.openHistory")}
            onClick={() => setSidebarTab("history")}
          >
            <IconHistory />
          </button>
        </div>

        <div className="response-meta-right">
          <span className={`status-pill ${statusClass(response.status)}`}>
            {response.status} {response.statusText || "OK"}
          </span>
          <span className="meta-chip">{response.timeMs} ms</span>
          <span className="meta-chip">{formatBytes(response.sizeBytes)}</span>
          {secure && (
            <span className="response-icon-btn static" title={t("response.secure")}>
              <IconLock />
            </span>
          )}
          <div className="response-more-wrap">
            <button
              type="button"
              className="response-icon-btn"
              title={t("common.more")}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <IconMore />
            </button>
            {menuOpen && (
              <div className="response-menu">
                <button
                  type="button"
                  onClick={() => {
                    setTab("body");
                    setBodyView("raw");
                    setMenuOpen(false);
                  }}
                >
                  {t("response.viewRaw")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyBody();
                    setMenuOpen(false);
                  }}
                >
                  {t("response.copyBody")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    saveBody();
                  }}
                >
                  {t("response.saveAs")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {tab === "body" && (
        <>
          <div className="response-toolbar">
            <div className="response-toolbar-left">
              <label className="format-select">
                <IconBraces />
                <select
                  value={activeFormat}
                  onChange={(event) => {
                    setFormat(event.target.value as PrettyFormat);
                    setBodyView("pretty");
                  }}
                >
                  <option value="JSON">JSON</option>
                  <option value="XML">XML</option>
                  <option value="HTML">HTML</option>
                  <option value="Text">Text</option>
                </select>
              </label>
              <button
                type="button"
                className={bodyView === "preview" ? "toolbar-btn active" : "toolbar-btn"}
                onClick={() => setBodyView(bodyView === "preview" ? "pretty" : "preview")}
              >
                <IconPlay />
                {t("response.preview")}
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title={t("response.visualizeSoon")}
                disabled
              >
                <IconImage />
                {t("response.visualize")}
              </button>
            </div>

            <div className="response-toolbar-right">
              <button
                type="button"
                className={wrap ? "response-icon-btn active" : "response-icon-btn"}
                title={t("response.wrap")}
                onClick={() => setWrap((value) => !value)}
              >
                <IconWrap />
              </button>
              <button type="button" className="response-icon-btn" title={t("common.comingSoon", { label: t("response.filter") })} disabled>
                <IconFilter />
              </button>
              <button
                type="button"
                className={searchOpen ? "response-icon-btn active" : "response-icon-btn"}
                title={t("response.search")}
                onClick={() => setSearchOpen((value) => !value)}
              >
                <IconSearch />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title={t("response.saveAs")}
                onClick={() => saveBody()}
              >
                <IconSave />
                {t("response.save")}
              </button>
              <button
                type="button"
                className="response-icon-btn"
                title={copied ? t("common.copied") : t("common.copy")}
                onClick={() => void copyBody()}
              >
                <IconCopy />
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="response-search-bar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("response.searchPlaceholder")}
                autoFocus
              />
            </div>
          )}

          <div className={wrap ? "response-body-pane wrap" : "response-body-pane nowrap"}>
            {bodyView === "preview" ? (
              activeFormat === "HTML" || /<html/i.test(response.body) ? (
                <iframe
                  className="response-preview-frame"
                  title={t("response.previewTitle")}
                  sandbox=""
                  srcDoc={response.body}
                />
              ) : jsonData !== null ? (
                <JsonTree
                  value={jsonData}
                  toolbar
                  expandLabel={t("response.expandAll")}
                  collapseLabel={t("response.collapseAll")}
                />
              ) : (
                <pre className="code-block">{response.body}</pre>
              )
            ) : filteredBody ? (
              <pre className="code-block">
                {filteredBody.length
                  ? filteredBody.map((item) => (
                      <div key={item.index}>
                        <span className="line-no">{item.index + 1}</span>
                        {item.line}
                      </div>
                    ))
                  : t("response.noSearch")}
              </pre>
            ) : bodyView === "raw" || activeFormat !== "JSON" || jsonData === null ? (
              <pre className="code-block">{bodyView === "raw" ? response.body : prettyText}</pre>
            ) : (
              <JsonTree
                value={jsonData}
                toolbar
                expandLabel={t("response.expandAll")}
                collapseLabel={t("response.collapseAll")}
              />
            )}
          </div>
        </>
      )}

      {tab === "cookies" && (
        <div className="response-table-wrap">
          {!cookies.length ? (
            <p className="response-empty-inline">{t("response.noCookies")}</p>
          ) : (
            <table className="response-table">
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.value")}</th>
                  <th>Raw</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((cookie) => (
                  <tr key={`${cookie.name}-${cookie.raw}`}>
                    <td className="json-key">{cookie.name}</td>
                    <td className="json-value">{cookie.value}</td>
                    <td className="muted">{cookie.raw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "headers" && (
        <div className="response-table-wrap">
          <table className="response-table">
            <thead>
              <tr>
                <th>{t("common.key")}</th>
                <th>{t("common.value")}</th>
              </tr>
            </thead>
            <tbody>
              {headerEntries.map(([key, value]) => (
                <tr key={key}>
                  <td className="json-key">{key}</td>
                  <td className="json-value">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "tests" && (
        <div className="response-empty-inline tests">
          <h3>{t("response.tests")}</h3>
          <p>{t("response.noTests")}</p>
        </div>
      )}
    </div>
  );
}
