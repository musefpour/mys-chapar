import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type JsonTreeContextValue = {
  preferExpanded: boolean;
  version: number;
  expandAll: () => void;
  collapseAll: () => void;
};

const JsonTreeContext = createContext<JsonTreeContextValue | null>(null);

function isCollapsible(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function previewLabel(value: unknown): string {
  if (Array.isArray(value)) {
    const n = value.length;
    return n === 1 ? "1 item" : `${n} items`;
  }
  if (value !== null && typeof value === "object") {
    const n = Object.keys(value as object).length;
    return n === 1 ? "1 key" : `${n} keys`;
  }
  return "…";
}

function JsonPrimitive({ value }: { value: unknown }): ReactNode {
  if (value === null) return <span className="json-value json-null">null</span>;
  if (typeof value === "boolean") {
    return <span className="json-value json-bool">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="json-value json-number">{value}</span>;
  }
  if (typeof value === "string") {
    return <span className="json-value json-string">"{value}"</span>;
  }
  return <span className="json-value">{String(value)}</span>;
}

function Toggle({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={open ? "json-toggle open" : "json-toggle"}
      aria-expanded={open}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M4 2.5L8.5 6 4 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function JsonNode({
  value,
  name,
  isLast = true,
  depth = 0,
}: {
  value: unknown;
  name?: string;
  isLast?: boolean;
  depth?: number;
}): ReactNode {
  const ctx = useContext(JsonTreeContext);
  const collapsible = isCollapsible(value);
  const preferExpanded = ctx?.preferExpanded ?? true;
  const version = ctx?.version ?? 0;
  const [open, setOpen] = useState(preferExpanded);

  useEffect(() => {
    if (!collapsible) return;
    setOpen(preferExpanded);
  }, [version, preferExpanded, collapsible]);

  if (!collapsible) {
    return (
      <div className="json-line">
        <span className="json-toggle-spacer" aria-hidden />
        {name != null ? (
          <>
            <span className="json-key">"{name}"</span>
            <span className="json-punct">: </span>
          </>
        ) : null}
        <JsonPrimitive value={value} />
        {!isLast ? <span className="json-punct">,</span> : null}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);
  const empty = entries.length === 0;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";
  const toggleLabel = open ? "Collapse" : "Expand";

  if (empty) {
    return (
      <div className="json-line">
        <span className="json-toggle-spacer" aria-hidden />
        {name != null ? (
          <>
            <span className="json-key">"{name}"</span>
            <span className="json-punct">: </span>
          </>
        ) : null}
        <span className="json-punct">
          {openBracket}
          {closeBracket}
        </span>
        {!isLast ? <span className="json-punct">,</span> : null}
      </div>
    );
  }

  return (
    <div className="json-node" data-depth={depth}>
      <div className="json-line json-line-head">
        <Toggle open={open} onToggle={() => setOpen((v) => !v)} label={toggleLabel} />
        {name != null ? (
          <>
            <span className="json-key">"{name}"</span>
            <span className="json-punct">: </span>
          </>
        ) : null}
        <span className="json-punct">{openBracket}</span>
        {!open ? (
          <>
            <button
              type="button"
              className="json-preview"
              onClick={() => setOpen(true)}
              title={toggleLabel}
            >
              {previewLabel(value)}
            </button>
            <span className="json-punct">{closeBracket}</span>
            {!isLast ? <span className="json-punct">,</span> : null}
          </>
        ) : null}
      </div>
      {open ? (
        <>
          <div className="json-block">
            {entries.map(([key, nested], index) => (
              <JsonNode
                key={key}
                value={nested}
                name={isArray ? undefined : key}
                isLast={index === entries.length - 1}
                depth={depth + 1}
              />
            ))}
          </div>
          <div className="json-line">
            <span className="json-toggle-spacer" aria-hidden />
            <span className="json-punct">{closeBracket}</span>
            {!isLast ? <span className="json-punct">,</span> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function tryParseJsonValue(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface JsonTreeProps {
  value: unknown;
  className?: string;
  defaultExpanded?: boolean;
  toolbar?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
}

export function JsonTree({
  value,
  className,
  defaultExpanded = true,
  toolbar = false,
  expandLabel = "Expand all",
  collapseLabel = "Collapse all",
}: JsonTreeProps) {
  const [preferExpanded, setPreferExpanded] = useState(defaultExpanded);
  const [version, setVersion] = useState(0);

  const expandAll = useCallback(() => {
    setPreferExpanded(true);
    setVersion((v) => v + 1);
  }, []);

  const collapseAll = useCallback(() => {
    setPreferExpanded(false);
    setVersion((v) => v + 1);
  }, []);

  const ctx = useMemo(
    () => ({ preferExpanded, version, expandAll, collapseAll }),
    [preferExpanded, version, expandAll, collapseAll],
  );

  return (
    <JsonTreeContext.Provider value={ctx}>
      <div className="json-tree">
        {toolbar ? (
          <div className="json-tree-toolbar">
            <button type="button" className="json-tree-tool" onClick={expandAll}>
              {expandLabel}
            </button>
            <button type="button" className="json-tree-tool" onClick={collapseAll}>
              {collapseLabel}
            </button>
          </div>
        ) : null}
        <pre className={className ? `code-block json-view ${className}` : "code-block json-view"}>
          <JsonNode value={value} />
        </pre>
      </div>
    </JsonTreeContext.Provider>
  );
}
