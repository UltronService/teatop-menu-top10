# TEATOP `/admin` · Phase 1 前端

客戶自助後台（zh-TW）：登入、`region-rank-price`、`drink-asset-review`、區域播放器預覽連結。架構見 [`docs/admin-mvp-architecture.md`](../docs/admin-mvp-architecture.md)。

**線上（GitHub Pages）：** https://ultronservice.github.io/teatop-menu-top10/admin/  
路由使用 **Hash**（例：`.../admin/#/region-rank-price`），以配合靜態 Pages、無需子目錄 rewrite。

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

## 建置

```bash
cd admin
npm run build
# 或
npm run build:pages
```

產物：`admin/dist/`。正式資源 `base`：**`/teatop-menu-top10/admin/`**。

## GitHub Pages 部署

### 自動（建議）

1. **Settings → Pages → Build and deployment → Source：** 選 **GitHub Actions**（若仍為「Deploy from branch / main」，請改為 Actions，否則 workflow 不會更新線上站）。
2. `main` 推送後執行 [`.github/workflows/deploy-github-pages.yml`](../.github/workflows/deploy-github-pages.yml)：
   - `cd admin && npm ci && npm run build`
   - [`scripts/assemble-pages-site.sh`](../scripts/assemble-pages-site.sh) 將 repo 靜態檔 + `admin/dist/*` 組成 `_site/admin/`
   - 上傳並部署整站（`regions/`、`data/`、播放器不受影響）

### 手動組裝（本機驗證或自管主機）

```bash
cd admin && npm ci && npm run build
bash scripts/assemble-pages-site.sh
# 將 _site/ 整包上傳至 Pages 根目錄（內含 admin/、regions/、data/ 等）
npx --yes serve _site -l 4173
# 開啟 http://127.0.0.1:4173/teatop-menu-top10/admin/ 需依 serve 路徑；或直接用 gh-pages 預覽
```

### 深連結 fallback

根目錄 [`404.html`](../404.html) 會將 `/teatop-menu-top10/admin/<path>` 轉向 `admin/#/<path>`（搭配 Hash 路由）。

## 模組與 Firestore 對照

| 路由 | 草稿 | 發佈 |
|------|------|------|
| `#/region-rank-price` | `draft/menu`（overrides） | `published/menu`（`menu.json` 形狀） |
| `#/drink-asset-review` | `draft/assetWorkshop` | `published/assetWorkshop` |

## Phase 2（未實作）

`inject.js` 套用 `published/assetWorkshop`（葉／圖示）；本 repo 播放器已支援可選 **published menu URL**（見根 README `data/player-config.json`）。

## 驗收（UAT）

1. 開啟 `/admin/` 或 `/admin/#/login`（Hash 路由）登入。
2. **區域排行與價格**：改排名或價格 → 儲存草稿 → 發佈選單。
3. **飲料素材對照**：調整圖示與裝飾葉 → 儲存草稿 → 發佈。
4. 區域播放器預覽連結可開啟 `regions/<id>/`。
