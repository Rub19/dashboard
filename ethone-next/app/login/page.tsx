"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Switch from "@/components/Switch";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
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
  const [mode, setMode] = useState<AuthMode>("password");
  const [step, setStep] = useState<"email" | "code">("email");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    if (rememberMe) {
      localStorage.setItem("ethone-remember-me", "true");
    } else {
      localStorage.removeItem("ethone-remember-me");
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
      ? step === "email"
        ? handleSend
        : handleVerify
      : handlePassword;

  return (
    <div className="flex min-h-screen w-full">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#09090b] via-[#0f0f13] to-[#1a1a2e] p-10 lg:flex">
        <div className="z-10 flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-lg font-bold tracking-tight">ETHONE</span>
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">OS</span>
        </div>

        <div className="z-10 max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            {i18n("environmentPersonal")}
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tighter">ETHONE</h1>
          <p className="mt-2 text-xl font-light text-[var(--muted)]">
            {i18n("yourDigitalEnvironment")}{" "}
            <span className="font-medium text-[var(--foreground)]">{i18n("reinventedAroundYou")}</span>
          </p>
        </div>

        <div className="z-10 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            {i18n("systemOperational")}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -bottom-32 -right-32 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)] blur-[140px]" />
          <div className="absolute -left-32 -top-32 h-[24rem] w-[24rem] rounded-full bg-violet-600/50 blur-[120px]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgNjBWMGg2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')] opacity-50" />
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center bg-[var(--background)] p-4 pt-16 sm:p-6 sm:pt-20 lg:w-1/2 lg:p-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LanguageSwitcher />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative flex min-h-[540px] w-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 shadow-2xl backdrop-blur-xl sm:min-h-[600px] sm:p-8 lg:min-h-[720px]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
                <BrandMark size={36} />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">{i18n("welcomeBack")}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{i18n("loginDescription")}</p>
            </div>

            {(() => {
              const modes: AuthMode[] = ["otp", "password", "register"];
              const activeIndex = modes.indexOf(mode);
              return (
                <div className="relative mt-6 flex rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/50 p-1">
                  {modes.map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMode(m);
                          setStep("email");
                          setError(null);
                        }}
                        className={`relative z-10 min-w-0 flex-1 select-none whitespace-nowrap rounded-xl px-0.5 py-2 text-[10px] font-semibold tracking-wide transition-colors sm:px-2 sm:text-[11px] ${
                          active ? "text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span className="block truncate">
                          {m === "otp" ? i18n("otp") : m === "password" ? i18n("password") : i18n("register")}
                        </span>
                      </button>
                    );
                  })}
                  <motion.div
                    className="absolute inset-y-1 w-1/3 rounded-xl bg-[var(--accent)]"
                    initial={false}
                    animate={{ left: `${(activeIndex * 100) / 3}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                </div>
              );
            })()}

            {error && (
              <div className="relative mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isOtp && step === "code" ? `otp-${step}` : mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="relative mt-5"
              >
                {isOtp && step === "code" ? (
              <form onSubmit={handleVerify} className="space-y-5">
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
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                    aria-label={i18n("codePlaceholder")}
                    placeholder={i18n("codePlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:opacity-90 hover:shadow-[var(--accent)]/30 disabled:opacity-50"
                >
                  {loading ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : i18n("verify")}
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
              <form onSubmit={onSubmit} className="relative mt-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--muted)]" htmlFor="email">
                    {i18n("email")}
                  </label>
                  <div className="relative">
                    <Icon name="mail" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                      aria-label={i18n("emailPlaceholderLogin")}
                      placeholder={i18n("emailPlaceholderLogin")}
                    />
                  </div>
                </div>

                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--muted)]" htmlFor="username">
                      {i18n("username")}
                    </label>
                    <div className="relative">
                      <Icon name="user" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        required
                        minLength={2}
                        maxLength={64}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                        aria-label={i18n("username")}
                        placeholder={i18n("username")}
                      />
                    </div>
                  </div>
                )}

                {!isOtp && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[var(--muted)]" htmlFor="password">
                        {i18n("password")}
                      </label>
                      {!isRegister && (
                        <Link
                          href="/password-recovery/"
                          className="text-[11px] text-[var(--accent)] transition-opacity hover:opacity-80"
                        >
                          {i18n("forgotPassword")}
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Icon name="lock" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-10 pr-10 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                        aria-label={i18n("password")}
                        placeholder={i18n("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                        aria-label={showPassword ? i18n("hidePassword") : i18n("showPassword")}
                        title={showPassword ? i18n("hidePassword") : i18n("showPassword")}
                      >
                        <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--muted)]" htmlFor="confirmPassword">
                      {i18n("confirmPassword")}
                    </label>
                    <div className="relative">
                      <Icon name="lock" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
                        aria-label={i18n("confirmPassword")}
                        placeholder={i18n("confirmPassword")}
                      />
                    </div>
                  </div>
                )}

                {!isRegister && (
                  <div className="flex items-center justify-between gap-3">
                    <Switch
                      checked={rememberMe}
                      onChange={setRememberMe}
                      label={i18n("rememberMe")}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="sign-in-button"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:opacity-90 hover:shadow-[var(--accent)]/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                      {isOtp ? i18n("sending") : i18n("loading")}
                    </>
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
                    <div className="relative flex items-center py-1">
                      <div className="flex-1 border-t border-[var(--border)]" />
                      <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                        {i18n("orContinueWith")}
                      </span>
                      <div className="flex-1 border-t border-[var(--border)]" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleOAuth("google")}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                      >
                        <GoogleIcon className="h-5 w-5" /> {i18n("signInWithGoogle")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth("github")}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                      >
                        <GithubIcon className="h-5 w-5" /> {i18n("signInWithGithub")}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handlePasskey}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      <Icon name="key-round" className="h-4 w-4" /> {i18n("signInWithPasskey")}
                    </button>
                  </>
                )}

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setMode(isRegister ? "password" : "register")}
                    className="text-center text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {isRegister ? i18n("hasAccount") : i18n("noAccount")}
                    <span className="ml-1 font-medium text-[var(--accent)]">
                      {isRegister ? i18n("signIn") : i18n("register")}
                    </span>
                  </button>
                </div>
              </form>
            )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--muted)] lg:hidden">
            <BrandMark size={18} />
            <span className="font-semibold">ETHONE</span>
            <span>OS</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
