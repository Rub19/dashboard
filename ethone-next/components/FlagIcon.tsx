"use client";

export const LANGUAGES = ["fr", "en", "es", "de"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  fr: "Fran\u00e7ais",
  en: "English",
  es: "Espa\u00f1ol",
  de: "Deutsch",
};

type FlagIconProps = {
  code: string | Language;
  className?: string;
};

export default function FlagIcon({ code, className = "h-4 w-6" }: FlagIconProps) {
  const base = `pointer-events-none rounded-[2px] ${className}`;
  switch (code) {
    case "fr":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect x="0" y="0" width="20" height="40" fill="#0055A4" />
          <rect x="20" y="0" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" y="0" width="20" height="40" fill="#EF4135" />
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="10" />
          <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="6" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="10" fill="#AA151B" />
          <rect y="10" width="60" height="20" fill="#F1BF00" />
          <rect y="30" width="60" height="10" fill="#AA151B" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="13.33" fill="#000000" />
          <rect y="13.33" width="60" height="13.33" fill="#DD0000" />
          <rect y="26.66" width="60" height="13.34" fill="#FFCE00" />
        </svg>
      );
    default:
      return null;
  }
}
