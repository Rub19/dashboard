"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Shuffle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
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
        setError("Cette adresse n'est pas disponible.");
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
        className="w-full max-w-md rounded-3xl border border-[var(--text-primary)]/[0.1] bg-zinc-950/90 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-8 flex flex-col gap-5"
      >
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-purple-500">
          <Mail className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Créez votre adresse ETHONE</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Choisissez votre identifiant unique pour envoyer et recevoir vos messages en @ethone.dev
          </p>
        </div>

        <div className="space-y-4">
          <FormField label="Nom affiché">
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
              placeholder="Ex: Rub"
              disabled={loading}
              className="w-full"
            />
          </FormField>

          <FormField label="Adresse mail" help={alias}>
            <Input
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
              className="w-full"
              right={<span className="shrink-0 text-xs text-[var(--text-muted)]">@ethone.dev</span>}
            />
          </FormField>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleRandom}
            disabled={loading}
            leftIcon={<Shuffle className="h-3.5 w-3.5" />}
            className="w-full"
          >
            Générer un alias
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
            { "Créer l'adresse" }
          </Button>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
