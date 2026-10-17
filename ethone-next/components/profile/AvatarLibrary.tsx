"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ImageOff, Loader2, Search, Upload, X } from "@/components/icons/ph";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarCropperModal from "@/components/profile/AvatarCropperModal";
import { useToast } from "@/components/ToastProvider";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useUserState } from "@/lib/hooks/useUserState";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { describeProfileError, saveAccountProfile, uploadAvatarImage, useAccountProfile } from "@/lib/profile/account-profile";
import { AVATAR_COLLECTIONS, avatarByUrl, matchesQuery, searchAvatars, seriesOf, type LibraryAvatar } from "@/lib/identity/avatar-library";
import { EASE_SNAP, SPRING_PANEL, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { tx } from "@/lib/tx";

type Choice = { url: string; name: string; series: string; id: string };

/**
 * Sélecteur d'avatars façon plateformes de streaming : une plateforme à la fois (boutons du haut), puis une section par
 * série avec sa rangée d'avatars ronds. Les séries viennent des sous-dossiers importés (scripts/build-avatar-library.mjs).
 * Sans `onSelect`, le choix est enregistré directement dans le profil du compte (synchronisé sur tous les appareils).
 */
export default function AvatarLibrary({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect?: (url: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{isOpen && <LibraryPanel onClose={onClose} onSelect={onSelect} />}</AnimatePresence>, document.body);
}

/** Libellés courts des boutons de plateforme sur téléphone. */
const SHORT_LABEL: Record<string, string> = { "prime-video": "Prime" };

const platformOf = (url: string) => AVATAR_COLLECTIONS.find((c) => c.items.some((a) => a.url === url))?.id;

function LibraryPanel({ onClose, onSelect }: { onClose: () => void; onSelect?: (url: string) => void }) {
  const { profile } = useAccountProfile();
  const identity = useUserIdentity();
  const { success, error: toastError } = useToast();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [lastPlatform, setLastPlatform] = useUserState<string>("avatarPlatform", "");

  const current = identity.avatarUrl || "";
  const [choice, setChoice] = useState<Choice | null>(() => {
    const a = avatarByUrl(current);
    return a ? { ...a } : current ? { url: current, name: tx("Photo actuelle"), series: "", id: "" } : null;
  });
  // Plateforme ouverte : celle de l'avatar actuel, sinon la dernière consultée, sinon la première.
  const [platform, setPlatform] = useState<string>(
    () => platformOf(current) || (AVATAR_COLLECTIONS.some((c) => c.id === lastPlatform) ? lastPlatform : AVATAR_COLLECTIONS[0]?.id || ""),
  );
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const collection = AVATAR_COLLECTIONS.find((c) => c.id === platform);
  const q = query.trim();

  // Séries de la plateforme ; avec une recherche, la série entière si son nom correspond, sinon ses avatars trouvés.
  const sections = useMemo(() => {
    if (!collection) return [];
    return seriesOf(collection)
      .map((name) => {
        const items = collection.items.filter((a) => a.series === name);
        if (!q) return { name, items };
        return { name, items: matchesQuery(name, q) ? items : searchAvatars(q, items) };
      })
      .filter((s) => s.items.length > 0);
  }, [collection, q]);

  // Résultats ailleurs, pour proposer de changer de plateforme quand la recherche ne trouve rien ici.
  const elsewhere = useMemo(
    () => (q ? AVATAR_COLLECTIONS.filter((c) => c.id !== platform).map((c) => ({ c, n: searchAvatars(q, c.items).length })).filter((x) => x.n > 0) : []),
    [q, platform],
  );

  const choosePlatform = (id: string) => {
    setPlatform(id);
    setLastPlatform(id);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const confirm = async () => {
    if (!choice || choice.url === current) return onClose();
    setSaving(true);
    try {
      if (onSelect) onSelect(choice.url);
      else await saveAccountProfile({ avatarUrl: choice.url, avatarId: choice.id });
      success(tx("Avatar mis à jour sur tous vos appareils."));
      onClose();
    } catch (e) {
      toastError(describeProfileError(e));
    } finally {
      setSaving(false);
    }
  };

  const onFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toastError(tx("Formats acceptés : PNG, JPG, WebP ou GIF."));
    if (file.size > 8 * 1024 * 1024) return toastError(tx("Image trop lourde (8 Mo maximum)."));
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onCropped = async (dataUrl: string) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const url = await uploadAvatarImage(dataUrl);
      setChoice({ url, name: tx("Photo importée"), series: tx("Votre image"), id: "" });
    } catch (e) {
      toastError(e instanceof Error && e.message ? e.message : tx("Import impossible pour le moment."));
    } finally {
      setUploading(false);
    }
  };

  const changed = Boolean(choice && choice.url !== current);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[var(--z-modal)] bg-black/70 backdrop-blur-[6px]"
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
          aria-label={tx("Choisir un avatar")}
          className="pointer-events-auto flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-white/[0.07] bg-[#0b0b0f] text-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] sm:h-[min(86vh,820px)] sm:max-w-4xl sm:rounded-[22px]"
          initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 14 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.16 } }}
          transition={SPRING_PANEL}
        >
          {/* En-tête : titre, avatar choisi, validation, fermeture */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pt-5">
            <motion.div key={choice?.url || "none"} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING_PILL} className="shrink-0">
              <ProfileAvatar src={choice?.url} initials={identity.initials} frameId={profile.frameId} size={isMobile ? 48 : 56} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">{tx("Choisir un avatar")}</h2>
              <p className="truncate text-xs text-white/55">{choice ? [choice.name, choice.series].filter(Boolean).join(" · ") : tx("Aucun avatar")}</p>
            </div>
            <button
              type="button"
              disabled={!changed || saving}
              onClick={() => void confirm()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black transition-[transform,opacity] duration-150 hover:bg-white/90 active:scale-[0.97] disabled:opacity-35"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {tx("Utiliser")}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={tx("Fermer")}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/60 transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-white active:scale-[0.94]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Plateformes */}
          <div className="px-4 sm:px-6" role="tablist" aria-label={tx("Plateformes")}>
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {AVATAR_COLLECTIONS.map((c) => {
                const active = c.id === platform;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => choosePlatform(c.id)}
                    className={cn(
                      "relative h-9 min-w-0 rounded-full px-0.5 text-[11px] font-semibold transition-colors duration-150 sm:h-10 sm:px-2 sm:text-[13px]",
                      active ? "text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white",
                    )}
                  >
                    {active && <motion.span layoutId="avatar-platform-pill" transition={SPRING_PILL} className="absolute inset-0 rounded-full bg-white" />}
                    <span className="relative block truncate tracking-tight sm:tracking-normal">
                      <span className="sm:hidden">{SHORT_LABEL[c.id] ?? c.label}</span>
                      <span className="hidden sm:inline">{c.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recherche et import */}
          <div className="flex gap-2 px-4 pb-3 pt-2.5 sm:px-6">
            <label className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-white/[0.06] px-4 focus-within:bg-white/[0.09] focus-within:ring-1 focus-within:ring-white/25">
              <Search className="h-4 w-4 shrink-0 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tx("Rechercher une série ou un personnage")}
                aria-label={tx("Rechercher une série ou un personnage")}
                className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label={tx("Effacer la recherche")} className="text-white/45 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? undefined)} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label={tx("Importer une photo")}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/[0.06] px-3.5 text-sm font-medium text-white/80 transition-[background-color,transform] duration-150 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="hidden sm:inline">{tx("Ma photo")}</span>
            </button>
          </div>

          {/* Séries de la plateforme */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.06] px-4 pb-6 pt-4 [overscroll-behavior:contain] sm:px-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${platform}|${q ? "q" : ""}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_SNAP }}
                className="space-y-6"
              >
                {!collection || collection.items.length === 0 ? (
                  <EmptyState text={tx("Aucun avatar pour cette plateforme pour l'instant.")} />
                ) : sections.length === 0 ? (
                  <EmptyState text={tx("Aucune série ni aucun personnage ne correspond à « {q} ».", { q })}>
                    {elsewhere.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {elsewhere.map(({ c, n }) => (
                          <button key={c.id} type="button" onClick={() => choosePlatform(c.id)} className="rounded-full bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/[0.14]">
                            {tx("{n} sur {platform}", { n, platform: c.label })}
                          </button>
                        ))}
                      </div>
                    )}
                  </EmptyState>
                ) : (
                  sections.map((s) => <SeriesRow key={s.name} title={s.name} items={s.items} choice={choice} onPick={(a) => setChoice({ ...a })} />)
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-white/40 sm:px-6">
            <span className="tabular-nums">{collection ? tx("{series} séries · {n} avatars", { series: seriesOf(collection).length, n: collection.items.length }) : ""}</span>
            <span className="hidden truncate sm:block">{tx("Personnages et logos © leurs ayants droit respectifs")}</span>
          </div>
        </motion.div>
      </div>

      <AvatarCropperModal imageSrc={cropSrc ?? ""} isOpen={Boolean(cropSrc)} onClose={() => setCropSrc(null)} onCropComplete={(url: string) => void onCropped(url)} />
    </>
  );
}

