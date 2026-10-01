"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { updatePassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthScreen from "@/components/auth/AuthScreen";
import AuthInputField from "@/components/auth/AuthInputField";
import Button from "@/components/ui/Button";
import { Lock, Loader2 } from "@/components/icons/ph";
import { required, passwordStrength, match, validate } from "@/lib/form-validation";

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
    const passwordError = validate(password, [
      required(i18n("fieldRequired")),
      passwordStrength(i18n("passwordRequirement")),
    ]);
    const confirmError = validate(confirm, [
      required(i18n("fieldRequired")),
      match(() => password, i18n("passwordMismatch")),
    ]);
    const firstError = passwordError || confirmError;
    if (firstError) {
      showError(firstError);
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      success(i18n("resetSuccess"));
      setTimeout(() => router.push("/login/"), 1500);
    }
  }

  return (
    <AuthScreen>
      <AuthCardShell title={i18n("resetPasswordTitle")}>
        {!session ? (
          <div className="flex items-center justify-center gap-3 text-[var(--text-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">{i18n("loading")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">{i18n("passwordRequirement")}</p>
            <AuthInputField
              id="reset-password"
              label={i18n("newPassword")}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <AuthInputField
              id="reset-confirm"
              label={i18n("confirmPassword")}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={12}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" variant="primary" isLoading={loading} disabled={!password || !confirm} className="h-12 w-full rounded-2xl text-sm">
              {i18n("updatePassword")}
            </Button>
          </form>
        )}
      </AuthCardShell>
    </AuthScreen>
  );
}
