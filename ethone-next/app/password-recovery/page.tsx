"use client";

import { useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { resetPassword } from "@/lib/auth";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";

export default function PasswordRecoveryPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      setSent(true);
      success(i18n("recoverySent"));
    }
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
        <div className="flex min-h-full w-full items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 lg:max-w-lg">
            <h1 className="text-2xl font-bold">{i18n("passwordRecoveryTitle")}</h1>
            <Card3D>
              {sent ? (
                <p className="break-words text-sm text-emerald-400">{i18n("recoverySent")}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="recovery-email" className="text-sm font-medium">
                      {i18n("email")}
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={i18n("emailPlaceholder")}
                      required
                      className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? i18n("sending") : i18n("send")}
                  </button>
                </form>
              )}
            </Card3D>
          </div>
        </div>
      </div>
    </div>
  );
}
