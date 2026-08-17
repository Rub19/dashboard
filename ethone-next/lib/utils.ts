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
