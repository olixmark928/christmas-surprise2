import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#0b261e] text-amber-50">
          <div className="max-w-sm w-full rounded-3xl bg-[#fffcf7] text-slate-900 p-6 text-center shadow-xl border-2 border-amber-300/80 space-y-4">
            <h1 className="text-xl font-black text-red-700">連線發生錯誤 / Đã xảy ra lỗi</h1>
            <p className="text-sm text-slate-600">
              請重新整理頁面後再試一次。 / Vui lòng tải lại trang và thử lại.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-base cursor-pointer"
            >
              重新整理 / Tải lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
