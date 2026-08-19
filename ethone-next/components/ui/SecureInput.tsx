"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";

export type SecureInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  allowCopy?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "text" | "password";
};

export default function SecureInput({
  value,
  onChange,
  label,
  placeholder,
  allowCopy = true,
  disabled = false,
  className = "",
}: SecureInputProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { notify } = useToast();
  const i18n = useI18n();

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify.clipboard();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [value, notify]);

  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        placeholder={placeholder || label}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 pr-20 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {allowCopy && value && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-40"
            aria-label={i18n("copy")}
            title={i18n("copy")}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:opacity-40"
          aria-label={visible ? i18n("hide") : i18n("show")}
          title={visible ? i18n("hide") : i18n("show")}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
