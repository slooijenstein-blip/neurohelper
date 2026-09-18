/** Vite `BASE_URL` is `/` locally and `/neurohelper/` on GitHub Pages. */
export function withBasePath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  if (normalized === "/") return `${base}/`;
  if (normalized === base || normalized.startsWith(`${base}/`)) return normalized;
  return `${base}${normalized}`;
}

export function stripBasePath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base) return path || "/";
  if (path === base || path === `${base}/`) return "/";
  if (path.startsWith(`${base}/`)) {
    const stripped = path.slice(base.length);
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }
  return path || "/";
}

export function toRouterPath(to: string): string {
  try {
    const url =
      to.startsWith("http://") || to.startsWith("https://")
        ? new URL(to)
        : new URL(to, window.location.origin);
    if (url.origin !== window.location.origin) return to;
    return `${stripBasePath(url.pathname)}${url.search}${url.hash}` || "/";
  } catch {
    return to || "/";
  }
}