function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-white/55">{text}</p>
      {children}
    </div>
  );
}

/** Une série : son nom, puis ses avatars ronds sur une rangée (défilement horizontal, flèches quand ça déborde). */
function SeriesRow({ title, items, choice, onPick }: { title: string; items: LibraryAvatar[]; choice: Choice | null; onPick: (a: LibraryAvatar) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const update = () => setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items]);

  const page = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section style={{ contentVisibility: "auto", containIntrinsicSize: "0 150px" }}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="truncate text-[15px] font-semibold tracking-tight text-white">
          {title} <span className="ml-1 text-xs font-normal tabular-nums text-white/40">{items.length}</span>
        </h3>
        {(edges.left || edges.right) && (
          <div className="hidden shrink-0 gap-1 sm:flex">
            <ArrowButton label={tx("Avatars précédents")} disabled={!edges.left} onClick={() => page(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </ArrowButton>
            <ArrowButton label={tx("Avatars suivants")} disabled={!edges.right} onClick={() => page(1)}>
              <ChevronRight className="h-4 w-4" />
            </ArrowButton>
          </div>
        )}
      </div>
      <div ref={rowRef} className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-1 pt-1 no-scrollbar sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6">
        {items.map((a) => (
          <AvatarButton key={a.id} avatar={a} selected={choice?.url === a.url} onPick={() => onPick(a)} />
        ))}
      </div>
    </section>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.07] text-white/75 transition-[background-color,opacity] duration-150 hover:bg-white/[0.14] hover:text-white disabled:opacity-25"
    >
      {children}
    </button>
  );
}

