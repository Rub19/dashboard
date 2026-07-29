import { element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { clearFieldState, enhanceForm, formField as createFormField, passwordControl, runFormSubmission, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createSelect } from "../ui/select.mjs";
import { BRAND_MARK_SVG } from "../ui/navigation.mjs";

function brandMark(className) {
  const mark = element("span", { className, attributes: { "aria-hidden": "true" } });
  mark.innerHTML = BRAND_MARK_SVG;
  return mark;
}

export const LOGIN_LOCALES = Object.freeze({
  fr: Object.freeze({
    brandLine: "Votre environnement numérique. Réinventé.",
    login: "Connexion",
    register: "Créer un compte",
    identifier: "E-mail ou identifiant",
    password: "Mot de passe",
    continue: "Entrer dans ETHONE",
    create: "Créer mon espace",
    loginLoading: "Connexion sécurisée...",
    registerLoading: "Création de votre espace...",
    oauth: "ou continuer avec",
    forgot: "Mot de passe oublié ?",
    username: "Nom d'utilisateur",
    email: "E-mail",
    remember: "Rester connecté",
    rememberDetail: "Uniquement sur cet appareil",
    loginSubtitle: "Reprenez exactement là où vous vous êtes arrêté.",
    registerSubtitle: "Créez votre environnement personnel en quelques secondes.",
    privacy: "Session chiffrée",
    ready: "Système prêt",
    preview: "Aperçu ETHONE",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    retry: "Réessayer",
    authUnavailableEyebrow: "Connexion protégée",
    authUnavailableTitle: "Supabase est indisponible",
    authUnavailableDescription: "Vérifiez votre connexion, puis réessayez.",
    screen: "Connexion à ETHONE",
    language: "Langue de l'interface",
    authTabs: "Authentification",
    strength: "Robustesse du mot de passe",
    strengthWeak: "Faible",
    strengthFair: "Moyen",
    strengthGood: "Bon",
    strengthStrong: "Fort",
    google: "Continuer avec Google",
    github: "Continuer avec GitHub",
    network: "Réseau",
    networkReady: "Prêt",
    storage: "Supabase",
    cloudReady: "Cloud disponible",
    cloudUnavailable: "Cloud indisponible",
    local: "Heure locale",
    environment: "ENVIRONNEMENT PERSONNEL",
    capabilities: "Les fondamentaux d'ETHONE",
    brain: "Brain",
    spaces: "Spaces",
    flows: "Flows",
    cloudSync: "Sync cloud",
    security: "Sécurité",
    widgets: "Widgets"
  }),
  en: Object.freeze({
    brandLine: "Your digital environment. Reimagined.",
    login: "Sign in",
    register: "Create account",
    identifier: "Email or username",
    password: "Password",
    continue: "Enter ETHONE",
    create: "Create my space",
    loginLoading: "Signing in securely...",
    registerLoading: "Creating your space...",
    oauth: "or continue with",
    forgot: "Forgot password?",
    username: "Username",
    email: "Email",
    remember: "Stay signed in",
    rememberDetail: "Only on this device",
    loginSubtitle: "Continue exactly where you left off.",
    registerSubtitle: "Create your personal environment in seconds.",
    privacy: "Encrypted session",
    ready: "System ready",
    preview: "ETHONE preview",
    showPassword: "Show password",
    hidePassword: "Hide password",
    retry: "Try again",
    authUnavailableEyebrow: "Protected connection",
    authUnavailableTitle: "Supabase is unavailable",
    authUnavailableDescription: "Check your connection, then try again.",
    screen: "Sign in to ETHONE",
    language: "Interface language",
    authTabs: "Authentication",
    strength: "Password strength",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
    google: "Continue with Google",
    github: "Continue with GitHub",
    network: "Network",
    networkReady: "Ready",
    storage: "Supabase",
    cloudReady: "Cloud available",
    cloudUnavailable: "Cloud unavailable",
    local: "Local time",
    environment: "PERSONAL OPERATING ENVIRONMENT",
    capabilities: "ETHONE essentials",
    brain: "Brain",
    spaces: "Spaces",
    flows: "Flows",
    cloudSync: "Cloud sync",
    security: "Security",
    widgets: "Widgets"
  }),
  es: Object.freeze({
    brandLine: "Tu entorno digital. Reinventado.",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    identifier: "Email o usuario",
    password: "Contraseña",
    continue: "Entrar en ETHONE",
    create: "Crear mi espacio",
    loginLoading: "Iniciando sesión de forma segura...",
    registerLoading: "Creando tu espacio...",
    oauth: "o continuar con",
    forgot: "¿Olvidaste tu contraseña?",
    username: "Usuario",
    email: "Email",
    remember: "Mantener la sesión",
    rememberDetail: "Solo en este dispositivo",
    loginSubtitle: "Continúa exactamente donde lo dejaste.",
    registerSubtitle: "Crea tu entorno personal en segundos.",
    privacy: "Sesión cifrada",
    ready: "Sistema listo",
    preview: "Vista previa de ETHONE",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    retry: "Reintentar",
    authUnavailableEyebrow: "Conexión protegida",
    authUnavailableTitle: "Supabase no está disponible",
    authUnavailableDescription: "Comprueba tu conexión y vuelve a intentarlo.",
    screen: "Iniciar sesión en ETHONE",
    language: "Idioma de la interfaz",
    authTabs: "Autenticación",
    strength: "Seguridad de la contraseña",
    strengthWeak: "Débil",
    strengthFair: "Media",
    strengthGood: "Buena",
    strengthStrong: "Fuerte",
    google: "Continuar con Google",
    github: "Continuar con GitHub",
    network: "Red",
    networkReady: "Lista",
    storage: "Supabase",
    cloudReady: "Cloud disponible",
    cloudUnavailable: "Cloud no disponible",
    local: "Hora local",
    environment: "ENTORNO OPERATIVO PERSONAL",
    capabilities: "Esenciales de ETHONE",
    brain: "Brain",
    spaces: "Spaces",
    flows: "Flows",
    cloudSync: "Sincronización",
    security: "Seguridad",
    widgets: "Widgets"
  }),
  de: Object.freeze({
    brandLine: "Deine digitale Umgebung. Neu gedacht.",
    login: "Anmelden",
    register: "Konto erstellen",
    identifier: "E-Mail oder Benutzername",
    password: "Passwort",
    continue: "ETHONE öffnen",
    create: "Meinen Space erstellen",
    loginLoading: "Sichere Anmeldung...",
    registerLoading: "Dein Space wird erstellt...",
    oauth: "oder weiter mit",
    forgot: "Passwort vergessen?",
    username: "Benutzername",
    email: "E-Mail",
    remember: "Angemeldet bleiben",
    rememberDetail: "Nur auf diesem Gerät",
    loginSubtitle: "Mache genau dort weiter, wo du aufgehört hast.",
    registerSubtitle: "Erstelle deine persönliche Umgebung in Sekunden.",
    privacy: "Verschlüsselte Sitzung",
    ready: "System bereit",
    preview: "ETHONE Vorschau",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    retry: "Erneut versuchen",
    authUnavailableEyebrow: "Geschützte Verbindung",
    authUnavailableTitle: "Supabase ist nicht verfügbar",
    authUnavailableDescription: "Prüfe die Verbindung und versuche es erneut.",
    screen: "Bei ETHONE anmelden",
    language: "Sprache der Oberfläche",
    authTabs: "Authentifizierung",
    strength: "Passwortstärke",
    strengthWeak: "Schwach",
    strengthFair: "Mittel",
    strengthGood: "Gut",
    strengthStrong: "Stark",
    google: "Weiter mit Google",
    github: "Weiter mit GitHub",
    network: "Netzwerk",
    networkReady: "Bereit",
    storage: "Supabase",
    cloudReady: "Cloud verfugbar",
    cloudUnavailable: "Cloud nicht verfugbar",
    local: "Ortszeit",
    environment: "PERSÖNLICHE ARBEITSUMGEBUNG",
    capabilities: "ETHONE Grundlagen",
    brain: "Brain",
    spaces: "Spaces",
    flows: "Flows",
    cloudSync: "Cloud-Sync",
    security: "Sicherheit",
    widgets: "Widgets"
  })
});

export function passwordStrength(value) {
  const password = String(value ?? "");
  if (!password) return Object.freeze({ score: 0, label: "empty" });
  let score = 0;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9\s]/.test(password)) score += 1;
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

