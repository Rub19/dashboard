export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

const v327_fr: ChangelogEntry = {
  version: "v327",
  date: "2026-08-20",
  title: "Settings avancés + Notification Center",
  items: [
    "Paramètres avancés : couleur d’accent, fond d’écran, police, reduced motion, haptics, low data, mode performance, statut, permissions Brain, mémoire Brain.",
    "Notification Center avec catégories, priorités, marquer comme lu, reporter, effacer.",
    "Application CSS data-attributes dynamiques pour accents, polices, fonds d’écran.",
  ],
};

const v327_en: ChangelogEntry = {
  version: "v327",
  date: "2026-08-20",
  title: "Advanced settings + Notification Center",
  items: [
    "Advanced settings: accent color, wallpaper, font family, reduced motion, haptics, low data, performance mode, status, Brain permissions, Brain memory.",
    "Notification Center with categories, priorities, mark as read, snooze, clear.",
    "Dynamic CSS data-attributes for accents, fonts, wallpapers.",
  ],
};

const v327_es: ChangelogEntry = {
  version: "v327",
  date: "2026-08-20",
  title: "Ajustes avanzados + Centro de notificaciones",
  items: [
    "Ajustes avanzados: color de acento, fondo de pantalla, fuente, reduced motion, haptics, low data, modo rendimiento, estado, permisos Brain, memoria Brain.",
    "Centro de notificaciones con categorías, prioridades, marcar como leído, posponer, borrar.",
    "Atributos data CSS dinámicos para acentos, fuentes, fondos.",
  ],
};

const v327_de: ChangelogEntry = {
  version: "v327",
  date: "2026-08-20",
  title: "Erweiterte Einstellungen + Benachrichtigungszentrale",
  items: [
    "Erweiterte Einstellungen: Akzentfarbe, Hintergrundbild, Schriftart, reduced motion, haptics, low data, Leistungsmodus, Status, Brain-Berechtigungen, Brain-Speicher.",
    "Benachrichtigungszentrale mit Kategorien, Prioritäten, als gelesen markieren, schlummern, löschen.",
    "Dynamische CSS data-Attribute für Akzente, Schriften, Hintergrundbilder.",
  ],
};

const v326_fr: ChangelogEntry = {
  version: "v326",
  date: "2026-08-20",
  title: "Toasts sur toutes les actions et pages",
  items: [
    "Notifications toast sur les actions de toutes les pages (ajout, suppression, sauvegarde, connexion, sync, etc.).",
    "Messages de toast traduits en français, anglais, espagnol, allemand.",
  ],
};

const v326_en: ChangelogEntry = {
  version: "v326",
  date: "2026-08-20",
  title: "Toasts on every action and page",
  items: [
    "Toast notifications for actions on every page (add, delete, save, connect, sync, etc.).",
    "Toast messages translated to French, English, Spanish and German.",
  ],
};

const v326_es: ChangelogEntry = {
  version: "v326",
  date: "2026-08-20",
  title: "Toasts en todas las acciones y páginas",
  items: [
    "Notificaciones toast para acciones en todas las páginas (añadir, eliminar, guardar, conectar, sincronizar, etc.).",
    "Mensajes de toast traducidos al francés, inglés, español y alemán.",
  ],
};

const v326_de: ChangelogEntry = {
  version: "v326",
  date: "2026-08-20",
  title: "Toasts für jede Aktion und Seite",
  items: [
    "Toast-Benachrichtigungen für Aktionen auf jeder Seite (hinzufügen, löschen, speichern, verbinden, synchronisieren, etc.).",
    "Toast-Nachrichten ins Französische, Englische, Spanische und Deutsche übersetzt.",
  ],
};

const v325_fr: ChangelogEntry = {
  version: "v325",
  date: "2026-08-20",
  title: "Polish : timbres, icons cross-pack, changelog i18n",
  items: [
    "Timbres des sound packs affinés (mechanical, liquid, minimal) avec volumes par type.",
    "Mapping cross-pack des icônes étendu + fallback par collection iconify.",
    "Changelog du site disponible en français, anglais, espagnol, allemand.",
  ],
};

const v325_en: ChangelogEntry = {
  version: "v325",
  date: "2026-08-20",
  title: "Polish: sound timbres, cross-pack icons, changelog i18n",
  items: [
    "Sound pack timbres refined (mechanical, liquid, minimal) with per-type volumes.",
    "Extended cross-pack icon mapping + iconify collection fallback.",
    "Site changelog available in French, English, Spanish and German.",
  ],
};

const v325_es: ChangelogEntry = {
  version: "v325",
  date: "2026-08-20",
  title: "Polish: timbres, iconos cross-pack, changelog i18n",
  items: [
    "Timbres de los sound packs refinados (mechanical, liquid, minimal) con volúmenes por tipo.",
    "Mapeo cross-pack de iconos extendido + fallback por colección iconify.",
    "Changelog del sitio disponible en francés, inglés, español y alemán.",
  ],
};

