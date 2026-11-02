import { invoke } from "@tauri-apps/api/core";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { lang } from "./i18n";
import { applyAppearance } from "./settings";
import "./style.css";

document.documentElement.lang = lang;
applyAppearance();
window.addEventListener("contextmenu", (event) => {
  if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
});
if (!window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
  void invoke<boolean>("window_setup").then((mica) => document.documentElement.classList.toggle("mica", mica));
}
createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
);
