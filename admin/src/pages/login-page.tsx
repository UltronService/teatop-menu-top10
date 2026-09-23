import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth-context";
import { isFirebaseConfigured } from "../lib/firebase-config";

export function LoginPage() {
  const { user, signIn, mode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/region-rank-price";

  if (user) {
    return <Navigate to={from} replace />;
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
      }}
    >
      <Card title="TEATOP 客戶自助後台登入" style={{ width: 400, maxWidth: "100%" }}>
        {!isFirebaseConfigured() ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="未設定 Firebase（.env 仍為 YOUR_*）。目前為本機草稿模式：任意電子郵件 + 至少 6 字元密碼即可登入。"
          />
        ) : null}
        {error ? (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        ) : null}
        <Form
          layout="vertical"
          onFinish={async (values: { email: string; password: string }) => {
            setError("");
            setSubmitting(true);
            try {
              await signIn(values.email, values.password);
              navigate(from, { replace: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : "登入失敗");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Form.Item
            label="電子郵件"
            name="email"
            rules={[{ required: true, message: "請輸入電子郵件" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="密碼"
            name="password"
            rules={[{ required: true, message: "請輸入密碼" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            登入
          </Button>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          登入模式：{mode === "firebase" ? "Firebase Email/Password" : "本機示範（資料存於瀏覽器）"}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
