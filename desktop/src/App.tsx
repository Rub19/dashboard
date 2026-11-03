import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence } from "framer-motion";
import { authState, Stage } from "./api";
import Login from "./Login";
import { readJson, write } from "./settings";
import Shell from "./Shell";

interface Saved {
  width: number;
  height: number;
  maximized: boolean;
  x?: number;
  y?: number;
}

const DEFAULT_SIZE: Saved = { width: 1180, height: 760, maximized: false };

function setWindowMode(signedIn: boolean, animate: boolean) {
  const saved = readJson<Saved>("ethone-window") ?? DEFAULT_SIZE;
  return invoke("window_mode", { mode: signedIn ? "app" : "login", ...saved, width: Math.max(saved.width, 900), height: Math.max(saved.height, 600), x: saved.x ?? null, y: saved.y ?? null, animate });
}

export default function App() {
  const [stage, setStage] = useState<Stage | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const shown = useRef(false);
  const signedIn = stage?.stage === "signedIn";

  useEffect(() => {
    authState().then(setStage, () => setStage({ stage: "signedOut" }));
    const stop = listen<{ stage?: Stage; error?: string }>("auth-callback", ({ payload }) => {
      if (payload.stage) setStage(payload.stage);
      else if (payload.error) setCallbackError(payload.error);
    });
    return () => void stop.then((unlisten) => unlisten());
  }, []);

  useEffect(() => {
    if (stage === null) return;
    void setWindowMode(signedIn, shown.current);
    shown.current = true;
  }, [stage === null, signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const appWindow = getCurrentWindow();
    let timer = 0;
    const save = () => {
      clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (await appWindow.isMinimized()) return;
        const maximized = await appWindow.isMaximized();
        const previous = readJson<Saved>("ethone-window") ?? DEFAULT_SIZE;
        if (maximized) return write("ethone-window", JSON.stringify({ ...previous, maximized }));
        const size = (await appWindow.innerSize()).toLogical(await appWindow.scaleFactor());
        const position = await appWindow.outerPosition();
        if (size.width < 900 || size.height < 600) return;
        write("ethone-window", JSON.stringify({ width: size.width, height: size.height, x: position.x, y: position.y, maximized }));
      }, 400);
    };
    const stops = [appWindow.onResized(save), appWindow.onMoved(save)];
    return () => {
      clearTimeout(timer);
      for (const stop of stops) void stop.then((unlisten) => unlisten());
    };
  }, [signedIn]);

  if (stage === null) return null;

  return (
    <AnimatePresence mode="wait">
      {stage.stage === "signedIn" ? (
        <Shell key="shell" profile={stage.profile} offline={stage.offline} onSignedOut={() => setStage({ stage: "signedOut" })} />
      ) : (
        <Login key="login" stage={stage} callbackError={callbackError} onStage={setStage} />
      )}
    </AnimatePresence>
  );
}
