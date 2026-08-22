export type PasswordRule = {
  id: "minLength" | "hasUppercase" | "hasLowercase" | "hasNumber" | "hasSpecial";
  label: string;
  passed: boolean;
};

export type PasswordFieldResult = {
  score: number; // 0-4
  label: "Très faible" | "Faible" | "Moyen" | "Bon" | "Fort";
  color: string;
  tailwindColor: string;
  entropy: number;
  rules: PasswordRule[];
  allRulesPassed: boolean;
  coaching: string[];
};

const MIN_LENGTH = 8;
const STRONG_LENGTH = 16;
const VERY_STRONG_LENGTH = 20;

function computePoolSize(password: string): number {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  return pool || 1;
}

export function evaluatePasswordField(password: string): PasswordFieldResult {
  const rules: PasswordRule[] = [
    { id: "minLength", label: `${MIN_LENGTH} caractères`, passed: password.length >= MIN_LENGTH },
    { id: "hasUppercase", label: "1 majuscule", passed: /[A-Z]/.test(password) },
    { id: "hasLowercase", label: "1 minuscule", passed: /[a-z]/.test(password) },
    { id: "hasNumber", label: "1 chiffre", passed: /\d/.test(password) },
    { id: "hasSpecial", label: "1 symbole", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = rules.filter((r) => r.passed).length;
  const pool = computePoolSize(password);
  const entropy = password.length * Math.log2(pool);

  let score = 0;
  if (password.length === 0) {
    score = 0;
  } else if (password.length < MIN_LENGTH || passedCount <= 1) {
    score = 0;
  } else if (entropy < 45 || passedCount === 2) {
    score = 1;
  } else if (entropy < 70 || passedCount === 3) {
    score = 2;
  } else if (entropy < 100 || passedCount === 4) {
    score = 3;
  } else {
    score = 4;
  }

  const allRulesPassed = passedCount === rules.length;

  const labels: PasswordFieldResult["label"][] = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22d3ee", "#34d399"];
  const tailwindColors = ["text-red-400", "text-orange-400", "text-amber-400", "text-[--info]", "text-[--accent-primary]"];

  const coaching: string[] = [];
  if (password.length > 0) {
    if (!rules.find((r) => r.id === "minLength")?.passed) {
      coaching.push(`+ ${MIN_LENGTH - password.length} caractères`);
    } else if (password.length < STRONG_LENGTH) {
      coaching.push(`+ ${STRONG_LENGTH - password.length} caractères`);
    } else if (password.length < VERY_STRONG_LENGTH && allRulesPassed) {
      coaching.push(`+ ${VERY_STRONG_LENGTH - password.length} caractères`);
    }

    if (!rules.find((r) => r.id === "hasUppercase")?.passed) coaching.push("+ 1 majuscule");
    if (!rules.find((r) => r.id === "hasLowercase")?.passed) coaching.push("+ 1 minuscule");
    if (!rules.find((r) => r.id === "hasNumber")?.passed) coaching.push("+ 1 chiffre");
    if (!rules.find((r) => r.id === "hasSpecial")?.passed) coaching.push("+ 1 symbole");

    if (password.length >= MIN_LENGTH && !/[-_\s]/.test(password)) {
      coaching.push("+ 2 mots");
    }
  }

  return {
    score,
    label: labels[score],
    color: colors[score],
    tailwindColor: tailwindColors[score],
    entropy,
    rules,
    allRulesPassed,
    coaching,
  };
}

const WORDS = [
  "lune", "vent", "flux", "noir", "doux", "rare", "fort", "bleu", "rouge", "vert",
  "clair", "neige", "froid", "chaud", "marin", "terre", "pluie", "nuage", "orage", "etoile",
  "sable", "lion", "aigle", "loup", "nuit", "jour", "vague", "ondes", "cristal", "ferron",
  "arc", "flamme", "ombre", "lumiere", "orage", "pierre", "metal", "cri", "rythme", "hiver",
];

const SYMBOLS = "!@#$%&*?";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function suggestStrongPassword(): string {
  const w1 = pick(WORDS);
  const w2 = pick(WORDS);
  const w3 = pick(WORDS);
  const num = Math.floor(10 + Math.random() * 89); // 10-99
  const symbol = pick(SYMBOLS.split(""));
  const upper = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${capitalize(w1)}-${w2}${num}-${w3}${symbol}-${upper}`;
}

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
    return false;
  }
}
