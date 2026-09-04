import { useEffect, useRef, useState, type ReactNode } from "react";
import logoUrl from "../../assets/logo.png";
import { APP_NAME, APP_VERSION } from "@shared/app-version";
import type { AppMenuCommand, RegionId } from "@shared/app-menu";
import { LOCALES, useT, type MessageKey } from "../../i18n";
import { useLocaleStore } from "../../stores/locale-store";
import { useLibraryStore } from "../../stores/library-store";
import { useThemeStore } from "../../stores/theme-store";
import { useUiStore, type SettingsSection } from "../../stores/ui-store";
import { useUpdateStore } from "../../stores/update-store";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { loadSettingsExtra, saveSettingsExtra, type SettingsExtra } from "./settings-extra";

function isMac(): boolean {
  return window.mychapar?.platform === "darwin";
}

function shortcut(parts: string[]): string {
  const mac = isMac();
  return parts
    .map((part) => {
      if (part === "Mod") return mac ? "⌘" : "Ctrl";
      if (part === "Alt") return mac ? "⌥" : "Alt";
      if (part === "Shift") return mac ? "⇧" : "Shift";
      return part;
    })
    .join(mac ? "" : "+");
}

function platformKey(): MessageKey {
  if (window.mychapar?.vscodeVersion) return "settings.platformVscode";
  const platform = window.mychapar?.platform;
  if (platform === "darwin") return "settings.platformMac";
  if (platform === "win32") return "settings.platformWindows";
  if (platform === "linux") return "settings.platformLinux";
  return "settings.platformDesktop";
}

function osLabel(): string {
  const platform = window.mychapar?.platform;
  const release = window.mychapar?.osRelease;
  if (platform === "darwin") return release ? `OS X ${release}` : "macOS";
  if (platform === "win32") return release ? `Windows ${release}` : "Windows";
  if (platform === "linux") return release ? `Linux ${release}` : "Linux";
  return navigator.platform || "Desktop";
}

function openHelp(command: AppMenuCommand): void {
  void window.mychapar?.invokeMenu?.(command);
}

function exportAppData(): void {
  const { workspaces, activeWorkspaceId } = useLibraryStore.getState();
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    workspaces,
    activeWorkspaceId,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mychapar-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const NAV: Array<{ id: SettingsSection; label: MessageKey; icon: ReactNode; disabled?: boolean }> = [
  { id: "general", label: "settings.nav.general", icon: <GeneralIcon /> },
  { id: "themes", label: "settings.nav.themes", icon: <ThemesIcon /> },
  { id: "shortcuts", label: "settings.nav.shortcuts", icon: <ShortcutsIcon /> },
  { id: "data", label: "settings.nav.data", icon: <DataIcon /> },
  { id: "addons", label: "settings.nav.addons", icon: <AddonsIcon /> },
  { id: "certificates", label: "settings.nav.certificates", icon: <CertsIcon /> },
  { id: "proxy", label: "settings.nav.proxy", icon: <ProxyIcon /> },
  { id: "update", label: "settings.nav.update", icon: <UpdateIcon /> },
  { id: "about", label: "settings.nav.about", icon: <AboutIcon /> },
];

const SHORTCUTS: Array<{ label: MessageKey; keys: string[] }> = [
  { label: "menu.newTab", keys: ["Mod", "T"] },
  { label: "menu.newWindow", keys: ["Mod", "Shift", "N"] },
  { label: "menu.closeTab", keys: ["Mod", "W"] },
  { label: "menu.closeTab", keys: ["Mod", "F4"] },
  { label: "menu.focusUrl", keys: ["Mod", "L"] },
  { label: "menu.settings", keys: ["Mod", ","] },
  { label: "menu.importOpenapi", keys: ["Mod", "O"] },
  { label: "menu.toggleLeftSidebar", keys: ["Mod", "\\"] },
  { label: "menu.toggleTwoPane", keys: ["Alt", "Mod", "V"] },
  { label: "menu.toggleWorkbench", keys: ["Alt", "Mod", "M"] },
  { label: "menu.toggleRightSidebar", keys: ["Alt", "Mod", "\\"] },
  { label: "menu.swapSidebars", keys: ["Alt", "Mod", "S"] },
  { label: "menu.resetLayout", keys: ["Alt", "Mod", "R"] },
  { label: "menu.showConsole", keys: ["Alt", "Mod", "C"] },
];

function GeneralIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
    </svg>
  );
}

function ThemesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

function ShortcutsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h2M11 10h2M15 10h2M9 14h6" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  );
}

function AddonsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M8 4h3a2 2 0 012 2v3h3a2 2 0 012 2v3h-5v5H8v-5H3v-3a2 2 0 012-2h3V6a2 2 0 012-2z" />
    </svg>
  );
}

function CertsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3l8 4v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ProxyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 3.8 6 3.8 9S14.5 18 12 21c-2.5-3-3.8-6-3.8-9S9.5 6 12 3z" />
    </svg>
  );
}

function UpdateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 5h5v5" />
      <path d="M10 14L19 5" />
      <path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6" />
    </svg>
  );
}

function SettingsToggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={on ? "settings-toggle on" : "settings-toggle"}
      onClick={() => onChange(!on)}
    />
  );
}

function SettingsItem({
  title,
  hint,
  alignStart,
  children,
}: {
  title: string;
  hint?: string;
  alignStart?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={alignStart ? "settings-item align-start" : "settings-item"}>
      <div className="settings-item-copy">
        <strong>{title}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="settings-item-control">{children}</div>
    </div>
  );
}

function SettingsBlock({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="settings-block">
      <h3>{title}</h3>
      <p>{hint}</p>
      {children ? <div className="settings-block-actions">{children}</div> : null}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  external,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  external?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="settings-action-btn"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
      {external ? <ExternalIcon /> : null}
    </button>
  );
}

function ExtLink({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="settings-ext-link"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? label : undefined}
    >
      {label}
      <ExternalIcon />
    </button>
  );
}

