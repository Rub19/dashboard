"use client";

import { useState, useMemo, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import {
  ShieldCheck,
  ExternalLink,
  Heart,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Globe,
} from "@/components/icons/ph";
import GameBrandIcon from "@/components/GameBrandIcon";
import { cn } from "@/lib/utils";

export interface RiotAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn?: boolean;
}

interface AttributionItem {
  id: string;
  name: string;
  game: string;
  url: string;
  badge: string;
  tagColor: string;
  description: string;
  contribution: string;
}

const getAttributionItems = (isEn: boolean): AttributionItem[] => [
  {
    id: "valorant-api",
    name: "Valorant-API.com",
    game: "valorant",
    url: "https://valorant-api.com/",
    badge: isEn ? "Assets & Media" : "Assets & Médias",
    tagColor: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    description: isEn
      ? "Community-driven, open-source API providing complete VALORANT visual metadata: maps, weapons, skins, agents, abilities, player cards, and official rank emblems."
      : "API communautaire open-source fournissant l'intégralité des métadonnées visuelles de VALORANT : cartes, armes, skins, agents, capacités, bannières et icônes de rangs officiels.",
    contribution: isEn
      ? "Supplies high-resolution agent artwork, ability icons, and map backdrops rendered across the dashboard and match summaries."
      : "Fournit les illustrations haute résolution des agents, icônes d'aptitudes et fonds de cartes affichés sur le tableau de bord et les fiches de match.",
  },
  {
    id: "henrikdev",
    name: "HenrikDev VALORANT API",
    game: "valorant",
    url: "https://docs.henrikdev.xyz/",
    badge: isEn ? "Matches & Telemetry" : "Matchs & Télémétrie",
    tagColor: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    description: isEn
      ? "Premier community provider for match histories, round-by-round performance data, and competitive leaderboards for VALORANT."
      : "Fournisseur d'historiques de parties, statistiques de rounds et données de classement compétitif pour la scène VALORANT.",
    contribution: isEn
      ? "Powers post-match combat telemetry, K/D ratios, average damage per round (ADR), and live RR competitive rank tracking."
      : "Alimente la télémétrie de duel post-match, le ratio K/D, le calcul de dégâts par manche (ADR) et l'affichage des rangs compétitifs officiels (RR).",
  },
  {
    id: "riot-developer",
    name: "Riot Games Developer Portal",
    game: "lol",
    url: "https://developer.riotgames.com/",
    badge: isEn ? "Official Riot Portal" : "Portail Officiel Riot",
    tagColor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    description: isEn
      ? "Official gateway and technical documentation for League of Legends, Teamfight Tactics APIs, and Riot Sign On (RSO OAuth 2.0 PKCE)."
      : "Documentation et passerelle officielle de Riot Games pour l'API League of Legends, Teamfight Tactics et le protocole d'authentification Riot Sign On (RSO OAuth 2.0 PKCE).",
    contribution: isEn
      ? "Governs player consent specifications, match data ingestion protocols, and adherence to Riot developer compliance policies."
      : "Régit les spécifications de consentement joueur, les flux d'historiques LoL/TFT et le cadre de conformité aux directives développeur.",
  },
  {
    id: "data-dragon",
    name: "Riot Games Data Dragon",
    game: "lol",
    url: "https://developer.riotgames.com/docs/lol#data-dragon",
    badge: isEn ? "Official Static CDN" : "CDN Statut Officiel",
    tagColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    description: isEn
      ? "High-speed static CDN hosted by Riot Games providing champion sprites, item icons, summoner spells, and profile assets for League of Legends."
      : "CDN statique hébergé par Riot Games contenant les icônes de champions, d'objets, de sorts d'invocateurs et de profils pour League of Legends.",
    contribution: isEn
      ? "Loads optimized champion thumbnails and in-game item sprites with zero latency across match history views."
      : "Permet de charger sans latence les miniatures de champions et items dans l'historique des matchs LoL.",
  },
];