const v325_de: ChangelogEntry = {
  version: "v325",
  date: "2026-08-20",
  title: "Polish: Sound-Timbres, Cross-Pack Icons, Changelog i18n",
  items: [
    "Sound-Pack-Timbres verfeinert (mechanical, liquid, minimal) mit Lautstärken pro Typ.",
    "Cross-Pack-Icon-Mapping erweitert + Iconify-Collection-Fallback.",
    "Website-Changelog auf Französisch, Englisch, Spanisch und Deutsch verfügbar.",
  ],
};

const v324_fr: ChangelogEntry = {
  version: "v324",
  date: "2026-08-10",
  title: "Plan B + Command Center + Live Overlay + Profil avancé",
  items: [
    "Backend team (invitation, liste, suppression) connecté à Supabase.",
    "Backend spaces / flows / interactions / bill via ethone_user_data.",
    "Mission Control v1 : fenêtres flottantes multi-instances, aperçu, drag/resize.",
    "Command Center v1 : navigation, actions, création rapide, déconnexion.",
    "Live Overlay v4 : cartes riches Spotify/Discord/YouTube, equalizer, contrôles, avatars.",
    "Personnalisation v2 : Dock personnalisable + Live cards flip + glass/tilt.",
    "ProfileDropdown : avatar/icône personne, plus de lettre.",
    "Icon packs : Lucide, Phosphor, Tabler, Heroicons, Radix + densité mode.",
    "Uniformisation pack d'icônes sur les composants + réglages visuels (ombre, fond, radius dock).",
    "Toutes les pages migrées au pack d'icônes, density engine, aurora, presets de mise en page, equalizer live.",
    "Sound packs v1 : Web Audio API, 4 packs, click/hover/success/error/toggle/notification.",
    "Toast notifications avec animations + i18n complet (fr, en, es, de).",
    "Plugins tiers v1 : page /plugins avec statut live et ouverture fenêtre.",
    "Macros persistantes : page /macros, exécution depuis Command Center.",
    "Personas : page /personas avec thèmes.",
    "Profil avancé : page /profile connectée à ethone_public_profiles.",
    "Bills v1 : page /bills, échéances, total, semaine.",
  ],
};

const v323_fr: ChangelogEntry = {
  version: "v323",
  date: "2026-08-18",
  title: "Fix UI : bouton collapse, profil/help Mail, bills i18n",
  items: [
    "Bouton de collapse Mail : icône seule.",
    "Bouton Profil dans Mail ouvre le panneau profil.",
    "Bouton Aide dans Mail ouvre les raccourcis clavier.",
    "Bills : date et montant localisés avec Intl.",
  ],
};

const v322_fr: ChangelogEntry = {
  version: "v322",
  date: "2026-08-18",
  title: "Audit i18n : batch settings, Brain, home",
  items: [
    "Ajout de 30+ entrées i18n.",
    "Suppression des variables locales worker/.dev.vars.",
  ],
};

