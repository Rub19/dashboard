"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";

function validatePassword(value: string) {
  return (
    value.length >= 12 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export default function ResetPasswordPage() {
  const i18n = useI18n();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") {
        setSession(Boolean(newSession));
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      showError(i18n("passwordMismatch"));
      return;
    }
    if (!validatePassword(password)) {
      showError(i18n("passwordRequirement"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      success(i18n("resetSuccess"));
      setTimeout(() => router.push("/login/"), 1500);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("resetPasswordTitle")}</h1>
      <Card3D>
        {!session ? (
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <Icon name="loader" className="h-5 w-5 animate-spin" />
            <p className="text-sm">{i18n("loading")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[var(--muted)]">{i18n("passwordRequirement")}</p>
            <div className="space-y-1">
              <label htmlFor="reset-password" className="text-sm font-medium">{i18n("newPassword")}</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="reset-confirm" className="text-sm font-medium">{i18n("confirmPassword")}</label>
              <input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={12}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? i18n("updating") : i18n("updatePassword")}
            </button>
          </form>
        )}
      </Card3D>
    </div>
  );
}
