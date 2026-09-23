import { doc, getDoc, setDoc } from "firebase/firestore";

import type { MenuDocument, MenuDraftDocument, PublishLogMeta } from "../types/menu";
import type { AssetWorkshopDocument } from "../types/workshop";
import { getFirestoreDb } from "./firebase-app";
import { getTenantId, isFirebaseConfigured } from "./firebase-config";

const LOCAL_PREFIX = "teatop-brand";

function localKey(segment: string): string {
  return `${LOCAL_PREFIX}:${getTenantId()}:${segment}`;
}

async function readLocalJson<T>(segment: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(localKey(segment));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeLocalJson(segment: string, value: unknown): Promise<void> {
  localStorage.setItem(localKey(segment), JSON.stringify(value));
}

function firestorePath(segment: string): string {
  return `brands/${getTenantId()}/${segment}`;
}

async function readFirestore<T>(segment: string): Promise<T | null> {
  const db = getFirestoreDb();
  if (!db) {
    return null;
  }
  try {
    const snap = await getDoc(doc(db, firestorePath(segment)));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as T;
  } catch {
    return null;
  }
}

async function writeFirestore(segment: string, value: unknown): Promise<void> {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error("無法連線至雲端儲存，請稍後再試");
  }
  await setDoc(doc(db, firestorePath(segment)), value as Record<string, unknown>, { merge: true });
}

async function readDoc<T>(segment: string): Promise<T | null> {
  if (isFirebaseConfigured()) {
    const remote = await readFirestore<T>(segment);
    if (remote) {
      return remote;
    }
  }
  return readLocalJson<T>(segment);
}

async function writeDoc(segment: string, value: unknown): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await writeFirestore(segment, value);
      return;
    } catch {
      /* fall through to local */
    }
  }
  await writeLocalJson(segment, value);
}

export type DataBackendMode = "firebase" | "local";

export function getDataBackendMode(): DataBackendMode {
  return isFirebaseConfigured() ? "firebase" : "local";
}

export async function loadMenuDraft(): Promise<MenuDraftDocument> {
  const doc = await readDoc<MenuDraftDocument>("draft/menu");
  return doc ?? { overrides: {} };
}

export async function saveMenuDraft(draft: MenuDraftDocument): Promise<void> {
  await writeDoc("draft/menu", { ...draft, updatedAt: new Date().toISOString() });
}

export async function loadPublishedMenu(): Promise<MenuDocument | null> {
  return readDoc<MenuDocument>("published/menu");
}

export async function savePublishedMenu(menu: MenuDocument): Promise<void> {
  await writeDoc("published/menu", menu);
}

export async function loadWorkshopDraft(): Promise<AssetWorkshopDocument | null> {
  return readDoc<AssetWorkshopDocument>("draft/assetWorkshop");
}

export async function saveWorkshopDraft(workshop: AssetWorkshopDocument): Promise<void> {
  await writeDoc("draft/assetWorkshop", workshop);
}

export async function loadPublishedWorkshop(): Promise<AssetWorkshopDocument | null> {
  return readDoc<AssetWorkshopDocument>("published/assetWorkshop");
}

export async function savePublishedWorkshop(workshop: AssetWorkshopDocument): Promise<void> {
  await writeDoc("published/assetWorkshop", workshop);
}

export async function loadPublishMeta(): Promise<PublishLogMeta> {
  const meta = await readDoc<PublishLogMeta>("meta/publishLog");
  return meta ?? {};
}

export async function appendPublishMeta(patch: PublishLogMeta): Promise<void> {
  const prev = await loadPublishMeta();
  await writeDoc("meta/publishLog", { ...prev, ...patch });
}
