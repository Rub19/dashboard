"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";

export type CopyableFieldProps = {
  label: React.ReactNode;
  value: string;
  copyKey: string;
};

export default function CopyableField({ label, value, copyKey }: CopyableFieldProps) {
  const i18n = useI18n();
  const { success } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(copyKey);
      success(i18n("copied"));
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-zinc-300">{label}</span>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/90 px-3 py-2">
        <code className="min-w-0 truncate text-xs font-mono text-[--accent-primary]">{value}</code>
        <button
          type="button"
          onClick={copyToClipboard}
          className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--text-primary)]"
          aria-label={i18n("copy")}
        >
          {copied === copyKey ? (
            <Check className="h-3.5 w-3.5 text-[--accent-primary]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied === copyKey ? "Copié !" : i18n("copy")}</span>
        </button>
      </div>
    </div>
  );
}
