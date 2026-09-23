import { Layout, Menu, Space, Typography } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth-context";

const { Header, Content } = Layout;

const navItems = [
  { key: "/region-rank-price", label: "區域排行與價格" },
  { key: "/drink-asset-review", label: "飲料素材對照" },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();

  const selected = navItems.find((item) => location.pathname.endsWith(item.key))?.key ?? "/region-rank-price";

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header
        style={{
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "0 24px",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0, whiteSpace: "nowrap" }}>
          TEATOP 後台
        </Typography.Title>
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          items={navItems.map((item) => ({
            key: item.key,
            label: <Link to={item.key}>{item.label}</Link>,
          }))}
          style={{ flex: 1, minWidth: 0, border: "none" }}
        />
        <Space size="middle">
          <Typography.Text type="secondary">{user?.email}</Typography.Text>
          <Typography.Link
            onClick={() => {
              void signOutUser().then(() => navigate("/login"));
            }}
          >
            登出
          </Typography.Link>
        </Space>
      </Header>
      <Content style={{ padding: 24, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
