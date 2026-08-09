const PUBLIC_MESSAGES = Object.freeze({
  AUTH_REQUIRED: "Authentification requise.",
  AUTH_INVALID: "La session est invalide.",
  AUTH_EXPIRED: "La session a expire.",
  AUTH_CONFIGURATION_ERROR: "Le service d'authentification est indisponible.",
  CORS_ORIGIN_DENIED: "Cette origine n'est pas autorisee.",
  METHOD_NOT_ALLOWED: "Methode non autorisee.",
  ROUTE_NOT_FOUND: "Route introuvable.",
  INVALID_PARAMETER: "Un parametre est invalide.",
  INVALID_REQUEST: "La requete est invalide.",
  RATE_LIMITED: "Trop de requetes. Reessayez plus tard.",
  RATE_LIMIT_UNAVAILABLE: "La protection de debit est indisponible.",
  SERVICE_NOT_CONFIGURED: "Cette integration n'est pas configuree.",
  PROVIDER_NOT_FOUND: "La ressource demandee n'existe pas.",
  PROVIDER_REQUEST_REJECTED: "Le fournisseur a refuse la requete.",
  UPSTREAM_TIMEOUT: "Le service externe a depasse le temps d'attente.",
  UPSTREAM_INVALID_RESPONSE: "Le service externe a renvoye une reponse invalide.",
  UPSTREAM_UNAVAILABLE: "Le service externe est temporairement indisponible.",
  INTERNAL_ERROR: "Une erreur interne est survenue.",
  DB_SCHEMA_ERROR: "Le schema de la base de donnees est incomplet."
});

export class HttpError extends Error {
  constructor(code, options = {}) {
    super(PUBLIC_MESSAGES[code] || PUBLIC_MESSAGES.INTERNAL_ERROR);
    this.name = "HttpError";
    this.code = PUBLIC_MESSAGES[code] ? code : "INTERNAL_ERROR";
    this.status = Math.max(400, Math.min(599, Number(options.status) || 500));
    this.retryable = options.retryable === true;
    this.detail = options.detail ?? null;
    this.headers = Object.freeze({ ...(options.headers || {}) });
  }
}

export function httpError(code, status, options = {}) {
  return new HttpError(code, { ...options, status });
}

export function normalizeError(error) {
  if (error instanceof HttpError) return error;
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return new HttpError("UPSTREAM_TIMEOUT", { status: 504, retryable: true });
  }
  const normalized = new HttpError("INTERNAL_ERROR", { status: 500, retryable: false });
  if (error?.message && !normalized.detail) normalized.detail = String(error.message);
  return normalized;
}
