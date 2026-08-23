"use client";

import { useEffect, useState, type ReactNode, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Switch from "@/components/Switch";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import DiscordIcon from "@/components/DiscordIcon";
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

function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}

type InputFieldProps = {
  id: string;
  type?: string;
  value: string;
  onChange?: (value: string) => void;
  onInputChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  icon: string;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  inputMode?: "numeric" | "email" | "text";
  disabled?: boolean;
  right?: ReactNode;
  ariaLabel?: string;
};

function InputField({
  id,
  type = "text",
  value,
  onChange,
  onInputChange,
  label,
  icon,
  placeholder,
  autoComplete,
  required,
  minLength,
  maxLength,
  inputMode,
  disabled,
  right,
  ariaLabel,
}: InputFieldProps) {
  const paddingRight = right ? "2.75rem" : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[var(--muted)]"
      >
        {label}
      </label>
      <div
        className="group relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15 focus-within:shadow-[0_0_20px_-8px_var(--accent)]"
      >
        <span className="pointer-events-none absolute left-3 flex items-center text-[var(--muted)] transition-colors group-focus-within:text-[var(--accent)]">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onInputChange || ((e) => onChange?.(e.target.value))}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
          className="w-full rounded-2xl bg-transparent py-3 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-colors disabled:opacity-50"
          style={{ paddingRight }}
        />
        {right && (
          <div className="absolute right-2.5 flex items-center">{right}</div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const reduced = !!prefersReduced;
  const online = useOnlineStatus();

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
    const firstError =
      usernameError || emailError || passwordError || confirmError;
    if (firstError) {
      setLoading(false);
      setError(firstError);
      showError(i18n("error"));
      return;
    }
    const { ok, session, error: err } = await signUpWithPassword(
      email,
      password,
      username.trim()
    );
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

  async function handleOAuth(provider: "google" | "github" | "discord") {
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

  function setAuthMode(next: AuthMode) {
    setMode(next);
    setStep("email");
    setError(null);
  }

  const surfaceVariants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 20, scale: reduced ? 1 : 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 30 },
    },
  } satisfies Variants;

  const containerVariants = {
    hidden: { opacity: reduced ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reduced ? 0 : 0.05,
        delayChildren: reduced ? 0 : 0.05,
      },
    },
  } satisfies Variants;

  const itemVariants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 320, damping: 32 },
    },
  } satisfies Variants;

  const formTransition = { duration: reduced ? 0 : 0.2, ease: "easeInOut" as const };

  const modes: AuthMode[] = ["otp", "password", "register"];
  const activeIndex = modes.indexOf(mode);

  const submitIcon =
    !loading && isOtp && step === "email" ? (
      <Icon name="arrow-right" className="h-4 w-4" />
    ) : !loading && isRegister ? (
      <Icon name="sparkles" className="h-4 w-4" />
    ) : null;

  let submitLabel = i18n("signIn");
  if (isOtp) {
    submitLabel = step === "email" ? i18n("sendCode") : i18n("verify");
  } else if (isRegister) {
    submitLabel = i18n("create");
  }

  const loadingLabel =
    isOtp && step === "email" ? i18n("sending") : i18n("authLoading");

  function handleLeftMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  const statusDotColor = online ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="flex min-h-screen w-full bg-[var(--background)]">
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex"
        onMouseMove={handleLeftMouseMove}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--surface)] via-[var(--background)] to-[var(--surface-raised)]" />

        <motion.div
          animate={
            reduced
              ? undefined
              : { x: [0, 30, -20, 0], y: [0, -20, 20, 0] }
          }
          transition={{ duration: 28, repeat: Infinity, ease: "linear" as const }}
          className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--accent)]/20 blur-[140px]"
        />
        <motion.div
          animate={
            reduced
              ? undefined
              : { x: [0, -20, 30, 0], y: [0, 30, -10, 0] }
          }
          transition={{ duration: 34, repeat: Infinity, ease: "linear" as const }}
          className="pointer-events-none absolute -left-32 -top-32 h-[24rem] w-[24rem] rounded-full bg-[var(--v8-ambient-accent,var(--accent))]/30 blur-[120px]"
        />
        <motion.div
          animate={
            reduced
              ? undefined
              : { x: [0, 20, -30, 0], y: [0, -30, 20, 0] }
          }
          transition={{ duration: 22, repeat: Infinity, ease: "linear" as const }}
          className="pointer-events-none absolute left-1/3 top-1/3 h-[18rem] w-[18rem] rounded-full bg-[var(--accent)]/15 blur-[100px]"
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgNjBWMGg2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')",
            backgroundSize: "60px 60px",
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), color-mix(in srgb, var(--accent) 10%, transparent), transparent 40%)",
          }}
        />

        <div className="z-10 flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={
                reduced
                  ? undefined
                  : { opacity: [0.45, 0.85, 0.45], scale: [1, 1.12, 1] }
              }
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }}
              className="absolute -inset-3 rounded-2xl bg-[var(--accent)]/30 blur-xl"
            />
            <BrandMark size={34} className="relative z-10" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">ETHONE</span>
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              OS
            </span>
          </div>
        </div>

        <div className="z-10 max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">
            {i18n("environmentPersonal")}
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tighter text-[var(--foreground)] lg:text-6xl xl:text-7xl">
            ETHONE
          </h1>
          <p className="mt-4 text-xl font-light leading-relaxed text-[var(--muted)]">
            {i18n("yourDigitalEnvironment")}{" "}
            <span className="font-medium text-[var(--foreground)]">
              {i18n("reinventedAroundYou")}
            </span>
          </p>
        </div>

        <div className="z-10 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2 shadow-lg backdrop-blur-md">
            <span className="relative inline-flex h-2 w-2">
              <motion.span
                animate={
                  reduced
                    ? undefined
                    : { scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }
                }
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" as const }}
                className={`absolute inset-0 rounded-full ${statusDotColor}`}
              />
              <span className={`relative h-2 w-2 rounded-full ${statusDotColor}`} />
            </span>
            {i18n("systemOperational")}
          </span>
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center p-4 pt-20 sm:p-6 sm:pt-24 lg:w-1/2 lg:p-10">
        <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
          <LanguageSwitcher />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-md xl:max-w-lg"
        >
          <div className="pointer-events-none absolute -inset-1 rounded-[2.25rem] bg-gradient-to-br from-[var(--accent)]/20 via-transparent to-[var(--accent)]/10 blur-2xl" />

          <motion.div
            variants={surfaceVariants}
            className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/85 p-6 backdrop-blur-2xl sm:p-8 lg:p-10"
            style={{
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <motion.div
              variants={itemVariants}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20 shadow-[0_0_24px_-8px_var(--accent)]">
                <BrandMark size={38} />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                {i18n("welcomeBack")}
              </h2>
              <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-[var(--muted)]">
                {i18n("loginDescription")}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-6">
              <div
                role="tablist"
                aria-label={i18n("auth")}
                className="relative grid grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
              >
                {modes.map((m) => {
                  const active = mode === m;
                  const label =
                    m === "otp"
                      ? i18n("otp")
                      : m === "password"
                        ? i18n("password")
                        : i18n("register");
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setAuthMode(m)}
                      disabled={loading}
                      className={`relative z-10 select-none rounded-xl px-1 py-2.5 text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] sm:px-2 sm:text-xs ${
                        active
                          ? "text-white"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span className="block truncate">{label}</span>
                    </button>
                  );
                })}
                <motion.div
                  className="absolute inset-y-1 rounded-xl bg-[var(--accent)] shadow-[0_0_16px_-4px_var(--accent)]"
                  initial={false}
                  animate={{ left: `${(activeIndex * 100) / 3}%` }}
                  style={{ width: `${100 / 3}%` }}
                  transition={{ type: "spring" as const, stiffness: 400, damping: 35 }}
                />
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={formTransition}
                  className="mt-5 overflow-hidden"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    <Icon name="alert-circle" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative mt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isOtp && step === "code" ? `otp-${step}` : mode}
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -8 }}
                  transition={formTransition}
                >
                  {isOtp && step === "code" ? (
                    <form onSubmit={handleVerify} className="space-y-5">
                      <InputField
                        id="code"
                        label={i18n("codeReceived")}
                        icon="key-round"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={code}
                        onInputChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder={i18n("codePlaceholder")}
                        ariaLabel={i18n("codePlaceholder")}
                        disabled={loading}
                      />

                      <button
                        type="submit"
                        disabled={loading}
                        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-8px_var(--accent)] transition-all duration-200 hover:brightness-[1.1] hover:shadow-[0_0_32px_-6px_var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading && (
                          <Icon
                            name="loader-2"
                            className="h-4 w-4 animate-spin"
                          />
                        )}
                        <span>{loading ? loadingLabel : i18n("verify")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="w-full text-center text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                      >
                        {i18n("modifyEmail")}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={onSubmit} className="space-y-5">
                      <InputField
                        id="email"
                        label={i18n("email")}
                        icon="mail"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={setEmail}
                        placeholder={i18n("emailPlaceholderLogin")}
                        ariaLabel={i18n("emailPlaceholderLogin")}
                        disabled={loading}
                      />

                      {isRegister && (
                        <InputField
                          id="username"
                          label={i18n("username")}
                          icon="user"
                          type="text"
                          autoComplete="username"
                          required
                          minLength={2}
                          maxLength={64}
                          value={username}
                          onChange={setUsername}
                          placeholder={i18n("usernamePlaceholder")}
                          ariaLabel={i18n("username")}
                          disabled={loading}
                        />
                      )}

                      {!isOtp && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="password"
                              className="block text-xs font-medium text-[var(--muted)]"
                            >
                              {i18n("password")}
                            </label>
                            {!isRegister && (
                              <Link
                                href="/password-recovery/"
                                className="text-[11px] font-medium text-[var(--accent)] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
                              >
                                {i18n("forgotPassword")}
                              </Link>
                            )}
                          </div>
                          <div
                            className="group relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15 focus-within:shadow-[0_0_20px_-8px_var(--accent)]"
                          >
                            <span className="pointer-events-none absolute left-3 flex items-center text-[var(--muted)] transition-colors group-focus-within:text-[var(--accent)]">
                              <Icon name="lock" className="h-4 w-4" />
                            </span>
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              autoComplete={
                                isRegister ? "new-password" : "current-password"
                              }
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full rounded-2xl bg-transparent py-3 pl-10 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition-colors disabled:opacity-50"
                              style={{ paddingRight: "2.75rem" }}
                              placeholder={i18n("password")}
                              aria-label={i18n("password")}
                              disabled={loading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 rounded-lg p-1 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              aria-label={
                                showPassword
                                  ? i18n("hidePassword")
                                  : i18n("showPassword")
                              }
                              title={
                                showPassword
                                  ? i18n("hidePassword")
                                  : i18n("showPassword")
                              }
                              disabled={loading}
                            >
                              <Icon
                                name={showPassword ? "eye-off" : "eye"}
                                className="h-4 w-4"
                              />
                            </button>
                          </div>
                        </div>
                      )}

                      {isRegister && (
                        <InputField
                          id="confirmPassword"
                          label={i18n("confirmPassword")}
                          icon="lock"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          placeholder={i18n("confirmPassword")}
                          ariaLabel={i18n("confirmPassword")}
                          disabled={loading}
                        />
                      )}

                      {!isRegister && (
                        <div className="flex items-center justify-between gap-3">
                          <Switch
                            checked={rememberMe}
                            onChange={setRememberMe}
                            label={i18n("rememberMe")}
                            disabled={loading}
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        data-testid="sign-in-button"
                        disabled={loading}
                        className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-8px_var(--accent)] transition-all duration-200 hover:brightness-[1.1] hover:shadow-[0_0_32px_-6px_var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading && (
                          <Icon
                            name="loader-2"
                            className="h-4 w-4 animate-spin"
                          />
                        )}
                        <span>
                          {loading ? loadingLabel : submitLabel}
                        </span>
                        {!loading && submitIcon}
                      </button>

                      {!isRegister && (
                        <div className="space-y-5">
                          <div className="relative flex items-center py-1">
                            <div className="flex-1 border-t border-[var(--border)]" />
                            <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              {i18n("orContinueWith")}
                            </span>
                            <div className="flex-1 border-t border-[var(--border)]" />
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => handleOAuth("google")}
                              disabled={loading}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface)] hover:border-[var(--border)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
                            >
                              <GoogleIcon className="h-5 w-5" />
                              <span className="truncate">{i18n("signInWithGoogle")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOAuth("github")}
                              disabled={loading}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface)] hover:border-[var(--border)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
                            >
                              <GithubIcon className="h-5 w-5" />
                              <span className="truncate">{i18n("signInWithGithub")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOAuth("discord")}
                              disabled={loading}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface)] hover:border-[var(--border)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
                            >
                              <DiscordIcon className="h-5 w-5" />
                              <span className="truncate">{i18n("signInWithDiscord")}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handlePasskey}
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface)] hover:border-[var(--border)]/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
                          >
                            <Icon name="key-round" className="h-4 w-4" />
                            {i18n("signInWithPasskey")}
                          </button>
                        </div>
                      )}

                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setMode(isRegister ? "password" : "register")
                          }
                          className="text-center text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] rounded"
                        >
                          {isRegister ? i18n("hasAccount") : i18n("noAccount")}
                          <span className="ml-1 font-semibold text-[var(--accent)]">
                            {isRegister ? i18n("signIn") : i18n("register")}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--muted)] lg:hidden"
          >
            <BrandMark size={18} />
            <span className="font-semibold">ETHONE</span>
            <span>OS</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
