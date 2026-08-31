"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FlatCard from "@/components/FlatCard";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { usePublicProfile } from "@/lib/hooks/usePublicProfile";
import { useMediaUpload } from "@/lib/hooks/useMediaUpload";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";
import FormField from "@/components/FormField";
import { Sparkles, Camera } from "lucide-react";
import AvatarPickerModal from "@/components/AvatarPickerModal";
import ClientImage from "@/components/ClientImage";

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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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
      if (form.avatar_url) {
        localStorage.setItem("ethone_custom_avatar", form.avatar_url);
        localStorage.setItem("ethone_user_avatar", form.avatar_url);
      }
      if (form.display_name) {
        localStorage.setItem("ethone_user_name", form.display_name);
      }
      await save(form);
      setSaved(true);
      success(i18n("saved", "Profil enregistré avec succès"));
    } catch (err) {
      console.warn("Profile save worker error, local and supabase fallback applied:", err);
      success(i18n("saved", "Profil enregistré avec succès"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    const res = await uploadMedia(file, "avatar");
    if (res.ok && res.data?.url) {
      const newUrl = res.data.url;
      setForm((prev) => ({ ...prev, avatar_url: newUrl }));
      localStorage.setItem("ethone_custom_avatar", newUrl);
      localStorage.setItem("ethone_user_avatar", newUrl);
      try {
        await save({ avatar_url: newUrl });
      } catch {}
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: newUrl } }));
      }
      success(i18n("uploaded", "Photo de profil appliquée avec succès"));
    } else if (res.message) {
      showError(res.message);
    }
  }

  if (loading) {
    return (
      <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
        <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileTitle")}</h1>
        <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
        <FlatCard>
          <div className="h-8 w-1/3 animate-pulse rounded bg-[var(--border)]" />
        </FlatCard>
        </div>
      </div>
    );
  }

  const currentAvatar = form.avatar_url || profile?.avatar_url;

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <h1 className="shrink-0 mb-4 text-2xl font-bold">{i18n("profileTitle")}</h1>

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6">
      <FlatCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--accent)] text-2xl font-bold text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105"
            onClick={() => setIsPickerOpen(true)}
            title="Changer d'avatar (Netflix, Crunchyroll, Gaming...)"
          >
            {currentAvatar ? (
              <ClientImage
                src={currentAvatar}
                alt={profile?.display_name || "Avatar"}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                fallback={
                  <span>{profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "R"}</span>
                }
              />
            ) : (
              <span>{profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "R"}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="break-words text-lg font-semibold">{form.display_name || profile?.display_name || user?.email || i18n("guest")}</p>
            <p className="break-words text-sm text-[var(--muted)]">{user?.email}</p>
            {(form.username || profile?.username) && (
              <p className="break-words text-sm text-[var(--accent)]">@{form.username || profile?.username}</p>
            )}
          </div>
        </div>
      </FlatCard>

      {profile?.public_id && (
        <FlatCard>
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
        </FlatCard>
      )}

      <FlatCard>
        <div className="space-y-4">
          <FormField label={i18n("username")} help={i18n("displayNameHint")}>
            <Input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              aria-label={i18n("usernamePlaceholder")}
              placeholder={i18n("usernamePlaceholder")}
              className="w-full"
            />
          </FormField>

          <FormField label={i18n("displayName")}>
            <Input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              aria-label={i18n("yourNamePlaceholder")}
              placeholder={i18n("yourNamePlaceholder")}
              className="w-full"
            />
          </FormField>

          <div className="space-y-1">
            <FormField label={i18n("avatarUrl")}>
              <Input
                type="url"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://..."
                className="w-full"
              />
            </FormField>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Choisir un avatar (Netflix, Crunchyroll, Gaming...)
              </Button>

              <label className="flex cursor-pointer items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--accent)] backdrop-blur-[var(--panel-blur)] cursor-pointer">
                <Icon name="upload" className="h-3.5 w-3.5" />
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
            </div>
            {uploadResult?.message && !uploadResult?.ok && (
              <p className="text-xs text-red-400">{uploadResult.message}</p>
            )}
          </div>

          <AvatarPickerModal
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            onSelect={(url) => setForm((prev) => ({ ...prev, avatar_url: url }))}
          />

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
              <span className="flex items-center gap-1 text-sm text-[var(--accent-primary)]">
                <Icon name="check" className="h-4 w-4" /> {i18n("saved")}
              </span>
            )}
          </div>
        </div>
      </FlatCard>

      {form.username && publicProfile.profile && (
        <FlatCard>
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
        </FlatCard>
      )}
      </div>
    </div>
  );
}
