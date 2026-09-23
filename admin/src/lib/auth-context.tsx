import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getFirebaseAuth } from "./firebase-app";
import { isFirebaseConfigured } from "./firebase-config";

const LOCAL_SESSION_KEY = "teatop-admin-local-session";

export interface AdminUser {
  uid: string;
  email: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  mode: "firebase" | "local";
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLocalSession(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AdminUser;
    if (!parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSession(user: AdminUser | null): void {
  if (!user) {
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
}

function mapFirebaseUser(user: User): AdminUser {
  return { uid: user.uid, email: user.email ?? "" };
}

const AUTH_READY_TIMEOUT_MS = 8000;
const AUTH_LOADING_MAX_MS = 3000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: "firebase" | "local" = isFirebaseConfigured() ? "firebase" : "local";
  const [user, setUser] = useState<AdminUser | null>(() =>
    mode === "local" ? readLocalSession() : null
  );
  const [loading, setLoading] = useState(() => mode === "firebase");

  useLayoutEffect(() => {
    if (mode !== "local") {
      return;
    }
    setUser(readLocalSession());
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    const maxWaitId = window.setTimeout(() => {
      setLoading(false);
    }, AUTH_LOADING_MAX_MS);
    return () => {
      window.clearTimeout(maxWaitId);
    };
  }, []);

  useEffect(() => {
    if (mode === "local") {
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setUser(readLocalSession());
      setLoading(false);
      return;
    }
    let settled = false;
    const finish = (nextUser: AdminUser | null) => {
      if (settled) {
        return;
      }
      settled = true;
      setUser(nextUser);
      setLoading(false);
    };
    const timeoutId = window.setTimeout(() => {
      finish(readLocalSession());
    }, AUTH_READY_TIMEOUT_MS);
    const unsub = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        finish(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
      },
      () => {
        finish(readLocalSession());
      }
    );
    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      unsub();
    };
  }, [mode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        throw new Error("請輸入電子郵件");
      }
      if (!password) {
        throw new Error("請輸入密碼");
      }
      if (mode === "local") {
        if (password.length < 6) {
          throw new Error("本機模式：密碼至少 6 字元（僅示範用）");
        }
        const localUser = { uid: "local-demo", email: trimmedEmail };
        writeLocalSession(localUser);
        setUser(localUser);
        return;
      }
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase 尚未設定，請使用本機模式或填入 .env");
      }
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
          throw new Error("帳號或密碼錯誤");
        }
        if (code === "auth/invalid-email") {
          throw new Error("電子郵件格式不正確");
        }
        if (code === "auth/too-many-requests") {
          throw new Error("嘗試次數過多，請稍後再試");
        }
        throw new Error("登入失敗，請稍後再試");
      }
    },
    [mode]
  );

  const signOutUser = useCallback(async () => {
    if (mode === "local") {
      writeLocalSession(null);
      setUser(null);
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  }, [mode]);

  const value = useMemo(
    () => ({ user, loading, mode, signIn, signOutUser }),
    [user, loading, mode, signIn, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
