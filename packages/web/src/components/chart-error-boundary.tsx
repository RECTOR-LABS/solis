'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <p className="text-sm text-white/50">
            {this.props.fallbackLabel ?? 'Chart unavailable'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
