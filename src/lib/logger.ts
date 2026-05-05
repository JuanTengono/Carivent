type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
};

const HISTORY: LogEntry[] = [];
const MAX_HISTORY = 200;

function buildEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
  };
}

function store(entry: LogEntry) {
  HISTORY.push(entry);
  if (HISTORY.length > MAX_HISTORY) {
    HISTORY.splice(0, HISTORY.length - MAX_HISTORY);
  }
}

function formatConsole(level: LogLevel, message: string, context?: string) {
  const prefix = context ? `[${context}]` : "[app]";
  switch (level) {
    case "error":
      return `%c${prefix} %c${message}`;
    case "warn":
      return `%c${prefix} %c${message}`;
    case "debug":
      return `%c${prefix} %c${message}`;
    default:
      return `${prefix} ${message}`;
  }
}

function consoleStyle(level: LogLevel): string[] {
  switch (level) {
    case "error":
      return ["color: #ef4444; font-weight: bold;", "color: #fca5a5;"];
    case "warn":
      return ["color: #f59e0b; font-weight: bold;", "color: #fcd34d;"];
    case "debug":
      return ["color: #6366f1; font-weight: bold;", "color: #a5b4fc;"];
    default:
      return ["color: #22d3ee; font-weight: bold;", "color: #67e8f9;"];
  }
}

export const logger = {
  info(message: string, context?: string, data?: unknown) {
    const entry = buildEntry("info", message, context, data);
    store(entry);
    console.log(...consoleStyle("info"), formatConsole("info", message, context), data ?? "");
  },

  warn(message: string, context?: string, data?: unknown) {
    const entry = buildEntry("warn", message, context, data);
    store(entry);
    console.warn(...consoleStyle("warn"), formatConsole("warn", message, context), data ?? "");
  },

  error(message: string, context?: string, error?: unknown) {
    const entry = buildEntry("error", message, context, error);
    store(entry);
    console.error(...consoleStyle("error"), formatConsole("error", message, context), error ?? "");
  },

  debug(message: string, context?: string, data?: unknown) {
    if (import.meta.env.DEV) {
      const entry = buildEntry("debug", message, context, data);
      store(entry);
      console.debug(...consoleStyle("debug"), formatConsole("debug", message, context), data ?? "");
    }
  },

  history() {
    return [...HISTORY];
  },

  clear() {
    HISTORY.length = 0;
  },
};

export function installRuntimeErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logger.error(
      `Uncaught error: ${event.message}`,
      "runtime",
      {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      }
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    logger.error(
      `Unhandled promise rejection: ${event.reason}`,
      "runtime",
      { reason: event.reason }
    );
  });

  logger.info("Runtime error handlers installed", "logger");
}
