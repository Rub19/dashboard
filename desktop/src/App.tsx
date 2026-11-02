import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { about, authState, Stage } from "./api";
import { t } from "./i18n";
import Login from "./Login";
import { EASE_SNAP } from "./motion";
import Shell from "./Shell";
import { BrandMark } from "./ui";

export default function App() {
  const [stage, setStage] = useState<Stage | null>(null);
  const [version, setVersion] = useState("");
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    authState().then(setStage, () => setStage({ stage: "signedOut" }));
    about().then((info) => setVersion(info.version));
    const stop = listen<{ stage?: Stage; error?: string }>("auth-callback", ({ payload }) => {
      if (payload.stage) setStage(payload.stage);
      else if (payload.error) setCallbackError(payload.error);
    });
    return () => {
      void stop.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {stage === null ? (
        <motion.div key="boot" className="boot" role="status" aria-label={t("loading")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.25, ease: EASE_SNAP }}>
          <span className="brand-tile big"><BrandMark size={26} /></span>
        </motion.div>
      ) : stage.stage === "signedIn" ? (
        <Shell key="shell" profile={stage.profile} offline={stage.offline} version={version} onSignedOut={() => setStage({ stage: "signedOut" })} />
      ) : (
        <Login key="login" stage={stage} callbackError={callbackError} onStage={setStage} />
      )}
    </AnimatePresence>
  );
}
