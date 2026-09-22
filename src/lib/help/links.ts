/** Keep emergency links to tel: and https only. */
export function telHref(phone: string): string | null {
  const compact = phone.replace(/[^\d+]/g, "");
  if (!/^\+?\d{2,15}$/.test(compact)) return null;
  return `tel:${compact}`;
}

export function safeHttpsUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
