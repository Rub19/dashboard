"use client";

import { useEffect, useRef, useState, useCallback, type ClipboardEvent, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  state?: "idle" | "loading" | "verifying" | "success" | "error";
}

export default function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  state = "idle",
}: OtpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const hasTriggeredCompleteRef = useRef(false);

  useEffect(() => {
    const next = value.replace(/\D/g, "").slice(0, 6).split("");
    while (next.length < 6) next.push("");
    setDigits(next);
  }, [value]);

  useEffect(() => {
    if (!disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [disabled]);

  const update = useCallback(
    (nextDigits: string[]) => {
      setDigits(nextDigits);
      const combined = nextDigits.join("");
      onChange(combined);

      if (combined.length === 6 && onComplete && !hasTriggeredCompleteRef.current) {
        hasTriggeredCompleteRef.current = true;
        triggerHaptic("medium");
        onComplete(combined);
      } else if (combined.length < 6) {
        hasTriggeredCompleteRef.current = false;
      }
    },
    [onChange, onComplete]
  );

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    update(next);
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      if (digits[index] === "" && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
      return;
    }
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "");
    update(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const isVerifying = state === "verifying" || state === "loading";
  const isSuccess = state === "success";

  return (
    <motion.div
      animate={error ? { x: [-3, 3, -2, 2, 0] } : {}}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between gap-2 sm:gap-3"
      aria-label="Code de vérification à 6 chiffres"
      role="group"
    >
      {digits.map((digit, i) => {
        const isFilled = digit !== "";
        return (
          <div key={i} className="relative flex-1">
            <input
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="next"
              maxLength={1}
              value={digit}
              disabled={disabled || isVerifying || isSuccess}
              aria-label={`Chiffre ${i + 1}`}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={cn(
                "h-14 sm:h-16 w-full rounded-2xl text-center text-xl sm:text-2xl font-bold font-mono outline-none transition-all duration-150 select-none",
                "border bg-white/[0.035] text-white",
                isFilled ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-white/10 hover:border-white/20",
                "focus:border-emerald-400 focus:bg-white/[0.07] focus:ring-4 focus:ring-emerald-500/20 focus:scale-[1.03]",
                error && "border-rose-500/80 text-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
                isSuccess && "border-emerald-400 bg-emerald-500/20 text-emerald-300",
                isVerifying && "opacity-80 animate-pulse",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            />
            {!isFilled && !disabled && (
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 h-1 w-2 rounded-full bg-white/20" />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
