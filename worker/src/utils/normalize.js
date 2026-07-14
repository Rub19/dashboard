export function safeText(value, maximum = 200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export function safeNumber(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : 0;
}

export function safeIsoSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function safePublicUrl(value, allowedHosts = []) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || (allowedHosts.length && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))) return "";
    url.username = "";
    url.password = "";
    return url.href.slice(0, 1200);
  } catch {
    return "";
  }
}

export function safeStats(input, maximum = 40) {
  const entries = Object.entries(input && typeof input === "object" ? input : {}).slice(0, maximum);
  return Object.freeze(Object.fromEntries(entries.map(([key, value]) => [safeText(key, 64), Object.freeze({
    displayName: safeText(value?.displayName || key, 80),
    displayValue: safeText(value?.displayValue ?? value?.value, 80),
    percentile: safeNumber(value?.percentile, 0, 100)
  })])));
}
