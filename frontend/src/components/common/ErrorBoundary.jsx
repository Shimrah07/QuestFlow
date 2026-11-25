import { Component } from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";

/**
 * Catches a crash inside one page so the rest of the app (navigation, top bar) keeps working.
 * Resets automatically when `resetKey` changes, e.g. when the user navigates elsewhere.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="surface mx-auto mt-6 flex max-w-lg flex-col items-center px-6 py-10 text-center" data-testid="page-error">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-danger/30 bg-danger/10 text-danger">
          <WarningCircle size={24} weight="fill" />
        </span>
        <h1 className="display text-xl font-semibold text-fg">This page hit a problem</h1>
        <p className="mt-2 max-w-[42ch] text-sm text-fg-muted">
          Something went wrong while showing this page. Your data is safe. Reload to try again, or pick another page from the menu.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary mt-6">
          <ArrowClockwise size={16} weight="bold" />
          Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
