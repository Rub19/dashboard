import { useEffect, useState, type ComponentProps } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, useReducedMotion } from "framer-motion";
import { t } from "./i18n";
import { SPRING_PRESS } from "./motion";
import ethoneLogo from "./assets/ethone-logo.png";

export function Button({ variant = "ghost", className = "", ...props }: ComponentProps<typeof motion.button> & { variant?: "ghost" | "primary" }) {
  return <motion.button type="button" whileTap={{ scale: 0.97 }} transition={SPRING_PRESS} className={`btn ${variant === "primary" ? "primary" : ""} ${className}`} {...props} />;
}

export function BrandMark({ size = 20 }: { size?: number }) {
  return <img className="brand-mark" src={ethoneLogo} width={size} height={size} alt="" aria-hidden="true" />;
}

export function ValorantMark({ size = 20 }: { size?: number }) {
  return (
    <svg className="valorant-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M23.792 2.152a.25.25 0 0 0-.098.083q-5.077 6.345-10.15 12.69c-.107.093-.025.288.119.265c2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25l2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23c.016-.11-.1-.206-.204-.167zM.077 2.166c-.077.038-.074.132-.076.205q.002 4.612.001 9.225a.68.68 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247c2.455 0 4.91.003 7.365 0c.142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184z" />
    </svg>
  );
}

export function LeagueMark({ size = 20 }: { size?: number }) {
  return (
    <svg className="league-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7.1 3.25h6.15v2.2h-1.3v12.7h5.7l-.9 2.6H7.1v-2.2h1.3V5.45H7.1z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.35" d="M12 1.75a10.25 10.25 0 1 1-5.9 1.87" opacity=".72" />
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
      <motion.button type="button" whileTap={{ scale: 0.86 }} transition={SPRING_PRESS} tabIndex={-1} className="win-min" aria-label={t("minimize")} title={t("minimize")} onClick={() => appWindow.minimize()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" /></svg>
      </motion.button>
      {canMaximize && (
        <motion.button type="button" whileTap={{ scale: 0.86 }} transition={SPRING_PRESS} tabIndex={-1} className="win-max" aria-label={t(maximized ? "restore" : "maximize")} title={t(maximized ? "restore" : "maximize")} onClick={() => appWindow.toggleMaximize()}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {maximized ? <path d="M6 3.500h4.500A2 2 0 0 1 12.500 5.500V10M3.500 7.500a1.500 1.500 0 0 1 1.500-1.500h4A1.500 1.500 0 0 1 10.500 7.500v3.500A1.500 1.500 0 0 1 9 12.500H5A1.500 1.500 0 0 1 3.500 11z" /> : <rect x="3.500" y="3.500" width="9" height="9" rx="2.500" />}
          </svg>
        </motion.button>
      )}
      <motion.button type="button" whileTap={{ scale: 0.86 }} transition={SPRING_PRESS} tabIndex={-1} className="close" aria-label={t("close")} title={t("close")} onClick={() => appWindow.close()}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.500 4.500l7 7M11.500 4.500l-7 7" /></svg>
      </motion.button>
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
