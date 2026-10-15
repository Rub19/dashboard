export const BOT_LANGS = ["fr", "en", "es", "de"] as const;
export type BotLang = (typeof BOT_LANGS)[number];

export interface BotFeatureItem {
  title: string;
  desc: string;
}

export interface BotCopy {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    features: string;
    security: string;
    music: string;
    platforms: string;
    steps: string;
    commands: string;
    faq: string;
    support: string;
    invite: string;
    dashboard: string;
    openMenu: string;
    closeMenu: string;
    language: string;
  };
  hero: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    addBtn: string;
    dashboardBtn: string;
    onlineLabel: string;
    highlights: string[];
  };
  security: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    filters: {
      title: string;
      desc: string;
      chips: {
        links: string;
        mentions: string;
        spoilers: string;
        invites: string;
      };
    };
    permissions: {
      title: string;
      desc: string;
    };
    antiNuke: {
      title: string;
      desc: string;
      scanning: string;
    };
    antiRaid: {
      title: string;
      desc: string;
      verified: string;
    };
    moreBtn: string;
  };
  music: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    filters: {
      title: string;
      desc: string;
      label8D: string;
      status: string;
    };
    queue: {
      title: string;
      desc: string;
      nowPlaying: string;
    };
    spotify: {
      title: string;
      desc: string;
      status: string;
    };
    moreBtn: string;
  };
  platforms: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    cards: {
      spotify: { name: string; desc: string; tag: string };
      lastfm: { name: string; desc: string; tag: string };
      soundcloud: { name: string; desc: string; tag: string };
      tiktok: { name: string; desc: string; tag: string };
      pinterest: { name: string; desc: string; tag: string };
      youtube: { name: string; desc: string; tag: string };
      twitch: { name: string; desc: string; tag: string };
    };
  };
  features: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    commandsDivider: {
      before: string;
      count: string;
      after: string;
    };
    allCommandsBtn: string;
    hideCommandsBtn: string;
    items: {
      search: BotFeatureItem;
      tts: BotFeatureItem;
      levels: BotFeatureItem;
      snipe: BotFeatureItem;
      giveaways: BotFeatureItem;
      games: BotFeatureItem;
      autoResponders: BotFeatureItem;
      bumpReminder: BotFeatureItem;
      counters: BotFeatureItem;
      reactionTriggers: BotFeatureItem;
      imageManipulation: BotFeatureItem;
      translation: BotFeatureItem;
      reminders?: BotFeatureItem;
      reactionRoles?: BotFeatureItem;
      lyrics?: BotFeatureItem;
    };
  };
  steps: {
    eyebrow: string;
    titlePart1: string;
    titleHighlight: string;
    items: Array<{ step: string; title: string; desc: string }>;
  };
  commands: {
    eyebrow: string;
    title: string;
    subtitle: string;
    search: string;
    all: string;
    copy: string;
    copied: string;
    empty: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  cta: {
    title: string;
    subtitle: string;
    addBtn: string;
    dashboardBtn: string;
  };
  footer: {
    tagline: string;
    botColTitle: string;
    legalColTitle: string;
    rightsReserved: string;
    dashboard: string;
    support: string;
    terms: string;
    privacy: string;
    cookies: string;
    legal: string;
    cookieSettings: string;
  };
}

