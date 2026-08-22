"use client";

import { useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSecurity } from "@/lib/hooks/useSecurity";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import Button from "@/components/ui/Button";
import BiometricLock from "@/components/BiometricLock";
import Input from "@/components/Input";

export default function SecurityPage() {
  const i18n = useI18n();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { events, devices, passkeys, loading, reload, registerPasskey, revokePasskey, renamePasskey, trustDevice, removeDevice } = useSecurity();
  const [passkeyName, setPasskeyName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function handleRegisterPasskey() {
    const email = user?.email;
    if (!email) {
      showError(i18n("error"));
      return;
    }
    try {
      await registerPasskey(email, passkeyName || i18n("passkeyDefaultName"), navigator.userAgent.slice(0, 60));
      success(i18n("passkeyRegistered"));
      setPasskeyName("");
    } catch (err) {
      showError(String(err));
    }
  }

  async function handleRename(id: string) {
    try {
      await renamePasskey(id, newName);
      success(i18n("saved"));
      setRenaming(null);
      setNewName("");
    } catch (err) {
      showError(String(err));
    }
  }

  function formatDate(iso?: string) {
    try {
      return iso ? new Date(iso).toLocaleString() : "-";
    } catch {
      return iso || "-";
    }
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{i18n("securityTitle")}</h1>
        <button type="button" onClick={reload} aria-label={i18n("refresh")} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2 text-[var(--muted)] hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"><Icon name="refresh-cw" className="h-4 w-4" /></button>
      </div>

      <BiometricLock title={i18n("securityTitle")}>
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="shield" className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("auth")}</p>
              <p className="font-medium">{i18n("otpPasskeys")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="lock" className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("encryption")}</p>
              <p className="font-medium">{i18n("tlsJwt")}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="smartphone" className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("devices")}</p>
              <p className="font-medium">{loading ? "-" : devices.length}</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <Icon name="history" className="h-8 w-8 text-sky-400" />
            <div>
              <p className="text-sm text-[var(--muted)]">{i18n("history")}</p>
              <p className="font-medium">{loading ? "-" : events.length} {i18n(events.length > 1 ? "events" : "event")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <h2 className="text-lg font-semibold">{i18n("passkeys")}</h2>
      <Card3D>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            placeholder={i18n("passkeyName")}
            aria-label={i18n("passkeyName")}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleRegisterPasskey}
          >
            {i18n("addPasskey")}
          </Button>
        </div>
      </Card3D>

      <div className="space-y-2">
        {passkeys.length === 0 ? (
          <Card3D><p className="text-sm text-[var(--muted)]">{i18n("noPasskeys")}</p></Card3D>
        ) : (
          passkeys.map((p) => (
            <Card3D key={p.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {renaming === p.id ? (
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(p.id); }}
                      aria-label={i18n("passkeyName")}
                      inputSize="compact"
                      className="w-full"
                    />
                  ) : (
                    <p className="font-medium">{p.name}</p>
                  )}
                  <p className="text-xs text-[var(--muted)]">{p.credential_id.slice(0, 12)}... — {formatDate(p.last_used_at)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {renaming === p.id ? (
                    <button type="button" onClick={() => handleRename(p.id)} className="rounded p-1 text-[var(--success)] hover:bg-[var(--panel-bg)]"><Icon name="check" className="h-4 w-4" /></button>
                  ) : (
                    <button type="button" onClick={() => { setRenaming(p.id); setNewName(p.name); }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-bg)]"><Icon name="pencil" className="h-4 w-4" /></button>
                  )}
                  <button type="button" onClick={() => revokePasskey(p.id).then(() => success(i18n("removed"))).catch((err) => showError(String(err)))} className="rounded p-1 text-[var(--danger)] hover:bg-[var(--panel-bg)]"><Icon name="trash-2" className="h-4 w-4" /></button>
                </div>
              </div>
            </Card3D>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">{i18n("devices")}</h2>
      <div className="space-y-2">
        {devices.length === 0 ? (
          <Card3D><p className="text-sm text-[var(--muted)]">{i18n("noDevices")}</p></Card3D>
        ) : (
          devices.map((d) => (
            <Card3D key={d.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{d.name || d.user_agent}</p>
                  <p className="text-xs text-[var(--muted)]">{i18n(d.trusted ? "trusted" : "untrusted")} — {formatDate(d.last_seen_at)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => trustDevice(d.id, !d.trusted).then(() => success(i18n("saved"))).catch((err) => showError(String(err)))} className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]">
                    {i18n(d.trusted ? "revoke" : "trust")}
                  </button>
                  <button type="button" onClick={() => removeDevice(d.id).then(() => success(i18n("removed"))).catch((err) => showError(String(err)))} className="rounded p-1 text-[var(--danger)] hover:bg-[var(--panel-bg)]"><Icon name="trash-2" className="h-4 w-4" /></button>
                </div>
              </div>
            </Card3D>
          ))
        )}
      </div>

      <h2 className="text-lg font-semibold">{i18n("securityEvents")}</h2>
      <div className="space-y-2">
        {loading ? (
          <Card3D><div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border)]" /></Card3D>
        ) : events.length === 0 ? (
          <Card3D><p className="text-sm text-[var(--muted)]">{i18n("noSecurityEvents")}</p></Card3D>
        ) : (
          events.slice(0, 50).map((event) => (
            <Card3D key={event.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.kind || event.action || i18n("event")}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{formatDate(event.created_at)}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                  {event.ip || event.status || "-"}
                </span>
              </div>
            </Card3D>
          ))
        )}
      </div>
      </div>
      </BiometricLock>
    </div>
  );
}
