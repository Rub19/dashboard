"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Download,
  Check,
  Sparkles,
  Upload,
  Link2,
  Tv,
  Gamepad2,
  Flame,
  User,
  Film,
} from "lucide-react";
import ClientImage from "@/components/ClientImage";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";

export type AvatarCategory = "all" | "netflix" | "crunchyroll" | "gaming";

export type AvatarItem = {
  id: string;
  name: string;
  category: "netflix" | "crunchyroll" | "gaming";
  source: string;
  badgeColor: string;
  url: string;
  tags: string[];
};

export const PRESET_AVATARS: AvatarItem[] = [
  // ==========================================
  // --- NETFLIX PROFILES OFFICIELS ---
  // ==========================================
  {
    id: "netflix-classic-red",
    name: "Smiley Rouge (Profil Classique)",
    category: "netflix",
    source: "Netflix Profil Officiel",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "/avatars/netflix-classic-red.svg",
    tags: ["netflix", "classic", "smiley", "red", "avatar", "rouge"],
  },
  {
    id: "netflix-classic-blue",
    name: "Smiley Bleu (Profil Classique)",
    category: "netflix",
    source: "Netflix Profil Officiel",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    url: "/avatars/netflix-classic-blue.svg",
    tags: ["netflix", "classic", "smiley", "blue", "avatar", "bleu"],
  },
  {
    id: "netflix-classic-yellow",
    name: "Smiley Jaune (Profil Classique)",
    category: "netflix",
    source: "Netflix Profil Officiel",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    url: "/avatars/netflix-classic-yellow.svg",
    tags: ["netflix", "classic", "smiley", "yellow", "avatar", "jaune"],
  },
  {
    id: "netflix-classic-green",
    name: "Smiley Vert (Profil Classique)",
    category: "netflix",
    source: "Netflix Profil Officiel",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "/avatars/netflix-classic-green.svg",
    tags: ["netflix", "classic", "smiley", "green", "avatar", "vert"],
  },
  {
    id: "netflix-squid-guard-circle",
    name: "Gardien Cercle (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "/avatars/netflix-squid-guard-circle.svg",
    tags: ["squid game", "cercle", "pink soldier", "korea", "serie", "masque"],
  },
  {
    id: "netflix-squid-guard-triangle",
    name: "Gardien Triangle (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "/avatars/netflix-squid-guard-triangle.svg",
    tags: ["squid game", "triangle", "soldat", "korea", "serie"],
  },
  {
    id: "netflix-squid-guard-square",
    name: "Superviseur Carré (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "/avatars/netflix-squid-guard-square.svg",
    tags: ["squid game", "carre", "superviseur", "korea", "serie"],
  },
  {
    id: "netflix-frontman",
    name: "Front Man (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    url: "/avatars/netflix-frontman.svg",
    tags: ["squid game", "front man", "boss", "masque noir", "leader"],
  },
  {
    id: "netflix-arcane-jinx",
    name: "Jinx (Arcane Netflix)",
    category: "netflix",
    source: "Netflix / Riot Games",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "/avatars/netflix-arcane-jinx.svg",
    tags: ["arcane", "jinx", "lol", "netflix", "piltover", "zaun", "tresses"],
  },
  {
    id: "netflix-arcane-vi",
    name: "Vi (Arcane Netflix)",
    category: "netflix",
    source: "Netflix / Riot Games",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    url: "/avatars/netflix-arcane-vi.svg",
    tags: ["arcane", "vi", "netflix", "riot", "brawler", "tatouage"],
  },
  {
    id: "netflix-witcher",
    name: "Médaillon Loup (The Witcher)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    url: "/avatars/netflix-witcher.svg",
    tags: ["witcher", "geralt", "loup blanc", "sorceleur", "medallion"],
  },
  {
    id: "netflix-stranger-demogorgon",
    name: "Démogorgon (Stranger Things)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "/avatars/netflix-stranger-demogorgon.svg",
    tags: ["stranger things", "demogorgon", "upside down", "monstre", "80s"],
  },
  {
    id: "netflix-dali-mask",
    name: "Masque de Dalí (La Casa de Papel)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "/avatars/netflix-dali-mask.svg",
    tags: ["casa de papel", "dali", "professeur", "masque", "braquage", "money heist"],
  },
  {
    id: "netflix-wednesday",
    name: "Mercredi Addams (Wednesday)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    url: "/avatars/netflix-wednesday.svg",
    tags: ["wednesday", "addams", "nevermore", "gothic", "mercredi"],
  },

  // ==========================================
  // --- CRUNCHYROLL & ANIME MAJEURS ---
  // ==========================================
  {
    id: "anime-gojo",
    name: "Satoru Gojo (Jujutsu Kaisen)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "/avatars/crunchyroll-gojo.svg",
    tags: ["gojo", "jujutsu kaisen", "jjk", "infinité", "six eyes", "bandeau"],
  },
  {
    id: "anime-sukuna",
    name: "Ryomen Sukuna (JJK)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "/avatars/crunchyroll-sukuna.svg",
    tags: ["sukuna", "jjk", "roi des fléaux", "jujutsu kaisen", "demon", "tatouages"],
  },
  {
    id: "anime-jinwoo",
    name: "Sung Jin-Woo (Solo Leveling)",
    category: "crunchyroll",
    source: "Crunchyroll / A-1",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "/avatars/crunchyroll-jinwoo.svg",
    tags: ["solo leveling", "jinwoo", "shadow monarch", "monarque", "arise", "yeux violets"],
  },
  {
    id: "anime-tanjiro",
    name: "Tanjiro Kamado (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "/avatars/crunchyroll-tanjiro.svg",
    tags: ["demon slayer", "kimetsu", "tanjiro", "hanafuda", "eau", "flammes"],
  },
  {
    id: "anime-nezuko",
    name: "Nezuko Kamado (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "/avatars/crunchyroll-nezuko.svg",
    tags: ["demon slayer", "nezuko", "bambou", "kimetsu", "demon"],
  },
  {
    id: "anime-denji",
    name: "Chainsaw Man (Denji)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    url: "/avatars/crunchyroll-denji.svg",
    tags: ["chainsaw man", "denji", "pochita", "tronconneuse", "devil"],
  },
  {
    id: "anime-gear5",
    name: "Luffy Gear 5 Nika (One Piece)",
    category: "crunchyroll",
    source: "Crunchyroll / Toei",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    url: "/avatars/crunchyroll-luffy-gear5.svg",
    tags: ["luffy", "gear 5", "nika", "sun god", "one piece", "dieu du soleil"],
  },
  {
    id: "anime-zoro",
    name: "Roronoa Zoro (One Piece)",
    category: "crunchyroll",
    source: "Crunchyroll / Toei",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "/avatars/crunchyroll-zoro.svg",
    tags: ["zoro", "one piece", "katana", "roi des enfers", "santoryu", "bandana"],
  },
  {
    id: "anime-kakashi",
    name: "Kakashi Hatake (Naruto)",
    category: "crunchyroll",
    source: "Crunchyroll / Pierrot",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    url: "/avatars/crunchyroll-kakashi.svg",
    tags: ["naruto", "kakashi", "sharingan", "ninja", "hokage", "masque"],
  },

  // ==========================================
  // --- GAMING & RIOT & STEAM OFFICIELS ---
  // ==========================================
  {
    id: "game-jett",
    name: "Jett (Valorant Officiel)",
    category: "gaming",
    source: "Riot Games Officiel",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "/avatars/riot-val-jett.png",
    tags: ["valorant", "jett", "duelist", "vent", "riot", "fps"],
  },
  {
    id: "game-omen",
    name: "Omen (Valorant Officiel)",
    category: "gaming",
    source: "Riot Games Officiel",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "/avatars/riot-val-omen.png",
    tags: ["valorant", "omen", "ombre", "smoke", "dark", "riot"],
  },
  {
    id: "game-yasuo",
    name: "Yasuo (League of Legends)",
    category: "gaming",
    source: "Riot Games Officiel",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    url: "/avatars/riot-lol-yasuo.png",
    tags: ["lol", "yasuo", "hasagi", "tempete", "league of legends"],
  },
  {
    id: "game-ahri",
    name: "Ahri (League of Legends)",
    category: "gaming",
    source: "Riot Games Officiel",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "/avatars/riot-lol-ahri.png",
    tags: ["ahri", "lol", "renard", "spirit", "riot", "league of legends"],
  },
  {
    id: "game-jinx-lol",
    name: "Jinx (League of Legends)",
    category: "gaming",
    source: "Riot Games Officiel",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    url: "/avatars/riot-lol-jinx.png",
    tags: ["lol", "jinx", "pow-pow", "league of legends", "riot"],
  },
  {
    id: "game-cyberpunk-samurai",
    name: "Samurai Oni (Cyberpunk 2077)",
    category: "gaming",
    source: "CD Projekt Red",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    url: "/avatars/gaming-cyberpunk-samurai.svg",
    tags: ["cyberpunk 2077", "samurai", "oni", "johnny silverhand", "demon"],
  },
  {
    id: "game-discord-clyde",
    name: "Clyde Blurple (Discord)",
    category: "gaming",
    source: "Discord Officiel",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "/avatars/gaming-discord-blurple.svg",
    tags: ["discord", "clyde", "blurple", "bot", "chat"],
  },
  {
    id: "game-steam-crank",
    name: "Piston Valve (Steam)",
    category: "gaming",
    source: "Valve Steam Officiel",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    url: "/avatars/gaming-steam-retro.svg",
    tags: ["steam", "valve", "piston", "gaming", "pc"],
  },
];

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Sparkles },
  { id: "netflix", label: "Netflix", icon: Film },
  { id: "crunchyroll", label: "Crunchyroll & Anime", icon: Flame },
  { id: "gaming", label: "Gaming & Riot", icon: Gamepad2 },
] as const;

