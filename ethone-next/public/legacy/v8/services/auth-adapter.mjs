import { WORKER_API_BASE_URL } from "./external-services-config.mjs";
import { createRateLimiter } from "./rate-limiter.mjs";

const DEFAULT_TIMEOUT_MS = 12000;
const USERNAME_SUFFIX = "@dashboard.local";
const OAUTH_PROVIDERS = Object.freeze({
  google: "email profile",
  github: "read:user user:email"
});
const ATTEMPT_POLICIES = Object.freeze({
  signIn: Object.freeze({ limit: 5, windowMs: 60_000, blockMs: 60_000 }),
  signUp: Object.freeze({ limit: 3, windowMs: 600_000, blockMs: 600_000 }),
  resetPassword: Object.freeze({ limit: 3, windowMs: 900_000, blockMs: 900_000 }),
  oauth: Object.freeze({ limit: 6, windowMs: 60_000, blockMs: 60_000 }),
  updatePassword: Object.freeze({ limit: 5, windowMs: 300_000, blockMs: 300_000 })
});

export const AUTH_STATES = Object.freeze({
  initializing: "initializing",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  refreshing: "refreshing",
  recovering: "recovering",
  signingIn: "signing-in",
  signingOut: "signing-out",
  error: "error"
});

function result(ok, status, message, data = null) {
  return Object.freeze({ ok, status, message, data });
}

function completed(message, data = null) {
  return result(true, "completed", message, data);
}

function failed(message, data = null) {
  return result(false, "failed", message, data);
}

function unavailable(message) {
  return result(false, "unavailable", message, null);
}

function rateLimited() {
  return result(false, "rate-limited", "Trop de tentatives. Patientez quelques instants avant de réessayer.", null);
}

function cleanText(value, limit = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, limit);
}

function validEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  return email.length >= 5 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateNewPassword(value) {
  const password = String(value ?? "");
  const valid = password.length >= 12
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9\s]/.test(password)
    && !/[\u0000-\u001f\u007f]/.test(password);
  return Object.freeze({
    valid,
    message: valid ? "" : "Utilisez au moins 12 caractères avec une minuscule, une majuscule, un chiffre et un symbole."
  });
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const email = cleanText(user.email, 320);
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const name = cleanText(metadata.full_name || metadata.name || metadata.username || email.split("@")[0] || "Utilisateur", 80);
  return Object.freeze({
    id: cleanText(user.id, 120),
    email,
    name
  });
}

function sanitizeSession(session) {
  if (!session || typeof session !== "object") return null;
  const user = sanitizeUser(session.user);
  return user ? Object.freeze({ user }) : null;
}

function providerMessage(error, fallback) {
  return cleanText(error?.message || fallback, 320) || fallback;
}

