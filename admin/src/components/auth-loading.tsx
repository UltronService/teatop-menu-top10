import type { CSSProperties } from "react";

const spinnerStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #f0f0f0",
  borderTopColor: "#ec6f09",
  borderRadius: "50%",
  animation: "teatop-admin-spin 0.8s linear infinite",
};

export function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#f5f5f5",
        fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
        color: "#595959",
      }}
    >
      <div style={spinnerStyle} aria-hidden="true" />
      <p style={{ margin: 0, fontSize: 15 }}>載入中…</p>
    </div>
  );
}
