/** Keep emergency links to tel: and https only. A leading * is kept for short codes such as *4141. */
export function telHref(phone: string): string | null {
  const trimmed = phone.trim();
  const star = trimmed.startsWith("*");
  const compact = trimmed.replace(/[^\d+]/g, "");
  if (!/^\+?\d{2,15}$/.test(compact)) return null;
  return star ? `tel:*${compact}` : `tel:${compact}`;
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
