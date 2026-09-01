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
  Tv,
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

export type AvatarCategory = "all" | "netflix" | "prime" | "anime" | "gaming";

export type AvatarItem = {
  id: string;
  name: string;
  series: string;
  category: "netflix" | "prime" | "anime" | "gaming";
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


  // ==========================================
  // --- EXTENDED GAMING: LEAGUE OF LEGENDS ---
  // ==========================================

  // ==========================================
  // --- EXTENDED GAMING: VALORANT ---
  // ==========================================

  // ==========================================
  // --- EXTENDED ANIME ---
  // ==========================================

  // ==========================================
  // --- EXTENDED NETFLIX & PRIME ---
  // ==========================================
  {
    id: "lol-aatrox",
    name: "Aatrox (the Darkin Blade)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Aatrox.png",
    tags: ["aatrox", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-ahri",
    name: "Ahri (the Nine-Tailed Fox)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png",
    tags: ["ahri", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-akali",
    name: "Akali (the Rogue Assassin)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Akali.png",
    tags: ["akali", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-akshan",
    name: "Akshan (the Rogue Sentinel)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Akshan.png",
    tags: ["akshan", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-alistar",
    name: "Alistar (the Minotaur)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Alistar.png",
    tags: ["alistar", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-amumu",
    name: "Amumu (the Sad Mummy)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Amumu.png",
    tags: ["amumu", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-anivia",
    name: "Anivia (the Cryophoenix)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Anivia.png",
    tags: ["anivia", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-annie",
    name: "Annie (the Dark Child)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Annie.png",
    tags: ["annie", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-aphelios",
    name: "Aphelios (the Weapon of the Faithful)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Aphelios.png",
    tags: ["aphelios", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-ashe",
    name: "Ashe (the Frost Archer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ashe.png",
    tags: ["ashe", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-aurelionsol",
    name: "Aurelion Sol (The Star Forger)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/AurelionSol.png",
    tags: ["aurelion-sol", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-aurora",
    name: "Aurora (the Witch Between Worlds)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Aurora.png",
    tags: ["aurora", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-azir",
    name: "Azir (the Emperor of the Sands)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Azir.png",
    tags: ["azir", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-bard",
    name: "Bard (the Wandering Caretaker)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Bard.png",
    tags: ["bard", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-belveth",
    name: "Bel'Veth (the Empress of the Void)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Belveth.png",
    tags: ["bel-veth", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-blitzcrank",
    name: "Blitzcrank (the Great Steam Golem)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Blitzcrank.png",
    tags: ["blitzcrank", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-brand",
    name: "Brand (the Burning Vengeance)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Brand.png",
    tags: ["brand", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-braum",
    name: "Braum (the Heart of the Freljord)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Braum.png",
    tags: ["braum", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-briar",
    name: "Briar (the Restrained Hunger)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Briar.png",
    tags: ["briar", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-caitlyn",
    name: "Caitlyn (the Sheriff of Piltover)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Caitlyn.png",
    tags: ["caitlyn", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-camille",
    name: "Camille (the Steel Shadow)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Camille.png",
    tags: ["camille", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-cassiopeia",
    name: "Cassiopeia (the Serpent's Embrace)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Cassiopeia.png",
    tags: ["cassiopeia", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-chogath",
    name: "Cho'Gath (the Terror of the Void)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Chogath.png",
    tags: ["cho-gath", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-corki",
    name: "Corki (the Daring Bombardier)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Corki.png",
    tags: ["corki", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-darius",
    name: "Darius (the Hand of Noxus)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Darius.png",
    tags: ["darius", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-diana",
    name: "Diana (Scorn of the Moon)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Diana.png",
    tags: ["diana", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-draven",
    name: "Draven (the Glorious Executioner)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Draven.png",
    tags: ["draven", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-drmundo",
    name: "Dr. Mundo (the Madman of Zaun)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/DrMundo.png",
    tags: ["dr-mundo", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-ekko",
    name: "Ekko (the Boy Who Shattered Time)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ekko.png",
    tags: ["ekko", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-elise",
    name: "Elise (the Spider Queen)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Elise.png",
    tags: ["elise", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-evelynn",
    name: "Evelynn (Agony's Embrace)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Evelynn.png",
    tags: ["evelynn", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-ezreal",
    name: "Ezreal (the Prodigal Explorer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ezreal.png",
    tags: ["ezreal", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-fiddlesticks",
    name: "Fiddlesticks (the Ancient Fear)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Fiddlesticks.png",
    tags: ["fiddlesticks", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-fiora",
    name: "Fiora (the Grand Duelist)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Fiora.png",
    tags: ["fiora", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-fizz",
    name: "Fizz (the Tidal Trickster)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Fizz.png",
    tags: ["fizz", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-galio",
    name: "Galio (the Colossus)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Galio.png",
    tags: ["galio", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-gangplank",
    name: "Gangplank (the Saltwater Scourge)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Gangplank.png",
    tags: ["gangplank", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-garen",
    name: "Garen (The Might of Demacia)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Garen.png",
    tags: ["garen", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-gnar",
    name: "Gnar (the Missing Link)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Gnar.png",
    tags: ["gnar", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-gragas",
    name: "Gragas (the Rabble Rouser)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Gragas.png",
    tags: ["gragas", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-graves",
    name: "Graves (the Outlaw)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Graves.png",
    tags: ["graves", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-gwen",
    name: "Gwen (The Hallowed Seamstress)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Gwen.png",
    tags: ["gwen", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-hecarim",
    name: "Hecarim (the Shadow of War)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Hecarim.png",
    tags: ["hecarim", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-heimerdinger",
    name: "Heimerdinger (the Revered Inventor)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Heimerdinger.png",
    tags: ["heimerdinger", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-hwei",
    name: "Hwei (the Visionary)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Hwei.png",
    tags: ["hwei", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-illaoi",
    name: "Illaoi (the Kraken Priestess)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Illaoi.png",
    tags: ["illaoi", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-irelia",
    name: "Irelia (the Blade Dancer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Irelia.png",
    tags: ["irelia", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-ivern",
    name: "Ivern (the Green Father)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ivern.png",
    tags: ["ivern", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-janna",
    name: "Janna (the Storm's Fury)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Janna.png",
    tags: ["janna", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-jarvaniv",
    name: "Jarvan IV (the Exemplar of Demacia)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/JarvanIV.png",
    tags: ["jarvan-iv", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-jax",
    name: "Jax (Grandmaster at Arms)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jax.png",
    tags: ["jax", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-jayce",
    name: "Jayce (the Defender of Tomorrow)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jayce.png",
    tags: ["jayce", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-jhin",
    name: "Jhin (the Virtuoso)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jhin.png",
    tags: ["jhin", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-jinx",
    name: "Jinx (the Loose Cannon)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jinx.png",
    tags: ["jinx", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-kaisa",
    name: "Kai'Sa (Daughter of the Void)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kaisa.png",
    tags: ["kai-sa", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-kalista",
    name: "Kalista (the Spear of Vengeance)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kalista.png",
    tags: ["kalista", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-karma",
    name: "Karma (the Enlightened One)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Karma.png",
    tags: ["karma", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-karthus",
    name: "Karthus (the Deathsinger)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Karthus.png",
    tags: ["karthus", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-kassadin",
    name: "Kassadin (the Void Walker)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kassadin.png",
    tags: ["kassadin", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-katarina",
    name: "Katarina (the Sinister Blade)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Katarina.png",
    tags: ["katarina", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-kayle",
    name: "Kayle (the Righteous)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kayle.png",
    tags: ["kayle", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-kayn",
    name: "Kayn (the Shadow Reaper)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kayn.png",
    tags: ["kayn", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-kennen",
    name: "Kennen (the Heart of the Tempest)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kennen.png",
    tags: ["kennen", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-khazix",
    name: "Kha'Zix (the Voidreaver)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Khazix.png",
    tags: ["kha-zix", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-kindred",
    name: "Kindred (The Eternal Hunters)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kindred.png",
    tags: ["kindred", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-kled",
    name: "Kled (the Cantankerous Cavalier)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Kled.png",
    tags: ["kled", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-kogmaw",
    name: "Kog'Maw (the Mouth of the Abyss)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/KogMaw.png",
    tags: ["kog-maw", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-ksante",
    name: "K'Sante (the Pride of Nazumah)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/KSante.png",
    tags: ["k-sante", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-leblanc",
    name: "LeBlanc (the Deceiver)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Leblanc.png",
    tags: ["leblanc", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-leesin",
    name: "Lee Sin (the Blind Monk)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/LeeSin.png",
    tags: ["lee-sin", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-leona",
    name: "Leona (the Radiant Dawn)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Leona.png",
    tags: ["leona", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-lillia",
    name: "Lillia (the Bashful Bloom)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lillia.png",
    tags: ["lillia", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-lissandra",
    name: "Lissandra (the Ice Witch)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lissandra.png",
    tags: ["lissandra", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-lucian",
    name: "Lucian (the Purifier)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lucian.png",
    tags: ["lucian", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-lulu",
    name: "Lulu (the Fae Sorceress)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lulu.png",
    tags: ["lulu", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-lux",
    name: "Lux (the Lady of Luminosity)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lux.png",
    tags: ["lux", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-malphite",
    name: "Malphite (Shard of the Monolith)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Malphite.png",
    tags: ["malphite", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-malzahar",
    name: "Malzahar (the Prophet of the Void)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Malzahar.png",
    tags: ["malzahar", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-maokai",
    name: "Maokai (the Twisted Treant)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Maokai.png",
    tags: ["maokai", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-masteryi",
    name: "Master Yi (the Wuju Bladesman)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/MasterYi.png",
    tags: ["master-yi", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-milio",
    name: "Milio (The Gentle Flame)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Milio.png",
    tags: ["milio", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-missfortune",
    name: "Miss Fortune (the Bounty Hunter)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/MissFortune.png",
    tags: ["miss-fortune", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-monkeyking",
    name: "Wukong (the Monkey King)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/MonkeyKing.png",
    tags: ["wukong", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-mordekaiser",
    name: "Mordekaiser (the Iron Revenant)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Mordekaiser.png",
    tags: ["mordekaiser", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-morgana",
    name: "Morgana (the Fallen)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Morgana.png",
    tags: ["morgana", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-naafiri",
    name: "Naafiri (the Hound of a Hundred Bites)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Naafiri.png",
    tags: ["naafiri", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-nami",
    name: "Nami (the Tidecaller)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nami.png",
    tags: ["nami", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-nasus",
    name: "Nasus (the Curator of the Sands)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nasus.png",
    tags: ["nasus", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-nautilus",
    name: "Nautilus (the Titan of the Depths)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nautilus.png",
    tags: ["nautilus", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-neeko",
    name: "Neeko (the Curious Chameleon)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Neeko.png",
    tags: ["neeko", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-nidalee",
    name: "Nidalee (the Bestial Huntress)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nidalee.png",
    tags: ["nidalee", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-nilah",
    name: "Nilah (the Joy Unbound)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nilah.png",
    tags: ["nilah", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-nocturne",
    name: "Nocturne (the Eternal Nightmare)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nocturne.png",
    tags: ["nocturne", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-nunu",
    name: "Nunu & Willump (the Boy and His Yeti)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Nunu.png",
    tags: ["nunu-willump", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-olaf",
    name: "Olaf (the Berserker)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Olaf.png",
    tags: ["olaf", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-orianna",
    name: "Orianna (the Lady of Clockwork)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Orianna.png",
    tags: ["orianna", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-ornn",
    name: "Ornn (The Fire below the Mountain)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ornn.png",
    tags: ["ornn", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-pantheon",
    name: "Pantheon (the Unbreakable Spear)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Pantheon.png",
    tags: ["pantheon", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-poppy",
    name: "Poppy (Keeper of the Hammer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Poppy.png",
    tags: ["poppy", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-pyke",
    name: "Pyke (the Bloodharbor Ripper)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Pyke.png",
    tags: ["pyke", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-qiyana",
    name: "Qiyana (Empress of the Elements)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Qiyana.png",
    tags: ["qiyana", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-quinn",
    name: "Quinn (Demacia's Wings)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Quinn.png",
    tags: ["quinn", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-rakan",
    name: "Rakan (The Charmer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Rakan.png",
    tags: ["rakan", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-rammus",
    name: "Rammus (the Armordillo)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Rammus.png",
    tags: ["rammus", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-reksai",
    name: "Rek'Sai (the Void Burrower)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/RekSai.png",
    tags: ["rek-sai", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-rell",
    name: "Rell (the Iron Maiden)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Rell.png",
    tags: ["rell", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-renata",
    name: "Renata Glasc (the Chem-Baroness)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Renata.png",
    tags: ["renata-glasc", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-renekton",
    name: "Renekton (the Butcher of the Sands)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Renekton.png",
    tags: ["renekton", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-rengar",
    name: "Rengar (the Pridestalker)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Rengar.png",
    tags: ["rengar", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-riven",
    name: "Riven (the Exile)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Riven.png",
    tags: ["riven", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-rumble",
    name: "Rumble (the Mechanized Menace)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Rumble.png",
    tags: ["rumble", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-ryze",
    name: "Ryze (the Rune Mage)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ryze.png",
    tags: ["ryze", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-samira",
    name: "Samira (the Desert Rose)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Samira.png",
    tags: ["samira", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-sejuani",
    name: "Sejuani (Fury of the North)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sejuani.png",
    tags: ["sejuani", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-senna",
    name: "Senna (the Redeemer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Senna.png",
    tags: ["senna", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-seraphine",
    name: "Seraphine (the Starry-Eyed Songstress)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Seraphine.png",
    tags: ["seraphine", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-sett",
    name: "Sett (the Boss)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sett.png",
    tags: ["sett", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-shaco",
    name: "Shaco (the Demon Jester)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Shaco.png",
    tags: ["shaco", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-shen",
    name: "Shen (the Eye of Twilight)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Shen.png",
    tags: ["shen", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-shyvana",
    name: "Shyvana (the Half-Dragon)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Shyvana.png",
    tags: ["shyvana", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-singed",
    name: "Singed (the Mad Chemist)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Singed.png",
    tags: ["singed", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-sion",
    name: "Sion (The Undead Juggernaut)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sion.png",
    tags: ["sion", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-sivir",
    name: "Sivir (the Battle Mistress)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sivir.png",
    tags: ["sivir", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-skarner",
    name: "Skarner (the Primordial Sovereign)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Skarner.png",
    tags: ["skarner", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-smolder",
    name: "Smolder (the Fiery Fledgling)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Smolder.png",
    tags: ["smolder", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-sona",
    name: "Sona (Maven of the Strings)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sona.png",
    tags: ["sona", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-soraka",
    name: "Soraka (the Starchild)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Soraka.png",
    tags: ["soraka", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-swain",
    name: "Swain (the Noxian Grand General)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Swain.png",
    tags: ["swain", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-sylas",
    name: "Sylas (the Unshackled)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Sylas.png",
    tags: ["sylas", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-syndra",
    name: "Syndra (the Dark Sovereign)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Syndra.png",
    tags: ["syndra", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-tahmkench",
    name: "Tahm Kench (The River King)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/TahmKench.png",
    tags: ["tahm-kench", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-taliyah",
    name: "Taliyah (the Stoneweaver)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Taliyah.png",
    tags: ["taliyah", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-talon",
    name: "Talon (the Blade's Shadow)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Talon.png",
    tags: ["talon", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-taric",
    name: "Taric (the Shield of Valoran)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Taric.png",
    tags: ["taric", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-teemo",
    name: "Teemo (the Swift Scout)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Teemo.png",
    tags: ["teemo", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-thresh",
    name: "Thresh (the Chain Warden)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Thresh.png",
    tags: ["thresh", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-tristana",
    name: "Tristana (the Yordle Gunner)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Tristana.png",
    tags: ["tristana", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-trundle",
    name: "Trundle (the Troll King)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Trundle.png",
    tags: ["trundle", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-tryndamere",
    name: "Tryndamere (the Barbarian King)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Tryndamere.png",
    tags: ["tryndamere", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-twistedfate",
    name: "Twisted Fate (the Card Master)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/TwistedFate.png",
    tags: ["twisted-fate", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-twitch",
    name: "Twitch (the Plague Rat)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Twitch.png",
    tags: ["twitch", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-udyr",
    name: "Udyr (the Spirit Walker)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Udyr.png",
    tags: ["udyr", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-urgot",
    name: "Urgot (the Dreadnought)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Urgot.png",
    tags: ["urgot", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-varus",
    name: "Varus (the Arrow of Retribution)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Varus.png",
    tags: ["varus", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-vayne",
    name: "Vayne (the Night Hunter)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Vayne.png",
    tags: ["vayne", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-veigar",
    name: "Veigar (the Tiny Master of Evil)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Veigar.png",
    tags: ["veigar", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-velkoz",
    name: "Vel'Koz (the Eye of the Void)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Velkoz.png",
    tags: ["vel-koz", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-vex",
    name: "Vex (the Gloomist)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Vex.png",
    tags: ["vex", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-vi",
    name: "Vi (the Piltover Enforcer)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Vi.png",
    tags: ["vi", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-viego",
    name: "Viego (The Ruined King)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Viego.png",
    tags: ["viego", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-viktor",
    name: "Viktor (the Machine Herald)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Viktor.png",
    tags: ["viktor", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-vladimir",
    name: "Vladimir (the Crimson Reaper)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Vladimir.png",
    tags: ["vladimir", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-volibear",
    name: "Volibear (the Relentless Storm)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Volibear.png",
    tags: ["volibear", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-warwick",
    name: "Warwick (the Uncaged Wrath of Zaun)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Warwick.png",
    tags: ["warwick", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-xayah",
    name: "Xayah (the Rebel)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Xayah.png",
    tags: ["xayah", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-xerath",
    name: "Xerath (the Magus Ascendant)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Xerath.png",
    tags: ["xerath", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-xinzhao",
    name: "Xin Zhao (the Seneschal of Demacia)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/XinZhao.png",
    tags: ["xin-zhao", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-yasuo",
    name: "Yasuo (the Unforgiven)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yasuo.png",
    tags: ["yasuo", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-yone",
    name: "Yone (the Unforgotten)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yone.png",
    tags: ["yone", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-yorick",
    name: "Yorick (Shepherd of Souls)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yorick.png",
    tags: ["yorick", "league of legends", "lol", "riot games", "fighter"],
  },
  {
    id: "lol-yuumi",
    name: "Yuumi (the Magical Cat)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yuumi.png",
    tags: ["yuumi", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-zac",
    name: "Zac (the Secret Weapon)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zac.png",
    tags: ["zac", "league of legends", "lol", "riot games", "tank"],
  },
  {
    id: "lol-zed",
    name: "Zed (the Master of Shadows)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zed.png",
    tags: ["zed", "league of legends", "lol", "riot games", "assassin"],
  },
  {
    id: "lol-zeri",
    name: "Zeri (The Spark of Zaun)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zeri.png",
    tags: ["zeri", "league of legends", "lol", "riot games", "marksman"],
  },
  {
    id: "lol-ziggs",
    name: "Ziggs (the Hexplosives Expert)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ziggs.png",
    tags: ["ziggs", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-zilean",
    name: "Zilean (the Chronokeeper)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zilean.png",
    tags: ["zilean", "league of legends", "lol", "riot games", "support"],
  },
  {
    id: "lol-zoe",
    name: "Zoe (the Aspect of Twilight)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zoe.png",
    tags: ["zoe", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "lol-zyra",
    name: "Zyra (Rise of the Thorns)",
    series: "League of Legends",
    category: "gaming",
    url: "https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zyra.png",
    tags: ["zyra", "league of legends", "lol", "riot games", "mage"],
  },
  {
    id: "val-gekko",
    name: "Gekko (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png",
    tags: ["gekko", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-fade",
    name: "Fade (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png",
    tags: ["fade", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-breach",
    name: "Breach (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png",
    tags: ["breach", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-deadlock",
    name: "Deadlock (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png",
    tags: ["deadlock", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-tejo",
    name: "Tejo (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png",
    tags: ["tejo", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-raze",
    name: "Raze (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png",
    tags: ["raze", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-chamber",
    name: "Chamber (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png",
    tags: ["chamber", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-kay-o",
    name: "KAY/O (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png",
    tags: ["kay-o", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-skye",
    name: "Skye (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png",
    tags: ["skye", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-cypher",
    name: "Cypher (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png",
    tags: ["cypher", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-sova",
    name: "Sova (Initiator)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png",
    tags: ["sova", "valorant", "initiator", "riot games"],
  },
  {
    id: "val-miks",
    name: "Miks (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png",
    tags: ["miks", "valorant", "controller", "riot games"],
  },
  {
    id: "val-killjoy",
    name: "Killjoy (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png",
    tags: ["killjoy", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-harbor",
    name: "Harbor (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png",
    tags: ["harbor", "valorant", "controller", "riot games"],
  },
  {
    id: "val-vyse",
    name: "Vyse (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png",
    tags: ["vyse", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-viper",
    name: "Viper (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png",
    tags: ["viper", "valorant", "controller", "riot games"],
  },
  {
    id: "val-phoenix",
    name: "Phoenix (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
    tags: ["phoenix", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-veto",
    name: "Veto (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png",
    tags: ["veto", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-astra",
    name: "Astra (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png",
    tags: ["astra", "valorant", "controller", "riot games"],
  },
  {
    id: "val-brimstone",
    name: "Brimstone (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png",
    tags: ["brimstone", "valorant", "controller", "riot games"],
  },
  {
    id: "val-iso",
    name: "Iso (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
    tags: ["iso", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-clove",
    name: "Clove (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png",
    tags: ["clove", "valorant", "controller", "riot games"],
  },
  {
    id: "val-neon",
    name: "Neon (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png",
    tags: ["neon", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-yoru",
    name: "Yoru (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png",
    tags: ["yoru", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-waylay",
    name: "Waylay (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png",
    tags: ["waylay", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-sage",
    name: "Sage (Sentinel)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png",
    tags: ["sage", "valorant", "sentinel", "riot games"],
  },
  {
    id: "val-reyna",
    name: "Reyna (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
    tags: ["reyna", "valorant", "duelist", "riot games"],
  },
  {
    id: "val-omen",
    name: "Omen (Controller)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png",
    tags: ["omen", "valorant", "controller", "riot games"],
  },
  {
    id: "val-jett",
    name: "Jett (Duelist)",
    series: "Valorant Agents",
    category: "gaming",
    url: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png",
    tags: ["jett", "valorant", "duelist", "riot games"],
  },
  {
    id: "netflix-you",
    name: "You",
    series: "You",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/564/1412472.jpg",
    tags: ["you", "netflix", "series"],
  },
  {
    id: "netflix-the-umbrella-academy",
    name: "The Umbrella Academy",
    series: "The Umbrella Academy",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/529/1324589.jpg",
    tags: ["the-umbrella-academy", "netflix", "series"],
  },
  {
    id: "netflix-the-crown",
    name: "The Crown",
    series: "The Crown",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/632/1580063.jpg",
    tags: ["the-crown", "netflix", "series"],
  },
  {
    id: "netflix-dark",
    name: "Dark",
    series: "Dark",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/504/1262352.jpg",
    tags: ["dark", "netflix", "series"],
  },
  {
    id: "netflix-black-mirror",
    name: "Black Mirror",
    series: "Black Mirror",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/564/1411764.jpg",
    tags: ["black-mirror", "netflix", "series"],
  },
  {
    id: "netflix-ozark",
    name: "Ozark",
    series: "Ozark",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/398/996611.jpg",
    tags: ["ozark", "netflix", "series"],
  },
  {
    id: "netflix-manifest",
    name: "Manifest",
    series: "Manifest",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/462/1155059.jpg",
    tags: ["manifest", "netflix", "series"],
  },
  {
    id: "netflix-the-sandman",
    name: "The Sandman",
    series: "The Sandman",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/423/1059631.jpg",
    tags: ["the-sandman", "netflix", "series"],
  },
  {
    id: "netflix-the-witcher",
    name: "The Witcher",
    series: "The Witcher",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/594/1486674.jpg",
    tags: ["the-witcher", "netflix", "series"],
  },
  {
    id: "netflix-cobra-kai",
    name: "Cobra Kai",
    series: "Cobra Kai",
    category: "netflix",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/536/1340290.jpg",
    tags: ["cobra-kai", "netflix", "series"],
  },
  {
    id: "prime-the-boys",
    name: "The Boys",
    series: "The Boys",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/619/1547768.jpg",
    tags: ["the-boys", "prime", "series"],
  },
  {
    id: "prime-invincible",
    name: "Invincible",
    series: "Invincible",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/618/1545777.jpg",
    tags: ["invincible", "prime", "series"],
  },
  {
    id: "prime-the-lord-of-the-rings-the-rings-of-power",
    name: "The Lord of the Rings: The Rings of Power",
    series: "The Lord of the Rings: The Rings of Power",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/633/1584401.jpg",
    tags: ["the-lord-of-the-rings-the-rings-of-power", "prime", "series"],
  },
  {
    id: "prime-reacher",
    name: "Reacher",
    series: "Reacher",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/636/1591350.jpg",
    tags: ["reacher", "prime", "series"],
  },
  {
    id: "prime-the-marvelous-mrs-maisel",
    name: "The Marvelous Mrs. Maisel",
    series: "The Marvelous Mrs. Maisel",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/456/1141825.jpg",
    tags: ["the-marvelous-mrs-maisel", "prime", "series"],
  },
  {
    id: "prime-fleabag",
    name: "Fleabag",
    series: "Fleabag",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/192/482341.jpg",
    tags: ["fleabag", "prime", "series"],
  },
  {
    id: "prime-good-omens",
    name: "Good Omens",
    series: "Good Omens",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/625/1563341.jpg",
    tags: ["good-omens", "prime", "series"],
  },
  {
    id: "prime-hunters",
    name: "Hunters",
    series: "Hunters",
    category: "prime",
    url: "https://static.tvmaze.com/uploads/images/original_untouched/234/585525.jpg",
    tags: ["hunters", "prime", "series"],
  },
];


const CATEGORIES = [
  { id: "all", label: "Tous", icon: Layers },
  { id: "netflix", label: "Netflix", icon: Film },
  { id: "prime", label: "Prime Video", icon: Tv },
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
                          "group relative aspect-square rounded-full overflow-hidden cursor-pointer transition-all duration-150 p-0.5",
                          isSelected
                            ? "ring-3 ring-amber-400 ring-offset-2 ring-offset-[#141414] scale-[1.03] shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                            : "hover:scale-[1.05] hover:ring-2 hover:ring-white/40 ring-1 ring-white/10 bg-zinc-900"
                        )}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-full bg-zinc-950">
                          <ClientImage
                            src={item.url}
                            alt={item.name}
                            width={160}
                            height={160}
                            className={cn("h-full w-full object-cover transition-transform duration-300 group-hover:scale-110", item.category === "anime" && "object-top")}
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
