"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSecurity, type DeviceWithCurrent } from "@/lib/hooks/useSecurity";
import { useToast } from "@/components/ToastProvider";
import { WorkerError } from "@/lib/api";
import Button from "@/components/ui/Button";
import SettingsRow from "./primitives/SettingsRow";
import SettingsDangerZone from "./primitives/SettingsDangerZone";

function deviceIcon(type?: string) {
  if (type === "mobile" || type === "tablet") return "smartphone";
  return "monitor";
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function DeviceRow({
  device,
  onTrust,
  onRevoke,
  onRemove,
  busy,
}: {
  device: DeviceWithCurrent;
  onTrust: (d: DeviceWithCurrent) => void;
  onRevoke: (d: DeviceWithCurrent) => void;
  onRemove: (d: DeviceWithCurrent) => void;
  busy: boolean;
}) {
  const i18n = useI18n();
  const isRevoked = Boolean(device.revoked_at);
  const descParts = [
    device.platform && device.browser ? `${device.platform} · ${device.browser}` : device.platform || device.browser,
    isRevoked
      ? `${i18n("revoked", "Révoqué")} · ${formatDate(device.revoked_at) ?? "-"}`
      : device.trusted
        ? i18n("trusted")
        : i18n("untrusted"),
    !isRevoked && formatDate(device.last_seen_at) ? `${i18n("lastSeen", "Vu")} ${formatDate(device.last_seen_at)}` : null,
  ].filter(Boolean);

  return (
    <SettingsRow
      icon={deviceIcon(device.type)}
      label={device.name}
      badge={device.current ? i18n("currentSession", "Session actuelle") : undefined}
      description={descParts.join(" · ")}
      control={
        <div className="flex items-center gap-1.5">
          {!isRevoked && (
            <button
              type="button"
              onClick={() => onTrust(device)}
              disabled={busy}
              className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {i18n(device.trusted ? "revoke" : "trust")}
            </button>
          )}
          {!isRevoked ? (
            <Button type="button" variant="danger" size="sm" onClick={() => onRevoke(device)} disabled={busy}>
              {i18n(device.current ? "signOut" : "revoke")}
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => onRemove(device)}
              disabled={busy}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              aria-label={i18n("removed", "Supprimer")}
            >
              <Icon name="trash-2" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      }
    />
  );
}

/**
 * The real "Sessions actives" surface — replaces PrivacySecuritySettings.tsx's
 * two hardcoded device rows (literal "Session actuelle · Windows (Chrome)"
 * text and a "Déconnecter" button with no onClick). Every row here comes
 * from GET /api/auth/devices; "current session" is computed by useSecurity
 * from the access token's session_id claim, not guessed from the row order.
 */
export default function SessionsManager() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { devices, events, loading, revokeDevice, revokeOtherDevices, trustDevice, removeDevice } = useSecurity();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const otherActiveCount = devices.filter((d) => !d.current && !d.revoked_at).length;

  async function handleTrust(device: DeviceWithCurrent) {
    setBusyId(device.id);
    try {
      await trustDevice(device.id, !device.trusted);
      success(i18n("saved"));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(device: DeviceWithCurrent) {
    const message = device.current
      ? i18n(
          "revokeCurrentConfirm",
          "Cette session est la vôtre : vous serez déconnecté immédiatement. Continuer ?"
        )
      : i18n("revokeConfirm", "Déconnecter cet appareil ? Il devra se reconnecter.");
    if (!window.confirm(message)) return;

    setBusyId(device.id);
    try {
      await revokeDevice(device.id, device.current);
      success(i18n("saved"));
    } catch (err) {
      if (err instanceof WorkerError && err.code === "CONFIRMATION_REQUIRED") {
        // Belt-and-suspenders: the Worker refused a same-session revoke that
        // wasn't explicitly confirmed. We already confirm above, but if this
        // ever fires (stale device list, race), ask again rather than fail.
        if (window.confirm(message)) {
          try {
            await revokeDevice(device.id, true);
            success(i18n("saved"));
          } catch (err2) {
            showError(err2 instanceof Error ? err2.message : String(err2));
          }
        }
      } else {
        showError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(device: DeviceWithCurrent) {
    if (!window.confirm(i18n("removeDeviceConfirm", "Supprimer définitivement cet appareil de la liste ?"))) return;
    setBusyId(device.id);
    try {
      await removeDevice(device.id);
      success(i18n("removed"));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeAllOthers() {
    if (otherActiveCount === 0) return;
    if (
      !window.confirm(
        i18n(
          "revokeAllOthersConfirm",
          "Déconnecter tous les autres appareils ? Ils devront se reconnecter. Cette action est immédiate."
        )
      )
    )
      return;
    setRevokingAll(true);
    try {
      const res = await revokeOtherDevices();
      success(i18n("revokedAllOthers", "Appareils déconnectés"), `${res?.revokedCount ?? 0} ${i18n("devices").toLowerCase()}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevokingAll(false);
    }
  }

  const recentEvents = events.slice(0, 8);

  return (
    <>
      {!loading && devices.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">{i18n("noDevices")}</div>
      )}

      {devices.map((device) => (
        <DeviceRow
          key={device.id}
          device={device}
          onTrust={handleTrust}
          onRevoke={handleRevoke}
          onRemove={handleRemove}
          busy={busyId === device.id}
        />
      ))}

      {devices.length > 0 && (
        <div className="p-4">
          <SettingsDangerZone
            title={i18n("dangerZone", "Zone de danger")}
            description={i18n(
              "revokeAllOthersDesc",
              "Déconnecte immédiatement toutes les sessions actives sauf celle-ci."
            )}
          >
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {i18n("signOutAllOthers", "Se déconnecter de tous les autres appareils")}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {otherActiveCount} {i18n(otherActiveCount > 1 ? "devices" : "device", otherActiveCount > 1 ? "appareils" : "appareil").toLowerCase()}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleRevokeAllOthers}
                isLoading={revokingAll}
                disabled={otherActiveCount === 0}
              >
                {i18n("signOutAll", "Déconnecter")}
              </Button>
            </div>
          </SettingsDangerZone>
        </div>
      )}

      {recentEvents.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="history" className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">{i18n("securityEvents")}</span>
          </div>
          <div className="flex flex-col divide-y divide-[var(--panel-border)]/60 overflow-hidden rounded-xl border border-[var(--panel-border)]">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-xs text-[var(--text-primary)]">{event.kind || event.action || i18n("event")}</span>
                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatDate(event.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
