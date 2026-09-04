import { useLayoutEffect, useRef, useState } from "react";
import type { BodyMode, FormDataItem, KeyValue, RequestBody } from "@shared/types";
import { BODY_MODE_OPTIONS } from "@shared/types";
import { handleCodeEditorKey } from "../../lib/code-editor-keys";
import { fileToBase64, getDesktopFilePath } from "../../lib/file-payload";
import { beautifyRawBody } from "../../lib/highlight-json";
import { FormDataEditor } from "../../shared/ui/FormDataEditor";
import { KeyValueEditor } from "../../shared/ui/KeyValueEditor";
import { RawBodyEditor } from "./RawBodyEditor";
import { useT } from "../../i18n";

type RawLanguage = NonNullable<RequestBody["rawLanguage"]>;

export type BinaryFileSelection = {
  name: string;
  path?: string;
  base64?: string;
} | null;

interface BodyEditorProps {
  body: RequestBody;
  onModeChange: (mode: BodyMode) => void;
  onRawChange: (raw: string) => void;
  onRawLanguageChange: (language: RawLanguage) => void;
  onUrlencodedChange: (items: KeyValue[]) => void;
  onFormdataChange: (items: FormDataItem[]) => void;
  onBinaryChange: (file: BinaryFileSelection) => void;
  onGraphqlQueryChange: (query: string) => void;
  onGraphqlVariablesChange: (variables: string) => void;
}

export function BodyEditor({
  body,
  onModeChange,
  onRawChange,
  onRawLanguageChange,
  onUrlencodedChange,
  onFormdataChange,
  onBinaryChange,
  onGraphqlQueryChange,
  onGraphqlVariablesChange,
}: BodyEditorProps) {
  const t = useT();
  const [rawError, setRawError] = useState<string | null>(null);
  const graphqlQueryRef = useRef<HTMLTextAreaElement>(null);
  const pendingGraphqlSelection = useRef<{ start: number; end: number } | null>(null);
  const rawLanguage = body.rawLanguage ?? "json";
  const canBeautify = (body.raw ?? "").trim().length > 0;
  const graphqlQuery = body.graphql?.query ?? "";

  useLayoutEffect(() => {
    const el = graphqlQueryRef.current;
    const pending = pendingGraphqlSelection.current;
    if (!el || !pending) return;
    el.setSelectionRange(pending.start, pending.end);
    pendingGraphqlSelection.current = null;
  }, [graphqlQuery]);

  const beautify = () => {
    if (!canBeautify) return;
    const result = beautifyRawBody(body.raw ?? "", rawLanguage);
    if (!result.ok) {
      setRawError(result.error);
      return;
    }
    setRawError(null);
    onRawChange(result.value);
  };

  return (
    <div className="body-editor">
      <div className="body-modes">
        {BODY_MODE_OPTIONS.map((option) => (
          <label key={option.value} className="mode-option">
            <input
              type="radio"
              name="body-mode"
              checked={body.mode === option.value}
              onChange={() => onModeChange(option.value)}
            />
            {option.label}
          </label>
        ))}

        {body.mode === "raw" && (
          <>
            <select
              className="raw-language"
              value={rawLanguage}
              onChange={(event) => {
                setRawError(null);
                onRawLanguageChange(event.target.value as RawLanguage);
              }}
              aria-label={t("request.rawLanguage")}
            >
              <option value="json">JSON</option>
              <option value="text">Text</option>
              <option value="xml">XML</option>
              <option value="html">HTML</option>
              <option value="javascript">JavaScript</option>
            </select>
            <button
              type="button"
              className="beautify-btn"
              onClick={beautify}
              disabled={!canBeautify}
              title={canBeautify ? t("request.formatBody") : t("request.bodyEmpty")}
              aria-label={t("request.formatBody")}
            >
              <svg
                className="beautify-btn-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M4 5h16v2H4V5zm0 4h10v2H4V9zm0 4h16v2H4v-2zm0 4h12v2H4v-2z"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {body.mode === "none" && <p className="muted">This request does not have a body.</p>}

      {body.mode === "formdata" && (
        <FormDataEditor items={body.formdata ?? []} onChange={onFormdataChange} />
      )}

      {body.mode === "urlencoded" && (
        <KeyValueEditor items={body.urlencoded ?? []} onChange={onUrlencodedChange} />
      )}

      {body.mode === "raw" && (
        <RawBodyEditor
          value={body.raw ?? ""}
          language={rawLanguage}
          error={rawError}
          onChange={(value) => {
            setRawError(null);
            onRawChange(value);
          }}
        />
      )}

      {body.mode === "binary" && (
        <div className="binary-picker">
          <label className="file-picker large">
            <span>{body.binaryFileName || t("request.selectFile")}</span>
            <input
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  onBinaryChange(null);
                  return;
                }
                const path = getDesktopFilePath(file);
                if (path) {
                  onBinaryChange({ path, name: file.name });
                  return;
                }
                const base64 = await fileToBase64(file);
                onBinaryChange({ name: file.name, base64 });
              }}
            />
          </label>
          {body.binaryPath && (
            <p className="muted file-path">{body.binaryPath}</p>
          )}
          {!body.binaryPath && body.binaryFileName && (
            <p className="muted file-path">{body.binaryFileName}</p>
          )}
          {body.binaryFileName && (
            <button type="button" className="secondary-btn" onClick={() => onBinaryChange(null)}>
              {t("request.clearFile")}
            </button>
          )}
        </div>
      )}

      {body.mode === "graphql" && (
        <div className="graphql-editor">
          <label className="field-label">
            {t("request.query")}
            <textarea
              ref={graphqlQueryRef}
              className="raw-body"
              value={graphqlQuery}
              onChange={(event) => onGraphqlQueryChange(event.target.value)}
              spellCheck={false}
              onKeyDown={(event) => {
                const el = event.currentTarget;
                const result = handleCodeEditorKey(
                  event,
                  graphqlQuery,
                  el.selectionStart,
                  el.selectionEnd,
                );
                if (!result) return;
                pendingGraphqlSelection.current = {
                  start: result.selectionStart,
                  end: result.selectionEnd,
                };
                onGraphqlQueryChange(result.value);
              }}
            />
          </label>
          <label className="field-label">
            {t("request.graphqlVars")}
            <RawBodyEditor
              value={body.graphql?.variables ?? ""}
              language="json"
              compact
              onChange={onGraphqlVariablesChange}
            />
          </label>
        </div>
      )}
    </div>
  );
}
