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
  features: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    items: {
      search: BotFeatureItem;
      tts: BotFeatureItem;
      levels: BotFeatureItem;
      snipe: BotFeatureItem;
      giveaways: BotFeatureItem;
      games: BotFeatureItem;
      autoResponders: BotFeatureItem;
      reminders: BotFeatureItem;
      counters: BotFeatureItem;
      reactionRoles: BotFeatureItem;
      lyrics: BotFeatureItem;
      translation: BotFeatureItem;
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
    dashboard: string;
    support: string;
    terms: string;
    privacy: string;
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
      subtitle: "Modération chirurgicale, protection anti-raid, musique haute fidélité, pont vocal Spotify et commandes fun format Bleed. Active ce dont tu as besoin et configure tout depuis un dashboard clair, sans superflu.",
      addBtn: "Ajouter le bot ↗",
      dashboardBtn: "Ouvrir le dashboard",
      onlineLabel: "En ligne 24/7",
      highlights: [
        "🛡️ Anti-Raid 0.2s",
        "🎵 Pont vocal Spotify",
        "⚡ Zéro latence",
        "🎉 Commandes Fun Bleed",
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
      titlePart1: "Fonctionnalités musicales",
      titleHighlight: "pensées pour tous",
      subtitle: "Qualité audio haute fidélité et commandes directes pour une expérience sonore exceptionnelle.",
      filters: {
        title: "Filtres Audio 8D",
        desc: "Traitement spatialisé en direct pour transformer n'importe quel morceau en écoute immersive.",
        label8D: "8D Spatial",
        status: "ACTIF",
      },
      queue: {
        title: "File d'attente fluide",
        desc: "Écoutez titre après titre, sans interruption ni coupure toute la journée.",
        nowPlaying: "Lecture en cours",
      },
      spotify: {
        title: "Intégration Spotify",
        desc: "Totalement intégré avec Spotify. Diffusez vos morceaux dans les salons vocaux avec /spotify vc.",
        status: "Synchronisé",
      },
      moreBtn: "20+ commandes musicales",
    },
    features: {
      badge: "CATALOGUE",
      titlePart1: "Des dizaines de",
      titleHighlight: "fonctionnalités",
      subtitle: "Tout ce dont votre serveur a besoin réuni au même endroit, sans jamais devoir ajouter un autre bot.",
      items: {
        search: {
          title: "Recherche Visuelle",
          desc: "Recherchez des images sur DuckDuckGo et lancez des recherches inversées instantanées.",
        },
        tts: {
          title: "Synthèse Vocale",
          desc: "Convertissez du texte en audio haute fidélité diffusé en direct dans votre salon vocal.",
        },
        levels: {
          title: "Niveaux & XP",
          desc: "Système de progression pour les membres avec cartes de rang et attribution de rôles.",
        },
        snipe: {
          title: "Audit & Snipe",
          desc: "Retrouvez les messages récemment supprimés ou modifiés pour un suivi transparent.",
        },
        giveaways: {
          title: "Giveaways & Tirages",
          desc: "Organisez des concours facilement avec conditions de participation et reroll immédiat.",
        },
        games: {
          title: "Mini-Jeux",
          desc: "Divertissez vos membres avec des jeux interactifs et des fiches complètes de jeux vidéo.",
        },
        autoResponders: {
          title: "Réponses Auto",
          desc: "Configurez des réponses automatiques aux messages qui contiennent des mots-clés définis.",
        },
        reminders: {
          title: "Rappels Programmés",
          desc: "Programmez des rappels automatiques pour vos événements et rendez-vous de communauté.",
        },
        counters: {
          title: "Salons Compteurs",
          desc: "Affichez en temps réel le nombre de membres, de bots et de rôles dans des salons dédiés.",
        },
        reactionRoles: {
          title: "Rôles de Réaction",
          desc: "Attribution instantanée de rôles par clic sur bouton ou réaction pour un accueil propre.",
        },
        lyrics: {
          title: "Paroles de Musique",
          desc: "Recherche de paroles de chansons complètes en direct via LRCLib directement sur Discord.",
        },
        translation: {
          title: "Traduction Rapide",
          desc: "Traduisez rapidement des messages entre plus de 50 langues sans quitter votre salon.",
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
      subtitle: "Rejoins des centaines de communautés qui font confiance à Etho chaque jour pour leur sécurité, leur musique et leur animation.",
      addBtn: "Ajouter le bot ↗",
      dashboardBtn: "Ouvrir le dashboard",
    },
    footer: {
      tagline: "Le bot Discord tout-en-un pour votre communauté",
      dashboard: "Dashboard",
      support: "Support Discord",
      terms: "Conditions",
      privacy: "Confidentialité",
    },
  },

  en: {
    meta: {
      title: "Etho — The All-in-One Discord Bot for Your Community",
      description: "Surgical anti-raid protection, instant moderation, music, Spotify voice bridge, and Bleed-style fun commands. Everything your server needs without fluff.",
    },
    nav: {
      features: "Features",
      security: "Security",
      music: "Music",
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
      subtitle: "Surgical anti-raid defense, instant moderation, high-fidelity music, Spotify voice bridge, and Bleed-style fun commands. Enable what you need and configure everything from a clean dashboard.",
      addBtn: "Add to Discord ↗",
      dashboardBtn: "Open Dashboard",
      onlineLabel: "Online 24/7",
      highlights: [
        "🛡️ 0.2s Anti-Raid",
        "🎵 Spotify Voice Bridge",
        "⚡ Sub-15ms Latency",
        "🎉 Bleed Fun Commands",
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
        title: "Preset Audio Filters",
        desc: "On-the-fly generation to transform any music into an immersive listening experience.",
        label8D: "8D Spatial",
        status: "ACTIVE",
      },
      queue: {
        title: "Seamless Queue",
        desc: "Listen to music after music, uninterrupted, all day without skips.",
        nowPlaying: "Now Playing",
      },
      spotify: {
        title: "Spotify Integration",
        desc: "Fully integrated and capable, stream your current Spotify track into voice with /spotify vc.",
        status: "Connected",
      },
      moreBtn: "20+ music commands",
    },
    features: {
      badge: "FEATURES",
      titlePart1: "Countless more",
      titleHighlight: "Features",
      subtitle: "Never worry about needing another bot for anything else, we've got all your needs covered.",
      items: {
        search: {
          title: "Browser Searching",
          desc: "Reverse search images, query high-resolution visuals, or search online for any website result.",
        },
        tts: {
          title: "Text To Speech",
          desc: "Convert text into voice audio or stream high-fidelity voice announcements live in any channel.",
        },
        levels: {
          title: "Levels & XP",
          desc: "Leveling system for users in your server to level up and track message and voice experience.",
        },
        snipe: {
          title: "Message Snipe",
          desc: "Advanced sniping system to inspect recently deleted or edited messages and reactions.",
        },
        giveaways: {
          title: "Giveaways",
          desc: "Host giveaways fast and easily with custom conditions and one-click rerolls.",
        },
        games: {
          title: "Games & Media",
          desc: "Play games, search video game deals, movie lookups, and stylized quote cards.",
        },
        autoResponders: {
          title: "Auto Responders",
          desc: "Set up automatic replies to messages that match a custom trigger.",
        },
        reminders: {
          title: "Bump & Reminders",
          desc: "Get reminders to bump your server or send scheduled alerts for community events.",
        },
        counters: {
          title: "Channel Counters",
          desc: "Create dynamic voice counter channels for simple, real-time server statistics.",
        },
        reactionRoles: {
          title: "Reaction Roles",
          desc: "Instant role assignment on button clicks or reactions for clean member onboarding.",
        },
        lyrics: {
          title: "Song Lyrics",
          desc: "Live lyrics search and synced scrolling powered by LRCLib right inside Discord.",
        },
        translation: {
          title: "Translation",
          desc: "Translate messages quickly across more than 50 languages in real time.",
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
      subtitle: "Join hundreds of thriving communities relying on Etho every day for security, music, and fun.",
      addBtn: "Add to Discord ↗",
      dashboardBtn: "Open Dashboard",
    },
    footer: {
      tagline: "The all-in-one Discord bot for your community",
      dashboard: "Dashboard",
      support: "Discord Support",
      terms: "Terms",
      privacy: "Privacy",
    },
  },

  es: {
    meta: {
      title: "Etho — El bot de Discord todo en uno para tu comunidad",
      description: "Protección anti-raid quirúrgica, moderación instantánea, música, puente de voz de Spotify y comandos divertidos estilo Bleed. Todo lo que tu servidor necesita.",
    },
    nav: {
      features: "Funcionalidades",
      security: "Seguridad",
      music: "Música",
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
      subtitle: "Defensa anti-raid quirúrgica, moderación inmediata, música, puente de voz de Spotify y comandos divertidos estilo Bleed. Activa lo que necesites desde un panel claro y sin complicaciones.",
      addBtn: "Añadir el bot ↗",
      dashboardBtn: "Abrir el panel",
      onlineLabel: "En línea 24/7",
      highlights: [
        "🛡️ Anti-Raid 0.2s",
        "🎵 Puente de voz Spotify",
        "⚡ Cero latencia",
        "🎉 Comandos Bleed",
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
      titlePart1: "Música creada",
      titleHighlight: "para todos",
      subtitle: "Calidad de audio premium, comandos en directo e integración nativa con Spotify.",
      filters: {
        title: "Filtros de Audio 8D",
        desc: "Transforma cualquier música en una experiencia inmersiva y envolvente en tiempo real.",
        label8D: "8D Espacial",
        status: "ACTIVO",
      },
      queue: {
        title: "Cola Continua",
        desc: "Escucha música tras música todo el día sin cortes ni saltos.",
        nowPlaying: "Reproduciendo",
      },
      spotify: {
        title: "Integración Spotify",
        desc: "Totalmente compatible con Spotify, transmite en voz con /spotify vc al instante.",
        status: "Conectado",
      },
      moreBtn: "20+ comandos musicales",
    },
    features: {
      badge: "CATÁLOGO",
      titlePart1: "Innumerables",
      titleHighlight: "Funciones",
      subtitle: "Todo lo que tu comunidad necesita reunido en un solo lugar, sin necesidad de otro bot.",
      items: {
        search: {
          title: "Búsqueda Visual",
          desc: "Búsqueda de imágenes en DuckDuckGo y búsqueda inversa en Google Lens y TinEye.",
        },
        tts: {
          title: "Texto a Voz",
          desc: "Convierte texto en audio y reproduce sonido de alta calidad en canales de voz.",
        },
        levels: {
          title: "Niveles y XP",
          desc: "Sistema de niveles por mensajes y voz con tarjetas de rango y roles de premio.",
        },
        snipe: {
          title: "Inspección Snipe",
          desc: "Recupera mensajes y reacciones eliminadas o editadas recientemente.",
        },
        giveaways: {
          title: "Sorteos",
          desc: "Organiza sorteos fácilmente con condiciones personalizadas y relanzamiento en un clic.",
        },
        games: {
          title: "Juegos y Medios",
          desc: "Juegos interactivos, ofertas de videojuegos, películas y generador de citas.",
        },
        autoResponders: {
          title: "Respuestas Auto",
          desc: "Configura respuestas automáticas a mensajes que coincidan con palabras clave.",
        },
        reminders: {
          title: "Recordatorios",
          desc: "Programa recordatorios y alertas automáticas para eventos de tu servidor.",
        },
        counters: {
          title: "Canales Contadores",
          desc: "Canales dinámicos que muestran miembros, bots y estadísticas en tiempo real.",
        },
        reactionRoles: {
          title: "Roles por Reacción",
          desc: "Asignación rápida de roles mediante clics en botones o reacciones.",
        },
        lyrics: {
          title: "Letras de Canciones",
          desc: "Búsqueda y visualización sincronizada de letras de canciones con LRCLib.",
        },
        translation: {
          title: "Traducción Rápida",
          desc: "Traduce mensajes rápidamente entre más de 50 idiomas en tiempo real.",
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
      subtitle: "Únete a cientos de comunidades que confían en Etho cada día para su seguridad y entretenimiento.",
      addBtn: "Añadir el bot ↗",
      dashboardBtn: "Abrir el panel",
    },
    footer: {
      tagline: "El bot de Discord todo en uno para tu comunidad",
      dashboard: "Panel",
      support: "Soporte Discord",
      terms: "Términos",
      privacy: "Privacidad",
    },
  },

  de: {
    meta: {
      title: "Etho — Der All-in-One Discord-Bot für deine Community",
      description: "Präziser Anti-Raid-Schutz, sofortige Moderation, Musik, Spotify-Voice-Bridge und Bleed-Style Fun-Befehle. Alles, was dein Server braucht.",
    },
    nav: {
      features: "Funktionen",
      security: "Sicherheit",
      music: "Musik",
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
      subtitle: "Chirurgischer Anti-Raid-Schutz, blitzschnelle Moderation, Musik, Spotify-Voice-Bridge und Bleed-Style Fun-Befehle. Aktiviere, was du brauchst, und passe alles im Dashboard an.",
      addBtn: "Bot hinzufügen ↗",
      dashboardBtn: "Dashboard öffnen",
      onlineLabel: "Online 24/7",
      highlights: [
        "🛡️ 0.2s Anti-Raid",
        "🎵 Spotify Voice-Bridge",
        "⚡ Null Latenz",
        "🎉 Bleed Fun-Befehle",
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
      titlePart1: "Musik geschaffen",
      titleHighlight: "für jeden",
      subtitle: "Erstklassige Klangqualität, Live-Steuerung und native Spotify-Integration.",
      filters: {
        title: "8D-Audiofilter",
        desc: "Echtzeit-Soundeffekte für ein immersives und räumliches Hörerlebnis.",
        label8D: "8D Raumklang",
        status: "AKTIV",
      },
      queue: {
        title: "Unterbrechungsfreie Queue",
        desc: "Höre deine Lieblingstitel den ganzen Tag ohne Pause oder Ruckler.",
        nowPlaying: "Aktueller Titel",
      },
      spotify: {
        title: "Spotify-Integration",
        desc: "Spotify nahtlos verknüpfen und direkt per /spotify vc in Sprachkanälen streamen.",
        status: "Verbunden",
      },
      moreBtn: "20+ Musik-Befehle",
    },
    features: {
      badge: "FUNKTIONEN",
      titlePart1: "Zahllose weitere",
      titleHighlight: "Funktionen",
      subtitle: "Alles, was deine Community braucht, an einem einzigen Ort – ohne je einen weiteren Bot zu benötigen.",
      items: {
        search: {
          title: "Web- & Bildsuche",
          desc: "Bilder auf DuckDuckGo suchen und Bildrückwärtssuche auf Google Lens und TinEye nutzen.",
        },
        tts: {
          title: "Sprachausgabe",
          desc: "Sprachkanäle mit hochwertigem Sound und Text-to-Speech-Ansagen versorgen.",
        },
        levels: {
          title: "Level & XP",
          desc: "XP-System für Nachrichten und Sprachkanäle mit Rang-Karten und automatischen Rollen.",
        },
        snipe: {
          title: "Nachrichten-Snipe",
          desc: "Kürzlich gelöschte oder bearbeitete Nachrichten und Reaktionen transparent einsehen.",
        },
        giveaways: {
          title: "Gewinnspiele",
          desc: "Gewinnspiele blitzschnell mit Teilnahmebedingungen und 1-Klick-Reroll veranstalten.",
        },
        games: {
          title: "Spiele & Medien",
          desc: "Unterhaltsame Befehle: Film- und Spiele-Abfragen, Zitate-Generator und Mini-Spiele.",
        },
        autoResponders: {
          title: "Auto-Antworten",
          desc: "Schlüsselwort-Auslöser und programmierte Antworten zur Orientierung deiner Mitglieder.",
        },
        reminders: {
          title: "Erinnerungen",
          desc: "Erinnerungen und automatische Benachrichtigungen für Community-Events planen.",
        },
        counters: {
          title: "Zähler-Kanäle",
          desc: "Dynamische Sprachkanäle, die Mitglieder, Bots und Boosts live anzeigen.",
        },
        reactionRoles: {
          title: "Reaktions-Rollen",
          desc: "Sofortige Rollenvergabe per Klick auf Buttons oder Reaktionen für einen sauberen Empfang.",
        },
        lyrics: {
          title: "Songtexte",
          desc: "Live-Songtext-Suche und synchrones Scrollen via LRCLib direkt in Discord.",
        },
        translation: {
          title: "Sofort-Übersetzung",
          desc: "Nachrichten in Echtzeit blitzschnell zwischen über 50 Sprachen übersetzen.",
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
      subtitle: "Schließe dich hunderten Communities an, die Etho täglich für Sicherheit, Musik und Animation vertrauen.",
      addBtn: "Bot hinzufügen ↗",
      dashboardBtn: "Dashboard öffnen",
    },
    footer: {
      tagline: "Der All-in-One Discord-Bot für deine Community",
      dashboard: "Dashboard",
      support: "Discord Support",
      terms: "Bedingungen",
      privacy: "Datenschutz",
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
