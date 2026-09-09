"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorker, getToken } from "@/lib/api";

export type SecurityEvent = {
  id: string;
  kind: string;
  action?: string;
  status?: string;
  ip?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

// Mirrors the real columns ethone_devices returns from `select=*` (see
// worker/src/services/security-identity-client.js#listDevices /
// worker/src/services/device-service.js#insertDevice) — there is no
// ip/city/country column, so no location field is modeled here.
export type Device = {
  id: string;
  name: string;
  type?: string;
  platform?: string;
  browser?: string;
  trusted: boolean;
  passkey_enabled?: boolean;
  session_id?: string | null;
  revoked_at?: string | null;
  last_seen_at?: string | null;
  last_verified_at?: string | null;
  created_at: string;
};

// `Device` plus a client-computed flag — never sent by the Worker — marking
// whether this row is the session the current tab is authenticated with.
export type DeviceWithCurrent = Device & { current: boolean };

export type Passkey = {
  id: string;
  name: string;
  credential_id: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
};

export type TotpSetupResult = {
  secret: string;
  otpauth: string;
  backupCodes: string[];
};

/**
 * Pulls the `session_id` custom claim out of a Supabase access token without
 * verifying its signature (verification is the Worker's job — this only
 * reads a claim from a token this client already holds and already trusts
 * enough to send as a Bearer header). Every access token this app sets via
 * `supabase.auth.setSession` is minted by the Worker's own
 * `signServiceToken` (see worker/src/utils/jwt.js), which embeds
 * `session_id` in the payload — the same value stored on the matching
 * `ethone_devices` row (see worker/src/routes/security-identity.js's
 * otpVerifyRoute). Comparing the two is what lets a device row be marked as
 * "this session" client-side.
 */
export function decodeSessionIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = typeof atob === "function" ? atob(padded) : "";
    if (!binary) return null;
    const json = decodeURIComponent(
      Array.from(binary)
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const payload = JSON.parse(json);
    return typeof payload?.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

export function useSecurity() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [rawDevices, setRawDevices] = useState<Device[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, devicesRes, passkeysRes, token] = await Promise.all([
        fetchWorker("/api/auth/security-events?limit=50"),
        fetchWorker("/api/auth/devices"),
        fetchWorker("/api/auth/passkeys"),
        getToken(),
      ]);
      setEvents(Array.isArray(eventsRes?.data) ? eventsRes.data : []);
      setRawDevices(Array.isArray(devicesRes?.data) ? devicesRes.data : []);
      setPasskeys(Array.isArray(passkeysRes?.data) ? passkeysRes.data : []);
      setCurrentSessionId(decodeSessionIdFromAccessToken(token));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const devices = useMemo<DeviceWithCurrent[]>(
    () =>
      rawDevices.map((d) => ({
        ...d,
        current: Boolean(currentSessionId) && !!d.session_id && d.session_id === currentSessionId,
      })),
    [rawDevices, currentSessionId]
  );

  async function registerPasskey(email: string, name: string, deviceName?: string) {
    const optionsRes = await fetchWorker("/api/auth/passkey/register-options", {
      method: "POST",
      body: JSON.stringify({ email, name, deviceName }),
    });
    const options = optionsRes?.data;
    if (!options) throw new Error("No registration options");

    const credential = (await navigator.credentials.create({ publicKey: {
      ...options,
      challenge: bufferFromBase64Url(options.challenge),
      user: options.user ? { ...options.user, id: bufferFromBase64Url(options.user.id) } : undefined,
      excludeCredentials: (options.excludeCredentials || []).map((c: { id: string; type: string; transports?: string[] }) => ({
        ...c,
        id: bufferFromBase64Url(c.id),
      })),
    } })) as PublicKeyCredential | null;

    if (!credential) throw new Error("Passkey creation cancelled");
    const response = credential.response as AuthenticatorAttestationResponse;
    const clientDataJSON = arrayBufferToBase64Url(response.clientDataJSON);
    const attestationObject = arrayBufferToBase64Url(response.attestationObject);
    const rawId = arrayBufferToBase64Url(credential.rawId);

    const registerRes = await fetchWorker("/api/auth/passkey/register", {
      method: "POST",
      body: JSON.stringify({
        response: {
          id: rawId,
          rawId,
          type: credential.type,
          response: {
            clientDataJSON,
            attestationObject,
            transports: response.getTransports ? response.getTransports() : ["internal"],
          },
          clientExtensionResults: {},
        },
      }),
    });
    await fetchAll();
    return registerRes?.data;
  }

  async function authenticateWithPasskey(email?: string) {
    const optionsRes = await fetchWorker("/api/auth/passkey/authenticate-options", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const options = optionsRes?.data;
    if (!options) throw new Error("No authentication options");

    const assertion = (await navigator.credentials.get({ publicKey: {
      ...options,
      challenge: bufferFromBase64Url(options.challenge),
      allowCredentials: (options.allowCredentials || []).map((c: { id: string; type: string; transports?: string[] }) => ({
        ...c,
        id: bufferFromBase64Url(c.id),
      })),
    } })) as PublicKeyCredential | null;

    if (!assertion) throw new Error("Passkey authentication cancelled");
    const response = assertion.response as AuthenticatorAssertionResponse;
    const rawId = arrayBufferToBase64Url(assertion.rawId);

    const authRes = await fetchWorker("/api/auth/passkey/authenticate", {
      method: "POST",
      body: JSON.stringify({
        response: {
          id: rawId,
          rawId,
          type: assertion.type,
          response: {
            clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
            authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
            signature: arrayBufferToBase64Url(response.signature),
            userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
          },
          clientExtensionResults: {},
        },
      }),
    });
    return authRes?.data as { userId: string; email: string; token_hash: string } | undefined;
  }

  async function revokePasskey(id: string) {
    await fetchWorker("/api/auth/passkey/revoke", { method: "POST", body: JSON.stringify({ passkeyId: id }) });
    await fetchAll();
  }

  async function renamePasskey(id: string, name: string) {
    await fetchWorker("/api/auth/passkey/rename", { method: "POST", body: JSON.stringify({ passkeyId: id, name }) });
    await fetchAll();
  }

  async function trustDevice(id: string, trusted: boolean) {
    await fetchWorker("/api/auth/device/trust", { method: "POST", body: JSON.stringify({ deviceId: id, trusted }) });
    await fetchAll();
  }

  /**
   * Revoking the device tied to the CURRENT session requires `confirmCurrent:
   * true` (see worker/src/routes/security-identity.js#deviceRevokeRoute) —
   * without it the Worker responds 409 CONFIRMATION_REQUIRED. Callers should
   * catch that (WorkerError.code === "CONFIRMATION_REQUIRED"), confirm with
   * the user, then retry with confirmCurrent=true.
   */
  async function revokeDevice(id: string, confirmCurrent = false) {
    await fetchWorker("/api/auth/device/revoke", {
      method: "POST",
      body: JSON.stringify({ deviceId: id, confirmCurrent }),
    });
    await fetchAll();
  }

  /** "Sign out all other devices" — never touches the current session. */
  async function revokeOtherDevices() {
    const res = await fetchWorker("/api/auth/device/revoke-others", { method: "POST" });
    await fetchAll();
    return res?.data as { revokedCount: number; revokedDeviceIds: string[] } | undefined;
  }

  async function removeDevice(id: string) {
    await fetchWorker("/api/auth/device/remove", { method: "POST", body: JSON.stringify({ deviceId: id }) });
    await fetchAll();
  }

  async function upsertDevice(name: string) {
    await fetchWorker("/api/auth/device", { method: "POST", body: JSON.stringify({ name }) });
    await fetchAll();
  }

  // TOTP (2FA). There is no GET status route on the Worker (Phase 3 shipped
  // setup/verify/disable only), so "is 2FA already enabled" can only be
  // learned by calling totpSetup and checking whether it throws
  // TOTP_ALREADY_ENABLED (409) — see SecurityAuthManager for how that's used
  // to drive the UI without ever showing a fabricated enabled/disabled state.
  async function totpSetup(email: string) {
    const res = await fetchWorker("/api/auth/totp/setup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return res?.data as TotpSetupResult | undefined;
  }

  async function totpVerify(code: string) {
    const res = await fetchWorker("/api/auth/totp/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    return res?.data as { enabled: boolean } | undefined;
  }

  async function totpDisable() {
    await fetchWorker("/api/auth/totp/disable", { method: "POST" });
  }

  return {
    events,
    devices,
    passkeys,
    currentSessionId,
    loading,
    error,
    reload: fetchAll,
    registerPasskey,
    authenticateWithPasskey,
    revokePasskey,
    renamePasskey,
    trustDevice,
    revokeDevice,
    revokeOtherDevices,
    removeDevice,
    upsertDevice,
    totpSetup,
    totpVerify,
    totpDisable,
  };
}

function bufferFromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
