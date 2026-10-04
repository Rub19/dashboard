"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Camera, Check, Download, ExternalLink, Loader2, Lock, Palette, Pencil, Smile, User, X } from "@/components/icons/ph";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarLibrary from "@/components/profile/AvatarLibrary";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { describeProfileError, saveAccountProfile, useAccountProfile, type AccountProfile, type PresenceStatus } from "@/lib/profile/account-profile";
import { AVATAR_FRAMES, PRESENCE, PROFILE_BACKGROUNDS, STATUS_EMOJIS, STATUS_SUGGESTIONS, backgroundById } from "@/lib/profile/cosmetics";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Tab = "profile" | "status" | "appearance" | "account";
const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "profile", label: "Profil", icon: User },
  { id: "status", label: "Statut", icon: Smile },
  { id: "appearance", label: "Apparence", icon: Palette },
  { id: "account", label: "Compte", icon: Lock },
];

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** Pseudo valide dérivé du compte, utilisé seulement à la toute première création du profil. */
function seedUsername(raw: string, userId: string) {
  const s = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._-]/g, "").replace(/^[._-]+/, "").slice(0, 32);
  return USERNAME_RE.test(s) ? s : `user-${userId.slice(0, 8)}`;
}

const panel = "rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)]";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/70";

export default function ProfilePage() {
  const { user } = useAuth();
  const identity = useUserIdentity();
  const { profile, loaded, signedIn } = useAccountProfile();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [libraryOpen, setLibraryOpen] = useState(false);

  // « Mis à jour depuis un autre appareil » : le profil change sans qu'on vienne d'enregistrer ici.
  const lastLocalSave = useRef(0);
  const [remotePulse, setRemotePulse] = useState(false);
  const profileJson = JSON.stringify(profile);
  const prevJson = useRef(profileJson);
  useEffect(() => {
    if (loaded && prevJson.current !== profileJson && Date.now() - lastLocalSave.current > 2500) {
      setRemotePulse(true);
      const t = setTimeout(() => setRemotePulse(false), 3200);
      prevJson.current = profileJson;
      return () => clearTimeout(t);
    }
    prevJson.current = profileJson;
  }, [profileJson, loaded]);

  const save = async (patch: Partial<AccountProfile>, okMessage?: string) => {
    lastLocalSave.current = Date.now();
    try {
      await saveAccountProfile(patch, {
        displayName: identity.displayName,
        username: seedUsername(identity.username, user?.id ?? ""),
        avatarUrl: identity.avatarUrl && !/^data:/.test(identity.avatarUrl) ? identity.avatarUrl : "",
      });
      if (okMessage) success(okMessage);
      return true;
    } catch (e) {
      toastError(describeProfileError(e));
      return false;
    }
  };

  if (!signedIn && loaded) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Votre profil</h1>
          <p className="text-sm text-[var(--text-muted)]">Connectez-vous pour choisir un avatar, un statut et retrouver votre profil sur tous vos appareils.</p>
          <Link href="/login" className="inline-flex h-10 items-center rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const bg = backgroundById(profile.backgroundId);

  return (
    <div className="h-full min-h-0 overflow-y-auto os-scroll [overscroll-behavior:contain]">
      <div className="stagger-children mx-auto w-full max-w-5xl space-y-5 px-4 pb-40 pt-5 sm:px-6 sm:pt-8">
        {/* Carte d'identité */}
        <section className={cn(panel, "relative overflow-hidden")}>
          <div aria-hidden className="absolute inset-0 transition-[background] duration-500" style={bg.style} />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
            {loaded ? (
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                aria-label="Changer d'avatar"
                className="group relative w-fit rounded-full outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg-surface)]"
              >
                <ProfileAvatar src={identity.avatarUrl} initials={identity.initials} frameId={profile.frameId} presence={profile.presence} size={112} />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="h-6 w-6" />
                </span>
              </button>
            ) : (
              <div className="skeleton-shimmer h-28 w-28 rounded-full" />
            )}

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)] sm:text-[32px]">{identity.displayName}</h1>
                <PresenceChip presence={profile.presence} />
              </div>
              <p className="text-sm text-[var(--text-muted)]">@{identity.username}</p>
              <AnimatePresence initial={false}>
                {(profile.statusText || profile.statusEmoji) && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: EASE_SNAP }}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--bg-surface)]/70 px-3 py-1 text-sm text-[var(--text-primary)] backdrop-blur"
                  >
                    {profile.statusEmoji && <span aria-hidden>{profile.statusEmoji}</span>}
                    <span className="truncate">{profile.statusText}</span>
                  </motion.p>
                )}
              </AnimatePresence>
              <p className={cn("max-w-2xl text-sm leading-relaxed", profile.bio ? "text-[var(--text-primary)]/85" : "text-[var(--text-muted)]")}>
                {profile.bio || "Pas encore de bio. Ajoutez-en une dans l'onglet Profil."}
              </p>
            </div>

            <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
              <SyncPill pulse={remotePulse} ready={loaded} />
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97]"
              >
                <Pencil className="h-4 w-4" /> Changer d&apos;avatar
              </button>
            </div>
          </div>
        </section>

        {/* Onglets */}
        <div role="tablist" aria-label="Sections du profil" className={cn(panel, "flex gap-1 overflow-x-auto p-1 no-scrollbar")}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--panel-radius)-4px)] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                )}
              >
                {active && <motion.span layoutId="profile-tab-pill" transition={SPRING_PILL} className="absolute inset-0 rounded-[calc(var(--panel-radius)-4px)] bg-[var(--accent-primary)]" />}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE_SNAP }}>
            {!loaded ? (
              <div className={cn(panel, "space-y-3 p-6")} role="status" aria-busy="true" aria-label="Chargement du profil…">
                <div className="skeleton-shimmer h-5 w-40 rounded" />
                <div className="skeleton-shimmer h-11 rounded-xl" />
                <div className="skeleton-shimmer h-11 rounded-xl" />
                <div className="skeleton-shimmer h-24 rounded-xl" />
              </div>
            ) : tab === "profile" ? (
              <ProfileTab profile={profile} fallbackName={identity.displayName} fallbackUsername={identity.username} onSave={save} />
            ) : tab === "status" ? (
              <StatusTab profile={profile} onSave={save} />
            ) : tab === "appearance" ? (
              <AppearanceTab profile={profile} avatarUrl={identity.avatarUrl} initials={identity.initials} onSave={save} />
            ) : (
              <AccountTab profile={profile} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AvatarLibrary isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  );
}

