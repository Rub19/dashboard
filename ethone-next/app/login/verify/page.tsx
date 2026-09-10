"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import BrandMark from "@/components/BrandMark";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import AuthInputField from "@/components/auth/AuthInputField";
import { ShieldCheck, KeyRound, AlertCircle, Loader2, LogOut } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

type Mode = "code" | "backup";
type Status = "idle" | "verifying" | "error";

export default function VerifyMfaPage() {
  const { verifyMfaChallenge, signOut } = useAuth();
  const router = useRouter();
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
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[var(--bg-main,#0E1015)] p-4 text-white selection:bg-[var(--accent-primary,#C1234F)]/30 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-[420px] rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl sm:p-9"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg">
            <BrandMark size={26} />
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Vérification en deux étapes</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {mode === "code" ? "Entre ton code de vérification" : "Utilise un code de secours"}
          </h1>
          <p className="max-w-xs text-sm text-zinc-400">
            {mode === "code"
              ? "Ouvre ton application d'authentification (Google Authenticator, Authy, etc.) et saisis le code à 6 chiffres."
              : "Saisis l'un des codes de secours que tu as sauvegardés lors de l'activation de la double authentification. Chaque code n'est utilisable qu'une seule fois."}
          </p>
        </div>

        <div className="mt-7">
          <AnimatePresence mode="wait">
            {mode === "code" ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
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
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
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
                <button
                  type="submit"
                  disabled={status === "verifying" || backupCode.trim().length !== 8}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary,#C1234F)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "verifying" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Valider le code de secours</span>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {status === "error" && mode === "code" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/10 pt-5 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "code" ? "backup" : "code"));
              setStatus("idle");
              setErrorMessage(null);
              setCode("");
              setBackupCode("");
            }}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            {mode === "code" ? "Utiliser un code de secours à la place" : "Utiliser mon application d'authentification"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{signingOut ? "Déconnexion…" : "Se déconnecter"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