export default function AvatarPickerModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
}) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { save } = useProfile();
  const { avatarUrl, displayName } = useUserIdentity();

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredAvatar, setHoveredAvatar] = useState<AvatarItem | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>(avatarUrl || "");
  const [customUrl, setCustomUrl] = useState("");
  const [applying, setApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active or hovered preview url
  const previewUrl = hoveredAvatar?.url || selectedUrl || avatarUrl || PRESET_AVATARS[0].url;
  const previewName = hoveredAvatar?.name || (selectedUrl === avatarUrl ? displayName : "Avatar sélectionné");

  const filteredAvatars = useMemo(() => {
    return PRESET_AVATARS.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  function handleDownload(e: React.MouseEvent, avatar: AvatarItem) {
    e.stopPropagation();
    try {
      const a = document.createElement("a");
      a.href = avatar.url;
      a.download = `ethone-avatar-${avatar.id}.svg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      success(i18n("downloadStarted", `Téléchargement de ${avatar.name} démarré`));
    } catch {
      window.open(avatar.url, "_blank");
    }
  }

  async function handleApplyAvatar(urlToApply: string) {
    if (!urlToApply) return;
    setApplying(true);
    try {
      localStorage.setItem("ethone_custom_avatar", urlToApply);
      localStorage.setItem("ethone:custom:avatar", urlToApply);
      localStorage.setItem("ethone_user_avatar", urlToApply);
      await save({ avatar_url: urlToApply });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: urlToApply } }));
      }
      if (onSelect) onSelect(urlToApply);
      success(i18n("avatarUpdated", "Photo de profil mise à jour instantanément !"));
      onClose();
    } catch {
      localStorage.setItem("ethone_custom_avatar", urlToApply);
      localStorage.setItem("ethone:custom:avatar", urlToApply);
      localStorage.setItem("ethone_user_avatar", urlToApply);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: urlToApply } }));
      }
      if (onSelect) onSelect(urlToApply);
      success(i18n("avatarUpdated", "Photo de profil appliquée en local"));
      onClose();
    } finally {
      setApplying(false);
    }
  }

  function handleCustomUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = customUrl.trim();
    if (!url) return;
    setSelectedUrl(url);
    handleApplyAvatar(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        setSelectedUrl(result);
        handleApplyAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6 backdrop-blur-2xl bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-[90vh] max-h-[860px] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0d12]/95 shadow-[0_32px_96px_-12px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-white"
        >
          {/* Top Glow Decorator */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-[var(--accent-primary)]/15 blur-[120px]" />

          {/* =========================================
              HEADER : TITLE & LIVE PROFILE PREVIEW
             ========================================= */}
          <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4.5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              {/* Dynamic Live Profile Avatar Orb */}
              <div className="relative group flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl p-0.5 bg-gradient-to-br from-white/20 via-white/5 to-transparent border border-white/15 shadow-xl overflow-hidden">
                <ClientImage
                  src={previewUrl}
                  alt="Aperçu"
                  width={56}
                  height={56}
                  className="h-full w-full rounded-[14px] object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/20 pointer-events-none" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    Studio Avatars & Profil HD
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {PRESET_AVATARS.length} Avatars Officiels
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                  <span>Aperçu : <strong className="text-zinc-200">{previewName}</strong></span>
                  <span className="text-zinc-600">•</span>
                  <span>Cliquez pour appliquer instantanément</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400 border border-white/10 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* =========================================
              CATEGORY PILLS & SEARCH BAR
             ========================================= */}
          <div className="flex flex-col gap-3 border-b border-white/5 px-6 py-3 bg-black/40 sm:flex-row sm:items-center sm:justify-between">
            {/* Category Pills without ugly scrollbars */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as AvatarCategory)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                      isActive
                        ? "bg-white text-black border-white shadow-lg shadow-white/10 font-bold"
                        : "bg-white/[0.04] border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/15"
                    )}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher personnage, série, jeu..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-8 text-xs text-white placeholder-zinc-500 outline-none focus:border-[var(--accent-primary)] focus:bg-white/[0.06] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* =========================================
              MAIN AVATAR GRID (LUXURY TILES)
             ========================================= */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredAvatars.map((item) => {
                const isSelected = selectedUrl === item.url || avatarUrl === item.url;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => setHoveredAvatar(item)}
                    onMouseLeave={() => setHoveredAvatar(null)}
                    onClick={() => {
                      setSelectedUrl(item.url);
                      handleApplyAvatar(item.url);
                    }}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border p-2.5 transition-all cursor-pointer",
                      isSelected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[0_0_24px_rgba(var(--accent-primary-rgb),0.25)] ring-2 ring-[var(--accent-primary)]/50"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.06] hover:shadow-xl hover:-translate-y-0.5"
                    )}
                  >
                    {/* Image Box */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-zinc-950 shadow-inner">
                      <ClientImage
                        src={item.url}
                        alt={item.name}
                        width={240}
                        height={240}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                      />

                      {/* Franchise Micro Badge */}
                      <div className="absolute top-2 left-2 pointer-events-none">
                        <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-md", item.badgeColor)}>
                          {item.category === "netflix" ? "Netflix" : item.category === "crunchyroll" ? "Anime" : item.category === "gaming" ? "Gaming" : item.category === "memoji" ? "3D" : "Cyber"}
                        </span>
                      </div>

                      {/* Download Quick Button */}
                      <button
                        onClick={(e) => handleDownload(e, item)}
                        title="Télécharger l'avatar HD"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-zinc-300 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black hover:scale-110 shadow-lg cursor-pointer z-10"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>

                      {/* Selected Glow Checkmark */}
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-lg ring-4 ring-white/20 animate-pulse">
                            <Check className="h-5 w-5 stroke-[3]" />
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay Button */}
                      {!isSelected && (
                        <div className="absolute inset-0 flex items-end justify-center p-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none">
                          <div className="w-full py-1.5 rounded-lg bg-white text-black text-[11px] font-bold text-center shadow-md">
                            Appliquer
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-2.5 px-1 flex flex-col">
                      <h4 className="truncate text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">
                        {item.name}
                      </h4>
                      <span className="truncate text-[10px] text-zinc-400 mt-0.5">
                        {item.source}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredAvatars.length === 0 && (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-3 text-zinc-400">
                  <Search className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-white">Aucun avatar trouvé pour &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Essayez avec un autre mot-clé ou collez directement l&apos;URL de votre image ci-dessous.
                </p>
              </div>
            )}
          </div>

          {/* =========================================
              FOOTER: CUSTOM URL & PC/MOBILE UPLOAD
             ========================================= */}
          <div className="border-t border-white/10 bg-black/60 p-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Custom Image URL Form */}
              <form onSubmit={handleCustomUrlSubmit} className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Coller l'URL d'une image (Netflix, Crunchyroll, Pinterest, Discord, Imgur...)"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[var(--accent-primary)] focus:bg-white/[0.08] transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="shrink-0 h-9.5 px-4 font-semibold cursor-pointer"
                  disabled={!customUrl.trim() || applying}
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  Appliquer l&apos;URL
                </Button>
              </form>

              {/* Upload Custom File */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9.5 px-4 font-semibold bg-white/5 border-white/10 hover:bg-white/10 text-white cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                >
                  Importer depuis l&apos;appareil
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
