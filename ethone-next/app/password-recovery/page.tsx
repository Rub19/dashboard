"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/useI18n";
import { resetPassword } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import FlatCard from "@/components/FlatCard";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
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
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll">
        <div className="flex min-h-full w-full items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 lg:max-w-lg">
            <h1 className="text-2xl font-bold">{i18n("passwordRecoveryTitle")}</h1>
            <FlatCard>
              {sent ? (
                <p className="break-words text-sm text-[var(--accent-primary)]">{i18n("recoverySent")}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label={i18n("email")}>
                    <Input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={i18n("emailPlaceholder")}
                      required
                      inputSize="large"
                      className="w-full"
                    />
                  </FormField>
                  {TURNSTILE_SITE_KEY && (
                    <TurnstileWidget
                      ref={turnstileRef}
                      siteKey={TURNSTILE_SITE_KEY}
                      action="reset_password"
                      onToken={setTurnstileToken}
                      onExpire={() => setTurnstileToken("")}
                    />
                  )}
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="rounded-[var(--panel-radius)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? i18n("sending") : i18n("send")}
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
