"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
;
import { signInWithOtp, verifyEmailOtp } from "@/lib/auth";
import { useI18n } from "@/lib/hooks/useI18n";

export default function LoginPage() {
  const i18n = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithOtp(email);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { ok, error: err } = await verifyEmailOtp(email, code);
    setLoading(false);
    if (!ok || err) {
      setError(err?.message || i18n("invalidCode"));
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-sm"
      >
        <Card3D>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">ETHONE</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {i18n("loginDescription")}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSend} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="email">
                {i18n("email")}
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                  placeholder={i18n("emailPlaceholderLogin")}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {i18n("sendCode")} <Icon name="arrow-right" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="code">
                {i18n("codeReceived")}
              </label>
              <div className="relative">
                <Icon name="key-round" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
                  placeholder={i18n("codePlaceholder")}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                ) : (
                  i18n("verify")
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {i18n("modifyEmail")}
              </button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error}</p>
          )}
        </Card3D>
      </motion.div>
    </div>
  );
}
