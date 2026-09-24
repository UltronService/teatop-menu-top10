import { Navigate } from "react-router-dom";

import { useAuth } from "../lib/auth-context";
import { AuthLoadingScreen } from "./auth-loading";

export function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/region-rank-price" replace />;
}
