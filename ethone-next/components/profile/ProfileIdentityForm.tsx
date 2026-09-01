"use client";

import { useEffect, useState } from "react";
import { useIdentity, IdentityPresenceStatus, IDENTITY_PRESENCE_STATUSES } from "@/lib/identity";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import FlatCard from "@/components/FlatCard";
import Input from "@/components/Input";
import Button from "@/components/ui/Button";
import { Save } from "lucide-react";

export function ProfileIdentityForm() {
  const i18n = useI18n();
  const toast = useToast();
  const { identity, loading, save } = useIdentity();

  const [bio, setBio] = useState("");
  const [presence, setPresence] = useState<IdentityPresenceStatus>("offline");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (identity) {
      setBio(identity.bio);
      setPresence(identity.presence_status);
    }
  }, [identity]);

  async function submit() {
    if (!identity) return;
    setSaving(true);
    const updated = await save({ bio, presence_status: presence });
    setSaving(false);
    if (updated) {
      toast.success(i18n("saved", "Identité enregistrée"));
    } else {
      toast.error(i18n("error", "Erreur lors de l'enregistrement"));
    }
  }

  return (
    <FlatCard>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Identité ETHONE
        </h3>

        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            disabled={!identity || loading}
            className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-50"
            placeholder="Quelques mots à propos de vous..."
          />
          <p className="mt-1 text-right text-xs text-[var(--muted)]">{bio.length}/300</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Statut</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {Object.entries(IDENTITY_PRESENCE_STATUSES).map(([key, config]) => (
              <button
                key={key}
                type="button"
                disabled={!identity || loading}
                onClick={() => setPresence(key as IdentityPresenceStatus)}
                className={`flex items-center gap-2 rounded-[var(--panel-radius)] border px-3 py-2 text-xs font-medium transition-colors ${
                  presence === key
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--accent)]"
                } disabled:opacity-50`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                {config.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={saving}
            onClick={submit}
            leftIcon={<Save className="h-4 w-4" />}
            disabled={!identity || loading}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </FlatCard>
  );
}
