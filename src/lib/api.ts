import { getApiBaseUrl } from "./config";
import type { ApiErrorBody, ApiSuccess } from "../types/api";

export class ApiRequestError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(message: string, status: number, body: ApiErrorBody | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const base = getApiBaseUrl();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    token?: string | null;
  } = {}
): Promise<T> {
  const { method = "GET", query, body, token } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;

  if (!res.ok) {
    const errBody = json && "success" in json && json.success === false ? json : null;
    const msg = errBody?.message || res.statusText || "Error de red";
    throw new ApiRequestError(msg, res.status, errBody);
  }

  if (json && "success" in json && json.success === true) {
    return json.data;
  }

  throw new ApiRequestError("Respuesta inválida del servidor", res.status, null);
}
