import { Alert, Button, Card, Form, Input } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/region-rank-price";

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const authBusy = loading || submitting;

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
          <Button type="primary" htmlType="submit" block loading={authBusy} disabled={loading}>
            登入
          </Button>
        </Form>
      </Card>
    </div>
  );
}
