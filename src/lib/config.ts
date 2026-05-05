const trim = (v: string | undefined) => (v ?? "").replace(/\/$/, "");

/** Base URL for API (must end without trailing slash). Empty = same origin + /api/v1 (Vite proxy in dev). */
export function getApiBaseUrl(): string {
  const fromEnv = trim(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) {
    return fromEnv.endsWith("/api/v1") ? fromEnv : `${fromEnv}/api/v1`;
  }
  return "/api/v1";
}
