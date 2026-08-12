"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card3D from "@/components/Card3D";
import BrandMark from "@/components/BrandMark";
import { Icon } from "@/lib/icons";
import {
  signInWithOtp,
  verifyEmailOtp,
  signInWithPassword,
  signInWithOAuth,
  signInWithPasskey,
} from "@/lib/auth";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";

type AuthMode = "otp" | "password";

export default function LoginPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithOtp(email);
    setLoading(false);
    if (err) {
      setError(err.message);
      showError(i18n("error"));
      return;
    }
    setStep("code");
    success(i18n("sent"));
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, error: err } = await verifyEmailOtp(email, code);
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("invalidCode"));
      showError(i18n("error"));
      return;
    }
    success(i18n("saved"));
    router.push("/");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, error: err } = await signInWithPassword(email, password);
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("invalidCredentials"));
      showError(i18n("error"));
      return;
    }
    success(i18n("saved"));
    router.push("/");
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    setError(null);
    const { ok, url, error: err } = await signInWithOAuth(provider);
    setLoading(false);
    if (!ok || err || !url) {
      setError(err?.message || i18n("error"));
      showError(i18n("error"));
      return;
    }
    window.location.href = url;
  }

  async function handlePasskey() {
    setLoading(true);
    setError(null);
    try {
      const { ok, error: err } = await signInWithPasskey(email);
      setLoading(false);
      if (!ok || err) {
        setError(err?.message || i18n("error"));
        showError(i18n("error"));
        return;
      }
      success(i18n("saved"));
      router.push("/");
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      showError(msg);
    }
  }

  const isOtp = mode === "otp";
  const onSubmit = isOtp ? (step === "email" ? handleSend : handleVerify) : handlePassword;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-sm"
      >
        <Card3D>
          <div className="mb-6 flex flex-col items-center text-center">
            <BrandMark size={72} className="mb-3" />
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">ETHONE</h1>
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">OS</span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {i18n("loginDescription")}
            </p>
          </div>

          <div className="mb-4 flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setStep("email");
                setError(null);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isOtp
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n("otp")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setStep("email");
                setError(null);
              }}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !isOtp
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n("password")}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {isOtp && step === "code" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="code">
                {i18n("codeReceived")}
              </label>
              <div className="relative">
                <Icon name="key-round" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                  aria-label={i18n("codePlaceholder")} placeholder={i18n("codePlaceholder")}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                ) : (
                  i18n("verify")
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {i18n("modifyEmail")}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="email">
                {i18n("email")}
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                  aria-label={i18n("emailPlaceholderLogin")} placeholder={i18n("emailPlaceholderLogin")}
                />
              </div>

              {!isOtp && (
                <div className="relative">
                  <Icon name="lock" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                    aria-label={i18n("password")} placeholder={i18n("password")}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                ) : isOtp ? (
                  <>
                    {i18n("sendCode")} <Icon name="arrow-right" className="h-4 w-4" />
                  </>
                ) : (
                  i18n("signIn")
                )}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-1 border-t border-[var(--border)]" />
                <span className="px-2 text-xs text-[var(--muted)]">{i18n("orContinueWith")}</span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                >
                  <Icon name="chrome" className="h-4 w-4" /> {i18n("signInWithGoogle")}
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                >
                  <Icon name="github" className="h-4 w-4" /> {i18n("signInWithGithub")}
                </button>
              </div>

              <button
                type="button"
                onClick={handlePasskey}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
              >
                <Icon name="key-round" className="h-4 w-4" /> {i18n("signInWithPasskey")}
              </button>
            </form>
          )}
        </Card3D>
      </motion.div>
    </div>
  );
}
