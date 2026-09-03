"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Search,
  Dice5,
  Heart,
  Clock,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Film,
  Flame,
  Gamepad2,
  Crown,
  Palette,
  Upload,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import {
  useIdentity,
  MASTER_AVATAR_CATALOG,
  CatalogAvatar,
  PROFILE_FRAMES,
  PROFILE_BACKGROUNDS,
  PROFILE_BADGES,
} from "@/lib/identity";
import { cn } from "@/lib/utils";

export type AvatarCategoryTab =
  | "all"
  | "favorites"
  | "recent"
  | "netflix"
  | "crunchyroll"
  | "gaming"
  | "ethone_originals"
  | "cosmetics";

const TABS: { id: AvatarCategoryTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "Tous les Avatars", icon: Layers },
  { id: "favorites", label: "Mes Favoris", icon: Heart },
  { id: "recent", label: "Récents", icon: Clock },
  { id: "netflix", label: "Netflix Originals", icon: Film },
  { id: "crunchyroll", label: "Crunchyroll & Anime", icon: Flame },
  { id: "gaming", label: "Gaming & Riot", icon: Gamepad2 },
  { id: "ethone_originals", label: "ETHONE Originals", icon: Crown },
  { id: "cosmetics", label: "Cadres & Cosmétiques", icon: Palette },
];