export function SettingsModal() {
  const t = useT();
  const open = useUiStore((state) => state.settingsOpen);
  const section = useUiStore((state) => state.settingsSection);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const setSettingsSection = useUiStore((state) => state.setSettingsSection);
  const setImportDialog = useUiStore((state) => state.setImportDialog);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const hardwareAcceleration = useUiStore((state) => state.hardwareAcceleration);
  const setHardwareAcceleration = useUiStore((state) => state.setHardwareAcceleration);
  const region = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);
  const twoPane = useUiStore((state) => state.twoPane);
  const setTwoPane = useUiStore((state) => state.setTwoPane);
  const sidebarOnRight = useUiStore((state) => state.sidebarOnRight);
  const setSidebarOnRight = useUiStore((state) => state.setSidebarOnRight);
  const showToast = useUiStore((state) => state.showToast);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState<SettingsExtra>(loadSettingsExtra);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "done" | "required" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const checkNow = useUpdateStore((state) => state.checkNow);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setSettingsOpen]);

  useEffect(() => {
    if (!open) return;
    const current = NAV.find((item) => item.id === section);
    if (current?.disabled) setSettingsSection("general");
  }, [open, section, setSettingsSection]);

  useEffect(() => {
    if (updateStatus !== "checking") return;
    let cancelled = false;
    const started = Date.now();
    const id = window.setInterval(() => {
      const next = Math.min(92, Math.round(((Date.now() - started) / 900) * 100));
      setProgress(next);
    }, 70);

    void checkNow().then((outcome) => {
      if (cancelled) return;
      window.clearInterval(id);
      setProgress(100);
      if (outcome === "latest") setUpdateStatus("done");
      else if (outcome === "required") {
        setUpdateStatus("required");
        setSettingsOpen(false);
      } else setUpdateStatus("error");
    });

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [updateStatus, checkNow, setSettingsOpen]);

  if (!open) return null;

  const patchExtra = (patch: Partial<SettingsExtra>) => {
    setExtra(saveSettingsExtra(patch));
  };

  const onHwAccel = async (enabled: boolean) => {
    setHardwareAcceleration(enabled);
    if (window.mychapar?.setPrefs) {
      await window.mychapar.setPrefs({ hardwareAcceleration: enabled });
      showToast(t("menu.hwAccelRestart"));
    }
  };

  const onRegion = async (next: RegionId) => {
    setRegion(next);
    if (window.mychapar?.setPrefs) await window.mychapar.setPrefs({ region: next });
  };

  const startImport = (kind: "openapi" | "curl") => {
    setSettingsOpen(false);
    setImportDialog(kind);
  };

  const paneTitle = t(NAV.find((item) => item.id === section)?.label ?? "settings.title");

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
      <div
        ref={dialogRef}
        className="modal-card settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <nav className="settings-nav" aria-label={t("settings.title")}>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? "settings-nav-item active" : "settings-nav-item"}
              disabled={item.disabled}
              title={
                item.disabled ? t("common.comingSoon", { label: t(item.label) }) : undefined
              }
              onClick={() => {
                if (item.disabled) return;
                setSettingsSection(item.id);
              }}
            >
              <span className="settings-nav-icon">{item.icon}</span>
              {t(item.label)}
            </button>
          ))}
        </nav>

        <section className="settings-main">
          <header className="settings-pane-head">
            <h2 id="settings-title">{paneTitle}</h2>
            <button
              type="button"
              className="ghost-btn settings-close"
              onClick={() => setSettingsOpen(false)}
              aria-label={t("common.close")}
            >
              ✕
            </button>
          </header>

          <div className="settings-pane-body">
            {section === "general" && (
              <>
                <h3 className="settings-section-title">{t("settings.section.application")}</h3>
                <SettingsItem title={t("settings.language")} hint={t("settings.languageHint")}>
                  <select
                    className="settings-select"
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as typeof locale)}
                  >
                    {LOCALES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nativeName}
                      </option>
                    ))}
                  </select>
                </SettingsItem>
                <SettingsItem title={t("settings.region")} hint={t("settings.regionHint")}>
                  <select
                    className="settings-select"
                    value={region}
                    onChange={(event) => void onRegion(event.target.value as RegionId)}
                  >
                    <option value="us">{t("menu.regionUs")}</option>
                    <option value="eu">{t("menu.regionEu")}</option>
                    <option value="asia">{t("menu.regionAsia")}</option>
                  </select>
                </SettingsItem>
                <SettingsItem title={t("settings.hwAccel")} hint={t("settings.hwAccelHint")}>
                  <SettingsToggle
                    on={hardwareAcceleration}
                    onChange={(next) => void onHwAccel(next)}
                    label={t("settings.hwAccel")}
                  />
                </SettingsItem>

                <h3 className="settings-section-title">{t("settings.section.interface")}</h3>
                <SettingsItem title={t("menu.toggleTwoPane")} hint={t("settings.twoPaneHint")}>
                  <SettingsToggle on={twoPane} onChange={setTwoPane} label={t("menu.toggleTwoPane")} />
                </SettingsItem>
                <SettingsItem title={t("menu.swapSidebars")} hint={t("settings.swapSidebarsHint")}>
                  <SettingsToggle
                    on={sidebarOnRight}
                    onChange={setSidebarOnRight}
                    label={t("menu.swapSidebars")}
                  />
                </SettingsItem>
              </>
            )}

            {section === "themes" && (
              <>
                <p className="settings-intro">{t("settings.themesIntro")}</p>
                <div className="settings-theme-grid">
                  <button
                    type="button"
                    className={theme === "light" ? "settings-theme-card active" : "settings-theme-card"}
                    onClick={() => setTheme("light")}
                  >
                    <div className="settings-theme-card-head">
                      <span>{t("settings.themesDay")}</span>
                      {theme === "light" ? <em>{t("settings.themesActive")}</em> : null}
                    </div>
                    <span className="settings-theme-hint">{t("settings.themesDayHint")}</span>
                    <span className="settings-theme-preview light" aria-hidden="true" />
                    <span className="settings-theme-name">{t("settings.themeLight")}</span>
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "settings-theme-card active" : "settings-theme-card"}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="settings-theme-card-head">
                      <span>{t("settings.themesNight")}</span>
                      {theme === "dark" ? <em>{t("settings.themesActive")}</em> : null}
                    </div>
                    <span className="settings-theme-hint">{t("settings.themesNightHint")}</span>
                    <span className="settings-theme-preview dark" aria-hidden="true" />
                    <span className="settings-theme-name">{t("settings.themeDark")}</span>
                  </button>
                </div>
              </>
            )}

            {section === "shortcuts" && (
              <>
                <p className="settings-intro">{t("settings.shortcutsIntro")}</p>
                <div className="settings-shortcut-list">
                  {SHORTCUTS.map((item) => (
                    <div key={item.label} className="settings-item">
                      <div className="settings-item-copy">
                        <strong>{t(item.label)}</strong>
                      </div>
                      <kbd className="settings-kbd">{shortcut(item.keys)}</kbd>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "data" && (
              <>
                <SettingsItem title={t("settings.dataImport")} hint={t("settings.dataImportHint")} alignStart>
                  <div className="settings-item-actions">
                    <ActionBtn onClick={() => startImport("openapi")}>{t("settings.dataImportOpenapi")}</ActionBtn>
                    <ActionBtn onClick={() => startImport("curl")}>{t("settings.dataImportCurl")}</ActionBtn>
                  </div>
                </SettingsItem>
                <SettingsItem title={t("settings.dataExport")} hint={t("settings.dataExportHint")}>
                  <ActionBtn
                    onClick={() => {
                      exportAppData();
                      showToast(t("settings.dataExported"));
                    }}
                  >
                    {t("settings.dataExportBtn")}
                  </ActionBtn>
                </SettingsItem>
                <h3 className="settings-section-title">{t("settings.dataLocal")}</h3>
                <SettingsItem title={t("menu.clearCache")} hint={t("settings.dataHint")}>
                  <ActionBtn onClick={() => void window.mychapar?.invokeMenu?.("help.clearCacheReload")}>
                    {t("settings.dataClear")}
                  </ActionBtn>
                </SettingsItem>
              </>
            )}

            {section === "addons" && (
              <>
                <SettingsBlock title={t("settings.addonsCli")} hint={t("settings.addonsCliHint")}>
                  <ActionBtn disabled title={t("common.comingSoon", { label: t("settings.addonsCli") })}>
                    {t("settings.addonsCliBtn")}
                  </ActionBtn>
                </SettingsBlock>
                <SettingsBlock title={t("settings.addonsChrome")} hint={t("settings.addonsChromeHint")}>
                  <ActionBtn external onClick={() => openHelp("help.docs")}>
                    {t("settings.addonsChromeBtn")}
                  </ActionBtn>
                </SettingsBlock>
                <SettingsBlock title={t("settings.addonsDesktop")} hint={t("settings.addonsDesktopHint")} />
              </>
            )}

            {section === "certificates" && (
              <>
                <SettingsItem title={t("settings.certsCa")} hint={t("settings.certsCaHint")}>
                  <SettingsToggle
                    on={extra.caCertificates}
                    onChange={(next) => patchExtra({ caCertificates: next })}
                    label={t("settings.certsCa")}
                  />
                </SettingsItem>
                <SettingsItem title={t("settings.certsClient")} hint={t("settings.certsClientHint")} alignStart>
                  <ActionBtn disabled title={t("common.comingSoon", { label: t("settings.certsClient") })}>
                    {t("settings.certsAdd")}
                  </ActionBtn>
                </SettingsItem>
              </>
            )}

            {section === "proxy" && (
              <>
                <h3 className="settings-section-title">{t("settings.proxyDefault")}</h3>
                <p className="settings-intro">{t("settings.proxyDefaultHint")}</p>
                <SettingsItem title={t("settings.proxySystem")}>
                  <SettingsToggle
                    on={extra.useSystemProxy}
                    onChange={(next) => patchExtra({ useSystemProxy: next })}
                    label={t("settings.proxySystem")}
                  />
                </SettingsItem>
                <label className="settings-check">
                  <input
                    type="checkbox"
                    checked={extra.proxyAuth}
                    onChange={(event) => patchExtra({ proxyAuth: event.target.checked })}
                  />
                  {t("settings.proxyAuth")}
                </label>
                <h3 className="settings-section-title">{t("settings.proxyRequests")}</h3>
                <p className="settings-intro">{t("settings.proxyRequestsHint")}</p>
                <SettingsItem title={t("settings.proxyCustom")}>
                  <SettingsToggle
                    on={extra.customProxy}
                    onChange={(next) => patchExtra({ customProxy: next })}
                    label={t("settings.proxyCustom")}
                  />
                </SettingsItem>
              </>
            )}

            {section === "update" && (
              <div className="settings-update">
                {updateStatus === "checking" ? (
                  <>
                    <p className="settings-update-status">{t("settings.updateChecking")}</p>
                    <div className="settings-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="settings-update-status">
                      {updateStatus === "error"
                        ? t("settings.updateFailed")
                        : updateStatus === "done"
                          ? t("menu.upToDate")
                          : t("settings.updateLatest")}
                    </p>
                    <ActionBtn
                      onClick={() => {
                        setProgress(6);
                        setUpdateStatus("checking");
                      }}
                    >
                      {t("settings.updateCheck")}
                    </ActionBtn>
                  </>
                )}
              </div>
            )}

            {section === "about" && (
              <div className="settings-about">
                <img className="about-logo" src={logoUrl} alt="" width={88} height={88} />
                <h3>{t("settings.aboutFor", { platform: t(platformKey()) })}</h3>
                <p className="about-creator">{t("about.creator")}</p>
                <dl className="settings-about-meta">
                  <div>
                    <dt>{t("settings.aboutVersion")}</dt>
                    <dd>{APP_VERSION}</dd>
                  </div>
                  <div>
                    <dt>{t("settings.aboutUi")}</dt>
                    <dd>{APP_VERSION}</dd>
                  </div>
                  {window.mychapar?.electronVersion ? (
                    <div>
                      <dt>{t("settings.aboutElectron")}</dt>
                      <dd>{window.mychapar.electronVersion}</dd>
                    </div>
                  ) : null}
                  {window.mychapar?.vscodeVersion ? (
                    <div>
                      <dt>{t("settings.aboutVscode")}</dt>
                      <dd>{window.mychapar.vscodeVersion}</dd>
                    </div>
                  ) : null}
                  {window.mychapar?.arch ? (
                    <div>
                      <dt>{t("settings.aboutArch")}</dt>
                      <dd>{window.mychapar.arch}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t("settings.aboutOs")}</dt>
                    <dd>{osLabel()}</dd>
                  </div>
                </dl>
                <div className="settings-about-links">
                  <ExtLink label={t("settings.aboutWebsite")} onClick={() => openHelp("help.support")} />
                  <ExtLink
                    label={t("settings.aboutTwitter")}
                    onClick={() => openHelp("help.twitter")}
                    disabled
                  />
                  <ExtLink label={t("settings.aboutDocs")} onClick={() => openHelp("help.github")} />
                  <ExtLink label={t("settings.aboutIssues")} onClick={() => openHelp("help.docs")} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
