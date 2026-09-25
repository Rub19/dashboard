/**
 * Textes de la page vitrine du bot, dans les quatre langues du site (fr, en, es, de).
 * Les descriptions et catégories des commandes viennent de l'API du bot : elles restent dans la langue du bot (français).
 */

export const BOT_LANGS = ["fr", "en", "es", "de"] as const;
export type BotLang = (typeof BOT_LANGS)[number];

export interface BotCopy {
  meta: { title: string; description: string };
  nav: { features: string; dashboard: string; commands: string; support: string; invite: string; openMenu: string; closeMenu: string; mobileMenu: string; mainNav: string; footerNav: string; language: string };
  hero: {
    badgeDefault: string;
    badgeActive: (guilds: number, members: string) => string;
    titleTop: string;
    titleBottom: string;
    titleAccent: string;
    subtitle: string;
    add: string;
    openDashboard: string;
  };
  preview: { modulesTitle: string; welcomeTitle: string; embedTitle: string; embedBody: string; embedFooter: string; note: string; modules: string[] };
  stats: { servers: [string, string]; members: string; commands: string };
  features: { eyebrow: string; title: string; subtitle: string; items: Array<{ title: string; text: string }> };
  dashboard: { eyebrow: string; title: string; text: string; open: string; steps: Array<{ title: string; text: string }> };
  commands: {
    eyebrow: string;
    title: string;
    subtitleLive: (n: string) => string;
    subtitleStatic: string;
    search: string;
    all: string;
    unavailable: [string, string];
    noMatch: (q: string) => string;
    frenchNote: string;
  };
  cta: { title: string; text: string; add: string; support: string };
  footer: { tagline: string; terms: string; privacy: string };
}

