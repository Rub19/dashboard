export const BOT_LANGS = ["fr", "en", "es", "de"] as const;
export type BotLang = (typeof BOT_LANGS)[number];

export interface BotCopy {
  meta: { title: string; description: string };
  nav: {
    features: string;
    bento: string;
    dashboard: string;
    commands: string;
    faq: string;
    support: string;
    invite: string;
    openMenu: string;
    closeMenu: string;
    mobileMenu: string;
    mainNav: string;
    footerNav: string;
    language: string;
  };
  hero: {
    badgeDefault: string;
    badgeActive: (guilds: number, members: string) => string;
    title: string;
    subtitle: string;
    add: string;
    openDashboard: string;
    highlights: string[];
  };
  stats: {
    servers: [string, string];
    members: string;
    commands: string;
    uptime: string;
  };
  bento: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: {
      shield: { title: string; desc: string; tag: string };
      spotify: { title: string; desc: string; tag: string };
      fun: { title: string; desc: string; tag: string };
      automod: { title: string; desc: string; tag: string };
      welcome: { title: string; desc: string; tag: string };
      leveling: { title: string; desc: string; tag: string };
    };
  };
  steps: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ step: string; title: string; text: string }>;
  };
  commands: {
    eyebrow: string;
    title: string;
    subtitleLive: (n: string) => string;
    subtitleStatic: string;
    search: string;
    all: string;
    copySyntax: string;
    copied: string;
    unavailable: [string, string];
    noMatch: (q: string) => string;
    frenchNote: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  cta: {
    title: string;
    text: string;
    add: string;
    openDashboard: string;
    support: string;
  };
  footer: {
    tagline: string;
    terms: string;
    privacy: string;
    dashboard: string;
    support: string;
  };
}

