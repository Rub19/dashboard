import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import App from "./App";
import { lang } from "./i18n";
import { startUiSounds } from "./ui-sound";
import { readJson, write } from "./settings";
import { applyAppearance, applyInterfacePreferences, InterfacePreferences, INTERFACE_EVENT } from "./settings";
import "./style.css";

window.addEventListener("keydown", () => document.documentElement.setAttribute("data-keynav", ""), true);
window.addEventListener("pointerdown", () => document.documentElement.removeAttribute("data-keynav"), true);

document.documentElement.lang = lang;
applyAppearance();
document.documentElement.dataset.contrast = localStorage.getItem("ethone-contrast") ?? "normal";
const startPage = readJson<string>("ethone-start-page");
if (startPage && startPage !== "last") write("ethone-last-page", JSON.stringify(startPage));
startUiSounds();
const interfacePreferences = applyInterfacePreferences();
window.addEventListener("contextmenu", (event) => {
  if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
});

function Root() {
  const [preferences, setPreferences] = useState(interfacePreferences);
  useEffect(() => {
    const update = (event: Event) => setPreferences((event as CustomEvent<InterfacePreferences>).detail);
    window.addEventListener(INTERFACE_EVENT, update);
    return () => window.removeEventListener(INTERFACE_EVENT, update);
  }, []);
  return <MotionConfig reducedMotion={preferences.motion === "reduced" ? "always" : "user"}><App /></MotionConfig>;
}

createRoot(document.getElementById("root")!).render(<Root />);
