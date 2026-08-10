"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/hooks/useI18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const i18n = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">{i18n("globalErrorTitle")}</h2>
          <p className="mb-6 text-sm text-[var(--muted)]">
            {i18n("unexpectedError")}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("globalErrorRetry")}
          </button>
        </div>
      </body>
    </html>
  );
}
