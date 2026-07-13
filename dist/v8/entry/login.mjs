import { element, icon } from "../ui/dom.mjs";
import { refreshIcons } from "../ui/icons.mjs";

export const LOGIN_LOCALES = Object.freeze({
  fr: Object.freeze({
    brandLine: "Votre système personnel, prêt à s'ouvrir.",
    login: "Connexion",
    register: "Créer un compte",
    identifier: "E-mail ou identifiant",
    password: "Mot de passe",
    continue: "Entrer dans ETHONE",
    create: "Créer mon espace",
    oauth: "ou continuer avec",
    forgot: "Mot de passe oublié ?",
    username: "Nom d'utilisateur",
    emailOptional: "E-mail (optionnel)",
    remember: "Rester connecté",
    loginSubtitle: "Reprenez exactement là où vous vous êtes arrêté.",
    registerSubtitle: "Créez votre environnement personnel en quelques secondes.",
    privacy: "Session chiffrée",
    ready: "Système prêt",
    preview: "Aperçu ETHONE",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    retry: "Réessayer",
    v8Only: "Runtime unifié",
    screen: "Connexion à ETHONE",
    language: "Langue de l'interface",
    authTabs: "Authentification",
    strength: "Robustesse du mot de passe",
    google: "Continuer avec Google",
    github: "Continuer avec GitHub",
    network: "Réseau",
    networkReady: "Prêt",
    storage: "Stockage",
    localFirst: "Local d'abord",
    local: "Heure locale",
    environment: "ENVIRONNEMENT PERSONNEL"
  }),
  en: Object.freeze({
    brandLine: "Your personal system, ready to open.",
    login: "Sign in",
    register: "Create account",
    identifier: "Email or username",
    password: "Password",
    continue: "Enter ETHONE",
    create: "Create my space",
    oauth: "or continue with",
    forgot: "Forgot password?",
    username: "Username",
    emailOptional: "Email (optional)",
    remember: "Stay signed in",
    loginSubtitle: "Continue exactly where you left off.",
    registerSubtitle: "Create your personal environment in seconds.",
    privacy: "Encrypted session",
    ready: "System ready",
    preview: "ETHONE preview",
    showPassword: "Show password",
    hidePassword: "Hide password",
    retry: "Try again",
    v8Only: "Unified runtime",
    screen: "Sign in to ETHONE",
    language: "Interface language",
    authTabs: "Authentication",
    strength: "Password strength",
    google: "Continue with Google",
    github: "Continue with GitHub",
    network: "Network",
    networkReady: "Ready",
    storage: "Storage",
    localFirst: "Local first",
    local: "Local time",
    environment: "PERSONAL OPERATING ENVIRONMENT"
  }),
  es: Object.freeze({
    brandLine: "Tu sistema personal, listo para abrirse.",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    identifier: "Email o usuario",
    password: "Contraseña",
    continue: "Entrar en ETHONE",
    create: "Crear mi espacio",
    oauth: "o continuar con",
    forgot: "¿Olvidaste tu contraseña?",
    username: "Usuario",
    emailOptional: "Email (opcional)",
    remember: "Mantener la sesión",
    loginSubtitle: "Continúa exactamente donde lo dejaste.",
    registerSubtitle: "Crea tu entorno personal en segundos.",
    privacy: "Sesión cifrada",
    ready: "Sistema listo",
    preview: "Vista previa de ETHONE",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    retry: "Reintentar",
    v8Only: "Runtime unificado",
    screen: "Iniciar sesión en ETHONE",
    language: "Idioma de la interfaz",
    authTabs: "Autenticación",
    strength: "Seguridad de la contraseña",
    google: "Continuar con Google",
    github: "Continuar con GitHub",
    network: "Red",
    networkReady: "Lista",
    storage: "Almacenamiento",
    localFirst: "Primero local",
    local: "Hora local",
    environment: "ENTORNO OPERATIVO PERSONAL"
  }),
  de: Object.freeze({
    brandLine: "Dein persönliches System, bereit zum Start.",
    login: "Anmelden",
    register: "Konto erstellen",
    identifier: "E-Mail oder Benutzername",
    password: "Passwort",
    continue: "ETHONE öffnen",
    create: "Meinen Space erstellen",
    oauth: "oder weiter mit",
    forgot: "Passwort vergessen?",
    username: "Benutzername",
    emailOptional: "E-Mail (optional)",
    remember: "Angemeldet bleiben",
    loginSubtitle: "Mache genau dort weiter, wo du aufgehört hast.",
    registerSubtitle: "Erstelle deine persönliche Umgebung in Sekunden.",
    privacy: "Verschlüsselte Sitzung",
    ready: "System bereit",
    preview: "ETHONE Vorschau",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    retry: "Erneut versuchen",
    v8Only: "Einheitliche Runtime",
    screen: "Bei ETHONE anmelden",
    language: "Sprache der Oberfläche",
    authTabs: "Authentifizierung",
    strength: "Passwortstärke",
    google: "Weiter mit Google",
    github: "Weiter mit GitHub",
    network: "Netzwerk",
    networkReady: "Bereit",
    storage: "Speicher",
    localFirst: "Lokal zuerst",
    local: "Ortszeit",
    environment: "PERSÖNLICHE ARBEITSUMGEBUNG"
  })
});

