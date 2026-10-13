export function isExpired(date: string | number | Date | null | undefined): boolean {
  if (!date) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

export function isExpiringSoon(date: string | number | Date | null | undefined, thresholdMs = 24 * 60 * 60 * 1000): boolean {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() - Date.now() < thresholdMs;
}