export const BOT_COPY: Record<BotLang, BotCopy> = {
  fr: {
    meta: {
      title: "Etho — Le bot Discord tout-en-un pour votre communauté",
      description: "Modération chirurgicale, protection anti-raid, musique, pont vocal Spotify et catalogue complet de commandes fun. Tout pour votre serveur, sans superflu.",
    },
    nav: {
      features: "Fonctionnalités",
      security: "Sécurité",
      music: "Musique",
      platforms: "Plateformes",
      steps: "Prise en main",
      commands: "Commandes",
      faq: "FAQ",
      support: "Support",
      invite: "Ajouter Etho",
      dashboard: "Dashboard",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      language: "Langue",
    },
    hero: {
      badge: "Le bot Discord tout-en-un",
      titlePart1: "Le bot Discord tout-en-un,",
      titleHighlight: "pensé pour ta communauté",
      subtitle: "Modération chirurgicale, protection anti-raid, musique haute fidélité, pont vocal Spotify et commandes fun interactives. Active ce dont tu as besoin et configure tout depuis un dashboard clair, sans superflu.",
      addBtn: "Ajouter le bot ↗",
      dashboardBtn: "Ouvrir le dashboard",
      onlineLabel: "En ligne 24/7",
      highlights: [
        "🛡️ Anti-Raid",
        "🎵 Pont vocal Spotify",
        "⚡ Zéro latence",
      ],
    },
    security: {
      badge: "SÉCURITÉ DU SERVEUR",
      titlePart1: "Modération et Sécurité",
      titleHighlight: "de premier ordre",
      subtitle: "Les meilleurs outils pour maintenir votre communauté saine, verrouillée et protégée.",
      filters: {
        title: "Filtres Automatisés",
        desc: "Gardez vos salons textuels propres grâce à nos options de filtrage instantané.",
        chips: {
          links: "Liens",
          mentions: "Mass Mentions",
          spoilers: "Spoilers",
          invites: "Invitations",
        },
      },
      permissions: {
        title: "Sécurité des Permissions",
        desc: "Supprimez et révoquez les permissions dangereuses susceptibles d'être exploitées via l'API.",
      },
      antiNuke: {
        title: "Anti-Nuke",
        desc: "Prévenez les suppressions massives de salons ou de rôles avec des seuils d'alerte personnalisables.",
        scanning: "Analyse en direct",
      },
      antiRaid: {
        title: "Anti-Raid",
        desc: "Protégez votre serveur contre les raids coordonnés grâce aux filtres d'âge de compte et d'avatar.",
        verified: "Identité vérifiée",
      },
      moreBtn: "100+ commandes de sécurité",
    },
    music: {
      badge: "EXPÉRIENCE AUDIO",
      titlePart1: "Fonctionnalités musicales conçues",
      titleHighlight: "pour tous",
      subtitle: "Qualité audio supérieure et commandes complètes pour une expérience musicale incomparable.",
      filters: {
        title: "Filtres Préconfigurés",
        desc: "Génération à la volée pour transformer n'importe quelle musique en écoute immersive.",
        label8D: "8D Spatial",
        status: "ACTIF",
      },
      queue: {
        title: "File d'attente fluide",
        desc: "Écoutez titre après titre, sans interruption, toute la journée.",
        nowPlaying: "Lecture en cours",
      },
      spotify: {
        title: "Spotify",
        desc: "Entièrement intégré et pilotable directement avec Spotify.",
        status: "Synchronisé",
      },
      moreBtn: "20+ commandes musique",
    },
    platforms: {
      badge: "INTÉGRATIONS",
      titlePart1: "Intégrations avec vos",
      titleHighlight: "Plateformes préférées",
      subtitle: "Suivez, écoutez, recherchez et diffusez vos médias en direct depuis vos services favoris.",
      cards: {
        spotify: {
          name: "Spotify",
          desc: "Jouez, contrôlez votre musique en vocal, synchronisez vos titres et diffusez en direct.",
          tag: "14+ commandes",
        },
        lastfm: {
          name: "Last.fm",
          desc: "Scrobbles en direct, récents morceaux, top artistes, comparaisons de goûts et leaderboards.",
          tag: "20+ commandes",
        },
        soundcloud: {
          name: "SoundCloud",
          desc: "Recherchez des morceaux indépendants, diffusez en vocal et partagez des liens audio directs.",
          tag: "Vocal direct",
        },
        tiktok: {
          name: "TikTok",
          desc: "Recherchez des profils, suivez les créateurs et recevez des alertes de nouvelles vidéos.",
          tag: "Flux & alertes",
        },
        pinterest: {
          name: "Pinterest",
          desc: "Recherche visuelle Lens sur vos images, profils et intégration de flux d'épingles.",
          tag: "Recherche Lens",
        },
        youtube: {
          name: "YouTube",
          desc: "Streaming audio haute fidélité dans vos salons vocaux et lecture directe de playlists.",
          tag: "Streaming HD",
        },
        twitch: {
          name: "Twitch",
          desc: "Alertes automatiques de streamers en direct et notifications personnalisées instantanées.",
          tag: "Alertes en direct",
        },
      },
    },
    features: {
      badge: "CATALOGUE",
      titlePart1: "D'innombrables fonctionnalités",
      titleHighlight: "en plus",
      subtitle: "Ne vous souciez plus jamais d'avoir besoin d'un autre bot, tous vos besoins sont couverts.",
      commandsDivider: {
        before: "Plus de",
        count: "800+",
        after: "Commandes",
      },
      allCommandsBtn: "Toutes les commandes",
      hideCommandsBtn: "Masquer les commandes",
      items: {
        search: {
          title: "Recherche en ligne",
          desc: "Recherche d'images inversée, requêtes visuelles ou recherche en ligne pour n'importe quel résultat.",
        },
        tts: {
          title: "Synthèse vocale (TTS)",
          desc: "Convertissez du texte en fichier audio ou faites parler Etho en direct dans vos salons. Plus de 80+ voix.",
        },
        levels: {
          title: "Système de niveaux",
          desc: "Système d'XP et de niveaux pour vos membres afin de monter en grade et suivre leur progression.",
        },
        snipe: {
          title: "Snipe & Historique",
          desc: "Système avancé pour récupérer messages, images, vidéos, modifications et réactions supprimées.",
        },
        giveaways: {
          title: "Giveaways & Concours",
          desc: "Organisez des tirages au sort rapides et faciles pour les membres de votre serveur.",
        },
        games: {
          title: "Mini-Jeux",
          desc: "Jouez à Blacktea, au Morpion et à de nombreux mini-jeux entre amis.",
        },
        autoResponders: {
          title: "Réponses automatiques",
          desc: "Configurez des réponses automatiques aux messages correspondant à des déclencheurs.",
        },
        bumpReminder: {
          title: "Rappels de Bump",
          desc: "Recevez des rappels programmés pour faire /bump sur votre serveur sur Disboard.",
        },
        counters: {
          title: "Salons compteurs",
          desc: "Créez des salons compteurs pour afficher les statistiques du serveur en direct.",
        },
        reactionTriggers: {
          title: "Déclencheurs de réactions",
          desc: "Configurez des déclencheurs avancés sur les messages ou messages précédents.",
        },
        imageManipulation: {
          title: "Manipulation d'images",
          desc: "Transformez facilement images, vidéos et GIFs en mèmes percutants.",
        },
        translation: {
          title: "Traduction instantanée",
          desc: "Traduisez rapidement du texte dans plus de 100 langues.",
        },
        reminders: {
          title: "Rappels de Bump",
          desc: "Recevez des rappels programmés pour faire /bump sur votre serveur sur Disboard.",
        },
        reactionRoles: {
          title: "Déclencheurs de réactions",
          desc: "Configurez des déclencheurs avancés sur les messages ou messages précédents.",
        },
        lyrics: {
          title: "Manipulation d'images",
          desc: "Transformez facilement images, vidéos et GIFs en mèmes percutants.",
        },
      },
    },
    steps: {
      eyebrow: "PRISE EN MAIN",
      titlePart1: "Prêt en",
      titleHighlight: "trois étapes",
      items: [
        {
          step: "1",
          title: "Ajoute le bot",
          desc: "Invite Etho sur ton serveur en 1 clic avec les autorisations requises.",
        },
        {
          step: "2",
          title: "Configure depuis le Dashboard",
          desc: "Active uniquement les modules utiles à ta communauté sans toucher au code.",
        },
        {
          step: "3",
          title: "Profite",
          desc: "Ton serveur est surveillé, sécurisé et animé en continu 24h/24 sans interruption.",
        },
      ],
    },
    commands: {
      eyebrow: "COMMANDES",
      title: "Catalogue des Commandes",
      subtitle: "Explorez l'ensemble des commandes interactives prêtes à l'emploi.",
      search: "Rechercher une commande...",
      all: "Toutes",
      copy: "Copier",
      copied: "Copié !",
      empty: "Aucune commande ne correspond à votre recherche.",
    },
    faq: {
      eyebrow: "QUESTIONS FRÉQUENTES",
      title: "Tout ce que tu dois savoir",
      subtitle: "Des réponses transparentes et directes sur le fonctionnement d'Etho.",
      items: [
        {
          q: "Etho est-il gratuit ?",
          a: "Oui. L'ensemble des fonctionnalités clés (modération, anti-raid, musique, spotify, commandes fun et dashboard complet) est totalement accessible sans abonnement obligatoire.",
        },
        {
          q: "Comment fonctionne la protection contre les raids ?",
          a: "Etho analyse en continu les flux de membres, les mentions massives et les modifications critiques de salons ou de rôles. Dès qu'une anomalie survient, le serveur est verrouillé et les réglages compromis sont restaurés automatiquement.",
        },
        {
          q: "Comment fonctionne le pont vocal Spotify (/spotify vc) ?",
          a: "Connectez-vous dans un salon vocal Discord et lancez votre musique sur votre application Spotify. La commande /spotify vc fait rejoindre Etho à votre salon et diffuse instantanément votre piste en direct.",
        },
        {
          q: "Qu'est-ce que le Bouclier Owner ?",
          a: "C'est une barrière exclusive réservée au propriétaire du serveur : même en cas de prise de contrôle d'un rôle d'administration par un attaquant, Etho annule toute révocation de vos permissions et vous restaure immédiatement.",
        },
        {
          q: "Mes données sont-elles conservées en sécurité ?",
          a: "Absolument. Aucune conversation privée n'est enregistrée ni partagée. Seules les configurations nécessaires au bon fonctionnement de vos salons et modules sont stockées de manière chiffrée.",
        },
      ],
    },
    cta: {
      title: "Prêt à transformer ton serveur Discord ?",
      subtitle: "Ajoute Etho à ton serveur pour gérer sécurité, musique et animation au même endroit.",
      addBtn: "Ajouter le bot ↗",
      dashboardBtn: "Ouvrir le dashboard",
    },
    footer: {
      tagline: "Le bot Discord tout-en-un pour votre communauté",
      botColTitle: "Bot",
      legalColTitle: "Légal",
      rightsReserved: "Tous droits réservés.",
      dashboard: "Dashboard",
      support: "Support Discord",
      terms: "Conditions d'utilisation",
      privacy: "Confidentialité",
      cookies: "Cookies",
      legal: "Mentions légales",
      cookieSettings: "Gérer les cookies",
    },
  },

  en: {
    meta: {
      title: "Etho — The All-in-One Discord Bot for Your Community",
      description: "Surgical anti-raid protection, instant moderation, music, Spotify voice bridge, and fun interactive commands. Everything your server needs without fluff.",
    },
    nav: {
      features: "Features",
      security: "Security",
      music: "Music",
      platforms: "Platforms",
      steps: "Getting Started",
      commands: "Commands",
      faq: "FAQ",
      support: "Support",
      invite: "Add Etho",
      dashboard: "Dashboard",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      language: "Language",
    },
    hero: {
      badge: "The all-in-one Discord bot",
      titlePart1: "The all-in-one Discord bot,",
      titleHighlight: "built for your community",
      subtitle: "Surgical anti-raid defense, instant moderation, high-fidelity music, Spotify voice bridge, and fun interactive commands. Enable what you need and configure everything from a clean dashboard.",
      addBtn: "Add to Discord ↗",
      dashboardBtn: "Open Dashboard",
      onlineLabel: "Online 24/7",
      highlights: [
        "🛡️ Anti-Raid",
        "🎵 Spotify Voice Bridge",
        "⚡ Sub-15ms Latency",
      ],
    },
    security: {
      badge: "SERVER DEFENSE",
      titlePart1: "Premium Moderation",
      titleHighlight: "and Security",
      subtitle: "We provide you with the best tools, to keep your community clean and secure.",
      filters: {
        title: "Automated Filters",
        desc: "Keep any chat clean with our many automated filtering options.",
        chips: {
          links: "Links",
          mentions: "Mass Mentions",
          spoilers: "Spoilers",
          invites: "Invites",
        },
      },
      permissions: {
        title: "Permission Security",
        desc: "Remove all dangerous Discord permissions that can be used for malicious reasons through API.",
      },
      antiNuke: {
        title: "Anti-Nuke",
        desc: "Easily prevent your server from malicious attacks and griefing, with a customizable threshold set by you.",
        scanning: "Real-time sweep",
      },
      antiRaid: {
        title: "Anti-Raid",
        desc: "Protect against targeted bot raids on your server, with our mass join, avatar and account age anti-raid filters.",
        verified: "Identity verified",
      },
      moreBtn: "100+ security commands",
    },
    music: {
      badge: "AUDIO EXPERIENCE",
      titlePart1: "Music features built",
      titleHighlight: "For Everyone",
      subtitle: "Premium audio quality and commands for a superior music experience.",
      filters: {
        title: "Preset Filters",
        desc: "On-the-fly generation to transform any music into an immersive listening experience.",
        label8D: "8D Spatial",
        status: "ACTIVE",
      },
      queue: {
        title: "Queue",
        desc: "Listen to music after music, uninterrupted, all day.",
        nowPlaying: "Now Playing",
      },
      spotify: {
        title: "Spotify",
        desc: "Fully integrated and capable, with Spotify.",
        status: "Synced",
      },
      moreBtn: "20+ more commands",
    },
    platforms: {
      badge: "PLATFORMS",
      titlePart1: "Integrations with your",
      titleHighlight: "favorite Platforms",
      subtitle: "Effortlessly track, view, search, play, notify updates and more from many platforms.",
      cards: {
        spotify: {
          name: "Spotify",
          desc: "Play, Queue, Control your Music, Listen in any Voice Channel, and 14+ more.",
          tag: "14+ commands",
        },
        lastfm: {
          name: "Last.fm",
          desc: "View your current track, Recent Tracks, Search Artists, Profiles, Track Leaderboards, and 20+ more.",
          tag: "20+ commands",
        },
        soundcloud: {
          name: "SoundCloud",
          desc: "Search Songs, Track Feeds, Notify any channel about New Posts and stream audio.",
          tag: "Voice Stream",
        },
        tiktok: {
          name: "TikTok",
          desc: "Search Profiles, Track Feeds, Notify any channel about New Posts.",
          tag: "Live Feeds",
        },
        pinterest: {
          name: "Pinterest",
          desc: "Use Lens Search on images, Search, View Profiles, Embed Live Feed into any channel.",
          tag: "Lens Search",
        },
        youtube: {
          name: "YouTube",
          desc: "High-fidelity audio streaming in voice channels and direct playlist playback.",
          tag: "HD Stream",
        },
        twitch: {
          name: "Twitch",
          desc: "Real-time streamer alerts, notifications and live broadcast tracking.",
          tag: "Live Alerts",
        },
      },
    },
    features: {
      badge: "FEATURES",
      titlePart1: "Countless more",
      titleHighlight: "Features",
      subtitle: "Never worry about needing another bot for anything else, we've got all your needs covered.",
      commandsDivider: {
        before: "Over",
        count: "800+",
        after: "Commands",
      },
      allCommandsBtn: "All Commands",
      hideCommandsBtn: "Hide Commands",
      items: {
        search: {
          title: "Browser Searching",
          desc: "Reverse search images, query images or search online for any website result.",
        },
        tts: {
          title: "Text To Speech",
          desc: "Convert text into a generated voice audio file, or have Etho speak live in any channel. Over 80+ voices.",
        },
        levels: {
          title: "Levels",
          desc: "Leveling system for the users in your server to level up and track experience.",
        },
        snipe: {
          title: "Snipe",
          desc: "Advanced sniping system to get images, videos, edits & reactions.",
        },
        giveaways: {
          title: "Giveaways",
          desc: "Host giveaways fast and easily for your server's members.",
        },
        games: {
          title: "Games",
          desc: "Play blacktea and tic-tac-toe with your friends.",
        },
        autoResponders: {
          title: "Auto Responders",
          desc: "Set up automatic replies to messages that match a trigger.",
        },
        bumpReminder: {
          title: "Bump Reminder",
          desc: "Get reminders to /bump your server on Disboard.",
        },
        counters: {
          title: "Counters",
          desc: "Create counter channels for simple server statistics.",
        },
        reactionTriggers: {
          title: "Reaction Triggers",
          desc: "Set up advanced triggers to messages or previous messages.",
        },
        imageManipulation: {
          title: "Image Manipulation",
          desc: "Turn images, videos and GIFs into memes easily.",
        },
        translation: {
          title: "Translation",
          desc: "Translate text quickly. Over 100+ languages.",
        },
        reminders: {
          title: "Bump Reminder",
          desc: "Get reminders to /bump your server on Disboard.",
        },
        reactionRoles: {
          title: "Reaction Triggers",
          desc: "Set up advanced triggers to messages or previous messages.",
        },
        lyrics: {
          title: "Image Manipulation",
          desc: "Turn images, videos and GIFs into memes easily.",
        },
      },
    },
    steps: {
      eyebrow: "GETTING STARTED",
      titlePart1: "Ready in",
      titleHighlight: "three steps",
      items: [
        {
          step: "1",
          title: "Add the bot",
          desc: "Invite Etho to your server in 1 click with recommended permissions.",
        },
        {
          step: "2",
          title: "Configure via Dashboard",
          desc: "Select only the features and protections your community needs from the dashboard.",
        },
        {
          step: "3",
          title: "Enjoy",
          desc: "Your server is monitored, protected, and animated around the clock.",
        },
      ],
    },
    commands: {
      eyebrow: "COMMANDS",
      title: "Complete Command Catalog",
      subtitle: "Browse every interactive slash command available on Etho.",
      search: "Search commands...",
      all: "All",
      copy: "Copy",
      copied: "Copied!",
      empty: "No command matches your search.",
    },
    faq: {
      eyebrow: "FREQUENTLY ASKED QUESTIONS",
      title: "Everything you need to know",
      subtitle: "Clear and straightforward answers about how Etho works.",
      items: [
        {
          q: "Is Etho free to use?",
          a: "Yes. Core functionalities including anti-raid protection, moderation, music, Spotify bridge, fun commands, and the dashboard are 100% free.",
        },
        {
          q: "How does the anti-raid system work?",
          a: "Etho continuously tracks join waves, repeated pings, and critical role or channel edits. When an attack is detected, the server locks down instantly and compromised settings are restored.",
        },
        {
          q: "How does the Spotify voice bridge work (/spotify vc)?",
          a: "Join any Discord voice channel and play music in your Spotify app. Typing /spotify vc summons Etho to your channel to stream your track live.",
        },
        {
          q: "What is the Owner Shield?",
          a: "It is an exclusive safeguard for server owners: if a rogue administrator attempts to strip your permissions or kick you, Etho blocks the attack and restores your roles immediately.",
        },
        {
          q: "Is my server data safe?",
          a: "Yes. Private messages are never stored. Only minimal server configuration data required for module functionality is encrypted and securely stored.",
        },
      ],
    },
    cta: {
      title: "Ready to elevate your Discord server?",
      subtitle: "Add Etho to your server to handle security, music, and fun in one place.",
      addBtn: "Add to Discord ↗",
      dashboardBtn: "Open Dashboard",
    },
    footer: {
      tagline: "The all-in-one Discord bot for your community",
      botColTitle: "Bot",
      legalColTitle: "Legal",
      rightsReserved: "All rights reserved.",
      dashboard: "Dashboard",
      support: "Support Server",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      cookies: "Cookies",
      legal: "Legal Notice",
      cookieSettings: "Cookie Settings",
    },
  },

  es: {
    meta: {
      title: "Etho — El bot de Discord todo en uno para tu comunidad",
      description: "Protección anti-raid quirúrgica, moderación instantánea, música, puente de voz de Spotify y comandos divertidos e interactivos. Todo lo que tu servidor necesita.",
    },
    nav: {
      features: "Funcionalidades",
      security: "Seguridad",
      music: "Música",
      platforms: "Plataformas",
      steps: "Primeros Pasos",
      commands: "Comandos",
      faq: "Preguntas",
      support: "Soporte",
      invite: "Añadir Etho",
      dashboard: "Panel",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      language: "Idioma",
    },
    hero: {
      badge: "El bot de Discord todo en uno",
      titlePart1: "El bot de Discord todo en uno,",
      titleHighlight: "pensado para tu comunidad",
      subtitle: "Defensa anti-raid quirúrgica, moderación inmediata, música, puente de voz de Spotify y comandos divertidos e interactivos. Activa lo que necesites desde un panel claro y sin complicaciones.",
      addBtn: "Añadir el bot ↗",
      dashboardBtn: "Abrir el panel",
      onlineLabel: "En línea 24/7",
      highlights: [
        "🛡️ Anti-Raid",
        "🎵 Puente de voz Spotify",
        "⚡ Cero latencia",
      ],
    },
    security: {
      badge: "DEFENSA DEL SERVIDOR",
      titlePart1: "Moderación y Seguridad",
      titleHighlight: "de primer nivel",
      subtitle: "Las mejores herramientas para mantener tu comunidad limpia, protegida y segura.",
      filters: {
        title: "Filtros Automáticos",
        desc: "Mantén limpio cualquier chat con nuestras opciones de filtrado automatizado.",
        chips: {
          links: "Enlaces",
          mentions: "Menciones",
          spoilers: "Spoilers",
          invites: "Invitaciones",
        },
      },
      permissions: {
        title: "Seguridad de Permisos",
        desc: "Elimina y revoca permisos peligrosos que puedan explotarse mediante la API de Discord.",
      },
      antiNuke: {
        title: "Anti-Nuke",
        desc: "Evita ataques destructivos en tu servidor con umbrales de alerta totalmente personalizables.",
        scanning: "Escaneo en vivo",
      },
      antiRaid: {
        title: "Anti-Raid",
        desc: "Protege tu servidor contra oleadas de bots con filtros de edad de cuenta y avatar.",
        verified: "Identidad verificada",
      },
      moreBtn: "100+ comandos de seguridad",
    },
    music: {
      badge: "EXPERIENCIA DE AUDIO",
      titlePart1: "Funciones musicales creadas",
      titleHighlight: "para todos",
      subtitle: "Calidad de audio premium y comandos completos para una experiencia musical superior.",
      filters: {
        title: "Filtros preestablecidos",
        desc: "Generación en tiempo real para transformar cualquier música en una experiencia inmersiva.",
        label8D: "8D Espacial",
        status: "ACTIVO",
      },
      queue: {
        title: "Cola de reproducción",
        desc: "Escucha canción tras canción, sin interrupciones, todo el día.",
        nowPlaying: "Reproduciendo",
      },
      spotify: {
        title: "Spotify",
        desc: "Totalmente integrado y capaz con Spotify.",
        status: "Sincronizado",
      },
      moreBtn: "20+ más comandos",
    },
    platforms: {
      badge: "PLATAFORMAS",
      titlePart1: "Integraciones con tus",
      titleHighlight: "Plataformas favoritas",
      subtitle: "Sigue, escucha, busca y transmite en vivo desde tus servicios favoritos con total facilidad.",
      cards: {
        spotify: {
          name: "Spotify",
          desc: "Reproduce, gestiona la cola, transmite en canales de voz y comparte tus canciones favoritas.",
          tag: "14+ comandos",
        },
        lastfm: {
          name: "Last.fm",
          desc: "Scrobbles en vivo, canciones recientes, artistas principales, comparador de gustos y más.",
          tag: "20+ comandos",
        },
        soundcloud: {
          name: "SoundCloud",
          desc: "Busca canciones, transmite en canales de voz y comparte pistas de audio directamente.",
          tag: "Voz directa",
        },
        tiktok: {
          name: "TikTok",
          desc: "Busca perfiles, sigue creadores y recibe alertas automáticas de nuevas publicaciones.",
          tag: "Alertas en vivo",
        },
        pinterest: {
          name: "Pinterest",
          desc: "Búsqueda visual Lens de imágenes, perfiles e integración de tableros en tus canales.",
          tag: "Búsqueda Lens",
        },
        youtube: {
          name: "YouTube",
          desc: "Transmisión de audio en canales de voz en alta fidelidad y reproducción de playlists.",
          tag: "Transmisión HD",
        },
        twitch: {
          name: "Twitch",
          desc: "Alertas en tiempo real de directos de streamers y notificaciones automáticas.",
          tag: "Directos 0s",
        },
      },
    },
    features: {
      badge: "CATÁLOGO",
      titlePart1: "Innumerables funciones",
      titleHighlight: "adicionales",
      subtitle: "No te preocupes por necesitar otro bot para nada más, cubrimos todas tus necesidades.",
      commandsDivider: {
        before: "Más de",
        count: "800+",
        after: "Comandos",
      },
      allCommandsBtn: "Todos los comandos",
      hideCommandsBtn: "Ocultar comandos",
      items: {
        search: {
          title: "Búsqueda web",
          desc: "Búsqueda inversa de imágenes, consultas visuales o búsqueda en la web para cualquier resultado.",
        },
        tts: {
          title: "Texto a voz (TTS)",
          desc: "Convierte texto en audio o haz que Etho hable en directo en cualquier canal. Más de 80+ voces.",
        },
        levels: {
          title: "Niveles y XP",
          desc: "Sistema de niveles para que los miembros de tu servidor suban de nivel y sigan su experiencia.",
        },
        snipe: {
          title: "Snipe",
          desc: "Sistema avanzado para recuperar imágenes, vídeos, ediciones y reacciones eliminadas.",
        },
        giveaways: {
          title: "Sorteos",
          desc: "Organiza sorteos rápidos y fáciles para los miembros de tu servidor.",
        },
        games: {
          title: "Juegos",
          desc: "Juega a blacktea, tres en raya y muchos minijuegos con tus amigos.",
        },
        autoResponders: {
          title: "Auto-respuestas",
          desc: "Configura respuestas automáticas a mensajes que coincidan con un disparador.",
        },
        bumpReminder: {
          title: "Recordatorio de Bump",
          desc: "Recibe recordatorios para hacer /bump de tu servidor en Disboard.",
        },
        counters: {
          title: "Canales contadores",
          desc: "Crea canales contadores para estadísticas simples de tu servidor.",
        },
        reactionTriggers: {
          title: "Disparadores de reacción",
          desc: "Configura disparadores avanzados en mensajes o mensajes anteriores.",
        },
        imageManipulation: {
          title: "Manipulación de imágenes",
          desc: "Convierte imágenes, vídeos y GIFs en memes fácilmente.",
        },
        translation: {
          title: "Traducción",
          desc: "Traduce texto rápidamente en más de 100 idiomas.",
        },
        reminders: {
          title: "Recordatorio de Bump",
          desc: "Recibe recordatorios para hacer /bump de tu servidor en Disboard.",
        },
        reactionRoles: {
          title: "Disparadores de reacción",
          desc: "Configura disparadores avanzados en mensajes o mensajes anteriores.",
        },
        lyrics: {
          title: "Manipulación de imágenes",
          desc: "Convierte imágenes, vídeos y GIFs en memes fácilmente.",
        },
      },
    },
    steps: {
      eyebrow: "PRIMEROS PASOS",
      titlePart1: "Listo en",
      titleHighlight: "tres pasos",
      items: [
        {
          step: "1",
          title: "Añade el bot",
          desc: "Invita a Etho a tu servidor en un clic con los permisos necesarios.",
        },
        {
          step: "2",
          title: "Configura desde el Panel",
          desc: "Activa únicamente los módulos que tu comunidad realmente necesita.",
        },
        {
          step: "3",
          title: "Disfruta",
          desc: "Tu servidor está protegido, moderado y animado las 24 horas del día.",
        },
      ],
    },
    commands: {
      eyebrow: "COMANDOS",
      title: "Catálogo de Comandos",
      subtitle: "Explora la lista completa de comandos interactivos disponibles.",
      search: "Buscar comando...",
      all: "Todos",
      copy: "Copiar",
      copied: "¡Copiado!",
      empty: "Ningún comando coincide con tu búsqueda.",
    },
    faq: {
      eyebrow: "PREGUNTAS FRECUENTES",
      title: "Todo lo que necesitas saber",
      subtitle: "Respuestas claras sobre el funcionamiento de Etho.",
      items: [
        {
          q: "¿Etho es gratuito?",
          a: "Sí. Las funciones esenciales como anti-raid, moderación, música, Spotify y comandos divertidos son 100% gratuitas.",
        },
        {
          q: "¿Cómo funciona la protección anti-raid?",
          a: "Etho monitoriza en tiempo real las olas de entradas sospechosas y cambios críticos. Bloquea el servidor de inmediato y restaura los ajustes.",
        },
        {
          q: "¿Cómo funciona el puente de voz de Spotify (/spotify vc)?",
          a: "Únete a un canal de voz y pon tu música en Spotify. Al escribir /spotify vc, Etho entra en la llamada y transmite tu música sincronizada.",
        },
        {
          q: "¿Qué es el Escudo Owner?",
          a: "Es una defensa exclusiva para el dueño del servidor: si un administrador intenta quitarte permisos, Etho bloquea el ataque y te restaura.",
        },
        {
          q: "¿Están seguros los datos de mi servidor?",
          a: "Totalmente. No se registran mensajes privados y solo se guardan de forma cifrada las configuraciones necesarias.",
        },
      ],
    },
    cta: {
      title: "¿Listo para transformar tu servidor de Discord?",
      subtitle: "Añade Etho a tu servidor para gestionar seguridad, música y entretenimiento en un solo lugar.",
      addBtn: "Añadir el bot ↗",
      dashboardBtn: "Abrir el panel",
    },
    footer: {
      tagline: "El bot de Discord todo en uno para tu comunidad",
      botColTitle: "Bot",
      legalColTitle: "Legal",
      rightsReserved: "Todos los derechos reservados.",
      dashboard: "Panel",
      support: "Servidor de Soporte",
      terms: "Términos de Servicio",
      privacy: "Política de Privacidad",
      cookies: "Cookies",
      legal: "Aviso Legal",
      cookieSettings: "Configuración de cookies",
    },
  },

  de: {
    meta: {
      title: "Etho — Der All-in-One Discord-Bot für deine Community",
      description: "Präziser Anti-Raid-Schutz, sofortige Moderation, Musik, Spotify-Voice-Bridge und interaktive Fun-Befehle. Alles, was dein Server braucht.",
    },
    nav: {
      features: "Funktionen",
      security: "Sicherheit",
      music: "Musik",
      platforms: "Plattformen",
      steps: "Erste Schritte",
      commands: "Befehle",
      faq: "FAQ",
      support: "Support",
      invite: "Etho hinzufügen",
      dashboard: "Dashboard",
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
      language: "Sprache",
    },
    hero: {
      badge: "Der All-in-One Discord-Bot",
      titlePart1: "Der All-in-One Discord-Bot,",
      titleHighlight: "gebaut für deine Community",
      subtitle: "Chirurgischer Anti-Raid-Schutz, blitzschnelle Moderation, Musik, Spotify-Voice-Bridge und interaktive Fun-Befehle. Aktiviere, was du brauchst, und passe alles im Dashboard an.",
      addBtn: "Bot hinzufügen ↗",
      dashboardBtn: "Dashboard öffnen",
      onlineLabel: "Online 24/7",
      highlights: [
        "🛡️ Anti-Raid",
        "🎵 Spotify Voice-Bridge",
        "⚡ Null Latenz",
      ],
    },
    security: {
      badge: "SERVER-SCHUTZ",
      titlePart1: "Erstklassige Moderation",
      titleHighlight: "und Sicherheit",
      subtitle: "Die besten Werkzeuge, um deine Community sauber, verriegelt und geschützt zu halten.",
      filters: {
        title: "Automatisierte Filter",
        desc: "Halte jeden Textkanal mit flexiblen Filteroptionen sauber.",
        chips: {
          links: "Links",
          mentions: "Mass-Mentions",
          spoilers: "Spoiler",
          invites: "Einladungen",
        },
      },
      permissions: {
        title: "Rechte-Sicherheit",
        desc: "Entferne gefährliche Discord-Rechte, die über die API missbraucht werden könnten.",
      },
      antiNuke: {
        title: "Anti-Nuke",
        desc: "Verhindere Server-Zerstörungen mit anpassbaren Schwellenwerten für Rollen und Kanäle.",
        scanning: "Echtzeit-Scan",
      },
      antiRaid: {
        title: "Anti-Raid",
        desc: "Schütze deinen Server vor organisierten Bot-Raids durch Account-Alter- und Avatar-Filter.",
        verified: "Verifiziert",
      },
      moreBtn: "100+ Sicherheitsbefehle",
    },
    music: {
      badge: "AUDIO-ERLEBNIS",
      titlePart1: "Musikfunktionen gebaut",
      titleHighlight: "für jeden",
      subtitle: "Erstklassige Audioqualität und Befehle für ein herausragendes Musikerlebnis.",
      filters: {
        title: "Voreingestellte Filter",
        desc: "Echtzeit-Verarbeitung für ein immersives Hörerlebnis jedes Titels.",
        label8D: "8D Raumklang",
        status: "AKTIV",
      },
      queue: {
        title: "Warteschlange",
        desc: "Höre Track für Track, ohne Unterbrechung, den ganzen Tag.",
        nowPlaying: "Aktuelle Wiedergabe",
      },
      spotify: {
        title: "Spotify",
        desc: "Vollständig integriert und steuerbar mit Spotify.",
        status: "Synchronisiert",
      },
      moreBtn: "20+ weitere Befehle",
    },
    platforms: {
      badge: "PLATTFORMEN",
      titlePart1: "Integrationen mit deinen",
      titleHighlight: "Lieblingsplattformen",
      subtitle: "Tracke, höre, suche und streame Live-Medien von all deinen bevorzugten Diensten.",
      cards: {
        spotify: {
          name: "Spotify",
          desc: "Spiele, steuere deine Musik im Sprachkanal, verwalte die Queue und teile Songs.",
          tag: "14+ Befehle",
        },
        lastfm: {
          name: "Last.fm",
          desc: "Live-Scrobbles, kürzlich gehörte Titel, Top-Künstler, Geschmacksvergleich und Leaderboards.",
          tag: "20+ Befehle",
        },
        soundcloud: {
          name: "SoundCloud",
          desc: "Suche Tracks, streame Audio direkt in Sprachkanälen und teile Wiedergabelisten.",
          tag: "Direkt-Voice",
        },
        tiktok: {
          name: "TikTok",
          desc: "Profile durchsuchen, Feeds verfolgen und Benachrichtigungen bei neuen Videos erhalten.",
          tag: "Live-Alerts",
        },
        pinterest: {
          name: "Pinterest",
          desc: "Visuelle Lens-Suche auf Bildern, Profile und Pin-Feeds direkt in deine Kanäle einbinden.",
          tag: "Lens-Suche",
        },
        youtube: {
          name: "YouTube",
          desc: "High-Fidelity Audio-Streaming in Sprachkanälen und Playlist-Wiedergabe.",
          tag: "HD-Streaming",
        },
        twitch: {
          name: "Twitch",
          desc: "Echtzeit-Streamer-Benachrichtigungen und automatische Live-Meldungen.",
          tag: "Live-Alerts",
        },
      },
    },
    features: {
      badge: "FUNKTIONEN",
      titlePart1: "Zahllose weitere",
      titleHighlight: "Funktionen",
      subtitle: "Keine Sorge mehr, jemals einen anderen Bot zu benötigen – wir decken alle deine Bedürfnisse ab.",
      commandsDivider: {
        before: "Über",
        count: "800+",
        after: "Befehle",
      },
      allCommandsBtn: "Alle Befehle",
      hideCommandsBtn: "Befehle ausblenden",
      items: {
        search: {
          title: "Browser-Suche",
          desc: "Rückwärtssuche von Bildern, Bildabfragen oder Online-Suche nach jedem Website-Ergebnis.",
        },
        tts: {
          title: "Text to Speech (TTS)",
          desc: "Wandle Text in Sprachaudiodateien um oder lass Etho live in jedem Kanal sprechen. Über 80+ Stimmen.",
        },
        levels: {
          title: "Level-System",
          desc: "Levelsystem für Servermitglieder zum Aufsteigen und Verfolgen von Erfahrung.",
        },
        snipe: {
          title: "Snipe",
          desc: "Erweitertes Snipe-System für gelöschte Bilder, Videos, Edits und Reaktionen.",
        },
        giveaways: {
          title: "Giveaways",
          desc: "Veranstalte Giveaways schnell und einfach für deine Servermitglieder.",
        },
        games: {
          title: "Spiele",
          desc: "Spiele Blacktea, Tic-Tac-Toe und viele Minispiele mit deinen Freunden.",
        },
        autoResponders: {
          title: "Auto-Responder",
          desc: "Richte automatische Antworten auf Nachrichten ein, die einem Trigger entsprechen.",
        },
        bumpReminder: {
          title: "Bump-Erinnerung",
          desc: "Erhalte Erinnerungen für /bump deines Servers auf Disboard.",
        },
        counters: {
          title: "Zähler-Kanäle",
          desc: "Erstelle Zähler-Kanäle für einfache Serverstatistiken.",
        },
        reactionTriggers: {
          title: "Reaktions-Trigger",
          desc: "Richte erweiterte Trigger auf Nachrichten oder vorherige Nachrichten ein.",
        },
        imageManipulation: {
          title: "Bildbearbeitung",
          desc: "Verwandle Bilder, Videos und GIFs einfach in Memes.",
        },
        translation: {
          title: "Übersetzung",
          desc: "Übersetze Text schnell in über 100 Sprachen.",
        },
        reminders: {
          title: "Bump-Erinnerung",
          desc: "Erhalte Erinnerungen für /bump deines Servers auf Disboard.",
        },
        reactionRoles: {
          title: "Reaktions-Trigger",
          desc: "Richte erweiterte Trigger auf Nachrichten oder vorherige Nachrichten ein.",
        },
        lyrics: {
          title: "Bildbearbeitung",
          desc: "Verwandle Bilder, Videos und GIFs einfach in Memes.",
        },
      },
    },
    steps: {
      eyebrow: "ERSTE SCHRITTE",
      titlePart1: "In drei Schritten",
      titleHighlight: "startklar",
      items: [
        {
          step: "1",
          title: "Bot hinzufügen",
          desc: "Lade Etho mit einem Klick und den erforderlichen Berechtigungen auf deinen Server ein.",
        },
        {
          step: "2",
          title: "Im Dashboard konfigurieren",
          desc: "Wähle im Dashboard genau die Module aus, die deine Community wirklich braucht.",
        },
        {
          step: "3",
          title: "Genießen",
          desc: "Dein Server ist rund um die Uhr geschützt, moderiert und belebt.",
        },
      ],
    },
    commands: {
      eyebrow: "BEFEHLE",
      title: "Befehlskatalog",
      subtitle: "Erkunde alle interaktiven Slash-Befehle, die auf Etho bereitstehen.",
      search: "Befehl suchen...",
      all: "Alle",
      copy: "Kopieren",
      copied: "Kopiert!",
      empty: "Kein Befehl passt zu deiner Suche.",
    },
    faq: {
      eyebrow: "HÄUFIG GESTELLTE FRAGEN",
      title: "Alles, was du wissen musst",
      subtitle: "Klare und transparente Antworten zu Etho.",
      items: [
        {
          q: "Ist Etho kostenlos?",
          a: "Ja. Alle Kernfunktionen wie Anti-Raid-Schutz, Moderation, Musik, Spotify-Bridge und Fun-Befehle sind 100% kostenlos.",
        },
        {
          q: "Wie funktioniert der Anti-Raid-Schutz?",
          a: "Etho überwacht Beitrittswellen und kritische Rollenänderungen in Echtzeit. Bei verdächtigen Aktivitäten greift ein sofortiger Lockdown.",
        },
        {
          q: "Wie funktioniert die Spotify-Voice-Bridge (/spotify vc)?",
          a: "Gehe in einen Sprachkanal und starte Musik auf Spotify. /spotify vc lässt Etho beitreten und überträgt deinen Track synchron.",
        },
        {
          q: "Was ist das Owner-Schild?",
          a: "Ein exklusiver Schutz für den Serverbesitzer: Selbst wenn Administrator-Rechte missbraucht werden, stellt Etho deine Rechte sofort wieder her.",
        },
        {
          q: "Sind meine Serverdaten sicher?",
          a: "Ja. Private Nachrichten werden niemals gespeichert. Nur erforderliche Modulkonfigurationen werden verschlüsselt hinterlegt.",
        },
      ],
    },
    cta: {
      title: "Bereit, deinen Discord-Server aufzuwerten?",
      subtitle: "Füge Etho deinem Server hinzu, um Sicherheit, Musik und Animation an einem Ort zu verwalten.",
      addBtn: "Bot hinzufügen ↗",
      dashboardBtn: "Dashboard öffnen",
    },
    footer: {
      tagline: "Der All-in-One Discord-Bot für deine Community",
      botColTitle: "Bot",
      legalColTitle: "Legal",
      rightsReserved: "Alle Rechte vorbehalten.",
      dashboard: "Dashboard",
      support: "Support-Server",
      terms: "Nutzungsbedingungen",
      privacy: "Datenschutzerklärung",
      cookies: "Cookies",
      legal: "Impressum",
      cookieSettings: "Cookie-Einstellungen",
    },
  },
};

export const BOT_LANG_KEY = "ethone-bot-lang";

export function detectBotLang(): BotLang {
  try {
    const saved = localStorage.getItem(BOT_LANG_KEY);
    if (saved && (BOT_LANGS as readonly string[]).includes(saved)) return saved as BotLang;
  } catch {}
  const nav = (typeof navigator !== "undefined" ? navigator.languages?.[0] || navigator.language : "") || "";
  const short = nav.slice(0, 2).toLowerCase();
  return (BOT_LANGS as readonly string[]).includes(short) ? (short as BotLang) : "fr";
}
