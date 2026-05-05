import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error);
    console.error("[ErrorBoundary] component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-black p-8">
          <div className="max-w-md space-y-4 rounded-2xl border border-red-500/30 bg-surface/80 p-8 text-center">
            <h1 className="text-xl font-bold text-red-400">Error de aplicacion</h1>
            <p className="text-sm text-zinc-400">
              Ocurrio un error inesperado. Intenta recargar la pagina.
            </p>
            {this.state.error && (
              <pre className="max-h-48 overflow-auto rounded-xl bg-black/50 p-4 text-left text-xs text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              onClick={() => window.location.reload()}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
