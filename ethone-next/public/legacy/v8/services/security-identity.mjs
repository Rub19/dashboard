import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "../vendor/simplewebauthn-browser.bundle.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, limit = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
}

function validEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return email.length >= 5 && email.length <= 320 && EMAIL_RE.test(email);
}

function isAvailable() {
  return browserSupportsWebAuthn();
}

export function createSecurityIdentityService(options = {}) {
  const externalServices = options.externalServices;
  const auth = options.auth;
  const runtime = options.runtime || globalThis;
  const storage = options.storage || runtime.localStorage;

  function client() {
    if (!externalServices) throw new Error("External services client is not available.");
    return externalServices;
  }

  function saveVerifiedUser(userId, email) {
    try {
      storage.setItem("ethone:pending:user", JSON.stringify({ userId, email, at: Date.now() }));
    } catch {}
  }

  function getVerifiedUser() {
    try {
      const raw = storage.getItem("ethone:pending:user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.at > 30 * 60 * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clearVerifiedUser() {
    try {
      storage.removeItem("ethone:pending:user");
    } catch {}
  }

  async function currentSessionToken() {
    const c = await auth?.getClient?.();
    if (!c?.auth?.getSession) return null;
    const response = await c.auth.getSession();
    return response?.data?.session?.access_token || null;
  }

  async function registerPasskey(email, name, deviceName) {
    if (!isAvailable()) throw new Error("WebAuthn is not available on this device.");
    const c = client();
    const optionsResponse = await c.security.passkeyRegisterOptions(email, name, deviceName);
    const options = optionsResponse?.data;
    if (!options) throw new Error("Failed to get passkey registration options.");

    const credential = await startRegistration({ optionsJSON: options });
    const response = await c.security.passkeyRegister(credential, options.deviceId || undefined);
    return response?.data;
  }

  async function getPasskeyAuthenticationOptions(email) {
    if (!isAvailable()) throw new Error("WebAuthn is not available on this device.");
    const c = client();
    const pending = getVerifiedUser();
    const response = await c.security.passkeyAuthenticateOptions(email, pending?.userId);
    const data = response?.data;
    if (!data) throw new Error("Failed to get passkey authentication options.");
    if (data.userId) saveVerifiedUser(data.userId, email);
    return data;
  }

  async function authenticatePasskey(email) {
    if (!isAvailable()) throw new Error("WebAuthn is not available on this device.");
    const options = await getPasskeyAuthenticationOptions(email);
    const assertion = await startAuthentication({ optionsJSON: options });
    const c = client();
    const response = await c.security.passkeyAuthenticate(assertion);
    const result = response?.data;
    if (!result?.userId) throw new Error("Passkey authentication failed.");

    const challengeUser = getVerifiedUser();
    if (challengeUser?.email && challengeUser.email !== email.toLowerCase()) {
      throw new Error("Email mismatch during passkey authentication.");
    }

    return result;
  }

  async function sendOtp(email) {
    if (!validEmail(email)) throw new Error("Invalid email address.");
    const c = client();
    const pending = getVerifiedUser();
    const response = await c.security.otpSend(email, pending?.userId);
    const data = response?.data;
    if (!data?.sent) throw new Error("Failed to send verification code.");
    if (data.userId) saveVerifiedUser(data.userId, email);
    return data;
  }

  async function verifyOtp(email, code) {
    if (!validEmail(email)) throw new Error("Invalid email address.");
    if (!/^\d{6}$/.test(String(code))) throw new Error("Invalid code format.");
    const c = client();
    const pending = getVerifiedUser();
    if (!pending?.userId) throw new Error("No pending verification.");
    const response = await c.security.otpVerify(pending.userId, email, code);
    return response?.data;
  }

  async function listDevices() {
    const c = client();
    const response = await c.security.deviceList();
    return Array.isArray(response?.data) ? response.data : [];
  }

  async function trustDevice(deviceId, trusted) {
    const c = client();
    const response = await c.security.deviceTrust(deviceId, trusted);
    return response?.data;
  }

  async function revokeDevice(deviceId) {
    const c = client();
    const response = await c.security.deviceRevoke(deviceId);
    return response?.data;
  }

  async function removeDevice(deviceId) {
    const c = client();
    const response = await c.security.deviceRemove(deviceId);
    return response?.data;
  }

  async function listSecurityEvents(limit = 100) {
    const c = client();
    const response = await c.security.securityEvents(limit);
    return Array.isArray(response?.data) ? response.data : [];
  }

  async function listPasskeys() {
    const c = client();
    const response = await c.security.passkeyList?.();
    return Array.isArray(response?.data) ? response.data : [];
  }

  return Object.freeze({
    isAvailable,
    registerPasskey,
    getPasskeyAuthenticationOptions,
    authenticatePasskey,
    sendOtp,
    verifyOtp,
    listDevices,
    trustDevice,
    revokeDevice,
    removeDevice,
    listSecurityEvents,
    listPasskeys,
    clearVerifiedUser
  });
}
