type ClassValue = string | number | boolean | undefined | null | Record<string, unknown> | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap((input) => {
      if (typeof input === "string" || typeof input === "number") return String(input);
      if (typeof input === "object" && input !== null && !Array.isArray(input)) {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Formate un message d'erreur API de manière lisible pour les notifications (toasts).
 * Gère les chaînes brutes, les objets Error, et les erreurs de validation Zod (tableaux de { path, message }).
 */
export function formatApiError(err: unknown, fallback: string = "Une erreur est survenue"): string {
  if (!err) return fallback;

  let raw = "";
  if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === "string") {
    raw = err;
  } else if (typeof err === "object") {
    if ("error" in (err as any)) {
      const inner = (err as any).error;
      return formatApiError(inner, fallback);
    }
    if ("message" in (err as any) && typeof (err as any).message === "string") {
      raw = (err as any).message;
    } else {
      try {
        raw = JSON.stringify(err);
      } catch {
        return fallback;
      }
    }
  }

  // Tenter de parser si c'est du JSON (ex: tableau d'erreurs Zod sérialisé)
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((issue: any) => {
          const path = Array.isArray(issue.path) && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
          return `${path}${issue.message || JSON.stringify(issue)}`;
        })
        .join(", ");
    }
    if (parsed && typeof parsed === "object") {
      if (parsed.error) return formatApiError(parsed.error, fallback);
      if (parsed.message) return String(parsed.message);
    }
  } catch {
    // raw n'est pas du JSON, on le garde tel quel
  }

  return raw.trim() || fallback;
}
