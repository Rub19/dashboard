export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de';

export interface TranslationDictionary {
  lang_name: string;
  lang_flag: string;
  lang_changed_title: string;
  lang_changed_desc: string;
  voice_required: string;
  voice_different: string;
  bot_status_title: string;
  bot_status_desc: string;
  bot_info_desc: string;
  help_title: string;
  help_desc: string;
  settings_title: string;
  settings_privacy_public: string;
  settings_privacy_ephemeral: string;
  ask_disabled: string;
  no_permission: string;
  clear_success: string;
  ticket_created: string;
  ticket_welcome: string;
}

const translations: Record<SupportedLanguage, TranslationDictionary> = {
  fr: {
    lang_name: 'Français',
    lang_flag: '🇫🇷',
    lang_changed_title: '🌐 Langue du bot modifiée',
    lang_changed_desc: 'Le bot répondra désormais en **Français** sur ce serveur.',
    voice_required: '❌ **Salon vocal requis** : Vous devez impérativement être connecté dans un salon vocal pour lancer ou contrôler la musique !',
    voice_different: '❌ **Salon vocal différent** : Vous devez être dans le même salon vocal que le bot ({channel}) pour contrôler la musique.',
    bot_status_title: '📊 Statut Technique & Métriques',
    bot_status_desc: 'Tous les sous-systèmes du bot fonctionnent actuellement de manière optimale.',
    bot_info_desc: 'Bot tout-en-un de nouvelle génération propulsant le serveur avec intelligence artificielle, musique et modération.',
    help_title: '✨ Catalogue des Commandes & Modules',
    help_desc: 'Bienvenue sur le centre d\'aide officiel. Choisissez un module dans le menu déroulant ou utilisez les boutons.',
    settings_title: '⚙️ Configuration du Serveur',
    settings_privacy_public: '👁️ Public (visible par tout le salon)',
    settings_privacy_ephemeral: '🔒 Privé (Éphémère - visible uniquement par vous)',
    ask_disabled: 'L\'assistant IA est actuellement désactivé sur ce serveur par les administrateurs.',
    no_permission: '❌ Vous devez avoir les permissions nécessaires pour exécuter cette commande.',
    clear_success: '✅ **{count}** message(s) supprimé(s) avec succès.',
    ticket_created: '✅ Votre ticket d\'assistance a été créé avec succès : {channel}',
    ticket_welcome: 'Bonjour {user} ! Un membre de l\'équipe d\'assistance va vous assister sous peu.',
  },
  en: {
    lang_name: 'English',
    lang_flag: '🇬🇧',
    lang_changed_title: '🌐 Bot Language Updated',
    lang_changed_desc: 'The bot will now respond in **English** on this server.',
    voice_required: '❌ **Voice Channel Required**: You must be connected to a voice channel to play or control music!',
    voice_different: '❌ **Different Voice Channel**: You must be in the same voice channel as the bot ({channel}) to control music.',
    bot_status_title: '📊 Technical Status & Metrics',
    bot_status_desc: 'All bot subsystems are currently operating at peak performance.',
    bot_info_desc: 'Next-generation all-in-one bot powering your server with AI, high-fidelity music, and smart moderation.',
    help_title: '✨ Command & Module Catalog',
    help_desc: 'Welcome to the official help center. Select a module from the dropdown menu or use the navigation buttons.',
    settings_title: '⚙️ Server Configuration',
    settings_privacy_public: '👁️ Public (visible to the whole channel)',
    settings_privacy_ephemeral: '🔒 Private (Ephemeral - visible only to you)',
    ask_disabled: 'The AI assistant is currently disabled on this server by administrators.',
    no_permission: '❌ You do not have the required permissions to execute this command.',
    clear_success: '✅ Successfully deleted **{count}** message(s).',
    ticket_created: '✅ Your support ticket has been created successfully: {channel}',
    ticket_welcome: 'Hello {user}! A staff member will assist you shortly. Please describe your request below.',
  },
  es: {
    lang_name: 'Español',
    lang_flag: '🇪🇸',
    lang_changed_title: '🌐 Idioma del Bot Actualizado',
    lang_changed_desc: 'El bot ahora responderá en **Español** en este servidor.',
    voice_required: '❌ **Canal de voz requerido**: ¡Debes estar conectado a un canal de voz para reproducir o controlar música!',
    voice_different: '❌ **Canal de voz diferente**: Debes estar en el mismo canal de voz que el bot ({channel}) para controlar la música.',
    bot_status_title: '📊 Estado Técnico y Métricas',
    bot_status_desc: 'Todos los subsistemas del bot están funcionando de manera óptima.',
    bot_info_desc: 'Bot todo-en-uno de última generación que potencia tu servidor con IA, música de alta fidelidad y moderación.',
    help_title: '✨ Catálogo de Comandos y Módulos',
    help_desc: 'Bienvenido al centro de ayuda oficial. Elige un módulo en el menú desplegable o usa los botones.',
    settings_title: '⚙️ Configuración del Servidor',
    settings_privacy_public: '👁️ Público (visible para todo el canal)',
    settings_privacy_ephemeral: '🔒 Privado (Efímero - visible solo para ti)',
    ask_disabled: 'El asistente de IA está actualmente desactivado en este servidor por los administradores.',
    no_permission: '❌ No tienes los permisos necesarios para ejecutar este comando.',
    clear_success: '✅ Se han eliminado **{count}** mensaje(s) correctamente.',
    ticket_created: '✅ Tu ticket de soporte ha sido creado con éxito: {channel}',
    ticket_welcome: '¡Hola {user}! Un miembro del equipo te atenderá en breve. Describe tu consulta abajo.',
  },
  de: {
    lang_name: 'Deutsch',
    lang_flag: '🇩🇪',
    lang_changed_title: '🌐 Bot-Sprache Aktualisiert',
    lang_changed_desc: 'Der Bot antwortet ab sofort auf **Deutsch** auf diesem Server.',
    voice_required: '❌ **Sprachkanal erforderlich**: Du musst mit einem Sprachkanal verbunden sein, um Musik abzuspielen oder zu steuern!',
    voice_different: '❌ **Anderer Sprachkanal**: Du musst im selben Sprachkanal wie der Bot ({channel}) sein, um die Musik zu steuern.',
    bot_status_title: '📊 Technischer Status & Metriken',
    bot_status_desc: 'Alle Subsysteme des Bots arbeiten derzeit einwandfrei.',
    bot_info_desc: 'All-in-One-Bot der nächsten Generation für Ihren Server mit KI, High-Fidelity-Musik und Moderation.',
    help_title: '✨ Befehls- & Modulkatalog',
    help_desc: 'Willkommen im offiziellen Hilfezentrum. Wählen Sie ein Modul aus dem Dropdown-Menü oder nutzen Sie die Schaltflächen.',
    settings_title: '⚙️ Server-Konfiguration',
    settings_privacy_public: '👁️ Öffentlich (für den gesamten Kanal sichtbar)',
    settings_privacy_ephemeral: '🔒 Privat (Ephemeral - nur für dich sichtbar)',
    ask_disabled: 'Der KI-Assistent wurde auf diesem Server von Administratoren deaktiviert.',
    no_permission: '❌ Du besitzt nicht die erforderlichen Berechtigungen, um diesen Befehl auszuführen.',
    clear_success: '✅ **{count}** Nachricht(en) erfolgreich gelöscht.',
    ticket_created: '✅ Dein Support-Ticket wurde erfolgreich erstellt: {channel}',
    ticket_welcome: 'Hallo {user}! Ein Teammitglied wird dir in Kürze behilflich sein. Bitte beschreibe dein Anliegen.',
  },
};

export function getTranslation(lang: string = 'fr'): TranslationDictionary {
  const normalized = (lang.toLowerCase() in translations ? lang.toLowerCase() : 'fr') as SupportedLanguage;
  return translations[normalized];
}

export function formatString(template: string, vars: Record<string, string | number>): string {
  let res = template;
  for (const [k, v] of Object.entries(vars)) {
    res = res.replaceAll(`{${k}}`, String(v));
  }
  return res;
}
