import botDocs from "./botDocs.json";

export interface DocGuide {
  id: string;
  title: string;
  description: string;
  category: "guides" | "security";
  readTime: string;
  commandSnippet?: string;
  steps?: { step: number; title: string; content: string }[];
  content: string[];
}

export interface DocModule {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  behaviour: string;
  aftermath: string | null;
  recommended: boolean;
  lockdownAdvised: boolean;
  commandSnippet: string;
}

export interface ModuleCategoryGroup {
  id: string;
  label: string;
  count: number;
  modules: DocModule[];
}

export interface DocCommand {
  name: string;
  syntax: string;
  category: string;
  description: string;
  permissions: string[];
  subcommands: { name: string; syntax: string; description: string }[];
}

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const DOC_COMMANDS: DocCommand[] = botDocs.commands;

const COMMAND_CATEGORY_ORDER = ["Sécurité", "Modération", "Administration", "Communauté", "Musique", "Économie", "Jeux", "Fun", "Utilitaires", "Vocal", "Général"];

export const DOC_COMMAND_CATEGORIES: string[] = [
  "Toutes",
  ...COMMAND_CATEGORY_ORDER.filter((c) => DOC_COMMANDS.some((cmd) => cmd.category === c)),
  ...Array.from(new Set(DOC_COMMANDS.map((cmd) => cmd.category))).filter((c) => !COMMAND_CATEGORY_ORDER.includes(c)),
];

export const MODULE_CATEGORIES: ModuleCategoryGroup[] = botDocs.protectionCategories
  .map((label) => {
    const modules = botDocs.protections
      .filter((p) => p.category === label)
      .map((p) => ({
        id: p.key,
        name: p.label,
        category: slug(label),
        categoryLabel: label,
        description: p.description,
        behaviour: p.behaviour,
        aftermath: p.aftermath,
        recommended: p.recommended,
        lockdownAdvised: p.lockdownAdvised,
        commandSnippet: `/protection voir protection:${p.key}`,
      }));
    return { id: slug(label), label, count: modules.length, modules };
  })
  .filter((c) => c.count > 0);

export const PROTECTION_COUNT = botDocs.protections.length;

