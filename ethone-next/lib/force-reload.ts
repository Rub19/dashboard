export async function forceAppReload(newVersion?: string | null): Promise<void> {
  if (newVersion) {
    try {
      localStorage.setItem("ethone:version", newVersion);
    } catch {}
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch (e) {
    console.error("[forceAppReload] failed to unregister service workers", e);
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.error("[forceAppReload] failed to clear caches", e);
  }

  try {
    localStorage.removeItem("ethone:update-dismissed");
  } catch {}

  const url = new URL(window.location.href);
  url.searchParams.set("__reload", Date.now().toString());
  window.location.href = url.toString();
}
