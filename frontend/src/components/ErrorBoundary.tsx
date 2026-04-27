import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** What to call when the user clicks "reset" — e.g. clear the bad state. */
  onReset?: () => void;
  /** Short label shown in the fallback ("graph", "chat", …). */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full grid place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 grid place-items-center mx-auto mb-3 text-accent-dark">
            <AlertTriangle size={20} />
          </div>
          <p className="font-serif text-[16px] text-ink-900 mb-1">
            {this.props.label ? `The ${this.props.label} hit a snag.` : "Something broke."}
          </p>
          <p className="text-[12px] text-ink-500 leading-relaxed mb-3 break-words">
            {this.state.error.message || "Unknown error"}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-700 hover:text-accent-dark border border-ink-200 bg-white rounded-full px-3 py-1.5 transition"
          >
            <RotateCcw size={12} />
            Reset {this.props.label ?? "view"}
          </button>
        </div>
      </div>
    );
  }
}
