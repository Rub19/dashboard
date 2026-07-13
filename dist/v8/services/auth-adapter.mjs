const DEFAULT_TIMEOUT_MS = 12000;
const USERNAME_SUFFIX = "@dashboard.local";
const OAUTH_PROVIDERS = Object.freeze({
  google: "email profile",
  github: "read:user user:email"
});

export const AUTH_STATES = Object.freeze({
  initializing: "initializing",
  authenticated: "authenticated",
  unauthenticated: "unauthenticated",
  refreshing: "refreshing",
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

function cleanText(value, limit = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, limit);
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
  const fetcher = options.fetch || runtime.fetch?.bind(runtime);
  const network = options.network || null;
  const workerUrl = cleanText(options.workerUrl, 500).replace(/\/$/, "");
  const allowUsernameLookup = options.allowUsernameLookup === true;
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
    else if (event.type === "TOKEN_REFRESHED" || event.type === "SIGNED_IN") publishState(AUTH_STATES.authenticated, { user: session?.user });
    [...listeners].forEach((listener) => {
      try { listener(event); } catch {}
    });
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
      const response = network?.execute
        ? await network.execute(() => handler(client), { timeoutMs, retries: 0 })
        : await withTimeout(handler(client), timeoutMs);
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

  async function resolveEmail(identifier) {
    const normalized = cleanText(identifier, 320).toLowerCase();
    if (normalized.includes("@")) return normalized;
    if (!normalized) return "";
    if (allowUsernameLookup && fetcher && workerUrl) {
      try {
        const url = `${workerUrl}/supabase/username?username=${encodeURIComponent(normalized)}`;
        const response = network?.request
          ? await network.request(url, { timeoutMs: Math.min(timeoutMs, 5000), retries: 1, dedupeKey: `auth:username:${normalized}` })
          : await withTimeout(fetcher(url), Math.min(timeoutMs, 5000));
        if (response?.ok) {
          const payload = await response.json();
          const email = cleanText(payload?.email, 320).toLowerCase();
          if (email.includes("@")) return email;
        }
      } catch {}
    }
    return `${normalized}${USERNAME_SUFFIX}`;
  }

  async function signIn(credentials = {}) {
    const identifier = cleanText(credentials.identifier, 320);
    const password = String(credentials.password ?? "");
    if (!identifier || !password) return failed("Renseignez votre identifiant et votre mot de passe.");
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
      publishState(AUTH_STATES.error, { error: new Error(response.message) });
      return response;
    }
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
    if (!username || !password) return failed("Renseignez un nom et un mot de passe.");
    if (password.length < 6) return failed("Le mot de passe doit contenir au moins 6 caractères.");
    const email = suppliedEmail || `${username.toLowerCase()}${USERNAME_SUFFIX}`;
    publishState(AUTH_STATES.signingIn);
    const response = await operation(
      (activeClient) => activeClient.auth.signUp({ email, password, options: { data: { username } } }),
      "Impossible de créer le compte."
    );
    if (!response.ok) {
      publishState(AUTH_STATES.error, { error: new Error(response.message) });
      return response;
    }
    publishState(response.data?.session?.user ? AUTH_STATES.authenticated : AUTH_STATES.unauthenticated, { user: response.data?.user });
    return completed("Compte créé. Vérifiez votre messagerie si une confirmation est requise.", {
      user: sanitizeUser(response.data?.user),
      session: sanitizeSession(response.data?.session)
    });
  }

  async function resetPassword(emailInput) {
    const email = cleanText(emailInput, 320).toLowerCase();
    if (!email.includes("@")) return failed("Saisissez une adresse e-mail valide.");
    const response = await operation(
      (activeClient) => activeClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }),
      "Impossible d'envoyer le lien de réinitialisation."
    );
    return response.ok ? completed("Lien de réinitialisation envoyé.") : response;
  }

  async function signInWithOAuth(providerInput) {
    const provider = cleanText(providerInput, 30).toLowerCase();
    const scopes = OAUTH_PROVIDERS[provider];
    if (!scopes) return unavailable("Ce fournisseur de connexion n'est pas disponible.");
    publishState(AUTH_STATES.signingIn);
    const response = await operation(
      (activeClient) => activeClient.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl, scopes } }),
      `Connexion ${provider} impossible.`
    );
    if (!response.ok) publishState(AUTH_STATES.error, { error: new Error(response.message) });
    return response.ok ? completed(`Ouverture de ${provider}.`, { provider }) : response;
  }

  async function signOut() {
    publishState(AUTH_STATES.signingOut);
    try { client?.removeAllChannels?.(); } catch {}
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
    clientPromise = null;
    client = null;
    return true;
  }

  return Object.freeze({
    initialize,
    getSession,
    signIn,
    signUp,
    resetPassword,
    signInWithOAuth,
    signOut,
    subscribe,
    subscribeState,
    status: () => authState,
    destroy
  });
}
