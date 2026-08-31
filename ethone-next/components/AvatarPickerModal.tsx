"use client";

import { useState, useMemo } from "react";
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
  Camera,
} from "lucide-react";
import ClientImage from "@/components/ClientImage";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";

export type AvatarItem = {
  id: string;
  name: string;
  category: "netflix" | "crunchyroll" | "gaming" | "cyber" | "memoji";
  source: string;
  url: string;
  tags: string[];
};

export const PRESET_AVATARS: AvatarItem[] = [
  // --- NETFLIX CLASSICS ---
  {
    id: "netflix-jinx",
    name: "Jinx (Arcane)",
    category: "netflix",
    source: "Netflix / Riot",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80",
    tags: ["arcane", "jinx", "lol", "netflix"],
  },
  {
    id: "netflix-vi",
    name: "Vi (Arcane)",
    category: "netflix",
    source: "Netflix / Riot",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80",
    tags: ["arcane", "vi", "netflix", "riot"],
  },
  {
    id: "netflix-david",
    name: "David Martinez (Edgerunners)",
    category: "netflix",
    source: "Netflix / Trigger",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
    tags: ["cyberpunk", "edgerunners", "david", "anime"],
  },
  {
    id: "netflix-lucy",
    name: "Lucy (Edgerunners)",
    category: "netflix",
    source: "Netflix / Trigger",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
    tags: ["cyberpunk", "lucy", "edgerunners", "neon"],
  },
  {
    id: "netflix-squid-guard",
    name: "Gardien Cercle (Squid Game)",
    category: "netflix",
    source: "Netflix",
    url: "https://images.unsplash.com/photo-1634896941598-b6b500a502a7?w=300&auto=format&fit=crop&q=80",
    tags: ["squid game", "masque", "korea", "serie"],
  },
  {
    id: "netflix-witcher",
    name: "Loup Blanc (The Witcher)",
    category: "netflix",
    source: "Netflix",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    tags: ["witcher", "geralt", "fantasy", "wolf"],
  },
  {
    id: "netflix-luffy",
    name: "Luffy (One Piece Live Action)",
    category: "netflix",
    source: "Netflix",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80",
    tags: ["one piece", "luffy", "pirate", "chapeau de paille"],
  },
  {
    id: "netflix-stranger",
    name: "Hellfire Club (Stranger Things)",
    category: "netflix",
    source: "Netflix",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
    tags: ["stranger things", "80s", "retro", "eleven"],
  },

  // --- CRUNCHYROLL & ANIME ---
  {
    id: "anime-gojo",
    name: "Satoru Gojo (Jujutsu Kaisen)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80",
    tags: ["gojo", "jujutsu kaisen", "jjk", "anime"],
  },
  {
    id: "anime-sukuna",
    name: "Ryomen Sukuna (JJK)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80",
    tags: ["sukuna", "jjk", "demon", "jujutsu"],
  },
  {
    id: "anime-jinwoo",
    name: "Sung Jin-woo (Solo Leveling)",
    category: "crunchyroll",
    source: "Crunchyroll / A-1",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80",
    tags: ["solo leveling", "jinwoo", "shadow", "monarch"],
  },
  {
    id: "anime-tanjiro",
    name: "Tanjiro Kamado (Demon Slayer)",
    category: "crunchyroll",
    source: "Crunchyroll / ufotable",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80",
    tags: ["demon slayer", "kimetsu", "tanjiro", "epee"],
  },
  {
    id: "anime-levi",
    name: "Capitaine Levi (SnK / AoT)",
    category: "crunchyroll",
    source: "Crunchyroll / WIT",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    tags: ["levi", "attack on titan", "snk", "ackerman"],
  },
  {
    id: "anime-kakashi",
    name: "Kakashi Hatake (Naruto)",
    category: "crunchyroll",
    source: "Crunchyroll / Pierrot",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
    tags: ["naruto", "kakashi", "ninja", "sharingan"],
  },
  {
    id: "anime-denji",
    name: "Chainsaw Man (Denji)",
    category: "crunchyroll",
    source: "Crunchyroll / MAPPA",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
    tags: ["chainsaw man", "denji", "pochita", "devil"],
  },
  {
    id: "anime-zoro",
    name: "Roronoa Zoro (One Piece)",
    category: "crunchyroll",
    source: "Crunchyroll / Toei",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
    tags: ["zoro", "one piece", "katana", "samurai"],
  },

  // --- GAMING & STEAM & RIOT ---
  {
    id: "game-jett",
    name: "Jett (Valorant)",
    category: "gaming",
    source: "Riot Games",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
    tags: ["valorant", "jett", "fps", "riot"],
  },
  {
    id: "game-reyna",
    name: "Reyna (Valorant)",
    category: "gaming",
    source: "Riot Games",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80",
    tags: ["valorant", "reyna", "duelist", "riot"],
  },
  {
    id: "game-omen",
    name: "Omen (Valorant)",
    category: "gaming",
    source: "Riot Games",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80",
    tags: ["valorant", "omen", "smoke", "dark"],
  },
  {
    id: "game-yasuo",
    name: "Yasuo (League of Legends)",
    category: "gaming",
    source: "Riot Games",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
    tags: ["lol", "yasuo", "mid", "wind"],
  },
  {
    id: "game-cyberpunk-v",
    name: "V (Cyberpunk 2077)",
    category: "gaming",
    source: "CD Projekt Red",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
    tags: ["cyberpunk", "2077", "night city", "samurai"],
  },
  {
    id: "game-elden-tarnished",
    name: "Sans-Éclat (Elden Ring)",
    category: "gaming",
    source: "FromSoftware",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    tags: ["elden ring", "souls", "fromsoftware", "knight"],
  },

  // --- CYBER NEON & ETHONE OS ---
  {
    id: "cyber-synth",
    name: "Neon Synthwave Rider",
    category: "cyber",
    source: "ETHONE Studio",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
    tags: ["synthwave", "retrowave", "purple", "neon"],
  },
  {
    id: "cyber-ai-core",
    name: "Neural Core AI",
    category: "cyber",
    source: "ETHONE Studio",
    url: "https://images.unsplash.com/photo-1634896941598-b6b500a502a7?w=300&auto=format&fit=crop&q=80",
    tags: ["ai", "brain", "neon", "hologram"],
  },
  {
    id: "cyber-astro",
    name: "Cosmic Astronaut",
    category: "cyber",
    source: "ETHONE Studio",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80",
    tags: ["space", "cosmic", "galaxy", "astro"],
  },

  // --- 3D MEMOJI & GLASS ---
  {
    id: "memoji-hoodie-violet",
    name: "Cyber Hoodie (Violet)",
    category: "memoji",
    source: "ETHONE 3D",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80",
    tags: ["3d", "memoji", "hoodie", "cool"],
  },
  {
    id: "memoji-headphones-neon",
    name: "Music Beats (Neon)",
    category: "memoji",
    source: "ETHONE 3D",
    url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80",
    tags: ["audio", "casque", "3d", "dj"],
  },
  {
    id: "memoji-sunglasses",
    name: "Cyber Glasses",
    category: "memoji",
    source: "ETHONE 3D",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
    tags: ["lunettes", "stylish", "3d", "portrait"],
  },
];