export default function AvatarPickerModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
}) {
  const { success, error: showError } = useToast();
  const { save } = useIdentity();
  const { avatarUrl, displayName } = useUserIdentity();

  const [activeTab, setActiveTab] = useState<AvatarCategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(avatarUrl || MASTER_AVATAR_CATALOG[0]?.asset_url || "");
  const [selectedFrameId, setSelectedFrameId] = useState<string>("none");
  const [selectedBgId, setSelectedBgId] = useState<string>("dark-solid");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("verified");

  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ethone_avatar_favorites");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return ["cr-jjk-gojo", "nflx-arcane-jinx", "val-jett", "ethone-core-teal"];
  });

  const [recents, setRecents] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ethone_avatar_recent");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [applying, setApplying] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (avatarUrl) setSelectedAvatarUrl(avatarUrl);
      if (typeof window !== "undefined") {
        try {
          const savedFrame = localStorage.getItem("ethone_user_frame");
          const savedBg = localStorage.getItem("ethone_user_bg");
          const savedBadge = localStorage.getItem("ethone_user_badge");
          if (savedFrame) setSelectedFrameId(savedFrame);
          if (savedBg) setSelectedBgId(savedBg);
          if (savedBadge) setSelectedBadgeId(savedBadge);
        } catch {}
      }
    }
  }, [isOpen, avatarUrl]);

  const currentAvatarMeta = useMemo(() => {
    return MASTER_AVATAR_CATALOG.find((a) => a.asset_url === selectedAvatarUrl || a.id === selectedAvatarUrl) || null;
  }, [selectedAvatarUrl]);

  const currentFrame = useMemo(() => {
    return PROFILE_FRAMES.find((f) => f.id === selectedFrameId) || PROFILE_FRAMES[0];
  }, [selectedFrameId]);

  const currentBadge = useMemo(() => {
    return PROFILE_BADGES.find((b) => b.id === selectedBadgeId) || PROFILE_BADGES[0];
  }, [selectedBadgeId]);

  const toggleFavorite = (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(avatarId) ? prev.filter((id) => id !== avatarId) : [...prev, avatarId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ethone_avatar_favorites", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const recordRecent = (avatarId: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((id) => id !== avatarId);
      const next = [avatarId, ...filtered].slice(0, 24);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ethone_avatar_recent", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const groupedSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let items = MASTER_AVATAR_CATALOG;

    if (activeTab === "favorites") {
      items = items.filter((a) => favorites.includes(a.id));
    } else if (activeTab === "recent") {
      items = items.filter((a) => recents.includes(a.id));
    } else if (activeTab === "netflix") {
      items = items.filter((a) => a.collection === "netflix");
    } else if (activeTab === "crunchyroll") {
      items = items.filter((a) => a.collection === "crunchyroll" || a.collection === "anime");
    } else if (activeTab === "gaming") {
      items = items.filter((a) => a.collection === "gaming");
    } else if (activeTab === "ethone_originals") {
      items = items.filter((a) => a.collection === "ethone_originals");
    }

    if (q) {
      items = items.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.character_name.toLowerCase().includes(q) ||
          a.franchise.toLowerCase().includes(q) ||
          a.provider.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const groups = new Map<string, CatalogAvatar[]>();
    items.forEach((a) => {
      const list = groups.get(a.franchise) || [];
      list.push(a);
      groups.set(a.franchise, list);
    });

    return Array.from(groups.entries()).map(([franchise, avatars]) => ({
      franchise,
      provider: avatars[0]?.provider || "Official",
      avatars,
      count: avatars.length,
    }));
  }, [activeTab, searchQuery, favorites, recents]);

  const handleRandomPick = () => {
    const pool = MASTER_AVATAR_CATALOG;
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    if (random) {
      setSelectedAvatarUrl(random.asset_url);
      recordRecent(random.id);
      success("Avatar sélectionné : " + random.name + " (" + random.franchise + ")");
    }
  };

  const handleApply = async () => {
    if (!selectedAvatarUrl) return;
    setApplying(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("ethone_custom_avatar", selectedAvatarUrl);
        localStorage.setItem("ethone:custom:avatar", selectedAvatarUrl);
        localStorage.setItem("ethone_user_avatar", selectedAvatarUrl);
        localStorage.setItem("ethone_user_frame", selectedFrameId);
        localStorage.setItem("ethone_user_bg", selectedBgId);
        localStorage.setItem("ethone_user_badge", selectedBadgeId);
      }

      await save({ avatar_url: selectedAvatarUrl });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ethone:identity:update", {
            detail: {
              avatar_url: selectedAvatarUrl,
              frame_id: selectedFrameId,
              bg_id: selectedBgId,
              badge_id: selectedBadgeId,
            },
          })
        );
      }

      if (onSelect) onSelect(selectedAvatarUrl);
      success("Photo de profil mise à jour instantanément !");
      onClose();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.setItem("ethone_custom_avatar", selectedAvatarUrl);
        localStorage.setItem("ethone:custom:avatar", selectedAvatarUrl);
        localStorage.setItem("ethone_user_avatar", selectedAvatarUrl);
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: selectedAvatarUrl } }));
      }
      if (onSelect) onSelect(selectedAvatarUrl);
      success("Photo de profil appliquée");
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showError("L'image ne doit pas dépasser 8 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setSelectedAvatarUrl(result);
        success("Image importée avec succès ! Cliquez sur Valider pour appliquer.");
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative flex h-[92vh] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#0b0c10] shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* TOP PREVIEW & CONTROLS HEADER */}
        <div className="relative border-b border-[var(--panel-border)]/60 bg-gradient-to-b from-[#14161f] to-[#0d0e14] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Live Profile Card Preview */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={cn(
                    "relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full bg-zinc-900 shadow-xl transition-all duration-300",
                    currentFrame.cssClass
                  )}
                >
                  <img
                    src={selectedAvatarUrl}
                    alt="Selected avatar"
                    className="h-full w-full object-cover object-top"
                    loading="eager"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {displayName || "Personnel"}
                  </h3>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", currentBadge.bg)}>
                    {currentBadge.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentAvatarMeta
                    ? currentAvatarMeta.name + " — " + currentAvatarMeta.franchise
                    : "Avatar personnalisé"}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    {currentAvatarMeta?.verification_status === "official"
                      ? "Asset Officiel Vérifié"
                      : "Vérifié Haute Qualité"}
                  </span>
                  <span>•</span>
                  <span>{currentAvatarMeta?.provider || "ETHONE Library"}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleRandomPick}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700/70 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-700 hover:border-zinc-500"
                title="Choisir un avatar aléatoire"
              >
                <Dice5 className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline">Aléatoire</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {applying ? "Application..." : "Valider l'avatar"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search & Category Chips */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un personnage, une série, un anime (ex: Gojo, Stranger Things, Jinx, One Piece)..."
                className="w-full rounded-xl border border-zinc-800 bg-black/60 pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  Effacer
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCustomInput((v) => !v)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-700"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importer image / URL</span>
            </button>
          </div>

          {/* Custom URL / Upload Panel */}
          {showCustomInput && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Coller une URL d'image directe (HTTPS)..."
                className="flex-1 min-w-[200px] rounded-lg border border-zinc-800 bg-black px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (customUrl.trim()) {
                    setSelectedAvatarUrl(customUrl.trim());
                    success("URL chargée !");
                  }
                }}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
              >
                Appliquer URL
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              >
                <Upload className="h-3 w-3" />
                Parcourir
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Navigation Category Tabs */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 shrink-0",
                    isActive
                      ? "bg-white text-black shadow-md font-bold scale-[1.02]"
                      : "border border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-black" : "text-zinc-400")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN BODY: HORIZONTAL ROWS OR COSMETICS VIEW */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {activeTab === "cosmetics" ? (
            /* COSMETICS SECTION: FRAMES, BACKGROUNDS, BADGES */
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* 1. Cadres d'avatar */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Cadres d'avatar (Avatar Frames)
                  </h4>
                  <span className="text-xs text-zinc-500">Indépendant de l'avatar</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PROFILE_FRAMES.map((frame) => {
                    const isSelected = selectedFrameId === frame.id;
                    return (
                      <button
                        key={frame.id}
                        type="button"
                        onClick={() => setSelectedFrameId(frame.id)}
                        className={cn(
                          "flex flex-col items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 shadow-lg"
                            : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 overflow-hidden",
                            frame.cssClass
                          )}
                        >
                          <img src={selectedAvatarUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-white">{frame.name}</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">{frame.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Arrière-plans de Profil */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-400" />
                    Arrière-plans de Profil (Backgrounds)
                  </h4>
                  <span className="text-xs text-zinc-500">Ambiance de carte</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PROFILE_BACKGROUNDS.map((bg) => {
                    const isSelected = selectedBgId === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBgId(bg.id)}
                        className={cn(
                          "relative h-20 rounded-xl border p-3 flex flex-col justify-end overflow-hidden transition-all bg-gradient-to-br",
                          bg.cssGradient,
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/50"
                            : "border-zinc-800 hover:border-zinc-600"
                        )}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-md">{bg.name}</span>
                        <span className="text-[10px] text-zinc-300/80 line-clamp-1 drop-shadow-sm">{bg.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Badges de Profil */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Badges de Profil
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PROFILE_BADGES.map((badge) => {
                    const isSelected = selectedBadgeId === badge.id;
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => setSelectedBadgeId(badge.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60"
                        )}
                      >
                        <span className={cn("rounded-lg px-2.5 py-1 text-xs font-bold border", badge.bg)}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-zinc-400">{badge.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* AVATAR HORIZONTAL COLLECTIONS (NETFLIX & CRUNCHYROLL STYLE) */
            <div className="space-y-6 animate-in fade-in duration-150">
              {groupedSections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-10 w-10 text-zinc-600 mb-3" />
                  <p className="text-sm font-semibold text-zinc-300">Aucun avatar ne correspond à votre recherche</p>
                  <p className="text-xs text-zinc-500 mt-1">Essayez un autre terme ou explorez toutes les catégories</p>
                </div>
              ) : (
                groupedSections.map((group) => (
                  <HorizontalAvatarRow
                    key={group.franchise}
                    franchise={group.franchise}
                    provider={group.provider}
                    avatars={group.avatars}
                    selectedUrl={selectedAvatarUrl}
                    favorites={favorites}
                    onSelectAvatar={(avatar) => {
                      setSelectedAvatarUrl(avatar.asset_url);
                      recordRecent(avatar.id);
                    }}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="flex items-center justify-between border-t border-[var(--panel-border)]/60 bg-[#0d0e14] px-4 sm:px-6 py-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-zinc-500" />
            <span>Bibliothèque Maître ETHONE — {MASTER_AVATAR_CATALOG.length} Avatars Authentiques</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-zinc-500">
              Format haute définition 512×512 • Rendu net en 32/40px
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal Carousel Row for Franchise Avatars
 */
function HorizontalAvatarRow({
  franchise,
  provider,
  avatars,
  selectedUrl,
  favorites,
  onSelectAvatar,
  onToggleFavorite,
}: {
  franchise: string;
  provider: string;
  avatars: CatalogAvatar[];
  selectedUrl: string;
  favorites: string[];
  onSelectAvatar: (avatar: CatalogAvatar) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -340 : 340;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-2.5 group/row">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h4 className="text-sm font-bold text-white tracking-wide">{franchise}</h4>
          <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            {avatars.length}
          </span>
          <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">• {provider}</span>
        </div>

        {/* Scroll Chevrons */}
        <div className="flex items-center gap-1 opacity-80 group-hover/row:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Défiler à gauche"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Défiler à droite"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal List */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory"
      >
        {avatars.map((avatar) => {
          const isSelected = selectedUrl === avatar.asset_url || selectedUrl === avatar.id;
          const isFav = favorites.includes(avatar.id);

          return (
            <div
              key={avatar.id}
              onClick={() => onSelectAvatar(avatar)}
              className={cn(
                "group/card relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 cursor-pointer transition-all duration-200 snap-start shrink-0 select-none",
                isSelected
                  ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.04]"
                  : "border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800/70 hover:border-zinc-600 hover:scale-[1.02]"
              )}
              style={{ width: "112px" }}
            >
              {/* Avatar Image */}
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-black/80 shadow-inner">
                <img
                  src={avatar.thumbnail_url || avatar.asset_url}
                  alt={avatar.name}
                  className="h-full w-full object-cover object-top transition-transform duration-200 group-hover/card:scale-105"
                  loading="lazy"
                />

                {/* Favorite Heart Toggle */}
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(avatar.id, e)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-zinc-400 hover:text-rose-500 transition-colors backdrop-blur-xs"
                  title="Ajouter aux favoris"
                >
                  <Heart className={cn("h-3 w-3", isFav ? "fill-rose-500 text-rose-500" : "")} />
                </button>

                {/* Selected Ring Marker */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-emerald-400 ring-inset pointer-events-none" />
                )}
              </div>

              {/* Name Caption */}
              <div className="w-full text-center px-0.5">
                <span className="block text-[11px] font-semibold text-zinc-200 truncate leading-tight group-hover/card:text-white">
                  {avatar.name}
                </span>
                <span className="block text-[9px] text-zinc-500 truncate leading-tight mt-0.5">
                  {avatar.verification_status === "official" ? "Officiel" : "Vérifié"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
