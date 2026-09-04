"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Shuffle,
  Crown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Globe,
  Lock,
  Server,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
import { useToast } from "@/components/ToastProvider";
import type { MailAlias } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";

function sanitizeLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
}

function randomLocal() {
  const adjectives = ["swift", "nova", "prime", "cyber", "pixel", "hyper", "vector", "zenith"];
  const nouns = ["fox", "wolf", "hawk", "core", "node", "stream", "pilot", "spark"];
  const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${randAdj}-${randNoun}-${num}`;
}

type ProviderType = "ethone" | "gmail" | "outlook" | "imap";

type MailOnboardingProps = {
  aliases: MailAlias[];
  createAlias: (input: { alias?: string; display_name?: string }) => Promise<MailAlias | null | undefined>;
  updateAlias: (id: string, patch: { display_name?: string; is_primary?: boolean }) => Promise<MailAlias | null | undefined>;
  onComplete: () => void;
};

export default function MailOnboarding({
  aliases,
  createAlias,
  updateAlias,
  onComplete,
}: MailOnboardingProps) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const primary = aliases.find((a) => a.is_primary) || aliases[0];

  const initialView = aliases.length ? "confirm" : "select_provider";
  const [view, setView] = useState<"select_provider" | "create" | "confirm">(initialView);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("ethone");
  const [local, setLocal] = useState("");
  const [displayName, setDisplayName] = useState(primary?.display_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullAlias = useMemo(() => {
    const safe = sanitizeLocal(local);
    return safe ? `${safe}@ethone.dev` : "";
  }, [local]);

  async function handleCreate() {
    const safe = sanitizeLocal(local);
    if (!safe) {
      setError("Veuillez choisir un nom d'alias.");
      return;
    }
    const targetAlias = `${safe}@ethone.dev`;
    const existing = aliases.find((a) => a.alias?.toLowerCase() === targetAlias.toLowerCase());
    if (existing) {
      try {
        await updateAlias(existing.id, {
          display_name: displayName.trim() || undefined,
          is_primary: true,
        });
      } catch {}
      success("Votre adresse @ethone.dev est active !");
      onComplete();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await createAlias({
        alias: targetAlias,
        display_name: displayName.trim() || undefined,
      });
      if (created?.id) {
        try {
          await updateAlias(created.id, {
            display_name: displayName.trim() || undefined,
            is_primary: true,
          });
        } catch {}
        success("Votre adresse @ethone.dev a été créée avec succès !");
        onComplete();
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

  async function handleConfirm() {
    if (primary && updateAlias) {
      const name = displayName.trim();
      if (name && name !== (primary.display_name || "")) {
        setLoading(true);
        try {
          await updateAlias(primary.id, { display_name: name });
          success("Profil mis à jour");
        } catch (err) {
          toastError(String(err));
        } finally {
          setLoading(false);
        }
      }
    }
    onComplete();
  }

  // Step 1: Provider selection
  const selectProviderView = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* ETHONE Mail */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("ethone");
            setView("create");
          }}
          className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 p-4 text-left transition-all hover:scale-[1.02] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/15"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md shadow-[var(--accent-primary)]/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--text-primary)]">
              <span>ETHONE Mail</span>
              <span className="rounded-md bg-[var(--accent-primary)]/20 px-1.5 py-0.5 text-[9px] font-mono text-[var(--accent-primary)]">
                Recommandé
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
              Adresse privée @ethone.dev instantanée avec chiffrement et alias multiples.
            </p>
          </div>
        </button>

        {/* Gmail */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("gmail");
            setView("create");
          }}
          className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-4 text-left transition-all hover:scale-[1.02] hover:border-[var(--panel-border)]/[0.3] hover:bg-[var(--panel-bg)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-[var(--text-primary)]">Google Gmail</span>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
              Connectez votre compte Google existant via OAuth ou un alias de redirection.
            </p>
          </div>
        </button>

        {/* Outlook */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("outlook");
            setView("create");
          }}
          className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-4 text-left transition-all hover:scale-[1.02] hover:border-[var(--panel-border)]/[0.3] hover:bg-[var(--panel-bg)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-[var(--text-primary)]">Microsoft Outlook</span>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
              Synchronisez vos emails Office 365 / Outlook professionnels ou personnels.
            </p>
          </div>
        </button>

        {/* IMAP / Custom */}
        <button
          type="button"
          onClick={() => {
            setSelectedProvider("imap");
            setView("create");
          }}
          className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-[var(--panel-border)]/[0.12] bg-[var(--panel-bg)]/[0.4] p-4 text-left transition-all hover:scale-[1.02] hover:border-[var(--panel-border)]/[0.3] hover:bg-[var(--panel-bg)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-[var(--text-primary)]">Serveur IMAP / SMTP</span>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
              Configurez manuellement votre nom de domaine personnalisé ou votre serveur.
            </p>
          </div>
        </button>
      </div>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            setLocal(randomLocal());
            setView("create");
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors underline underline-offset-4"
        >
          Créer directement une adresse @ethone.dev aléatoire
        </button>
      </div>
    </div>
  );

  // Step 2: Create ETHONE Alias
  const createForm = (
    <div className="space-y-4">
      {aliases.length > 0 && primary?.alias && (
        <div className="rounded-2xl border border-[var(--panel-border)]/[0.1] bg-[var(--panel-bg)]/[0.4] p-3 text-xs text-[var(--text-muted)]">
          Adresse existante : <span className="font-semibold text-[var(--text-primary)]">{primary.alias}</span>
        </div>
      )}

      <FormField
        label="Nom d'expéditeur affiché"
        help="Ce nom apparaîtra comme signature et en-tête d'expéditeur de vos messages."
      >
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder="Ex : Rub, Alexandre..."
          disabled={loading}
          className="w-full"
        />
      </FormField>

      <FormField
        label="Adresse email @ethone.dev"
        help={fullAlias ? `Votre adresse sera : ${fullAlias}` : "Choisissez votre pseudonyme ou nom d'utilisateur."}
      >
        <div className="flex items-center gap-2">
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
            placeholder="votre-pseudo"
            disabled={loading}
            className="flex-1"
            right={<span className="text-xs font-semibold text-[var(--accent-primary)]">@ethone.dev</span>}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setLocal(randomLocal())}
            disabled={loading}
            leftIcon={<Shuffle className="h-4 w-4" />}
            title="Générer un alias unique"
          >
            Aléatoire
          </Button>
        </div>
      </FormField>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleCreate}
        disabled={loading || !local.trim()}
        isLoading={loading}
        leftIcon={<Sparkles className="h-4 w-4" />}
        className="h-11 w-full shadow-lg shadow-[var(--accent-primary)]/20"
      >
        Finaliser et accéder à ma boîte mail
      </Button>

      <button
        type="button"
        onClick={() => setView(aliases.length ? "confirm" : "select_provider")}
        className="flex w-full items-center justify-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors pt-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour
      </button>

      {error && <p className="text-center text-xs font-semibold text-rose-400">{error}</p>}
    </div>
  );

  // Step 3: Confirm Profile
  const confirmForm = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 p-5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
          <Crown className="h-4 w-4" />
          Votre adresse principale
        </div>
        <p className="mt-2 text-lg font-bold text-[var(--text-primary)] break-all font-mono">
          {primary?.alias}
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
          Cette adresse est connectée et prête à envoyer / recevoir des messages dans ETHONE.
        </p>
      </div>

      <FormField
        label="Nom d'expéditeur affiché"
        help="Modifiez le nom qui apparaît auprès de vos destinataires."
      >
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder="Ex : Rub"
          disabled={loading}
          className="w-full"
        />
      </FormField>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleConfirm}
        disabled={loading}
        isLoading={loading}
        leftIcon={<ArrowRight className="h-4 w-4" />}
        className="h-11 w-full shadow-lg shadow-[var(--accent-primary)]/20"
      >
        Continuer vers la boîte de réception
      </Button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={() => setView("create")}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Créer un autre alias
        </button>
        <button
          type="button"
          onClick={() => setView("select_provider")}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Changer de fournisseur
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[var(--bg-main)]/85 p-4 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-xl rounded-3xl border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)]/[0.9] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl flex flex-col gap-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-md">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {view === "select_provider"
                ? "Bienvenue sur ETHONE Mail"
                : view === "create"
                ? "Configuration de votre adresse"
                : "Votre identité Mail ETHONE"}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {view === "select_provider"
                ? "Choisissez comment vous souhaitez utiliser votre messagerie."
                : "Personnalisez votre adresse d'envoi et votre profil."}
            </p>
          </div>
        </div>

        {view === "select_provider"
          ? selectProviderView
          : view === "create"
          ? createForm
          : confirmForm}
      </motion.div>
    </div>
  );
}
