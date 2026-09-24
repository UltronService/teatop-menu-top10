import { Component, type ErrorInfo, type ReactNode } from "react";

interface AdminErrorBoundaryProps {
  children: ReactNode;
}

interface AdminErrorBoundaryState {
  message: string;
}

export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { message: "" };

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { message: error.message || "未知錯誤" };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Admin UI error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.message) {
      return this.props.children;
    }
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          padding: 24,
          fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 18, color: "#262626" }}>後台暫時無法顯示</h1>
          <p style={{ margin: "0 0 16px", color: "#595959", lineHeight: 1.6 }}>
            請嘗試硬重新整理（Ctrl+Shift+R）或清除此站快取後再開啟登入頁。
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#8c8c8c" }}>{this.state.message}</p>
          <a
            href="./#/login"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "#ec6f09",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            前往登入
          </a>
        </div>
      </div>
    );
  }
}
