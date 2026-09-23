import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth-context";
import { AuthLoadingScreen } from "./auth-loading";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
