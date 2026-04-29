import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  // Explicitly declare to satisfy TS
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800">系統發生短暫異常</h2>
            <p className="text-gray-500">
              很抱歉，系統遇到了一些問題。請點擊下方按鈕重新整理頁面，您的進度不會遺失。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-full hover:bg-blue-700 transition-colors shadow-md"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
