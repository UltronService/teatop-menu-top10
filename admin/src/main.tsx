import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AdminErrorBoundary } from "./components/admin-error-boundary";
import { normalizeAdminHash } from "./lib/normalize-admin-hash";

function showBootFailure(message: string): void {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    return;
  }
  rootEl.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f5;padding:24px;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;color:#595959;text-align:center"><div><p style="margin:0 0 12px;font-size:16px">後台載入失敗</p><p style="margin:0 0 16px;font-size:13px">${message}</p><a href="./#/login" style="color:#ec6f09;font-weight:600">重新開啟登入頁</a></div></div>`;
}

normalizeAdminHash();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("找不到 #root");
}

try {
  const root = createRoot(rootEl, {
    onUncaughtError: (error) => {
      console.error("Admin uncaught error:", error);
      showBootFailure("請硬重新整理或清除快取後再試。");
    },
  });
  root.render(
    <StrictMode>
      <AdminErrorBoundary>
        <App />
      </AdminErrorBoundary>
    </StrictMode>
  );
  rootEl.dataset.mounted = "true";
} catch (err) {
  const message = err instanceof Error ? err.message : "無法啟動應用程式";
  showBootFailure(message);
}
