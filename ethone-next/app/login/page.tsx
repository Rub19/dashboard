"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginCosmicBackground from "@/components/LoginCosmicBackground";
import Switch from "@/components/Switch";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
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
import { hapticErrorPattern } from "@/lib/haptics";
import AppleSignInButton from "@/components/AppleSignInButton";
import PasswordField from "@/components/PasswordField";
import { isPasswordPwned } from "@/lib/password-strength";
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
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    const result = await sendOtp(email);
    setLoading(false);
    if (!result.ok || result.error || !result.userId) {
      setError(result.error?.message || i18n("error"));
      hapticErrorPattern();
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
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    if (!userId) {
      setLoading(false);
      setError(i18n("error"));
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    const { ok, error: err } = await verifyOtp(userId, email, code, rememberMe);
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("invalidCode"));
      hapticErrorPattern();
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
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    const { ok, error: err } = await signInWithPassword(email, password, rememberMe);
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("invalidCredentials"));
      hapticErrorPattern();
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
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    const pwned = await isPasswordPwned(password);
    if (pwned) {
      setLoading(false);
      setError(i18n("passwordPwned") || "Ce mot de passe a été compromis dans une fuite de données. Choisissez-en un autre.");
      hapticErrorPattern();
      showError(i18n("error"));
      return;
    }
    const { ok, session, error: err } = await signUpWithPassword(email, password, username.trim());
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("error"));
      hapticErrorPattern();
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
      hapticErrorPattern();
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
        hapticErrorPattern();
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
    <div className="relative flex h-full min-h-0 w-full select-none items-stretch overflow-hidden bg-[#0A0A0A]">
      <LoginCosmicBackground />
      <div className="relative z-10 hidden h-full min-h-0 w-1/2 flex-col justify-between p-10 lg:flex lg:bg-gradient-to-r lg:from-[#030712]/70 lg:via-[#030712]/25 lg:to-transparent">
        <div className="z-10 flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-lg font-bold tracking-tight">ETHONE</span>
          <span className="rounded border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">OS</span>
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
          <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 px-3 py-1.5 backdrop-blur-[var(--panel-blur)]">
            <span className="h-2 w-2 rounded-full bg-[--accent-primary] shadow-[0_0_6px_var(--glow-color)]" />
            {i18n("systemOperational")}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden p-4 lg:w-1/2 lg:p-6">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LanguageSwitcher />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" as const }}
          className="h-full min-h-0 w-full min-w-[min(100%,20rem)] max-w-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll px-0.5">
            <div className="relative flex w-full flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
                <BrandMark size={40} />
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">{i18n("welcomeBack")}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{i18n("loginDescription")}</p>
            </div>

            {(() => {
              const modes: AuthMode[] = ["otp", "password", "register"];
              return (
                <div className="relative mt-4 flex rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/50 p-1 backdrop-blur-[var(--panel-blur)]">
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
                        className={`relative z-10 min-w-0 flex-1 select-none whitespace-nowrap rounded-[var(--panel-radius)] px-0.5 py-2 text-[10px] font-semibold tracking-wide transition-colors active:scale-[0.98] sm:px-2 sm:text-[11px] ${
                          active ? "text-[var(--accent-contrast)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="activeAuthTab"
                            initial={false}
                            transition={{ duration: 0.15, ease: "easeOut" as const }}
                            className="absolute inset-0 rounded-[var(--panel-radius)] bg-[var(--accent)]"
                          />
                        )}
                        <span className="relative z-10 block truncate">
                          {m === "otp" ? i18n("otp") : m === "password" ? i18n("password") : i18n("register")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {error && (
              <div className="relative mt-3 rounded-[var(--panel-radius)] border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            <motion.div
              layout
              transition={{ duration: 0.15, ease: "easeOut" as const }}
              className="relative mt-3 overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isOtp && step === "code" ? `otp-${step}` : mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" as const }}
                  className="relative"
                >
                {isOtp && step === "code" ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <FormField label={i18n("codeReceived")}>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    inputSize="large"
                    icon="key-round"
                    className="w-full"
                    aria-label={i18n("codePlaceholder")}
                    placeholder={i18n("codePlaceholder")}
                  />
                </FormField>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_0_15px_var(--glow-color)] transition-colors duration-150 hover:opacity-90 hover:shadow-[0_0_20px_var(--glow-color)] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : i18n("verify")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
                >
                  {i18n("modifyEmail")}
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="relative mt-3 space-y-3">
                <FormField label={i18n("email")}>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputSize="large"
                    icon="mail"
                    className="w-full"
                    aria-label={i18n("emailPlaceholderLogin")}
                    placeholder={i18n("emailPlaceholderLogin")}
                  />
                </FormField>

                {isRegister && (
                  <FormField label={i18n("username")}>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      minLength={2}
                      maxLength={64}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      inputSize="large"
                      icon="user"
                      className="w-full"
                      aria-label={i18n("username")}
                      placeholder={i18n("username")}
                    />
                  </FormField>
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
                          className="text-[11px] text-[var(--accent)] transition-opacity hover:opacity-80 active:scale-[0.98]"
                        >
                          {i18n("forgotPassword")}
                        </Link>
                      )}
                    </div>
                    <PasswordField
                      id="password"
                      value={password}
                      onChange={setPassword}
                      placeholder={i18n("password")}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      showStrength={isRegister}
                      showGenerator={isRegister}
                    />
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--muted)]" htmlFor="confirmPassword">
                      {i18n("confirmPassword")}
                    </label>
                    <PasswordField
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder={i18n("confirmPassword")}
                      autoComplete="new-password"
                      showStrength={false}
                      showGenerator={false}
                    />
                  </div>
                )}

                {!isRegister && (
                  <div className="flex items-center justify-between gap-3">
                    <Switch
                      checked={rememberMe}
                      onChange={setRememberMe}
                      label={i18n("rememberMe")}
                      labels={false}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="sign-in-button"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_0_15px_var(--glow-color)] transition-colors duration-150 hover:opacity-90 hover:shadow-[0_0_20px_var(--glow-color)] active:scale-[0.98] disabled:opacity-50"
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
                      <div className="flex-1 border-t border-[var(--panel-border)]" />
                      <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                        {i18n("orContinueWith")}
                      </span>
                      <div className="flex-1 border-t border-[var(--panel-border)]" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleOAuth("google")}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--panel-bg)] active:scale-[0.98] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
                      >
                        <GoogleIcon className="h-5 w-5" /> {i18n("signInWithGoogle")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth("github")}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--panel-bg)] active:scale-[0.98] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
                      >
                        <GithubIcon className="h-5 w-5" /> {i18n("signInWithGithub")}
                      </button>
                      <AppleSignInButton disabled={loading} />
                    </div>

                    <button
                      type="button"
                      onClick={handlePasskey}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--panel-bg)] active:scale-[0.98] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
                    >
                      <Icon name="key-round" className="h-4 w-4" /> {i18n("signInWithPasskey")}
                    </button>
                  </>
                )}

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setMode(isRegister ? "password" : "register")}
                    className="text-center text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] active:scale-[0.98]"
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
            </div>
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
