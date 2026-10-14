"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import {
  ShieldCheck,
  ExternalLink,
  Heart,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
} from "@/components/icons/ph";
import GameBrandIcon from "@/components/GameBrandIcon";

export interface RiotAttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn?: boolean;
}

const getAttributionItems = (isEn: boolean) => [
  {
    id: "valorant-api",
    name: "Valorant-API.com",
    url: "https://valorant-api.com/",
    badge: isEn ? "Assets & Media" : "Assets & Médias",
    tagColor: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    description: isEn
      ? "Community-driven, open-source API providing complete VALORANT visual metadata: maps, weapons, skins, agents, abilities, player cards, and official rank emblems."
      : "API communautaire non-officielle et open source fournissant l'intégralité des métadonnées visuelles de VALORANT : cartes, armes, skins, agents, capacités, bannières et icônes de rangs officiels.",
    contribution: isEn
      ? "Provides agent artwork, ability icons, and map backgrounds rendered across dashboard overviews and match summaries."
      : "Fournit les illustrations d'agents, icônes d'aptitudes et fonds de cartes affichés sur le tableau de bord et les fiches de match.",
  },
  {
    id: "henrikdev",
    name: "HenrikDev VALORANT API",
    url: "https://docs.henrikdev.xyz/",
    badge: isEn ? "Matches & Telemetry" : "Matchs & Télémétrie",
    tagColor: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    description: isEn
      ? "Provider of game match histories, round-by-round statistics, and competitive ladder data for VALORANT."
      : "Fournisseur d'historiques de parties, statistiques de rounds et données de classement compétitif en temps différé pour la scène compétitive de VALORANT.",
    contribution: isEn
      ? "Powers post-match duel telemetry, K/D ratios, average damage per round (ADR), and official competitive rank badges (RR)."
      : "Alimente la télémétrie de duel post-match, le ratio K/D, le calcul de dégâts par manche (ADR) et l'affichage des rangs compétitifs officiels (RR).",
  },
  {
    id: "riot-developer",
    name: "Riot Games Developer Portal",
    url: "https://developer.riotgames.com/",
    badge: isEn ? "Official Riot Portal" : "Portail Officiel Riot",
    tagColor: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    description: isEn
      ? "Official Riot Games gateway and documentation for League of Legends, Teamfight Tactics APIs, and Riot Sign On (RSO OAuth 2.0 PKCE)."
      : "Documentation et passerelle officielle de Riot Games pour l'API League of Legends, Teamfight Tactics et le protocole d'authentification Riot Sign On (RSO OAuth 2.0 PKCE).",
    contribution: isEn
      ? "Governs player consent specifications, LoL/TFT match history streams, and developer guidelines compliance."
      : "Régit les spécifications de consentement joueur, les flux d'historiques LoL/TFT et le cadre de conformité aux directives développeur.",
  },
  {
    id: "data-dragon",
    name: "Riot Games Data Dragon",
    url: "https://developer.riotgames.com/docs/lol#data-dragon",
    badge: isEn ? "Official Static CDN" : "CDN Statut Officiel",
    tagColor: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    description: isEn
      ? "Static CDN hosted by Riot Games containing champion, item, summoner spell, and profile icons for League of Legends."
      : "CDN statique hébergé par Riot Games contenant les icônes de champions, d'objets, de sorts d'invocateurs et de profils pour League of Legends.",
    contribution: isEn
      ? "Used to load champion and item sprites with zero latency across LoL match history views."
      : "Utilisé pour charger sans latence les miniatures de champions et items dans l'historique des matchs LoL.",
  },
];

export default function RiotAttributionModal({
  isOpen,
  onClose,
  isEn,
}: RiotAttributionModalProps) {
  const { success } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const isEnglish = typeof isEn === "boolean"
    ? isEn
    : (typeof window !== "undefined" ? (localStorage.getItem("ethone:tracker:language") ?? "en") !== "fr" : true);

  const attributionItems = getAttributionItems(isEnglish);

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
      description={isEnglish ? "Data source transparency, intellectual property compliance, and Riot Games policy." : "Transparence des sources de données, respect de la propriété intellectuelle et politique Riot Games."}
      size="lg"
      hideFooter
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/30 via-[var(--surface-raised)]/60 to-transparent p-4 backdrop-blur-md space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{isEnglish ? "Official Riot Games Policy · Legal Jibber Jabber" : "Politique Officielle Riot Games · Legal Jibber Jabber"}</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed italic border-l-2 border-amber-400/60 pl-3">
            « ETHONE isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. »
          </p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {isEnglish
              ? "ETHONE is an independent software solution. VALORANT, League of Legends, Teamfight Tactics, and Riot Games are registered trademarks of Riot Games, Inc. No commercial affiliation or endorsement exists with Riot Games."
              : "ETHONE est une solution logicielle indépendante. VALORANT, League of Legends, Teamfight Tactics et Riot Games sont des marques déposées de Riot Games, Inc. Aucune affiliation commerciale ni sponsorisation n'existe avec Riot Games."}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] px-0.5">
            <span className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span>{isEnglish ? "Third-Party APIs & Community Contributions" : "APIs Tierces & Contributions Communautaires"}</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {isEnglish ? "4 integrated providers" : "4 fournisseurs intégrés"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {attributionItems.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/40 p-3.5 transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-raised)]/70 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--background)] border border-[var(--panel-border)] shrink-0">
                      <GameBrandIcon name="Valorant" className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.name}
                      </h4>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>{item.url}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${item.tagColor}`}
                    >
                      {item.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.url)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title={isEnglish ? "Copy URL" : "Copier l'URL"}
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
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-2 text-[11px] font-medium text-[var(--text-primary)] hover:border-rose-500/40 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <span>{isEnglish ? "Visit" : "Visiter"}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {item.description}
                </p>

                <div className="rounded-lg bg-[var(--background)]/60 px-2.5 py-1.5 border border-[var(--panel-border)]/40 text-[10px] text-[var(--text-muted)] flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[var(--text-primary)]">{isEnglish ? "Usage: " : "Utilisation : "}</strong>
                    {item.contribution}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--panel-border)]/50 bg-[var(--background)]/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              {isEnglish
                ? "Strict compliance with Riot Vanguard anti-cheat and Fair-Play policies: no client memory reading, no aim assistance, post-match telemetry analysis only."
                : "Respect strict de l'anti-triche Riot Vanguard et du Fair-Play : aucune lecture de mémoire client, aucune aide de visée, uniquement de l'analyse post-match."}
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onClose}
            className="shrink-0 self-end sm:self-auto cursor-pointer"
          >
            {isEnglish ? "Close" : "Fermer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
