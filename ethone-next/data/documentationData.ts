export interface DocGuide {
  id: string;
  title: string;
  description: string;
  category: "guides" | "security";
  readTime: string;
  badge?: string;
  commandSnippet?: string;
  steps?: { step: number; title: string; content: string }[];
  content: string[];
}

export interface DocModule {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  isPremium?: boolean;
  defaultAction: string;
  reactionTime: string;
  description: string;
  commandSnippet: string;
  details: string[];
}

export interface ModuleCategoryGroup {
  id: string;
  label: string;
  count: number;
  modules: DocModule[];
}

export const STEP_BY_STEP_GUIDES: DocGuide[] = [
  {
    id: "bien-demarrer",
    title: "Bien démarrer",
    description: "Inviter Etho, le placer correctement dans la hiérarchie des rôles Discord et avoir un serveur sécurisé en 2 minutes.",
    category: "guides",
    readTime: "2 min",
    badge: "Recommandé",
    commandSnippet: "/setup quickstart",
    steps: [
      { step: 1, title: "Inviter le bot", content: "Ajoutez Etho sur votre serveur Discord avec les permissions Administrateur recommandées pour que la protection soit totale." },
      { step: 2, title: "Hiérarchie des rôles", content: "Dans les Paramètres de votre serveur > Rôles, déplacez le rôle 'Etho' tout en haut de la liste, juste sous le rôle Owner." },
      { step: 3, title: "Lancer la configuration", content: "Exécutez /setup ou activez la protection depuis le dashboard web pour verrouiller automatiquement les permissions vulnérables." }
    ],
    content: [
      "Etho a été conçu pour être opérationnel immédiatement sans passer des heures à tout configurer à la main.",
      "Dès son arrivée, le bot analyse les salons, les rôles et les webhooks existants pour repérer d'éventuelles failles de sécurité.",
      "Le rôle du bot doit impérativement se situer au-dessus des rôles de vos modérateurs afin de pouvoir révoquer leurs actions en cas d'attaque."
    ]
  },
  {
    id: "configurer-les-protections",
    title: "Configurer les protections",
    description: "Le panneau de configuration, le mode strict, et les réglages communs à tous les modules anti-raid.",
    category: "guides",
    readTime: "3 min",
    commandSnippet: "/security mode strict:true",
    steps: [
      { step: 1, title: "Mode de sensibilité", content: "Basculez entre le mode Standard (recommandé pour les serveurs actifs) et le mode Strict (protection maximale sans délai)." },
      { step: 2, title: "Action par défaut", content: "Définissez la sanction automatique en cas d'infraction : Révocation de rôle, Expulsion, Bannissement ou Quarantaine." },
      { step: 3, title: "Salon des alertes", content: "Configurez un salon privé accessible uniquement aux administrateurs pour recevoir les rapports d'intervention en direct." }
    ],
    content: [
      "Chaque module de sécurité d'Etho dispose de trois niveaux d'action : Avertissement & Annulation, Quarantaine immédiate, et Bannissement définitif.",
      "Grâce au moteur de détection temps réel, les seuils sont ajustés automatiquement selon l'activité habituelle de votre communauté.",
      "Vous pouvez affiner chaque module individuellement ou appliquer un profil global en une seule commande."
    ]
  },
  {
    id: "qui-est-protege",
    title: "Qui est protégé, qui peut agir",
    description: "Owners, whitelist, bypass et hiérarchie des rôles : les règles qui définissent comment Etho intervient.",
    category: "guides",
    readTime: "3 min",
    commandSnippet: "/whitelist add user:@moderateur role:@administrateur",
    steps: [
      { step: 1, title: "Statut Propriétaire", content: "Le créateur du serveur (Owner) est automatiquement immunisé et dispose d'un accès absolu à toutes les commandes d'urgence." },
      { step: 2, title: "Gestion de la Whitelist", content: "Ajoutez vos modérateurs de confiance à la liste blanche par module spécifique ou globalement." },
      { step: 3, title: "Système de Quorum", content: "Pour les actions critiques (bannissements en masse, suppression de salons), Etho peut exiger la confirmation de deux administrateurs." }
    ],
    content: [
      "La sécurité d'un serveur ne dépend pas seulement des membres extérieurs : 78% des attaques majeures proviennent de comptes administrateurs compromis.",
      "La Whitelist d'Etho est granulaire : un administrateur peut être autorisé à créer des salons sans être autorisé à bannir plus de 3 membres par heure.",
      "Tout comportement anormal d'un membre sur liste blanche déclenche un gel temporaire de sécurité jusqu'à validation du propriétaire."
    ]
  },
  {
    id: "logs-de-protection",
    title: "Les logs de protection",
    description: "Lire un log de protection, choisir où le recevoir, et agir directement depuis les boutons interactifs.",
    category: "guides",
    readTime: "2 min",
    commandSnippet: "/logs channel set channel:#etho-alerts",
    content: [
      "Dès qu'une infraction est détectée, Etho envoie un embed détaillé contenant l'identité de l'auteur, l'action neutralisée, l'adresse IP/token suspect et le temps de réaction en millisecondes.",
      "Chaque alerte est accompagnée de boutons d'action rapide : 'Lever la sanction', 'Confirmer le bannissement', ou 'Restaurer l'état précédent'.",
      "Les logs sont chiffrés et dupliqués dans le cloud Ethone pour empêcher un attaquant de supprimer les traces de son forfait."
    ]
  },
  {
    id: "logs-du-serveur",
    title: "Les logs du serveur",
    description: "Garder une trace de tout ce qui se passe sur ton serveur : membres, salons, rôles, modération, messages, vocal.",
    category: "guides",
    readTime: "3 min",
    commandSnippet: "/audit track all:true",
    content: [
      "Le module de logs d'audit enregistre l'ensemble des mutations de votre guilde avec horodatage précis à la milliseconde.",
      "Visualisez les modifications de permissions invisibles dans les logs natifs de Discord grâce à l'analyseur de delta de rôles.",
      "Filtrez les événements par modérateur, salon ou plage horaire depuis le tableau de bord web."
    ]
  },
  {
    id: "anti-alt-captcha",
    title: "Arrivées : anti-alt, captcha et sas",
    description: "Filtrer les nouveaux comptes, vérifier les humains et encaisser une vague de raid en toute sérénité.",
    category: "guides",
    readTime: "4 min",
    badge: "Essentiel",
    commandSnippet: "/gatekeeper enable min_age:7d captcha:button",
    content: [
      "Le module Gatekeeper analyse chaque nouvel arrivant : ancienneté du compte, présence d'avatar, numéro de téléphone vérifié et historique de réputation Discord.",
      "En cas d'afflux anormal (ex: 20 comptes en moins de 10 secondes), Etho active automatiquement le mode Sas et isole les arrivants dans un salon d'attente sécurisé.",
      "Les utilisateurs légitimes passent un captcha interactif sans quitter Discord, évitant ainsi de perdre de vrais membres."
    ]
  },
  {
    id: "dashboard-web",
    title: "Le dashboard web",
    description: "Piloter l'intégralité du bot depuis le navigateur en temps réel sans taper de commande dans Discord.",
    category: "guides",
    readTime: "2 min",
    commandSnippet: "Ouvrir ethone.dev/discord",
    content: [
      "Le tableau de bord web propose une interface moderne, ultra-réactive avec visualisations interactives de l'état de votre serveur.",
      "Activez ou désactivez n'importe quel module d'un simple clic avec synchronisation immédiate par WebSocket.",
      "Consultez les graphiques de sécurité, les statistiques de bannissements et téléchargez des rapports d'audit en un instant."
    ]
  },
  {
    id: "etho-ultra",
    title: "Etho Ultra / Mode Haute Sécurité",
    description: "Les protections les plus poussées, avec nos modules exclusifs et isolation de crise instantanée.",
    category: "guides",
    readTime: "3 min",
    badge: "Ultra",
    commandSnippet: "/ultra enable panic_button:true",
    content: [
      "Le mode Ultra active l'intelligence défensive avancée pour neutraliser les attaques coordonnées à haute fréquence.",
      "Bénéficiez du bouton d'urgence (Panic Button) qui verrouille l'intégralité de la guilde en moins de 150 millisecondes en cas de compromission majeure.",
      "Sauvegardes horaires automatiques avec restauration de salons, webhooks et permissions en 1 clic."
    ]
  },
  {
    id: "questions-frequentes",
    title: "Questions fréquentes",
    description: "Les réponses à toutes les interrogations sur la sécurité, le temps de réaction et le paramétrage.",
    category: "guides",
    readTime: "4 min",
    content: [
      "Q : Est-ce qu'Etho peut bannir un administrateur sans mon accord ?\nR : Non, l'action appliquée dépend de votre configuration. Par défaut, Etho révoque immédiatement les rôles de l'administrateur compromis et avertit l'Owner.",
      "Q : Quel est le temps de réaction d'Etho en cas d'attaque ?\nR : Notre infrastructure décentralisée traite les événements Discord Gateway en moins de 250ms, neutralisant les actions malveillantes avant même que Discord ne les propage.",
      "Q : Que se passe-t-il si Discord subit une panne de ses API ?\nR : Les modifications en attente sont mises en mémoire tampon et réappliquées dès la stabilisation des serveurs Discord."
    ]
  },
  {
    id: "commandes-slash",
    title: "Commandes slash",
    description: "Chaque commande /slash détaillée avec sa syntaxe, ses permissions requises et ses exemples d'usage.",
    category: "guides",
    readTime: "5 min",
    commandSnippet: "/help category:security",
    content: [
      "Toutes les commandes d'Etho exploitent l'API Slash native de Discord avec auto-complétion intelligente et vérification des permissions en temps réel.",
      "Les commandes critiques sont protégées par confirmation modale pour éviter toute fausse manipulation en situation de stress.",
      "Retrouvez la liste complète des commandes dans l'onglet Commandes du dashboard web ou via /help."
    ]
  }
];

