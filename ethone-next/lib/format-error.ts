/**
 * Utilitaire de formatage des messages d'erreur d'API.
 * Gère les chaînes simples, les erreurs Zod sérialisées (`[{"code": ...}]`),
 * les objets d'erreur `{ error: ... }`, `{ message: ... }` ou `{ errors: [...] }`.
 */
export function formatApiError(err: unknown, fallback = "Une erreur est survenue"): string {
  if (!err) return fallback;

  if (typeof err === "string") {
    const trimmed = err.trim();
    // Détection de JSON stringifié (ex: Zod issue array)
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatApiError(parsed, fallback);
      } catch {
        // Pas du JSON valide, on renvoie la chaîne telle quelle
        return trimmed;
      }
    }
    return trimmed;
  }

  if (Array.isArray(err)) {
    return err
      .map((issue: any) => {
        if (typeof issue === "string") return issue;
        if (issue && typeof issue === "object") {
          const path = issue.path
            ? Array.isArray(issue.path)
              ? issue.path.join(".")
              : String(issue.path)
            : "";
          const msg = issue.message || issue.error || JSON.stringify(issue);
          return path ? `${path} : ${msg}` : msg;
        }
        return String(issue);
      })
      .filter(Boolean)
      .join(", ") || fallback;
  }

  if (typeof err === "object") {
    const obj = err as Record<string, any>;
    if (obj.error) return formatApiError(obj.error, fallback);
    if (obj.message) return formatApiError(obj.message, fallback);
    if (Array.isArray(obj.errors)) return formatApiError(obj.errors, fallback);
    if (Array.isArray(obj.details)) return formatApiError(obj.details, fallback);
  }

  if (err instanceof Error) {
    return formatApiError(err.message, fallback);
  }

  return fallback;
}
