"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

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

function clean(value: string): string {
  return value.replace(/\D/g, "").slice(0, LENGTH);
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
  const baseId = useId();
  const inputsRef = useRef<(HTMLInputElement | null)[]>(Array(LENGTH).fill(null));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [resendTimer, setResendTimer] = useState(resendDelay);
  const [canResend, setCanResend] = useState(false);
  const autoFocused = useRef(false);
  const shakeControls = useAnimation();

  const code = clean(value);
  const display = code.padEnd(LENGTH, " ").split("");

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
      shakeControls.start({
        x: [0, -6, 6, -6, 6, 0],
        transition: { duration: 0.35, ease: "easeInOut" },
      });
    } else {
      shakeControls.set({ x: 0 });
    }
  }, [error, shakeControls]);

  useEffect(() => {
    if (code.length === LENGTH) {
      onComplete?.(code);
    }
  }, [code, onComplete]);

  useEffect(() => {
    if (autoFocus && !disabled && !autoFocused.current) {
      autoFocused.current = true;
      const index = Math.min(code.length, LENGTH - 1);
      inputsRef.current[index]?.focus();
    }
  }, [autoFocus, disabled, code.length]);

  function focusInput(index: number) {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }

  function updateValue(next: string, focusIndex: number) {
    const cleaned = clean(next);
    onChange(cleaned);

    if (cleaned.length === LENGTH) {
      inputsRef.current[LENGTH - 1]?.blur();
    } else {
      const index = Math.min(Math.max(focusIndex, 0), LENGTH - 1);
      window.requestAnimationFrame(() => focusInput(index));
    }
  }

  function handleBackspace(index: number) {
    if (index < code.length) {
      const next = code.slice(0, index) + code.slice(index + 1);
      updateValue(next, index);
    } else if (index > 0) {
      const prev = index - 1;
      const next = code.slice(0, prev) + code.slice(prev + 1);
      updateValue(next, prev);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>, index: number) {
    const raw = event.target.value;

    if (!raw) {
      handleBackspace(index);
      return;
    }

    const digit = raw.slice(-1);
    if (!DIGIT_RE.test(digit)) return;

    const sourceIndex = Math.min(index, code.length);
    const next = code.slice(0, sourceIndex) + digit + code.slice(sourceIndex + 1);
    updateValue(next, sourceIndex + 1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace") {
      event.preventDefault();
      handleBackspace(index);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      if (index < code.length) {
        const next = code.slice(0, index) + code.slice(index + 1);
        updateValue(next, index);
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

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!DIGIT_RE.test(event.key)) {
        event.preventDefault();
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault();
    if (disabled) return;

    const raw = event.clipboardData.getData("text");
    const pasted = clean(raw);
    if (!pasted) return;

    const sourceIndex = Math.min(index, code.length);
    const next = (code.slice(0, sourceIndex) + pasted + code.slice(sourceIndex + pasted.length)).slice(0, LENGTH);
    const endIndex = Math.min(sourceIndex + pasted.length, LENGTH);
    updateValue(next, endIndex);
  }

  function handleResend() {
    if (!canResend || disabled) return;
    onResend?.();
    setResendTimer(resendDelay);
    setCanResend(false);
  }

  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
      <motion.div
        animate={shakeControls}
        className="flex gap-2"
        role="group"
        aria-label={ariaLabel}
      >
        {display.map((digit, index) => {
          const isActive = focusedIndex === index;
          const isFilled = digit.trim().length > 0;

          return (
            <motion.div
              key={`${baseId}-${index}`}
              animate={
                success && isFilled
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
                value={digit.trim()}
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
      </motion.div>

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
