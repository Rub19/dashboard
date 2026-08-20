"use client";

import { useState } from "react";
import { User, Mail, Star, Plus, Check, Loader2, Crown, Copy, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import type { MailAlias } from "@/lib/hooks/useMail";
import Modal from "@/components/ui/Modal";

function sanitizeLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type MailProfileButtonProps = {
  aliases: MailAlias[];
  primaryAlias?: MailAlias | null;
  updateAlias?: (id: string, patch: { display_name?: string; is_primary?: boolean }) => Promise<MailAlias | null | undefined>;
  createAlias?: (input: string | { alias?: string; display_name?: string }) => Promise<MailAlias | null | undefined>;
};

export default function MailProfileButton({ aliases, primaryAlias, updateAlias, createAlias }: MailProfileButtonProps) {
  const i18n = useI18n();
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(primaryAlias?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [primaryLoading, setPrimaryLoading] = useState<string | null>(null);

  const primary = primaryAlias || aliases.find((a) => a.is_primary) || aliases[0];

  async function handleSaveDisplayName() {
    if (!updateAlias || !primary) return;
    const name = displayName.trim();
    if (name === (primary.display_name || "")) return;
    setSaving(true);
    try {
      await updateAlias(primary.id, { display_name: name });
      success(i18n("saved") || "Enregistré");
    } catch (err) {
      toastError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPrimary(id: string) {
    if (!updateAlias) return;
    setPrimaryLoading(id);
    try {
      await updateAlias(id, { is_primary: true });
      success(i18n("saved") || "Enregistré");
    } catch (err) {
      toastError(String(err));
    } finally {
      setPrimaryLoading(null);
    }
  }

  async function handleCreate() {
    if (!createAlias) return;
    const safe = sanitizeLocal(local);
    if (!safe) return;
    setCreating(true);
    try {
      const created = await createAlias({ alias: `${safe}@ethone.dev`, display_name: newDisplayName.trim() || undefined });
      if (created?.id) {
        success(i18n("saved") || "Enregistré");
        setLocal("");
        setNewDisplayName("");
      } else {
        toastError(i18n("aliasUnavailable") || "Cette adresse n'est pas disponible.");
      }
    } catch (err) {
      toastError(String(err));
    } finally {
      setCreating(false);
    }
  }

  function randomLocal() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "u-";
    for (let i = 0; i < 8; i += 1) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(email);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-left transition-colors hover:bg-white/[0.04] hover:border-white/[0.10]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white truncate">
            {primary?.display_name || i18n("mailProfile") || "Profil mail"}
          </p>
          <p className="text-[10px] text-zinc-500 truncate">
            {primary?.alias || i18n("noAlias") || "Aucune adresse"}
          </p>
        </div>
        <Mail className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={i18n("mailProfile") || "Profil mail"}
        description={i18n("mailProfileDescription") || "Votre identité d'envoi ETHONE"}
        size="md"
        hideFooter
      >
        <div className="space-y-5">
          {primary && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                <Crown className="h-3.5 w-3.5" />
                {i18n("primaryAlias") || "Adresse principale"}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <Mail className="h-4 w-4 shrink-0 text-purple-400" />
                    <span className="truncate">{primary.alias}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {i18n("uniquePerUser") || "Cette adresse est unique et vous est réservée."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyEmail(primary.alias)}
                  className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label={i18n("copy") || "Copier"}
                >
                  {copied === primary.alias ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {i18n("displayName") || "Nom affiché"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
                    placeholder={i18n("displayName") || "Nom affiché"}
                    className="min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDisplayName}
                    disabled={saving || displayName.trim() === (primary.display_name || "")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white transition-colors hover:bg-purple-500 disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-500">
                  {i18n("displayNameHint") || "Ce nom apparaîtra dans l'expéditeur de vos messages."}
                </p>
              </div>
            </div>
          )}

          {aliases.length > 1 && (
            <div>
              <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {i18n("myMailAddresses") || "Mes adresses"}
              </h4>
              <div className="space-y-2">
                {aliases.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                      a.is_primary
                        ? "border-purple-500/20 bg-purple-500/10"
                        : "border-white/[0.06] bg-white/[0.02]"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 truncate">{a.alias}</p>
                      {a.display_name && <p className="text-[10px] text-zinc-500 truncate">{a.display_name}</p>}
                    </div>
                    {a.is_primary ? (
                      <span className="flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-purple-300">
                        <Star className="h-3 w-3" />
                        {i18n("primary") || "Principale"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(a.id)}
                        disabled={primaryLoading === a.id}
                        className="rounded-md px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                      >
                        {primaryLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : i18n("setAsPrimary") || "Définir principale"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {createAlias && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <h4 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {i18n("addAlias") || "Ajouter une adresse"}
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value.slice(0, 80))}
                  placeholder={i18n("displayName") || "Nom affiché"}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                />
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/15 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
                    <input
                      type="text"
                      value={local}
                      onChange={(e) => setLocal(sanitizeLocal(e.target.value))}
                      placeholder="votre-alias"
                      className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
                    />
                    <span className="shrink-0 text-[11px] text-zinc-500">@ethone.dev</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocal(randomLocal())}
                    className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    aria-label={i18n("random") || "Aléatoire"}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !local.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {i18n("createAlias") || "Créer l'adresse"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