export function passwordStrength(value) {
  const password = String(value ?? "");
  if (!password) return Object.freeze({ score: 0, label: "empty" });
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  score = Math.min(4, score);
  const labels = ["empty", "weak", "fair", "good", "strong"];
  return Object.freeze({ score, label: labels[score] });
}

function storedLocale(storage) {
  try {
    const locale = String(storage?.getItem("nexus_lang") || storage?.getItem("ethone_lang") || document.documentElement.lang || "fr").slice(0, 2).toLowerCase();
    return LOGIN_LOCALES[locale] ? locale : "fr";
  } catch {
    return "fr";
  }
}

function field({ id, type = "text", key, autocomplete, placeholder, bindings }) {
  const labelText = element("span", { className: "v8-field__label" });
  bindings.push({ node: labelText, key, target: "text" });
  const input = element("input", {
    className: "v8-input v8-auth__input",
    id,
    attributes: { type, autocomplete, placeholder, required: type !== "email" || null }
  });
  return {
    input,
    node: element("label", { className: "v8-field", attributes: { for: id } }, [labelText, input])
  };
}

function passwordField({ id, autocomplete, bindings, onToggle }) {
  const labelText = element("span", { className: "v8-field__label" });
  bindings.push({ node: labelText, key: "password", target: "text" });
  const input = element("input", {
    className: "v8-input v8-auth__input",
    id,
    attributes: { type: "password", autocomplete, required: true }
  });
  const toggle = element("button", {
    className: "v8-icon-button v8-auth__password-toggle",
    attributes: { type: "button", "aria-label": LOGIN_LOCALES.fr.showPassword, "aria-pressed": "false" },
    events: { click: () => onToggle(input, toggle) }
  }, icon("eye"));
  bindings.push({ node: toggle, key: "showPassword", target: "aria-label" });
  return {
    input,
    toggle,
    node: element("label", { className: "v8-field", attributes: { for: id } }, [
      labelText,
      element("span", { className: "v8-auth__password" }, [input, toggle])
    ])
  };
}

function telemetryItem(iconName, label, value) {
  const labelNode = element("span", { text: label });
  const valueNode = element("strong", { text: value });
  return Object.freeze({
    label: labelNode,
    value: valueNode,
    node: element("div", { className: "v8-entry__telemetry-item" }, [
    icon(iconName),
      labelNode,
      valueNode
    ])
  });
}