function PresenceChip({ presence }: { presence: PresenceStatus }) {
  const p = PRESENCE[presence];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--bg-surface)]/70 px-2.5 py-0.5 text-xs font-medium text-[var(--text-primary)] backdrop-blur">
      <span className="h-2 w-2 rounded-full transition-colors duration-300" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}

function SyncPill({ pulse, ready }: { pulse: boolean; ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors duration-300",
        pulse ? "border-[var(--success)]/50 bg-[var(--success)]/12 text-[var(--text-primary)]" : "border-[var(--panel-border)] bg-[var(--bg-surface)]/70 text-[var(--text-muted)]",
      )}
      aria-live="polite"
    >
      <span className={cn("h-2 w-2 rounded-full", ready ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")} />
      {pulse ? "Mis à jour depuis un autre appareil" : ready ? "Synchronisé sur vos appareils" : "Connexion…"}
    </span>
  );
}

function Section({ title, text, children, className }: { title: string; text?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(panel, "space-y-4 p-5 sm:p-6", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
        {text && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{text}</p>}
      </div>
      {children}
    </section>
  );
}

// ───────────────────────────── Profil : nom, pseudo, bio
function ProfileTab({
  profile,
  fallbackName,
  fallbackUsername,
  onSave,
}: {
  profile: AccountProfile;
  fallbackName: string;
  fallbackUsername: string;
  onSave: (p: Partial<AccountProfile>, msg?: string) => Promise<boolean>;
}) {
  const initial = useMemo(
    () => ({ displayName: profile.displayName || fallbackName, username: profile.username || fallbackUsername, bio: profile.bio }),
    [profile.displayName, profile.username, profile.bio, fallbackName, fallbackUsername],
  );
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  // Un changement venu d'un autre appareil remplace le brouillon tant qu'on n'a rien modifié ici.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setDraft(initial);
  }, [initial]);

  const set = (p: Partial<typeof draft>) => {
    touched.current = true;
    setDraft((d) => ({ ...d, ...p }));
  };
  const username = draft.username.trim().toLowerCase();
  const usernameError = username && !USERNAME_RE.test(username) ? "3 à 32 caractères : lettres minuscules, chiffres, « . », « _ » ou « - »." : "";
  const dirty = draft.displayName !== initial.displayName || draft.username !== initial.username || draft.bio !== initial.bio;
  const invalid = !draft.displayName.trim() || !username || Boolean(usernameError);

  const submit = async () => {
    setSaving(true);
    const ok = await onSave({ displayName: draft.displayName.trim(), username, bio: draft.bio.trim() }, "Profil enregistré.");
    setSaving(false);
    if (ok) touched.current = false;
  };

  return (
    <>
      <Section title="Identité" text="Visible par les personnes avec qui vous partagez un espace ou un fichier.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">Nom affiché</span>
            <input value={draft.displayName} maxLength={80} onChange={(e) => set({ displayName: e.target.value })} className={inputCls} placeholder="Votre nom" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">Pseudo</span>
            <span className={cn(inputCls, "flex items-center gap-1.5", usernameError && "border-[var(--danger)]/60")}>
              <AtSign className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                value={draft.username}
                maxLength={32}
                onChange={(e) => set({ username: e.target.value.toLowerCase().replace(/\s+/g, "") })}
                className="h-full w-full bg-transparent outline-none"
                placeholder="pseudo"
                aria-invalid={Boolean(usernameError)}
              />
            </span>
            {usernameError && <span className="block text-xs text-[var(--danger)]">{usernameError}</span>}
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
            Bio <span className="tabular-nums">{draft.bio.length}/300</span>
          </span>
          <textarea
            value={draft.bio}
            maxLength={300}
            rows={4}
            onChange={(e) => set({ bio: e.target.value })}
            placeholder="Quelques mots sur vous, ce que vous faites, ce que vous aimez…"
            className={cn(inputCls, "h-auto resize-none py-3 leading-relaxed")}
          />
        </label>
      </Section>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 39 }}
            className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-[min(92vw,560px)] items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-3 pl-4 shadow-lg"
          >
            <p className="text-sm text-[var(--text-muted)]">{invalid ? "Corrigez les champs avant d'enregistrer." : "Modifications non enregistrées"}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  touched.current = false;
                  setDraft(initial);
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-[color,transform] duration-150 hover:text-[var(--text-primary)] active:scale-[0.97]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={invalid || saving}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,transform,opacity] duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ───────────────────────────── Statut : présence + statut personnalisé
function StatusTab({ profile, onSave }: { profile: AccountProfile; onSave: (p: Partial<AccountProfile>, msg?: string) => Promise<boolean> }) {
  const [emoji, setEmoji] = useState(profile.statusEmoji);
  const [text, setText] = useState(profile.statusText);
  useEffect(() => {
    setEmoji(profile.statusEmoji);
    setText(profile.statusText);
  }, [profile.statusEmoji, profile.statusText]);
  const dirty = emoji !== profile.statusEmoji || text.trim() !== profile.statusText;

  return (
    <div className="space-y-5">
      <Section title="Présence" text="Indiquée par la pastille sur votre avatar.">
        <div className="grid gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Présence">
          {(Object.keys(PRESENCE) as PresenceStatus[]).map((p) => {
            const active = profile.presence === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => !active && void onSave({ presence: p })}
                className="relative rounded-xl border border-[var(--panel-border)] p-3 text-left transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.97]"
              >
                {active && <motion.span layoutId="presence-ring" transition={SPRING_PILL} className="absolute inset-0 rounded-xl border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/8" />}
                <span className="relative flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRESENCE[p].color }} />
                  {PRESENCE[p].label}
                </span>
                <span className="relative mt-1 block text-xs text-[var(--text-muted)]">{PRESENCE[p].hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Statut personnalisé" text="Un emoji et une courte phrase affichés sous votre nom.">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? "" : e)}
              aria-pressed={emoji === e}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl border text-lg transition-[background-color,border-color,transform] duration-150 active:scale-90",
                emoji === e ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/12" : "border-[var(--panel-border)] hover:bg-[var(--surface-raised)]",
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({ statusEmoji: emoji, statusText: text.trim() }, "Statut mis à jour.");
          }}
        >
          <input value={text} maxLength={80} onChange={(e) => setText(e.target.value)} placeholder="Que faites-vous en ce moment ?" className={inputCls} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!dirty}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,transform,opacity] duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> Publier
            </button>
            {(profile.statusText || profile.statusEmoji) && (
              <button
                type="button"
                onClick={() => void onSave({ statusEmoji: "", statusText: "" }, "Statut effacé.")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 text-sm text-[var(--text-muted)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.97]"
              >
                <X className="h-4 w-4" /> Effacer
              </button>
            )}
          </div>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              type="button"
              onClick={() => {
                setEmoji(s.emoji);
                setText(s.text);
              }}
              className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] active:scale-[0.96]"
            >
              {s.emoji} {s.text}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ───────────────────────────── Apparence : cadre d'avatar et fond de la carte
function AppearanceTab({
  profile,
  avatarUrl,
  initials,
  onSave,
}: {
  profile: AccountProfile;
  avatarUrl?: string;
  initials: string;
  onSave: (p: Partial<AccountProfile>) => Promise<boolean>;
}) {
  const frameId = AVATAR_FRAMES.some((f) => f.id === profile.frameId) ? profile.frameId : "none";
  const bgId = backgroundById(profile.backgroundId).id;
  return (
    <div className="space-y-5">
      <Section title="Cadre d'avatar" text="S'applique partout où votre avatar apparaît.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
          {AVATAR_FRAMES.map((f) => {
            const active = frameId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => !active && void onSave({ frameId: f.id })}
                className="relative flex flex-col items-center gap-2 rounded-xl border border-[var(--panel-border)] p-3 transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.97]"
              >
                {active && <motion.span layoutId="frame-ring" transition={SPRING_PILL} className="absolute inset-0 rounded-xl border-2 border-[var(--accent-primary)]" />}
                <ProfileAvatar src={avatarUrl} initials={initials} frameId={f.id} size={56} />
                <span className="relative text-xs font-medium text-[var(--text-primary)]">{f.name}</span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Fond de la carte" text="Le décor de votre carte de profil, en haut de cette page.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {PROFILE_BACKGROUNDS.map((b) => {
            const active = bgId === b.id;
            return (
              <button
                key={b.id || "theme"}
                type="button"
                aria-pressed={active}
                onClick={() => !active && void onSave({ backgroundId: b.id })}
                className="relative overflow-hidden rounded-xl border border-[var(--panel-border)] text-left transition-transform duration-150 active:scale-[0.97]"
              >
                <span className="block h-16 bg-[var(--bg-surface)]" style={b.style} />
                <span className="block px-3 py-2 text-xs font-medium text-[var(--text-primary)]">{b.name}</span>
                {active && <motion.span layoutId="bg-ring" transition={SPRING_PILL} className="absolute inset-0 rounded-xl border-2 border-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ───────────────────────────── Compte : informations réelles du compte et raccourcis
function AccountTab({ profile }: { profile: AccountProfile }) {
  const { user } = useAuth();
  const provider = String(user?.app_metadata?.provider || "email");
  const providerLabel: Record<string, string> = { email: "E-mail et mot de passe", google: "Google", discord: "Discord", github: "GitHub" };
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const exportProfile = () => {
    const data = { exportedAt: new Date().toISOString(), email: user?.email, createdAt: user?.created_at, profile };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `ethone-profil-${profile.username || "export"}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows: Array<[string, React.ReactNode]> = [
    ["E-mail", <span key="e" className="flex items-center gap-2">{user?.email}{user?.email_confirmed_at && <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">vérifié</span>}</span>],
    ["Connexion", providerLabel[provider] ?? provider],
    ["Membre depuis", since],
  ];

  return (
    <div className="space-y-5">
      <Section title="Compte">
        <dl className="divide-y divide-[var(--panel-border)]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <dt className="text-[var(--text-muted)]">{k}</dt>
              <dd className="text-[var(--text-primary)]">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Raccourcis">
        <div className="grid gap-2 sm:grid-cols-3">
          <Link href="/settings/security" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] p-3.5 text-sm text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.98]">
            Sécurité, passkeys et appareils <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
          </Link>
          <Link href="/connections" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] p-3.5 text-sm text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.98]">
            Connexions et intégrations <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
          </Link>
          <button type="button" onClick={exportProfile} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] p-3.5 text-left text-sm text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.98]">
            Exporter mon profil (JSON) <Download className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </Section>
    </div>
  );
}
