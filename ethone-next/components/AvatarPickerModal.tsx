"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  Sparkles,
  Upload,
  Link2,
  Shuffle,
  Flame,
  Film,
  Gamepad2,
  Layers,
} from "lucide-react";
import ClientImage from "@/components/ClientImage";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useProfile } from "@/lib/hooks/useProfile";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { cn } from "@/lib/utils";

export type AvatarCategory = "all" | "netflix" | "anime" | "gaming";

export type AvatarItem = {
  id: string;
  name: string;
  series: string;
  category: "netflix" | "anime" | "gaming";
  url: string;
  tags: string[];
};

export const PRESET_AVATARS: AvatarItem[] = [
  // ==========================================
  // --- ARCANE: LEAGUE OF LEGENDS (NETFLIX) ---
  // ==========================================
  {
    id: "arcane-jinx",
    name: "Jinx",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jinx.png",
    tags: ["jinx", "arcane", "league of legends", "lol", "piltover", "zaun", "netflix"],
  },
  {
    id: "arcane-vi",
    name: "Vi",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Vi.png",
    tags: ["vi", "arcane", "league of legends", "lol", "brawler", "netflix"],
  },
  {
    id: "arcane-caitlyn",
    name: "Caitlyn",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Caitlyn.png",
    tags: ["caitlyn", "arcane", "sheriff", "piltover", "netflix"],
  },
  {
    id: "arcane-ekko",
    name: "Ekko",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ekko.png",
    tags: ["ekko", "arcane", "firelight", "zaun", "netflix"],
  },
  {
    id: "arcane-viktor",
    name: "Viktor",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Viktor.png",
    tags: ["viktor", "arcane", "hexcore", "piltover", "netflix"],
  },
  {
    id: "arcane-jayce",
    name: "Jayce",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jayce.png",
    tags: ["jayce", "arcane", "hextech", "defender", "netflix"],
  },
  {
    id: "arcane-warwick",
    name: "Warwick / Vander",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Warwick.png",
    tags: ["warwick", "vander", "arcane", "hound", "netflix"],
  },
  {
    id: "arcane-heimerdinger",
    name: "Heimerdinger & Poro",
    series: "Arcane: League of Legends",
    category: "netflix",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Heimerdinger.png",
    tags: ["heimerdinger", "poro", "arcane", "yordle", "netflix"],
  },

  // ==========================================
  // --- WEDNESDAY (NETFLIX) ---
  // ==========================================
  {
    id: "wednesday-portrait",
    name: "Mercredi Addams",
    series: "Wednesday S1",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/432/1082139.jpg",
    tags: ["mercredi", "wednesday", "addams", "nevermore", "gothic", "netflix"],
  },
  {
    id: "wednesday-enid",
    name: "Enid Sinclair",
    series: "Wednesday S1",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/440/1100599.jpg",
    tags: ["enid", "sinclair", "wednesday", "loup-garou", "blonde", "netflix"],
  },
  {
    id: "wednesday-thing",
    name: "La Chose (Thing)",
    series: "Wednesday S1",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/432/1082158.jpg",
    tags: ["la chose", "thing", "main", "addams", "wednesday", "netflix"],
  },
  {
    id: "wednesday-morticia",
    name: "Morticia Addams",
    series: "Wednesday S1",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/420/1051332.jpg",
    tags: ["morticia", "addams", "gothic", "wednesday", "netflix"],
  },
  {
    id: "wednesday-bianca",
    name: "Bianca Barclay",
    series: "Wednesday S1",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/432/1080021.jpg",
    tags: ["bianca", "sirene", "nevermore", "wednesday", "netflix"],
  },
  {
    id: "wednesday-s2-enid",
    name: "Enid (Saison 2)",
    series: "Wednesday S2",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/440/1100599.jpg",
    tags: ["enid", "wednesday s2", "smile", "netflix"],
  },
  {
    id: "wednesday-s2-gomez",
    name: "Gomez Addams",
    series: "Wednesday S2",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/431/1079637.jpg",
    tags: ["gomez", "addams", "moustache", "wednesday", "netflix"],
  },

  // ==========================================
  // --- SQUID GAME (NETFLIX) ---
  // ==========================================
  {
    id: "squid-guard-circle",
    name: "Gardien Cercle",
    series: "Squid Game",
    category: "netflix",
    url: "/avatars/netflix-squid-guard-circle.svg",
    tags: ["squid game", "cercle", "pink soldier", "masque", "korea", "netflix"],
  },
  {
    id: "squid-guard-triangle",
    name: "Gardien Triangle",
    series: "Squid Game",
    category: "netflix",
    url: "/avatars/netflix-squid-guard-triangle.svg",
    tags: ["squid game", "triangle", "soldat", "korea", "netflix"],
  },
  {
    id: "squid-guard-square",
    name: "Superviseur Carré",
    series: "Squid Game",
    category: "netflix",
    url: "/avatars/netflix-squid-guard-square.svg",
    tags: ["squid game", "carre", "superviseur", "korea", "netflix"],
  },
  {
    id: "squid-frontman",
    name: "Front Man (Le Leader)",
    series: "Squid Game",
    category: "netflix",
    url: "/avatars/netflix-frontman.svg",
    tags: ["squid game", "frontman", "masque noir", "boss", "netflix"],
  },
  {
    id: "squid-gihun",
    name: "Seong Gi-hun (456)",
    series: "Squid Game",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/572/1431002.jpg",
    tags: ["gi-hun", "456", "squid game", "joueur", "netflix"],
  },
  {
    id: "squid-saebyeok",
    name: "Kang Sae-byeok (067)",
    series: "Squid Game",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/352/881327.jpg",
    tags: ["sae-byeok", "067", "squid game", "coree", "netflix"],
  },

  // ==========================================
  // --- STRANGER THINGS (NETFLIX) ---
  // ==========================================
  {
    id: "st-eleven",
    name: "Onze (Eleven)",
    series: "Stranger Things",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/602/1506071.jpg",
    tags: ["eleven", "onze", "stranger things", "hawkins", "telekinesie", "netflix"],
  },
  {
    id: "st-dustin",
    name: "Dustin Henderson",
    series: "Stranger Things",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/602/1506079.jpg",
    tags: ["dustin", "stranger things", "casquette", "cerebro", "netflix"],
  },
  {
    id: "st-steve",
    name: "Steve Harrington",
    series: "Stranger Things",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/602/1506068.jpg",
    tags: ["steve", "harrington", "scoops ahoy", "batte", "stranger things", "netflix"],
  },
  {
    id: "st-eddie",
    name: "Eddie Munson",
    series: "Stranger Things",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/595/1489169.jpg",
    tags: ["eddie", "munson", "hellfire", "metallica", "guitare", "netflix"],
  },
  {
    id: "st-demogorgon",
    name: "Démogorgon",
    series: "Stranger Things",
    category: "netflix",
    url: "/avatars/netflix-stranger-demogorgon.svg",
    tags: ["demogorgon", "stranger things", "upside down", "monstre", "netflix"],
  },

  // ==========================================
  // --- CYBERPUNK: EDGERUNNERS (NETFLIX) ---
  // ==========================================
  {
    id: "cyberpunk-david",
    name: "David Martinez",
    series: "Cyberpunk: Edgerunners",
    category: "netflix",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b284158-z1uGKC3IYVa1.png",
    tags: ["david", "martinez", "cyberpunk", "edgerunners", "sandevistan", "night city", "netflix"],
  },
  {
    id: "cyberpunk-lucy",
    name: "Lucy Kushinada",
    series: "Cyberpunk: Edgerunners",
    category: "netflix",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b284157-cqYawN7XCNJx.jpg",
    tags: ["lucy", "netrunner", "cyberpunk", "lune", "edgerunners", "netflix"],
  },
  {
    id: "cyberpunk-rebecca",
    name: "Rebecca",
    series: "Cyberpunk: Edgerunners",
    category: "netflix",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b284163-tt8smoAXl24x.jpg",
    tags: ["rebecca", "solo", "gunner", "cyberpunk", "edgerunners", "netflix"],
  },

  // ==========================================
  // --- NETFLIX CLASSIC SMILEYS ---
  // ==========================================
  {
    id: "netflix-classic-red",
    name: "Smiley Rouge Classique",
    series: "Netflix Classic Collection",
    category: "netflix",
    url: "/avatars/netflix-classic-red.svg",
    tags: ["netflix", "classic", "smiley", "red", "rouge"],
  },
  {
    id: "netflix-classic-blue",
    name: "Smiley Bleu Classique",
    series: "Netflix Classic Collection",
    category: "netflix",
    url: "/avatars/netflix-classic-blue.svg",
    tags: ["netflix", "classic", "smiley", "blue", "bleu"],
  },
  {
    id: "netflix-classic-yellow",
    name: "Smiley Jaune Classique",
    series: "Netflix Classic Collection",
    category: "netflix",
    url: "/avatars/netflix-classic-yellow.svg",
    tags: ["netflix", "classic", "smiley", "yellow", "jaune"],
  },
  {
    id: "netflix-classic-green",
    name: "Smiley Vert Classique",
    series: "Netflix Classic Collection",
    category: "netflix",
    url: "/avatars/netflix-classic-green.svg",
    tags: ["netflix", "classic", "smiley", "green", "vert"],
  },
  {
    id: "netflix-dali-mask",
    name: "Masque de Dalí",
    series: "La Casa de Papel",
    category: "netflix",
    url: "/avatars/netflix-dali-mask.svg",
    tags: ["casa de papel", "dali", "professeur", "masque", "braquage", "money heist"],
  },
  {
    id: "netflix-witcher",
    name: "Médaillon Loup Blanc",
    series: "The Witcher",
    category: "netflix",
    url: "/avatars/netflix-witcher.svg",
    tags: ["witcher", "geralt", "loup", "sorceleur", "netflix"],
  },

  // ==========================================
  // --- L'ATTAQUE DES TITANS (CRUNCHYROLL) ---
  // ==========================================
  {
    id: "aot-eren",
    name: "Eren Yeager",
    series: "L'Attaque des Titans",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg",
    tags: ["eren", "yeager", "attaque des titans", "aot", "snk", "titan assaillant", "crunchyroll"],
  },
  {
    id: "aot-mikasa",
    name: "Mikasa Ackerman",
    series: "L'Attaque des Titans",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png",
    tags: ["mikasa", "ackerman", "echarpe", "snk", "aot", "crunchyroll"],
  },
  {
    id: "aot-levi",
    name: "Capitaine Levi Ackerman",
    series: "L'Attaque des Titans",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png",
    tags: ["levi", "livai", "capitaine", "bataillon", "snk", "aot", "crunchyroll"],
  },
  {
    id: "aot-armin",
    name: "Armin Arlert",
    series: "L'Attaque des Titans",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b46494-g7xYYuBtYPnO.png",
    tags: ["armin", "arlert", "titan colossal", "snk", "aot", "crunchyroll"],
  },
  {
    id: "aot-reiner",
    name: "Reiner Braun",
    series: "L'Attaque des Titans",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b46484-P6A2GjNQn49F.png",
    tags: ["reiner", "braun", "titan cuirasse", "snk", "aot", "crunchyroll"],
  },

  // ==========================================
  // --- JUJUTSU KAISEN (CRUNCHYROLL) ---
  // ==========================================
  {
    id: "jjk-gojo",
    name: "Satoru Gojo",
    series: "Jujutsu Kaisen",
    category: "anime",
    url: "/avatars/crunchyroll-gojo.svg",
    tags: ["gojo", "satoru", "jujutsu kaisen", "jjk", "six eyes", "infini", "bandeau", "crunchyroll"],
  },
  {
    id: "jjk-sukuna",
    name: "Ryomen Sukuna",
    series: "Jujutsu Kaisen",
    category: "anime",
    url: "/avatars/crunchyroll-sukuna.svg",
    tags: ["sukuna", "ryomen", "roi des fleaux", "jjk", "jujutsu kaisen", "crunchyroll"],
  },
  {
    id: "jjk-yuji",
    name: "Yuji Itadori",
    series: "Jujutsu Kaisen",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b127212-FVm2tD0erQ5B.png",
    tags: ["yuji", "itadori", "black flash", "jjk", "crunchyroll"],
  },
  {
    id: "jjk-megumi",
    name: "Megumi Fushiguro",
    series: "Jujutsu Kaisen",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b126635-L0y3I92JSUkN.png",
    tags: ["megumi", "fushiguro", "mahagora", "ombres", "jjk", "crunchyroll"],
  },
  {
    id: "jjk-toji",
    name: "Toji Fushiguro",
    series: "Jujutsu Kaisen",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b162722-btzdghBizxKS.jpg",
    tags: ["toji", "fushiguro", "tueur d'exorcistes", "inversion celeste", "jjk", "crunchyroll"],
  },

  // ==========================================
  // --- CHAINSAW MAN (CRUNCHYROLL) ---
  // ==========================================
  {
    id: "csm-makima",
    name: "Makima",
    series: "Chainsaw Man",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png",
    tags: ["makima", "demon du controle", "csm", "chainsaw man", "crunchyroll"],
  },
  {
    id: "csm-denji",
    name: "Denji",
    series: "Chainsaw Man",
    category: "anime",
    url: "/avatars/crunchyroll-denji.svg",
    tags: ["denji", "pochita", "tronconneuse", "chainsaw man", "csm", "crunchyroll"],
  },
  {
    id: "csm-power",
    name: "Power",
    series: "Chainsaw Man",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b137079-6yLEUYR3bmpr.png",
    tags: ["power", "demon sang", "cornes", "chainsaw man", "csm", "crunchyroll"],
  },
  {
    id: "csm-aki",
    name: "Aki Hayakawa",
    series: "Chainsaw Man",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b137081-TSrUR3mUJL6r.png",
    tags: ["aki", "hayakawa", "kon", "renard", "chainsaw man", "crunchyroll"],
  },

  // ==========================================
  // --- DEMON SLAYER (KIMETSU NO YAIBA) ---
  // ==========================================
  {
    id: "kny-tanjiro",
    name: "Tanjiro Kamado",
    series: "Demon Slayer",
    category: "anime",
    url: "/avatars/crunchyroll-tanjiro.svg",
    tags: ["tanjiro", "kamado", "souffle de l'eau", "soleil", "demon slayer", "kny", "crunchyroll"],
  },
  {
    id: "kny-nezuko",
    name: "Nezuko Kamado",
    series: "Demon Slayer",
    category: "anime",
    url: "/avatars/crunchyroll-nezuko.svg",
    tags: ["nezuko", "kamado", "bambou", "demon slayer", "kny", "crunchyroll"],
  },
  {
    id: "kny-zenitsu",
    name: "Zenitsu Agatsuma",
    series: "Demon Slayer",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b129131-FZrQ7lSlxmEr.png",
    tags: ["zenitsu", "foudre", "tonnerre", "demon slayer", "kny", "crunchyroll"],
  },
  {
    id: "kny-rengoku",
    name: "Kyojuro Rengoku",
    series: "Demon Slayer",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b129133-VlTPowwt68rJ.png",
    tags: ["rengoku", "flamme", "pilier", "umai", "demon slayer", "kny", "crunchyroll"],
  },

  // ==========================================
  // --- SOLO LEVELING (CRUNCHYROLL) ---
  // ==========================================
  {
    id: "sl-jinwoo",
    name: "Sung Jin-Woo (Shadow Monarch)",
    series: "Solo Leveling",
    category: "anime",
    url: "/avatars/crunchyroll-jinwoo.svg",
    tags: ["sung jin-woo", "jinwoo", "shadow monarch", "arise", "monarque", "solo leveling", "crunchyroll"],
  },
  {
    id: "sl-cha",
    name: "Cha Hae-In",
    series: "Solo Leveling",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b138789-AhE8m0LWjE7E.png",
    tags: ["cha hae-in", "epee", "rang s", "chasseuse", "solo leveling", "crunchyroll"],
  },

  // ==========================================
  // --- ONE PIECE (ANIME) ---
  // ==========================================
  {
    id: "op-luffy-g5",
    name: "Monkey D. Luffy (Gear 5)",
    series: "One Piece",
    category: "anime",
    url: "/avatars/crunchyroll-luffy-gear5.svg",
    tags: ["luffy", "gear 5", "nika", "one piece", "chapeau de paille", "soleil", "crunchyroll"],
  },
  {
    id: "op-zoro",
    name: "Roronoa Zoro (Enma)",
    series: "One Piece",
    category: "anime",
    url: "/avatars/crunchyroll-zoro.svg",
    tags: ["zoro", "santoryu", "enma", "epee", "one piece", "crunchyroll"],
  },
  {
    id: "op-sanji",
    name: "Vinsmoke Sanji (Ifrit Jambe)",
    series: "One Piece",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b305-6lisPmHtCnLT.png",
    tags: ["sanji", "ifrit jambe", "cuisinier", "one piece", "crunchyroll"],
  },
  {
    id: "op-ace",
    name: "Portgas D. Ace",
    series: "One Piece",
    category: "anime",
    url: "https://s4.anilist.co/file/anilistcdn/character/large/b2072-Lc6jEdsueJUK.jpg",
    tags: ["ace", "poing ardent", "feu", "mera mera", "one piece", "crunchyroll"],
  },

  // ==========================================
  // --- VALORANT AGENTS (RIOT GAMES) ---
  // ==========================================
  {
    id: "val-jett",
    name: "Jett (Wind Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/add6443a-41bd-e378-6169-1589f0169f48/displayicon.png",
    tags: ["jett", "valorant", "duelist", "korea", "riot games", "vent"],
  },
  {
    id: "val-reyna",
    name: "Reyna (Empress)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
    tags: ["reyna", "valorant", "duelist", "mexico", "empress", "riot"],
  },
  {
    id: "val-omen",
    name: "Omen (Shadow Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-96852549c227/displayicon.png",
    tags: ["omen", "valorant", "controller", "ombre", "teleport", "riot"],
  },
  {
    id: "val-iso",
    name: "Iso (Shield Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
    tags: ["iso", "valorant", "duelist", "china", "bouclier", "riot"],
  },
  {
    id: "val-clove",
    name: "Clove (Immortal Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-ffb5dd0939b2/displayicon.png",
    tags: ["clove", "valorant", "controller", "papillon", "ecosse", "riot"],
  },
  {
    id: "val-viper",
    name: "Viper (Toxin Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/707eab51-47e6-8070-f402-6e3e7705e364/displayicon.png",
    tags: ["viper", "valorant", "controller", "poison", "toxine", "riot"],
  },
  {
    id: "val-chamber",
    name: "Chamber (Tour de Force)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/22697a3d-4588-802e-9eaf-fc84e608e4e4/displayicon.png",
    tags: ["chamber", "valorant", "sentinel", "france", "sniper", "elegance", "riot"],
  },
  {
    id: "val-phoenix",
    name: "Phoenix (Fire Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
    tags: ["phoenix", "valorant", "duelist", "uk", "feu", "riot"],
  },

  // ==========================================
  // --- LEAGUE OF LEGENDS (RIOT GAMES) ---
  // ==========================================
  {
    id: "lol-ahri",
    name: "Ahri (Renard à Neuf Queues)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png",
    tags: ["ahri", "lol", "kda", "mage", "ionia", "renard", "riot games"],
  },
  {
    id: "lol-yasuo",
    name: "Yasuo (Le Disgracié)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yasuo.png",
    tags: ["yasuo", "hasagi", "vent", "epee", "lol", "riot"],
  },
  {
    id: "lol-zed",
    name: "Zed (Maître des Ombres)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zed.png",
    tags: ["zed", "assassin", "ombres", "ninja", "lol", "riot"],
  },
  {
    id: "lol-akali",
    name: "Akali (Assassin Rebelle)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Akali.png",
    tags: ["akali", "kda", "ninja", "kunai", "lol", "riot"],
  },
];

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Layers },
  { id: "netflix", label: "Netflix", icon: Film },
  { id: "anime", label: "Crunchyroll & Anime", icon: Flame },
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
  const [selectedUrl, setSelectedUrl] = useState<string>(avatarUrl || PRESET_AVATARS[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [applying, setApplying] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedSeries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = PRESET_AVATARS.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.series.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });

    const groupsMap = new Map<string, AvatarItem[]>();
    filtered.forEach((item) => {
      const list = groupsMap.get(item.series) || [];
      list.push(item);
      groupsMap.set(item.series, list);
    });

    return Array.from(groupsMap.entries()).map(([seriesName, avatars]) => ({
      seriesName,
      avatars,
      count: avatars.length,
    }));
  }, [activeCategory, searchQuery]);

  function handlePickRandom() {
    const all = PRESET_AVATARS;
    const random = all[Math.floor(Math.random() * all.length)];
    if (random) {
      setSelectedUrl(random.url);
      success(`Avatar aléatoire sélectionné : ${random.name} (${random.series})`);
    }
  }

  async function handleConfirmSelection() {
    if (!selectedUrl) return;
    setApplying(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("ethone_custom_avatar", selectedUrl);
        localStorage.setItem("ethone:custom:avatar", selectedUrl);
        localStorage.setItem("ethone_user_avatar", selectedUrl);
      }
      await save({ avatar_url: selectedUrl });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: selectedUrl } }));
      }
      if (onSelect) onSelect(selectedUrl);
      success(i18n("avatarUpdated", "Photo de profil mise à jour instantanément !"));
      onClose();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.setItem("ethone_custom_avatar", selectedUrl);
        localStorage.setItem("ethone:custom:avatar", selectedUrl);
        localStorage.setItem("ethone_user_avatar", selectedUrl);
        window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: { avatar_url: selectedUrl } }));
      }
      if (onSelect) onSelect(selectedUrl);
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
    success("Image personnalisée chargée ! Cliquez sur 'Valider' pour appliquer.");
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
        success("Fichier importé avec succès ! Cliquez sur 'Valider' pour appliquer.");
      }
    };
    reader.readAsDataURL(file);
  }

  if (!isOpen) return null;

  const totalCount = PRESET_AVATARS.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-2 sm:p-4 md:p-6 backdrop-blur-2xl bg-black/85">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-[92vh] max-h-[880px] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#141414] shadow-[0_32px_96px_-12px_rgba(0,0,0,0.9)] text-white"
        >
          <div className="relative px-6 sm:px-8 pt-6 pb-4 border-b border-white/5 bg-[#181818]/80">
            <button
              onClick={onClose}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white">
              Choisis ton avatar
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-sans">
              Une icône parmi des centaines de personnages officiels (Netflix, Crunchyroll, Gaming)
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un personnage ou une série..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[var(--accent-primary)] focus:bg-black/60 transition-all font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handlePickRandom}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Aléatoire</span>
              </button>

              <button
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Image perso</span>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as AvatarCategory)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer border",
                      isActive
                        ? "bg-white text-black border-white font-bold shadow-md"
                        : "bg-white/[0.03] border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {showCustomInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-xl border border-white/10 bg-black/50 flex flex-col sm:flex-row gap-2 items-center"
              >
                <form onSubmit={handleCustomUrlSubmit} className="flex flex-1 items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Coller l'URL directe d'une image (Discord, Pinterest, Web)..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="secondary" className="h-8 px-3 text-xs shrink-0 cursor-pointer">
                    Charger
                  </Button>
                </form>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs text-zinc-300 hover:text-white border border-white/10 shrink-0 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Depuis mon PC
                </Button>
              </motion.div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-7 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {groupedSeries.map(({ seriesName, avatars, count }) => (
              <div key={seriesName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-300 font-sans">
                    {seriesName}
                  </h3>
                  <span className="text-xs font-semibold text-zinc-500">
                    {count}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4">
                  {avatars.map((item) => {
                    const isSelected = selectedUrl === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedUrl(item.url)}
                        title={`${item.name} (${item.series})`}
                        className={cn(
                          "group relative aspect-square rounded-[18px] sm:rounded-[20px] overflow-hidden cursor-pointer transition-all duration-150 p-0.5",
                          isSelected
                            ? "ring-3 ring-amber-400 ring-offset-2 ring-offset-[#141414] scale-[1.03] shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                            : "hover:scale-[1.05] hover:ring-2 hover:ring-white/40 ring-1 ring-white/10 bg-zinc-900"
                        )}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-[16px] sm:rounded-[18px] bg-zinc-950">
                          <ClientImage
                            src={item.url}
                            alt={item.name}
                            width={160}
                            height={160}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />

                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg ring-2 ring-white/30">
                                <Check className="h-4 w-4 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {groupedSeries.length === 0 && (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center p-8">
                <Search className="h-8 w-8 text-zinc-500 mb-2" />
                <p className="text-sm font-bold text-white">Aucun personnage trouvé pour &quot;{searchQuery}&quot;</p>
                <p className="text-xs text-zinc-400 mt-1">Essayez un autre mot-clé ou collez une URL d&apos;image personnalisée.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/5 bg-[#181818] px-6 sm:px-8 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-400">
                {totalCount} icônes disponibles
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmSelection}
                disabled={applying}
                className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 text-xs sm:text-sm font-black shadow-lg transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Valider</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