export const BOT_COPY: Record<BotLang, BotCopy> = {
  fr: {
    meta: {
      title: "ETHONE — Le bot Discord de modération, sécurité et animation",
      description: "Modération, anti-raid, musique, économie, tickets et plus encore. Un bot Discord configurable depuis un dashboard synchronisé en direct.",
    },
    nav: { features: "Fonctionnalités", dashboard: "Dashboard", commands: "Commandes", support: "Support", invite: "Inviter", openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", mobileMenu: "Menu mobile", mainNav: "Navigation principale", footerNav: "Liens du pied de page", language: "Langue" },
    hero: {
      badgeDefault: "Le bot Discord tout-en-un",
      badgeActive: (g, m) => `Actif sur ${g} serveur${g > 1 ? "s" : ""} · ${m} membres`,
      titleTop: "Le bot qui gère",
      titleBottom: "votre serveur,",
      titleAccent: "vraiment.",
      subtitle: "Modération, sécurité, musique, économie, tickets. Tout se configure depuis un dashboard synchronisé en direct avec Discord.",
      add: "Ajouter à Discord",
      openDashboard: "Ouvrir le dashboard",
    },
    preview: {
      modulesTitle: "Modules du serveur",
      welcomeTitle: "Message de bienvenue",
      embedTitle: "Bienvenue sur {server} !",
      embedBody: "Ravi de te voir, {user}. Lis les règles, choisis tes rôles et présente-toi.",
      embedFooter: "Membre n°{membercount}",
      note: "Les messages d'accueil et d'au revoir sont des embeds personnalisables, avec variables.",
      modules: ["Modération", "Anti-Raid", "Bienvenue", "Musique", "Économie", "Tickets"],
    },
    stats: { servers: ["serveur", "serveurs"], members: "membres", commands: "commandes" },
    features: {
      eyebrow: "Fonctionnalités",
      title: "Ce que le bot fait pour vous",
      subtitle: "Des modules indépendants : activez seulement ce dont votre serveur a besoin.",
      items: [
        { title: "Modération", text: "Avertissements, mutes, expulsions, bannissements et historique des cas, en commande ou depuis le dashboard." },
        { title: "Anti-Raid & Anti-Nuke", text: "Détection des arrivées massives et des suppressions en série, avec verrouillage d'urgence du serveur." },
        { title: "Journal d'audit", text: "Chaque action importante est enregistrée : messages, rôles, salons, sanctions. Recherchable et filtrable." },
        { title: "Bienvenue & vérification", text: "Messages d'accueil en embed, rôles automatiques et vérification des nouveaux membres avant l'accès au serveur." },
        { title: "Niveaux & récompenses", text: "Expérience par messages, classement et rôles décernés automatiquement selon le niveau." },
        { title: "Économie & boutique", text: "Monnaie du serveur, récompense quotidienne, boutique de rôles et classement des membres." },
        { title: "Musique", text: "Lecture dans les salons vocaux avec file d'attente, playlists et contrôles depuis le dashboard." },
        { title: "Tickets", text: "Un système de support par salons privés, avec équipes de staff, transcriptions et statistiques." },
        { title: "Giveaways & événements", text: "Tirages au sort, sondages, événements avec inscriptions et rappels automatiques." },
        { title: "Outils du quotidien", text: "Rappels, anniversaires, messages épinglés, tags de réponse, statut AFK et salons compteurs." },
      ],
    },
    dashboard: {
      eyebrow: "Dashboard",
      title: "Un vrai dashboard, pas une liste de commandes",
      text: "Connectez-vous avec Discord et gérez chaque serveur dont vous êtes administrateur. Un réglage enregistré s'applique tout de suite, et ce qui change sur Discord apparaît sans recharger.",
      open: "Ouvrir le dashboard",
      steps: [
        { title: "Invitez le bot", text: "Un clic, et ETHONE rejoint votre serveur avec les permissions nécessaires." },
        { title: "Choisissez vos modules", text: "Chaque module s'active ou se désactive par serveur, depuis le dashboard ou avec /module." },
        { title: "Réglez tout en ligne", text: "Salons, rôles, messages, seuils : la configuration se fait sur le dashboard, appliquée en direct." },
      ],
    },
    commands: {
      eyebrow: "Commandes",
      title: "Toutes les commandes",
      subtitleLive: (n) => `${n} commandes slash, lues directement sur le bot.`,
      subtitleStatic: "La liste complète des commandes slash du bot.",
      search: "Rechercher une commande",
      all: "Toutes",
      unavailable: ["La liste des commandes n'est pas disponible pour le moment. Elle reste consultable avec ", " sur Discord."],
      noMatch: (q) => `Aucune commande ne correspond à « ${q} ».`,
      frenchNote: "",
    },
    cta: { title: "Prêt à l'essayer ?", text: "L'invitation prend une minute. Vous choisissez ensuite les modules à activer.", add: "Ajouter à Discord", support: "Rejoindre le support" },
    footer: { tagline: "projet indépendant", terms: "Conditions", privacy: "Confidentialité" },
  },

  en: {
    meta: {
      title: "ETHONE — The Discord bot for moderation, security and fun",
      description: "Moderation, anti-raid, music, economy, tickets and more. A Discord bot you configure from a dashboard synced live with Discord.",
    },
    nav: { features: "Features", dashboard: "Dashboard", commands: "Commands", support: "Support", invite: "Invite", openMenu: "Open menu", closeMenu: "Close menu", mobileMenu: "Mobile menu", mainNav: "Main navigation", footerNav: "Footer links", language: "Language" },
    hero: {
      badgeDefault: "The all-in-one Discord bot",
      badgeActive: (g, m) => `Active on ${g} server${g > 1 ? "s" : ""} · ${m} members`,
      titleTop: "The bot that runs",
      titleBottom: "your server,",
      titleAccent: "for real.",
      subtitle: "Moderation, security, music, economy, tickets. Everything is configured from a dashboard synced live with Discord.",
      add: "Add to Discord",
      openDashboard: "Open the dashboard",
    },
    preview: {
      modulesTitle: "Server modules",
      welcomeTitle: "Welcome message",
      embedTitle: "Welcome to {server}!",
      embedBody: "Great to see you, {user}. Read the rules, pick your roles and introduce yourself.",
      embedFooter: "Member #{membercount}",
      note: "Welcome and goodbye messages are customizable embeds with variables.",
      modules: ["Moderation", "Anti-Raid", "Welcome", "Music", "Economy", "Tickets"],
    },
    stats: { servers: ["server", "servers"], members: "members", commands: "commands" },
    features: {
      eyebrow: "Features",
      title: "What the bot does for you",
      subtitle: "Independent modules: enable only what your server needs.",
      items: [
        { title: "Moderation", text: "Warnings, mutes, kicks, bans and case history, by command or from the dashboard." },
        { title: "Anti-Raid & Anti-Nuke", text: "Detects mass joins and serial deletions, with an emergency server lockdown." },
        { title: "Audit log", text: "Every important action is recorded: messages, roles, channels, sanctions. Searchable and filterable." },
        { title: "Welcome & verification", text: "Embed welcome messages, automatic roles and verification of new members before they access the server." },
        { title: "Levels & rewards", text: "Experience from messages, leaderboard and roles awarded automatically by level." },
        { title: "Economy & shop", text: "Server currency, daily reward, role shop and member leaderboard." },
        { title: "Music", text: "Playback in voice channels with queue, playlists and controls from the dashboard." },
        { title: "Tickets", text: "A support system with private channels, staff teams, transcripts and statistics." },
        { title: "Giveaways & events", text: "Giveaways, polls, and events with sign-ups and automatic reminders." },
        { title: "Everyday tools", text: "Reminders, birthdays, pinned messages, reply tags, AFK status and counter channels." },
      ],
    },
    dashboard: {
      eyebrow: "Dashboard",
      title: "A real dashboard, not a list of commands",
      text: "Sign in with Discord and manage every server you administer. A saved setting applies right away, and whatever changes on Discord shows up without reloading.",
      open: "Open the dashboard",
      steps: [
        { title: "Invite the bot", text: "One click and ETHONE joins your server with the permissions it needs." },
        { title: "Pick your modules", text: "Each module can be turned on or off per server, from the dashboard or with /module." },
        { title: "Set everything up online", text: "Channels, roles, messages, thresholds: configuration is done on the dashboard and applied live." },
      ],
    },
    commands: {
      eyebrow: "Commands",
      title: "All commands",
      subtitleLive: (n) => `${n} slash commands, read straight from the bot.`,
      subtitleStatic: "The full list of the bot's slash commands.",
      search: "Search a command",
      all: "All",
      unavailable: ["The command list is not available right now. You can still browse it with ", " on Discord."],
      noMatch: (q) => `No command matches “${q}”.`,
      frenchNote: "Command names and categories come from the bot and are shown in French.",
    },
    cta: { title: "Ready to try it?", text: "Inviting takes a minute. You then choose which modules to enable.", add: "Add to Discord", support: "Join the support server" },
    footer: { tagline: "independent project", terms: "Terms", privacy: "Privacy" },
  },

  es: {
    meta: {
      title: "ETHONE — El bot de Discord de moderación, seguridad y diversión",
      description: "Moderación, anti-raid, música, economía, tickets y mucho más. Un bot de Discord configurable desde un dashboard sincronizado en directo.",
    },
    nav: { features: "Funciones", dashboard: "Dashboard", commands: "Comandos", support: "Soporte", invite: "Invitar", openMenu: "Abrir el menú", closeMenu: "Cerrar el menú", mobileMenu: "Menú móvil", mainNav: "Navegación principal", footerNav: "Enlaces del pie de página", language: "Idioma" },
    hero: {
      badgeDefault: "El bot de Discord todo en uno",
      badgeActive: (g, m) => `Activo en ${g} servidor${g > 1 ? "es" : ""} · ${m} miembros`,
      titleTop: "El bot que gestiona",
      titleBottom: "tu servidor,",
      titleAccent: "de verdad.",
      subtitle: "Moderación, seguridad, música, economía, tickets. Todo se configura desde un dashboard sincronizado en directo con Discord.",
      add: "Añadir a Discord",
      openDashboard: "Abrir el dashboard",
    },
    preview: {
      modulesTitle: "Módulos del servidor",
      welcomeTitle: "Mensaje de bienvenida",
      embedTitle: "¡Bienvenido a {server}!",
      embedBody: "Un placer verte, {user}. Lee las normas, elige tus roles y preséntate.",
      embedFooter: "Miembro n.º {membercount}",
      note: "Los mensajes de bienvenida y despedida son embeds personalizables, con variables.",
      modules: ["Moderación", "Anti-Raid", "Bienvenida", "Música", "Economía", "Tickets"],
    },
    stats: { servers: ["servidor", "servidores"], members: "miembros", commands: "comandos" },
    features: {
      eyebrow: "Funciones",
      title: "Lo que el bot hace por ti",
      subtitle: "Módulos independientes: activa solo lo que tu servidor necesita.",
      items: [
        { title: "Moderación", text: "Advertencias, silencios, expulsiones, baneos e historial de casos, por comando o desde el dashboard." },
        { title: "Anti-Raid y Anti-Nuke", text: "Detección de llegadas masivas y eliminaciones en serie, con bloqueo de emergencia del servidor." },
        { title: "Registro de auditoría", text: "Cada acción importante queda registrada: mensajes, roles, canales, sanciones. Con búsqueda y filtros." },
        { title: "Bienvenida y verificación", text: "Mensajes de bienvenida en embed, roles automáticos y verificación de los nuevos miembros antes de acceder al servidor." },
        { title: "Niveles y recompensas", text: "Experiencia por mensajes, clasificación y roles otorgados automáticamente según el nivel." },
        { title: "Economía y tienda", text: "Moneda del servidor, recompensa diaria, tienda de roles y clasificación de miembros." },
        { title: "Música", text: "Reproducción en canales de voz con cola, listas de reproducción y controles desde el dashboard." },
        { title: "Tickets", text: "Un sistema de soporte con canales privados, equipos de staff, transcripciones y estadísticas." },
        { title: "Sorteos y eventos", text: "Sorteos, encuestas y eventos con inscripciones y recordatorios automáticos." },
        { title: "Herramientas del día a día", text: "Recordatorios, cumpleaños, mensajes fijados, etiquetas de respuesta, estado AFK y canales contador." },
      ],
    },
    dashboard: {
      eyebrow: "Dashboard",
      title: "Un dashboard de verdad, no una lista de comandos",
      text: "Inicia sesión con Discord y gestiona cada servidor del que seas administrador. Un ajuste guardado se aplica al instante, y lo que cambia en Discord aparece sin recargar.",
      open: "Abrir el dashboard",
      steps: [
        { title: "Invita al bot", text: "Un clic y ETHONE se une a tu servidor con los permisos necesarios." },
        { title: "Elige tus módulos", text: "Cada módulo se activa o desactiva por servidor, desde el dashboard o con /module." },
        { title: "Configura todo en línea", text: "Canales, roles, mensajes, umbrales: la configuración se hace en el dashboard y se aplica en directo." },
      ],
    },
    commands: {
      eyebrow: "Comandos",
      title: "Todos los comandos",
      subtitleLive: (n) => `${n} comandos slash, leídos directamente del bot.`,
      subtitleStatic: "La lista completa de comandos slash del bot.",
      search: "Buscar un comando",
      all: "Todos",
      unavailable: ["La lista de comandos no está disponible por ahora. Sigue disponible con ", " en Discord."],
      noMatch: (q) => `Ningún comando coincide con «${q}».`,
      frenchNote: "Los nombres y categorías de los comandos vienen del bot y se muestran en francés.",
    },
    cta: { title: "¿Listo para probarlo?", text: "Invitarlo lleva un minuto. Después eliges qué módulos activar.", add: "Añadir a Discord", support: "Unirse al soporte" },
    footer: { tagline: "proyecto independiente", terms: "Condiciones", privacy: "Privacidad" },
  },

  de: {
    meta: {
      title: "ETHONE — Der Discord-Bot für Moderation, Sicherheit und Spaß",
      description: "Moderation, Anti-Raid, Musik, Wirtschaft, Tickets und mehr. Ein Discord-Bot, der über ein live synchronisiertes Dashboard konfiguriert wird.",
    },
    nav: { features: "Funktionen", dashboard: "Dashboard", commands: "Befehle", support: "Support", invite: "Einladen", openMenu: "Menü öffnen", closeMenu: "Menü schließen", mobileMenu: "Mobilmenü", mainNav: "Hauptnavigation", footerNav: "Links im Seitenfuß", language: "Sprache" },
    hero: {
      badgeDefault: "Der All-in-one-Discord-Bot",
      badgeActive: (g, m) => `Aktiv auf ${g} Server${g > 1 ? "n" : ""} · ${m} Mitglieder`,
      titleTop: "Der Bot, der deinen",
      titleBottom: "Server leitet,",
      titleAccent: "wirklich.",
      subtitle: "Moderation, Sicherheit, Musik, Wirtschaft, Tickets. Alles wird über ein Dashboard konfiguriert, das live mit Discord synchronisiert ist.",
      add: "Zu Discord hinzufügen",
      openDashboard: "Dashboard öffnen",
    },
    preview: {
      modulesTitle: "Module des Servers",
      welcomeTitle: "Willkommensnachricht",
      embedTitle: "Willkommen auf {server}!",
      embedBody: "Schön, dich zu sehen, {user}. Lies die Regeln, wähle deine Rollen und stell dich vor.",
      embedFooter: "Mitglied Nr. {membercount}",
      note: "Willkommens- und Abschiedsnachrichten sind anpassbare Embeds mit Variablen.",
      modules: ["Moderation", "Anti-Raid", "Willkommen", "Musik", "Wirtschaft", "Tickets"],
    },
    stats: { servers: ["Server", "Server"], members: "Mitglieder", commands: "Befehle" },
    features: {
      eyebrow: "Funktionen",
      title: "Was der Bot für dich tut",
      subtitle: "Unabhängige Module: Aktiviere nur, was dein Server braucht.",
      items: [
        { title: "Moderation", text: "Verwarnungen, Stummschaltungen, Kicks, Banns und Fallverlauf, per Befehl oder im Dashboard." },
        { title: "Anti-Raid & Anti-Nuke", text: "Erkennung von Massenbeitritten und Serienlöschungen, mit Notfallsperre des Servers." },
        { title: "Audit-Protokoll", text: "Jede wichtige Aktion wird erfasst: Nachrichten, Rollen, Kanäle, Sanktionen. Durchsuchbar und filterbar." },
        { title: "Willkommen & Verifizierung", text: "Willkommensnachrichten als Embed, automatische Rollen und Verifizierung neuer Mitglieder vor dem Serverzugang." },
        { title: "Level & Belohnungen", text: "Erfahrung durch Nachrichten, Rangliste und automatisch vergebene Rollen je nach Level." },
        { title: "Wirtschaft & Shop", text: "Serverwährung, tägliche Belohnung, Rollen-Shop und Rangliste der Mitglieder." },
        { title: "Musik", text: "Wiedergabe in Sprachkanälen mit Warteschlange, Playlists und Steuerung über das Dashboard." },
        { title: "Tickets", text: "Ein Support-System mit privaten Kanälen, Staff-Teams, Transkripten und Statistiken." },
        { title: "Gewinnspiele & Events", text: "Verlosungen, Umfragen und Events mit Anmeldungen und automatischen Erinnerungen." },
        { title: "Alltagswerkzeuge", text: "Erinnerungen, Geburtstage, angeheftete Nachrichten, Antwort-Tags, AFK-Status und Zähler-Kanäle." },
      ],
    },
    dashboard: {
      eyebrow: "Dashboard",
      title: "Ein echtes Dashboard, keine Befehlsliste",
      text: "Melde dich mit Discord an und verwalte jeden Server, den du administrierst. Eine gespeicherte Einstellung gilt sofort, und Änderungen auf Discord erscheinen ohne Neuladen.",
      open: "Dashboard öffnen",
      steps: [
        { title: "Bot einladen", text: "Ein Klick, und ETHONE tritt deinem Server mit den nötigen Berechtigungen bei." },
        { title: "Module auswählen", text: "Jedes Modul lässt sich pro Server ein- oder ausschalten, im Dashboard oder mit /module." },
        { title: "Alles online einstellen", text: "Kanäle, Rollen, Nachrichten, Schwellenwerte: Die Konfiguration erfolgt im Dashboard und gilt live." },
      ],
    },
    commands: {
      eyebrow: "Befehle",
      title: "Alle Befehle",
      subtitleLive: (n) => `${n} Slash-Befehle, direkt vom Bot gelesen.`,
      subtitleStatic: "Die vollständige Liste der Slash-Befehle des Bots.",
      search: "Befehl suchen",
      all: "Alle",
      unavailable: ["Die Befehlsliste ist im Moment nicht verfügbar. Du findest sie weiterhin mit ", " auf Discord."],
      noMatch: (q) => `Kein Befehl passt zu „${q}“.`,
      frenchNote: "Befehlsbeschreibungen und Kategorien stammen vom Bot und werden auf Französisch angezeigt.",
    },
    cta: { title: "Bereit zum Ausprobieren?", text: "Das Einladen dauert eine Minute. Danach wählst du, welche Module aktiv sind.", add: "Zu Discord hinzufügen", support: "Support-Server beitreten" },
    footer: { tagline: "unabhängiges Projekt", terms: "Bedingungen", privacy: "Datenschutz" },
  },
};

export const BOT_LANG_KEY = "ethone-bot-lang";

/** Langue d'après le navigateur (« fr-CA » → « fr ») ; français par défaut. */
export function detectBotLang(): BotLang {
  try {
    const saved = localStorage.getItem(BOT_LANG_KEY);
    if (saved && (BOT_LANGS as readonly string[]).includes(saved)) return saved as BotLang;
  } catch {
    /* stockage indisponible */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.languages?.[0] || navigator.language : "") || "";
  const short = nav.slice(0, 2).toLowerCase();
  return (BOT_LANGS as readonly string[]).includes(short) ? (short as BotLang) : "fr";
}
