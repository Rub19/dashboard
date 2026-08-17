"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Shuffle } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import type { MailAlias } from "@/lib/hooks/useMail";

type MailAliasSetupProps = {
  createAlias: (input: string | { alias?: string; display_name?: string; random?: boolean }) => Promise<MailAlias | null | undefined>;
  onCreated: () => void;
};

function randomLocal() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "u-";
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default function MailAliasSetup({ createAlias, onCreated }: MailAliasSetupProps) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const [local, setLocal] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRandom() {
    setLocal(randomLocal());
    setError(null);
  }

  async function handleCreate() {
    const raw = local.trim().toLowerCase();
    if (!raw) {
      setError(i18n("aliasRequired") || "Choisissez une adresse ou générez-en une aléatoire.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const alias = raw.includes("@") ? raw : `${raw}@ethone.dev`;
      const created = await createAlias({ alias, display_name: displayName.trim() || undefined });
      if (created?.id) {
        success(i18n("aliasCreated") || "Adresse créée");
        onCreated();
      } else {
        setError(i18n("aliasUnavailable") || "Cette adresse n'est pas disponible.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRandomCreate() {
    setLoading(true);
    setError(null);
    try {
      const created = await createAlias({ random: true, display_name: displayName.trim() || undefined });
      if (created?.id) {
        success(i18n("aliasCreated") || "Adresse créée");
        onCreated();
      } else {
        setError(i18n("aliasCreationFailed") || "Impossible de générer une adresse aléatoire.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[var(--accent-color,#a855f7)]">
          <Mail className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold text-white">{i18n("setupMailTitle") || "Créez votre adresse ETHONE"}</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {i18n("setupMailDescription") ||
            "Avant d'envoyer un message, créez une adresse mail ETHONE personnelle. Les réponses seront routées uniquement vers vous."}
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {i18n("displayName") || "Nom affiché"}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={i18n("displayNamePlaceholder") || "Votre nom"}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[var(--accent-color,#a855f7)]/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {i18n("mailAddress") || "Adresse mail"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 focus-within:border-[var(--accent-color,#a855f7)]/50">
              <input
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder={i18n("aliasPlaceholder") || "votre-nom"}
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none disabled:opacity-50"
              />
              <span className="shrink-0 text-[11px] text-zinc-500">@ethone.dev</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRandom}
              disabled={loading}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              <Shuffle className="h-3.5 w-3.5" />
              {i18n("random") || "Aléatoire"}
            </button>
            <button
              type="button"
              onClick={handleRandomCreate}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
              {i18n("createRandomAlias") || "Créer une adresse aléatoire"}
            </button>
          </div>

          <motion.button
            type="button"
            onClick={handleCreate}
            disabled={loading || !local.trim()}
            whileTap={{ scale: 0.98 }}
            style={{ background: "var(--accent-color, #a855f7)" }}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {i18n("createAlias") || "Créer l'adresse"}
          </motion.button>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
