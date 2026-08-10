import { fetchWorker } from "./api";

const SUBSCRIBE_PATH = "/api/mail/push/subscribe";
const VAPID_PATH = "/api/mail/push/vapid-public-key";

export async function getVapidPublicKey() {
  const res = await fetchWorker(VAPID_PATH, { method: "GET" });
  return res.data?.publicKey as string | undefined;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export async function subscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications not supported.");
  }

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();
  if (!publicKey) throw new Error("VAPID public key unavailable.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription.");
  }

  await fetchWorker(SUBSCRIBE_PATH, {
    method: "POST",
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    }),
  });

  return subscription;
}

export async function unsubscribePush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  const json = subscription.toJSON();
  await subscription.unsubscribe();

  if (json.endpoint) {
    await fetchWorker(SUBSCRIBE_PATH, {
      method: "DELETE",
      body: JSON.stringify({ endpoint: json.endpoint }),
    });
  }

  return true;
}

export async function isPushSubscribed() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
