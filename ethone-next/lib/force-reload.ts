import type { VersionData } from "@/lib/hooks/useVersionChecker";

export async function forceAppReload(newVersion?: string | null, newData?: VersionData | null): Promise<void> {
  const version = newVersion || newData?.version || null;
  if (newData) {
    try {
      localStorage.setItem("ethone:version", JSON.stringify(newData));
    } catch {}
  } else if (version) {
    try {
      localStorage.setItem("ethone:version", version);
    } catch {}
  }

  if (version) {
    try {
      localStorage.setItem("ethone:acknowledged-version", version);
      localStorage.setItem("ethone:dismissed-version", version);
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
    localStorage.removeItem("ethone:pending-update");
  } catch {}

  const url = new URL(window.location.href);
  url.searchParams.set("__reload", Date.now().toString());
  window.location.href = url.toString();
}
