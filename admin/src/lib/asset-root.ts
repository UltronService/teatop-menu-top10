/** Repo root URL for static data/images/regions (one level above /admin/). */
export function getAssetRoot(): string {
  const base = import.meta.env.BASE_URL;
  if (base.includes("/admin/")) {
    return base.replace(/admin\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "/";
  }
  return "../";
}

export function resolveAssetUrl(relative: string): string {
  if (!relative) {
    return "";
  }
  if (/^https?:\/\//i.test(relative)) {
    return relative;
  }
  const root = getAssetRoot();
  return root + relative.replace(/^\.\//, "");
}
