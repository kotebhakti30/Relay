import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback panel" style={{ maxWidth: 600, margin: "4rem auto", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <AlertTriangle size={28} className="text-red-500" />
            <h2 style={{ margin: 0 }}>Something went wrong</h2>
          </div>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            An unexpected error occurred while rendering this view. Your session and data are safely stored on the server.
          </p>
          {this.state.error && (
            <pre style={{ padding: "1rem", background: "var(--bg-card)", borderRadius: "6px", fontSize: "0.85rem", overflowX: "auto", marginBottom: "1.5rem" }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="button primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = "#/";
              }}
            >
              <RotateCcw size={16} /> Return to overview
            </button>
            <button
              className="button"
              onClick={() => window.location.reload()}
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
