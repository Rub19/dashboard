export type PasswordStrength = {
  score: number; // 0-5
  label: "très faible" | "faible" | "moyen" | "bon" | "fort" | "très fort";
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
};

const MIN_LENGTH = 12;

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const lengthBonus = Math.min(password.length / MIN_LENGTH, 1.5);
  const score = Math.min(5, Math.floor(passed * lengthBonus));

  const labels: PasswordStrength["label"][] = ["très faible", "faible", "moyen", "bon", "fort", "très fort"];
  const colors = ["text-red-500", "text-orange-500", "text-amber-500", "text-yellow-500", "text-emerald-400", "text-green-500"];

  return {
    score,
    label: labels[score],
    color: colors[score],
    checks,
  };
}

/**
 * Vérifie si un mot de passe est présent dans les fuites via l'API Pwned Passwords (k-Anonymity).
 * Envoie uniquement les 5 premiers caractères du hash SHA-1, jamais le mot de passe en clair.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false;
    const text = await res.text();
    const breachedSuffixes = text.split("\r\n").map((line) => line.split(":")[0]);
    return breachedSuffixes.includes(suffix);
  } catch {
    // En cas d'indisponibilité de HIBP, on ne bloque pas l'inscription.
    return false;
  }
}
