import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Crosshair, Eye, EyeOff, Gamepad2, HardDrive, KeyRound, Lock, Mail, Shield, Sofa, TrendingUp } from "lucide-react";
import { authMfa, authOauthCancel, authOauthStart, authOtpSend, authOtpVerify, authPassword, authSignOut, openSite, Provider, SitePage, Stage } from "./api";
import Backdrop from "./Backdrop";
import { errorText, Key, lang, t } from "./i18n";
import { choreography, EASE_SNAP, revealUp, SPRING_PILL, SPRING_SWAP, staggerItem, stepEnter } from "./motion";
import { setLanguage } from "./settings";
import { BrandMark, Button, LightBorder, startDrag, WindowControls } from "./ui";

type Mode = "password" | "otp";
const SHOWCASE = [
  { icon: Crosshair, name: "Kairo" },
  { icon: TrendingUp, name: "HDV Tracker" },
  { icon: Sofa, name: "Interior Studio" },
  { icon: HardDrive, name: "Nova PC Suite" },
  { icon: Gamepad2, name: "Ethone Breach" },
];
const FOOTER: [SitePage, Key][] = [["terms", "terms"], ["privacy", "privacy"], ["cookies", "cookies"], ["legal", "legal"]];

function Field({ id, label, icon, right, inputRef, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: ReactNode; right?: ReactNode; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-box">
        <span className="field-icon">{icon}</span>
        <input id={id} ref={inputRef} {...props} />
        {right}
      </div>
    </div>
  );
}

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>;
  if (provider === "github") return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.5-.3-5.2-1.3-5.2-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.2 5.7.4.4.8 1 .8 2.1v3.1c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>;
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.3.5c1.8.4 3.3 1.1 4.7 2a16 16 0 0 0-15.6 0c1.4-.9 3-1.6 4.8-2L8.7 3a19.7 19.7 0 0 0-5 1.5C.6 9.200-.3 13.800.1 18.300a20 20 0 0 0 6 3l1.300-1.900c-1.100-.4-2-.9-2.900-1.500l.7-.5a14.200 14.200 0 0 0 12.200 0l.7.5c-.9.6-1.900 1.100-2.900 1.500l1.300 1.900a20 20 0 0 0 6-3c.5-5.200-.9-9.700-3.800-13.900zM8 15.500c-1.200 0-2.100-1.100-2.100-2.400S6.800 10.700 8 10.700s2.200 1.100 2.100 2.400c0 1.300-.9 2.400-2.100 2.400zm8 0c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.200 1.100 2.100 2.400c0 1.300-.9 2.400-2.100 2.400z"/></svg>;
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
  const [waiting, setWaiting] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const mfa = stage.stage === "mfaRequired";

  const fail = (reason: unknown) => {
    setError(errorText(reason));
    if (!reduced) shake.start({ x: [0, -10, 9, -6, 3, 0], transition: { duration: 0.42, ease: "easeOut" } });
  };

  useEffect(() => {
    if (callbackError) {
      setWaiting(null);
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
      setTimeout(() => onStage(next), reduced ? 0 : 620);
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

  const oauth = (provider: Provider) =>
    attempt(async () => {
      await authOauthStart(provider);
      setWaiting(provider);
    });

  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpSent(false);
    setError(null);
    setCode("");
  };

  const title = done ? t("signedIn") : mfa ? t("mfaTitle") : waiting ? t("waitingBrowser") : t("welcome");
  const subtitle = done ? "" : mfa ? t("mfaSub") : waiting ? t("waitingBrowserSub") : t("welcomeSub");
  const submitLabel = done ? t("signedIn") : busy ? (mode === "otp" && !otpSent && !mfa ? t("sending") : mode === "password" && !mfa ? t("signingIn") : t("verifying")) : mfa || otpSent ? t("verify") : mode === "otp" ? t("sendCode") : t("signIn");

  return (
    <motion.div className="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.015, filter: "blur(6px)" }} transition={{ duration: 0.3, ease: EASE_SNAP }}>
      <Backdrop />
      <header className="auth-head" onMouseDown={startDrag}>
        <span className="brand-tile"><BrandMark size={18} /></span>
        <b className="brand">ETHONE</b>
        <span className="auth-sep" aria-hidden="true" />
        <span className="muted auth-tag">{t("tagline")}</span>
        <button type="button" className="lang" onClick={() => setLanguage(lang === "fr" ? "en" : "fr")} aria-label={t("language")}>{lang.toUpperCase()}</button>
        <WindowControls />
      </header>

      <main className="auth-main">
        <motion.section className="showcase" variants={choreography} initial="initial" animate="animate">
          <motion.span aria-hidden="true" className="showcase-tick" variants={{ initial: { scaleX: 0, opacity: 0 }, animate: { scaleX: 1, opacity: 1, transition: { duration: 0.8, ease: EASE_SNAP } } }} />
          <motion.h2 variants={revealUp}>{t("heroLine1")}<br /><span className="hero-accent">{t("heroLine2")}</span></motion.h2>
          <motion.p variants={revealUp}>{t("heroText")}</motion.p>
          <motion.div variants={revealUp} className="showcase-rule" />
          <motion.ul variants={choreography}>
            {SHOWCASE.map(({ icon: Icon, name }) => (
              <motion.li key={name} variants={staggerItem}><span className="tile"><Icon size={15} /></span>{name}</motion.li>
            ))}
          </motion.ul>
        </motion.section>

        <motion.div className="auth-column" variants={choreography} initial="initial" animate="animate">
          <motion.div variants={revealUp}>
            <motion.div animate={shake}>
              <LightBorder light={done ? "--success" : "--accent"} className="auth-card">
                <div className="auth-card-head">
                  <span className={`tile big ${done ? "ok" : ""}`}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={done ? "ok" : mfa ? "mfa" : "brand"} initial={{ opacity: 0, scale: 0.4, rotate: -45 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.4, rotate: 45 }} transition={SPRING_SWAP} className="tile-swap">
                        {done ? <Check size={22} /> : mfa ? <Shield size={20} /> : <BrandMark />}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={title} variants={revealUp} initial="initial" animate="animate" exit="exit">
                      <h1>{title}</h1>
                      {subtitle && <p className="muted">{subtitle}</p>}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="auth-card-rule" />
                <motion.div layout="size" transition={{ duration: reduced ? 0 : 0.4, ease: EASE_SNAP }} className="auth-card-body">
                  {!mfa && !waiting && (
                    <div className="auth-tabs" role="group">
                      {(["password", "otp"] as Mode[]).map((item) => (
                        <button key={item} type="button" aria-pressed={mode === item} disabled={busy} className={mode === item ? "on" : ""} onClick={() => switchMode(item)}>
                          {mode === item && <motion.span layoutId="auth-tab" className="auth-tab-pill" transition={SPRING_PILL}><i /></motion.span>}
                          <span>{t(item === "password" ? "tabPassword" : "tabOtp")}</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => openSite("register")}><span>{t("tabSignup")}</span></button>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div role="alert" className="auth-error" initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16 }}>
                        <p>{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait" initial={false}>
                    {waiting ? (
                      <motion.div key="waiting" variants={stepEnter} initial="initial" animate="animate" exit="exit" className="auth-waiting">
                        <span className="spinner" aria-hidden="true" />
                        <Button onClick={() => { void authOauthCancel(); setWaiting(null); }}>{t("cancel")}</Button>
                      </motion.div>
                    ) : (
                      <motion.form key={mfa ? `mfa-${useBackup}` : `${mode}-${otpSent}`} variants={stepEnter} initial="initial" animate="animate" exit="exit" onSubmit={submit} className="auth-form">
                        {mfa ? (
                          <Field inputRef={firstField} id="mfa-code" label={t(useBackup ? "backupCode" : "code")} icon={<KeyRound size={17} />} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode={useBackup ? "text" : "numeric"} />
                        ) : otpSent ? (
                          <>
                            <p className="muted small" role="status">{t("codeSent", { email })}</p>
                            <Field inputRef={firstField} id="otp-code" label={t("code")} icon={<KeyRound size={17} />} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" />
                          </>
                        ) : (
                          <Field inputRef={firstField} id="email" label={t("email")} icon={<Mail size={17} />} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nom@exemple.com" disabled={busy || done} required />
                        )}
                        {!mfa && mode === "password" && (
                          <Field id="password" label={t("password")} icon={<Lock size={17} />} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" disabled={busy || done} required
                            right={<button type="button" className="field-toggle" aria-label={t("togglePassword")} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
                        )}
                        {!mfa && (
                          <div className="auth-row">
                            <label className="switch">
                              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                              <span className="switch-track"><motion.span layout transition={SPRING_PILL} className="switch-thumb" /></span>
                              {t("remember")}
                            </label>
                            {mode === "password" && <button type="button" className="link" onClick={() => openSite("recovery")}>{t("forgot")}</button>}
                            {otpSent && <button type="button" className="link" onClick={() => { setOtpSent(false); setCode(""); }}>{t("changeEmail")}</button>}
                          </div>
                        )}
                        <Button type="submit" variant="primary" className={`auth-submit ${done ? "done" : ""}`} disabled={busy || done}>
                          {done && <Check size={18} />}
                          {submitLabel}
                          {!done && !busy && <ArrowRight size={17} className="arrow" />}
                        </Button>
                        {mfa && (
                          <div className="auth-row">
                            <button type="button" className="link" onClick={() => { setUseBackup((value) => !value); setCode(""); }}>{t(useBackup ? "mfaApp" : "mfaBackup")}</button>
                            <button type="button" className="link" onClick={() => authSignOut().then(() => onStage({ stage: "signedOut" }))}>{t("signOut")}</button>
                          </div>
                        )}
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {!mfa && !waiting && (
                    <>
                      <div className="auth-or"><span>{t("orContinue")}</span></div>
                      <div className="auth-oauth">
                        {(["google", "github", "discord"] as Provider[]).map((provider) => (
                          <Button key={provider} disabled={busy || done} onClick={() => oauth(provider)}>
                            <ProviderIcon provider={provider} />
                            {provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Discord"}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </LightBorder>
            </motion.div>
          </motion.div>
          {!mfa && (
            <motion.p variants={revealUp} className="auth-below">
              {t("noAccount")} <button type="button" className="link accent" onClick={() => openSite("register")}>{t("createAccount")} <ArrowRight size={13} /></button>
            </motion.p>
          )}
        </motion.div>
      </main>

      <motion.footer className="auth-foot" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_SNAP, delay: 0.6 }}>
        <span>© {new Date().getFullYear()} ETHONE</span>
        <nav>
          {FOOTER.map(([page, label]) => <button key={page} type="button" className="link" onClick={() => openSite(page)}>{t(label)}</button>)}
        </nav>
      </motion.footer>
    </motion.div>
  );
}
