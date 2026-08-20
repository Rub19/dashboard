"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { usePublicProfile } from "@/lib/hooks/usePublicProfile";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import Image from "next/image";
import Button from "@/components/ui/Button";

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
  const publicProfile = usePublicProfile(form.username || profile?.username);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { upload: uploadMedia, uploading: uploadingMedia, result: uploadResult } = useMediaUpload(user?.id);

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

  async function handleAvatarUpload(file: File) {
    const res = await uploadMedia(file, "avatar");
    if (res.ok && res.data?.url) {
      setForm((prev) => ({ ...prev, avatar_url: res.data!.url }));
      success(i18n("uploaded"));
    } else if (res.message) {
      showError(res.message);
    }
  }

  if (loading) {
    return (
      <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
        <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileTitle")}</h1>
        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
        <Card3D>
          <div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" />
        </Card3D>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileTitle")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <Card3D>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--accent)] text-2xl font-bold text-white">
            {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="break-words text-lg font-semibold">{profile?.display_name || user?.email || i18n("guest")}</p>
            <p className="break-words text-sm text-[var(--muted)]">{user?.email}</p>
            {profile?.username && (
              <p className="break-words text-sm text-[var(--accent)]">@{profile.username}</p>
            )}
          </div>
        </div>
      </Card3D>

      {profile?.public_id && (
        <Card3D>
          <div className="space-y-2">
            <label className="text-sm font-medium">{i18n("publicId")}</label>
            <div className="flex min-w-0 items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm backdrop-blur-[var(--panel-blur)]">
              <code className="break-all text-xs text-[var(--muted)]">{profile.public_id}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(profile.public_id || "");
                  success(i18n("copied"));
                }}
                className="ml-auto rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-bg)]"
                aria-label={i18n("copy")}
              >
                <Icon name="copy" className="h-4 w-4" />
              </button>
            </div>
            <p className="break-words text-xs text-[var(--muted)]">{i18n("publicIdHint")}</p>
          </div>
        </Card3D>
      )}

      <Card3D>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("username")}</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              aria-label={i18n("usernamePlaceholder")} placeholder={i18n("usernamePlaceholder")}
              className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
            />
            <p className="break-words text-xs text-[var(--muted)]">{i18n("displayNameHint")}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("displayName")}</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              aria-label={i18n("yourNamePlaceholder")} placeholder={i18n("yourNamePlaceholder")}
              className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{i18n("avatarUrl")}</label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-[var(--panel-blur)]"
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]">
              <Icon name="upload" className="h-4 w-4" />
              {uploadingMedia ? i18n("loading") : i18n("uploadAvatar")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploadingMedia}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {uploadResult?.message && !uploadResult?.ok && (
              <p className="text-xs text-red-400">{uploadResult.message}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={submit}
              isLoading={saving}
              leftIcon={<Icon name="save" className="h-4 w-4" />}
            >
              {i18n("save")}
            </Button>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
            >
              {i18n("cancel")}
            </button>

            <button
              type="button"
              onClick={() => router.push("/profile-selection")}
              className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
            >
              <Icon name="users" className="h-4 w-4" />
              {i18n("manageProfiles")}
            </button>

            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <Icon name="check" className="h-4 w-4" /> {i18n("saved")}
              </span>
            )}
          </div>
        </div>
      </Card3D>

      {form.username && publicProfile.profile && (
        <Card3D>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">{i18n("publicProfilePreview")}</h2>
            <div className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
              {publicProfile.profile.avatarUrl ? (
                <Image src={publicProfile.profile.avatarUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-white">
                  {publicProfile.profile.displayName?.[0]?.toUpperCase() || "?"}
                </span>
              )}
              <div className="min-w-0">
                <p className="break-words font-semibold">{publicProfile.profile.displayName}</p>
                <p className="break-words text-sm text-[var(--muted)]">@{publicProfile.profile.username}</p>
              </div>
            </div>
          </div>
        </Card3D>
      )}
      </div>
    </div>
  );
}
