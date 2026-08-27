"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
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
import Switch from "@/components/Switch";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import { triggerHaptic } from "@/lib/haptics";
import AuthInputField from "@/components/auth/AuthInputField";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  KeyRound,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

type AuthMode = "password" | "otp" | "register";
type OtpStep = "email" | "code";
type AuthState = "idle" | "loading" | "verifying" | "success" | "error";

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length > 2 ? `${local.slice(0, 1)}${"•".repeat(Math.min(local.length - 2, 5))}${local.slice(-1)}` : `${local.slice(0, 1)}••`;
  return `${maskedLocal}@${domain}`;
}

function humanError(err: unknown, i18n: (key: string, fallback?: string) => string) {
  const errObj = typeof err === "object" && err !== null ? (err as { status?: number; name?: string; message?: string }) : null;
  const msg = err instanceof Error ? err.message : errObj?.message ? String(errObj.message) : String(err || "");
  const lower = msg.toLowerCase();

  if (lower.includes("rate") || lower.includes("trop de") || lower.includes("too many")) {
    return i18n("tooManyAttempts", "Trop de tentatives. Veuillez patienter quelques instants.");
  }
  if (lower.includes("expir")) {
    return i18n("otpExpired", "Ce code a expiré. Demandez-en un nouveau.");
  }
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong") || lower.includes("invalide")) {
    return i18n("invalidCredentials", "Identifiants ou code incorrects.");
  }
  if (lower.includes("already registered") || lower.includes("déjà utilisé")) {
    return i18n("emailTaken", "Cette adresse e-mail est déjà associée à un compte.");
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("offline")) {
    return i18n("networkError", "Impossible de contacter les serveurs ETHONE. Vérifiez votre connexion.");
  }
  return i18n("unknownAuthError", "Une erreur est survenue lors de l'authentification.");
}

