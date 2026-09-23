import { Spin } from "antd";

export function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <Spin size="large" tip="載入中…" />
    </div>
  );
}
