"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";

export default function ProfilePage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const { profile, loading, save } = useProfile();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || "",
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  async function submit() {
    setSaving(true);
    setSaved(false);
    try {
      await save(form);
      setSaved(true);
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{i18n("profileTitle")}</h1>
        <Card3D>
          <div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" />
        </Card3D>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("profileTitle")}</h1>

      <Card3D>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-bold text-white">
            {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
          </span>
          <div>
            <p className="text-lg font-semibold">{profile?.display_name || user?.email || i18n("guest")}</p>
            <p className="text-sm text-[var(--muted)]">{user?.email}</p>
            {profile?.username && (
              <p className="text-sm text-[var(--accent)]">@{profile.username}</p>
            )}
          </div>
        </div>
      </Card3D>

      <Card3D>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("username")}</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={i18n("usernamePlaceholder")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <p className="text-xs text-[var(--muted)]">{i18n("displayNameHint")}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("displayName")}</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder={i18n("yourNamePlaceholder")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("avatarUrl")}</label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="save" className="h-4 w-4" />}
              {i18n("save")}
            </button>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)]"
            >
              {i18n("cancel")}
            </button>

            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <Icon name="check" className="h-4 w-4" /> {i18n("saved")}
              </span>
            )}
          </div>
        </div>
      </Card3D>
    </div>
  );
}
