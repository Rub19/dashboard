export function isExpired(date) {
  if (!date) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

export function isExpiringSoon(date, thresholdMs = 24 * 60 * 60 * 1000) {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() - Date.now() < thresholdMs;
}
