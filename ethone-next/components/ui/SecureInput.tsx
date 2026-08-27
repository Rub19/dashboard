"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import Input, { type InputSize } from "./Input";

export type SecureInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  allowCopy?: boolean;
  disabled?: boolean;
  inputSize?: InputSize;
  error?: boolean;
  className?: string;
  type?: "text" | "password";
};

export default function SecureInput({
  value,
  onChange,
  label = "Mot de passe",
  placeholder,
  allowCopy = true,
  disabled = false,
  inputSize = "default",
  error,
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

  const trailingActions = (
    <div className="flex items-center gap-1">
      {allowCopy && value && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleCopy}
          disabled={disabled}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
          aria-label={i18n("copy", "Copier")}
          title={i18n("copy", "Copier")}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] disabled:opacity-40"
        aria-label={visible ? i18n("hide", "Masquer") : i18n("show", "Afficher")}
        title={visible ? i18n("hide", "Masquer") : i18n("show", "Afficher")}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );

  return (
    <Input
      type={visible ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={label}
      placeholder={placeholder || label}
      inputSize={inputSize}
      error={error}
      right={trailingActions}
      className={className}
    />
  );
}
