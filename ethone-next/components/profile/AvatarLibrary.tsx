"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, Loader2, Search, Shuffle, Upload, X } from "@/components/icons/ph";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarCropperModal from "@/components/profile/AvatarCropperModal";
import { useToast } from "@/components/ToastProvider";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useUserState } from "@/lib/hooks/useUserState";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { describeProfileError, saveAccountProfile, uploadAvatarImage, useAccountProfile } from "@/lib/profile/account-profile";
import { ALL_AVATARS, AVATAR_COLLECTIONS, AVATAR_COUNT, avatarById, avatarByUrl, searchAvatars, seriesOf, type LibraryAvatar } from "@/lib/identity/avatar-library";
import { EASE_SNAP, SPRING_PANEL, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Choice = { url: string; name: string; series: string; id: string };
type Tab = "all" | "favorites" | "recent" | string;

const PREVIEW_PER_SECTION = 14;
const MAX_RECENT = 18;

/** Aperçu varié d'une collection : une vignette par série à tour de rôle, plutôt que les premières d'une seule série. */
function previewOf(items: LibraryAvatar[], n: number): LibraryAvatar[] {
  const bySeries = new Map<string, LibraryAvatar[]>();
  for (const a of items) bySeries.set(a.series, [...(bySeries.get(a.series) ?? []), a]);
  const queues = [...bySeries.values()];
  const out: LibraryAvatar[] = [];
  for (let round = 0; out.length < n && queues.some((q) => q.length > round); round++) {
    for (const q of queues) if (q[round] && out.length < n) out.push(q[round]);
  }
  return out;
}

/**
 * Bibliothèque d'avatars : choisir une image de la bibliothèque ETHONE ou importer sa propre photo.
 * Sans `onSelect`, le choix est enregistré directement dans le profil du compte (synchronisé sur tous les appareils).
 */
export default function AvatarLibrary({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect?: (url: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{isOpen && <LibraryPanel onClose={onClose} onSelect={onSelect} />}</AnimatePresence>, document.body);
}

function LibraryPanel({ onClose, onSelect }: { onClose: () => void; onSelect?: (url: string) => void }) {
  const { profile } = useAccountProfile();
  const identity = useUserIdentity();
  const { success, error: toastError } = useToast();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [favorites, setFavorites] = useUserState<string[]>("avatarFavorites", []);
  const [recent, setRecent] = useUserState<string[]>("avatarRecent", []);

  const current = identity.avatarUrl || "";
  const [choice, setChoice] = useState<Choice | null>(() => {
    const a = avatarByUrl(current);
    return a ? { ...a } : current ? { url: current, name: "Photo actuelle", series: "", id: "" } : null;
  });
  const [tab, setTab] = useState<Tab>("all");
  const [series, setSeries] = useState<string>("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !cropSrc && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, cropSrc]);

  const collection = AVATAR_COLLECTIONS.find((c) => c.id === tab);
  const seriesList = collection ? seriesOf(collection) : [];

  const pool: LibraryAvatar[] = useMemo(() => {
    if (tab === "favorites") return favorites.map(avatarById).filter((a): a is LibraryAvatar => Boolean(a));
    if (tab === "recent") return recent.map(avatarById).filter((a): a is LibraryAvatar => Boolean(a));
    if (collection) return series ? collection.items.filter((a) => a.series === series) : collection.items;
    return ALL_AVATARS;
  }, [tab, series, collection, favorites, recent]);
  const results = useMemo(() => searchAvatars(query, pool), [query, pool]);
  const grouped = tab === "all" && !query.trim();

  const toggleFavorite = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]));
  const pickRandom = () => {
    const list = grouped ? ALL_AVATARS : results;
    if (list.length) setChoice({ ...list[Math.floor(Math.random() * list.length)] });
  };

  const confirm = async () => {
    if (!choice || choice.url === current) return onClose();
    setSaving(true);
    try {
      if (onSelect) onSelect(choice.url);
      else await saveAccountProfile({ avatarUrl: choice.url, avatarId: choice.id });
      if (choice.id) setRecent((r) => [choice.id, ...r.filter((x) => x !== choice.id)].slice(0, MAX_RECENT));
      success("Avatar mis à jour sur tous vos appareils.");
      onClose();
    } catch (e) {
      toastError(describeProfileError(e));
    } finally {
      setSaving(false);
    }
  };

  const onFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toastError("Formats acceptés : PNG, JPG, WebP ou GIF.");
    if (file.size > 8 * 1024 * 1024) return toastError("Image trop lourde (8 Mo maximum).");
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onCropped = async (dataUrl: string) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const url = await uploadAvatarImage(dataUrl);
      setChoice({ url, name: "Photo importée", series: "Votre image", id: "" });
    } catch (e) {
      toastError(e instanceof Error && e.message ? e.message : "Import impossible pour le moment.");
    } finally {
      setUploading(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "all", label: "Tout" },
    { id: "favorites", label: "Favoris", count: favorites.length },
    { id: "recent", label: "Récents", count: recent.length },
    ...AVATAR_COLLECTIONS.map((c) => ({ id: c.id, label: c.label, count: c.items.length })),
  ];

  const changed = Boolean(choice && choice.url !== current);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/55 backdrop-blur-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <div className="pointer-events-none fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center sm:p-6">
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bibliothèque d'avatars"
          className="pointer-events-auto flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[var(--panel-border)] bg-[var(--bg-surface)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:h-[min(88vh,840px)] sm:max-w-5xl sm:rounded-[var(--panel-radius)]"
          initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 14, filter: "blur(8px)" }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 10, filter: "blur(6px)", transition: { duration: 0.16 } }}
          transition={SPRING_PANEL}
        >
          {/* En-tête : aperçu du choix */}
          <div className="flex items-center gap-4 border-b border-[var(--panel-border)] px-5 py-4 sm:px-6">
            <motion.div key={choice?.url || "none"} initial={{ scale: 0.86, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_PILL}>
              <ProfileAvatar src={choice?.url} initials={identity.initials} frameId={profile.frameId} size={64} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tracking-tight text-[var(--text-primary)]">{choice?.name || "Aucun avatar"}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{choice?.series || (changed ? "" : "Avatar actuel")}</p>
            </div>
            <button
              type="button"
              onClick={pickRandom}
              className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 text-sm font-medium text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.97] sm:inline-flex"
            >
              <Shuffle className="h-4 w-4" /> Au hasard
            </button>
            <button
              type="button"
              disabled={!changed || saving}
              onClick={() => void confirm()}
              className="relative inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition-[filter,transform,opacity] duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Utiliser
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="grid h-10 w-10 place-items-center rounded-xl text-[var(--text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] active:scale-[0.94]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Recherche, import, collections */}
          <div className="space-y-3 border-b border-[var(--panel-border)] px-5 py-3 sm:px-6">
            <div className="flex gap-2">
              <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] px-3.5 focus-within:border-[var(--accent-primary)]/60">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un personnage ou une série (Gojo, Jinx, Stranger Things…)"
                  className="h-full w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? undefined)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--panel-border)] px-3.5 text-sm font-medium text-[var(--text-primary)] transition-[background-color,transform] duration-150 hover:bg-[var(--surface-raised)] active:scale-[0.97] disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="hidden sm:inline">Importer une photo</span>
              </button>
            </div>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 no-scrollbar" role="tablist" aria-label="Collections">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setTab(t.id);
                      setSeries("");
                    }}
                    className={cn(
                      "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
                      active ? "text-[var(--accent-contrast)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {active && <motion.span layoutId="avatar-tab-pill" transition={SPRING_PILL} className="absolute inset-0 rounded-full bg-[var(--accent-primary)]" />}
                    <span className="relative">
                      {t.label}
                      {t.count ? <span className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "opacity-60")}>{t.count}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {seriesList.length > 1 && (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
                {["", ...seriesList].map((s) => (
                  <button
                    key={s || "all"}
                    type="button"
                    onClick={() => setSeries(s)}
                    className={cn(
                      "shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-colors duration-150",
                      series === s
                        ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/12 text-[var(--text-primary)]"
                        : "border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {s || "Toutes les séries"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grille */}
          <div className="min-h-0 flex-1 overflow-y-auto os-scroll px-5 py-4 [overscroll-behavior:contain] sm:px-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${tab}|${series}|${grouped ? "" : query.trim()}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_SNAP }}
              >
                {grouped ? (
                  <div className="space-y-7">
                    {AVATAR_COLLECTIONS.map((c) => (
                      <section key={c.id} style={{ contentVisibility: "auto", containIntrinsicSize: "0 260px" }}>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                            {c.label} <span className="ml-1 text-xs font-normal tabular-nums text-[var(--text-muted)]">{c.items.length}</span>
                          </h3>
                          <button type="button" onClick={() => setTab(c.id)} className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
                            Tout voir
                          </button>
                        </div>
                        <Grid items={previewOf(c.items, PREVIEW_PER_SECTION)} choice={choice} favorites={favorites} onPick={(a) => setChoice({ ...a })} onFavorite={toggleFavorite} />
                      </section>
                    ))}
                  </div>
                ) : results.length ? (
                  <Grid items={results} choice={choice} favorites={favorites} onPick={(a) => setChoice({ ...a })} onFavorite={toggleFavorite} />
                ) : (
                  <p className="py-16 text-center text-sm text-[var(--text-muted)]">
                    {tab === "favorites" && !query
                      ? "Aucun favori pour l'instant : touchez le cœur d'un avatar pour le retrouver ici."
                      : tab === "recent" && !query
                        ? "Les avatars que vous utilisez apparaîtront ici."
                        : "Aucun avatar ne correspond à cette recherche."}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--panel-border)] px-5 py-2.5 text-[11px] text-[var(--text-muted)] sm:px-6">
            <span className="tabular-nums">{AVATAR_COUNT} avatars</span>
            <span className="truncate">Personnages et logos © leurs ayants droit respectifs</span>
          </div>
        </motion.div>
      </div>

      <AvatarCropperModal imageSrc={cropSrc ?? ""} isOpen={Boolean(cropSrc)} onClose={() => setCropSrc(null)} onCropComplete={(url: string) => void onCropped(url)} />
    </>
  );
}

function Grid({
  items,
  choice,
  favorites,
  onPick,
  onFavorite,
}: {
  items: LibraryAvatar[];
  choice: Choice | null;
  favorites: string[];
  onPick: (a: LibraryAvatar) => void;
  onFavorite: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-3 gap-y-4">
      {items.map((a, i) => {
        const selected = choice?.url === a.url;
        const fav = favorites.includes(a.id);
        return (
          <div key={a.id} className="avatar-tile-in group relative" style={{ animationDelay: `${Math.min(i, 24) * 14}ms` }}>
            <button
              type="button"
              onClick={() => onPick(a)}
              aria-pressed={selected}
              aria-label={`${a.name} — ${a.series}`}
              className="relative block w-full rounded-2xl outline-none transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <span className="block aspect-square overflow-hidden rounded-2xl bg-[var(--surface-raised)] ring-1 ring-[var(--panel-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full select-none object-cover" />
              </span>
              {selected && (
                <motion.span
                  layoutId="avatar-selected-ring"
                  transition={SPRING_PILL}
                  className="pointer-events-none absolute -inset-[3px] rounded-[18px] ring-[2.5px] ring-[var(--accent-primary)]"
                >
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow">
                    <Check className="h-3 w-3" />
                  </span>
                </motion.span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onFavorite(a.id)}
              aria-label={fav ? `Retirer ${a.name} des favoris` : `Ajouter ${a.name} aux favoris`}
              aria-pressed={fav}
              className={cn(
                "absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[opacity,transform] duration-150 active:scale-90",
                fav ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", fav && "fill-current text-rose-400")} />
            </button>
            <p className="mt-1.5 truncate text-center text-[11px] leading-tight text-[var(--text-primary)]/85" title={a.name}>
              {a.name}
            </p>
          </div>
        );
      })}
    </div>
  );
}
