import { useEffect, useRef, useState } from "react";
import { importOpenApiFromUrl } from "../../lib/openapi/import-from-url";
import type { OpenApiImportDraft } from "../../lib/openapi/parse-openapi";
import logoUrl from "../../assets/logo.png";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";

interface OpenApiImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (draft: OpenApiImportDraft) => void;
}

const SAMPLES = [
  "https://api.checkits.ir/swagger-ui/index.html",
  "https://api.checkits.ir/v3/api-docs",
  "https://api.javaherishams.ir/v3/api-docs",
  "https://petstore3.swagger.io/api/v3/openapi.json",
] as const;

function OpenApiLoadingOverlay() {
  const t = useT();
  return (
    <div className="openapi-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="openapi-loading-stage">
        <div className="openapi-loading-orbit outer" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle className="orbit-arc" cx="50" cy="50" r="46" />
            <circle className="orbit-arc soft" cx="50" cy="50" r="46" />
          </svg>
        </div>
        <div className="openapi-loading-orbit inner" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle className="orbit-arc" cx="50" cy="50" r="46" />
            <circle className="orbit-arc soft" cx="50" cy="50" r="46" />
          </svg>
        </div>
        <div className="openapi-loading-core">
          <img src={logoUrl} alt="" width={40} height={40} />
        </div>
      </div>
      <p className="openapi-loading-copy">
        <strong>{t("openapi.loading")}</strong>
        <span>{t("openapi.loadingHint")}</span>
      </p>
    </div>
  );
}

export function OpenApiImportModal({ open, onClose, onImport }: OpenApiImportModalProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const loadingRef = useRef(false);
  valueRef.current = value;
  loadingRef.current = loading;
  useFocusTrap(dialogRef, open, { inertBackground: true });

  const submit = async () => {
    if (loadingRef.current) return;
    const trimmed = valueRef.current.trim();
    if (!trimmed) {
      setError(t("openapi.enterUrl"));
      return;
    }
    setLoading(true);
    loadingRef.current = true;
    setError(null);
    try {
      const result = await importOpenApiFromUrl(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImport(result.draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("openapi.failed"));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // Reset form only when the modal opens — never when loading flips
  // (that bug cleared the URL and cancelled the loading state mid-import).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setValue("");
    setLoading(false);
    loadingRef.current = false;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loadingRef.current) {
        onClose();
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !loadingRef.current) {
        event.preventDefault();
        void submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !loading && onClose()}>
      <div
        ref={dialogRef}
        className="modal-card curl-modal openapi-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="openapi-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        {loading && <OpenApiLoadingOverlay />}

        <div className="modal-header">
          <div>
            <h2 id="openapi-import-title">{t("openapi.title")}</h2>
            <p>{t("openapi.help", { ui: "/swagger-ui/index.html", docs: "/v3/api-docs" })}</p>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={onClose}
            aria-label={t("common.close")}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <label className="openapi-url-label">
          <span>{t("openapi.url")}</span>
          <input
            ref={inputRef}
            className="openapi-url-input"
            value={value}
            onChange={(event) => {
              setError(null);
              setValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !loading) {
                if (event.metaKey || event.ctrlKey) event.preventDefault();
                void submit();
              }
            }}
            spellCheck={false}
            placeholder={SAMPLES[0]}
            disabled={loading}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn flat"
            disabled={loading}
            onClick={() => {
              const next = SAMPLES[sampleIndex % SAMPLES.length];
              setSampleIndex((index) => index + 1);
              setValue(next);
              setError(null);
            }}
          >
            {t("openapi.insertSample")}
          </button>
          <div className="modal-actions-right">
            <button
              type="button"
              className="secondary-btn flat"
              onClick={onClose}
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => void submit()}
              disabled={loading}
              title={t("openapi.shortcut")}
            >
              {loading ? t("openapi.importing") : t("openapi.import")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