function field({ id, type = "text", key, autocomplete, placeholder, bindings, required = type !== "email" }) {
  const labelText = element("span", { className: "v8-auth__label-text" });
  bindings.push({ node: labelText, key, target: "text" });
  const input = element("input", {
    className: "v8-input v8-auth__input",
    id,
    attributes: { type, autocomplete, placeholder, required: required || null }
  });
  return {
    input,
    node: createFormField({ label: labelText, control: input, required })
  };
}

function passwordField({ id, autocomplete, bindings, signal }) {
  const labelText = element("span", { className: "v8-auth__label-text" });
  bindings.push({ node: labelText, key: "password", target: "text" });
  const input = element("input", {
    className: "v8-input v8-auth__input",
    id,
    attributes: { type: "password", autocomplete, required: true, minlength: autocomplete === "new-password" ? "12" : null, maxlength: "128" }
  });
  const password = passwordControl(input, {
    className: "v8-auth__password",
    buttonClassName: "v8-auth__password-toggle",
    showLabel: LOGIN_LOCALES.fr.showPassword,
    hideLabel: LOGIN_LOCALES.fr.hidePassword,
    signal
  });
  return {
    input,
    toggle: password.toggle,
    password,
    node: createFormField({ label: labelText, control: password.node, input, required: true, counter: false })
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
  const clockManager = options.clockManager || null;
  const storage = options.storage || globalThis.localStorage;
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  const bindings = [];
  let locale = storedLocale(storage);
  let activeTab = "login";
  let available = options.authResult?.status !== "unavailable";
  let operation = 0;
  let destroyed = false;
  let pointerFrame = null;
  let pointerX = 0;
  let pointerY = 0;

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
  const loginPassword = passwordField({ id: "v8-login-password", autocomplete: "current-password", bindings, signal: abortController.signal });
  const rememberInput = element("input", {
    className: "v8-checkbox v8-auth__remember-control",
    attributes: { type: "checkbox", id: "v8-auth-remember", "aria-describedby": "v8-auth-remember-detail" }
  });
  try { rememberInput.checked = storage?.getItem("ethone_remember_auth") !== "0"; } catch { rememberInput.checked = true; }
  const rememberText = bindText(element("span", { className: "v8-auth__remember-title" }), "remember");
  const rememberDetail = bindText(element("small", { className: "v8-auth__remember-detail", id: "v8-auth-remember-detail" }), "rememberDetail");
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
      element("label", { className: "v8-auth__remember", attributes: { for: "v8-auth-remember" } }, [
        rememberInput,
        element("span", { className: "v8-auth__remember-copy" }, [rememberText, rememberDetail])
      ]),
      forgotButton
    ]),
    loginSubmit
  ]);

  const registerUsername = field({ id: "v8-register-username", key: "username", autocomplete: "username", placeholder: "Rub", bindings });
  const registerEmail = field({ id: "v8-register-email", type: "email", key: "email", autocomplete: "email", placeholder: "rub@example.com", bindings, required: true });
  const registerPassword = passwordField({ id: "v8-register-password", autocomplete: "new-password", bindings, signal: abortController.signal });
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
    attributes: { "aria-labelledby": "v8-auth-tab-register", "aria-hidden": "true", inert: "", novalidate: true }
  }, [registerUsername.node, registerEmail.node, registerPassword.node, strength, registerSubmit]);
  enhanceForm(loginForm, { signal: abortController.signal });
  enhanceForm(registerForm, { signal: abortController.signal });

  const oauthLabel = bindText(element("span"), "oauth");
  const googleButton = element("button", { className: "v8-button v8-button--secondary v8-auth__oauth-button", attributes: { type: "button", "aria-label": "Continuer avec Google" } }, [icon("chrome"), element("span", { text: "Google" })]);
  const githubButton = element("button", { className: "v8-button v8-button--secondary v8-auth__oauth-button", attributes: { type: "button", "aria-label": "Continuer avec GitHub" } }, [icon("github"), element("span", { text: "GitHub" })]);

  const retryButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" } }, [icon("refresh-cw"), bindText(element("span"), "retry")]);
  const initialRecoveryCopy = LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr;
  const recovery = statusState(globalThis.navigator?.onLine === false ? "offline" : "error", {
    eyebrow: initialRecoveryCopy.authUnavailableEyebrow,
    title: initialRecoveryCopy.authUnavailableTitle,
    description: initialRecoveryCopy.authUnavailableDescription,
    actions: [retryButton],
    inline: true,
    className: "v8-auth__recovery"
  });
  recovery.hidden = available;
  const recoveryDescription = recovery.querySelector(".v8-empty-state__copy p");
  bindings.push(
    { node: recovery.querySelector(".v8-empty-state__eyebrow"), key: "authUnavailableEyebrow", target: "text" },
    { node: recovery.querySelector("h2"), key: "authUnavailableTitle", target: "text" },
    { node: recovery, key: "authUnavailableTitle", target: "aria-label" }
  );

  const title = bindText(element("p", { className: "v8-auth__subtitle" }), "loginSubtitle");
  const instrument = element("section", { className: "v8-auth v8-surface", attributes: { "aria-labelledby": "v8-entry-title" }, dataset: { authMode: "login" } }, [
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
  const instrumentShell = element("div", { className: "v8-auth-shell" }, [instrument]);

  const localeSelect = createSelect({ className: "v8-entry__locale", attributes: { "aria-label": "Langue de l'interface" } }, [
    element("option", { text: "Français", attributes: { value: "fr" } }),
    element("option", { text: "English", attributes: { value: "en" } }),
    element("option", { text: "Español", attributes: { value: "es" } }),
    element("option", { text: "Deutsch", attributes: { value: "de" } })
  ]);
  localeSelect.value = locale;

  const networkTelemetry = telemetryItem("wifi", "Network", "Ready");
  const storageTelemetry = telemetryItem("cloud", "Supabase", "Cloud available");
  const timeTelemetry = telemetryItem("clock-3", "Local", "");
  bindings.push(
    { node: networkTelemetry.label, key: "network", target: "text" },
    { node: networkTelemetry.value, key: "networkReady", target: "text" },
    { node: storageTelemetry.label, key: "storage", target: "text" },
    { node: timeTelemetry.label, key: "local", target: "text" }
  );

  function capability(iconName, key) {
    return element("li", { className: "v8-entry__capability" }, [
      element("span", { className: "v8-entry__capability-icon", attributes: { "aria-hidden": "true" } }, [icon(iconName)]),
      bindText(element("span", { className: "v8-entry__capability-label" }), key)
    ]);
  }

  const capabilities = element("ul", { className: "v8-entry__capabilities" }, [
    capability("brain", "brain"),
    capability("layers-3", "spaces"),
    capability("workflow", "flows"),
    capability("cloud", "cloudSync"),
    capability("shield-check", "security"),
    capability("layout-grid", "widgets")
  ]);
  bindings.push({ node: capabilities, key: "capabilities", target: "aria-label" });

  const surface = element("section", { className: "v8-entry v8-entry--login", attributes: { "aria-label": "Connexion à ETHONE" }, dataset: { i18nIgnore: "" } }, [
    element("div", { className: "v8-entry__signal-field", attributes: { "aria-hidden": "true" } }, [
      element("span"),
      element("span"),
      element("span"),
      element("div", { className: "v8-entry__particles" }, [
        element("i", { className: "v8-entry__particle" }),
        element("i", { className: "v8-entry__particle" }),
        element("i", { className: "v8-entry__particle" }),
        element("i", { className: "v8-entry__particle" })
      ])
    ]),
    element("div", { className: "v8-entry__frame" }, [
      element("header", { className: "v8-entry__topbar" }, [
        element("div", { className: "v8-entry__brand" }, [
          brandMark("v8-entry__mark"),
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
          capabilities,
          element("span", { className: "v8-entry__monogram", text: "8", attributes: { "aria-hidden": "true" } })
        ]),
        instrumentShell
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

  function commitPointerHalo() {
    pointerFrame = null;
    if (destroyed) return;
    surface.style.setProperty("--v8-login-pointer-x", `${Math.round(pointerX)}px`);
    surface.style.setProperty("--v8-login-pointer-y", `${Math.round(pointerY)}px`);
  }

  function handlePointerMove(event) {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    surface.dataset.pointerHalo = "ready";
    if (pointerFrame !== null) return;
    pointerFrame = globalThis.requestAnimationFrame(commitPointerHalo);
  }

  const finePointer = globalThis.matchMedia?.("(hover: hover) and (pointer: fine)");
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (finePointer?.matches && !reducedMotion?.matches) {
    surface.addEventListener("pointermove", handlePointerMove, { signal: abortController.signal, passive: true });
    surface.addEventListener("pointerleave", () => { surface.dataset.pointerHalo = "idle"; }, listenerOptions);
  }

  function applyCopy() {
    const copy = LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr;
    bindings.forEach(({ node, key, target }) => {
      if (!node || !copy[key]) return;
      if (target === "aria-label") node.setAttribute("aria-label", copy[key]);
      else node.textContent = copy[key];
    });
    title.textContent = activeTab === "login" ? copy.loginSubtitle : copy.registerSubtitle;
    loginPassword.password.setLabels(copy.showPassword, copy.hidePassword);
    registerPassword.password.setLabels(copy.showPassword, copy.hidePassword);
    surface.setAttribute("aria-label", copy.screen);
    localeSelect.setAttribute("aria-label", copy.language);
    tabs.setAttribute("aria-label", copy.authTabs);
    strength.setAttribute("aria-label", copy.strength);
    updatePasswordStrength();
    googleButton.setAttribute("aria-label", copy.google);
    githubButton.setAttribute("aria-label", copy.github);
    storageTelemetry.value.textContent = available ? copy.cloudReady : copy.cloudUnavailable;
    recoveryDescription.textContent = copy.authUnavailableDescription;
    timeTelemetry.value.textContent = clockManager?.snapshot?.().time || new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date());
    document.documentElement.lang = locale;
  }

  function updatePasswordStrength() {
    const next = passwordStrength(registerPassword.input.value);
    const copy = LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr;
    const labelKey = { weak: "strengthWeak", fair: "strengthFair", good: "strengthGood", strong: "strengthStrong" }[next.label];
    strength.dataset.score = String(next.score);
    strength.setAttribute("aria-valuenow", String(next.score));
    strengthLabel.textContent = labelKey ? copy[labelKey] : "";
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
    instrument.dataset.authMode = activeTab;
    loginForm.toggleAttribute("inert", !loginActive);
    registerForm.toggleAttribute("inert", loginActive);
    loginForm.setAttribute("aria-hidden", String(!loginActive));
    registerForm.setAttribute("aria-hidden", String(loginActive));
    feedback.textContent = "";
    feedback.dataset.type = "";
    [loginIdentifier.input, loginPassword.input, registerUsername.input, registerEmail.input, registerPassword.input].forEach(clearFieldState);
    applyCopy();
    if (focus) (loginActive ? loginIdentifier.input : registerUsername.input).focus();
  }

  function showFeedback(message, type = "error") {
    feedback.textContent = message || "";
    feedback.dataset.type = message ? type : "";
  }

  function setAvailable(next, message = "") {
    available = Boolean(next);
    const copy = LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr;
    storageTelemetry.value.textContent = available ? copy.cloudReady : copy.cloudUnavailable;
    [loginSubmit, registerSubmit, googleButton, githubButton, rememberInput].forEach((control) => { control.disabled = !available; });
    recovery.hidden = available;
    if (!available) {
      recoveryDescription.textContent = copy.authUnavailableDescription;
      showFeedback("");
    } else if (message) showFeedback(message, "success");
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (!available) return;
    const token = ++operation;
    showFeedback("");
    const submission = await runFormSubmission({
      form: loginForm,
      submit: loginSubmit,
      status: feedback,
      messages: { loading: (LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr).loginLoading },
      task: () => auth.signIn({ identifier: loginIdentifier.input.value, password: loginPassword.input.value, remember: rememberInput.checked })
    });
    if (!submission.accepted) return;
    if (destroyed || token !== operation) return;
    const response = submission.value;
    if (submission.error || !response) {
      showFeedback("Connexion momentanement indisponible. Reessayez.", "error");
      return;
    }
    if (!response.ok) {
      loginPassword.input.value = "";
      setFieldState(loginPassword.input, "invalid", response.message);
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
    showFeedback("");
    const submission = await runFormSubmission({
      form: registerForm,
      submit: registerSubmit,
      status: feedback,
      messages: { loading: (LOGIN_LOCALES[locale] || LOGIN_LOCALES.fr).registerLoading },
      task: () => auth.signUp({ username: registerUsername.input.value, email: registerEmail.input.value, password: registerPassword.input.value })
    });
    if (!submission.accepted) return;
    if (destroyed || token !== operation) return;
    const response = submission.value;
    if (submission.error || !response) {
      showFeedback("Creation de compte momentanement indisponible. Reessayez.", "error");
      return;
    }
    if (!response.ok) {
      setFieldState(registerPassword.input, "invalid", response.message);
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
    updatePasswordStrength();
  }, listenerOptions);

  applyCopy();
  const releaseClock = clockManager?.subscribe?.((snapshot) => { timeTelemetry.value.textContent = snapshot.time; }) || (() => {});
  setAvailable(available, options.authResult?.message || "");
  refreshIcons();
  queueMicrotask(() => { if (!destroyed) loginIdentifier.input.focus(); });

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    operation += 1;
    if (pointerFrame !== null) globalThis.cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    releaseClock();
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
