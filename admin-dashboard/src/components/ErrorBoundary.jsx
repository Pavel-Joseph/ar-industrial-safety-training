import React from "react";

// Without this, any runtime error anywhere in the tree unmounts the whole
// app and leaves a completely blank page with nothing but the body
// background — which is almost impossible to diagnose from a screenshot.
// This catches the error and prints the actual message and component stack
// on screen, so a failure is immediately readable instead of silent.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Still log it so the browser console has the full stack.
    console.error("Dashboard crashed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="crash-screen">
        <div className="crash-card">
          <h1>The dashboard hit an error</h1>
          <p className="crash-sub">
            This message replaces what would otherwise be a blank page. Copy the
            details below when reporting it.
          </p>

          <div className="crash-block">
            <strong>{this.state.error.name || "Error"}</strong>
            <pre>{this.state.error.message}</pre>
          </div>

          {this.state.error.stack && (
            <details className="crash-details">
              <summary>Stack trace</summary>
              <pre>{this.state.error.stack}</pre>
            </details>
          )}

          {this.state.info?.componentStack && (
            <details className="crash-details">
              <summary>Component stack</summary>
              <pre>{this.state.info.componentStack}</pre>
            </details>
          )}

          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
