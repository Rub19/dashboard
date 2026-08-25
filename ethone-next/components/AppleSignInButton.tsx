"use client";

import { useState } from "react";
import { Apple } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { signInWithApple } from "@/lib/apple";

export default function AppleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const i18n = useI18n();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const { ok, error } = await signInWithApple();
    setLoading(false);
    if (!ok && error) {
      showError(error.message || i18n("signInFailed"));
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--panel-radius)] bg-[#000] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
    >
      <Apple className="h-5 w-5" />
      {loading ? i18n("loading") : i18n("signInWithApple")}
    </button>
  );
}
