import { ConfigProvider } from "antd";
import zhTW from "antd/locale/zh_TW";
import { HashRouter, Route, Routes } from "react-router-dom";

import { AdminLayout } from "./components/admin-layout";
import { HomeRedirect } from "./components/home-redirect";
import { RequireAuth } from "./components/require-auth";
import { AuthProvider } from "./lib/auth-context";
import { DrinkAssetReviewPage } from "./pages/drink-asset-review-page";
import { LoginPage } from "./pages/login-page";
import { RegionRankPricePage } from "./pages/region-rank-price-page";
import "./styles/admin.css";

export function App() {
  return (
    <ConfigProvider
      locale={zhTW}
      theme={{ token: { colorPrimary: "#ec6f09", borderRadius: 8 } }}
    >
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/region-rank-price" element={<RegionRankPricePage />} />
              <Route path="/drink-asset-review" element={<DrinkAssetReviewPage />} />
            </Route>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