/** Avatar rond : recadré sans déformation, fond animé pendant le chargement, icône si l'image manque. */
function AvatarButton({ avatar, selected, onPick }: { avatar: LibraryAvatar; selected: boolean; onPick: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${avatar.name} — ${avatar.series}`}
      title={avatar.name}
      className="group relative w-[76px] shrink-0 snap-start outline-none sm:w-[92px]"
    >
      <span
        className={cn(
          "relative block aspect-square overflow-hidden rounded-full bg-white/[0.06] transition-[transform,box-shadow] duration-150 group-hover:scale-[1.05] group-active:scale-[0.96] group-focus-visible:ring-2 group-focus-visible:ring-white/70",
          state === "loading" && "animate-pulse",
          selected ? "ring-[2.5px] ring-white ring-offset-2 ring-offset-[#0b0b0f]" : "ring-1 ring-white/[0.08]",
        )}
      >
        {state === "missing" ? (
          <span className="grid h-full w-full place-items-center text-white/35">
            <ImageOff className="h-6 w-6" />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setState("ready")}
            onError={() => setState("missing")}
            className={cn("h-full w-full select-none object-cover transition-opacity duration-200", state === "ready" ? "opacity-100" : "opacity-0")}
          />
        )}
      </span>
      {selected && (
        <span className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-white text-black shadow ring-2 ring-[#0b0b0f] sm:h-6 sm:w-6">
          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </span>
      )}
      <span className={cn("mt-1.5 block truncate text-center text-[11px] leading-tight", selected ? "text-white" : "text-white/55")}>{avatar.name}</span>
    </button>
  );
}

