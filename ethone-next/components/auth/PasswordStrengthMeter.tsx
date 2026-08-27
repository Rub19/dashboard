"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (score <= 1) return { text: "Faible", color: "text-rose-400", barColor: "bg-rose-500" };
    if (score === 2) return { text: "Moyen", color: "text-amber-400", barColor: "bg-amber-500" };
    if (score === 3) return { text: "Bon", color: "text-emerald-400", barColor: "bg-emerald-500" };
    return { text: "Excellent", color: "text-emerald-300", barColor: "bg-emerald-400" };
  };

  const strength = getStrengthLabel();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2 pt-1 text-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-1 max-w-[140px]">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                level <= score ? strength.barColor : "bg-white/10"
              )}
            />
          ))}
        </div>
        <span className={cn("font-medium text-[11px]", strength.color)}>
          {strength.text}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
        <span className={cn("flex items-center gap-1 transition-colors", hasMinLength ? "text-emerald-400" : "text-zinc-500")}>
          {hasMinLength ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />}
          8+ caractères
        </span>
        <span className={cn("flex items-center gap-1 transition-colors", hasUppercase ? "text-emerald-400" : "text-zinc-500")}>
          {hasUppercase ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />}
          1 majuscule
        </span>
        <span className={cn("flex items-center gap-1 transition-colors", hasNumber ? "text-emerald-400" : "text-zinc-500")}>
          {hasNumber ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />}
          1 chiffre
        </span>
      </div>
    </motion.div>
  );
}