export const STEP_BY_STEP_GUIDES: DocGuide[] = [
  {
    id: "bien-demarrer",
    title: "Bien démarrer",
    description: "Inviter Etho, placer son rôle au bon endroit et choisir les modules à activer.",
    category: "guides",
    readTime: "3 min",
    commandSnippet: "/setup modules",
    steps: [
      { step: 1, title: "Inviter le bot", content: "Ajoute Etho depuis la page /bot. Seule la personne qui l'invite reçoit un message de bienvenue en privé ; personne d'autre n'est contacté." },
      { step: 2, title: "Placer le rôle d'Etho", content: "Dans Paramètres du serveur > Rôles, monte le rôle d'Etho au-dessus des rôles de ton équipe. Etho ne peut agir que sur les rôles placés sous le sien." },
      { step: 3, title: "Activer les modules", content: "Lance /setup modules sur Discord, ou ouvre la console sur ethone.dev/discord et active les modules qui t'intéressent." }
    ],
    content: [
      "Sur un nouveau serveur, tous les modules sont désactivés : Etho ne fait rien tant que tu n'en as pas activé un.",
      "Si Etho est retiré du serveur, sa configuration pour ce serveur est effacée.",
      "La langue du bot se règle avec /language (français, anglais, espagnol ou allemand)."
    ]
  },
  {
    id: "configurer-les-protections",
    title: "Configurer les protections",
    description: `Activer les ${PROTECTION_COUNT} protections, choisir la sanction et le seuil de chacune.`,
    category: "guides",
    readTime: "4 min",
    commandSnippet: "/protection liste",
    steps: [
      { step: 1, title: "Voir l'état", content: "/protection liste affiche chaque protection et si elle est active. /protection voir explique ce qu'elle fait avec tes réglages." },
      { step: 2, title: "Activer", content: "/protection activer <protection>. Dans la console, la page Protections permet aussi de tout activer par catégorie." },
      { step: 3, title: "Sanction et seuil", content: "/protection punition choisit la sanction (aucune, timeout, retrait des rôles, expulsion, bannissement). /protection seuil règle combien d'actions sont tolérées et en combien de temps." },
      { step: 4, title: "Salon d'alerte", content: "/protection salon indique où Etho prévient l'équipe quand une protection se déclenche." }
    ],
    content: [
      "Quand tu actives le module Protections sans rien de configuré, Etho allume une base recommandée : anti-ban, anti-kick, anti-suppression de salon et de rôle, anti-ajout de rôle, anti-bot, anti-webhook, anti-spam, anti-mention @everyone et anti-token grab.",
      "Toutes les protections sont gratuites : Etho n'a ni abonnement ni option payante."
    ]
  },
  {
    id: "qui-est-protege",
    title: "Whitelist et exceptions",
    description: "Qui est ignoré par les protections, et comment faire confiance à un bot.",
    category: "guides",
    readTime: "2 min",
    commandSnippet: "/antiraid trustbot",
    content: [
      "Le propriétaire du serveur n'est jamais sanctionné par Etho.",
      "Les membres et rôles ajoutés à la whitelist (console > Whitelist) sont ignorés. Pour une protection donnée, tu peux leur fixer une « limite de whitelist » : un seuil plus haut au lieu d'une exemption totale.",
      "Certaines protections acceptent aussi des salons ou catégories exemptés.",
      "Pour qu'un bot de confiance ne déclenche pas l'anti-bot, ajoute-le avec /antiraid trustbot."
    ]
  },
  {
    id: "logs-du-serveur",
    title: "Configurer les logs",
    description: "Envoyer les journaux du serveur dans un ou plusieurs salons.",
    category: "guides",
    readTime: "2 min",
    commandSnippet: "/logs channel",
    steps: [
      { step: 1, title: "Mise en route rapide", content: "/logs channel <salon> envoie tous les logs dans un seul salon." },
      { step: 2, title: "Un salon par catégorie", content: "/logs route <catégorie> [salon] sépare une catégorie (modération, messages, membres…) dans son propre salon." },
      { step: 3, title: "Niveau de détail", content: "/logs verbosite règle chaque catégorie : tout, important, critique seulement, ou rien." }
    ],
    content: [
      "/logs setup ouvre un panneau guidé, /logs status affiche la configuration actuelle et /logs retention choisit combien de temps l'historique est gardé.",
      "/logs disable coupe les journaux sans perdre ta configuration."
    ]
  },
  {
    id: "automod",
    title: "AutoMod d'Etho et AutoMod de Discord",
    description: "Deux couches complémentaires contre le spam et les messages interdits.",
    category: "guides",
    readTime: "3 min",
    commandSnippet: "/automod-native preset",
    content: [
      "/automod-native preset crée sur ton serveur les règles AutoMod de Discord recommandées (langage, spam, mentions). Elles sont appliquées par Discord lui-même, même si Etho est hors ligne. /automod-native list les affiche.",
      "/automod status montre l'AutoMod d'Etho, /automod toggle l'active ou coupe un détecteur précis, et /automod test vérifie un message sans sanctionner personne.",
      "Les protections de la catégorie Messages (anti-lien, anti-spam, anti-mention, anti-toxicité…) se règlent avec /protection."
    ]
  },
  {
    id: "dashboard-web",
    title: "La console sur le site",
    description: "Tout régler depuis ethone.dev/discord, sans taper de commande.",
    category: "guides",
    readTime: "2 min",
    content: [
      "Connecte-toi avec Discord sur ethone.dev/discord, puis choisis ton serveur : seuls les serveurs que tu gères apparaissent.",
      "Chaque module a sa page : protections, AutoMod, sanctions, bienvenue, rôles automatiques, logs, tickets, niveaux, économie, musique, sauvegardes…",
      "Les réglages faits dans la console et ceux faits par commande sont les mêmes : changer l'un met l'autre à jour."
    ]
  }
];

