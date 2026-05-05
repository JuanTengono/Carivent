import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { installRuntimeErrorHandlers, logger } from "./lib/logger.ts";

installRuntimeErrorHandlers();
logger.info("App initializing", "main", { env: import.meta.env.MODE });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
