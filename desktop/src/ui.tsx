import { useEffect, useState, type ComponentProps } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, useReducedMotion } from "framer-motion";
import { t } from "./i18n";
import { SPRING_PRESS } from "./motion";

export function Button({ variant = "ghost", className = "", ...props }: ComponentProps<typeof motion.button> & { variant?: "ghost" | "primary" }) {
  return <motion.button type="button" whileTap={{ scale: 0.97 }} transition={SPRING_PRESS} className={`btn ${variant === "primary" ? "primary" : ""} ${className}`} {...props} />;
}

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.5 5h-11v14h11M6.5 12h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WindowControls({ canMaximize = true }: { canMaximize?: boolean }) {
  const appWindow = getCurrentWindow();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const sync = () => void appWindow.isMaximized().then(setMaximized);
    sync();
    const stop = appWindow.onResized(sync);
    return () => void stop.then((unlisten) => unlisten());
  }, [appWindow]);

  return (
    <div className="winbtns">
      <button type="button" aria-label={t("minimize")} title={t("minimize")} onClick={() => appWindow.minimize()}>
        <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M0 5h10" /></svg>
      </button>
      {canMaximize && (
        <button type="button" aria-label={t(maximized ? "restore" : "maximize")} title={t(maximized ? "restore" : "maximize")} onClick={() => appWindow.toggleMaximize()}>
          <svg viewBox="0 0 10 10" aria-hidden="true">
            {maximized ? <path d="M.5 2.5h7v7h-7zM2.500 2.500v-2h7v7h-2" /> : <rect x=".5" y=".5" width="9" height="9" rx="1" />}
          </svg>
        </button>
      )}
      <button type="button" className="close" aria-label={t("close")} title={t("close")} onClick={() => appWindow.close()}>
        <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M.5.5l9 9M9.500.5l-9 9" /></svg>
      </button>
    </div>
  );
}

export function WindowLight({ success }: { success: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className={`windowlight ${success ? "success" : ""}`}>
      {!reduced && <motion.div className="windowlight-ray" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} />}
    </div>
  );
}