function withTimeout(promise, timeoutMs) {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Le service a dépassé le temps d'attente.")), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

export function createAuthAdapter(options = {}) {
  const runtime = options.runtime || globalThis;
  const storage = options.storage || runtime.localStorage;
  const attemptLimiter = options.rateLimiter || createRateLimiter();
  const ownsRateLimiter = !options.rateLimiter;
  const redirectUrl = cleanText(options.redirectUrl || runtime.location?.href?.split("#")[0], 1000);
  const timeoutMs = Math.max(10, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const listeners = new Set();
  const stateListeners = new Set();
  let client = options.client || null;
  let clientPromise = null;
  let providerSubscription = null;
  let destroyed = false;
  let authState = Object.freeze({ status: AUTH_STATES.initializing, user: null, error: "", updatedAt: Date.now() });

  function publishState(status, details = {}) {
    authState = Object.freeze({
      status,
      user: details.user ? sanitizeUser(details.user) : (status === AUTH_STATES.unauthenticated ? null : authState.user),
      error: details.error ? providerMessage(details.error, "Authentication failed") : "",
      updatedAt: Date.now()
    });
    [...stateListeners].forEach((listener) => { try { listener(authState); } catch {} });
    return authState;
  }

  function notify(type, session) {
    const event = Object.freeze({ type: cleanText(type, 80) || "UNKNOWN", session: sanitizeSession(session) });
    if (event.type === "SIGNED_OUT") publishState(AUTH_STATES.unauthenticated);
    else if (event.type === "PASSWORD_RECOVERY" && session?.user) publishState(AUTH_STATES.recovering, { user: session.user });
    else if (event.type === "TOKEN_REFRESHED" || event.type === "SIGNED_IN") publishState(AUTH_STATES.authenticated, { user: session?.user });
    [...listeners].forEach((listener) => {
      try { listener(event); } catch {}
    });
  }

  function consumeAttempt(scope, identity, policy) {
    const key = `${scope}:${cleanText(identity, 240).toLowerCase() || "anonymous"}`;
    const attempt = attemptLimiter.consume(key, policy);
    return Object.freeze({ key, ...attempt });
  }

  function attachProviderSubscription() {
    if (providerSubscription || !client?.auth?.onAuthStateChange) return;
    const response = client.auth.onAuthStateChange((type, session) => notify(type, session));
    providerSubscription = response?.data?.subscription || response?.subscription || null;
  }

  async function createClient() {
    if (client) return client;
    if (typeof options.clientFactory === "function") return options.clientFactory();
    if (!runtime.supabase?.createClient || !options.supabaseUrl || !options.supabaseAnonKey) {
      throw new Error("Le service d'authentification n'est pas disponible.");
    }
    return runtime.supabase.createClient(options.supabaseUrl, options.supabaseAnonKey);
  }

  async function initialize() {
    if (destroyed) return unavailable("Le service d'authentification a été arrêté.");
    const firstInitialization = !clientPromise;
    if (firstInitialization) publishState(AUTH_STATES.initializing);
    if (!clientPromise) {
      clientPromise = withTimeout(createClient(), timeoutMs)
        .then((nextClient) => {
          if (!nextClient?.auth) throw new Error("Le service d'authentification est incomplet.");
          client = nextClient;
          attachProviderSubscription();
          return client;
        })
        .catch((error) => {
          clientPromise = null;
          throw error;
        });
    }
    try {
      await clientPromise;
      if (firstInitialization && authState.status === AUTH_STATES.initializing) publishState(AUTH_STATES.unauthenticated);
      return completed("Service d'authentification prêt.", { available: true });
    } catch (error) {
      publishState(AUTH_STATES.error, { error });
      return unavailable(providerMessage(error, "Le service d'authentification n'est pas disponible."));
    }
  }

  async function operation(handler, fallbackMessage) {
    const ready = await initialize();
    if (!ready.ok) return ready;
    try {
      const response = await withTimeout(handler(client), timeoutMs);
      if (response?.error) return failed(providerMessage(response.error, fallbackMessage));
      return completed("Action terminée.", response?.data ?? null);
    } catch (error) {
      return failed(providerMessage(error, fallbackMessage));
    }
  }

  async function getSession() {
    const response = await operation((activeClient) => activeClient.auth.getSession(), "Impossible de vérifier la session.");
    if (!response.ok) return response;
    if (response.data?.session?.user && client?.auth?.getUser) {
      publishState(AUTH_STATES.refreshing, { user: response.data.session.user });
      const verified = await operation((activeClient) => activeClient.auth.getUser(), "La session a expiré.");
      if (!verified.ok || !verified.data?.user) {
        try { await client.auth.signOut({ scope: "local" }); } catch {}
        publishState(AUTH_STATES.unauthenticated);
        return failed("La session a expiré. Reconnectez-vous.");
      }
      publishState(AUTH_STATES.authenticated, { user: verified.data.user });
    } else if (response.data?.session?.user) publishState(AUTH_STATES.authenticated, { user: response.data.session.user });
    else publishState(AUTH_STATES.unauthenticated);
    return completed(
      response.data?.session ? "Session active." : "Aucune session active.",
      { session: sanitizeSession(response.data?.session) }
    );
  }

  async function getClient() {
    const ready = await initialize();
    return ready.ok ? client : null;
  }

  async function setSession(session) {
    const ready = await initialize();
    if (!ready.ok) return ready;
    const accessToken = cleanText(session?.access_token || session?.accessToken, 4096);
    const refreshToken = cleanText(session?.refresh_token || session?.refreshToken, 4096) || "";
    if (!accessToken) return failed("Token de session manquant.");
    const response = await withTimeout(
      client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
      timeoutMs
    );
    if (response?.error) return failed(providerMessage(response.error, "Impossible d'activer la session."));
    const user = sanitizeUser(response?.data?.user || response?.data?.session?.user);
    if (user) publishState(AUTH_STATES.authenticated, { user });
    return completed("Session activée.", { session: sanitizeSession(response?.data?.session) });
  }

  async function resolveEmail(identifier) {
    const normalized = cleanText(identifier, 320).toLowerCase();
    if (normalized.includes("@")) return normalized;
    if (!normalized) return "";
    return `${normalized}${USERNAME_SUFFIX}`;
  }

  async function signIn(credentials = {}) {
    const identifier = cleanText(credentials.identifier, 320);
    const password = String(credentials.password ?? "");
    if (!identifier || !password) return failed("Renseignez votre identifiant et votre mot de passe.");
    const attempt = consumeAttempt("sign-in", identifier, ATTEMPT_POLICIES.signIn);
    if (!attempt.allowed) return rateLimited();
    try {
      storage?.setItem?.("ethone_remember_auth", credentials.remember ? "1" : "0");
    } catch {}
    publishState(AUTH_STATES.signingIn);
    const email = await resolveEmail(identifier);
    const response = await operation(
      (activeClient) => activeClient.auth.signInWithPassword({ email, password }),
      "Connexion impossible. Vérifiez vos identifiants."
    );
    if (!response.ok) {
      const generic = "Connexion impossible. Vérifiez vos identifiants.";
      publishState(AUTH_STATES.error, { error: new Error(generic) });
      return failed(generic);
    }
    attemptLimiter.reset(attempt.key);
    publishState(AUTH_STATES.authenticated, { user: response.data?.user || response.data?.session?.user });
    return completed("Connexion réussie.", {
      user: sanitizeUser(response.data?.user || response.data?.session?.user),
      session: sanitizeSession(response.data?.session)
    });
  }

  async function signUp(account = {}) {
    const username = cleanText(account.username, 80);
    const password = String(account.password ?? "");
    const suppliedEmail = cleanText(account.email, 320).toLowerCase();
    if (username.length < 2 || username.length > 64) return failed("Le nom doit contenir entre 2 et 64 caractères.");
    if (!validEmail(suppliedEmail)) return failed("Saisissez une adresse e-mail valide.");
    const passwordCheck = validateNewPassword(password);
    if (!passwordCheck.valid) return failed(passwordCheck.message);
    const email = suppliedEmail;
    const attempt = consumeAttempt("sign-up", email, ATTEMPT_POLICIES.signUp);
    if (!attempt.allowed) return rateLimited();
    publishState(AUTH_STATES.signingIn);
    const response = await operation(
      (activeClient) => activeClient.auth.signUp({ email, password, options: { data: { username } } }),
      "Impossible de créer le compte."
    );
    if (!response.ok) {
      const generic = "Création du compte impossible. Vérifiez vos informations ou réessayez plus tard.";
      publishState(AUTH_STATES.error, { error: new Error(generic) });
      return failed(generic);
    }
    attemptLimiter.reset(attempt.key);
    publishState(response.data?.session?.user ? AUTH_STATES.authenticated : AUTH_STATES.unauthenticated, { user: response.data?.user });
    return completed("Compte créé. Votre environnement est prêt.", {
      user: sanitizeUser(response.data?.user),
      session: sanitizeSession(response.data?.session)
    });
  }

  async function resetPassword(emailInput) {
    const email = cleanText(emailInput, 320).toLowerCase();
    if (!validEmail(email)) return failed("Saisissez une adresse e-mail valide.");
    const attempt = consumeAttempt("password-reset", email, ATTEMPT_POLICIES.resetPassword);
    if (!attempt.allowed) return rateLimited();
    const response = await operation(
      (activeClient) => activeClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }),
      "Impossible d'envoyer le lien de réinitialisation."
    );
    if (!response.ok) return failed("Impossible d'envoyer le lien pour le moment. Réessayez plus tard.");
    attemptLimiter.reset(attempt.key);
    return completed("Si ce compte existe, un lien de réinitialisation vient d'être envoyé.");
  }

  async function updatePassword(passwordInput) {
    const passwordCheck = validateNewPassword(passwordInput);
    if (!passwordCheck.valid) return failed(passwordCheck.message);
    const attempt = consumeAttempt("password-update", authState.user?.id || "session", ATTEMPT_POLICIES.updatePassword);
    if (!attempt.allowed) return rateLimited();
    const response = await operation(
      (activeClient) => activeClient.auth.updateUser({ password: String(passwordInput) }),
      "Impossible de mettre à jour le mot de passe."
    );
    if (!response.ok) return failed("Impossible de mettre à jour le mot de passe. Demandez un nouveau lien.");
    attemptLimiter.reset(attempt.key);
    publishState(AUTH_STATES.authenticated, { user: response.data?.user || authState.user });
    return completed("Mot de passe mis à jour.", { user: sanitizeUser(response.data?.user || authState.user) });
  }

  async function signInWithOAuth(providerInput) {
    const provider = cleanText(providerInput, 30).toLowerCase();
    const scopes = OAUTH_PROVIDERS[provider];
    if (!scopes) return unavailable("Ce fournisseur de connexion n'est pas disponible.");
    const attempt = consumeAttempt("oauth", provider, ATTEMPT_POLICIES.oauth);
    if (!attempt.allowed) return rateLimited();
    publishState(AUTH_STATES.signingIn);
    const response = await operation(
      (activeClient) => activeClient.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl, scopes } }),
      `Connexion ${provider} impossible.`
    );
    if (!response.ok) {
      const generic = `Connexion ${provider} temporairement indisponible.`;
      publishState(AUTH_STATES.error, { error: new Error(generic) });
      return failed(generic);
    }
    attemptLimiter.reset(attempt.key);
    return completed(`Ouverture de ${provider}.`, { provider });
  }

  async function signOut() {
    publishState(AUTH_STATES.signingOut);
    try { client?.removeAllChannels?.(); } catch {}
    try {
      const { data: { session } } = await client?.auth?.getSession?.() ?? { data: {} };
      if (session?.access_token) {
        await fetch(`${WORKER_API_BASE_URL}/api/signout`, {
          method: "POST",
          headers: { authorization: `Bearer ${session.access_token}` }
        });
      }
    } catch {}
    const response = await operation((activeClient) => activeClient.auth.signOut(), "Déconnexion impossible.");
    publishState(response.ok ? AUTH_STATES.unauthenticated : AUTH_STATES.error, response.ok ? {} : { error: new Error(response.message) });
    return response.ok ? completed("Déconnexion terminée.") : response;
  }

  function subscribe(listener) {
    if (typeof listener !== "function" || destroyed) return () => false;
    listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return false;
      active = false;
      return listeners.delete(listener);
    };
  }

  function subscribeState(listener) {
    if (typeof listener !== "function" || destroyed) return () => false;
    stateListeners.add(listener);
    try { listener(authState); } catch {}
    return () => stateListeners.delete(listener);
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    listeners.clear();
    stateListeners.clear();
    try { providerSubscription?.unsubscribe?.(); } catch {}
    providerSubscription = null;
    if (ownsRateLimiter) attemptLimiter.destroy();
    clientPromise = null;
    client = null;
    return true;
  }

  return Object.freeze({
    initialize,
    getClient,
    setSession,
    getSession,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signInWithOAuth,
    signOut,
    subscribe,
    subscribeState,
    status: () => authState,
    destroy
  });
}
