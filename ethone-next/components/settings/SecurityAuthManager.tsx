"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSecurity, type TotpSetupResult } from "@/lib/hooks/useSecurity";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { WorkerError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import SettingsRow from "./primitives/SettingsRow";

type TotpStep = "idle" | "checking" | "setup" | "enabled" | "verifying" | "disabling";

/**
 * Real 2FA (TOTP) setup/verify/disable, replacing SettingsContent.tsx's old
 * hardcoded disabled "Bientôt" toggle, plus the passkey management block
 * ported from the old /security page (now redirecting here — see
 * app/security/page.tsx).
 *
 * There is no GET status route for TOTP on the Worker (only setup/verify/
 * disable — see worker/src/routes/security-identity.js), so this never
 * shows an enabled/disabled badge before it actually knows: it starts
 * neutral and only learns the real state once the user opens the flow,
 * at which point POST /api/auth/totp/setup either succeeds (not yet
 * enabled — proceed to the QR/code step) or fails with 409
 * TOTP_ALREADY_ENABLED (already enabled — show the disable step instead).
 */
export default function SecurityAuthManager() {
  const i18n = useI18n();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const {
    passkeys,
    loading,
    registerPasskey,
    revokePasskey,
    renamePasskey,
    totpSetup,
    totpVerify,
    totpDisable,
  } = useSecurity();

  const [totpStep, setTotpStep] = useState<TotpStep>("idle");
  const [totpData, setTotpData] = useState<TotpSetupResult | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [passkeyName, setPasskeyName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function formatDate(iso?: string) {
    try {
      return iso ? new Date(iso).toLocaleString() : "-";
    } catch {
      return iso || "-";
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      success(i18n("copied", "Copié dans le presse-papiers"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function openTotpFlow() {
    const email = user?.email;
    if (!email) {
      showError(i18n("error"));
      return;
    }
    setTotpStep("checking");
    setCodeError(null);
    try {
      const data = await totpSetup(email);
      if (data) {
        setTotpData(data);
        setTotpStep("setup");
      } else {
        setTotpStep("idle");
      }
    } catch (err) {
      if (err instanceof WorkerError && err.code === "TOTP_ALREADY_ENABLED") {
        setTotpStep("enabled");
        return;
      }
      showError(err instanceof Error ? err.message : String(err));
      setTotpStep("idle");
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      setCodeError(i18n("totpCodeInvalid", "Entrez un code à 6 chiffres."));
      return;
    }
    setTotpStep("verifying");
    setCodeError(null);
    try {
      const res = await totpVerify(code);
      if (res?.enabled) {
        success(i18n("totpEnabled", "Double authentification activée"));
        setTotpStep("enabled");
        setTotpData(null);
        setCode("");
      } else {
        setTotpStep("setup");
      }
    } catch (err) {
      setTotpStep("setup");
      if (err instanceof WorkerError && err.code === "TOTP_INVALID") {
        setCodeError(i18n("totpCodeWrong", "Code incorrect. Réessayez."));
      } else {
        showError(err instanceof Error ? err.message : String(err));
      }
    }
  }

  async function handleDisable() {
    if (!window.confirm(i18n("totpDisableConfirm", "Désactiver la double authentification ? Votre compte sera moins protégé."))) return;
    setTotpStep("disabling");
    try {
      await totpDisable();
      success(i18n("totpDisabled", "Double authentification désactivée"));
      setTotpStep("idle");
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
      setTotpStep("enabled");
    }
  }

  function cancelSetup() {
    setTotpStep("idle");
    setTotpData(null);
    setCode("");
    setCodeError(null);
  }

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
      showError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRename(id: string) {
    try {
      await renamePasskey(id, newName);
      success(i18n("saved"));
      setRenaming(null);
      setNewName("");
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRevokePasskey(id: string) {
    if (!window.confirm(i18n("passkeyRevokeConfirm", "Supprimer ce passkey ?"))) return;
    try {
      await revokePasskey(id);
      success(i18n("removed"));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  }

  const totpControl = (() => {
    switch (totpStep) {
      case "enabled":
        return (
          <Button type="button" variant="danger" size="sm" onClick={handleDisable}>
            {i18n("totpDisable", "Désactiver")}
          </Button>
        );
      case "disabling":
        return (
          <Button type="button" variant="danger" size="sm" isLoading>
            {i18n("totpDisable", "Désactiver")}
          </Button>
        );
      case "checking":
        return (
          <Button type="button" variant="secondary" size="sm" isLoading>
            {i18n("totpConfigure", "Configurer")}
          </Button>
        );
      case "setup":
      case "verifying":
        return (
          <Button type="button" variant="ghost" size="sm" onClick={cancelSetup}>
            {i18n("cancel", "Annuler")}
          </Button>
        );
      case "idle":
      default:
        return (
          <Button type="button" variant="secondary" size="sm" onClick={openTotpFlow}>
            {i18n("totpConfigure", "Configurer")}
          </Button>
        );
    }
  })();

  return (
    <>
      <div>
        <SettingsRow
          icon="shield-check"
          label={i18n("totpTitle", "Authentification à deux facteurs (TOTP)")}
          description={
            totpStep === "enabled" || totpStep === "disabling"
              ? i18n("totpEnabledDesc", "Un code depuis votre application d'authentification est requis en plus de votre mot de passe.")
              : i18n("totpDesc", "Ajoutez une couche de sécurité avec une application comme Google Authenticator ou 1Password.")
          }
          badge={totpStep === "enabled" || totpStep === "disabling" ? i18n("active", "Activé") : undefined}
          control={totpControl}
        />

        {(totpStep === "setup" || totpStep === "verifying") && totpData && (
          <div className="flex flex-col gap-3 border-t border-[var(--panel-border)] bg-[var(--surface-sunken)]/40 px-4 py-4">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {i18n("totpStep1", "1. Ajoutez ce compte dans votre application d'authentification")}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {i18n("totpManualEntry", "Entrez cette clé manuellement (\"configuration manuelle\" / \"entrer une clé\") :")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-xs">
                  {totpData.secret}
                </code>
                <button
                  type="button"
                  onClick={() => copy(totpData.secret)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                  aria-label={i18n("copy", "Copier")}
                >
                  <Icon name="copy" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {i18n("totpBackupCodes", "Codes de secours (à conserver en lieu sûr)")}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {totpData.backupCodes.map((c) => (
                  <code key={c} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-center text-[11px]">
                    {c}
                  </code>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {i18n("totpStep2", "2. Entrez le code à 6 chiffres généré")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                  placeholder="123456"
                  aria-label={i18n("totpStep2", "Code à 6 chiffres")}
                  inputSize="compact"
                  className="w-28"
                />
                <Button type="button" variant="primary" size="sm" onClick={handleVerify} isLoading={totpStep === "verifying"}>
                  {i18n("totpActivate", "Activer")}
                </Button>
              </div>
              {codeError && <p className="mt-1.5 text-xs text-[var(--danger)]">{codeError}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Icon name="key-round" className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">{i18n("passkeys")}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            placeholder={i18n("passkeyName")}
            aria-label={i18n("passkeyName")}
            inputSize="compact"
            className="min-w-0 flex-1"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleRegisterPasskey}>
            {i18n("addPasskey")}
          </Button>
        </div>

        {!loading && passkeys.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">{i18n("noPasskeys")}</p>
        )}

        {passkeys.length > 0 && (
          <div className="flex flex-col divide-y divide-[var(--panel-border)]/60 overflow-hidden rounded-xl border border-[var(--panel-border)]">
            {passkeys.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
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
                    <p className="text-xs font-medium text-[var(--text-primary)]">{p.name}</p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)]">{formatDate(p.last_used_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {renaming === p.id ? (
                    <button type="button" onClick={() => handleRename(p.id)} className="rounded p-1.5 text-[var(--success)] hover:bg-[var(--surface-hover)]" aria-label={i18n("saved")}>
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setRenaming(p.id); setNewName(p.name); }} className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" aria-label={i18n("rename", "Renommer")}>
                      <Icon name="pencil" className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => handleRevokePasskey(p.id)} className="rounded p-1.5 text-[var(--danger)] hover:bg-[var(--surface-hover)]" aria-label={i18n("revoke")}>
                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
