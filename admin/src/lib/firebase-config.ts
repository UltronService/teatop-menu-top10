export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function env(name: string): string {
  return (import.meta.env[name] as string | undefined) ?? "";
}

export function readFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = env("VITE_FIREBASE_API_KEY");
  const projectId = env("VITE_FIREBASE_PROJECT_ID");
  if (!apiKey || !projectId || apiKey.startsWith("YOUR_") || projectId.startsWith("YOUR_")) {
    return null;
  }
  return {
    apiKey,
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId,
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_APP_ID"),
  };
}

export function getTenantId(): string {
  const id = env("VITE_TEATOP_TENANT_ID");
  return id && !id.startsWith("YOUR_") ? id : "teatop";
}

export function isFirebaseConfigured(): boolean {
  return readFirebaseConfig() !== null;
}
