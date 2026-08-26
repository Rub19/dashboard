"use client";

import { useEffect, useRef, useState, useCallback, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import useVisualViewport from "@/lib/hooks/useVisualViewport";
import { useMediaQuery, useIsMobile } from "@/lib/hooks/useMediaQuery";
import { authLog } from "@/lib/auth-log";
import { cn } from "@/lib/utils";
import { required, email as emailValidator, minLength, maxLength, passwordStrength, match, validate } from "@/lib/form-validation";
import {
  signInWithPassword,
  signInWithOAuth,
  signInWithPasskey,
  signUpWithPassword,
} from "@/lib/auth";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switch from "@/components/Switch";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import { Icon } from "@/lib/icons";
import { triggerHaptic } from "@/lib/haptics";

type AuthMode = "password" | "otp" | "register";
type OtpStep = "email" | "code";
type AuthState = "idle" | "loading" | "verifying" | "success" | "error";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
};

function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const next = value.replace(/\D/g, "").slice(0, 6).split("");
    while (next.length < 6) next.push("");
    setDigits(next);
  }, [value]);

  useEffect(() => {
    if (!disabled) inputsRef.current[0]?.focus();
    // Intentionally run only once when the component mounts; avoid stealing
    // focus on every disabled/loading state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((nextDigits: string[]) => {
    setDigits(nextDigits);
    onChange(nextDigits.join(""));
  }, [onChange]);

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    update(next);
    if (char && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = Array(6).fill("").map((_, i) => text[i] ?? "");
    update(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="grid grid-cols-6 gap-2" aria-label="Code OTP à six chiffres" role="group">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          pattern="\d*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          aria-label={`Chiffre ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "h-14 w-full rounded-xl border bg-transparent text-center text-xl font-semibold outline-none transition-all",
            error
              ? "border-red-500/60 text-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-white/[0.10] text-[var(--foreground)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20"
          )}
        />
      ))}
    </div>
  );
}

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length > 2 ? `${local.slice(0, 1)}${"•".repeat(local.length - 2)}${local.slice(-1)}` : `${local.slice(0, 1)}${"•"}`;
  const dot = domain.lastIndexOf(".");
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  const maskedDomain = domainName.length > 2 ? `${domainName.slice(0, 1)}${"•".repeat(domainName.length - 2)}${domainName.slice(-1)}` : "••";
  return `${maskedLocal}@${maskedDomain}${tld}`;
}

function humanError(err: unknown, i18n: (key: string, fallback?: string) => string) {
  const errObj = typeof err === "object" && err !== null ? (err as { status?: number; name?: string; message?: string }) : null;
  const isNetwork =
    errObj?.status === 0 ||
    errObj?.name === "AbortError" ||
    err instanceof TypeError;
  const msg = err instanceof Error ? err.message : (errObj?.message ? String(errObj.message) : String(err));
  const lower = msg.toLowerCase();
  if (lower.includes("rate") || lower.includes("trop de") || lower.includes("too many")) {
    return i18n("tooManyAttempts", "Trop de tentatives. Veuillez patienter quelques instants.");
  }
  if (lower.includes("expir")) {
    return i18n("otpExpired", "Ce code a expiré. Demandez-en un nouveau.");
  }
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong") || lower.includes("invalide") || lower.includes("code")) {
    return i18n("invalidCode", "Ce code est incorrect. Vérifiez votre e-mail et réessayez.");
  }
  if (isNetwork || lower.includes("network") || lower.includes("fetch") || lower.includes("worker") || lower.includes("impossible de contacter")) {
    return i18n("networkError", "Impossible de contacter ETHONE. Vérifiez votre connexion.");
  }
  if (lower.includes("session")) {
    return i18n("sessionError", "Le code est valide, mais la session n'a pas pu être créée. Réessayez.");
  }
  return i18n("unknownAuthError", "Échec de connexion. Veuillez réessayer.");
}

