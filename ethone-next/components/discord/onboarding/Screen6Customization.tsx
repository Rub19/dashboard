"use client";

import React, { useState } from "react";
import { Palette, Check } from "lucide-react";

export default function Screen6Customization() {
  const [accentColor, setAccentColor] = useState<string>("indigo");
  const [securityLevel, setSecurityLevel] = useState<"standard" | "strict" | "maximum">("strict");

  const colors = [
    { id: "indigo", name: "Indigo", bg: "bg-indigo-500", border: "border-indigo-500", text: "text-indigo-400" },
    { id: "teal", name: "Teal", bg: "bg-teal-500", border: "border-teal-500", text: "text-teal-400" },
    { id: "violet", name: "Violet", bg: "bg-violet-500", border: "border-violet-500", text: "text-violet-400" },
    { id: "emerald", name: "Emerald", bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400" },
    { id: "rose", name: "Rose", bg: "bg-rose-500", border: "border-rose-500", text: "text-rose-400" },
  ];

  const activeColor = colors.find((c) => c.id === accentColor) || colors[0];

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-2 sm:py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] text-xs font-medium mb-3">
          <Palette className="w-3 h-3" />
          <span>PERSONNALISATION TOTALE</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Votre serveur. Vos règles.
        </h3>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          Chaque aspect visuel et logique s'adapte à l'identité de votre communauté sans toucher à une seule ligne de code.
        </p>
      </div>

      {/* Interactive Playground Box */}
      <div className="v8-panel w-full p-5 mb-5 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          
          {/* Controls Column */}
          <div className="space-y-4">
            {/* Color Accent Picker */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
                Couleur d'accent des Embeds & Cartes
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAccentColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-opacity cursor-pointer ${
                      accentColor === c.id ? "ring-2 ring-[var(--text-primary)]" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {accentColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Security Level Selector */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
                Niveau de sévérité de la protection
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--panel-border)] text-xs">
                <button
                  onClick={() => setSecurityLevel("standard")}
                  className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    securityLevel === "standard" ? "bg-[var(--surface-2)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setSecurityLevel("strict")}
                  className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    securityLevel === "strict" ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Strict
                </button>
                <button
                  onClick={() => setSecurityLevel("maximum")}
                  className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    securityLevel === "maximum" ? "bg-[var(--danger)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Maximum
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Live Embed Preview */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--panel-border)] shadow-inner relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeColor.bg}`} />
            
            <div className="flex items-center gap-2 mb-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">ETHONE BOT — Annonce</span>
            </div>

            <div className="pl-2 space-y-1.5">
              <div className={`text-xs font-bold ${activeColor.text}`}>
                Bienvenue sur le serveur Discord !
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Règles de sécurité : <span className="font-semibold text-[var(--text-primary)]">{securityLevel.toUpperCase()}</span>.
                Merci de respecter la charte communautaire.
              </p>
              <div className="flex gap-1 pt-1">
                <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--panel-border)] text-[10px] text-[var(--text-muted)]">
                  {'{user}'} = @Alex
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--panel-border)] text-[10px] text-[var(--text-muted)]">
                  {'{memberCount}'} = 1,284
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="v8-inset text-xs text-[var(--text-muted)] text-center max-w-md p-2.5">
        🎨 Modifiez à tout moment les messages, formulaires de tickets et autorisations staff depuis l'interface.
      </div>
    </div>
  );
}
