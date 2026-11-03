export function mailInitials(name: string | undefined, address: string): string {
  const value = name?.trim() || address.split("@")[0] || "?";
  const parts = value.split(/[\s._-]+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase();
  return value.slice(0, 2).toLocaleUpperCase();
}

export function mailTime(iso: string, now: Date, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(language, date.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

export function mailSenderHue(address: string): number {
  let hash = 0;
  for (const character of address) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 360;
}
