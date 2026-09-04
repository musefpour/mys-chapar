const EXTRA_KEY = "mychapar.settings-extra";

export interface SettingsExtra {
  caCertificates: boolean;
  useSystemProxy: boolean;
  proxyAuth: boolean;
  customProxy: boolean;
}

const DEFAULTS: SettingsExtra = {
  caCertificates: false,
  useSystemProxy: true,
  proxyAuth: false,
  customProxy: false,
};

export function loadSettingsExtra(): SettingsExtra {
  try {
    const raw = localStorage.getItem(EXTRA_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SettingsExtra>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettingsExtra(patch: Partial<SettingsExtra>): SettingsExtra {
  const next = { ...loadSettingsExtra(), ...patch };
  try {
    localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
