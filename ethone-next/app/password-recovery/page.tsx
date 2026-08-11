"use client";

import { useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { supabase } from "@/lib/supabase";
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/profile/` });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      setSent(true);
      success(i18n("recoverySent"));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("passwordRecoveryTitle")}</h1>
      <Card3D>
        {sent ? (
          <p className="text-sm text-emerald-400">{i18n("recoverySent")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{i18n("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={i18n("emailPlaceholder")}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? i18n("sending") : i18n("send")}
            </button>
          </form>
        )}
      </Card3D>
    </div>
  );
}
