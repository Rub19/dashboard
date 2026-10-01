"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthScreen from "@/components/auth/AuthScreen";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import AuthInputField from "@/components/auth/AuthInputField";
import Button from "@/components/ui/Button";
import { ShieldCheck, KeyRound, AlertCircle, LogOut } from "@/components/icons/ph";
import { triggerHaptic } from "@/lib/haptics";
import { stepEnter } from "@/lib/motion-variants";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

type Mode = "code" | "backup";
type Status = "idle" | "verifying" | "error";

export default function VerifyMfaPage() {
  const { verifyMfaChallenge, signOut } = useAuth();
  const router = useRouter();
  const { reduced } = useMotionPref();
  const [mode, setMode] = useState<Mode>("code");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function submit(input: { code?: string; backupCode?: string }) {
    setStatus("verifying");
    setErrorMessage(null);
    const { error } = await verifyMfaChallenge(input);
    if (error) {
      triggerHaptic("medium");
      setStatus("error");
      setErrorMessage(
        error.message.toLowerCase().includes("totp_invalid") || error.message.toLowerCase().includes("invalid")
          ? "Code invalide. Vérifie ton application d'authentification et réessaie."
          : error.message || "Impossible de vérifier ce code pour le moment."
      );
      setCode("");
      return;
    }
    setStatus("idle");
    router.replace("/");
  }

  function handleBackupSubmit(e: FormEvent) {
    e.preventDefault();
    if (backupCode.trim().length !== 8) return;
    submit({ backupCode: backupCode.trim() });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <AuthScreen>
      <AuthCardShell
        icon={<ShieldCheck className="h-7 w-7 text-[var(--success)]" />}
        title={mode === "code" ? "Entre ton code de vérification" : "Utilise un code de secours"}
        subtitle={
          mode === "code"
            ? "Ouvre ton application d'authentification (Google Authenticator, Authy, etc.) et saisis le code à 6 chiffres."
            : "Saisis l'un des codes de secours que tu as sauvegardés lors de l'activation de la double authentification. Chaque code n'est utilisable qu'une seule fois."
        }
      >
        <AnimatePresence mode="wait">
          {mode === "code" ? (
            <motion.div key="code" variants={stepEnter} initial={reduced ? "animate" : "initial"} animate="animate" exit="exit">
              <OtpCodeInput
                value={code}
                onChange={setCode}
                onComplete={(value) => submit({ code: value })}
                disabled={status === "verifying"}
                error={status === "error"}
                state={status === "verifying" ? "verifying" : status === "error" ? "error" : "idle"}
              />
            </motion.div>
          ) : (
            <motion.form
              key="backup"
              variants={stepEnter}
              initial={reduced ? "animate" : "initial"}
              animate="animate"
              exit="exit"
              onSubmit={handleBackupSubmit}
              className="flex flex-col gap-4"
            >
              <AuthInputField
                label="Code de secours"
                leftIcon={<KeyRound className="h-4 w-4" />}
                placeholder="A1B2C3D4"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={8}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                disabled={status === "verifying"}
                error={status === "error" ? errorMessage || undefined : undefined}
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={status === "verifying"}
                disabled={backupCode.trim().length !== 8}
                className="h-12 w-full rounded-2xl text-sm"
              >
                Valider le code de secours
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {status === "error" && mode === "code" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-start gap-2 rounded-[var(--inset-radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-[var(--panel-border)] pt-5 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "code" ? "backup" : "code"));
              setStatus("idle");
              setErrorMessage(null);
              setCode("");
              setBackupCode("");
            }}
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            {mode === "code" ? "Utiliser un code de secours à la place" : "Utiliser mon application d'authentification"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{signingOut ? "Déconnexion…" : "Se déconnecter"}</span>
          </button>
        </div>
      </AuthCardShell>
    </AuthScreen>
  );
}
