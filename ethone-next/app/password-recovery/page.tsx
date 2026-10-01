"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { resetPassword } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthScreen from "@/components/auth/AuthScreen";
import AuthInputField from "@/components/auth/AuthInputField";
import Button from "@/components/ui/Button";
import { Mail } from "@/components/icons/ph";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/auth/TurnstileWidget";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function PasswordRecoveryPage() {
  const i18n = useI18n();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  // Same guard as /login: a signed-in user landing here directly previously
  // saw this form rendered over the live app shell instead of being sent
  // back to it.
  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/");
    }
  }, [authLoading, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await resetPassword(email, turnstileToken);
    turnstileRef.current?.reset();
    setTurnstileToken("");
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      setSent(true);
      success(i18n("recoverySent"));
    }
  }

  return (
    <AuthScreen>
      <AuthCardShell
        success={sent}
        title={i18n("passwordRecoveryTitle")}
        subtitle={sent ? i18n("recoverySent") : undefined}
      >
        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInputField
              id="recovery-email"
              label={i18n("email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={i18n("emailPlaceholder")}
              required
              leftIcon={<Mail className="h-4 w-4" />}
            />
            {TURNSTILE_SITE_KEY && (
              <TurnstileWidget
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                action="reset_password"
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
              />
            )}
            <Button type="submit" variant="primary" isLoading={loading} disabled={!email} className="h-12 w-full rounded-2xl text-sm">
              {i18n("send")}
            </Button>
          </form>
        )}
      </AuthCardShell>
    </AuthScreen>
  );
}