export const PRACTICAL_SECURITY_GUIDES: DocGuide[] = [
  {
    id: "proteger-contre-les-raids",
    title: "Protéger son serveur Discord contre les raids",
    description: "Ce qu'est un raid Discord, comment l'anti-raid intervient en une seconde et met le serveur à l'abri.",
    category: "security",
    readTime: "3 min",
    badge: "Anti-Raid",
    commandSnippet: "/antiraid enable auto_lockdown:true",
    content: [
      "Un raid Discord est une attaque coordonnée par des dizaines de comptes bots ou utilisateurs malveillants visant à inonder les salons de spam, mentionner tout le monde ou détruire l'arborescence.",
      "Etho surveille le rythme des arrivées et la fréquence des messages. Dès que le seuil de tolérance est dépassé, l'anti-raid s'active instantanément.",
      "Le serveur est basculé en confinement partiel : les salons de discussion sont verrouillés pour les non-membres, et les bots malveillants sont expulsés sans toucher aux membres réguliers."
    ]
  },
  {
    id: "comprendre-attaque-raid",
    title: "Raider Discord : comprendre l'attaque et s'en protéger",
    description: "Un raid supprime salons, rôles et membres en quelques secondes. Comment l'anti-raid intervient et comment l'éviter.",
    category: "security",
    readTime: "4 min",
    commandSnippet: "/security audit vulnerability_check",
    content: [
      "Les attaquants exploitent souvent un webhook non sécurisé ou un token de bot tiers compromis pour exécuter des suppressions en rafale.",
      "Grâce au module Anti-Nuke d'Etho, toute suppression répétée de rôles ou de salons est interceptée et annulée avant que Discord ne finalise la suppression.",
      "Etho isole immédiatement le compte fautif et recrée les salons à l'identique avec leurs permissions d'origine."
    ]
  },
  {
    id: "choisir-bot-securite",
    title: "Comment choisir un bot de sécurité Discord",
    description: "Les critères qui comptent vraiment pour choisir un bot anti-raid et anti-nuke, et comment Etho y répond.",
    category: "security",
    readTime: "3 min",
    content: [
      "Critère n°1 : La latence de réaction. Un bot qui réagit en 2 secondes arrive trop tard. Etho répond en moins de 250ms.",
      "Critère n°2 : L'indépendance de l'infrastructure. Nos workers tournent sur une architecture multi-région à haute disponibilité 99.99%.",
      "Critère n°3 : La protection contre les nukes internes. Etho protège votre serveur contre vos propres modérateurs piratés, pas seulement contre les inconnus."
    ]
  },
  {
    id: "sauvegarder-restaurer-serveur",
    title: "Sauvegarder et restaurer un serveur Discord",
    description: "L'erreur arrive, un geste malheureux aussi : pourquoi une bonne sauvegarde protège et comment restaurer en un clic.",
    category: "security",
    readTime: "3 min",
    badge: "Sauvegardes",
    commandSnippet: "/backup create name:'Sauvegarde Préventive'",
    content: [
      "Une sauvegarde complète capture l'intégralité de la structure : salons textuels et vocaux, catégories, rôles, permissions par salon, émojis et paramètres.",
      "En cas d'incident, tapez /backup restore ou cliquez sur Restaurer depuis le dashboard pour retrouver votre serveur à la seconde près.",
      "Les sauvegardes Premium sont chiffrées de bout en bout et conservées en toute sécurité sur nos serveurs redondés."
    ]
  },
  {
    id: "raid-en-cours-agir-maintenant",
    title: "Raid en cours sur mon serveur Discord : que faire maintenant",
    description: "Des dizaines de comptes arrivent et spamment ? Les gestes à faire tout de suite pour arrêter une crise, puis comment éviter la prochaine.",
    category: "security",
    readTime: "2 min",
    badge: "Urgence",
    commandSnippet: "/lockdown all reason:'Raid en cours'",
    content: [
      "1. Activez le confinement d'urgence : tapez /lockdown all pour fermer instantanément l'écriture dans tous les salons publics.",
      "2. Révoquez les invitations : exécutez /invites pause pour couper l'accès aux nouveaux arrivants pendant l'attaque.",
      "3. Nettoyez les comptes indésirables : utilisez /cleanup raid pour expulser en masse tous les comptes ayant rejoint durant les 10 dernières minutes."
    ]
  },
  {
    id: "serveur-raid-reprendre-main",
    title: "Serveur Discord raid : les étapes pour reprendre la main",
    description: "Salons supprimés, rôles effacés, membres bannis : ce qu'il faut faire tout de suite après un raid violent, et comment reconstruire son serveur.",
    category: "security",
    readTime: "4 min",
    commandSnippet: "/backup rollback auto",
    content: [
      "Étape 1 : Retirez les permissions Administrateur à tous les rôles non vérifiés et révoquez les bots tiers suspects.",
      "Étape 2 : Lancez /backup rollback auto pour faire réapparaître l'ensemble des salons et rôles supprimés avec leurs permissions.",
      "Étape 3 : Activez le module Anti-Déban pour débannir automatiquement les membres légitimes expulsés par l'attaquant."
    ]
  },
  {
    id: "faux-nitro-phishing",
    title: "Faux Nitro, liens d'arnaque et vol de compte sur Discord",
    description: "Les arnaques les plus courantes sur Discord (faux Nitro, faux Steam, faux tweets crypto) et comment les bloquer automatiquement.",
    category: "security",
    readTime: "3 min",
    commandSnippet: "/antiscam enable delete_message:true timeout_user:1h",
    content: [
      "Le phishing Discord repose sur des domaines sosies (ex: disocrd-gift, stéamcommunity, free-nitro).",
      "Le filtre Anti-Scam d'Etho inspecte en temps réel chaque URL postée via notre base de menaces mise à jour toutes les 60 secondes.",
      "Tout message contenant un lien suspect est immédiatement supprimé et l'expéditeur est placé en sourdine pour éviter la propagation du ver."
    ]
  },
  {
    id: "moderateur-pirate",
    title: "Compte de modérateur piraté : limiter les dégâts",
    description: "Le compte de ton staff a été volé et s'en prend au serveur ? Comment réagir et comment faire pour qu'un seul compte ne puisse pas tout casser.",
    category: "security",
    readTime: "3 min",
    badge: "Anti-Nuke",
    commandSnippet: "/antinuke set threshold:3 action:quarantine",
    content: [
      "Même un modérateur de confiance peut se faire voler son token via un malware ou une fausse vérification QR code.",
      "L'Anti-Nuke d'Etho surveille les cadences d'actions : si un modérateur effectue plus de 3 bannissements ou suppressions en moins de 10 secondes, il est automatiquement neutralisé.",
      "Ses rôles de modération lui sont retirés sur-le-champ et le serveur envoie une alerte prioritaire au propriétaire."
    ]
  },
  {
    id: "arreter-le-spam",
    title: "Arrêter le spam sur un serveur Discord",
    description: "Flood, mentions de masse, messages répétés en boucle, ghost pings et perte de texte : les réglages qui suppriment le spam automatiquement.",
    category: "security",
    readTime: "3 min",
    commandSnippet: "/automod antispam enable max_duplicates:3",
    content: [
      "Le spam perturbe la vie de votre communauté et fait fuir les membres actifs. Etho embarque 6 sous-modules dédiés au spam.",
      "L'Anti-Flood bloque les rafales de plus de 5 messages en 3 secondes. L'Anti-Duplicate supprime les copier-coller envoyés sur plusieurs salons.",
      "L'Anti-GhostPing repère les petits malins qui mentionnent un membre avant d'effacer leur message pour le harceler."
    ]
  },
  {
    id: "captcha-verification",
    title: "Ajouter un captcha de vérification sur Discord",
    description: "Pourquoi un captcha à l'arrivée bloque les bots et les raids, comment le mettre en place sur ton serveur Discord en quelques minutes.",
    category: "security",
    readTime: "3 min",
    commandSnippet: "/captcha setup channel:#reglement role:@Membre",
    content: [
      "Un sas de bienvenue avec captcha est le rempart le plus efficace pour empêcher les comptes robots de polluer vos salons.",
      "Etho propose 3 modes de vérification : Clic sur bouton interactif, Choix d'émoji parmi 4 propositions, ou Code alphanumérique aléatoire.",
      "Une fois validé, le membre reçoit automatiquement son rôle et débloque l'accès aux salons de discussion."
    ]
  },
  {
    id: "checklist-securite-complete",
    title: "Sécuriser un serveur Discord : la checklist complète",
    description: "Permissions, rôles, 2FA, salons, logs et sauvegardes : la liste à cocher pour sécuriser un serveur Discord avant qu'un problème n'arrive.",
    category: "security",
    readTime: "4 min",
    badge: "Checklist",
    commandSnippet: "/security audit report",
    content: [
      "1. Exiger l'authentification 2FA pour tous les membres ayant des permissions de modération.",
      "2. Placer le rôle Etho tout en haut de la hiérarchie pour lui permettre de révoquer n'importe quel rôle compromis.",
      "3. Vérifier qu'aucun salon public n'accorde la permission 'Mentionner @everyone' ou 'Gérer les webhooks'.",
      "4. Créer une sauvegarde initiale complète avec /backup create.",
      "5. Activer les modules Anti-Ban, Anti-Kick, Anti-Webhook et Anti-Raid dans leur mode de sensibilité standard."
    ]
  },
  {
    id: "bot-moderation-commandes",
    title: "Bot de modération Discord : commandes et modération automatique",
    description: "Bannir, expulser, nettoyer, verrouiller un salon, filtrer les insultes : ce qu'un bot de modération fait pour ton équipe, en commandes et en automatique.",
    category: "security",
    readTime: "3 min",
    commandSnippet: "/mod warn user:@membre reason:'Non-respect des règles'",
    content: [
      "La modération automatique filtre les insultes, les liens d'arnaque et le flood 24h/24 sans aucune intervention humaine.",
      "Pour votre équipe de modération, Etho met à disposition une suite complète de commandes : /warn, /mute, /kick, /ban, /purge et /slowmode.",
      "Chaque sanction est enregistrée dans un casier de modération consultable à tout moment avec historique des avertissements passés."
    ]
  }
];

