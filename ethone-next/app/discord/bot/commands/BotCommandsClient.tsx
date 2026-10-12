"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Search,
  Copy,
  Check,
  Sparkles,
  Shield,
  ShieldCheck,
  Music,
  Users,
  Bot,
  Settings,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  LayoutList,
  Layout,
  X,
  Filter,
  Clock,
  Zap,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import { SPRING_PILL, SPRING_PRESS } from "@/lib/ease";
import { pageStagger, staggerItem } from "@/lib/motion-variants";

export interface CommandParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface CommandDefinition {
  name: string;
  syntax: string;
  category: "Général" | "Intelligence Artificielle" | "Modération & Sécurité" | "Musique" | "Administration" | "Communauté & Jeux" | "Support & Outils";
  permission: "Tous" | "Modération" | "Gérer le serveur" | "Gérer les messages" | "Administrateur" | "Tous / DJ" | "Expulser des membres" | "Bannir des membres" | "Gérer les salons" | "Gérer les événements";
  description: string;
  parameters: CommandParameter[];
  example: string;
  cooldown: string;
  embedPreview: {
    title: string;
    description: string;
    fields?: { name: string; value: string; inline?: boolean }[];
  };
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

const COMMANDS_CATALOG: CommandDefinition[] = [
  {
    name: "help",
    syntax: "/help [categorie:string]",
    category: "Général",
    permission: "Tous",
    description: "Affiche le catalogue interactif et multi-pages du serveur avec l'état de chaque module.",
    parameters: [
      { name: "categorie", type: "string", required: false, description: "Filtrer directement l'aide sur une catégorie spécifique" },
    ],
    example: "/help",
    cooldown: "3s",
    embedPreview: {
      title: "Centre d'Aide ETHONE",
      description: "40 commandes disponibles réparties en 7 modules opérationnels.",
      fields: [
        { name: "Documentation", value: "https://ethone.dev/bot", inline: true },
        { name: "Préfixe", value: "Slash (/) ou !", inline: true },
      ],
    },
  },
  {
    name: "ping",
    syntax: "/ping",
    category: "Général",
    permission: "Tous",
    description: "Vérifie la latence de communication du bot et la liaison WebSocket en temps réel.",
    parameters: [],
    example: "/ping",
    cooldown: "3s",
    embedPreview: {
      title: "Latence Réseau Etho",
      description: "Gateway WebSocket : 24ms · API REST Cloudflare : 38ms",
    },
  },
  {
    name: "bot status",
    syntax: "/bot status",
    category: "Général",
    permission: "Tous",
    description: "Affiche l'état technique, l'uptime, l'allocation mémoire et la télémétrie système.",
    parameters: [],
    example: "/bot status",
    cooldown: "5s",
    embedPreview: {
      title: "Télémétrie Système Etho",
      description: "Uptime 99.49% · Shard 0 opérationnel · RAM 142 Mo / 512 Mo",
      fields: [
        { name: "Version", value: "v1.75.8", inline: true },
        { name: "Serveurs", value: "57 actifs", inline: true },
      ],
    },
  },
  {
    name: "bot info",
    syntax: "/bot info",
    category: "Général",
    permission: "Tous",
    description: "Informations détaillées, version de production et accès direct au tableau de bord.",
    parameters: [],
    example: "/bot info",
    cooldown: "5s",
    embedPreview: {
      title: "Etho — Bot Discord Intelligent",
      description: "Écosystème unifié intégrant modération, musique HD, intelligence artificielle et sécurité Keeper.",
    },
  },
  {
    name: "ask",
    syntax: "/ask question:string [prive:bool]",
    category: "Intelligence Artificielle",
    permission: "Tous",
    description: "Pose une question à l'assistant IA avec contexte serveur et option de réponse privée.",
    parameters: [
      { name: "question", type: "string", required: true, description: "Texte de la question ou instruction pour l'IA" },
      { name: "prive", type: "boolean", required: false, description: "Masquer la réponse aux autres membres (éphémère)" },
    ],
    example: "/ask question:Comment activer l'Anti-Raid ? prive:True",
    cooldown: "5s",
    embedPreview: {
      title: "Assistant IA Etho",
      description: "Pour activer l'Anti-Raid, exécutez /antiraid action:toggle ou rendez-vous sur le dashboard dans l'onglet Sécurité.",
    },
  },
  {
    name: "summarize",
    syntax: "/summarize [nombre:5-50]",
    category: "Intelligence Artificielle",
    permission: "Tous",
    description: "Résume les derniers messages échangés dans le salon textuel en une synthèse claire.",
    parameters: [
      { name: "nombre", type: "integer", required: false, description: "Nombre de messages récents à analyser (5 à 50)" },
    ],
    example: "/summarize nombre:25",
    cooldown: "15s",
    embedPreview: {
      title: "Synthèse des Échanges",
      description: "Résumé des 25 derniers messages : organisation du tournoi gaming prévu samedi soir à 21h.",
    },
  },
  {
    name: "imagine",
    syntax: "/imagine prompt:string [style:string] [ratio:string]",
    category: "Intelligence Artificielle",
    permission: "Tous",
    description: "Génération d'images haute fidélité via modèles génératifs avec styles artistiques.",
    parameters: [
      { name: "prompt", type: "string", required: true, description: "Description textuelle détaillée de l'image souhaitée" },
      { name: "style", type: "string", required: false, description: "Cyberpunk, Réaliste, Anime, Minimaliste" },
      { name: "ratio", type: "string", required: false, description: "Format 1:1, 16:9 ou 9:16" },
    ],
    example: "/imagine prompt:neon futuristic server room cyberpunk ratio:16:9",
    cooldown: "20s",
    embedPreview: {
      title: "Rendu Visuel IA Généré",
      description: "Image générée en 2.6s avec le profil haute fidélité.",
    },
  },
  {
    name: "ai-setup",
    syntax: "/ai-setup [salon:channel] [humeur:string] [images:bool] [bannir_mot:string]",
    category: "Administration",
    permission: "Administrateur",
    description: "Configuration du salon IA dédié, personnalité du bot et filtres de sécurité des prompts.",
    parameters: [
      { name: "salon", type: "channel", required: false, description: "Salon textuel où l'IA répond sans préfixe" },
      { name: "humeur", type: "string", required: false, description: "SAGE, GAMER_SARCASTIQUE ou PROTECTEUR" },
      { name: "images", type: "boolean", required: false, description: "Autoriser ou restreindre /imagine aux membres" },
      { name: "bannir_mot", type: "string", required: false, description: "Ajouter un mot-clé prohibé pour l'IA" },
    ],
    example: "/ai-setup salon:#ia-chat humeur:SAGE images:True",
    cooldown: "5s",
    embedPreview: {
      title: "Paramètres IA Enregistrés",
      description: "Salon dédié : #ia-chat · Personnalité : Sage · Génération d'images : Activée",
    },
  },
  {
    name: "settings",
    syntax: "/settings",
    category: "Administration",
    permission: "Gérer le serveur",
    description: "Panneau complet de personnalisation du serveur, couleurs d'embed et confidentialité.",
    parameters: [],
    example: "/settings",
    cooldown: "5s",
    embedPreview: {
      title: "Configuration de Guilde Etho",
      description: "Accédez aux réglages du serveur directement via l'interface interactive.",
    },
  },
  {
    name: "language",
    syntax: "/language [langue:fr|en|es|de]",
    category: "Administration",
    permission: "Gérer le serveur",
    description: "Définit ou consulte la langue officielle du bot pour ce serveur (FR, EN, ES, DE).",
    parameters: [
      { name: "langue", type: "string", required: false, description: "Code ISO de la langue (fr, en, es, de)" },
    ],
    example: "/language langue:fr",
    cooldown: "5s",
    embedPreview: {
      title: "Langue Mise à Jour",
      description: "Toutes les réponses du bot s'afficheront désormais en Français (FR).",
    },
  },
  {
    name: "prefix",
    syntax: "/prefix [nouveau:string]",
    category: "Administration",
    permission: "Gérer le serveur",
    description: "Consulte ou modifie le préfixe textuel pour ce serveur en plus du support Slash.",
    parameters: [
      { name: "nouveau", type: "string", required: false, description: "Nouveau préfixe (1 à 3 caractères, ex: ! ou ?)" },
    ],
    example: "/prefix nouveau:!",
    cooldown: "5s",
    embedPreview: {
      title: "Préfixe de Serveur",
      description: "Le préfixe textuel configuré est désormais \"!\" (ex: !help).",
    },
  },
  {
    name: "permissions",
    syntax: "/permissions [action:analyser|preset_strict|preset_equilibre|preset_communaute]",
    category: "Administration",
    permission: "Administrateur",
    description: "Audit instantané des rôles du serveur et application des présets de sécurité recommandés.",
    parameters: [
      { name: "action", type: "string", required: true, description: "analyser ou nom du preset à déployer" },
    ],
    example: "/permissions action:analyser",
    cooldown: "10s",
    embedPreview: {
      title: "Audit de Sécurité des Rôles",
      description: "14 rôles analysés · 0 permission dangereuse détectée sur les rôles non-staff.",
    },
  },
  {
    name: "verification",
    syntax: "/verification [action:status|toggle|config]",
    category: "Administration",
    permission: "Gérer le serveur",
    description: "Système de vérification anti-bot à l'arrivée des membres avec attribution de rôle automatique.",
    parameters: [
      { name: "action", type: "string", required: true, description: "status, toggle ou config" },
    ],
    example: "/verification action:status",
    cooldown: "5s",
    embedPreview: {
      title: "Porte de Vérification des Nouveaux Membres",
      description: "État : ACTIF · Rôle vérifié : @Membre · Protection anti-selfbot activée.",
    },
  },
  {
    name: "serverstats",
    syntax: "/serverstats [action:add|remove|list|refresh|config]",
    category: "Administration",
    permission: "Gérer le serveur",
    description: "Salons compteurs dynamiques en temps réel (membres, bots, boosts, niveau de serveur).",
    parameters: [
      { name: "action", type: "string", required: true, description: "add, remove, list, refresh ou config" },
    ],
    example: "/serverstats action:list",
    cooldown: "10s",
    embedPreview: {
      title: "Compteurs de Serveur",
      description: "Membres : 18 478 · En Ligne : 4 120 · Boosts : Niveau 3",
    },
  },
  {
    name: "tags",
    syntax: "/tags [action:add|get|list|remove] [nom:string]",
    category: "Administration",
    permission: "Gérer les messages",
    description: "Réponses pré-enregistrées et FAQ réutilisables instantanément dans le chat.",
    parameters: [
      { name: "action", type: "string", required: true, description: "add, get, list ou remove" },
      { name: "nom", type: "string", required: false, description: "Identifiant du tag réutilisable" },
    ],
    example: "/tags action:get nom:faq",
    cooldown: "3s",
    embedPreview: {
      title: "Tag : FAQ",
      description: "Pour obtenir de l'aide sur le serveur, veuillez consulter le salon #reglement ou ouvrir un ticket.",
    },
  },
  {
    name: "play",
    syntax: "/play recherche:string",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Raccourci direct pour lancer une musique ou l'ajouter à la file d'attente.",
    parameters: [
      { name: "recherche", type: "string", required: true, description: "Nom du titre ou lien Spotify, YouTube, SoundCloud" },
    ],
    example: "/play recherche:Lofi beats chill",
    cooldown: "3s",
    embedPreview: {
      title: "Piste Ajoutée à la File",
      description: "Lecture démarrée : Lofi Beats Chill (durée 3:45) · Demandé par @Membre",
    },
  },
  {
    name: "music play",
    syntax: "/music play recherche:string",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Diffusion haute fidélité dans le salon vocal avec sélection de source et égaliseur.",
    parameters: [
      { name: "recherche", type: "string", required: true, description: "Recherche textuelle ou URL directe" },
    ],
    example: "/music play recherche:https://open.spotify.com/track/...",
    cooldown: "3s",
    embedPreview: {
      title: "Diffusion Audio Connectée",
      description: "Connecté au salon Lounge Vocal · Débit 384 kbps Opus.",
    },
  },
  {
    name: "skip",
    syntax: "/skip",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Passe immédiatement au morceau suivant dans la liste d'attente.",
    parameters: [],
    example: "/skip",
    cooldown: "2s",
    embedPreview: {
      title: "Morceau Ignoré",
      description: "Passage au titre suivant dans la file d'attente.",
    },
  },
  {
    name: "pause",
    syntax: "/pause",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Met en pause le flux audio sans interrompre la session vocale.",
    parameters: [],
    example: "/pause",
    cooldown: "2s",
    embedPreview: {
      title: "Lecture en Pause",
      description: "La lecture est suspendue. Utilisez /resume pour continuer.",
    },
  },
  {
    name: "resume",
    syntax: "/resume",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Reprend la lecture du morceau en pause là où elle s'était arrêtée.",
    parameters: [],
    example: "/resume",
    cooldown: "2s",
    embedPreview: {
      title: "Reprise Audio",
      description: "La lecture se poursuit normalement.",
    },
  },
  {
    name: "stop",
    syntax: "/stop",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Arrête la musique, vide la file d'attente et déconnecte le bot du salon vocal.",
    parameters: [],
    example: "/stop",
    cooldown: "3s",
    embedPreview: {
      title: "Arrêt de la Session Audio",
      description: "File vidée et déconnexion effectuée.",
    },
  },
  {
    name: "queue",
    syntax: "/queue [page:int]",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Affiche la file d'attente complète avec pagination et durée estimée.",
    parameters: [
      { name: "page", type: "integer", required: false, description: "Numéro de page de la liste" },
    ],
    example: "/queue page:1",
    cooldown: "3s",
    embedPreview: {
      title: "File d'Attente Musicale",
      description: "5 morceaux programmés · Durée restante estimée : 18 min 30 s",
    },
  },
  {
    name: "nowplaying",
    syntax: "/nowplaying",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Affiche le titre en cours de lecture, l'artiste et la barre de progression dynamique.",
    parameters: [],
    example: "/nowplaying",
    cooldown: "3s",
    embedPreview: {
      title: "En Cours de Diffusion",
      description: "[▶ 02:14 ━━━━━━━━●━━━━━ 04:30] · Qualité HD 384kbps",
    },
  },
  {
    name: "music panel",
    syntax: "/music panel",
    category: "Musique",
    permission: "Tous / DJ",
    description: "Déploie une télécommande interactive complète avec boutons Play, Pause, Skip, Volume.",
    parameters: [],
    example: "/music panel",
    cooldown: "5s",
    embedPreview: {
      title: "Panneau de Contrôle Musique",
      description: "Boutons interactifs déployés avec succès dans le salon.",
    },
  },
  {
    name: "clear",
    syntax: "/clear nombre:1-100 [membre:user]",
    category: "Modération & Sécurité",
    permission: "Gérer les messages",
    description: "Supprime les messages récents du salon avec filtre anti-spam optionnel par utilisateur.",
    parameters: [
      { name: "nombre", type: "integer", required: true, description: "Nombre de messages à supprimer (1 à 100)" },
      { name: "membre", type: "user", required: false, description: "Cibler uniquement les messages de cet utilisateur" },
    ],
    example: "/clear nombre:25",
    cooldown: "5s",
    embedPreview: {
      title: "Purge de Messages Effectuée",
      description: "25 messages ont été supprimés par @Modérateur.",
    },
  },
  {
    name: "warn",
    syntax: "/warn membre:user raison:string",
    category: "Modération & Sécurité",
    permission: "Modération",
    description: "Attribue un avertissement formel consigné dans le casier avec notification privée.",
    parameters: [
      { name: "membre", type: "user", required: true, description: "Utilisateur à avertir" },
      { name: "raison", type: "string", required: true, description: "Motif précis de l'avertissement" },
    ],
    example: "/warn membre:@User raison:Spam textuel répété dans le salon général",
    cooldown: "3s",
    embedPreview: {
      title: "Avertissement Enregistré",
      description: "Avertissement #1 attribué à @User · Motif : Spam textuel répété",
    },
  },
  {
    name: "timeout",
    syntax: "/timeout membre:user duree:string [raison:string]",
    category: "Modération & Sécurité",
    permission: "Modération",
    description: "Exclut temporairement un membre de la parole sur l'ensemble du serveur.",
    parameters: [
      { name: "membre", type: "user", required: true, description: "Utilisateur sanctionné" },
      { name: "duree", type: "string", required: true, description: "Durée (ex: 5m, 1h, 1d, 7d)" },
      { name: "raison", type: "string", required: false, description: "Motif de l'exclusion" },
    ],
    example: "/timeout membre:@User duree:15m raison:Langage provocateur",
    cooldown: "3s",
    embedPreview: {
      title: "Membre Exclu Temporairement",
      description: "@User est réduit au silence pour une durée de 15 minutes.",
    },
  },
  {
    name: "kick",
    syntax: "/kick membre:user [raison:string]",
    category: "Modération & Sécurité",
    permission: "Expulser des membres",
    description: "Expulse un membre du serveur avec notification et motif d'expulsion.",
    parameters: [
      { name: "membre", type: "user", required: true, description: "Utilisateur à expulser" },
      { name: "raison", type: "string", required: false, description: "Motif de l'expulsion" },
    ],
    example: "/kick membre:@User raison:Comportement toxique récurrent",
    cooldown: "5s",
    embedPreview: {
      title: "Expulsion Exécutée",
      description: "@User a été expulsé du serveur avec succès.",
    },
  },
  {
    name: "ban",
    syntax: "/ban membre:user [jours_purge:0-7] [raison:string]",
    category: "Modération & Sécurité",
    permission: "Bannir des membres",
    description: "Bannit définitivement un utilisateur du serveur avec suppression optionnelle de ses messages.",
    parameters: [
      { name: "membre", type: "user", required: true, description: "Utilisateur à bannir" },
      { name: "jours_purge", type: "integer", required: false, description: "Purge des messages des 0 à 7 derniers jours" },
      { name: "raison", type: "string", required: false, description: "Motif officiel du bannissement" },
    ],
    example: "/ban membre:@User jours_purge:1 raison:Tentative de raid coordonné",
    cooldown: "5s",
    embedPreview: {
      title: "Bannissement Définitif",
      description: "@User a été banni du serveur · Messages des dernières 24h supprimés.",
    },
  },
  {
    name: "lock",
    syntax: "/lock [salon:channel] [raison:string]",
    category: "Modération & Sécurité",
    permission: "Gérer les salons",
    description: "Verrouille l'envoi de messages dans le salon pour les membres ordinaires en cas de crise.",
    parameters: [
      { name: "salon", type: "channel", required: false, description: "Salon ciblé (défaut : salon actuel)" },
      { name: "raison", type: "string", required: false, description: "Raison du verrouillage temporaire" },
    ],
    example: "/lock raison:Pause modération suite à un afflux de spam",
    cooldown: "5s",
    embedPreview: {
      title: "Salon Verrouillé",
      description: "L'écriture a été suspendue pour les membres non-staff.",
    },
  },
  {
    name: "antiraid",
    syntax: "/antiraid [action:status|toggle|lockdown]",
    category: "Modération & Sécurité",
    permission: "Administrateur",
    description: "Centre de défense Anti-Raid : détection de flux anormaux, filtrage de nouveaux comptes et mode d'urgence.",
    parameters: [
      { name: "action", type: "string", required: true, description: "status, toggle ou lockdown" },
    ],
    example: "/antiraid action:status",
    cooldown: "5s",
    embedPreview: {
      title: "Bouclier Anti-Raid Etho",
      description: "Statut : ACTIF · Détecteurs actifs : Afflux de comptes, Spam de mentions, Selfbots.",
    },
  },
  {
    name: "automod",
    syntax: "/automod [action:status|rules|toggle]",
    category: "Modération & Sécurité",
    permission: "Administrateur",
    description: "Filtres temps réel automatisés : liens phishing, invitations tierces, grossièretés et mentions @everyone.",
    parameters: [
      { name: "action", type: "string", required: true, description: "status, rules ou toggle" },
    ],
    example: "/automod action:status",
    cooldown: "5s",
    embedPreview: {
      title: "Configuration AutoMod",
      description: "Toutes les protections standard sont actives et synchronisées.",
    },
  },
  {
    name: "sticky",
    syntax: "/sticky [action:set|remove|status] [message:string]",
    category: "Modération & Sécurité",
    permission: "Gérer les messages",
    description: "Épingle un message dynamique qui reste continuellement affiché au bas du salon textuel.",
    parameters: [
      { name: "action", type: "string", required: true, description: "set, remove ou status" },
      { name: "message", type: "string", required: false, description: "Contenu du message à épingler" },
    ],
    example: "/sticky action:set message:Bienvenue ! N'oubliez pas de lire #reglement",
    cooldown: "5s",
    embedPreview: {
      title: "Message Permanent Activé",
      description: "Le message sera automatiquement ré-épinglé après chaque nouvel envoi.",
    },
  },
  {
    name: "ticket",
    syntax: "/ticket [sujet:string]",
    category: "Support & Outils",
    permission: "Tous",
    description: "Ouvre un salon textuel privé d'assistance accessible uniquement par vous et l'équipe staff.",
    parameters: [
      { name: "sujet", type: "string", required: false, description: "Motif sommaire de la demande d'assistance" },
    ],
    example: "/ticket sujet:Question relative au grade VIP",
    cooldown: "10s",
    embedPreview: {
      title: "Ticket Privé Créé",
      description: "Votre salon #ticket-042 a été créé. Un membre de l'équipe va vous répondre.",
    },
  },
  {
    name: "form open",
    syntax: "/form open id:string",
    category: "Support & Outils",
    permission: "Tous",
    description: "Ouvre un formulaire de candidature ou de sondage sous forme de fenêtre modale Discord.",
    parameters: [
      { name: "id", type: "string", required: true, description: "Identifiant du formulaire (ex: recrutement-staff)" },
    ],
    example: "/form open id:recrutement-staff",
    cooldown: "10s",
    embedPreview: {
      title: "Formulaire de Candidature",
      description: "La fenêtre de saisie du formulaire a été transmise avec succès.",
    },
  },
  {
    name: "rank",
    syntax: "/rank [membre:user]",
    category: "Communauté & Jeux",
    permission: "Tous",
    description: "Affiche votre carte visuelle de niveau, XP accumulée, rang et statistiques d'activité.",
    parameters: [
      { name: "membre", type: "user", required: false, description: "Membre dont vous souhaitez consulter le niveau" },
    ],
    example: "/rank",
    cooldown: "5s",
    embedPreview: {
      title: "Carte de Niveau Etho",
      description: "Niveau 18 · Rang #4 du serveur · 5 820 / 6 500 XP (89%)",
    },
  },
  {
    name: "leaderboard",
    syntax: "/leaderboard [type:xp|economy]",
    category: "Communauté & Jeux",
    permission: "Tous",
    description: "Affiche le classement des membres les plus actifs ou les plus riches de la communauté.",
    parameters: [
      { name: "type", type: "string", required: false, description: "xp (niveaux) ou economy (crédits)" },
    ],
    example: "/leaderboard type:xp",
    cooldown: "5s",
    embedPreview: {
      title: "Classement d'Activité du Serveur",
      description: "Top 1: @Alex (Niv 42) · Top 2: @Sarah (Niv 39) · Top 3: @Maxime (Niv 35)",
    },
  },
  {
    name: "giveaway",
    syntax: "/giveaway [duree:string] [gagnants:int] lot:string",
    category: "Communauté & Jeux",
    permission: "Gérer les événements",
    description: "Organise un tirage au sort automatique avec compte à rebours et participation par bouton.",
    parameters: [
      { name: "lot", type: "string", required: true, description: "Description de la récompense à remporter" },
      { name: "duree", type: "string", required: false, description: "Durée du concours (ex: 24h, 3d)" },
      { name: "gagnants", type: "integer", required: false, description: "Nombre de vainqueurs tirés au sort" },
    ],
    example: "/giveaway duree:24h gagnants:1 lot:1 Mois Discord Nitro",
    cooldown: "10s",
    embedPreview: {
      title: "Tirage au Sort Officiel",
      description: "Lot : 1 Mois Discord Nitro · 1 Gagnant · Cliquez sur le bouton pour vous inscrire.",
    },
  },
  {
    name: "poll",
    syntax: "/poll question:string [choix1:string] [choix2:string]",
    category: "Communauté & Jeux",
    permission: "Tous",
    description: "Lance un sondage communautaire interactif en direct avec graphique et vote par boutons.",
    parameters: [
      { name: "question", type: "string", required: true, description: "Intitulé du sondage à soumettre" },
      { name: "choix1", type: "string", required: false, description: "Première option de réponse" },
      { name: "choix2", type: "string", required: false, description: "Deuxième option de réponse" },
    ],
    example: "/poll question:Prochaine session gaming ? choix1:Samedi choix2:Dimanche",
    cooldown: "5s",
    embedPreview: {
      title: "Sondage Communautaire",
      description: "Samedi (68% - 24 votes) █ █ █ █ █ █ ░ ░ · Dimanche (32% - 11 votes) █ █ █ ░ ░ ░",
    },
  },
  {
    name: "economy",
    syntax: "/economy [action:balance|daily|pay|shop|buy]",
    category: "Communauté & Jeux",
    permission: "Tous",
    description: "Système complet d'économie virtuelle : solde, récompenses quotidiennes, transferts et boutique.",
    parameters: [
      { name: "action", type: "string", required: true, description: "balance, daily, pay, shop ou buy" },
    ],
    example: "/economy action:daily",
    cooldown: "5s",
    embedPreview: {
      title: "Crédits ETHONE — Quotidien",
      description: "Vous avez récupéré +250 Crédits ETHONE. Solde actuel : 1 680 Crédits.",
    },
  },
];

type CategoryFilter = "ALL" | "Général" | "Intelligence Artificielle" | "Modération & Sécurité" | "Musique" | "Administration" | "Communauté & Jeux" | "Support & Outils";
type PermissionFilter = "ALL" | "PUBLIC" | "MODERATION" | "ADMIN";
type ViewMode = "GRID" | "SPLIT" | "COMPACT";

export default function BotCommandsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");
  const [selectedCommand, setSelectedCommand] = useState<CommandDefinition | null>(COMMANDS_CATALOG[0]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [telemetryStats, setTelemetryStats] = useState<Map<string, { executions24h: number; avgLatencyMs: number }>>(new Map());

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/bot/commands`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.data || !Array.isArray(data.data)) return;
        const map = new Map<string, { executions24h: number; avgLatencyMs: number }>();
        for (const item of data.data) {
          if (item?.name) {
            map.set(String(item.name).toLowerCase(), {
              executions24h: Number(item.executions24h || 0),
              avgLatencyMs: Number(item.avgLatencyMs || 0),
            });
          }
        }
        setTelemetryStats(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setInspectorOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedName(id);
    setTimeout(() => {
      setCopiedName((prev) => (prev === id ? null : prev));
    }, 2000);
  }, []);

  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^\//, "");
    return COMMANDS_CATALOG.filter((cmd) => {
      if (selectedCategory !== "ALL" && cmd.category !== selectedCategory) return false;

      if (permissionFilter === "PUBLIC" && cmd.permission !== "Tous" && cmd.permission !== "Tous / DJ") return false;
      if (permissionFilter === "MODERATION" && !["Modération", "Gérer les messages", "Expulser des membres", "Bannir des membres", "Gérer les salons"].includes(cmd.permission)) return false;
      if (permissionFilter === "ADMIN" && !["Administrateur", "Gérer le serveur"].includes(cmd.permission)) return false;

      if (!q) return true;

      const inName = cmd.name.toLowerCase().includes(q);
      const inDesc = cmd.description.toLowerCase().includes(q);
      const inSyntax = cmd.syntax.toLowerCase().includes(q);
      const inCategory = cmd.category.toLowerCase().includes(q);
      return inName || inDesc || inSyntax || inCategory;
    });
  }, [searchQuery, selectedCategory, permissionFilter]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: COMMANDS_CATALOG.length };
    for (const c of COMMANDS_CATALOG) {
      map[c.category] = (map[c.category] || 0) + 1;
    }
    return map;
  }, []);

  const openInspector = useCallback((cmd: CommandDefinition) => {
    setSelectedCommand(cmd);
    setInspectorOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-32">
      <div className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/30 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/discord/bot"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all cursor-pointer active:scale-[0.97]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Centre de Contrôle</span>
            </Link>
            <span className="text-[var(--text-muted)]/50">•</span>
            <Link
              href="/discord"
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate"
            >
              Hub Discord
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-raised)]/60 border border-[var(--panel-border)] text-xs font-mono text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>40 Commandes Actives</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-xs font-semibold text-[var(--accent-primary)]">
              <Zap className="w-3 h-3" />
              <span>Format Keeper</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--panel-border)]"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[11px] font-mono font-semibold text-[var(--accent-primary)]">
              <Terminal className="w-3.5 h-3.5" />
              <span>ETHO COMMAND EXPLORER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Catalogue des Commandes
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Explorez l&apos;ensemble des commandes Slash (/) et préfixes d&apos;Etho. Consultez la syntaxe exacte, les permissions requises et simulez les réponses en direct.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] self-start md:self-end">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                viewMode === "GRID"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grille</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("SPLIT")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                viewMode === "SPLIT"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Format Keeper</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("COMPACT")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                viewMode === "COMPACT"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tableau</span>
            </button>
          </div>
        </motion.div>

        <div className="py-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une commande, syntaxe, mot-clé... (appuyez sur /)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--surface-raised)]/70 border border-[var(--panel-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Accès :
              </span>
              {(
                [
                  ["ALL", "Toutes"],
                  ["PUBLIC", "Tout public"],
                  ["MODERATION", "Modération"],
                  ["ADMIN", "Administrateur"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPermissionFilter(val)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-[0.97]",
                    permissionFilter === val
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--panel-border)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pt-1">
            {(
              [
                ["ALL", "Toutes"],
                ["Général", "Général"],
                ["Modération & Sécurité", "Modération & Sécurité"],
                ["Musique", "Musique"],
                ["Intelligence Artificielle", "IA"],
                ["Administration", "Administration"],
                ["Communauté & Jeux", "Communauté & Jeux"],
                ["Support & Outils", "Support"],
              ] as const
            ).map(([val, label]) => {
              const isSelected = selectedCategory === val;
              const count = categoryCounts[val] || 0;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedCategory(val)}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer outline-none active:scale-[0.97]",
                    isSelected
                      ? "text-[var(--accent-contrast)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/60"
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="keeper-category-pill"
                      transition={SPRING_PILL}
                      className="absolute inset-0 -z-10 rounded-xl bg-[var(--accent-primary)] shadow-sm"
                    />
                  )}
                  <span>{label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      isSelected
                        ? "bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)] font-bold"
                        : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredCommands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 p-8">
            <Terminal className="w-10 h-10 text-[var(--text-muted)] mb-3" />
            <p className="text-base font-bold text-[var(--text-primary)]">Aucune commande trouvée</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
              Aucune commande ne correspond aux filtres actuels ou à votre recherche &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setPermissionFilter("ALL");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold cursor-pointer active:scale-[0.97]"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : viewMode === "GRID" ? (
          <motion.div
            variants={pageStagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredCommands.map((cmd) => {
              const statKey = cmd.name.split(" ")[0].toLowerCase();
              const telemetry = telemetryStats.get(statKey);
              const isCopied = copiedName === cmd.name;

              return (
                <motion.div
                  key={cmd.name}
                  variants={staggerItem}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  onClick={() => openInspector(cmd)}
                  className="group relative rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 hover:border-[var(--accent-primary)]/40 p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-mono font-bold text-xs truncate">
                          /{cmd.name}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                            cmd.permission === "Administrateur"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                              : cmd.permission === "Gérer le serveur" || cmd.permission === "Modération" || cmd.permission === "Gérer les messages"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          )}
                        >
                          {cmd.permission}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(`/${cmd.name}`, cmd.name);
                          }}
                          title="Copier la commande"
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                      {cmd.description}
                    </p>

                    <div className="p-2 rounded-lg bg-[var(--bg-main)]/60 border border-[var(--panel-border)]/60 font-mono text-[11px] text-[var(--text-muted)] truncate">
                      {cmd.syntax}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--panel-border)]/80 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-muted)]">{cmd.category}</span>
                    {telemetry && telemetry.executions24h > 0 ? (
                      <span className="font-mono text-[var(--accent-primary)] font-semibold">
                        {telemetry.executions24h}× / 24h · {telemetry.avgLatencyMs}ms
                      </span>
                    ) : (
                      <span className="font-mono text-[var(--text-muted)]/70">Cooldown : {cmd.cooldown}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : viewMode === "SPLIT" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 max-h-[750px] overflow-y-auto space-y-1.5 scrollbar-thin">
              {filteredCommands.map((cmd) => {
                const isSelected = selectedCommand?.name === cmd.name;
                return (
                  <button
                    key={cmd.name}
                    type="button"
                    onClick={() => setSelectedCommand(cmd)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer",
                      isSelected
                        ? "bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--text-primary)]"
                        : "hover:bg-[var(--surface-raised)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <code className={cn("font-mono font-bold text-xs", isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]")}>
                          /{cmd.name}
                        </code>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-raised)] border border-[var(--panel-border)] text-[var(--text-muted)]">
                          {cmd.permission}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{cmd.description}</p>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isSelected ? "text-[var(--accent-primary)] translate-x-1" : "text-[var(--text-muted)]")} />
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7 sticky top-20">
              {selectedCommand ? (
                <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-6 space-y-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xl font-mono font-bold text-[var(--accent-primary)]">
                          /{selectedCommand.name}
                        </code>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                          {selectedCommand.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{selectedCommand.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(`/${selectedCommand.name}`, selectedCommand.name)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
                    >
                      {copiedName === selectedCommand.name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedName === selectedCommand.name ? "Copié !" : "Copier"}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Syntaxe Complète</span>
                    <div className="p-3.5 rounded-xl bg-[var(--bg-main)] border border-[var(--panel-border)] font-mono text-xs text-emerald-400 flex items-center justify-between gap-3">
                      <span className="truncate">{selectedCommand.syntax}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedCommand.syntax, "syntax")}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Copier la syntaxe"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Paramètres & Arguments</span>
                    {selectedCommand.parameters.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic p-3 rounded-xl bg-[var(--bg-main)]/40 border border-[var(--panel-border)]/50">
                        Aucun argument requis. Exécution directe sans paramètre.
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--panel-border)] rounded-xl border border-[var(--panel-border)] overflow-hidden bg-[var(--bg-main)]/40 text-xs">
                        {selectedCommand.parameters.map((p) => (
                          <div key={p.name} className="p-3 flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-bold text-[var(--text-primary)]">{p.name}</code>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]">
                                  {p.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)]">{p.description}</p>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0",
                                p.required ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                              )}
                            >
                              {p.required ? "Requis" : "Optionnel"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Simulateur Réponse Discord</span>
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#1e1f22] text-[#dbdee1] space-y-3 font-sans shadow-md">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] font-bold text-xs">
                          E
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">Etho</span>
                            <span className="px-1 py-0.2 rounded bg-[#5865f2] text-[10px] font-bold text-white uppercase tracking-wider">
                              BOT
                            </span>
                          </div>
                          <span className="text-[10px] text-[#949ba4]">Aujourd&apos;hui à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div className="border-l-4 border-[var(--accent-primary)] bg-[#1e1f22] p-3 rounded-r-lg space-y-2 text-xs">
                        <h4 className="font-bold text-white text-sm">{selectedCommand.embedPreview.title}</h4>
                        <p className="text-[#dbdee1] text-xs leading-relaxed">{selectedCommand.embedPreview.description}</p>
                        {selectedCommand.embedPreview.fields && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                            {selectedCommand.embedPreview.fields.map((f) => (
                              <div key={f.name} className="space-y-0.5">
                                <span className="font-bold text-[#949ba4] text-[10px] block">{f.name}</span>
                                <span className="text-white text-xs block font-mono">{f.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--panel-border)] overflow-hidden bg-[var(--surface-raised)]/30 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/70 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Commande</th>
                    <th className="py-3 px-4">Syntaxe Complète</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--panel-border)]">
                  {filteredCommands.map((cmd) => {
                    const isCopied = copiedName === cmd.name;
                    return (
                      <tr
                        key={cmd.name}
                        onClick={() => openInspector(cmd)}
                        className="hover:bg-[var(--surface-hover)]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[var(--accent-primary)]">
                          /{cmd.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-muted)] max-w-xs truncate">
                          {cmd.syntax}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          {cmd.category}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold border",
                              cmd.permission === "Administrateur"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                                : cmd.permission === "Gérer le serveur" || cmd.permission === "Modération"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            )}
                          >
                            {cmd.permission}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(`/${cmd.name}`, cmd.name);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--panel-border)] text-xs font-semibold inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? "Copié" : "Copier"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {inspectorOpen && selectedCommand && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectorOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-6 space-y-6 shadow-2xl z-10 my-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-mono font-bold text-[var(--accent-primary)]">
                      /{selectedCommand.name}
                    </code>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                      {selectedCommand.category}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">{selectedCommand.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Syntaxe d&apos;Exécution</span>
                <div className="p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--panel-border)] font-mono text-xs text-emerald-400 flex items-center justify-between gap-3">
                  <span className="truncate">{selectedCommand.syntax}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedCommand.syntax, "modal-syntax")}
                    className="p-1.5 rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Copier la commande"
                  >
                    {copiedName === "modal-syntax" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Paramètres & Arguments</span>
                {selectedCommand.parameters.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic p-3 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)]/50">
                    Aucun argument requis. Exécution directe sans paramètre.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--panel-border)] rounded-xl border border-[var(--panel-border)] overflow-hidden bg-[var(--surface-raised)]/40 text-xs">
                    {selectedCommand.parameters.map((p) => (
                      <div key={p.name} className="p-3 flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-[var(--text-primary)]">{p.name}</code>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--panel-border)]">
                              {p.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)]">{p.description}</p>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0",
                            p.required ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                          )}
                        >
                          {p.required ? "Requis" : "Optionnel"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Aperçu Réponse Discord</span>
                <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#1e1f22] text-[#dbdee1] space-y-3 font-sans shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-contrast)] font-bold text-xs">
                      E
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">Etho</span>
                        <span className="px-1 py-0.2 rounded bg-[#5865f2] text-[10px] font-bold text-white uppercase tracking-wider">
                          BOT
                        </span>
                      </div>
                      <span className="text-[10px] text-[#949ba4]">Aperçu simulation</span>
                    </div>
                  </div>

                  <div className="border-l-4 border-[var(--accent-primary)] bg-[#1e1f22] p-3 rounded-r-lg space-y-2 text-xs">
                    <h4 className="font-bold text-white text-sm">{selectedCommand.embedPreview.title}</h4>
                    <p className="text-[#dbdee1] text-xs leading-relaxed">{selectedCommand.embedPreview.description}</p>
                    {selectedCommand.embedPreview.fields && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        {selectedCommand.embedPreview.fields.map((f) => (
                          <div key={f.name} className="space-y-0.5">
                            <span className="font-bold text-[#949ba4] text-[10px] block">{f.name}</span>
                            <span className="text-white text-xs block font-mono">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--panel-border)]">
                <span>Raccourci : <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--panel-border)] font-mono text-[10px]">Échap</kbd> pour fermer</span>
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--panel-border)] font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
