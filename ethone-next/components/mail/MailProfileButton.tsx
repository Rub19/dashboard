"use client";

import { useState } from "react";
import { User, Mail, Star, Plus, Check, Loader2, Crown, Copy, CheckCircle2, Shuffle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import type { MailAlias } from "@/lib/hooks/useMail";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

function sanitizeLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
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
      success("Nom affiché mis à jour");
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
      success("Adresse principale définie");
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
        success("Nouvelle adresse créée");
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
    for (let i = 0; i < 6; i += 1) result += chars[Math.floor(Math.random() * chars.length)];
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
      {/* Trigger Button inside Mail Sidebar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 p-2.5 text-left transition-all hover:bg-[var(--surface-raised)] hover:border-[var(--accent-primary)]/40 shadow-xs cursor-pointer"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-xs">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
            {primary?.display_name || "Profil mail"}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">
            {primary?.alias || "rubens@ethone.dev"}
          </p>
        </div>
        <Mail className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
      </button>

      {/* Modal Profile / Settings */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Profil mail"
        description="Votre identité d'envoi et adresses connectées ETHONE"
        size="md"
        hideFooter
      >
        <div className="space-y-5 pt-1">
          {/* 1. ADRESSE PRINCIPALE */}
          {primary && (
            <div className="rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-b from-[var(--surface-raised)]/90 to-[var(--surface-raised)]/60 p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  <Crown className="h-3.5 w-3.5" />
                  <span>Adresse Principale</span>
                </div>
                <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] font-mono">
                    <Mail className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    <span className="truncate">{primary.alias}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Cette adresse est unique et vous est réservée.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyEmail(primary.alias)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                  title="Copier l'adresse"
                >
                  {copied === primary.alias ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Nom affiché */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">Nom affiché</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
                    placeholder="Ex: Rub"
                    className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDisplayName}
                    disabled={saving || displayName.trim() === (primary.display_name || "")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:scale-105 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
                    title="Enregistrer le nom"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Minuscules, chiffres, points, tirets. 3-32 caractères.
                </p>
              </div>
            </div>
          )}

          {/* 2. MES ADRESSES */}
          {aliases.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Mes adresses
              </h4>
              <div className="space-y-2">
                {aliases.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all",
                      a.is_primary
                        ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:border-[var(--panel-border)]/80"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--text-primary)] font-mono truncate">
                        {a.alias}
                      </p>
                      {a.display_name && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{a.display_name}</p>
                      )}
                    </div>
                    {a.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 px-2.5 py-1 text-[10px] font-bold text-[var(--accent-primary)]">
                        <Star className="h-3 w-3 fill-current" />
                        Principale
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(a.id)}
                        disabled={primaryLoading === a.id}
                        className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {primaryLoading === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Définir principale"
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. AJOUTER UNE ADRESSE */}
          {createAlias && (
            <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Ajouter une adresse
              </h4>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value.slice(0, 80))}
                  placeholder="Nom affiché (optionnel)"
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                />

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={local}
                    onChange={(e) => setLocal(sanitizeLocal(e.target.value))}
                    placeholder="votre-alias"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 pr-32 text-xs text-[var(--text-primary)] font-mono focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">@ethone.dev</span>
                    <button
                      type="button"
                      onClick={() => setLocal(randomLocal())}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer"
                      title="Générer un alias aléatoire"
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !local.trim()}
                  className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-2.5 px-4 text-xs font-bold text-[var(--accent-contrast)] shadow-md hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Créer l&apos;adresse</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
