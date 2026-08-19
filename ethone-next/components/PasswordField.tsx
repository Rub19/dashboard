"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { evaluatePasswordField, suggestStrongPassword, type PasswordFieldResult } from "@/lib/password-strength";

function StrengthMeter({ result, show }: { result: PasswordFieldResult; show: boolean }) {
  if (!show) return null;
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-cyan-400", "bg-emerald-400"];

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full gap-1 overflow-hidden rounded-xl">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.2 }}
            animate={{
              opacity: i < result.score ? 1 : 0.2,
              backgroundColor: i < result.score ? result.color : "#3f3f46",
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`h-full flex-1 rounded-xl ${i < result.score ? colors[result.score] : "bg-zinc-700"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <motion.span
          key={result.label}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-medium ${result.tailwindColor}`}
        >
          {result.label}
        </motion.span>
        <span className="text-[var(--muted)]">{Math.round(result.entropy)} bits</span>
      </div>
    </div>
  );
}

function RuleChecklist({ result, show }: { result: PasswordFieldResult; show: boolean }) {
  if (!show) return null;

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
      {result.rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 transition-colors ${rule.passed ? "text-emerald-400" : "text-[var(--muted)]"}`}
        >
          <motion.span
            initial={false}
            animate={{ scale: rule.passed ? 1.2 : 1, color: rule.passed ? "#34d399" : "#71717a" }}
            className="flex h-3.5 w-3.5 items-center justify-center"
          >
            {rule.passed ? (
              <Icon name="check" className="h-3.5 w-3.5" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
            )}
          </motion.span>
          <span className={rule.passed ? "text-emerald-400" : ""}>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

function CoachingBadges({ badges }: { badges: string[] }) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.slice(0, 4).map((badge, i) => (
        <motion.span
          key={`${badge}-${i}`}
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)] backdrop-blur-[var(--panel-blur)]"
        >
          {badge}
        </motion.span>
      ))}
    </div>
  );
}

export default function PasswordField({
  id,
  value,
  onChange,
  label,
  placeholder,
  autoComplete,
  showStrength = true,
  showGenerator = true,
  showRulesOnFocus = true,
  className = "",
  onPaste,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  showGenerator?: boolean;
  showRulesOnFocus?: boolean;
  className?: string;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  const i18n = useI18n();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [generated, setGenerated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => evaluatePasswordField(value), [value]);
  const hasContent = value.length > 0;
  const shouldShowRules = showStrength && (hasContent || focused || !showRulesOnFocus);

  useEffect(() => {
    if (!pasted) return;
    const t = window.setTimeout(() => setPasted(false), 2000);
    return () => window.clearTimeout(t);
  }, [pasted]);

  useEffect(() => {
    if (!generated) return;
    const t = window.setTimeout(() => setGenerated(false), 3000);
    return () => window.clearTimeout(t);
  }, [generated]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    setPasted(true);
    onPaste?.(e);
  };

  const handleGenerate = () => {
    const suggested = suggestStrongPassword();
    onChange(suggested);
    setGenerated(true);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--muted)]" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white/[0.06] text-[var(--accent)]">
          <Icon name="lock" className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handlePaste}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2.5 pl-12 pr-20 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/0 transition-colors duration-150 placeholder:text-[var(--muted)] focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
          aria-label={placeholder}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <AnimatePresence>
            {pasted && (
              <motion.span
                initial={{ opacity: 0, x: 8, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.8 }}
                className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400"
              >
                ✓ Collé
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="rounded p-1 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label={show ? i18n("hidePassword") : i18n("showPassword")}
            title={show ? i18n("hidePassword") : i18n("showPassword")}
          >
            <Icon name={show ? "eye-off" : "eye"} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showStrength && (
        <AnimatePresence>
          {shouldShowRules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              layout
              transition={{ duration: 0.15, ease: "easeOut" as const }}
              className="space-y-2 overflow-hidden pt-2"
            >
              <StrengthMeter result={result} show={hasContent} />
              <RuleChecklist result={result} show={shouldShowRules} />
              <CoachingBadges badges={result.coaching} />

              <AnimatePresence>
                {generated && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {["Généré", "Unique", "Sécurisé"].map((badge) => (
                      <span
                        key={badge}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                      >
                        {badge}
                      </span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {showGenerator && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
                >
                  <Icon name="sparkles" className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Utiliser un mot de passe fort suggéré
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