type AvatarCategory = "all" | "netflix" | "crunchyroll" | "gaming" | "cyber" | "memoji";

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
  const { avatarUrl } = useUserIdentity();

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string>(avatarUrl || "");
  const [customUrl, setCustomUrl] = useState("");
  const [applying, setApplying] = useState(false);

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

  function handleDownload(avatar: AvatarItem) {
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
      success(i18n("avatarUpdated", "Photo de profil mise à jour avec succès !"));
      onClose();
    } catch {
      // Local fallback still applied
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
    if (file.size > 5 * 1024 * 1024) {
      showError("L'image ne doit pas dépasser 5 Mo");
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
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/70">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Galerie de Photos de Profil (Avatars HD)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Choisissez ou téléchargez des avatars Netflix, Crunchyroll, Gaming ou personnalisés
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search & Categories Bar */}
          <div className="flex flex-col gap-3 border-b border-[var(--panel-border)]/40 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between bg-white/[0.015]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "Tous", icon: Sparkles },
                { id: "netflix", label: "Netflix", icon: Film },
                { id: "crunchyroll", label: "Crunchyroll & Anime", icon: Flame },
                { id: "gaming", label: "Gaming & Riot", icon: Gamepad2 },
                { id: "cyber", label: "Cyber & Néon", icon: Tv },
                { id: "memoji", label: "3D Memoji", icon: User },
              ].map((cat) => {
                const IconComp = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as AvatarCategory)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                      isActive
                        ? "bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/20"
                        : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                    )}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher personnage, série..."
                className="w-full rounded-xl border border-[var(--panel-border)] bg-black/20 py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>

          {/* Grid of Avatars */}
          <div className="min-h-0 flex-1 overflow-y-auto os-scroll p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredAvatars.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-black/30 p-3 transition-all",
                      isSelected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/[0.08] shadow-lg shadow-[var(--accent-primary)]/10 ring-2 ring-[var(--accent-primary)]/40"
                        : "border-[var(--panel-border)]/60 hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-900 shadow-inner">
                      <ClientImage
                        src={item.url}
                        alt={item.name}
                        width={200}
                        height={200}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Quick Download Hover Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        title="Télécharger l'avatar"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 shadow-md cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {isSelected && (
                        <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-col">
                      <h4 className="truncate text-xs font-bold text-[var(--text-primary)]">{item.name}</h4>
                      <span className="truncate text-[10px] text-[var(--text-muted)]">{item.source}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isSelected ? "primary" : "secondary"}
                        className="w-full text-[11px] py-1 h-7 cursor-pointer"
                        onClick={() => {
                          setSelectedUrl(item.url);
                          handleApplyAvatar(item.url);
                        }}
                        isLoading={applying && selectedUrl === item.url}
                      >
                        {isSelected ? "Actif" : "Choisir"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0 cursor-pointer"
                        onClick={() => handleDownload(item)}
                        title="Télécharger"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAvatars.length === 0 && (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center p-6">
                <Search className="h-8 w-8 text-[var(--text-muted)] mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">Aucun avatar trouvé pour &quot;{searchQuery}&quot;</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Essayez une autre recherche ou utilisez une URL personnalisée ci-dessous.</p>
              </div>
            )}
          </div>

          {/* Footer: Custom URL & Upload */}
          <div className="border-t border-[var(--panel-border)]/60 bg-black/40 p-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Custom Image URL Form */}
              <form onSubmit={handleCustomUrlSubmit} className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Coller l'URL d'une image (Netflix, Crunchyroll, Pinterest, Discord...)"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-black/30 py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <Button type="submit" size="sm" variant="secondary" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                  Appliquer l&apos;URL
                </Button>
              </form>

              {/* Upload custom image button */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <div className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-white/10 transition-colors shadow-sm cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Importer depuis PC</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
