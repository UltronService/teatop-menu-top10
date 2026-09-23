/** Keep hash routes stable for GitHub Pages / hard refresh (e.g. #login → #/login). */
export function normalizeAdminHash(): void {
  if (typeof window === "undefined") {
    return;
  }
  const { pathname, search, hash } = window.location;
  const trimmed = (hash || "").replace(/^#/, "").trim();
  if (trimmed === "" || trimmed === "/") {
    return;
  }
  if (trimmed === "login" || trimmed === "/login/") {
    window.location.replace(`${pathname}${search}#/login`);
    return;
  }
  if (!trimmed.startsWith("/")) {
    window.location.replace(`${pathname}${search}#/${trimmed}`);
  }
}
