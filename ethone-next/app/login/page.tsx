"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card3D from "@/components/Card3D";
import BrandMark from "@/components/BrandMark";
import { Icon } from "@/lib/icons";
import {
  sendOtp,
  verifyOtp,
  signInWithPassword,
  signInWithOAuth,
  signInWithPasskey,
  signUpWithPassword,
} from "@/lib/auth";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import {
  required,
  email as emailValidator,
  minLength,
  maxLength,
  passwordStrength,
  match,
  validate,
} from "@/lib/form-validation";

type AuthMode = "otp" | "password" | "register";

export default function LoginPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<"email" | "code">("email");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const emailError = validate(email, [
      required(i18n("fieldRequired")),
      emailValidator(i18n("emailInvalid")),
    ]);
    if (emailError) {
      setLoading(false);
      setError(emailError);
      showError(i18n("error"));
      return;
    }
    const result = await sendOtp(email);
    setLoading(false);
    if (!result.ok || result.error || !result.userId) {
      setError(result.error?.message || i18n("error"));
      showError(i18n("error"));
      return;
    }
    setUserId(result.userId);
    setStep("code");
    success(i18n("sent"));
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const codeError = validate(code, [
      required(i18n("fieldRequired")),
      minLength(6, i18n("invalidCode")),
    ]);
    if (codeError) {
      setLoading(false);
      setError(codeError);
      showError(i18n("error"));
      return;
    }
    if (!userId) {
      setLoading(false);
      setError(i18n("error"));
      showError(i18n("error"));
      return;
    }
    const { ok, error: err } = await verifyOtp(userId, email, code);
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
    const emailError = validate(email, [
      required(i18n("fieldRequired")),
      emailValidator(i18n("emailInvalid")),
    ]);
    const passwordError = validate(password, [required(i18n("fieldRequired"))]);
    const firstError = emailError || passwordError;
    if (firstError) {
      setLoading(false);
      setError(firstError);
      showError(i18n("error"));
      return;
    }
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const usernameError = validate(username.trim(), [
      required(i18n("fieldRequired")),
      minLength(2, i18n("usernameInvalid")),
      maxLength(64, i18n("usernameInvalid")),
    ]);
    const emailError = validate(email, [
      required(i18n("fieldRequired")),
      emailValidator(i18n("emailInvalid")),
    ]);
    const passwordError = validate(password, [
      required(i18n("fieldRequired")),
      passwordStrength(i18n("passwordRequirement")),
    ]);
    const confirmError = validate(confirmPassword, [
      required(i18n("fieldRequired")),
      match(() => password, i18n("passwordMismatch")),
    ]);
    const firstError = usernameError || emailError || passwordError || confirmError;
    if (firstError) {
      setLoading(false);
      setError(firstError);
      showError(i18n("error"));
      return;
    }
    const { ok, session, error: err } = await signUpWithPassword(email, password, username.trim());
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("error"));
      showError(i18n("error"));
      return;
    }
    if (session) {
      success(i18n("saved"));
      router.push("/");
    } else {
      success(i18n("checkEmail"));
    }
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
  const isRegister = mode === "register";
  const onSubmit = isRegister
    ? handleRegister
    : isOtp
      ? (step === "email" ? handleSend : handleVerify)
      : handlePassword;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-sm sm:max-w-md lg:max-w-lg"
      >
        <Card3D>
          <div className="mb-6 flex flex-col items-center text-center">
            <BrandMark size={72} className="mb-3" />
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">ETHONE</h1>
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">OS</span>
            </div>
            <p className="mt-1 break-words text-sm text-[var(--muted)]">
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
              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition-colors sm:px-2 sm:text-xs ${
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
              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition-colors sm:px-2 sm:text-xs ${
                mode === "password"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n("password")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setStep("email");
                setError(null);
              }}
              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-medium transition-colors sm:px-2 sm:text-xs ${
                isRegister
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {i18n("register")}
            </button>
          </div>

          {error && (
            <div className="mb-4 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
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
                className="flex w-full flex-wrap items-center justify-center gap-2 break-words rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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

              {isRegister && (
                <div className="relative">
                  <Icon name="user" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={64}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                    aria-label={i18n("username")} placeholder={i18n("username")}
                  />
                </div>
              )}

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

              {isRegister && (
                <div className="relative">
                  <Icon name="lock" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                    aria-label={i18n("confirmPassword")} placeholder={i18n("confirmPassword")}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full flex-wrap items-center justify-center gap-2 break-words rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                ) : isOtp ? (
                  <>
                    {i18n("sendCode")} <Icon name="arrow-right" className="h-4 w-4" />
                  </>
                ) : isRegister ? (
                  <>
                    {i18n("create")} <Icon name="sparkles" className="h-4 w-4" />
                  </>
                ) : (
                  i18n("signIn")
                )}
              </button>

              {!isRegister && (
                <>
                  <div className="relative flex items-center py-2">
                    <div className="flex-1 border-t border-[var(--border)]" />
                    <span className="px-2 text-xs text-[var(--muted)]">{i18n("orContinueWith")}</span>
                    <div className="flex-1 border-t border-[var(--border)]" />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      disabled={loading}
                      className="flex w-full flex-wrap items-center justify-center gap-2 break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                    >
                      <Icon name="chrome" className="h-4 w-4" /> {i18n("signInWithGoogle")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuth("github")}
                      disabled={loading}
                      className="flex w-full flex-wrap items-center justify-center gap-2 break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                    >
                      <Icon name="github" className="h-4 w-4" /> {i18n("signInWithGithub")}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasskey}
                    disabled={loading}
                    className="flex w-full flex-wrap items-center justify-center gap-2 break-words rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50"
                  >
                    <Icon name="key-round" className="h-4 w-4" /> {i18n("signInWithPasskey")}
                  </button>
                </>
              )}
            </form>
          )}
        </Card3D>
      </motion.div>
    </div>
  );
}
