"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Shuffle, Crown, ArrowRight, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import type { MailAlias } from "@/lib/hooks/useMail";

function sanitizeLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
}

function randomLocal() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "u-";
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

type MailOnboardingProps = {
  aliases: MailAlias[];
  createAlias: (input: { alias?: string; display_name?: string }) => Promise<MailAlias | null | undefined>;
  updateAlias: (id: string, patch: { display_name?: string; is_primary?: boolean }) => Promise<MailAlias | null | undefined>;
  onComplete: () => void;
};

export default function MailOnboarding({ aliases, createAlias, updateAlias, onComplete }: MailOnboardingProps) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const primary = aliases.find((a) => a.is_primary) || aliases[0];

  const initialView = aliases.length ? "confirm" : "create";
  const [view, setView] = useState<"confirm" | "create">(initialView);
  const [local, setLocal] = useState("");
  const [displayName, setDisplayName] = useState(primary?.display_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryLocal = primary?.alias ? primary.alias.split("@")[0] : "";

  const fullAlias = useMemo(() => {
    const safe = sanitizeLocal(local);
    return safe ? `${safe}@ethone.dev` : "";
  }, [local]);

  async function handleCreate() {
    const safe = sanitizeLocal(local);
    if (!safe) {
      setError(i18n("aliasRequired") || "Choisissez une adresse.");
      return;
    }
    if (safe === primaryLocal) {
      setError(i18n("aliasUnavailable") || "Cette adresse est déjà la vôtre.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createAlias({ alias: `${safe}@ethone.dev`, display_name: displayName.trim() || undefined });
      if (created?.id) {
        try {
          await updateAlias(created.id, { display_name: displayName.trim() || undefined, is_primary: true });
        } catch {
          // updateAlias n'est pas critique si createAlias a déjà persisté
        }
        success(i18n("saved") || "Enregistré");
        onComplete();
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

  async function handleConfirm() {
    if (primary && updateAlias) {
      const name = displayName.trim();
      if (name && name !== (primary.display_name || "")) {
        setLoading(true);
        try {
          await updateAlias(primary.id, { display_name: name });
          success(i18n("saved") || "Enregistré");
        } catch (err) {
          toastError(String(err));
        } finally {
          setLoading(false);
        }
      }
    }
    onComplete();
  }

  const createForm = (
    <div className="space-y-4">
      {aliases.length > 0 && primary?.alias && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-zinc-400">
          {i18n("currentAlias", "Adresse actuelle")}: <span className="font-medium text-zinc-200">{primary.alias}</span>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {i18n("displayName") || "Nom affiché"}
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder={i18n("displayName") || "Ex: Rub"}
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] disabled:opacity-50"
        />
        <p className="mt-1.5 text-[10px] text-zinc-500">
          {i18n("displayNameHint") || "Ce nom apparaîtra dans l'expéditeur de vos messages."}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {i18n("email") || "Adresse mail"}
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/15 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
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
        {fullAlias && <p className="mt-1 text-[10px] text-zinc-500">{fullAlias}</p>}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setLocal(randomLocal())}
        disabled={loading}
        leftIcon={<Shuffle className="h-3.5 w-3.5" />}
        className="w-full"
      >
        {i18n("random") || "Générer un alias"}
      </Button>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleCreate}
        disabled={loading || !local.trim()}
        isLoading={loading}
        className="h-11 w-full"
      >
        {i18n("createAlias") || "Créer l'adresse"}
      </Button>

      {aliases.length > 0 && (
        <button
          type="button"
          onClick={() => setView("confirm")}
          className="flex w-full items-center justify-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {i18n("back", "Retour")}
        </button>
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );

  const confirmForm = (
    <div className="space-y-4">
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-purple-300">
          <Crown className="h-3.5 w-3.5" />
          {i18n("primaryAlias") || "Adresse principale"}
        </div>
        <p className="mt-2 text-sm font-medium text-white break-all">{primary?.alias}</p>
        <p className="mt-1 text-[10px] text-zinc-400">
          {i18n("uniquePerUser") || "Cette adresse est unique et vous est réservée."}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {i18n("displayName") || "Nom affiché"}
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder={i18n("displayName") || "Ex: Rub"}
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] disabled:opacity-50"
        />
        <p className="mt-1.5 text-[10px] text-zinc-500">
          {i18n("displayNameHint") || "Ce nom apparaîtra dans l'expéditeur de vos messages."}
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleConfirm}
        disabled={loading}
        isLoading={loading}
        leftIcon={<ArrowRight className="h-4 w-4" />}
        className="h-11 w-full"
      >
        {i18n("continue") || "Continuer"}
      </Button>

      <button
        type="button"
        onClick={() => setView("create")}
        className="flex w-full items-center justify-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        {i18n("changeAlias", "Changer d'adresse")}
      </button>
    </div>
  );

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xl [scrollbar-width:thin] [&::-webkit-scrollbar]:hidden">
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
          <h2 className="text-lg font-semibold text-white">
            {i18n("mailOnboardingTitle") || "Configurez votre profil mail"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {i18n("mailOnboardingDescription") || "Votre adresse @ethone.dev est unique et servira d'expéditeur pour tous vos messages."}
          </p>
        </div>

        {view === "create" ? createForm : confirmForm}
      </motion.div>
    </div>
  );
}
