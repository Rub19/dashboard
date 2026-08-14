"use client";

import { useMemo } from "react";
import { evaluatePasswordStrength } from "@/lib/password-strength";

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(strength.score / 5) * 100}%`,
            backgroundColor:
              strength.score <= 1 ? "#ef4444" :
              strength.score === 2 ? "#f97316" :
              strength.score === 3 ? "#eab308" :
              strength.score === 4 ? "#34d399" : "#22c55e",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={strength.color}>{strength.label}</span>
        <span className="text-[var(--muted)]">
          {Object.values(strength.checks).filter(Boolean).length}/5
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[var(--muted)]">
        <Check ok={strength.checks.minLength} label="12 caractères" />
        <Check ok={strength.checks.hasUppercase} label="Majuscule" />
        <Check ok={strength.checks.hasLowercase} label="Minuscule" />
        <Check ok={strength.checks.hasNumber} label="Chiffre" />
        <Check ok={strength.checks.hasSpecial} label="Symbole" />
      </ul>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? "text-emerald-400" : ""}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ok ? "#34d399" : "var(--muted)" }} />
      {label}
    </li>
  );
}
