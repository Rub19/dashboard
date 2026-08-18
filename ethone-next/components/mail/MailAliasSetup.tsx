"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Shuffle } from "lucide-react";
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

function sanitizeLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
}

export default function MailAliasSetup({ createAlias, onCreated }: MailAliasSetupProps) {
  const { success, error: toastError } = useToast();
  const [local, setLocal] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alias = useMemo(() => {
    const safe = sanitizeLocal(local);
    return safe ? `${safe}@ethone.dev` : "";
  }, [local]);

  async function handleCreate() {
    const safe = sanitizeLocal(local);
    if (!safe) {
      setError("Choisissez une adresse ou générez-en une aléatoire.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createAlias({ alias: `${safe}@ethone.dev`, display_name: displayName.trim() || undefined });
      if (created?.id) {
        success("Adresse créée");
        onCreated();
      } else {
        setError("Cette adresse n&apos;est pas disponible.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleRandom() {
    setLocal(randomLocal());
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-zinc-950/90 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-8 flex flex-col gap-5"
      >
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-purple-500">
          <Mail className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">Créez votre adresse ETHONE</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Choisissez votre identifiant unique pour envoyer et recevoir vos messages en @ethone.dev
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Nom affiché
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
              placeholder="Ex: Rub"
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-purple-500/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Adresse mail
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 focus-within:border-purple-500/50">
              <input
                type="text"
                value={local}
                onChange={(e) => setLocal(sanitizeLocal(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="votre-alias"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none disabled:opacity-50"
              />
              <span className="shrink-0 text-xs text-zinc-500">@ethone.dev</span>
            </div>
            {alias && <p className="mt-1 text-[10px] text-zinc-500">{alias}</p>}
          </div>

          <button
            type="button"
            onClick={handleRandom}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Générer un alias
          </button>

          <motion.button
            type="button"
            onClick={handleCreate}
            disabled={loading || !local.trim()}
            whileTap={{ scale: 0.98 }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:bg-purple-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l&apos;adresse
          </motion.button>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