export const MODULE_CATEGORIES: ModuleCategoryGroup[] = [
  {
    id: "sanctions",
    label: "Sanctions",
    count: 4,
    modules: [
      {
        id: "anti-ban",
        name: "Anti-ban",
        category: "sanctions",
        categoryLabel: "Sanctions",
        defaultAction: "Révocation de rôle & Quarantaine",
        reactionTime: "< 180ms",
        description: "Surveille tous les bannissements émis sur la guilde. Si un utilisateur banni un nombre anormal de membres en un court laps de temps, ses droits sont retirés et la victime est réintégrée.",
        commandSnippet: "/security module enable module:anti-ban threshold:3 action:quarantine",
        details: [
          "Détection immédiate via l'événement AuditLog Entry Create.",
          "Rétablissement automatique du membre banni sans perte de données.",
          "Possibilité de définir un seuil par modérateur ou par rôle."
        ]
      },
      {
        id: "anti-kick",
        name: "Anti-kick",
        category: "sanctions",
        categoryLabel: "Sanctions",
        defaultAction: "Révocation des permissions",
        reactionTime: "< 190ms",
        description: "Empêche l'expulsion massive des membres du serveur par un modérateur malveillant ou compromis.",
        commandSnippet: "/security module enable module:anti-kick threshold:3/10s",
        details: [
          "Intercepte les expulsions non autorisées.",
          "Génère une alerte prioritaire avec mention du propriétaire du serveur.",
          "Isole le modérateur fautif en lui retirant l'ensemble de ses rôles."
        ]
      },
      {
        id: "anti-timeout",
        name: "Anti-timeout",
        category: "sanctions",
        categoryLabel: "Sanctions",
        defaultAction: "Annulation de l'exclusion temporaire",
        reactionTime: "< 210ms",
        description: "Détecte et annule les mises en exclusion temporaire (time-out) abusives infligées aux membres.",
        commandSnippet: "/security module enable module:anti-timeout threshold:5/1m",
        details: [
          "Restaure immédiatement la parole au membre sanctionné injustement.",
          "Enregistre la tentative dans les logs de sécurité."
        ]
      },
      {
        id: "anti-deban",
        name: "Anti-déban",
        category: "sanctions",
        categoryLabel: "Sanctions",
        defaultAction: "Re-bannissement immédiat",
        reactionTime: "< 160ms",
        description: "Interdit le dé-bannissement non autorisé de comptes figurant sur la liste noire ou précédemment sanctionnés pour raid.",
        commandSnippet: "/security module enable module:anti-deban strict:true",
        details: [
          "Re-bannit instantanément le compte sans laisser de fenêtre d'accès.",
          "Signale quel membre du staff a tenté de lever la sanction."
        ]
      }
    ]
  },
  {
    id: "salons",
    label: "Salons",
    count: 3,
    modules: [
      {
        id: "anti-creation-salon",
        name: "Anti-création de salon",
        category: "salons",
        categoryLabel: "Salons",
        defaultAction: "Suppression du salon créé",
        reactionTime: "< 220ms",
        description: "Bloque la création intempestive de dizaines de salons destinés à polluer l'interface ou spammer le serveur.",
        commandSnippet: "/security module enable module:anti-channel-create threshold:2/10s",
        details: [
          "Supprime immédiatement les salons non autorisés.",
          "Révocation du rôle du créateur suspect."
        ]
      },
      {
        id: "anti-suppression-salon",
        name: "Anti-suppression de salon",
        category: "salons",
        categoryLabel: "Salons",
        defaultAction: "Recréation instantanée du salon",
        reactionTime: "< 240ms",
        description: "Interdit la destruction de salons textuels, vocaux ou forums. En cas d'effacement, Etho recrée le salon avec son nom, sa catégorie, sa position et ses permissions exactes.",
        commandSnippet: "/security module enable module:anti-channel-delete restore:true",
        details: [
          "Restauration automatique à l'identique.",
          "Préservation de l'arbre hiérarchique et des permissions spécifiques."
        ]
      },
      {
        id: "anti-modification-salon",
        name: "Anti-modification de salon",
        category: "salons",
        categoryLabel: "Salons",
        defaultAction: "Rétablissement des paramètres",
        reactionTime: "< 230ms",
        description: "Empêche la modification malveillante du nom d'un salon, de sa description ou de ses restrictions de visibilité.",
        commandSnippet: "/security module enable module:anti-channel-update",
        details: [
          "Détecte les renommages de salons en textes de raid.",
          "Rétablit instantanément les permissions d'origine."
        ]
      }
    ]
  },
  {
    id: "roles",
    label: "Rôles",
    count: 7,
    modules: [
      {
        id: "anti-creation-role",
        name: "Anti-création de rôle",
        category: "roles",
        categoryLabel: "Rôles",
        defaultAction: "Suppression du rôle créé",
        reactionTime: "< 200ms",
        description: "Bloque la création répétée de nouveaux rôles par des comptes compromis.",
        commandSnippet: "/security module enable module:anti-role-create",
        details: ["Évite la création de rôles fantômes avec permission Administrateur."]
      },
      {
        id: "anti-suppression-role",
        name: "Anti-suppression de rôle",
        category: "roles",
        categoryLabel: "Rôles",
        defaultAction: "Recréation et réattribution du rôle",
        reactionTime: "< 250ms",
        description: "Interdit la suppression d'un rôle existant. Etho recrée le rôle, réapplique sa couleur, ses permissions et le redistribue à tous les membres qui le possédaient.",
        commandSnippet: "/security module enable module:anti-role-delete restore_members:true",
        details: [
          "Recréation fidèle des permissions et couleurs.",
          "Réattribution transparente à tous les détenteurs enregistrés."
        ]
      },
      {
        id: "anti-modification-role",
        name: "Anti-modification de rôle",
        category: "roles",
        categoryLabel: "Rôles",
        defaultAction: "Annulation de l'élévation de permissions",
        reactionTime: "< 190ms",
        description: "Détecte immédiatement tout ajout furtif de permissions critiques (Administrateur, Gérer les rôles, Bannir des membres) à un rôle standard.",
        commandSnippet: "/security module enable module:anti-role-update protect_admin:true",
        details: ["Neutralise l'élévation de privilèges en temps réel."]
      },
      {
        id: "anti-octroi-role",
        name: "Anti-octroi de rôle",
        category: "roles",
        categoryLabel: "Rôles",
        defaultAction: "Retrait du rôle octroyé",
        reactionTime: "< 170ms",
        description: "Empêche d'attribuer un rôle à privilèges élevés à un membre sans que l'action ne soit validée par un responsable.",
        commandSnippet: "/security module enable module:anti-role-give roles:@Admin,@Modo",
        details: ["Empêche un modérateur corrompu de donner les pleins pouvoirs à son compte secondaire."]
      },
      {
        id: "anti-retrait-role",
        name: "Anti-retrait de rôle",
        category: "roles",
        categoryLabel: "Rôles",
        defaultAction: "Restitution immédiate du rôle",
        reactionTime: "< 180ms",
        description: "Bloque le retrait massif de rôles clés protégeant vos membres ou votre équipe de modération.",
        commandSnippet: "/security module enable module:anti-role-remove",
        details: ["Empêche de dégrader vos administrateurs pour les neutraliser avant une attaque."]
      },
      {
        id: "anti-reorganisation-role",
        name: "Anti-réorganisation de rôles",
        category: "roles",
        categoryLabel: "Rôles",
        isPremium: true,
        defaultAction: "Rétablissement de l'ordre hiérarchique",
        reactionTime: "< 260ms",
        description: "Détecte et bloque toute tentative de déplacement d'un rôle vers le haut de la hiérarchie pour contourner les restrictions Discord.",
        commandSnippet: "/security module enable module:anti-role-reorder",
        details: ["Verrouille la hiérarchie de rôles définie par l'Owner."]
      },
      {
        id: "anti-role-masse",
        name: "Anti-rôle de masse",
        category: "roles",
        categoryLabel: "Rôles",
        isPremium: true,
        defaultAction: "Blocage de l'opération en masse",
        reactionTime: "< 210ms",
        description: "Empêche l'attribution ou le retrait simultané d'un rôle à des centaines de membres à la chaîne.",
        commandSnippet: "/security module enable module:anti-mass-role limit:10/1m",
        details: ["Évite les saturations de file d'attente et perturbations massives."]
      }
    ]
  },
  {
    id: "bots",
    label: "Bots et intégrations",
    count: 4,
    modules: [
      {
        id: "anti-bot",
        name: "Anti-bot",
        category: "bots",
        categoryLabel: "Bots et intégrations",
        defaultAction: "Expulsion immédiate du bot",
        reactionTime: "< 150ms",
        description: "Interdit l'ajout de bots tiers non autorisés sur le serveur. Tout bot ajouté sans que son ID ne figure dans la whitelist est expulsé à la seconde où il rejoint.",
        commandSnippet: "/security module enable module:anti-bot action:ban_bot",
        details: [
          "Expulsion instantanée sans laisser le temps au bot de recevoir le token Gateway.",
          "Sanction configurable pour l'administrateur ayant généré le lien OAuth."
        ]
      },
      {
        id: "anti-webhook",
        name: "Anti-webhook",
        category: "bots",
        categoryLabel: "Bots et intégrations",
        defaultAction: "Suppression du webhook créé",
        reactionTime: "< 170ms",
        description: "Empêche la création furtive de webhooks utilisés par les attaquants pour contourner la modération et envoyer des messages au nom du serveur.",
        commandSnippet: "/security module enable module:anti-webhook",
        details: ["Détruit le webhook dès sa déclaration auprès de l'API Discord."]
      },
      {
        id: "anti-modification-webhook",
        name: "Anti-modification de webhook",
        category: "bots",
        categoryLabel: "Bots et intégrations",
        defaultAction: "Révocation du webhook",
        reactionTime: "< 190ms",
        description: "Bloque la modification d'un webhook existant (nom, avatar, salon de destination).",
        commandSnippet: "/security module enable module:anti-webhook-update",
        details: ["Empêche le détournement d'intégrations légitimes (GitHub, Zapier)."]
      },
      {
        id: "anti-thread",
        name: "Anti-thread",
        category: "bots",
        categoryLabel: "Bots et intégrations",
        defaultAction: "Verrouillage et suppression du fil",
        reactionTime: "< 220ms",
        description: "Empêche la création en boucle de centaines de fils de discussion (threads) visant à inonder les notifications des membres.",
        commandSnippet: "/security module enable module:anti-thread threshold:3/10s",
        details: ["Supprime les fils spam et applique un slowmode automatique au créateur."]
      }
    ]
  },
  {
    id: "vocal",
    label: "Vocal",
    count: 4,
    modules: [
      {
        id: "anti-mute-vocal",
        name: "Anti-mute vocal",
        category: "vocal",
        categoryLabel: "Vocal",
        defaultAction: "Rétablissement du micro",
        reactionTime: "< 190ms",
        description: "Bloque la mise en sourdine serveur abusive des membres dans les salons vocaux par un animateur malveillant.",
        commandSnippet: "/security module enable module:anti-voice-mute",
        details: ["Rend la parole au membre immédiatement."]
      },
      {
        id: "anti-sourdine-vocal",
        name: "Anti-sourdine vocal",
        category: "vocal",
        categoryLabel: "Vocal",
        defaultAction: "Rétablissement du casque",
        reactionTime: "< 190ms",
        description: "Interdit la mise en sourdine casque forcée sur les utilisateurs connectés aux canaux vocaux.",
        commandSnippet: "/security module enable module:anti-voice-deaf",
        details: ["Détecte les abus de pouvoir en salon communautaire."]
      },
      {
        id: "anti-deconnexion-vocal",
        name: "Anti-déconnexion vocale",
        category: "vocal",
        categoryLabel: "Vocal",
        defaultAction: "Sanction du modérateur fautif",
        reactionTime: "< 220ms",
        description: "Empêche d'expulser en masse les utilisateurs hors des salons vocaux lors d'événements ou conférences.",
        commandSnippet: "/security module enable module:anti-voice-disconnect threshold:4/5s",
        details: ["Avertit le propriétaire et révoque les droits de gestion vocale de l'auteur."]
      },
      {
        id: "anti-deplacement-vocal",
        name: "Anti-déplacement vocal",
        category: "vocal",
        categoryLabel: "Vocal",
        defaultAction: "Rapatriement des membres déplacés",
        reactionTime: "< 240ms",
        description: "Bloque le déplacement forcé en boucle des membres d'un salon vocal à un autre pour les perturber.",
        commandSnippet: "/security module enable module:anti-voice-move threshold:3/5s",
        details: ["Replace automatiquement les utilisateurs dans leur salon d'origine."]
      }
    ]
  },
  {
    id: "serveur",
    label: "Serveur",
    count: 3,
    modules: [
      {
        id: "anti-modification-serveur",
        name: "Anti-modification du serveur",
        category: "serveur",
        categoryLabel: "Serveur",
        defaultAction: "Rétablissement des paramètres de guilde",
        reactionTime: "< 210ms",
        description: "Interdit toute modification du nom du serveur, de son icône, de sa bannière, de son niveau de vérification ou de son salon de règles.",
        commandSnippet: "/security module enable module:anti-guild-update lock_name:true",
        details: ["Empêche de transformer un serveur réputé en vitrine de raid."]
      },
      {
        id: "anti-suppression-template",
        name: "Anti-suppression de template",
        category: "serveur",
        categoryLabel: "Serveur",
        isPremium: true,
        defaultAction: "Restauration immédiate",
        reactionTime: "< 200ms",
        description: "Protège les modèles de guilde et paramètres avancés d'intégration.",
        commandSnippet: "/security module enable module:anti-template-delete",
        details: ["Garantit l'intégrité de la structure fondamentale du serveur."]
      },
      {
        id: "anti-evenement",
        name: "Anti-événement",
        category: "serveur",
        categoryLabel: "Serveur",
        defaultAction: "Suppression de l'événement indésirable",
        reactionTime: "< 230ms",
        description: "Empêche la création d'événements Discord programmés frauduleux destinés à spammer les notifications calendrier des membres.",
        commandSnippet: "/security module enable module:anti-event-spam",
        details: ["Annule les événements non validés par un administrateur."]
      }
    ]
  },
  {
    id: "messages",
    label: "Messages",
    count: 11,
    modules: [
      {
        id: "anti-lien",
        name: "Anti-lien",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression du message",
        reactionTime: "< 140ms",
        description: "Bloque l'envoi de liens non autorisés avec liste blanche par salon et par domaine (ex: YouTube, Twitch autorisés dans #médias).",
        commandSnippet: "/automod antilink enable whitelist_domains:youtube.com,twitch.tv",
        details: ["Filtre les invitations Discord concurrentes et sites suspects."]
      },
      {
        id: "anti-spam",
        name: "Anti-spam",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression & Mute automatique",
        reactionTime: "< 130ms",
        description: "Analyse la fréquence d'envoi et supprime instantanément les messages envoyés trop rapidement.",
        commandSnippet: "/automod antispam enable max_messages:5 time_window:3s",
        details: ["Applique une exclusion temporaire de 10 minutes en cas de récidive."]
      },
      {
        id: "anti-badword",
        name: "Anti-badword",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression & Avertissement",
        reactionTime: "< 120ms",
        description: "Filtre les insultes, propos haineux et termes interdits, y compris ceux camouflés par des caractères spéciaux ou leetspeak.",
        commandSnippet: "/automod badwords add word:insulte strict:true",
        details: ["Analyse sémantique intelligente résistante aux contournements."]
      },
      {
        id: "anti-toxicite",
        name: "Anti-toxicité",
        category: "messages",
        categoryLabel: "Messages",
        isPremium: true,
        defaultAction: "Avertissement discret et signalement",
        reactionTime: "< 250ms",
        description: "Détecte les comportements toxiques, le harcèlement passif et l'agressivité verbale via notre moteur d'analyse contextuelle.",
        commandSnippet: "/automod toxicity enable sensitivity:medium",
        details: ["Avertit les modérateurs sans interrompre les échanges constructifs."]
      },
      {
        id: "anti-mention-mass",
        name: "Anti-mention mass",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression & Sanction",
        reactionTime: "< 130ms",
        description: "Bloque les messages mentionnant plus d'un nombre déterminé d'utilisateurs ou les mentions @everyone / @here non autorisées.",
        commandSnippet: "/automod antimention enable max_mentions:3 block_everyone:true",
        details: ["Neutralise la méthode préférée des raiders pour attirer l'attention."]
      },
      {
        id: "anti-mention-ghostping",
        name: "Anti-mention ghost-ping",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Identification publique de l'auteur",
        reactionTime: "< 150ms",
        description: "Identifie tout utilisateur qui mentionne un membre puis supprime ou modifie son message pour le harceler sans laisser de trace.",
        commandSnippet: "/automod ghostping enable log_channel:#moderation",
        details: ["Reposte le contenu supprimé dans le salon ou en alerte privée."]
      },
      {
        id: "anti-ghostping",
        name: "Anti-ghost ping",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Journalisation de la tentative",
        reactionTime: "< 160ms",
        description: "Garde une mémoire tampon de 60 secondes des mentions supprimées pour confondre les perturbateurs.",
        commandSnippet: "/automod ghostping set_threshold:1",
        details: ["Permet aux modérateurs de voir exactement qui a été pingé et par qui."]
      },
      {
        id: "anti-lockdown",
        name: "Anti-lockdown",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Procédure d'urgence",
        reactionTime: "< 110ms",
        description: "Permet de verrouiller un salon spécifique ou tous les salons du serveur en un seul geste en cas de débordement incontrôlé.",
        commandSnippet: "/lockdown channel:#general duration:30m",
        details: ["Ferme la permission d'envoi de messages pour le rôle @everyone."]
      },
      {
        id: "anti-duplicate-message",
        name: "Anti-DuplicateMessage",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression des doublons",
        reactionTime: "< 140ms",
        description: "Supprime automatiquement le même message copié et collé à l'identique dans plusieurs salons différents.",
        commandSnippet: "/automod duplicate enable max_channels:2",
        details: ["Bloque la promotion sauvage d'autres serveurs ou de ventes illégales."]
      },
      {
        id: "anti-emoji-abuse",
        name: "Anti-EmojiAbuse",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression du message surchargé",
        reactionTime: "< 150ms",
        description: "Empêche l'envoi de pavés de texte constitués de dizaines d'emojis pour faire planter l'affichage Discord sur mobile.",
        commandSnippet: "/automod emojis max:10",
        details: ["Protège le confort de lecture de votre communauté."]
      },
      {
        id: "anti-relais-pub",
        name: "Anti-relais pub",
        category: "messages",
        categoryLabel: "Messages",
        defaultAction: "Suppression de l'invitation",
        reactionTime: "< 130ms",
        description: "Interdit le partage d'invitations Discord (discord.gg/...) dans les salons de discussion non réservés au partenariat.",
        commandSnippet: "/automod invites block_all:true allow_partners:true",
        details: ["Vérifie le serveur de destination pour ne pas bloquer les liens officiels."]
      }
    ]
  },
  {
    id: "membres",
    label: "Membres",
    count: 2,
    modules: [
      {
        id: "anti-renommage-membre",
        name: "Anti-renommage de membre",
        category: "membres",
        categoryLabel: "Membres",
        defaultAction: "Réinitialisation du pseudonyme",
        reactionTime: "< 190ms",
        description: "Rétablit le nom d'origine si un membre tente d'adopter un pseudonyme injurieux, invisible (caractères Zalgo) ou usurpant l'identité d'un membre du staff.",
        commandSnippet: "/security module enable module:anti-nickname protect_staff:true",
        details: ["Protège contre le vol d'identité d'administrateurs."]
      },
      {
        id: "anti-alt",
        name: "Anti-alt",
        category: "membres",
        categoryLabel: "Membres",
        defaultAction: "Mise en quarantaine du compte secondaire",
        reactionTime: "< 180ms",
        description: "Analyse l'âge de création des comptes Discord. Tout compte créé il y a moins de X jours est soumis à une vérification approfondie avant d'accéder au serveur.",
        commandSnippet: "/security module enable module:anti-alt min_age:7d",
        details: ["Élimine la quasi-totalité des comptes jetables utilisés pour contourner un bannissement."]
      }
    ]
  },
  {
    id: "sauvegardes",
    label: "Sauvegarde & Backups",
    count: 3,
    modules: [
      {
        id: "rollback-instantane",
        name: "Rollback instantané",
        category: "sauvegardes",
        categoryLabel: "Sauvegarde",
        isPremium: true,
        defaultAction: "Restauration en un clic",
        reactionTime: "< 2.5s",
        description: "En cas d'attaque catastrophique, remontez dans le temps et restaurez l'état exact du serveur avant l'attaque en quelques secondes.",
        commandSnippet: "/backup rollback auto",
        details: [
          "Recrée les salons effacés avec l'ensemble de leurs paramètres.",
          "Rétablit les rôles et permissions associées.",
          "Restaure les catégories et l'ordre complet de l'arborescence."
        ]
      },
      {
        id: "sauvegarde-planifiee",
        name: "Sauvegarde planifiée",
        category: "sauvegardes",
        categoryLabel: "Sauvegarde",
        isPremium: true,
        defaultAction: "Capture automatique horaire",
        reactionTime: "Automatique",
        description: "Prend un instantané complet chiffré de votre serveur toutes les heures et conserve l'historique sur 30 jours glissants.",
        commandSnippet: "/backup schedule frequency:hourly retain:30d",
        details: ["Chiffrement de bout en bout AES-256 sur serveurs géolocalisés en Europe."]
      },
      {
        id: "sauvegarde-manuelle",
        name: "Sauvegarde manuelle",
        category: "sauvegardes",
        categoryLabel: "Sauvegarde",
        isPremium: true,
        defaultAction: "Création d'instantané",
        reactionTime: "< 1.5s",
        description: "Créez une archive instantanée de votre serveur avant toute opération de maintenance ou modification de structure importante.",
        commandSnippet: "/backup create name:'Avant réorganisation'",
        details: ["Téléchargeable également au format JSON pour vos archives personnelles."]
      }
    ]
  },
  {
    id: "supplementaires",
    label: "Modules supplémentaires (Mode Ultra)",
    count: 10,
    modules: [
      {
        id: "anti-renommage-massif",
        name: "Anti-renommage massif de serveur",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Annulation & Verrouillage du nom",
        reactionTime: "< 180ms",
        description: "Bloque les tentatives de raid par changement de nom d'affichage de dizaines d'utilisateurs simultanément.",
        commandSnippet: "/ultra enable module:anti-mass-rename",
        details: ["Empêche de renommer tous les membres avec le même pseudo de raid."]
      },
      {
        id: "anti-changement-icone",
        name: "Anti-changement d'icône",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Restauration de l'icône originale",
        reactionTime: "< 210ms",
        description: "Verrouille l'icône et la bannière du serveur contre tout remplacement malveillant.",
        commandSnippet: "/ultra enable module:lock-icon",
        details: ["Sauvegarde l'image haute définition dans le cloud de secours."]
      },
      {
        id: "anti-suppression-emojis",
        name: "Anti-suppression d'émojis",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Ré-upload automatique des émojis effacés",
        reactionTime: "< 350ms",
        description: "Protège votre bibliothèque d'émojis personnalisés contre les suppressions massives.",
        commandSnippet: "/ultra enable module:protect-emojis auto_reupload:true",
        details: ["Conserve une archive compressée de chaque émoji pour ré-upload immédiat."]
      },
      {
        id: "anti-suppression-stickers",
        name: "Anti-suppression de stickers",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Restauration des autocollants",
        reactionTime: "< 360ms",
        description: "Protège les autocollants de guilde contre la destruction intentionnelle.",
        commandSnippet: "/ultra enable module:protect-stickers",
        details: ["Rétablit les formats PNG, APNG et Lottie."]
      },
      {
        id: "anti-suppression-integration",
        name: "Anti-suppression d'intégration",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Blocage de la déconnexion",
        reactionTime: "< 240ms",
        description: "Protège les intégrations externes liées au serveur contre les déconnexions sauvages.",
        commandSnippet: "/ultra enable module:protect-integrations",
        details: ["Sécurise les liaisons Patreon, YouTube et Twitch."]
      },
      {
        id: "anti-changement-afk",
        name: "Anti-changement de salon AFK",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Rétablissement du salon AFK officiel",
        reactionTime: "< 200ms",
        description: "Empêche le détournement du salon AFK configuré dans les paramètres du serveur.",
        commandSnippet: "/ultra enable module:lock-afk-channel",
        details: ["Évite les déplacements intempestifs de membres inactifs vers des salons piégés."]
      },
      {
        id: "anti-suppression-soundboard",
        name: "Anti-suppression de soundboard",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Restauration des sons",
        reactionTime: "< 340ms",
        description: "Protège les effets sonores de la table d'harmonie du serveur.",
        commandSnippet: "/ultra enable module:protect-soundboard",
        details: ["Préserve les fichiers audio et réglages de volume."]
      },
      {
        id: "anti-bypass-quarantaine",
        name: "Anti-bypass de quarantaine",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Rétablissement strict des restrictions",
        reactionTime: "< 140ms",
        description: "Empêche tout membre placé en quarantaine de contourner ses limitations via des rôles tiers.",
        commandSnippet: "/ultra enable module:strict-quarantine",
        details: ["Surveillance permanente de la matrice des permissions effectives."]
      },
      {
        id: "anti-changement-widget",
        name: "Anti-changement de widget",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Verrouillage du widget",
        reactionTime: "< 220ms",
        description: "Verrouille les réglages du widget public pour empêcher l'exposition d'invitations pirates.",
        commandSnippet: "/ultra enable module:lock-widget",
        details: ["Sécurise les intégrations web tierces."]
      },
      {
        id: "anti-suppression-onboarding",
        name: "Anti-suppression d'onboarding",
        category: "supplementaires",
        categoryLabel: "Mode Ultra",
        isPremium: true,
        defaultAction: "Rétablissement de l'accueil communautaire",
        reactionTime: "< 260ms",
        description: "Protège les questions de bienvenue, rôles de sélection et canaux par défaut configurés dans l'onboarding Discord.",
        commandSnippet: "/ultra enable module:protect-onboarding",
        details: ["Garantit que les nouveaux membres arrivent toujours sur un parcours d'accueil propre."]
      }
    ]
  }
];
