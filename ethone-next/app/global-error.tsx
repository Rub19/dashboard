"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ErrorState";
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
        <ErrorState
          title={i18n("globalErrorTitle")}
          reason={i18n("unexpectedError")}
          actionText={i18n("globalErrorRetry")}
          onAction={reset}
          className="max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-8 backdrop-blur-[var(--panel-blur)]"
        />
      </body>
    </html>
  );
}
