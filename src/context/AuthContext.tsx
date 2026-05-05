import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { LoginData, LoginUser } from "../types/api";
import { apiFetch, ApiRequestError } from "../lib/api";
import { logger } from "../lib/logger";

const STORAGE_KEY = "carivent_auth";
const REFRESH_WINDOW_SECONDS = 5 * 60;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type StoredAuth = {
  token: string;
  user: LoginUser;
};

let lastRaw: string | null = null;
let lastSnapshot: StoredAuth | null = null;

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === lastRaw) return lastSnapshot;
    lastRaw = raw;
    if (!raw) {
      lastSnapshot = null;
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user) {
      lastSnapshot = null;
      return null;
    }
    lastSnapshot = parsed;
    return parsed;
  } catch {
    lastRaw = null;
    lastSnapshot = null;
    return null;
  }
}

function writeStored(auth: StoredAuth | null) {
  if (!auth) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }
  window.dispatchEvent(new Event("carivent-auth"));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("carivent-auth", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("carivent-auth", cb);
  };
}

function getSnapshot(): StoredAuth | null {
  return readStored();
}

function getServerSnapshot(): StoredAuth | null {
  return null;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const now = Date.now() / 1000;
  return payload.exp - now < REFRESH_WINDOW_SECONDS;
}

type AuthContextValue = {
  user: LoginUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setSession: (data: LoginData) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const refreshingRef = useRef(false);

  const setSession = useCallback((data: LoginData) => {
    writeStored({ token: data.token, user: data.user });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginData>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setSession(data);
    logger.info("User logged in", "auth", { userId: data.user.id });
  }, [setSession]);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    const current = readStored();
    if (!current?.token) return;

    if (!isTokenExpiringSoon(current.token)) return;

    refreshingRef.current = true;
    try {
      logger.info("Refreshing auth token", "auth");
      const data = await apiFetch<LoginData>("/auth/refresh", {
        method: "POST",
        token: current.token,
      });
      setSession(data);
    } catch (e) {
      logger.warn("Token refresh failed", "auth", e);
      if (e instanceof ApiRequestError && e.status === 401) {
        writeStored(null);
        window.location.href = "/login";
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [setSession]);

  const logout = useCallback(async () => {
    const current = readStored();
    if (current?.token) {
      try {
        await apiFetch<unknown>("/auth/logout", {
          method: "POST",
          body: { token: current.token },
          token: current.token,
        });
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 401) {
          /* token ya invalido */
        }
      }
    }
    writeStored(null);
    logger.info("User logged out", "auth");
  }, []);

  useEffect(() => {
    if (!stored?.token) return;

    if (isTokenExpiringSoon(stored.token)) {
      void refresh();
    }

    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [stored?.token, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: stored?.user ?? null,
      token: stored?.token ?? null,
      isAuthenticated: Boolean(stored?.token),
      login,
      logout,
      refresh,
      setSession,
    }),
    [stored, login, logout, refresh, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
