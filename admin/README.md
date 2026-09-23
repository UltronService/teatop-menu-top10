# TEATOP `/admin` · Phase 1 前端

客戶自助後台（zh-TW）：登入、`region-rank-price`、`drink-asset-review`、區域播放器預覽連結。架構見 [`docs/admin-mvp-architecture.md`](../docs/admin-mvp-architecture.md)。

## 本機開發

```bash
cd admin
npm install
npm run dev
```

瀏覽器開啟：**http://127.0.0.1:5173/admin/**（Vite 會代理 repo 根目錄的 `/data`、`/images`、`/regions`）。

### 登入（未設定 Firebase 時）

`admin/.env` 未填或仍為 `YOUR_*` 時為**本機草稿模式**：

- 任意電子郵件 + 密碼至少 6 字元
- 草稿／發佈資料寫入 `localStorage`（路徑語意同 Firestore `brands/{tenantId}/…`）

### 環境變數

從 repo 根目錄 [`.env.example`](../.env.example) 複製到 `admin/.env`，使用 `VITE_` 前缀：

| 變數 | 說明 |
|------|------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | 專案 ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_TEATOP_TENANT_ID` | 租戶 id（預設 `teatop`） |

設定完成後：Auth 使用 Email/Password；讀寫 Firestore 文件 `brands/{tenantId}/draft/*`、`published/*`、`meta/publishLog`。

## 建置

```bash
cd admin
npm run build
```

產物：`admin/dist/`。正式 `base` 為 GitHub Pages 路徑 **`/teatop-menu-top10/admin/`**。

### GitHub Pages

1. 在 repo 根目錄執行 `cd admin && npm run build`
2. 將 `admin/dist` 內容部署到站點的 `admin/` 目錄（與現有 `regions/`、`data/` 並存）
3. 後台 URL：`https://ultronservice.github.io/teatop-menu-top10/admin/`

SPA 需 Pages 對 `/admin/*` 回傳 `admin/index.html`（或等同 rewrite）；若僅靜態上傳 `dist`，請確認 404 規則。

## 模組與 Firestore 對照

| 路由 | 草稿 | 發佈 |
|------|------|------|
| `/admin/region-rank-price` | `draft/menu`（overrides） | `published/menu`（`menu.json` 形狀，AJV 驗證） |
| `/admin/drink-asset-review` | `draft/assetWorkshop` | `published/assetWorkshop`（`client-asset-workshop-v1.json` 形狀） |

## Phase 1 vs Phase 2

- **Phase 1（本包）**：後台編輯／草稿／發佈；七區播放器仍讀 **`data/menu.json`**（`inject.js` 未改）。
- **Phase 2**：`inject.js` 讀取 `published/assetWorkshop` 套用葉／圖示；選單可改 fetch 已發佈 URL。

## 驗收（UAT）

1. 開啟 `/admin/login`，本機模式登入。
2. **區域排行與價格**：改一格排名與價格 →「儲存草稿」→「發佈選單」；錯誤排名應顯示紅字。
3. **飲料素材對照**：切換圖示、選左右葉 → 儲存草稿 → 發佈。
4. 點「區域播放器預覽」應開啟 `regions/<id>/`（內容仍為 repo `menu.json`，非 Firestore）。