export function mountLogin(root, options = {}) {
  if (!root) throw new TypeError("Login requires a root element");
  const auth = options.auth;
  if (!auth) throw new TypeError("Login requires an auth adapter");
  const storage = options.storage || globalThis.localStorage;
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  const bindings = [];
  let locale = storedLocale(storage);
  let activeTab = "login";
  let available = options.authResult?.status !== "unavailable";
  let operation = 0;
  let destroyed = false;

  root.replaceChildren();
  root.dataset.entryState = "login";
  document.documentElement.dataset.entry = "login";

  const feedback = element("div", {
    className: "v8-auth__feedback",
    attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" }
  });

  function bindText(node, key, target = "text") {
    bindings.push({ node, key, target });
    return node;
  }

  const loginTab = element("button", {
    className: "v8-auth__tab is-active",
    attributes: { type: "button", role: "tab", id: "v8-auth-tab-login", "aria-controls": "v8-login-form", "aria-selected": "true", tabindex: "0" }
  });
  bindText(loginTab, "login");
  const registerTab = element("button", {
    className: "v8-auth__tab",
    attributes: { type: "button", role: "tab", id: "v8-auth-tab-register", "aria-controls": "v8-register-form", "aria-selected": "false", tabindex: "-1" }
  });
  bindText(registerTab, "register");
  const tabs = element("div", { className: "v8-auth__tabs", attributes: { role: "tablist", "aria-label": "Authentification" } }, [loginTab, registerTab]);

  const loginIdentifier = field({
    id: "v8-login-identifier",
    key: "identifier",
    autocomplete: "username",
    placeholder: "rub@example.com",
    bindings
  });
  const loginPassword = passwordField({ id: "v8-login-password", autocomplete: "current-password", bindings, onToggle: togglePassword });
  const rememberInput = element("input", { attributes: { type: "checkbox", id: "v8-auth-remember" } });
  try { rememberInput.checked = storage?.getItem("ethone_remember_auth") !== "0"; } catch { rememberInput.checked = true; }
  const rememberText = bindText(element("span"), "remember");
  const forgotButton = element("button", { className: "v8-auth__text-action", attributes: { type: "button" } });
  bindText(forgotButton, "forgot");
  const loginSubmit = element("button", { className: "v8-button v8-button--primary v8-auth__submit", attributes: { type: "submit" } }, [
    icon("arrow-right"), bindText(element("span"), "continue")
  ]);
  const loginForm = element("form", {
    className: "v8-auth__form",
    id: "v8-login-form",
    attributes: { "aria-labelledby": "v8-auth-tab-login", novalidate: true }
  }, [
    loginIdentifier.node,
    loginPassword.node,
    element("div", { className: "v8-auth__form-row" }, [
      element("label", { className: "v8-auth__remember", attributes: { for: "v8-auth-remember" } }, [rememberInput, rememberText]),
      forgotButton
    ]),
    loginSubmit
  ]);

  const registerUsername = field({ id: "v8-register-username", key: "username", autocomplete: "username", placeholder: "Rub", bindings });
  const registerEmail = field({ id: "v8-register-email", type: "email", key: "emailOptional", autocomplete: "email", placeholder: "rub@example.com", bindings });
  const registerPassword = passwordField({ id: "v8-register-password", autocomplete: "new-password", bindings, onToggle: togglePassword });
  const strengthLabel = element("span", { className: "v8-auth__strength-label", text: "" });
  const strength = element("div", { className: "v8-auth__strength", attributes: { role: "meter", "aria-label": "Robustesse du mot de passe", "aria-valuemin": "0", "aria-valuemax": "4", "aria-valuenow": "0" } }, [
    element("span"), element("span"), element("span"), element("span"), strengthLabel
  ]);
  const registerSubmit = element("button", { className: "v8-button v8-button--primary v8-auth__submit", attributes: { type: "submit" } }, [
    icon("sparkles"), bindText(element("span"), "create")
  ]);
  const registerForm = element("form", {
    className: "v8-auth__form",
    id: "v8-register-form",
    attributes: { "aria-labelledby": "v8-auth-tab-register", "aria-hidden": "true", novalidate: true, hidden: true }
  }, [registerUsername.node, registerEmail.node, registerPassword.node, strength, registerSubmit]);

  const oauthLabel = bindText(element("span"), "oauth");
  const googleButton = element("button", { className: "v8-button v8-button--secondary v8-auth__oauth-button", attributes: { type: "button", "aria-label": "Continuer avec Google" } }, [icon("chrome"), element("span", { text: "Google" })]);
  const githubButton = element("button", { className: "v8-button v8-button--secondary v8-auth__oauth-button", attributes: { type: "button", "aria-label": "Continuer avec GitHub" } }, [icon("github"), element("span", { text: "GitHub" })]);

  const retryButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [icon("refresh-cw"), bindText(element("span"), "retry")]);
  const v8OnlyNotice = element("span", { className: "v8-badge v8-badge--accent" }, [bindText(element("span"), "v8Only")]);
  const recovery = element("div", { className: "v8-auth__recovery", attributes: { hidden: available ? true : null } }, [retryButton, v8OnlyNotice]);

  const title = bindText(element("p", { className: "v8-auth__subtitle" }), "loginSubtitle");
  const instrument = element("section", { className: "v8-auth v8-surface", attributes: { "aria-labelledby": "v8-entry-title" } }, [
    element("div", { className: "v8-auth__header" }, [
      element("div", { className: "v8-auth__status" }, [element("span", { className: "v8-auth__status-dot" }), bindText(element("span"), "ready")]),
      title
    ]),
    tabs,
    feedback,
    element("div", { className: "v8-auth__forms" }, [loginForm, registerForm]),
    element("div", { className: "v8-auth__divider" }, [oauthLabel]),
    element("div", { className: "v8-auth__oauth" }, [googleButton, githubButton]),
    recovery
  ]);

  const localeSelect = element("select", { className: "v8-entry__locale", attributes: { "aria-label": "Langue de l'interface" } }, [
    element("option", { text: "Français", attributes: { value: "fr" } }),
    element("option", { text: "English", attributes: { value: "en" } }),
    element("option", { text: "Español", attributes: { value: "es" } }),
    element("option", { text: "Deutsch", attributes: { value: "de" } })
  ]);
  localeSelect.value = locale;

  const networkTelemetry = telemetryItem("wifi", "Network", "Ready");
  const storageTelemetry = telemetryItem("hard-drive", "Storage", "Local first");
  const timeTelemetry = telemetryItem("clock-3", "Local", "");
  bindings.push(
    { node: networkTelemetry.label, key: "network", target: "text" },
    { node: networkTelemetry.value, key: "networkReady", target: "text" },
    { node: storageTelemetry.label, key: "storage", target: "text" },
    { node: storageTelemetry.value, key: "localFirst", target: "text" },
    { node: timeTelemetry.label, key: "local", target: "text" }
  );

  const surface = element("section", { className: "v8-entry v8-entry--login", attributes: { "aria-label": "Connexion à ETHONE" }, dataset: { i18nIgnore: "" } }, [
    element("div", { className: "v8-entry__signal-field", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
    element("div", { className: "v8-entry__frame" }, [
      element("header", { className: "v8-entry__topbar" }, [
        element("div", { className: "v8-entry__brand" }, [
          element("span", { className: "v8-entry__mark", text: "E", attributes: { "aria-hidden": "true" } }),
          element("span", { className: "v8-entry__wordmark", text: "ETHONE" }),
          element("span", { className: "v8-badge", text: "OS" })
        ]),
        element("div", { className: "v8-entry__utilities" }, [
          element("span", { className: "v8-entry__privacy" }, [icon("shield-check"), bindText(element("span"), "privacy")]),
          localeSelect
        ])
      ]),
      element("main", { className: "v8-entry__main" }, [
        element("div", { className: "v8-entry__intro" }, [
          bindText(element("span", { className: "v8-entry__eyebrow" }), "environment"),
          element("h1", { className: "v8-entry__title", id: "v8-entry-title", text: "ETHONE" }),
          bindText(element("p", { className: "v8-entry__brand-line" }), "brandLine"),
          element("span", { className: "v8-entry__monogram", text: "08", attributes: { "aria-hidden": "true" } })
        ]),
        instrument
      ]),
      element("footer", { className: "v8-entry__footer" }, [
        element("div", { className: "v8-entry__telemetry" }, [
          networkTelemetry.node,
          storageTelemetry.node,
          timeTelemetry.node
        ]),
        bindText(element("span", { className: "v8-entry__preview" }), "preview")
      ])
    ])
  ]);

  root.append(surface);

  function applyCopy() {
    const copy = LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr;
    bindings.forEach(({ node, key, target }) => {
      if (!node || !copy[key]) return;
      if (target === "aria-label") node.setAttribute("aria-label", copy[key]);
      else node.textContent = copy[key];
    });
    title.textContent = activeTab === "login" ? copy.loginSubtitle : copy.registerSubtitle;
    loginPassword.toggle.setAttribute("aria-label", loginPassword.input.type === "password" ? copy.showPassword : copy.hidePassword);
    registerPassword.toggle.setAttribute("aria-label", registerPassword.input.type === "password" ? copy.showPassword : copy.hidePassword);
    surface.setAttribute("aria-label", copy.screen);
    localeSelect.setAttribute("aria-label", copy.language);
    tabs.setAttribute("aria-label", copy.authTabs);
    strength.setAttribute("aria-label", copy.strength);
    googleButton.setAttribute("aria-label", copy.google);
    githubButton.setAttribute("aria-label", copy.github);
    timeTelemetry.value.textContent = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date());
    document.documentElement.lang = locale;
  }

  function setTab(tab, focus = false) {
    activeTab = tab === "register" ? "register" : "login";
    const loginActive = activeTab === "login";
    loginTab.classList.toggle("is-active", loginActive);
    registerTab.classList.toggle("is-active", !loginActive);
    loginTab.setAttribute("aria-selected", String(loginActive));
    registerTab.setAttribute("aria-selected", String(!loginActive));
    loginTab.tabIndex = loginActive ? 0 : -1;
    registerTab.tabIndex = loginActive ? -1 : 0;
    loginForm.hidden = !loginActive;
    registerForm.hidden = loginActive;
    loginForm.setAttribute("aria-hidden", String(!loginActive));
    registerForm.setAttribute("aria-hidden", String(loginActive));
    feedback.textContent = "";
    feedback.dataset.type = "";
    applyCopy();
    if (focus) (loginActive ? loginIdentifier.input : registerUsername.input).focus();
  }

  function togglePassword(input, button) {
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.setAttribute("aria-pressed", String(reveal));
    button.replaceChildren(icon(reveal ? "eye-off" : "eye"));
    applyCopy();
    refreshIcons();
  }

  function showFeedback(message, type = "error") {
    feedback.textContent = message || "";
    feedback.dataset.type = message ? type : "";
  }

  function setBusy(form, submit, busy) {
    form.setAttribute("aria-busy", String(busy));
    submit.disabled = busy || !available;
    submit.classList.toggle("is-loading", busy);
  }

  function setAvailable(next, message = "") {
    available = Boolean(next);
    [loginSubmit, registerSubmit, googleButton, githubButton].forEach((control) => { control.disabled = !available; });
    recovery.hidden = available;
    if (message) showFeedback(message, available ? "success" : "error");
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (!available) return;
    const token = ++operation;
    setBusy(loginForm, loginSubmit, true);
    showFeedback("");
    const response = await auth.signIn({
      identifier: loginIdentifier.input.value,
      password: loginPassword.input.value,
      remember: rememberInput.checked
    });
    if (destroyed || token !== operation) return;
    setBusy(loginForm, loginSubmit, false);
    if (!response.ok) {
      loginPassword.input.value = "";
      showFeedback(response.message, "error");
      loginPassword.input.focus();
      return;
    }
    showFeedback(response.message, "success");
    await options.onAuthenticated?.(response.data);
  }

  async function submitRegister(event) {
    event.preventDefault();
    if (!available) return;
    const token = ++operation;
    setBusy(registerForm, registerSubmit, true);
    showFeedback("");
    const response = await auth.signUp({
      username: registerUsername.input.value,
      email: registerEmail.input.value,
      password: registerPassword.input.value
    });
    if (destroyed || token !== operation) return;
    setBusy(registerForm, registerSubmit, false);
    if (!response.ok) {
      showFeedback(response.message, "error");
      registerPassword.input.focus();
      return;
    }
    showFeedback(response.message, "success");
    if (response.data?.session?.user) await options.onAuthenticated?.(response.data);
    else setTab("login", true);
  }

  async function resetPassword() {
    if (!available) return;
    const response = await auth.resetPassword(loginIdentifier.input.value);
    if (!destroyed) showFeedback(response.message, response.ok ? "success" : "error");
  }

  async function oauth(provider) {
    if (!available) return;
    const response = await auth.signInWithOAuth(provider);
    if (!destroyed && !response.ok) showFeedback(response.message, "error");
  }

  loginTab.addEventListener("click", () => setTab("login", true), listenerOptions);
  registerTab.addEventListener("click", () => setTab("register", true), listenerOptions);
  tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setTab(event.key === "ArrowLeft" || event.key === "Home" ? "login" : "register", true);
  }, listenerOptions);
  loginForm.addEventListener("submit", submitLogin, listenerOptions);
  registerForm.addEventListener("submit", submitRegister, listenerOptions);
  forgotButton.addEventListener("click", resetPassword, listenerOptions);
  googleButton.addEventListener("click", () => oauth("google"), listenerOptions);
  githubButton.addEventListener("click", () => oauth("github"), listenerOptions);
  retryButton.addEventListener("click", async () => {
    retryButton.classList.add("is-loading");
    const response = await auth.initialize();
    retryButton.classList.remove("is-loading");
    if (!destroyed) setAvailable(response.ok, response.message);
  }, listenerOptions);
  localeSelect.addEventListener("change", () => {
    locale = LOGIN_LOCALES[localeSelect.value] ? localeSelect.value : "fr";
    try {
      storage?.setItem("nexus_lang", locale);
      storage?.setItem("ethone_lang", locale);
    } catch {}
    applyCopy();
    globalThis.dispatchEvent?.(new CustomEvent("ethone:language-changed", { detail: { language: locale } }));
  }, listenerOptions);
  registerPassword.input.addEventListener("input", () => {
    const next = passwordStrength(registerPassword.input.value);
    strength.dataset.score = String(next.score);
    strength.setAttribute("aria-valuenow", String(next.score));
    strengthLabel.textContent = next.label === "empty" ? "" : next.label;
  }, listenerOptions);

  applyCopy();
  setAvailable(available, options.authResult?.message || "");
  refreshIcons();
  queueMicrotask(() => { if (!destroyed) loginIdentifier.input.focus(); });

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    operation += 1;
    abortController.abort();
    surface.remove();
    root.removeAttribute("data-entry-state");
    if (document.documentElement.dataset.entry === "login") delete document.documentElement.dataset.entry;
    return true;
  }

  return Object.freeze({
    destroy,
    focus: () => (activeTab === "login" ? loginIdentifier.input : registerUsername.input).focus(),
    tab: () => activeTab
  });
}
