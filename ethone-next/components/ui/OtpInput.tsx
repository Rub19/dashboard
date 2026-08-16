"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export type OtpInputProps = {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  resendDelay?: number;
  onResend?: () => void;
  className?: string;
};

const PLACEHOLDER = " ";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  success = false,
  disabled = false,
  resendDelay = 45,
  onResend,
  className = "",
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(() => {
    const raw = value ? String(value).replace(/[^0-9 ]/g, "").split("") : [];
    return Array.from({ length }, (_, i) => raw[i] || PLACEHOLDER);
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState(0);
  const [remaining, setRemaining] = useState(resendDelay);

  useEffect(() => {
    if (typeof value !== "string") return;
    const raw = value.replace(/[^0-9 ]/g, "").split("");
    const next = Array.from({ length }, (_, i) => raw[i] || PLACEHOLDER);
    setDigits(next);
  }, [value, length]);

  useEffect(() => {
    if (error) setShake((s) => s + 1);
  }, [error]);

  useEffect(() => {
    if (success) setFlash((f) => f + 1);
  }, [success]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  useEffect(() => {
    setRemaining(resendDelay);
  }, [resendDelay]);

  const updateValue = useCallback(
    (next: string[], triggerComplete = true) => {
      setDigits(next);
      const full = next.join("");
      onChange?.(full);
      if (triggerComplete) {
        const complete = next.every((d) => /\d/.test(d));
        if (complete) onComplete?.(next.map((d) => (/\d/.test(d) ? d : "")).join(""));
      }
    },
    [onChange, onComplete]
  );

  const focusIndex = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(length - 1, i));
    setFocusedIndex(clamped);
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  }, [length]);

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, length - index);
      if (!raw) return;

      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < raw.length; i++) {
          if (index + i < length) next[index + i] = raw[i];
        }
        const full = next.join("");
        onChange?.(full);
        const complete = next.every((d) => /\d/.test(d));
        if (complete) onComplete?.(next.map((d) => (/\d/.test(d) ? d : "")).join(""));
        return next;
      });

      const nextIndex = index + raw.length;
      if (nextIndex < length) {
        setTimeout(() => focusIndex(nextIndex), 0);
      }
    },
    [length, onChange, onComplete, focusIndex]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusIndex(index - 1);
        return;
      }

      if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        focusIndex(index + 1);
        return;
      }

      if (e.key === "Backspace") {
        if (!/\d/.test(digits[index]) && index > 0) {
          e.preventDefault();
          const next = [...digits];
          next[index - 1] = PLACEHOLDER;
          updateValue(next);
          focusIndex(index - 1);
        } else if (/\d/.test(digits[index])) {
          e.preventDefault();
          const next = [...digits];
          next[index] = PLACEHOLDER;
          updateValue(next, false);
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const next = [...digits];
        next[index] = e.key;
        updateValue(next);
        if (index < length - 1) {
          focusIndex(index + 1);
        }
      }
    },
    [digits, disabled, focusIndex, length, updateValue]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!raw) return;

      const next = Array.from({ length }, (_, i) => raw[i] || PLACEHOLDER);
      updateValue(next);

      const focusAfter = Math.min(raw.length, length - 1);
      setTimeout(() => focusIndex(focusAfter), 0);
    },
    [length, updateValue, focusIndex]
  );

  const handleResend = useCallback(() => {
    setRemaining(resendDelay);
    onResend?.();
  }, [resendDelay, onResend]);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    inputRefs.current[index]?.select();
  }, []);

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <motion.div
        key={shake}
        animate={{
          x: error ? [0, -8, 8, -8, 8, 0] : 0,
          scale: success ? [1, 1.02, 1] : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-center justify-center gap-2"
      >
        {Array.from({ length }).map((_, i) => {
          const filled = /\d/.test(digits[i]);
          const isActive = focusedIndex === i;

          let stateClasses =
            "bg-white/[0.04] border-white/10 text-white";
          if (error) {
            stateClasses =
              "border-red-500/50 bg-red-500/[0.05] text-red-100";
          } else if (success) {
            stateClasses =
              "border-emerald-400/80 bg-emerald-500/[0.08] text-emerald-100";
          } else if (isActive) {
            stateClasses =
              "border-emerald-400/60 ring-2 ring-emerald-500/20 bg-emerald-500/[0.05] text-white";
          }

          return (
            <motion.div
              key={`${i}-${flash}`}
              initial={false}
              animate={{
                scale: success && filled ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`h-14 w-12 md:h-16 md:w-14 ${stateClasses} rounded-xl border text-xl font-bold font-mono transition-all duration-150 ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={length - i}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                disabled={disabled}
                value={filled ? digits[i] : ""}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={() => handleFocus(i)}
                onBlur={() => setFocusedIndex(-1)}
                aria-label={`Chiffre ${i + 1}`}
                className="h-full w-full appearance-none bg-transparent text-center outline-none"
              />
            </motion.div>
          );
        })}
      </motion.div>

      {onResend && (
        <div className="text-xs text-zinc-500">
          {remaining > 0 ? (
            <span>Renvoyer le code dans {formatCountdown(remaining)}</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={disabled}
              className="text-zinc-300 underline-offset-2 transition-colors hover:text-white hover:underline disabled:opacity-40"
            >
              Renvoyer le code
            </button>
          )}
        </div>
      )}
    </div>
  );
}
