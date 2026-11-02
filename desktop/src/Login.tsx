import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Check, Eye, EyeOff, KeyRound, Lock, Mail, Shield } from "lucide-react";
import { authMfa, authOauthCancel, authOauthStart, authOtpSend, authOtpVerify, authPassword, authSignOut, openSite, Provider, Stage } from "./api";
import Backdrop from "./Backdrop";
import { errorText, lang, t } from "./i18n";
import { EASE_SNAP, SPRING_PILL, SPRING_SWAP, stepEnter } from "./motion";
import ProviderIcon from "./ProviderIcon";
import { setLanguage } from "./settings";
import { BrandMark, Button, WindowControls, WindowLight } from "./ui";

type Mode = "password" | "otp";
const PROVIDERS: [Provider, string][] = [["google", "Google"], ["github", "GitHub"], ["discord", "Discord"]];

function Field({ id, label, icon, right, inputRef, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: ReactNode; right?: ReactNode; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-box">
        <span className="field-icon">{icon}</span>
        <input id={id} ref={inputRef} spellCheck={false} {...props} />
        {right}
      </div>
    </div>
  );
}

export default function Login({ stage, callbackError, onStage }: { stage: Stage; callbackError: string | null; onStage: (stage: Stage) => void }) {
  const reduced = useReducedMotion();
  const shake = useAnimationControls();
  const [mode, setMode] = useState<Mode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [useBackup, setUseBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const mfa = stage.stage === "mfaRequired";

  const fail = (reason: unknown) => {
    setError(errorText(reason));
    if (!reduced) void shake.start({ x: [0, -8, 7, -4, 2, 0], transition: { duration: 0.36, ease: "easeOut" } });
  };

  useEffect(() => {
    if (callbackError) {
      setWaiting(false);
      fail(callbackError);
    }
  }, [callbackError]);

  useEffect(() => {
    firstField.current?.focus();
  }, [mode, otpSent, mfa, useBackup, waiting]);

  const finish = (next: Stage) => {
    setCode("");
    if (next.stage === "signedIn") {
      setDone(true);
      setTimeout(() => onStage(next), reduced ? 0 : 480);
    } else {
      onStage(next);
    }
  };

  const attempt = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || done) return;
    if (mfa) return void attempt(async () => finish(await authMfa(useBackup ? null : code.trim(), useBackup ? code.trim() : null)));
    if (mode === "password") return void attempt(async () => finish(await authPassword(email, password, remember)));
    if (!otpSent) return void attempt(async () => { await authOtpSend(email); setOtpSent(true); });
    void attempt(async () => finish(await authOtpVerify(email, code, remember)));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpSent(false);
    setError(null);
    setCode("");
  };

  const title = done ? t("signedIn") : mfa ? t("mfaTitle") : waiting ? t("waitingBrowser") : t("signInTitle");
  const subtitle = done ? " " : mfa ? t("mfaSub") : waiting ? t("waitingBrowserSub") : t("signInSub");
  const label = done ? t("signedIn") : busy ? (mode === "otp" && !otpSent && !mfa ? t("sending") : mode === "password" && !mfa ? t("signingIn") : t("verifying")) : mfa || otpSent ? t("verify") : mode === "otp" ? t("sendCode") : t("signIn");

  return (
    <motion.div className="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14, ease: EASE_SNAP }}>
      <Backdrop />
      <WindowLight success={done} />
      <header className="login-bar" data-tauri-drag-region>
        <button type="button" className="lang" onClick={() => setLanguage(lang === "fr" ? "en" : "fr")} aria-label={t("language")}>{lang === "fr" ? "Français" : "English"}</button>
        <WindowControls canMaximize={false} />
      </header>

      <motion.main className="login-main" animate={shake}>
        <div className="login-head" data-tauri-drag-region>
          <span className={`login-mark ${done ? "ok" : ""}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={done ? "ok" : mfa ? "mfa" : "brand"} className="swap" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={SPRING_SWAP}>
                {done ? <Check size={28} /> : mfa ? <Shield size={26} /> : <BrandMark size={30} />}
              </motion.span>
            </AnimatePresence>
          </span>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>

        {!mfa && !waiting && (
          <div className="segmented wide" role="group">
            {(["password", "otp"] as Mode[]).map((item) => (
              <button key={item} type="button" aria-pressed={mode === item} disabled={busy} className={mode === item ? "on" : ""} onClick={() => switchMode(item)}>
                {mode === item && <motion.span layoutId="login-tab" className="segmented-pill" transition={SPRING_PILL} />}
                <span>{t(item === "password" ? "tabPassword" : "tabEmailCode")}</span>
              </button>
            ))}
          </div>
        )}

        <AnimatePresence initial={false}>
          {error && (
            <motion.div role="alert" className="infobar" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16, ease: EASE_SNAP }}>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {waiting ? (
            <motion.div key="waiting" className="login-waiting" variants={stepEnter} initial="initial" animate="animate" exit="exit">
              <span className="spinner" aria-hidden="true" />
              <Button onClick={() => { void authOauthCancel(); setWaiting(false); }}>{t("cancel")}</Button>
            </motion.div>
          ) : (
            <motion.form key={mfa ? `mfa-${useBackup}` : `${mode}-${otpSent}`} className="login-form" variants={stepEnter} initial="initial" animate="animate" exit="exit" onSubmit={submit}>
              {mfa ? (
                <Field inputRef={firstField} id="mfa-code" label={t(useBackup ? "backupCode" : "code")} icon={<KeyRound size={16} />} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode={useBackup ? "text" : "numeric"} required />
              ) : otpSent ? (
                <>
                  <p className="muted small" role="status">{t("codeSent", { email })}</p>
                  <Field inputRef={firstField} id="otp-code" label={t("code")} icon={<KeyRound size={16} />} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" required />
                </>
              ) : (
                <Field inputRef={firstField} id="email" label={t("email")} icon={<Mail size={16} />} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={t("emailPlaceholder")} disabled={busy || done} required />
              )}
              {!mfa && mode === "password" && (
                <Field id="password" label={t("password")} icon={<Lock size={16} />} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" disabled={busy || done} required
                  right={<button type="button" className="field-toggle" aria-label={t("togglePassword")} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
              )}
              {!mfa && (
                <div className="login-row">
                  <label className="switch">
                    <input type="checkbox" role="switch" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <span className="switch-track"><motion.span layout transition={SPRING_PILL} className="switch-thumb" /></span>
                    {t("remember")}
                  </label>
                  {mode === "password" && <button type="button" className="link" onClick={() => openSite("recovery")}>{t("forgot")}</button>}
                  {otpSent && <button type="button" className="link" onClick={() => { setOtpSent(false); setCode(""); }}>{t("changeEmail")}</button>}
                </div>
              )}
              <Button type="submit" variant="primary" className={`login-submit ${done ? "done" : ""}`} disabled={busy || done}>{label}</Button>
              {mfa && (
                <div className="login-row">
                  <button type="button" className="link" onClick={() => { setUseBackup((value) => !value); setCode(""); }}>{t(useBackup ? "mfaApp" : "mfaBackup")}</button>
                  <button type="button" className="link" onClick={() => authSignOut().then(() => onStage({ stage: "signedOut" }))}>{t("signOut")}</button>
                </div>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {!mfa && !waiting && (
          <>
            <div className="login-or"><span>{t("orWord")}</span></div>
            <div className="login-providers">
              {PROVIDERS.map(([provider, name]) => (
                <Button key={provider} disabled={busy || done} onClick={() => attempt(async () => { await authOauthStart(provider); setWaiting(true); })}>
                  <ProviderIcon provider={provider} />
                  {name}
                </Button>
              ))}
            </div>
          </>
        )}
      </motion.main>

      <footer className="login-foot">
        <button type="button" className="link accent" onClick={() => openSite("register")}>{t("createAccount")}</button>
        <span className="login-legal">
          <button type="button" className="link" onClick={() => openSite("terms")}>{t("terms")}</button>
          <button type="button" className="link" onClick={() => openSite("privacy")}>{t("privacy")}</button>
        </span>
      </footer>
    </motion.div>
  );
}
