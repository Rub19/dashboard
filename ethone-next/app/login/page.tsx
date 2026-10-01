"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import Switch from "@/components/Switch";
import Button from "@/components/ui/Button";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GithubIcon from "@/components/icons/GithubIcon";
import DiscordIcon from "@/components/DiscordIcon";
import { triggerHaptic } from "@/lib/haptics";
import AuthInputField from "@/components/auth/AuthInputField";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthScreen from "@/components/auth/AuthScreen";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/auth/TurnstileWidget";
import { stepEnter } from "@/lib/motion-variants";
import { SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
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
  ChevronLeft,
  ShieldCheck,
} from "@/components/icons/ph";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

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
  // Motif inconnu : on garde le message générique mais on ajoute le détail technique (court), pour pouvoir diagnostiquer.
  const detail = msg.trim().replace(/\s+/g, " ").slice(0, 140);
  if (detail) console.error("[login] erreur d'authentification :", msg);
  return i18n("unknownAuthError", "Une erreur est survenue lors de l'authentification.") + (detail ? ` (${detail})` : "");
}

export default function LoginPage() {
  const i18n = useI18n();
  const router = useRouter();
  const { success } = useToast();
  const { session, loading: authLoading, signInOtp, verifyOtp } = useAuth();
  const { reduced } = useMotionPref();

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

  const [registerTurnstileToken, setRegisterTurnstileToken] = useState("");
  const registerTurnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [otpTurnstileToken, setOtpTurnstileToken] = useState("");
  const otpTurnstileRef = useRef<TurnstileWidgetHandle>(null);

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

  // A signed-in user landing here directly (bookmark, back button, a stale
  // tab) previously saw the login form rendered right over the live app
  // shell instead of being sent back to it — this only fires for that
  // "arrived already authenticated" case (authState stays "idle" the whole
  // time), never for the fresh-login success flow below, which drives its
  // own redirect through authState transitioning to "success".
  useEffect(() => {
    if (!authLoading && session && authState === "idle" && !successRedirected.current) {
      successRedirected.current = true;
      const nextParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") || "" : "";
      const safeNext = nextParam.startsWith("/spaces/join") ? nextParam : "/";
      router.replace(safeNext);
    }
  }, [authLoading, session, authState, router]);

  useEffect(() => {
    if (authState === "success" && session && !successRedirected.current) {
      successRedirected.current = true;
      authLog("Redirecting to app dashboard");
      // `next` (e.g. from a shared-space invite link) is read straight off
      // window.location rather than useSearchParams() so this page doesn't
      // need a Suspense boundary just for one param. Only a same-origin
      // relative path we actually expect is honoured — anything else falls
      // back to "/", never an open redirect to an arbitrary URL.
      const nextParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") || "" : "";
      const safeNext = nextParam.startsWith("/spaces/join") ? nextParam : "/";
      const timer = setTimeout(() => router.replace(safeNext), 750);
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
    const emailErr = validate(email, [required(i18n("errorEmailRequired", "L'adresse e-mail est requise")), emailValidator(i18n("errorEmailInvalid", "E-mail invalide"))]);
    if (emailErr) {
      setError(emailErr);
      triggerHaptic("error");
      return;
    }

    // Sans jeton anti-robot le Worker refuse la demande (« requête invalide ») : on attend qu'il soit prêt au lieu d'envoyer dans le vide.
    if (TURNSTILE_SITE_KEY && !otpTurnstileToken) {
      setError(i18n("turnstilePending", "Vérification anti-robot en cours… patientez une seconde puis réessayez."));
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);
    authLog("Requesting OTP code for:", email);

    const result = await signInOtp(email, otpTurnstileToken);
    otpTurnstileRef.current?.reset();
    setOtpTurnstileToken("");
    if (!result.error) {
      setMaskedEmail(maskEmail(email));
      setOtpStep("code");
      setResendIn(60);
      setAuthState("idle");
      triggerHaptic("success");
      success(i18n("toastOtpSentTitle", "Code de sécurité envoyé"), i18n("toastOtpSentDesc", "Consultez votre boîte de réception."));
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
    success(i18n("toastLoginSuccessTitle", "Connexion réussie"), i18n("toastWelcomeDesc", "Bienvenue sur ETHONE."));
  };

  const handlePasswordLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    const emailErr = validate(email, [required(i18n("errorEmailRequired", "L'adresse e-mail est requise")), emailValidator(i18n("errorEmailInvalid", "E-mail invalide"))]);
    const passErr = validate(password, [required(i18n("errorPasswordRequired", "Le mot de passe est requis"))]);
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
    success(i18n("toastLoginSuccessTitle", "Connexion réussie"), i18n("toastWelcomeDesc", "Bienvenue sur ETHONE."));
  };

  const handleRegister = async (e?: FormEvent) => {
    e?.preventDefault();
    const usernameErr = validate(username.trim(), [
      required(i18n("errorUsernameRequired", "Le nom d'utilisateur est requis")),
      minLength(2, i18n("errorMinLength2", "2 caractères minimum")),
      maxLength(32, i18n("errorMaxLength32", "32 caractères maximum")),
    ]);
    const emailErr = validate(email, [required(i18n("errorEmailRequired", "L'adresse e-mail est requise")), emailValidator(i18n("errorEmailInvalid", "E-mail invalide"))]);
    const passErr = validate(password, [required(i18n("errorPasswordRequired", "Le mot de passe est requis")), passwordStrength(i18n("passwordRequirement"))]);
    const confirmErr = validate(confirmPassword, [
      required(i18n("errorConfirmPasswordRequired", "Confirmez votre mot de passe")),
      match(() => password, i18n("errorPasswordMismatch", "Les mots de passe ne correspondent pas")),
    ]);

    const firstErr = usernameErr || emailErr || passErr || confirmErr;
    if (firstErr) {
      setError(firstErr);
      triggerHaptic("error");
      return;
    }

    setAuthState("loading");
    setError(null);

    const { ok, session: newSession, error: err } = await signUpWithPassword(email, password, username.trim(), registerTurnstileToken);
    registerTurnstileRef.current?.reset();
    setRegisterTurnstileToken("");
    if (!ok || err) {
      setAuthState("error");
      triggerHaptic("error");
      setError(humanError(err, i18n));
      return;
    }

    if (newSession) {
      setAuthState("success");
      triggerHaptic("success");
      success(i18n("toastAccountCreatedTitle", "Compte créé"), i18n("toastWelcomeDesc", "Bienvenue sur ETHONE."));
    } else {
      setAuthState("idle");
      triggerHaptic("success");
      success(i18n("toastConfirmEmailSentTitle", "E-mail de confirmation envoyé"), i18n("toastConfirmEmailSentDesc", "Vérifiez vos e-mails pour activer votre compte."));
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "discord") => {
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
    const emailErr = validate(email, [required(i18n("errorEmailRequired", "L'adresse e-mail est requise")), emailValidator(i18n("errorEmailInvalid", "E-mail invalide"))]);
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
      success(i18n("toastPasskeyValidTitle", "Passkey validé"), i18n("toastConnectingEthone", "Connexion à ETHONE..."));
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
      return otpStep === "code"
        ? i18n("loginTitleOtpVerify", "Vérification du code")
        : i18n("loginTitleOtp", "Connexion sans mot de passe");
    }
    if (mode === "register") {
      return i18n("loginTitleRegister", "Créer votre espace");
    }
    return i18n("loginTitleDefault", "Bienvenue sur ETHONE");
  }, [mode, otpStep, i18n]);

  const headerSubtitle = useMemo(() => {
    if (mode === "otp" && otpStep === "code") {
      return `${i18n("loginSubtitleOtpCodePrefix", "Code sécurisé envoyé à")} ${maskedEmail}`;
    }
    if (mode === "otp") {
      return i18n("loginSubtitleOtp", "Recevez un code instantané à 6 chiffres par e-mail.");
    }
    if (mode === "register") {
      return i18n("loginSubtitleRegister", "Configurez votre profil pour démarrer sur l'OS.");
    }
    return i18n("loginSubtitleDefault", "Connectez-vous à votre environnement numérique unifié.");
  }, [mode, otpStep, maskedEmail, i18n]);

  const modeSwitch = (
    <button
      type="button"
      onClick={() => {
        triggerHaptic("light");
        setModeAndReset(mode === "register" ? "password" : "register");
      }}
      disabled={isLoading}
      className="group rounded-md text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg-main)]"
    >
      {mode === "register" ? (
        <span className="font-medium text-[var(--accent-primary)]">{i18n("alreadyHaveAccount", "Déjà un compte ? Se connecter")}</span>
      ) : (
        <>
          {i18n("noAccountYet", "Pas encore de compte ?")}{" "}
          <span className="inline-flex items-center gap-1 font-medium text-[var(--accent-primary)]">
            {i18n("createAccount", "Créer un compte")}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </>
      )}
    </button>
  );

  return (
    <AuthScreen>
        <AuthCardShell
          success={isSuccess}
          shakeKey={error}
          title={headerTitle}
          subtitle={headerSubtitle}
          below={modeSwitch}
        >
          {/* Mode Selector Tabs (only when in root mode or register) */}
          {!(mode === "otp" && otpStep === "code") && (
            <div className="mb-6">
              <div className="relative grid grid-cols-3 rounded-[calc(var(--inset-radius)+4px)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.035] p-1">
                {(["password", "otp", "register"] as AuthMode[]).map((m) => {
                  const active = mode === m;
                  const label =
                    m === "password"
                      ? i18n("tabPassword", "Mot de passe")
                      : m === "otp"
                      ? i18n("tabOtp", "Code OTP")
                      : i18n("tabRegister", "S'inscrire");

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
                        "relative z-10 select-none rounded-[var(--inset-radius)] py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                        active
                          ? "text-[var(--text-primary)] font-semibold"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="activeAuthTab"
                          transition={SPRING_PILL}
                          className="absolute inset-0 z-0 rounded-[var(--inset-radius)] border border-[var(--text-primary)]/10 bg-[var(--bg-card,var(--bg-main))] shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_6px_16px_-8px_rgb(0_0_0/0.6)]"
                        >
                          <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[var(--accent-primary)]" />
                        </motion.span>
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
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-[var(--inset-radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-3.5 text-sm text-[var(--danger)]">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Form Content */}
          <AnimatePresence mode="wait" initial={false}>
            {/* 1. PASSWORD LOGIN FLOW */}
            {mode === "password" && (
              <motion.form
                key="password-flow"
                onSubmit={handlePasswordLogin}
                variants={stepEnter}
                initial={reduced ? "animate" : "initial"}
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <AuthInputField
                  id="login-email"
                  label={i18n("fieldEmail", "Adresse e-mail")}
                  type="email"
                  autoComplete="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<Mail className="h-5 w-5" />}
                  ref={emailInputRef}
                />

                <AuthInputField
                  id="login-password"
                  label={i18n("tabPassword", "Mot de passe")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<Lock className="h-5 w-5" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setShowPassword((v) => !v);
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                      aria-label={i18n("togglePasswordVisibility", "Afficher ou masquer le mot de passe")}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />

                <div className="flex items-center justify-between pt-0.5 text-sm text-[var(--text-muted)]">
                  <Switch
                    id="remember-me-toggle"
                    checked={rememberMe}
                    onChange={setRememberMe}
                    label={i18n("rememberMe", "Rester connecté")}
                    size="md"
                  />
                  <button
                    type="button"
                    onClick={() => router.push("/password-recovery")}
                    className="rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                  >
                    {i18n("forgotPassword", "Mot de passe oublié ?")}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant={isSuccess ? "success" : "primary"}
                  isLoading={isLoading}
                  disabled={isSuccess}
                  className="btn-sheen shadow-none! mt-2 h-14 w-full rounded-[var(--inset-radius)] text-base"
                  rightIcon={!isLoading && !isSuccess ? <ArrowRight className="h-5 w-5" /> : undefined}
                  leftIcon={isSuccess ? <Check className="h-5 w-5" /> : undefined}
                >
                  {isLoading
                    ? i18n("loginSubmitLoading", "Connexion en cours...")
                    : isSuccess
                    ? i18n("loginSubmitSuccess", "Connecté !")
                    : i18n("loginSubmit", "Se connecter")}
                </Button>
              </motion.form>
            )}

            {/* 2. OTP FLOW (EMAIL STEP) */}
            {mode === "otp" && otpStep === "email" && (
              <motion.form
                key="otp-email-flow"
                onSubmit={handleSendOtp}
                variants={stepEnter}
                initial={reduced ? "animate" : "initial"}
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <AuthInputField
                  id="otp-email"
                  label={i18n("fieldEmail", "Adresse e-mail")}
                  type="email"
                  autoComplete="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<Mail className="h-5 w-5" />}
                  ref={emailInputRef}
                />

                <div className="pt-0.5">
                  <Switch
                    id="remember-me-otp"
                    checked={rememberMe}
                    onChange={setRememberMe}
                    label={i18n("rememberMeDevice", "Rester connecté sur cet appareil")}
                    size="md"
                  />
                </div>

                {TURNSTILE_SITE_KEY && (
                  <TurnstileWidget
                    ref={otpTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    action="login_otp"
                    onToken={setOtpTurnstileToken}
                    onExpire={() => setOtpTurnstileToken("")}
                  />
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={isSuccess}
                  className="btn-sheen shadow-none! mt-2 h-14 w-full rounded-[var(--inset-radius)] text-base"
                  rightIcon={!isLoading ? <ArrowRight className="h-5 w-5" /> : undefined}
                >
                  {isLoading ? i18n("otpSendLoading", "Envoi du code...") : i18n("otpSend", "Recevoir le code de connexion")}
                </Button>
              </motion.form>
            )}

            {/* 3. OTP FLOW (CODE VERIFICATION STEP) */}
            {mode === "otp" && otpStep === "code" && (
              <motion.div
                key="otp-code-flow"
                variants={stepEnter}
                initial={reduced ? "animate" : "initial"}
                animate="animate"
                exit="exit"
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

                {/* Le widget doit rester monté à cette étape : « Renvoyer le code » a besoin d'un jeton anti-robot tout neuf (un jeton ne sert qu'une fois). */}
                {TURNSTILE_SITE_KEY && (
                  <TurnstileWidget
                    ref={otpTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    action="login_otp"
                    onToken={setOtpTurnstileToken}
                    onExpire={() => setOtpTurnstileToken("")}
                  />
                )}

                <div className="flex items-center justify-between text-sm pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setOtpStep("email");
                      setCode("");
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{i18n("otpEditEmail", "Modifier l'adresse")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || resendIn > 0}
                    className={cn(
                      "transition-colors cursor-pointer",
                      resendIn > 0
                        ? "text-[var(--text-muted)] opacity-60 cursor-not-allowed"
                        : "text-[var(--accent-primary)] hover:brightness-110 font-medium"
                    )}
                  >
                    {resendIn > 0 ? `${i18n("otpResendPrefix", "Renvoyer")} (${resendIn}s)` : i18n("otpResend", "Renvoyer le code")}
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  variant={isSuccess ? "success" : "primary"}
                  isLoading={authState === "verifying"}
                  disabled={isSuccess || code.length !== 6}
                  className="btn-sheen shadow-none! mt-2 h-14 w-full rounded-[var(--inset-radius)] text-base"
                  leftIcon={isSuccess ? <Check className="h-5 w-5" /> : !isLoading ? <ShieldCheck className="h-5 w-5" /> : undefined}
                >
                  {authState === "verifying"
                    ? i18n("otpVerifyLoading", "Vérification du code...")
                    : isSuccess
                    ? i18n("otpVerifySuccess", "Code accepté !")
                    : i18n("otpVerify", "Valider le code")}
                </Button>
              </motion.div>
            )}

            {/* 4. REGISTER FLOW */}
            {mode === "register" && (
              <motion.form
                key="register-flow"
                onSubmit={handleRegister}
                variants={stepEnter}
                initial={reduced ? "animate" : "initial"}
                animate="animate"
                exit="exit"
                className="space-y-3.5"
              >
                <AuthInputField
                  id="register-username"
                  label={i18n("fieldUsername", "Nom d'utilisateur")}
                  type="text"
                  autoComplete="username"
                  placeholder="alex2026"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<User className="h-5 w-5" />}
                />

                <AuthInputField
                  id="register-email"
                  label={i18n("fieldEmail", "Adresse e-mail")}
                  type="email"
                  autoComplete="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<Mail className="h-5 w-5" />}
                />

                <div className="space-y-1.5">
                  <AuthInputField
                    id="register-password"
                    label={i18n("tabPassword", "Mot de passe")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isSuccess}
                    leftIcon={<Lock className="h-5 w-5" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setShowPassword((v) => !v);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        aria-label={i18n("togglePasswordVisibility", "Afficher ou masquer le mot de passe")}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                  />
                  {password ? (
                    <PasswordStrengthMeter password={password} />
                  ) : (
                    <p className="pt-1 text-[11px] text-[var(--text-muted)]">{i18n("passwordRequirement")}</p>
                  )}
                </div>

                <AuthInputField
                  id="register-confirm-password"
                  label={i18n("fieldConfirmPassword", "Confirmer le mot de passe")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || isSuccess}
                  leftIcon={<Lock className="h-5 w-5" />}
                />

                {TURNSTILE_SITE_KEY && (
                  <TurnstileWidget
                    ref={registerTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    action="signup"
                    onToken={setRegisterTurnstileToken}
                    onExpire={() => setRegisterTurnstileToken("")}
                  />
                )}

                <Button
                  type="submit"
                  variant={isSuccess ? "success" : "primary"}
                  isLoading={isLoading}
                  disabled={isSuccess}
                  className="btn-sheen shadow-none! mt-3 h-14 w-full rounded-[var(--inset-radius)] text-base"
                  leftIcon={isSuccess ? <Check className="h-5 w-5" /> : undefined}
                >
                  {isLoading
                    ? i18n("registerSubmitLoading", "Création en cours...")
                    : isSuccess
                    ? i18n("registerSubmitSuccess", "Espace créé !")
                    : i18n("registerSubmit", "Créer mon espace ETHONE")}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Social Authentication & Alternative Methods (only in login modes) */}
          {mode !== "register" && !(mode === "otp" && otpStep === "code") && (
            <div className="mt-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--panel-border)]" />
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {i18n("orContinueWith", "ou continuer avec")}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--panel-border)]" />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {([
                  ["google", "Google", <GoogleIcon key="g" className="h-5 w-5 shrink-0" />],
                  ["github", "GitHub", <GithubIcon key="gh" className="h-5 w-5 shrink-0" />],
                  ["discord", "Discord", <DiscordIcon key="d" className="h-5 w-5 shrink-0 text-[#5865F2]" />],
                ] as const).map(([provider, label, providerIcon]) => (
                  <Button
                    key={provider}
                    type="button"
                    variant="secondary"
                    isLoading={oauthLoading === provider}
                    disabled={isLoading || isSuccess}
                    onClick={() => handleOAuth(provider)}
                    aria-label={label}
                    leftIcon={providerIcon}
                    className="h-12 rounded-[var(--inset-radius)] text-sm bg-[var(--text-primary)]/[0.03] hover:-translate-y-0.5 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:scale-110"
                  >
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>

              {passkeyReady && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading || isSuccess}
                  onClick={handlePasskey}
                  className="group h-auto min-h-12 w-full rounded-[var(--inset-radius)] py-2.5 text-sm leading-snug [&_.truncate]:whitespace-normal border border-[var(--panel-border)] hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.04]"
                  rightIcon={<ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5" />}
                  leftIcon={<KeyRound className="h-5 w-5 text-[var(--accent-primary)]" />}
                >
                  {i18n("passkeyLogin", "Se connecter avec une clé de sécurité (Passkey)")}
                </Button>
              )}
            </div>
          )}
        </AuthCardShell>
    </AuthScreen>
  );
}
