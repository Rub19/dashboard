"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type SecurityEvent = {
  id: string;
  kind: string;
  action?: string;
  status?: string;
  ip?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type Device = {
  id: string;
  name: string;
  user_agent: string;
  trusted: boolean;
  revoked: boolean;
  created_at: string;
  last_seen_at?: string;
};

export type Passkey = {
  id: string;
  name: string;
  credential_id: string;
  created_at: string;
  last_used_at?: string;
  revoked_at?: string;
};

export function useSecurity() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, devicesRes, passkeysRes] = await Promise.all([
        fetchWorker("/api/auth/security-events?limit=50"),
        fetchWorker("/api/auth/devices"),
        fetchWorker("/api/auth/passkeys"),
      ]);
      setEvents(Array.isArray(eventsRes?.data) ? eventsRes.data : []);
      setDevices(Array.isArray(devicesRes?.data) ? devicesRes.data : []);
      setPasskeys(Array.isArray(passkeysRes?.data) ? passkeysRes.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  async function revokeDevice(id: string) {
    await fetchWorker("/api/auth/device/revoke", { method: "POST", body: JSON.stringify({ deviceId: id }) });
    await fetchAll();
  }

  async function removeDevice(id: string) {
    await fetchWorker("/api/auth/device/remove", { method: "POST", body: JSON.stringify({ deviceId: id }) });
    await fetchAll();
  }

  async function upsertDevice(name: string) {
    await fetchWorker("/api/auth/device", { method: "POST", body: JSON.stringify({ name }) });
    await fetchAll();
  }

  return {
    events,
    devices,
    passkeys,
    loading,
    error,
    reload: fetchAll,
    registerPasskey,
    authenticateWithPasskey,
    revokePasskey,
    renamePasskey,
    trustDevice,
    revokeDevice,
    removeDevice,
    upsertDevice,
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