function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export default function LoginPage() {
  const i18n = useI18n();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { session, signInOtp, verifyOtp } = useAuth();
  const online = useOnlineStatus();
  const reduced = !!useReducedMotion();
  const visual = useVisualViewport();
  const cardRef = useRef<HTMLDivElement>(null);
  const keyboardOpen = visual.height > 0 && visual.height < 640;
  const isMobile = useIsMobile(768);
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const compactLandscape = isMobile && isLandscape;

  const [mode, setMode] = useState<AuthMode>("password");
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [passkeyReady, setPasskeyReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setPasskeyReady(!!window.PublicKeyCredential);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const successRedirected = useRef(false);

  useEffect(() => {
    if (authState === "success" && session && !successRedirected.current) {
      successRedirected.current = true;
      authLog("Redirecting soon");
      const t = setTimeout(() => router.replace("/"), 900);
      return () => clearTimeout(t);
    }
  }, [authState, session, router]);

  useEffect(() => {
    if (authState !== "success") return;
    const t = setTimeout(() => {
      if (!session) {
        setAuthState("error");
        setError(i18n("sessionTimeout", "La session n'a pas pu être créée. Réessayez."));
        showError(i18n("error"));
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [authState, session, i18n, showError]);

  useEffect(() => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const onFocus = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button") {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    };
    card.addEventListener("focusin", onFocus);
    return () => card.removeEventListener("focusin", onFocus);
  }, []);

  const resetForm = useCallback(() => {
    setAuthState("idle");
    setError(null);
    setCode("");
  }, []);

  const setModeAndReset = useCallback((next: AuthMode) => {
    setMode(next);
    setOtpStep("email");
    resetForm();

    setMaskedEmail("");
    setResendIn(0);
  }, [resetForm]);

  const runWithLoading = async (fn: () => Promise<{ ok: boolean; error?: Error | null }>, onSuccess?: () => void) => {
    setAuthState("loading");
    setError(null);
    try {
      const { ok, error: err } = await fn();
      if (!ok || err) throw err || new Error("unknown");
      setAuthState("success");
      onSuccess?.();
    } catch (err) {
      setAuthState("error");
      const human = humanError(err, i18n);
      setError(human);
      showError(i18n("error"));
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    authLog("OTP requested");
    const emailError = validate(email, [required(i18n("fieldRequired")), emailValidator(i18n("emailInvalid"))]);
    if (emailError) {
      setError(emailError);
      showError(i18n("error"));
      return;
    }
    setAuthState("loading");
    setError(null);
    const result = await signInOtp(email);
    if (!result.error) {
      setMaskedEmail(maskEmail(email));
      setOtpStep("code");
      setResendIn(60);
      setAuthState("idle");
      success(i18n("otpSent", "Code envoyé"));
      return;
    }
    setAuthState("error");
    const human = humanError(result.error, i18n);
    setError(human);
    showError(i18n("error"));
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const codeError = validate(code, [required(i18n("fieldRequired")), minLength(6, i18n("invalidCode"))]);
    if (codeError) {
      setAuthState("error");
      setError(codeError);
      showError(i18n("error"));
      return;
    }
    setAuthState("verifying");
    setError(null);
    authLog("OTP verification started");
    const result = await verifyOtp(email, code, rememberMe);
    if (result.error) {
      authLog("OTP verification result", "error");
      setAuthState("error");
      const human = humanError(result.error, i18n);
      setError(human);
      showError(i18n("error"));
      return;
    }
    authLog("OTP verification result", "success");
    setAuthState("success");
    success(i18n("loginSuccess", "Connexion réussie"));
  };

  useEffect(() => {
    if (mode !== "otp" || otpStep !== "code" || code.length !== 6 || authState !== "idle" || error) return;
    authLog("OTP auto-submitted");
    handleVerifyOtp();
  }, [mode, otpStep, code, authState, error]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const emailError = validate(email, [required(i18n("fieldRequired")), emailValidator(i18n("emailInvalid"))]);
    const passwordError = validate(password, [required(i18n("fieldRequired"))]);
    const firstError = emailError || passwordError;
    if (firstError) {
      setAuthState("error");
      setError(firstError);
      showError(i18n("error"));
      return;
    }
    await runWithLoading(() => signInWithPassword(email, password, rememberMe), () => success(i18n("loginSuccess", "Connexion réussie")));
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const usernameError = validate(username.trim(), [
      required(i18n("fieldRequired")),
      minLength(2, i18n("usernameInvalid")),
      maxLength(64, i18n("usernameInvalid")),
    ]);
    const emailError = validate(email, [required(i18n("fieldRequired")), emailValidator(i18n("emailInvalid"))]);
    const passwordError = validate(password, [required(i18n("fieldRequired")), passwordStrength(i18n("passwordRequirement"))]);
    const confirmError = validate(confirmPassword, [required(i18n("fieldRequired")), match(() => password, i18n("passwordMismatch"))]);
    const firstError = usernameError || emailError || passwordError || confirmError;
    if (firstError) {
      setAuthState("error");
      setError(firstError);
      showError(i18n("error"));
      return;
    }
    setAuthState("loading");
    setError(null);
    const { ok, session: newSession, error: err } = await signUpWithPassword(email, password, username.trim());
    if (!ok || err) {
      setAuthState("error");
      setError(humanError(err, i18n));
      showError(i18n("error"));
      return;
    }
    if (newSession) {
      setAuthState("success");
      success(i18n("loginSuccess", "Connexion réussie"));
    } else {
      setAuthState("idle");
      success(i18n("checkEmail"));
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "discord") => {
    setAuthState("loading");
    setError(null);
    const { ok, url, error: err } = await signInWithOAuth(provider);
    if (!ok || err || !url) {
      setAuthState("error");
      setError(humanError(err, i18n));
      showError(i18n("error"));
      return;
    }
    window.location.href = url;
  };

  const handlePasskey = async () => {
    if (!passkeyReady) return;
    const emailError = validate(email, [required(i18n("fieldRequired")), emailValidator(i18n("emailInvalid"))]);
    if (emailError) {
      setError(emailError);
      showError(i18n("error"));
      return;
    }
    setAuthState("loading");
    setError(null);
    try {
      const { ok, error: err } = await signInWithPasskey(email);
      if (!ok || err) throw err || new Error("unknown");
      setAuthState("success");
      success(i18n("loginSuccess", "Connexion réussie"));
    } catch (err) {
      setAuthState("error");
      const human = humanError(err, i18n);
      setError(human);
      showError(i18n("error"));
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    await handleSendOtp();
  };

  const handleBackToEmail = () => {
    setOtpStep("email");
    resetForm();

    setResendIn(0);
  };

  const isLoading = authState === "loading" || authState === "verifying";
  const isSuccess = authState === "success";

  const submitLabel = (() => {
    if (isSuccess) return i18n("loginSuccess", "Connecté");
    if (isLoading) return mode === "otp" && otpStep === "code" ? i18n("verifying", "Vérification…") : i18n("loading", "Chargement…");
    if (mode === "otp") return otpStep === "email" ? i18n("continue", "Continuer") : i18n("verify", "Vérifier");
    if (mode === "register") return i18n("create", "Créer un compte");
    return i18n("signIn", "Se connecter");
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "otp" && otpStep === "code") handleVerifyOtp(e);
    else if (mode === "otp") handleSendOtp(e);
    else if (mode === "register") handleRegister(e);
    else handlePassword(e);
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-[var(--background)] lg:flex-row">
      <div className="absolute right-[calc(1rem+env(safe-area-inset-right))] top-[calc(1rem+env(safe-area-inset-top))] z-30">
        <LanguageSwitcher />
      </div>

      <div className="relative hidden w-2/5 flex-col justify-between overflow-hidden p-8 lg:flex lg:w-1/2 lg:p-10 md:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--surface)] via-[var(--background)] to-[var(--surface-raised)]" />
        <motion.div
          animate={reduced ? undefined : { x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[var(--accent)]/15 blur-[140px]"
        />
        <motion.div
          animate={reduced ? undefined : { x: [0, -20, 20, 0], y: [0, 20, -20, 0] }}
          transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -left-40 -top-40 h-[24rem] w-[24rem] rounded-full bg-[var(--accent)]/10 blur-[120px]"
        />
        <div className="z-10 flex items-center gap-3">
          <BrandMark size={34} />
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">ETHONE</span>
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">OS</span>
          </div>
        </div>
        <div className="z-10 max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">{i18n("environmentPersonal", "Environnement personnel")}</p>
          <h1 className="mt-5 text-4xl font-bold tracking-tighter text-[var(--foreground)] md:text-5xl lg:text-6xl">ETHONE</h1>
          <p className="mt-4 text-base font-light leading-relaxed text-[var(--text-muted)] md:text-lg lg:text-xl">
            {i18n("yourDigitalEnvironment", "Votre environnement numérique")}{" "}
            <span className="font-medium text-[var(--foreground)]">{i18n("reinventedAroundYou", "Réinventé autour de vous.")}</span>
          </p>
        </div>
        <div className="z-10 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2 shadow-lg backdrop-blur-md">
            <span className={cn("h-2 w-2 rounded-full", online ? "bg-[var(--success)]" : "bg-[var(--warning)]")} />
            {online ? i18n("systemOperational", "ETHONE opérationnel") : i18n("offline", "Hors ligne")}
          </span>
        </div>
      </div>

      <div className={cn("relative flex w-full flex-col items-center px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-8 md:w-3/5 lg:w-1/2 lg:p-10", keyboardOpen ? "justify-start overflow-y-auto" : "justify-center overflow-hidden")}>
        {!online && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex w-full max-w-md items-center gap-2 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]"
          >
            <Icon name="wifi-off" className="h-4 w-4 shrink-0" />
            <span>{i18n("offline", "Vous êtes hors ligne. Vérifiez votre connexion.")}</span>
          </motion.div>
        )}
        <div className="relative w-full max-w-md">          <div className="pointer-events-none absolute -inset-1 rounded-[2.25rem] bg-gradient-to-br from-[var(--accent)]/20 via-transparent to-[var(--accent)]/10 blur-2xl" />
          <motion.div
            ref={cardRef}
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 20, scale: reduced ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn("relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/85 p-6 backdrop-blur-2xl sm:p-8 lg:p-10", compactLandscape && "p-4 sm:p-5 lg:p-5")}
            style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <motion.div
                animate={reduced ? undefined : { scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className={cn("relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20 shadow-[0_0_24px_-8px_var(--accent)]", compactLandscape && "h-12 w-12")}
              >
                <BrandMark size={38} />
              </motion.div>
              <h2 className={cn("mt-4 text-2xl font-bold tracking-tight text-[var(--foreground)]", compactLandscape && "mt-2 text-xl")}>{i18n("welcomeBack", "Bienvenue")}</h2>
              <p className={cn("mt-1.5 max-w-[16rem] text-sm leading-relaxed text-[var(--text-muted)]", compactLandscape && "hidden sm:block")}>{i18n("loginDescription", "Connectez-vous à votre environnement.")}</p>
            </div>

            <div className={cn("mt-6", compactLandscape && "mt-4")}>
              <div className={cn("relative grid grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]", compactLandscape && "rounded-xl")}>
                {(["password", "otp", "register"] as AuthMode[]).map((m) => {
                  const active = mode === m;
                  const label = m === "password" ? i18n("password", "Mot de passe") : m === "otp" ? i18n("otp", "OTP") : i18n("register", "Inscription");
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { triggerHaptic("light"); setModeAndReset(m); }}
                      disabled={isLoading}
                      className={cn(
                        "relative z-10 select-none rounded-xl px-1 py-2.5 text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] sm:px-2 sm:text-xs",
                        compactLandscape && "py-2",
                        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="activeAuthTab"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="absolute inset-0 z-0 rounded-xl bg-[var(--accent)]/10"
                        />
                      )}
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  role="alert"
                  aria-live="polite"
                  aria-atomic="true"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className={cn("mt-5 overflow-hidden", compactLandscape && "mt-3")}
                >
                  <div className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
                    <Icon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.form
                key={`${mode}-${otpStep}`}
                onSubmit={handleSubmit}
                noValidate
                initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : -16 }}
                transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
                className={cn("mt-5 space-y-4", compactLandscape && "mt-3 space-y-3")}
              >
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--text-muted)]" htmlFor="auth-email">{i18n("email", "E-mail")}</label>
                <Input
                  id="auth-email"
                  type="email"
                  inputSize="large"
                  autoComplete="email"
                  inputMode="email"
                  icon="mail"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  disabled={isLoading || isSuccess}
                  error={!!error && !email}
                  inputClassName="text-base sm:text-sm"
                />
              </div>

              {mode === "otp" && otpStep === "code" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -12 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <p className="text-xs font-medium text-[var(--foreground)]">{i18n("codeSent", "Code envoyé")}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{i18n("codeSentTo", "Nous avons envoyé un code à")} <span className="text-[var(--foreground)]">{maskedEmail}</span></p>
                  </div>
                  <OtpInput value={code} onChange={setCode} disabled={isLoading || isSuccess} error={!!error} />
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={handleBackToEmail} disabled={isLoading} className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50">
                      <Icon name="chevron-left" className="h-3.5 w-3.5" /> {i18n("changeEmail", "Modifier l'adresse")}
                    </button>
                    <button type="button" onClick={handleResend} disabled={isLoading || resendIn > 0} className="text-xs text-[var(--accent-primary)] transition-opacity hover:opacity-80 disabled:opacity-40">
                      {resendIn > 0 ? i18n("resendIn", `Renvoyer dans ${resendIn} s`) : i18n("resendCode", "Renvoyer le code")}
                    </button>
                  </div>
                </motion.div>
              )}

              {(mode === "password" || (mode === "otp" && otpStep === "email")) && (
                <motion.div key="password" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {mode === "password" && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--text-muted)]" htmlFor="auth-password">{i18n("password", "Mot de passe")}</label>
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        inputSize="large"
                        autoComplete="current-password"
                        icon="lock"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isLoading || isSuccess}
                        error={!!error && !password}
                        inputClassName="text-base sm:text-sm"
                        right={(
                          <button type="button" tabIndex={-1} onClick={() => { triggerHaptic("light"); setShowPassword((v) => !v); }} aria-label={i18n("togglePassword", "Afficher ou masquer le mot de passe")} aria-pressed={showPassword} className="-mr-1 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] active:scale-95">
                            <Icon name={showPassword ? "eye-off" : "eye"} className="h-5 w-5" />
                          </button>
                        )}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <Switch checked={rememberMe} onChange={setRememberMe} label={i18n("rememberMe", "Rester connecté")} id="remember-me" size="lg" />
                    {mode === "password" && (
                      <button type="button" onClick={() => router.push("/password-recovery")} className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)]">
                        {i18n("forgotPassword", "Mot de passe oublié ?")}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {mode === "register" && (
                <motion.div key="register" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-muted)]" htmlFor="auth-username">{i18n("username", "Nom d'utilisateur")}</label>
                    <Input id="auth-username" type="text" inputSize="large" autoComplete="username" icon="user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="rub19" disabled={isLoading || isSuccess} inputClassName="text-base sm:text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-muted)]" htmlFor="auth-password-register">{i18n("password", "Mot de passe")}</label>
                    <Input
                      id="auth-password-register"
                      type={showPassword ? "text" : "password"}
                      inputSize="large"
                      autoComplete="new-password"
                      icon="lock"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading || isSuccess}
                      inputClassName="text-base sm:text-sm"
                      right={(
                        <button type="button" tabIndex={-1} onClick={() => { triggerHaptic("light"); setShowPassword((v) => !v); }} aria-label={i18n("togglePassword", "Afficher ou masquer le mot de passe")} aria-pressed={showPassword} className="-mr-1 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] active:scale-95">
                          <Icon name={showPassword ? "eye-off" : "eye"} className="h-5 w-5" />
                        </button>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--text-muted)]" htmlFor="auth-confirm">{i18n("confirmPassword", "Confirmer le mot de passe")}</label>
                    <Input id="auth-confirm" type="password" inputSize="large" autoComplete="new-password" icon="lock" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={isLoading || isSuccess} inputClassName="text-base sm:text-sm" />
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="h-12 w-full text-base sm:text-sm active:scale-[0.98]"
                isLoading={isLoading}
                disabled={isLoading || isSuccess || (mode === "otp" && otpStep === "code" ? code.length !== 6 : false)}
                rightIcon={!isLoading && !isSuccess ? <Icon name="arrow-right" className="h-5 w-5" /> : undefined}
              >
                {isSuccess ? (
                  <span className="inline-flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4" /> {submitLabel}
                  </span>
                ) : submitLabel}
              </Button>

              {mode !== "register" && (
                <div className={cn("relative flex items-center py-2", compactLandscape && "py-1.5")}>
                  <div className="flex-1 border-t border-[var(--border)]" />
                  <span className="px-3 text-[10px] text-[var(--text-muted)]">{i18n("or", "ou")}</span>
                  <div className="flex-1 border-t border-[var(--border)]" />
                </div>
              )}

              {mode !== "register" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button type="button" variant="secondary" size="md" className="h-12 w-full text-base sm:text-sm active:scale-[0.98]" onClick={() => handleOAuth("google")} leftIcon={<GoogleIcon className="h-5 w-5" />} disabled={isLoading || isSuccess}>
                    Google
                  </Button>
                  <Button type="button" variant="secondary" size="md" className="h-12 w-full text-base sm:text-sm active:scale-[0.98]" onClick={() => handleOAuth("github")} leftIcon={<GithubIcon className="h-5 w-5" />} disabled={isLoading || isSuccess}>
                    GitHub
                  </Button>
                  {passkeyReady && (
                    <Button type="button" variant="secondary" size="md" className="col-span-1 h-12 w-full text-base sm:text-sm active:scale-[0.98] sm:col-span-2" onClick={handlePasskey} leftIcon={<Icon name="key-round" className="h-5 w-5" />} disabled={isLoading || isSuccess}>
                      {i18n("passkey", "Se connecter avec un passkey")}
                    </Button>
                  )}
                  {!passkeyReady && (
                    <p className="col-span-1 text-center text-xs text-[var(--text-muted)] sm:col-span-2">{i18n("passkeyUnsupported", "Les passkeys ne sont pas disponibles sur ce navigateur.")}</p>
                  )}
                </div>
              )}
              </motion.form>
            </AnimatePresence>

            <div className={cn("mt-6 text-center text-xs text-[var(--text-muted)]", compactLandscape && "mt-4")}>
              {mode === "register" ? (
                <button type="button" onClick={() => { triggerHaptic("light"); setModeAndReset("password"); }} className="h-10 rounded-lg px-3 py-2 text-[var(--accent-primary)] transition-all hover:opacity-80 active:scale-95">
                  {i18n("alreadyHaveAccount", "Déjà un compte ? Se connecter")}
                </button>
              ) : (
                <button type="button" onClick={() => { triggerHaptic("light"); setModeAndReset("register"); }} className="h-10 rounded-lg px-3 py-2 text-[var(--accent-primary)] transition-all hover:opacity-80 active:scale-95">
                  {i18n("createAccount", "Créer un compte")}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
