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

export type AvatarCategory = "all" | "netflix" | "crunchyroll" | "gaming" | "cyber" | "memoji";

export type AvatarItem = {
  id: string;
  name: string;
  category: "netflix" | "crunchyroll" | "gaming" | "cyber" | "memoji";
  source: string;
  badgeColor: string;
  url: string;
  tags: string[];
};

export const PRESET_AVATARS: AvatarItem[] = [
  // ==========================================
  // --- NETFLIX ORIGINALS & POPULAR SERIES ---
  // ==========================================
  {
    id: "netflix-jinx",
    name: "Jinx (Arcane)",
    category: "netflix",
    source: "Netflix / Riot",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=85",
    tags: ["arcane", "jinx", "lol", "netflix", "piltover", "zaun"],
  },
  {
    id: "netflix-vi",
    name: "Vi (Arcane)",
    category: "netflix",
    source: "Netflix / Riot",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=85",
    tags: ["arcane", "vi", "netflix", "riot", "brawler"],
  },
  {
    id: "netflix-david",
    name: "David Martinez (Edgerunners)",
    category: "netflix",
    source: "Netflix / Trigger",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=85",
    tags: ["cyberpunk", "edgerunners", "david", "anime", "night city"],
  },
  {
    id: "netflix-lucy",
    name: "Lucy (Edgerunners)",
    category: "netflix",
    source: "Netflix / Trigger",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=85",
    tags: ["cyberpunk", "lucy", "edgerunners", "netrunner", "neon"],
  },
  {
    id: "netflix-squid-guard",
    name: "Gardien Masqué (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "https://images.unsplash.com/photo-1634896941598-b6b500a502a7?w=400&auto=format&fit=crop&q=85",
    tags: ["squid game", "cercle", "triangle", "korea", "serie"],
  },
  {
    id: "netflix-frontman",
    name: "Front Man (Squid Game)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=85",
    tags: ["squid game", "front man", "boss", "masque"],
  },
  {
    id: "netflix-witcher",
    name: "Geralt de Riv (The Witcher)",
    category: "netflix",
    source: "Netflix",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=85",
    tags: ["witcher", "geralt", "loup blanc", "sorceleur", "fantasy"],
  },
  {
    id: "netflix-luffy-la",
    name: "Luffy (One Piece Live Action)",
    category: "netflix",
    source: "Netflix Live Action",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=85",
    tags: ["one piece", "luffy", "chapeau de paille", "pirates"],
  },
  {
    id: "netflix-wednesday",
    name: "Mercredi Addams (Wednesday)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85",
    tags: ["wednesday", "addams", "nevermore", "gothic"],
  },
  {
    id: "netflix-hellfire",
    name: "Hellfire Club (Stranger Things)",
    category: "netflix",
    source: "Netflix Original",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=85",
    tags: ["stranger things", "hellfire", "eddie", "80s", "retro"],
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
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=85",
    tags: ["gojo", "jujutsu kaisen", "jjk", "infinité", "six eyes", "anime"],
  },
  {
    id: "anime-sukuna",
    name: "Ryomen Sukuna (JJK)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=85",
    tags: ["sukuna", "jjk", "roi des fléaux", "jujutsu kaisen", "demon"],
  },
  {
    id: "anime-jinwoo",
    name: "Sung Jin-Woo (Solo Leveling)",
    category: "crunchyroll",
    source: "Crunchyroll / A-1",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=85",
    tags: ["solo leveling", "jinwoo", "shadow monarch", "monarque", "arise"],
  },
  {
    id: "anime-tanjiro",
    name: "Tanjiro Kamado (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=85",
    tags: ["demon slayer", "kimetsu", "tanjiro", "souffle de l'eau", "sun"],
  },
  {
    id: "anime-nezuko",
    name: "Nezuko Kamado (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=85",
    tags: ["demon slayer", "nezuko", "bambou", "kimetsu"],
  },
  {
    id: "anime-rengoku",
    name: "Kyojuro Rengoku (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=85",
    tags: ["demon slayer", "rengoku", "flammes", "hashira", "mugens train"],
  },
  {
    id: "anime-levi",
    name: "Capitaine Levi (Attack on Titan)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=85",
    tags: ["levi", "snk", "aot", "ackerman", "bataillon d'exploration"],
  },
  {
    id: "anime-denji",
    name: "Chainsaw Man (Denji)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=85",
    tags: ["chainsaw man", "denji", "pochita", "tronconneuse", "devil"],
  },
  {
    id: "anime-zoro",
    name: "Roronoa Zoro (One Piece)",
    category: "crunchyroll",
    source: "Crunchyroll / Toei",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=85",
    tags: ["zoro", "one piece", "katana", "roi des enfers", "santoryu"],
  },
  {
    id: "anime-gear5",
    name: "Luffy Gear 5 Nika (One Piece)",
    category: "crunchyroll",
    source: "Crunchyroll / Toei",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=85",
    tags: ["luffy", "gear 5", "nika", "sun god", "one piece", "blanc"],
  },
  {
    id: "anime-kakashi",
    name: "Kakashi Hatake (Naruto)",
    category: "crunchyroll",
    source: "Crunchyroll / Pierrot",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    url: "https://images.unsplash.com/photo-1634896941598-b6b500a502a7?w=400&auto=format&fit=crop&q=85",
    tags: ["naruto", "kakashi", "sharingan", "ninja", "hokage"],
  },
  {
    id: "anime-goku-ui",
    name: "Goku Ultra Instinct (DBS)",
    category: "crunchyroll",
    source: "Toei Animation",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=85",
    tags: ["goku", "dragon ball", "ultra instinct", "dbz", "saiyan"],
  },

  // ==========================================
  // --- GAMING & RIOT & STEAM ---
  // ==========================================
  {
    id: "game-jett",
    name: "Jett (Valorant)",
    category: "gaming",
    source: "Riot Games",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=85",
    tags: ["valorant", "jett", "duelist", "vent", "riot", "fps"],
  },
  {
    id: "game-reyna",
    name: "Reyna (Valorant)",
    category: "gaming",
    source: "Riot Games",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=85",
    tags: ["valorant", "reyna", "empress", "violet", "riot"],
  },
  {
    id: "game-omen",
    name: "Omen (Valorant)",
    category: "gaming",
    source: "Riot Games",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=85",
    tags: ["valorant", "omen", "ombre", "smoke", "dark", "riot"],
  },
  {
    id: "game-yasuo",
    name: "Yasuo (League of Legends)",
    category: "gaming",
    source: "Riot Games",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=85",
    tags: ["lol", "yasuo", "hasagi", "tempete", "league of legends"],
  },
  {
    id: "game-ahri",
    name: "Ahri Spirit Blossom (LoL)",
    category: "gaming",
    source: "Riot Games",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=85",
    tags: ["ahri", "lol", "renard", "spirit blossom", "riot"],
  },
  {
    id: "game-silverhand",
    name: "Johnny Silverhand (Cyberpunk)",
    category: "gaming",
    source: "CD Projekt Red",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=85",
    tags: ["cyberpunk 2077", "johnny silverhand", "samurai", "keanu"],
  },
  {
    id: "game-ranni",
    name: "Ranni la Sorcière (Elden Ring)",
    category: "gaming",
    source: "FromSoftware",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=85",
    tags: ["elden ring", "ranni", "lune", "sorciere", "souls"],
  },

  // ==========================================
  // --- CYBER & NÉON & ETHONE OS ---
  // ==========================================
  {
    id: "cyber-synthwave",
    name: "Synthwave Sunset Rider",
    category: "cyber",
    source: "ETHONE Studio",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=85",
    tags: ["synthwave", "neon", "retro", "80s", "violet", "ethone"],
  },
  {
    id: "cyber-neural-core",
    name: "Quantum Neural Core AI",
    category: "cyber",
    source: "ETHONE Studio",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    url: "https://images.unsplash.com/photo-1634896941598-b6b500a502a7?w=400&auto=format&fit=crop&q=85",
    tags: ["ai", "brain", "neural", "quantum", "futuriste", "hologram"],
  },
  {
    id: "cyber-astronaut",
    name: "Cosmic Deep Space Astro",
    category: "cyber",
    source: "ETHONE Studio",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=85",
    tags: ["space", "cosmic", "galaxie", "astronaute", "etoiles"],
  },

  // ==========================================
  // --- 3D MEMOJI & GLASS AESTHETIC ---
  // ==========================================
  {
    id: "memoji-hoodie-purple",
    name: "Cyber Hoodie 3D (Violet)",
    category: "memoji",
    source: "ETHONE 3D",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=85",
    tags: ["3d", "memoji", "hoodie", "portrait", "avatar"],
  },
  {
    id: "memoji-dj-neon",
    name: "Music Beats 3D (Neon)",
    category: "memoji",
    source: "ETHONE 3D",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=85",
    tags: ["3d", "audio", "casque", "dj", "beats"],
  },
  {
    id: "memoji-glasses",
    name: "Holo Glasses 3D",
    category: "memoji",
    source: "ETHONE 3D",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=85",
    tags: ["3d", "lunettes", "stylish", "neon"],
  },
];

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Sparkles },
  { id: "netflix", label: "Netflix", icon: Film },
  { id: "crunchyroll", label: "Crunchyroll & Anime", icon: Flame },
  { id: "gaming", label: "Gaming & Riot", icon: Gamepad2 },
  { id: "cyber", label: "Cyber & Néon", icon: Tv },
  { id: "memoji", label: "3D Memoji", icon: User },
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
      a.download = `ethone-avatar-${avatar.id}.jpg`;
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
      localStorage.setItem("ethone_user_avatar", urlToApply);
      await save({ avatar_url: urlToApply });
      if (onSelect) onSelect(urlToApply);
      success(i18n("avatarUpdated", "Photo de profil mise à jour instantanément !"));
      onClose();
    } catch {
      localStorage.setItem("ethone_custom_avatar", urlToApply);
      localStorage.setItem("ethone_user_avatar", urlToApply);
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
                    {PRESET_AVATARS.length} Avatars
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
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
