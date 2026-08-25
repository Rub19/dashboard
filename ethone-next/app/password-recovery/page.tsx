"use client";

import { useState } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { resetPassword } from "@/lib/auth";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";
import Input from "@/components/Input";
import FormField from "@/components/FormField";

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
