"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { updatePassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ToastProvider";
import FlatCard from "@/components/FlatCard";
import { Icon } from "@/lib/icons";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
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
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
        <div className="flex min-h-full w-full items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 lg:max-w-lg">
            <h1 className="text-2xl font-bold">{i18n("resetPasswordTitle")}</h1>
            <FlatCard>
        {!session ? (
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <Icon name="loader" className="h-5 w-5 animate-spin" />
            <p className="text-sm">{i18n("loading")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="break-words text-xs text-[var(--muted)]">{i18n("passwordRequirement")}</p>
            <FormField label={i18n("newPassword")}>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                inputSize="large"
                className="w-full"
              />
            </FormField>
            <FormField label={i18n("confirmPassword")}>
              <Input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={12}
                inputSize="large"
                className="w-full"
              />
            </FormField>
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50"
            >
              {loading ? i18n("updating") : i18n("updatePassword")}
            </button>
          </form>
        )}
      </FlatCard>
          </div>
        </div>
      </div>
    </div>
  );
}
