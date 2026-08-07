import { listDevices, getDeviceBySession, insertDevice, updateDevice, deleteDevice, insertSecurityEvent } from "./security-identity-client.js";

const TRUST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_TYPES = new Set(["desktop", "laptop", "mobile", "tablet", "unknown"]);

function parseUserAgent(ua) {
  const agent = String(ua || "").toLowerCase();
  let platform = "";
  let browser = "";
  let type = "unknown";

  if (agent.includes("windows")) platform = "Windows";
  else if (agent.includes("macintosh") || agent.includes("mac os")) platform = "macOS";
  else if (agent.includes("iphone")) platform = "iOS";
  else if (agent.includes("ipad")) platform = "iPadOS";
  else if (agent.includes("android")) platform = "Android";
  else if (agent.includes("linux")) platform = "Linux";

  if (agent.includes("chrome")) browser = "Chrome";
  else if (agent.includes("safari")) browser = "Safari";
  else if (agent.includes("firefox")) browser = "Firefox";
  else if (agent.includes("edge")) browser = "Edge";

  if (agent.includes("iphone") || agent.includes("android")) type = "mobile";
  else if (agent.includes("ipad")) type = "tablet";
  else if (agent.includes("mobile")) type = "mobile";
  else if (platform === "Windows" || platform === "Linux") type = "desktop";
  else if (platform === "macOS") type = agent.includes("macbook") ? "laptop" : "desktop";

  return { platform, browser, type: DEVICE_TYPES.has(type) ? type : "unknown" };
}

export function buildDeviceName(info) {
  const { platform, browser, type } = info;
  const browserPart = browser ? ` ${browser}` : "";
  const typePart = type === "mobile" ? "Mobile" : type === "tablet" ? "Tablet" : type === "laptop" ? "Laptop" : type === "desktop" ? "Desktop" : "Device";
  if (platform && browser) return `${platform}${browserPart}`;
  return typePart;
}

export async function getOrCreateDevice(env, userId, sessionId, userAgent, requestedName) {
  let device = sessionId ? await getDeviceBySession(env, userId, sessionId) : null;

  if (device) {
    await updateDevice(env, userId, device.id, { lastSeenAt: new Date().toISOString() });
    return device;
  }

  const parsed = parseUserAgent(userAgent);
  const name = safeText(requestedName, 120) || buildDeviceName(parsed);
  const metadata = { user_agent: userAgent?.slice(0, 200) || "" };

  device = await insertDevice(env, {
    userId,
    sessionId: safeText(sessionId, 120) || null,
    name,
    type: parsed.type,
    platform: parsed.platform,
    browser: parsed.browser,
    trusted: false,
    passkeyEnabled: false,
    metadata
  });

  await insertSecurityEvent(env, {
    userId,
    kind: "device_added",
    deviceId: device?.id,
    metadata: { name, type: parsed.type, platform: parsed.platform }
  });

  return device;
}

export async function trustDevice(env, userId, deviceId, trusted) {
  const device = await updateDevice(env, userId, deviceId, {
    trusted: Boolean(trusted),
    lastVerifiedAt: new Date().toISOString()
  });

  await insertSecurityEvent(env, {
    userId,
    kind: trusted ? "device_verified" : "device_trust_removed",
    deviceId: device?.id,
    metadata: { name: device?.name, trusted: Boolean(trusted) }
  });

  return device;
}

export async function revokeDevice(env, userId, deviceId) {
  const device = await updateDevice(env, userId, deviceId, { revokedAt: new Date().toISOString(), trusted: false });

  await insertSecurityEvent(env, {
    userId,
    kind: "device_revoked",
    deviceId: device?.id,
    metadata: { name: device?.name }
  });

  return device;
}

export async function listUserDevices(env, userId) {
  return listDevices(env, userId);
}

export async function removeDevice(env, userId, deviceId) {
  await deleteDevice(env, userId, deviceId);

  await insertSecurityEvent(env, {
    userId,
    kind: "device_removed",
    deviceId,
    metadata: {}
  });

  return true;
}

function safeText(value, limit) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
}