export const PRACTICAL_SECURITY_GUIDES: DocGuide[] = [
  {
    id: "raid-en-cours-agir-maintenant",
    title: "Un raid est en cours",
    description: "Des dizaines de comptes arrivent et spamment : ce qu'il faut faire tout de suite.",
    category: "security",
    readTime: "2 min",
    commandSnippet: "/antiraid raidmode activer:True",
    steps: [
      { step: 1, title: "Mode raid", content: "/antiraid raidmode activer:True passe le serveur en mode raid d'urgence ; selon ta configuration, Etho verrouille aussi les salons." },
      { step: 2, title: "Verrouiller les salons", content: "/antiraid lockdown activer:True ferme l'écriture dans les salons textuels si ce n'est pas déjà fait." },
      { step: 3, title: "Suivre l'attaque", content: "/antiraid status affiche l'état et le score de risque du serveur." },
      { step: 4, title: "Revenir à la normale", content: "Une fois le calme revenu, /antiraid raidmode activer:False puis /antiraid lockdown activer:False rouvrent les salons." }
    ],
    content: [
      "Pour la suite : active la vérification des nouveaux membres (/verification toggle) et l'anti-alt, qui refuse les comptes Discord trop récents."
    ]
  },
  {
    id: "moderateur-pirate",
    title: "Un modérateur supprime tout",
    description: "Un compte de l'équipe (piraté ou malveillant) bannit, supprime des salons ou des rôles.",
    category: "security",
    readTime: "3 min",
    commandSnippet: "/protection deverrouiller",
    content: [
      "Les protections Sanctions en série, Salons et Rôles et permissions détectent ces rafales : par défaut, Etho retire tous les rôles de l'auteur, puis répare ce qui peut l'être (débannit, recrée les salons et rôles supprimés avec leurs permissions).",
      "Pour l'anti-suppression de salon, de rôle et l'anti-modification du serveur, Etho conseille de verrouiller le serveur : il retire alors les permissions sensibles à tous les rôles. /protection deverrouiller les rend une fois le danger passé.",
      "Pour l'éviter : garde peu de membres avec des permissions d'administration, et utilise les rôles sécurisés (/elevate) pour n'activer les permissions sensibles que pour une durée limitée."
    ]
  },
  {
    id: "faux-nitro-phishing",
    title: "Liens d'arnaque et faux Nitro",
    description: "Des messages promettent du Nitro gratuit ou demandent de se connecter.",
    category: "security",
    readTime: "2 min",
    commandSnippet: "/protection activer protection:antiScam",
    content: [
      "L'anti-token grab détecte les messages d'arnaque (faux Nitro, faux Steam, vol de compte) et les supprime. Par défaut, l'auteur n'est pas sanctionné, car son compte est souvent lui-même piraté ; tu peux choisir une sanction avec /protection punition.",
      "L'anti-lien bloque tous les liens qui ne sont pas dans ta liste de domaines autorisés.",
      "/automod-native preset ajoute aussi les règles AutoMod de Discord contre le spam."
    ]
  },
  {
    id: "arreter-le-spam",
    title: "Arrêter le spam et le flood",
    description: "Messages en rafale, mentions de masse, pavés de texte.",
    category: "security",
    readTime: "2 min",
    commandSnippet: "/slowmode secondes:10",
    content: [
      "Sur le moment : /slowmode impose un délai entre deux messages, /lock ferme le salon et /unlock le rouvre.",
      "Durablement : active l'anti-spam, l'anti-mention membres, l'anti-mention rôles, l'anti-mention @everyone, l'anti-TextWall et l'anti-DuplicateMessage. Par défaut, ils suppriment les messages en cause et mettent l'auteur en timeout 10 minutes.",
      "Les sanctions manuelles passent par /warn, /mod et /untimeout ; /warnings affiche l'historique d'un membre."
    ]
  },
  {
    id: "bot-malveillant",
    title: "Un bot inconnu a été ajouté",
    description: "Un bot ajouté sans ton accord peut tout casser.",
    category: "security",
    readTime: "1 min",
    commandSnippet: "/antiraid trustbot",
    content: [
      "L'anti-bot bannit le bot ajouté et retire les rôles de la personne qui l'a invité (sanction par défaut).",
      "Ajoute tes bots de confiance avec /antiraid trustbot pour qu'ils ne soient pas bloqués."
    ]
  },
  {
    id: "sauvegarder-restaurer-serveur",
    title: "Sauvegarder et restaurer le serveur",
    description: "Revenir à un état sain après un incident.",
    category: "security",
    readTime: "2 min",
    content: [
      "La protection Rollback & Backups prend régulièrement une photo complète du serveur (salons, rôles, permissions).",
      "Les sauvegardes se consultent et se restaurent depuis la console, page Sauvegardes."
    ]
  }
];