export const CHANGELOG_BY_LANG: Record<string, ChangelogEntry[]> = {
  fr: [v327_fr, v326_fr, v325_fr, v324_fr, v323_fr, v322_fr],
  en: [v327_en, v326_en, v325_en,
    {
      version: "v324",
      date: "2026-08-10",
      title: "Plan B + Command Center + Live Overlay + Advanced Profile",
      items: [
        "Team backend (invite, list, remove) connected to Supabase.",
        "Spaces / flows / interactions / bill backend via ethone_user_data.",
        "Mission Control v1: multi-instance floating windows, preview, drag/resize.",
        "Command Center v1: navigation, actions, quick create, sign out.",
        "Live Overlay v4: rich Spotify/Discord/YouTube cards, equalizer, controls, avatars.",
        "Customization v2: customizable Dock + Live cards flip + glass/tilt.",
        "ProfileDropdown: avatar/person icon instead of initials.",
        "Icon packs: Lucide, Phosphor, Tabler, Heroicons, Radix + density mode.",
        "Icon pack uniformization across components + visual settings (shadow, background, dock radius).",
        "All pages migrated to icon pack, density engine, aurora, layout presets, live equalizer.",
        "Sound packs v1: Web Audio API, 4 packs, click/hover/success/error/toggle/notification.",
        "Toast notifications with animations + full i18n (fr, en, es, de).",
        "Third-party plugins v1: /plugins page with live status and window opening.",
        "Persistent macros: /macros page, execution from Command Center.",
        "Personas: /personas page with themes.",
        "Advanced profile: /profile page connected to ethone_public_profiles.",
        "Bills v1: /bills page, due dates, total, weekly view.",
      ],
    },
    {
      version: "v323",
      date: "2026-08-18",
      title: "UI fix: collapse button, profile/help in Mail, bills i18n",
      items: [
        "Mail collapse button: icon only.",
        "Profile button in Mail opens the profile panel.",
        "Help button in Mail opens keyboard shortcuts.",
        "Bills: localized date and amount with Intl.",
      ],
    },
    {
      version: "v322",
      date: "2026-08-18",
      title: "i18n audit: settings batch, Brain, home",
      items: [
        "Added 30+ i18n entries.",
        "Removed local worker/.dev.vars variables.",
      ],
    },
  ],
  es: [v327_es, v326_es, v325_es,
    {
      version: "v324",
      date: "2026-08-10",
      title: "Plan B + Command Center + Live Overlay + Perfil avanzado",
      items: [
        "Backend de equipo (invitar, listar, eliminar) conectado a Supabase.",
        "Backend de spaces / flows / interactions / bill vía ethone_user_data.",
        "Mission Control v1: ventanas flotantes multi-instancia, vista previa, drag/resize.",
        "Command Center v1: navegación, acciones, creación rápida, cierre de sesión.",
        "Live Overlay v4: cartas ricas Spotify/Discord/YouTube, equalizer, controles, avatares.",
        "Personalización v2: Dock personalizable + Live cards flip + glass/tilt.",
        "ProfileDropdown: avatar/icono de persona en lugar de iniciales.",
        "Packs de iconos: Lucide, Phosphor, Tabler, Heroicons, Radix + modo densidad.",
        "Uniformización del pack de iconos en componentes + ajustes visuales (sombra, fondo, radio dock).",
        "Todas las páginas migradas al pack de iconos, density engine, aurora, presets de layout, equalizer live.",
        "Sound packs v1: Web Audio API, 4 packs, click/hover/success/error/toggle/notification.",
        "Toast notifications con animaciones + i18n completo (fr, en, es, de).",
        "Plugins de terceros v1: página /plugins con estado live y apertura de ventana.",
        "Macros persistentes: página /macros, ejecución desde Command Center.",
        "Personas: página /personas con temas.",
        "Perfil avanzado: página /profile conectada a ethone_public_profiles.",
        "Bills v1: página /bills, vencimientos, total, semana.",
      ],
    },
    {
      version: "v323",
      date: "2026-08-18",
      title: "Fix UI: botón collapse, perfil/ayuda en Mail, i18n bills",
      items: [
        "Botón collapse de Mail: solo icono.",
        "Botón Perfil en Mail abre el panel de perfil.",
        "Botón Ayuda en Mail abre atajos de teclado.",
        "Bills: fecha y monto localizados con Intl.",
      ],
    },
    {
      version: "v322",
      date: "2026-08-18",
      title: "Auditoría i18n: batch settings, Brain, home",
      items: [
        "Añadidas 30+ entradas i18n.",
        "Eliminadas variables locales worker/.dev.vars.",
      ],
    },
  ],
  de: [v327_de, v326_de, v325_de,
    {
      version: "v324",
      date: "2026-08-10",
      title: "Plan B + Command Center + Live Overlay + Erweitertes Profil",
      items: [
        "Team-Backend (Einladen, Auflisten, Entfernen) mit Supabase verbunden.",
        "Spaces / Flows / Interactions / Bill Backend über ethone_user_data.",
        "Mission Control v1: Multi-Instance Schwimmende Fenster, Vorschau, Drag/Resize.",
        "Command Center v1: Navigation, Aktionen, Schnellerstellung, Abmelden.",
        "Live Overlay v4: Rich Spotify/Discord/YouTube-Karten, Equalizer, Steuerungen, Avatare.",
        "Anpassung v2: anpassbarer Dock + Live Cards Flip + Glass/Tilt.",
        "ProfileDropdown: Avatar/Personen-Symbol statt Initialen.",
        "Icon Packs: Lucide, Phosphor, Tabler, Heroicons, Radix + Dichte-Modus.",
        "Icon-Pack-Vereinheitlichung über Komponenten + visuelle Einstellungen (Schatten, Hintergrund, Dock-Radius).",
        "Alle Seiten migriert zu Icon Pack, Density Engine, Aurora, Layout-Presets, Live-Equalizer.",
        "Sound Packs v1: Web Audio API, 4 Packs, Click/Hover/Success/Error/Toggle/Notification.",
        "Toast-Benachrichtigungen mit Animationen + vollständiges i18n (fr, en, es, de).",
        "Drittanbieter-Plugins v1: /plugins-Seite mit Live-Status und Fensteröffnung.",
        "Persistente Makros: /macros-Seite, Ausführung über Command Center.",
        "Personas: /personas-Seite mit Themes.",
        "Erweitertes Profil: /profile-Seite verbunden mit ethone_public_profiles.",
        "Bills v1: /bills-Seite, Fälligkeiten, Gesamtsumme, Wochenansicht.",
      ],
    },
    {
      version: "v323",
      date: "2026-08-18",
      title: "UI-Fix: Collapse-Button, Profil/Hilfe in Mail, Bills-i18n",
      items: [
        "Mail-Collapse-Button: nur Icon.",
        "Profil-Button in Mail öffnet das Profil-Panel.",
        "Hilfe-Button in Mail öffnet Tastaturkürzel.",
        "Bills: lokalisiertes Datum und Betrag mit Intl.",
      ],
    },
    {
      version: "v322",
      date: "2026-08-18",
      title: "i18n-Audit: Settings-Batch, Brain, Home",
      items: [
        "30+ i18n-Einträge hinzugefügt.",
        "Lokale worker/.dev.vars-Variablen entfernt.",
      ],
    },
  ],
};

export const CHANGELOG = CHANGELOG_BY_LANG.fr;
