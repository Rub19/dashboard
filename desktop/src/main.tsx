import { createRoot } from "react-dom/client";
import App from "./App";
import { lang } from "./i18n";
import "./style.css";

document.documentElement.lang = lang;
createRoot(document.getElementById("root")!).render(<App />);