export default function RiotAttributionModal({
  isOpen,
  onClose,
  isEn,
}: RiotAttributionModalProps) {
  const { success } = useToast();
  const { settings } = useSettings();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [localLangOverride, setLocalLangOverride] = useState<"en" | "fr" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleLangEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang?: string }>;
      const l = customEvent.detail?.lang;
      if (l === "en" || l === "fr") {
        setLocalLangOverride(l);
      }
    };
    window.addEventListener("ethone:tracker:lang-change", handleLangEvent);
    return () => window.removeEventListener("ethone:tracker:lang-change", handleLangEvent);
  }, []);

  const isEnglish = useMemo(() => {
    if (localLangOverride) return localLangOverride === "en";
    if (typeof isEn === "boolean") return isEn;
    if (typeof window !== "undefined") {
      try {
        const sp = new URLSearchParams(window.location.search);
        const urlLang = sp.get("lang");
        if (urlLang === "en") return true;
        if (urlLang === "fr") return false;
        const stored = localStorage.getItem("ethone:tracker:language");
        if (stored === "en") return true;
        if (stored === "fr") return false;
      } catch {}
    }
    if (settings?.language?.startsWith("fr")) return false;
    return true;
  }, [localLangOverride, isEn, settings?.language]);

  const attributionItems = useMemo(() => getAttributionItems(isEnglish), [isEnglish]);

  const handleToggleLang = (lang: "en" | "fr") => {
    setLocalLangOverride(lang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ethone:tracker:language", lang);
        window.dispatchEvent(new CustomEvent("ethone:tracker:lang-change", { detail: { lang } }));
      } catch {}
    }
  };

  const handleCopy = (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      success(isEnglish ? "Link copied to clipboard" : "Lien copié dans le presse-papier");
      setTimeout(() => setCopiedUrl(null), 1800);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEnglish ? "Attributions, Contributions & Legal Notices" : "Attributions, Contributions & Mentions Légales"}
      description={
        isEnglish
          ? "Data source transparency, intellectual property compliance, and Riot Games policy."
          : "Transparence des sources de données, respect de la propriété intellectuelle et politique Riot Games."
      }
      size="lg"
      hideFooter
      className="!rounded-3xl border border-white/[0.12] bg-[#121319]/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto os-scroll"
      contentClassName="space-y-4 pt-1"
    >
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
          <Globe className="h-3.5 w-3.5 text-neutral-400" />
          <span>{isEnglish ? "Language" : "Langue"}</span>
        </div>
        <div className="inline-flex items-center rounded-full bg-white/[0.06] p-0.5 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => handleToggleLang("en")}
            className={cn(
              "px-3 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer",
              isEnglish ? "bg-white text-black shadow-xs" : "text-neutral-400 hover:text-white"
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => handleToggleLang("fr")}
            className={cn(
              "px-3 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer",
              !isEnglish ? "bg-white text-black shadow-xs" : "text-neutral-400 hover:text-white"
            )}
          >
            FR
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-5 backdrop-blur-xl space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{isEnglish ? "Official Riot Games Policy · Legal Jibber Jabber" : "Politique Officielle Riot Games · Legal Jibber Jabber"}</span>
        </div>
        <blockquote className="text-xs text-neutral-200 leading-relaxed italic pl-3.5 border-l-2 border-amber-400/50 bg-black/25 rounded-r-xl py-2.5 pr-3 font-normal">
          {isEnglish
            ? "« ETHONE isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. »"
            : "« ETHONE n'est pas approuvé par Riot Games et ne reflète pas les vues ou les opinions de Riot Games ou de toute personne officiellement impliquée dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques ou des marques déposées de Riot Games, Inc. »"}
        </blockquote>
        <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed font-normal">
          {isEnglish
            ? "ETHONE is an independent gaming software solution. VALORANT, League of Legends, Teamfight Tactics, and Riot Games are registered trademarks of Riot Games, Inc. No commercial affiliation, endorsement, or sponsorship exists with Riot Games."
            : "ETHONE est une solution logicielle indépendante. VALORANT, League of Legends, Teamfight Tactics et Riot Games sont des marques déposées de Riot Games, Inc. Aucune affiliation commerciale ni sponsorisation n'existe avec Riot Games."}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-neutral-300 px-0.5">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            <span>{isEnglish ? "Third-Party APIs & Community Contributions" : "APIs Tierces & Contributions Communautaires"}</span>
          </span>
          <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 text-[10px] font-mono text-neutral-400">
            {isEnglish ? "4 integrated providers" : "4 fournisseurs intégrés"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {attributionItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/[0.14] p-4 sm:p-5 transition-all shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0 shadow-inner">
                    <GameBrandIcon name={item.game} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white tracking-tight truncate">
                      {item.name}
                    </h4>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors mt-0.5"
                    >
                      <span>{item.url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      item.tagColor
                    )}
                  >
                    {item.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.url)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                    title={isEnglish ? "Copy link" : "Copier le lien"}
                    aria-label={isEnglish ? `Copy ${item.name} link` : `Copier le lien ${item.name}`}
                  >
                    {copiedUrl === item.url ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.08] hover:bg-white/[0.16] px-3.5 text-xs font-medium text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span>{isEnglish ? "Visit" : "Visiter"}</span>
                    <ExternalLink className="h-3 w-3 text-neutral-300" />
                  </a>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                {item.description}
              </p>

              <div className="rounded-xl bg-black/25 border border-white/[0.05] p-3 text-xs text-neutral-300 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">{isEnglish ? "Usage in ETHONE : " : "Utilisation dans ETHONE : "}</span>
                  <span>{item.contribution}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="leading-relaxed">
            {isEnglish
              ? "Strict compliance with Riot Vanguard anti-cheat and Fair-Play policies: zero client memory reading, no aim assistance, post-match telemetry only."
              : "Respect strict de l'anti-triche Riot Vanguard et du Fair-Play : aucune lecture de mémoire client, aucune aide de visée, uniquement de l'analyse post-match."}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
        >
          {isEnglish ? "Done" : "Fermer"}
        </button>
      </div>
    </Modal>
  );
}
