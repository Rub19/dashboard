"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  onResend?: () => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  resendDelay?: number;
  autoFocus?: boolean;
  className?: string;
  resendLabel?: string;
  countdownLabel?: string;
  ariaLabel?: string;
};

const LENGTH = 6;
const DIGIT_RE = /^[0-9]$/;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OtpInput({
  value,
  onChange,
  onComplete,
  onResend,
  error = false,
  success = false,
  disabled = false,
  resendDelay = 45,
  autoFocus = true,
  className = "",
  resendLabel = "Renvoyer le code",
  countdownLabel = "Renvoyer le code dans",
  ariaLabel = "Code de vérification à 6 chiffres",
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>(Array(LENGTH).fill(null));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [shakeKey, setShakeKey] = useState(0);
  const [resendTimer, setResendTimer] = useState(resendDelay);
  const [canResend, setCanResend] = useState(false);

  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  useEffect(() => {
    setResendTimer(resendDelay);
    setCanResend(false);
  }, [resendDelay]);

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const id = window.setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendTimer]);

  useEffect(() => {
    if (error) {
      setShakeKey((k) => k + 1);
    }
  }, [error]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmpty = value.length;
      const index = Math.min(firstEmpty, LENGTH - 1);
      inputsRef.current[index]?.focus();
    }
  }, [autoFocus, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusInput = useCallback((index: number) => {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const updateValue = useCallback((next: string, sourceIndex: number) => {
    const cleaned = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(cleaned);

    if (cleaned.length === LENGTH) {
      onComplete?.(cleaned);
    }

    const nextFocus = Math.min(sourceIndex + (cleaned.length > value.length ? 1 : 0), LENGTH - 1);
    if (cleaned.length < LENGTH) {
      window.requestAnimationFrame(() => focusInput(nextFocus));
    } else {
      window.requestAnimationFrame(() => inputsRef.current[LENGTH - 1]?.blur());
    }
  }, [onChange, onComplete, value.length, focusInput]);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const current = digits[index].trim();

      if (current) {
        const next = `${value.slice(0, index)}${value.slice(index + 1)}`;
        updateValue(next, index - 1);
        if (index > 0) {
          focusInput(index - 1);
        }
      } else if (index > 0) {
        const next = `${value.slice(0, index - 1)}${value.slice(index)}`;
        updateValue(next, index - 2);
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      focusInput(index + 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusInput(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusInput(LENGTH - 1);
      return;
    }

    if (event.key === "Delete" && index < LENGTH - 1) {
      event.preventDefault();
      const next = `${value.slice(0, index)}${value.slice(index + 1)}`;
      updateValue(next, index);
      return;
    }

    if (DIGIT_RE.test(event.key)) {
      event.preventDefault();
      if (disabled) return;
      const next = `${value.slice(0, index)}${event.key}${value.slice(index + 1)}`;
      updateValue(next, index);
    }
  }, [digits, value, disabled, updateValue, focusInput]);

  const handleChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const char = event.target.value.slice(-1);
    if (!DIGIT_RE.test(char)) return;

    const next = `${value.slice(0, index)}${char}${value.slice(index + 1)}`;
    updateValue(next, index);
  }, [value, updateValue]);

  const handlePaste = useCallback((
    event: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    event.preventDefault();
    if (disabled) return;

    const raw = event.clipboardData.getData("text");
    const cleaned = raw.replace(/\D/g, "").slice(0, LENGTH);
    if (!cleaned) return;

    const next = value.slice(0, index) + cleaned + value.slice(index + cleaned.length);
    updateValue(next.slice(0, LENGTH), index + cleaned.length - 1);
  }, [disabled, value, updateValue]);

  const handleResend = useCallback(() => {
    if (!canResend || disabled) return;
    onResend?.();
    setResendTimer(resendDelay);
    setCanResend(false);
  }, [canResend, disabled, onResend, resendDelay]);

  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
      <div
        className="flex gap-2"
        role="group"
        aria-label={ariaLabel}
      >
        {digits.map((digit, index) => {
          const isActive = focusedIndex === index;
          const isFilled = digit.trim().length > 0;

          return (
            <motion.div
              key={index}
              animate={
                error && shakeKey > 0
                  ? {
                      x: [0, -6, 6, -6, 6, 0],
                      transition: { duration: 0.35, ease: "easeInOut" },
                    }
                  : success && isFilled
                    ? {
                        scale: [1, 1.08, 1],
                        backgroundColor: ["rgba(52, 211, 153, 0.05)", "rgba(52, 211, 153, 0.2)", "rgba(52, 211, 153, 0.05)"],
                        borderColor: ["rgba(52, 211, 153, 0.6)", "rgba(52, 211, 153, 1)", "rgba(52, 211, 153, 0.6)"],
                        transition: { duration: 0.45, ease: "easeOut" },
                      }
                    : {}
              }
              className={[
                "flex h-14 w-12 items-center justify-center rounded-xl border text-xl font-mono font-bold transition-colors duration-150 md:h-16 md:w-14",
                "bg-white/[0.04] text-white",
                error
                  ? "border-red-500/50 bg-red-500/[0.05]"
                  : isActive
                    ? "border-emerald-400/60 bg-emerald-500/[0.05] ring-2 ring-emerald-500/20"
                    : isFilled
                      ? "border-white/20 bg-white/[0.06]"
                      : "border-white/10",
              ].join(" ")}
            >
              <input
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                disabled={disabled}
                value={digit.trim() === "" ? "" : digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={(e) => handlePaste(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex((i) => (i === index ? -1 : i))}
                aria-label={`Chiffre ${index + 1} sur ${LENGTH}`}
                aria-invalid={error}
                aria-disabled={disabled}
                className="h-full w-full appearance-none bg-transparent text-center outline-none"
              />
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
        <AnimatePresence mode="wait" initial={false}>
          {canResend ? (
            <motion.button
              key="resend"
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              disabled={disabled}
              onClick={handleResend}
              className="rounded-lg px-2 py-1 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resendLabel}
            </motion.button>
          ) : (
            <motion.span
              key="countdown"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {countdownLabel} {formatTime(resendTimer)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