export const BOT_COPY: Record<BotLang, BotCopy> = {
  fr: {
    meta: {
      title: "Etho — Le bot Discord tout-en-un pour votre communauté",
      description: "Protection anti-raid chirurgicale, modération instantanée, musique, pont vocal Spotify et commandes fun format Bleed. Tout ce dont votre serveur a besoin, sans superflu.",
    },
    nav: {
      features: "Fonctionnalités",
      bento: "Modules",
      dashboard: "Dashboard",
      commands: "Commandes",
      faq: "FAQ",
      support: "Support",
      invite: "Ajouter Etho",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu",
      mobileMenu: "Menu mobile",
      mainNav: "Navigation principale",
      footerNav: "Liens de navigation",
      language: "Langue",
    },
    hero: {
      badgeDefault: "Le bot Discord tout-en-un · Uptime 99.98%",
      badgeActive: (g, m) => `Actif sur ${g} serveur${g > 1 ? "s" : ""} · ${m} membres`,
      title: "Le bot Discord tout-en-un, pensé pour ta communauté",
      subtitle: "Protection anti-raid chirurgicale, modération instantanée, musique, pont vocal Spotify et commandes fun format Bleed. Active ce dont tu as besoin, sans superflu.",
      add: "Ajouter le bot ↗",
      openDashboard: "Ouvrir le dashboard",
      highlights: [
        "🛡️ Anti-Raid 0.2s",
        "🎵 Pont vocal Spotify",
        "⚡ Zéro latence",
        "🎉 Commandes Fun Bleed",
      ],
    },
    stats: {
      servers: ["Serveur actif", "Serveurs actifs"],
      members: "Membres protégés",
      commands: "Commandes prêtes",
      uptime: "Disponibilité 24/7",
    },
    bento: {
      eyebrow: "FONCTIONNALITÉS",
      title: "Tout ce qu'il faut, rien de superflu",
      subtitle: "Chaque module s'active en 1 clic et se configure en temps réel depuis le dashboard.",
      cards: {
        shield: {
          title: "Protection Anti-Raid & Bouclier Owner",
          desc: "Détection des attaques en moins de 0.2s, anti-mass ban, anti-spam, bouclier Owner et restauration automatique des rôles compromis.",
          tag: "Protection 0-seconde",
        },
        spotify: {
          title: "Pont Vocal & Lecteur Spotify",
          desc: "Diffusez vos titres Spotify en direct dans les salons vocaux avec /spotify vc, contrôlez la lecture et affichez les jaquettes avec vinyle animé.",
          tag: "Intégration Spotify",
        },
        fun: {
          title: "Suite Fun Format Bleed",
          desc: "Recherche de paroles /lyrics avec LRCLib, générateur de citations /quote, recherche visuelle DuckDuckGo et reverse lookup instantané.",
          tag: "Format Bleed",
        },
        automod: {
          title: "AutoMod & Sécurité Granulaire",
          desc: "Filtres de mots interdits, blocage des invitations non autorisées, protection contre les pings fantômes et sanctions automatiques modulables.",
          tag: "AutoMod Natif",
        },
        welcome: {
          title: "Bienvenue & Captcha Interactif",
          desc: "Messages d'accueil riches en embeds, attribution automatique des rôles de départ et système de vérification des nouveaux membres.",
          tag: "Onboarding fluide",
        },
        leveling: {
          title: "Niveaux & Récompenses XP",
          desc: "Gain d'expérience textuelle et vocale en direct, multiplicateurs de boost, rôles de récompense et classements personnalisables sur le web.",
          tag: "Engagement 24/7",
        },
      },
    },
    steps: {
      eyebrow: "PRISE EN MAIN",
      title: "Prêt en trois étapes",
      subtitle: "Une configuration simple, transparente et opérationnelle en moins d'une minute.",
      items: [
        {
          step: "1",
          title: "Ajoute le bot",
          text: "Invite Etho sur ton serveur en 1 clic en conservant les permissions recommandées.",
        },
        {
          step: "2",
          title: "Active tes modules",
          text: "Depuis le dashboard, choisis uniquement les modules utiles à ta communauté.",
        },
        {
          step: "3",
          title: "Profite",
          text: "Ton serveur est surveillé, sécurisé et animé en continu 24h/24 sans interruption.",
        },
      ],
    },
    commands: {
      eyebrow: "COMMANDES",
      title: "Catalogue des Commandes",
      subtitleLive: (n) => `${n} commandes interactives prêtes à l'emploi.`,
      subtitleStatic: "Explorez l'ensemble des commandes disponibles sur Etho.",
      search: "Rechercher une commande...",
      all: "Toutes",
      copySyntax: "Copier la syntaxe",
      copied: "Copié !",
      unavailable: ["La liste des commandes est momentanément indisponible. Retrouvez-la avec ", " sur Discord."],
      noMatch: (q) => `Aucune commande ne correspond à « ${q} ».`,
      frenchNote: "",
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
      text: "Rejoins des centaines de communautés qui font confiance à Etho chaque jour pour leur sécurité, leur musique et leur animation.",
      add: "Ajouter le bot ↗",
      openDashboard: "Ouvrir le dashboard",
      support: "Rejoindre le support",
    },
    footer: {
      tagline: "Le bot Discord tout-en-un pour votre communauté",
      terms: "Conditions",
      privacy: "Confidentialité",
      dashboard: "Dashboard",
      support: "Support Discord",
    },
  },

  en: {
    meta: {
      title: "Etho — The All-in-One Discord Bot for Your Community",
      description: "Surgical anti-raid protection, instant moderation, music, Spotify voice bridge, and Bleed-style fun commands. Everything your server needs without fluff.",
    },
    nav: {
      features: "Features",
      bento: "Modules",
      dashboard: "Dashboard",
      commands: "Commands",
      faq: "FAQ",
      support: "Support",
      invite: "Add Etho",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      mobileMenu: "Mobile menu",
      mainNav: "Main navigation",
      footerNav: "Navigation links",
      language: "Language",
    },
    hero: {
      badgeDefault: "The All-in-One Discord Bot · 99.98% Uptime",
      badgeActive: (g, m) => `Active on ${g} server${g > 1 ? "s" : ""} · ${m} members`,
      title: "The all-in-one Discord bot, built for your community",
      subtitle: "Surgical anti-raid defense, instant moderation, high-fidelity music, Spotify voice bridge, and Bleed-style fun commands. Enable what you need, nothing you don't.",
      add: "Add to Discord ↗",
      openDashboard: "Open Dashboard",
      highlights: [
        "🛡️ 0.2s Anti-Raid",
        "🎵 Spotify Voice Bridge",
        "⚡ Sub-15ms Latency",
        "🎉 Bleed Fun Commands",
      ],
    },
    stats: {
      servers: ["Active Server", "Active Servers"],
      members: "Protected Members",
      commands: "Ready Commands",
      uptime: "24/7 Availability",
    },
    bento: {
      eyebrow: "FEATURES",
      title: "Everything you need, nothing you don't",
      subtitle: "Each module enables with a single click and configures live from the dashboard.",
      cards: {
        shield: {
          title: "Anti-Raid Defense & Owner Shield",
          desc: "Threat detection in under 0.2s, anti-mass ban, anti-spam, Owner Shield, and automatic restoration of revoked roles.",
          tag: "0-Second Defense",
        },
        spotify: {
          title: "Spotify Voice Bridge & Player",
          desc: "Stream your current Spotify track directly into Discord voice channels with /spotify vc, control playback, and display spinning vinyl covers.",
          tag: "Spotify Integration",
        },
        fun: {
          title: "Bleed-Style Fun Command Suite",
          desc: "Live lyrics search /lyrics via LRCLib, styled quote generator /quote, DuckDuckGo image lookup, and reverse image search.",
          tag: "Bleed Format",
        },
        automod: {
          title: "AutoMod & Granular Safety",
          desc: "Custom blocked words, invite link filtering, ghost ping detection, and automated graduated actions.",
          tag: "Native AutoMod",
        },
        welcome: {
          title: "Welcome & Interactive Captcha",
          desc: "Rich embed welcome messages, automatic starter roles, and verification flows for new community arrivals.",
          tag: "Smooth Onboarding",
        },
        leveling: {
          title: "Levels & XP Rewards",
          desc: "Live text and voice XP progression, server boost multipliers, automated rank rewards, and web leaderboards.",
          tag: "24/7 Engagement",
        },
      },
    },
    steps: {
      eyebrow: "GETTING STARTED",
      title: "Ready in three steps",
      subtitle: "A smooth, transparent setup running in less than 60 seconds.",
      items: [
        {
          step: "1",
          title: "Add the bot",
          text: "Invite Etho to your server in 1 click with recommended permissions.",
        },
        {
          step: "2",
          title: "Enable your modules",
          text: "Select only the features and protections your community needs from the dashboard.",
        },
        {
          step: "3",
          title: "Enjoy",
          text: "Your server is monitored, protected, and animated around the clock.",
        },
      ],
    },
    commands: {
      eyebrow: "COMMANDS",
      title: "Complete Command Catalog",
      subtitleLive: (n) => `${n} ready-to-use interactive commands.`,
      subtitleStatic: "Browse every command available on Etho.",
      search: "Search commands...",
      all: "All",
      copySyntax: "Copy syntax",
      copied: "Copied!",
      unavailable: ["Command list temporarily unavailable. Discover all commands with ", " on Discord."],
      noMatch: (q) => `No command matches "${q}".`,
      frenchNote: "",
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
      text: "Join hundreds of thriving communities relying on Etho every day for security, music, and fun.",
      add: "Add to Discord ↗",
      openDashboard: "Open Dashboard",
      support: "Join Support",
    },
    footer: {
      tagline: "The all-in-one Discord bot for your community",
      terms: "Terms",
      privacy: "Privacy",
      dashboard: "Dashboard",
      support: "Discord Support",
    },
  },

  es: {
    meta: {
      title: "Etho — El bot de Discord todo en uno para tu comunidad",
      description: "Protección anti-raid quirúrgica, moderación instantánea, música, puente de voz de Spotify y comandos divertidos estilo Bleed. Todo lo que tu servidor necesita.",
    },
    nav: {
      features: "Funcionalidades",
      bento: "Módulos",
      dashboard: "Panel",
      commands: "Comandos",
      faq: "Preguntas",
      support: "Soporte",
      invite: "Añadir Etho",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      mobileMenu: "Menú móvil",
      mainNav: "Navegación principal",
      footerNav: "Enlaces",
      language: "Idioma",
    },
    hero: {
      badgeDefault: "El bot de Discord todo en uno · Uptime 99.98%",
      badgeActive: (g, m) => `Activo en ${g} servidor${g > 1 ? "es" : ""} · ${m} miembros`,
      title: "El bot de Discord todo en uno, pensado para tu comunidad",
      subtitle: "Defensa anti-raid quirúrgica, moderación inmediata, música, puente de voz de Spotify y comandos divertidos estilo Bleed. Activa lo que necesites, sin complicaciones.",
      add: "Añadir el bot ↗",
      openDashboard: "Abrir el panel",
      highlights: [
        "🛡️ Anti-Raid 0.2s",
        "🎵 Puente de voz Spotify",
        "⚡ Cero latencia",
        "🎉 Comandos Bleed",
      ],
    },
    stats: {
      servers: ["Servidor activo", "Servidores activos"],
      members: "Miembros protegidos",
      commands: "Comandos listos",
      uptime: "Disponibilidad 24/7",
    },
    bento: {
      eyebrow: "FUNCIONALIDADES",
      title: "Todo lo necesario, nada superfluo",
      subtitle: "Cada módulo se activa en 1 clic y se configura en tiempo real desde el panel.",
      cards: {
        shield: {
          title: "Protección Anti-Raid y Escudo Owner",
          desc: "Detección de ataques en menos de 0.2s, anti-mass ban, anti-spam, Escudo Owner y restauración automática de roles comprometidos.",
          tag: "Defensa 0 segundos",
        },
        spotify: {
          title: "Puente de Voz y Reproductor Spotify",
          desc: "Transmite tus pistas de Spotify en canales de voz con /spotify vc, controla la reproducción y muestra portadas con vinilo animado.",
          tag: "Integración Spotify",
        },
        fun: {
          title: "Suite de Comandos Estilo Bleed",
          desc: "Búsqueda de letras /lyrics con LRCLib, citas personalizadas /quote, imágenes en DuckDuckGo y búsqueda inversa de imágenes.",
          tag: "Formato Bleed",
        },
        automod: {
          title: "AutoMod y Seguridad Granular",
          desc: "Filtros de palabras prohibidas, bloqueo de enlaces de invitación no autorizados y acciones automáticas graduales.",
          tag: "AutoMod Nativo",
        },
        welcome: {
          title: "Bienvenida y Captcha Interactivo",
          desc: "Mensajes de bienvenida ricos en embeds, roles iniciales automáticos y verificación de nuevos miembros.",
          tag: "Bienvenida fluida",
        },
        leveling: {
          title: "Niveles y Recompensas de XP",
          desc: "Ganancia de experiencia por texto y voz, multiplicadores de boost, roles automáticos y tablas de clasificación en la web.",
          tag: "Compromiso continuo",
        },
      },
    },
    steps: {
      eyebrow: "PRIMEROS PASOS",
      title: "Listo en tres pasos",
      subtitle: "Configuración sencilla y lista para funcionar en menos de un minuto.",
      items: [
        {
          step: "1",
          title: "Añade el bot",
          text: "Invita a Etho a tu servidor en 1 clic con los permisos recomendados.",
        },
        {
          step: "2",
          title: "Activa tus módulos",
          text: "Elige desde el panel los módulos que tu comunidad realmente necesita.",
        },
        {
          step: "3",
          title: "Disfruta",
          text: "Tu servidor está protegido y animado las 24 horas del día.",
        },
      ],
    },
    commands: {
      eyebrow: "COMANDOS",
      title: "Catálogo de Comandos",
      subtitleLive: (n) => `${n} comandos interactivos disponibles.`,
      subtitleStatic: "Explora la lista completa de comandos en Etho.",
      search: "Buscar comando...",
      all: "Todos",
      copySyntax: "Copiar sintaxis",
      copied: "¡Copiado!",
      unavailable: ["Lista de comandos no disponible temporalmente. Puedes verla con ", " en Discord."],
      noMatch: (q) => `Ningún comando coincide con « ${q} ».`,
      frenchNote: "",
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
      text: "Únete a cientos de comunidades que confían en Etho cada día para su seguridad y entretenimiento.",
      add: "Añadir el bot ↗",
      openDashboard: "Abrir el panel",
      support: "Unirse al soporte",
    },
    footer: {
      tagline: "El bot de Discord todo en uno para tu comunidad",
      terms: "Términos",
      privacy: "Privacidad",
      dashboard: "Panel",
      support: "Soporte Discord",
    },
  },

  de: {
    meta: {
      title: "Etho — Der All-in-One Discord-Bot für deine Community",
      description: "Präziser Anti-Raid-Schutz, sofortige Moderation, Musik, Spotify-Voice-Bridge und Bleed-Style Fun-Befehle. Alles, was dein Server braucht.",
    },
    nav: {
      features: "Funktionen",
      bento: "Module",
      dashboard: "Dashboard",
      commands: "Befehle",
      faq: "FAQ",
      support: "Support",
      invite: "Etho hinzufügen",
      openMenu: "Menü öffnen",
      closeMenu: "Menü schließen",
      mobileMenu: "Mobiles Menü",
      mainNav: "Hauptnavigation",
      footerNav: "Links",
      language: "Sprache",
    },
    hero: {
      badgeDefault: "Der All-in-One Discord Bot · 99.98% Uptime",
      badgeActive: (g, m) => `Aktiv auf ${g} Server${g > 1 ? "n" : ""} · ${m} Mitgliedern`,
      title: "Der All-in-One Discord-Bot, gebaut für deine Community",
      subtitle: "Chirurgischer Anti-Raid-Schutz, blitzschnelle Moderation, Musik, Spotify-Voice-Bridge und Bleed-Style Fun-Befehle. Aktiviere, was du brauchst, ohne Ballast.",
      add: "Bot hinzufügen ↗",
      openDashboard: "Dashboard öffnen",
      highlights: [
        "🛡️ 0.2s Anti-Raid",
        "🎵 Spotify Voice-Bridge",
        "⚡ Null Latenz",
        "🎉 Bleed Fun-Befehle",
      ],
    },
    stats: {
      servers: ["Aktiver Server", "Aktive Server"],
      members: "Geschützte Mitglieder",
      commands: "Bereite Befehle",
      uptime: "24/7 Verfügbarkeit",
    },
    bento: {
      eyebrow: "FUNKTIONEN",
      title: "Alles was du brauchst, nichts Überflüssiges",
      subtitle: "Jedes Modul lässt sich mit 1 Klick aktivieren und im Dashboard live anpassen.",
      cards: {
        shield: {
          title: "Anti-Raid-Schutz & Owner-Schild",
          desc: "Erkennung von Angriffen unter 0.2s, Anti-Mass-Ban, Anti-Spam, Owner-Schild und automatische Rollenwiederherstellung.",
          tag: "0-Sekunden Schutz",
        },
        spotify: {
          title: "Spotify Voice-Bridge & Player",
          desc: "Übertrage aktuelle Spotify-Tracks direkt in Sprachkanäle mit /spotify vc, steuere die Wiedergabe und zeige animierte Vinyls an.",
          tag: "Spotify Integration",
        },
        fun: {
          title: "Bleed-Style Fun-Befehlssuite",
          desc: "Live-Songtext-Suche /lyrics via LRCLib, Zitate-Generator /quote, DuckDuckGo-Bildersuche und Bildrückwärtssuche.",
          tag: "Bleed Format",
        },
        automod: {
          title: "AutoMod & Granulare Sicherheit",
          desc: "Wortfilter, Blockieren unerwünschter Einladungslinks, Ghost-Ping-Erkennung und anpassbare automatische Sanktionen.",
          tag: "Natives AutoMod",
        },
        welcome: {
          title: "Willkommen & Interaktives Captcha",
          desc: "Detaillierte Willkommens-Embeds, automatische Startrollen und zuverlässige Mitglieder-Verifizierung.",
          tag: "Reibungsloses Onboarding",
        },
        leveling: {
          title: "Level & XP-Belohnungen",
          desc: "Text- und Sprach-XP in Echtzeit, Server-Boost-Multiplikatoren, automatische Rollen und Web-Bestenlisten.",
          tag: "24/7 Aktivität",
        },
      },
    },
    steps: {
      eyebrow: "ERSTE SCHRITTE",
      title: "In drei Schritten startklar",
      subtitle: "Einfaches Setup in weniger als 60 Sekunden.",
      items: [
        {
          step: "1",
          title: "Bot hinzufügen",
          text: "Lade Etho mit den empfohlenen Berechtigungen mit einem Klick auf deinen Server ein.",
        },
        {
          step: "2",
          title: "Module aktivieren",
          text: "Wähle im Dashboard genau die Funktionen aus, die deine Community benötigt.",
        },
        {
          step: "3",
          title: "Genießen",
          text: "Dein Server ist rund um die Uhr geschützt, moderiert und belebt.",
        },
      ],
    },
    commands: {
      eyebrow: "BEFEHLE",
      title: "Befehlskatalog",
      subtitleLive: (n) => `${n} interaktive Slash-Befehle einsatzbereit.`,
      subtitleStatic: "Erkunde alle verfügbaren Befehle auf Etho.",
      search: "Befehl suchen...",
      all: "Alle",
      copySyntax: "Syntax kopieren",
      copied: "Kopiert!",
      unavailable: ["Befehlsliste momentan nicht verfügbar. Siehe ", " auf Discord."],
      noMatch: (q) => `Kein Befehl passt zu „${q}“.`,
      frenchNote: "",
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
      text: "Schließe dich hunderten Communities an, die Etho täglich für Sicherheit, Musik und Animation vertrauen.",
      add: "Bot hinzufügen ↗",
      openDashboard: "Dashboard öffnen",
      support: "Support beitreten",
    },
    footer: {
      tagline: "Der All-in-One Discord-Bot für deine Community",
      terms: "Bedingungen",
      privacy: "Datenschutz",
      dashboard: "Dashboard",
      support: "Discord Support",
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