export default function LoginPage() {
  const i18n = useI18n();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { session, signInOtp, verifyOtp } = useAuth();
  const reduced = !!useReducedMotion();

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
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [passkeyReady, setPasskeyReady] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const successRedirected = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPasskeyReady(!!window.PublicKeyCredential);
    }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (authState === "success" && session && !successRedirected.current) {
      successRedirected.current = true;
      authLog("Redirecting to app dashboard");
      const timer = setTimeout(() => router.replace("/"), 750);
      return () => clearTimeout(timer);
    }
  }, [authState, session, router]);

  const resetForm = useCallback(() => {
    setAuthState("idle");
    setError(null);
    setCode("");
  }, []);

  const setModeAndReset = useCallback(
    (next: AuthMode) => {
      setMode(next);
      setOtpStep("email");
      resetForm();
      setMaskedEmail("");
      setResendIn(0);
    },
    [resetForm]
  );

  const handleSendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    const emailErr = validate(email, [required("L'adresse e-mail est requise"), emailValidator("E-mail invalide")]);
    if (emailErr) {
      setError(emailErr);
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);
    authLog("Requesting OTP code for:", email);

    const result = await signInOtp(email);
    if (!result.error) {
      setMaskedEmail(maskEmail(email));
      setOtpStep("code");
      setResendIn(60);
      setAuthState("idle");
      triggerHaptic("success");
      success("Code de sécurité envoyé", "Consultez votre boîte de réception.");
      return;
    }

    setAuthState("error");
    triggerHaptic("error");
    const human = humanError(result.error, i18n);
    setError(human);
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const activeCode = codeToVerify || code;
    if (activeCode.length !== 6) return;

    setAuthState("verifying");
    setError(null);
    authLog("Verifying OTP code...");

    const result = await verifyOtp(email, activeCode, rememberMe);
    if (result.error) {
      setAuthState("error");
      triggerHaptic("error");
      setError(humanError(result.error, i18n));
      return;
    }

    setAuthState("success");
    triggerHaptic("success");
    success("Connexion réussie", "Bienvenue sur ETHONE.");
  };

  const handlePasswordLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    const emailErr = validate(email, [required("L'adresse e-mail est requise"), emailValidator("E-mail invalide")]);
    const passErr = validate(password, [required("Le mot de passe est requis")]);
    if (emailErr || passErr) {
      setError(emailErr || passErr);
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);

    const res = await signInWithPassword(email, password, rememberMe);
    if (!res.ok || res.error) {
      setAuthState("error");
      triggerHaptic("error");
      setError(humanError(res.error, i18n));
      return;
    }

    setAuthState("success");
    triggerHaptic("success");
    success("Connexion réussie", "Bienvenue sur ETHONE.");
  };

  const handleRegister = async (e?: FormEvent) => {
    e?.preventDefault();
    const usernameErr = validate(username.trim(), [
      required("Le nom d'utilisateur est requis"),
      minLength(2, "2 caractères minimum"),
      maxLength(32, "32 caractères maximum"),
    ]);
    const emailErr = validate(email, [required("L'adresse e-mail est requise"), emailValidator("E-mail invalide")]);
    const passErr = validate(password, [required("Le mot de passe est requis"), passwordStrength("8+ caractères requis")]);
    const confirmErr = validate(confirmPassword, [
      required("Confirmez votre mot de passe"),
      match(() => password, "Les mots de passe ne correspondent pas"),
    ]);

    const firstErr = usernameErr || emailErr || passErr || confirmErr;
    if (firstErr) {
      setError(firstErr);
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);

    const { ok, session: newSession, error: err } = await signUpWithPassword(email, password, username.trim());
    if (!ok || err) {
      setAuthState("error");
      triggerHaptic("error");
      setError(humanError(err, i18n));
      return;
    }

    if (newSession) {
      setAuthState("success");
      triggerHaptic("success");
      success("Compte créé", "Bienvenue sur ETHONE.");
    } else {
      setAuthState("idle");
      triggerHaptic("success");
      success("E-mail de confirmation envoyé", "Vérifiez vos e-mails pour activer votre compte.");
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    setAuthState("loading");
    setError(null);
    triggerHaptic("light");

    const { ok, url, error: err } = await signInWithOAuth(provider);
    if (!ok || err || !url) {
      setAuthState("error");
      setOauthLoading(null);
      triggerHaptic("error");
      setError(humanError(err, i18n));
      return;
    }
    window.location.href = url;
  };

  const handlePasskey = async () => {
    if (!passkeyReady) return;
    const emailErr = validate(email, [required("L'adresse e-mail est requise"), emailValidator("E-mail invalide")]);
    if (emailErr) {
      setError(emailErr);
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);
    triggerHaptic("medium");

    try {
      const { ok, error: err } = await signInWithPasskey(email);
      if (!ok || err) throw err || new Error("Passkey failed");
      setAuthState("success");
      triggerHaptic("success");
      success("Passkey validé", "Connexion à ETHONE...");
    } catch (err) {
      setAuthState("error");
      triggerHaptic("error");
      setError(humanError(err, i18n));
    }
  };

  const isLoading = authState === "loading" || authState === "verifying";
  const isSuccess = authState === "success";

  const headerTitle = useMemo(() => {
    if (mode === "otp") {
      return otpStep === "code" ? "Vérification du code" : "Connexion sans mot de passe";
    }
    if (mode === "register") {
      return "Créer votre espace";
    }
    return "Bienvenue sur ETHONE";
  }, [mode, otpStep]);

  const headerSubtitle = useMemo(() => {
    if (mode === "otp" && otpStep === "code") {
      return `Code sécurisé envoyé à ${maskedEmail}`;
    }
    if (mode === "otp") {
      return "Recevez un code instantané à 6 chiffres par e-mail.";
    }
    if (mode === "register") {
      return "Configurez votre profil pour démarrer sur l'OS.";
    }
    return "Connectez-vous à votre environnement numérique unifié.";
  }, [mode, otpStep, maskedEmail]);

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-[#07090d] text-white selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top right language switcher */}
      <div className="absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>

      {/* Left side: Premium OS Hero Presentation (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14 select-none">
        {/* Subtle Ambient Radial Lighting */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.04] blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[36rem] w-[36rem] rounded-full bg-cyan-500/[0.04] blur-[140px]" />

        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg">
            <BrandMark size={28} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white font-mono">ETHONE</span>
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              OS
            </span>
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-[11px] font-medium tracking-wide text-zinc-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Environnement personnel unifié</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl xl:text-6xl leading-[1.1]">
            Votre espace, <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              réinventé pour vous.
            </span>
          </h1>

          <p className="text-base text-zinc-400 font-light leading-relaxed">
            Notes, tâches, calendrier, finances, musique, fichiers et IA locale réunis dans un système fluide et instantané.
          </p>
        </div>

        {/* System Status Pill */}
        <div className="z-10 flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-mono text-[11px] text-zinc-300">ETHONE Cloud & IA opérationnels</span>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form Card */}
      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8 lg:w-1/2">
        <div className="relative w-full max-w-[440px]">
          {/* Card Ambient Glow */}
          <div className="pointer-events-none absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 blur-xl" />

          {/* Main Glass Card */}
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#0d1016]/90 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl"
          >
            {/* Top Card Icon & Title */}
            <div className="text-center space-y-3">
              <motion.div
                animate={
                  isSuccess
                    ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] }
                    : isLoading
                    ? { scale: [1, 1.04, 1] }
                    : {}
                }
                transition={{ duration: 0.6, repeat: isLoading ? Infinity : 0 }}
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 shadow-lg",
                  isSuccess
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/20"
                    : "border-white/10 bg-white/[0.04] text-white shadow-black/40"
                )}
              >
                {isSuccess ? (
                  <Check className="h-7 w-7 text-emerald-400" />
                ) : (
                  <BrandMark size={36} />
                )}
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {headerTitle}
                </h2>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  {headerSubtitle}
                </p>
              </div>
            </div>

            {/* Mode Selector Tabs (only when in root mode or register) */}
            {!(mode === "otp" && otpStep === "code") && (
              <div className="mt-6">
                <div className="relative grid grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.03] p-1 shadow-inner">
                  {(["password", "otp", "register"] as AuthMode[]).map((m) => {
                    const active = mode === m;
                    const label =
                      m === "password"
                        ? "Mot de passe"
                        : m === "otp"
                        ? "Code OTP"
                        : "S'inscrire";

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setModeAndReset(m);
                        }}
                        disabled={isLoading}
                        aria-pressed={active}
                        className={cn(
                          "relative z-10 select-none rounded-xl py-2 text-xs font-medium transition-colors cursor-pointer",
                          active
                            ? "text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="activeAuthTab"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            className="absolute inset-0 z-0 rounded-xl bg-white/10 border border-white/15 shadow-sm"
                          />
                        )}
                        <span className="relative z-10">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Notification Banner */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  role="alert"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span className="leading-snug">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Form Content */}
            <div className="mt-5">
              <AnimatePresence mode="wait">
                {/* 1. PASSWORD LOGIN FLOW */}
                {mode === "password" && (
                  <motion.form
                    key="password-flow"
                    onSubmit={handlePasswordLogin}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <AuthInputField
                      id="login-email"
                      label="Adresse e-mail"
                      type="email"
                      autoComplete="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<Mail className="h-4 w-4" />}
                      ref={emailInputRef}
                    />

                    <AuthInputField
                      id="login-password"
                      label="Mot de passe"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<Lock className="h-4 w-4" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setShowPassword((v) => !v);
                          }}
                          className="text-zinc-400 hover:text-white transition-colors p-1"
                          aria-label="Afficher ou masquer le mot de passe"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />

                    <div className="flex items-center justify-between pt-0.5 text-xs text-zinc-400">
                      <Switch
                        id="remember-me-toggle"
                        checked={rememberMe}
                        onChange={setRememberMe}
                        label="Rester connecté"
                        size="md"
                      />
                      <button
                        type="button"
                        onClick={() => router.push("/password-recovery")}
                        className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className={cn(
                        "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        isSuccess
                          ? "bg-emerald-500 shadow-emerald-500/30"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 shadow-emerald-500/20",
                        isLoading && "opacity-80"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Connexion en cours...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Connecté !</span>
                        </>
                      ) : (
                        <>
                          <span>Se connecter</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* 2. OTP FLOW (EMAIL STEP) */}
                {mode === "otp" && otpStep === "email" && (
                  <motion.form
                    key="otp-email-flow"
                    onSubmit={handleSendOtp}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <AuthInputField
                      id="otp-email"
                      label="Adresse e-mail"
                      type="email"
                      autoComplete="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<Mail className="h-4 w-4" />}
                      ref={emailInputRef}
                    />

                    <div className="pt-0.5">
                      <Switch
                        id="remember-me-otp"
                        checked={rememberMe}
                        onChange={setRememberMe}
                        label="Rester connecté sur cet appareil"
                        size="md"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className={cn(
                        "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 shadow-emerald-500/20",
                        isLoading && "opacity-80"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Envoi du code...</span>
                        </>
                      ) : (
                        <>
                          <span>Recevoir le code de connexion</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* 3. OTP FLOW (CODE VERIFICATION STEP) */}
                {mode === "otp" && otpStep === "code" && (
                  <motion.div
                    key="otp-code-flow"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <OtpCodeInput
                      value={code}
                      onChange={setCode}
                      onComplete={handleVerifyOtp}
                      disabled={isLoading || isSuccess}
                      error={!!error}
                      state={authState}
                    />

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setOtpStep("email");
                          setCode("");
                          setError(null);
                        }}
                        disabled={isLoading}
                        className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Modifier l'adresse</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading || resendIn > 0}
                        className={cn(
                          "transition-colors cursor-pointer",
                          resendIn > 0
                            ? "text-zinc-500 cursor-not-allowed"
                            : "text-emerald-400 hover:text-emerald-300 font-medium"
                        )}
                      >
                        {resendIn > 0 ? `Renvoyer (${resendIn}s)` : "Renvoyer le code"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={isLoading || isSuccess || code.length !== 6}
                      className={cn(
                        "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        isSuccess
                          ? "bg-emerald-500 shadow-emerald-500/30"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 shadow-emerald-500/20",
                        (isLoading || code.length !== 6) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {authState === "verifying" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Vérification du code...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Code accepté !</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Valider le code</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* 4. REGISTER FLOW */}
                {mode === "register" && (
                  <motion.form
                    key="register-flow"
                    onSubmit={handleRegister}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3.5"
                  >
                    <AuthInputField
                      id="register-username"
                      label="Nom d'utilisateur"
                      type="text"
                      autoComplete="username"
                      placeholder="alex2026"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<User className="h-4 w-4" />}
                    />

                    <AuthInputField
                      id="register-email"
                      label="Adresse e-mail"
                      type="email"
                      autoComplete="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<Mail className="h-4 w-4" />}
                    />

                    <div className="space-y-1.5">
                      <AuthInputField
                        id="register-password"
                        label="Mot de passe"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading || isSuccess}
                        leftIcon={<Lock className="h-4 w-4" />}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic("light");
                              setShowPassword((v) => !v);
                            }}
                            className="text-zinc-400 hover:text-white transition-colors p-1"
                            aria-label="Afficher ou masquer le mot de passe"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        }
                      />
                      <PasswordStrengthMeter password={password} />
                    </div>

                    <AuthInputField
                      id="register-confirm-password"
                      label="Confirmer le mot de passe"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading || isSuccess}
                      leftIcon={<Lock className="h-4 w-4" />}
                    />

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className={cn(
                        "mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all duration-150 active:scale-[0.98] cursor-pointer",
                        isSuccess
                          ? "bg-emerald-500 shadow-emerald-500/30"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 shadow-emerald-500/20",
                        isLoading && "opacity-80"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Création en cours...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Espace créé !</span>
                        </>
                      ) : (
                        <>
                          <span>Créer mon espace ETHONE</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Social Authentication & Alternative Methods (only in login modes) */}
            {mode !== "register" && !(mode === "otp" && otpStep === "code") && (
              <div className="mt-6 space-y-4">
                <div className="relative flex items-center">
                  <div className="flex-1 border-t border-white/10" />
                  <span className="px-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    ou continuer avec
                  </span>
                  <div className="flex-1 border-t border-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={isLoading || isSuccess}
                    className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-xs font-medium text-white transition-all duration-150 hover:bg-white/[0.07] hover:border-white/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {oauthLoading === "google" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="h-4 w-4" />
                    )}
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuth("github")}
                    disabled={isLoading || isSuccess}
                    className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-xs font-medium text-white transition-all duration-150 hover:bg-white/[0.07] hover:border-white/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {oauthLoading === "github" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GithubIcon className="h-4 w-4 text-white" />
                    )}
                    <span>GitHub</span>
                  </button>
                </div>

                {passkeyReady && (
                  <button
                    type="button"
                    onClick={handlePasskey}
                    disabled={isLoading || isSuccess}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-xs font-medium text-zinc-300 transition-all duration-150 hover:bg-white/[0.06] hover:text-white active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <span>Se connecter avec une clé de sécurité (Passkey)</span>
                  </button>
                )}
              </div>
            )}

            {/* Bottom Footer Switcher */}
            <div className="mt-6 text-center text-xs text-zinc-400">
              {mode === "register" ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setModeAndReset("password");
                  }}
                  disabled={isLoading}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                >
                  Déjà un compte ? Se connecter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setModeAndReset("register");
                  }}
                  disabled={isLoading}
                  className="text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Pas encore de compte ?{" "}
                  <span className="text-emerald-400 font-medium">Créer un compte</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
