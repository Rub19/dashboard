"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Smile,
  Sparkles,
  Shield,
  Camera,
  Upload,
  Crop as CropIcon,
  Check,
  Palette,
  Save,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useIdentity, PROFILE_FRAMES } from "@/lib/identity";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { usePersonalizationStore } from "@/lib/personalization/personalization-store";
import ProfileHero2026 from "@/components/profile/ProfileHero2026";
import AvatarCropperModal from "@/components/profile/AvatarCropperModal";
import AvatarPickerModal from "@/components/AvatarPickerModal";
import ProfileStatusPicker from "@/components/profile/ProfileStatusPicker";
import PersonalizationPanel from "@/components/profile/PersonalizationPanel";
import ProfileSecurityAndData from "@/components/profile/ProfileSecurityAndData";
import { cn } from "@/lib/utils";

type ProfileTab = "identity" | "status" | "personalization" | "security";

export default function ProfilePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { profile, save: saveCoreProfile } = useProfile();
  const { identity, save: saveIdentity } = useIdentity();

  const [activeWorkspace, setActiveWorkspace] = useLocalStorage<string>(
    "ethone-active-workspace",
    "personal"
  );

  const {
    preferences,
    inferredPreferences,
    setPresenceStatus,
    setCustomStatus,
    toggleInterest,
    setDensity,
    togglePrivacySetting,
    toggleAutoStatus,
    exportPersonalData,
    resetPersonalization,
  } = usePersonalizationStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>("identity");
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
  }>({
    isOpen: false,
    imageSrc: null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    avatarFrameId: "",
  });

  useEffect(() => {
    setForm({
      displayName: identity?.display_name || profile?.display_name || "",
      username: identity?.username || profile?.username || "",
      bio: identity?.bio || "",
      avatarFrameId: identity?.avatar_frame_id || "",
    });
  }, [identity, profile]);

  // Handle file select for avatar
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toastError("Veuillez sélectionner un fichier image valide (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toastError("L'image est trop volumineuse (maximum 8 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperState({
        isOpen: true,
        imageSrc: reader.result as string,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  // When crop is finished
  const handleCropComplete = async (croppedDataUrl: string) => {
    if (user?.id) {
      localStorage.setItem(`ethone_custom_avatar:${user.id}`, croppedDataUrl);
      localStorage.setItem(`ethone_user_avatar:${user.id}`, croppedDataUrl);
    }

    try {
      await saveCoreProfile({ avatar_url: croppedDataUrl });
      await saveIdentity({ avatar_url: croppedDataUrl });
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ethone:identity:update", {
          detail: { avatar_url: croppedDataUrl },
        })
      );
    }

    success("Nouvel avatar recadré et appliqué avec succès !");
  };

  // When picking from AvatarPickerModal catalog
  const handleAvatarCatalogSelect = async (avatarUrl: string) => {
    if (user?.id) {
      localStorage.setItem(`ethone_custom_avatar:${user.id}`, avatarUrl);
      localStorage.setItem(`ethone_user_avatar:${user.id}`, avatarUrl);
    }

    try {
      await saveCoreProfile({ avatar_url: avatarUrl });
      await saveIdentity({ avatar_url: avatarUrl });
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ethone:identity:update", {
          detail: { avatar_url: avatarUrl },
        })
      );
    }

    setIsAvatarPickerOpen(false);
    success("Avatar sélectionné appliqué avec succès !");
  };

  // Submit Identity Form
  const handleSaveIdentity = async () => {
    setSaving(true);
    try {
      if (user?.id && form.displayName) {
        localStorage.setItem(`ethone_user_name:${user.id}`, form.displayName);
      }

      await saveCoreProfile({
        display_name: form.displayName,
        username: form.username,
      });

      await saveIdentity({
        display_name: form.displayName,
        username: form.username,
        bio: form.bio,
        avatar_frame_id: form.avatarFrameId,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ethone:identity:update", {
            detail: {
              display_name: form.displayName,
              username: form.username,
            },
          })
        );
      }

      success("Modifications du profil enregistrées !");
    } catch (err: any) {
      toastError(`Erreur lors de la sauvegarde : ${err?.message || "Inconnue"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden p-3 sm:p-6 space-y-5">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <span>Centre d'Identité & Personnalisation</span>
            <span className="rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 px-2.5 py-0.5 text-[11px] font-bold text-[var(--accent-primary)]">
              Personal OS 2.0
            </span>
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Gérez votre identité numérique, vos avatars, vos préférences et la personnalisation cognitive Brain.
          </p>
        </div>
      </div>

      {/* Hero Profile 2026 */}
      <div className="shrink-0">
        <ProfileHero2026
          presenceStatus={preferences.presenceStatus}
          customStatus={preferences.customStatus}
          activeWorkspace={activeWorkspace}
          onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
          onOpenStatusPicker={() => setIsStatusPickerOpen(true)}
          onSwitchWorkspace={(ws) => setActiveWorkspace(ws)}
        />
      </div>

      {/* Navigation Tabs Bar */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: "identity" as const, label: "Identité & Profil", icon: User },
          { id: "status" as const, label: "Statut & Présence", icon: Smile },
          { id: "personalization" as const, label: "Moteur de Personnalisation", icon: Sparkles },
          { id: "security" as const, label: "Sécurité & Données", icon: Shield },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 font-semibold transition-all touch-manipulation cursor-pointer",
                isActive
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll pr-1 pb-6 space-y-6">
        {/* Tab 1: Identity & Profile */}
        {activeTab === "identity" && (
          <div className="space-y-5">
            {/* Avatar Quick Management */}
            <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span>Gestion de l'Avatar & Cadres</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Importez votre photo, recadrez-la au millimètre ou choisissez un avatar parmi nos collections vérifiées.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer & Recadrer une image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Ouvrir la bibliothèque d'avatars</span>
                </button>
              </div>

              {/* Avatar Frames Selector */}
              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Cadre d'avatar actif
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {PROFILE_FRAMES.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, avatarFrameId: frame.id }))}
                      className={cn(
                        "rounded-2xl border p-2.5 text-center transition-all cursor-pointer",
                        form.avatarFrameId === frame.id
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 shadow-xs font-bold text-white"
                          : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
                      )}
                    >
                      <span className="text-xs block truncate">{frame.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Identity Form */}
            <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Coordonnées publiques & Biographie
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Ces informations définissent votre carte d'identité dans l'écosystème ETHONE.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Nom d'affichage
                  </label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="Votre nom ou pseudonyme"
                    className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Nom d'utilisateur unique (@handle)
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    placeholder="nom_utilisateur"
                    className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Biographie
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Décrivez votre activité ou votre philosophie de travail..."
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Status & Presence */}
        {activeTab === "status" && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Smile className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>Statut de présence en direct</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Modifiez votre présence visible pour les collaborateurs ou vos intégrations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStatusPickerOpen(true)}
                  className="rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  Ouvrir le sélecteur complet
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {[
                  { id: "online", label: "En ligne", color: "bg-emerald-500" },
                  { id: "focus", label: "Focus", color: "bg-purple-500" },
                  { id: "gaming", label: "En jeu", color: "bg-rose-500" },
                  { id: "dnd", label: "Ne pas déranger", color: "bg-red-500" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPresenceStatus(s.id as any)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer",
                      preferences.presenceStatus === s.id
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-white shadow-xs"
                        : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                    <span>{s.label}</span>
                    {preferences.presenceStatus === s.id && (
                      <Check className="ml-auto h-3.5 w-3.5 text-[var(--accent-primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Personalization Panel */}
        {activeTab === "personalization" && (
          <PersonalizationPanel
            preferences={preferences}
            inferredPreferences={inferredPreferences}
            onToggleInterest={toggleInterest}
            onSetDensity={setDensity}
            onTogglePrivacy={togglePrivacySetting}
          />
        )}

        {/* Tab 4: Security & Data */}
        {activeTab === "security" && (
          <ProfileSecurityAndData
            onExportData={exportPersonalData}
            onResetPersonalization={resetPersonalization}
          />
        )}
      </div>

      {/* Interactive Avatar Cropper Modal */}
      <AvatarCropperModal
        imageSrc={cropperState.imageSrc}
        isOpen={cropperState.isOpen}
        onClose={() => setCropperState({ isOpen: false, imageSrc: null })}
        onCropComplete={handleCropComplete}
      />

      {/* Avatar Catalog Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        onSelect={handleAvatarCatalogSelect}
      />

      {/* Profile Presence & Custom Status Picker */}
      <ProfileStatusPicker
        isOpen={isStatusPickerOpen}
        onClose={() => setIsStatusPickerOpen(false)}
        currentStatus={preferences.presenceStatus}
        currentCustomStatus={preferences.customStatus}
        autoStatusEnabled={preferences.autoStatus}
        onSelectStatus={setPresenceStatus}
        onSaveCustomStatus={setCustomStatus}
        onToggleAutoStatus={toggleAutoStatus}
      />
    </div>
  );
}
