"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Fingerprint } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { authenticateWithBiometric, checkBiometric } from "@/lib/apple";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type BiometricLockProps = {
  children: React.ReactNode;
  title?: string;
  className?: string;
};

export default function BiometricLock({ children, title, className = "" }: BiometricLockProps) {
  const i18n = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBiometric().then((res) => {
      setAvailable(res.available);
      if (!res.available) setUnlocked(true);
    });
  }, []);

  async function unlock() {
    const { ok, error: err } = await authenticateWithBiometric(title);
    if (ok) {
      setUnlocked(true);
      setError(null);
    } else {
      setError(err?.message || i18n("biometricFailed", "Échec de l'authentification biométrique."));
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div
      className={cn(
        "flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)]/60 p-6 text-center backdrop-blur-[var(--panel-blur)]",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
        {available ? <Fingerprint className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {title || i18n("secureArea", "Zone sécurisée")}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {available
            ? i18n("biometricPrompt", "Utilisez Face ID / Touch ID pour déverrouiller.")
            : i18n("biometricUnavailable", "Authentification biométrique indisponible.")}
        </p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {available && (
        <button
          type="button"
          onClick={unlock}
          className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] transition-transform hover:opacity-90 active:scale-95"
        >
          {i18n("unlockWithFaceID", "Déverrouiller avec Face ID / Touch ID")}
        </button>
      )}
    </div>
  );
}
