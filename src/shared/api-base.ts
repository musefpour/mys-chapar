export const PROD_API_BASE_URL = "https://api.myschapar.ir/api";
export const DEV_API_BASE_URL = "http://62.60.136.196:1700/api";

export const DEFAULT_API_BASE_URL = PROD_API_BASE_URL;

function isDevMode(): boolean {
  return false // process.env.NODE_ENV !== "production";
}

export function resolveApiBaseUrl(override?: string): string {
  const raw = override?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return (isDevMode() ? DEV_API_BASE_URL : PROD_API_BASE_URL).replace(/\/$/, "");
}
