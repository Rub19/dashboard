export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

const v166_fr: ChangelogEntry = {
  version: "v1.6.6",
  date: "2026-08-19",
  title: "Scroll rétabli sur le dashboard Accueil",
  items: [
    "Le dashboard Accueil retrouve son défilement vertical (`overflow-y-auto`).",
    "Le widget Live est de nouveau visible par défaut.",
    "Le contenu du dashboard s'arrête au-dessus du Dock / de la barre de statut (`pb-6` interne).",
    "Test Playwright `zero-scroll.spec.ts` retiré car la page Accueil est scrollable.",
    "Version affichée en bas à droite : v1.6.6.",
  ],
};

const v166_en: ChangelogEntry = {
  version: "v1.6.6",
  date: "2026-08-19",
  title: "Home dashboard scrolling restored",
  items: [
    "The Home dashboard regains vertical scrolling (`overflow-y-auto`).",
    "The Live widget is visible by default again.",
    "Dashboard content stops above the Dock / status bar (`pb-6` internal padding).",
    "Removed the `zero-scroll.spec.ts` Playwright test as the Home page is scrollable.",
    "Version badge bottom-right: v1.6.6.",
  ],
};

const v166_es: ChangelogEntry = {
  version: "v1.6.6",
  date: "2026-08-19",
  title: "Scroll restaurado en el dashboard de inicio",
  items: [
    "El dashboard de inicio recupera el desplazamiento vertical (`overflow-y-auto`).",
    "El widget Live vuelve a estar visible por defecto.",
    "El contenido del dashboard se detiene encima del Dock / barra de estado (`pb-6` interno).",
    "Test Playwright `zero-scroll.spec.ts` eliminado porque la página de inicio es scrollable.",
    "Versión mostrada abajo a la derecha: v1.6.6.",
  ],
};

const v166_de: ChangelogEntry = {
  version: "v1.6.6",
  date: "2026-08-19",
  title: "Scrollen auf dem Home-Dashboard wiederhergestellt",
  items: [
    "Das Home-Dashboard erhält das vertikale Scrollen zurück (`overflow-y-auto`).",
    "Das Live-Widget ist wieder standardmäßig sichtbar.",
    "Dashboard-Inhalt stoppt oberhalb des Docks / der Statusleiste (internes `pb-6`).",
    "Playwright-Test `zero-scroll.spec.ts` entfernt, da die Startseite scrollable ist.",
    "Version unten rechts: v1.6.6.",
  ],
};

const v165_fr: ChangelogEntry = {
  version: "v1.6.5",
  date: "2026-08-19",
  title: "Barre de statut transparente au-dessus du fond d'écran",
  items: [
    "Rétablissement de la barre de statut en bas d'écran.",
    "Footer transparent (`bg-transparent`, `pointer-events-none`, texte `zinc-200`) : plus de carré noir bloquant la vue.",
    "Dock repositionné au-dessus de la barre (`bottom-8`) pour préserver les informations en bas.",
    "Bouton Live conservé dans la barre de statut, retiré du Dock (pas de duplication).",
    "Version affichée en bas à droite : v1.6.5.",
  ],
};

const v165_en: ChangelogEntry = {
  version: "v1.6.5",
  date: "2026-08-19",
  title: "Transparent status bar above the wallpaper",
  items: [
    "Restored the bottom status bar.",
    "Transparent footer (`bg-transparent`, `pointer-events-none`, `zinc-200` text): no more black square blocking the view.",
    "Dock repositioned above the status bar (`bottom-8`) to keep the bottom info visible.",
    "Live button kept in the status bar, removed from the Dock (no duplication).",
    "Version badge bottom-right: v1.6.5.",
  ],
};

const v165_es: ChangelogEntry = {
  version: "v1.6.5",
  date: "2026-08-19",
  title: "Barra de estado transparente sobre el fondo",
  items: [
    "Restauración de la barra de estado inferior.",
    "Footer transparente (`bg-transparent`, `pointer-events-none`, texto `zinc-200`): no más cuadrado negro bloqueando la vista.",
    "Dock reposicionado encima de la barra (`bottom-8`) para mantener la información inferior visible.",
    "Botón Live conservado en la barra de estado, eliminado del Dock (sin duplicación).",
    "Versión mostrada abajo a la derecha: v1.6.5.",
  ],
};

const v165_de: ChangelogEntry = {
  version: "v1.6.5",
  date: "2026-08-19",
  title: "Transparente Statusleiste über dem Hintergrund",
  items: [
    "Wiederherstellung der unteren Statusleiste.",
    "Transparenter Footer (`bg-transparent`, `pointer-events-none`, `zinc-200` Text): kein schwarzes Quadrat mehr, das die Sicht blockiert.",
    "Dock über der Statusleiste repositioniert (`bottom-8`), damit die unteren Infos sichtbar bleiben.",
    "Live-Button in der Statusleiste behalten, aus dem Dock entfernt (keine Duplizierung).",
    "Version unten rechts: v1.6.5.",
  ],
};

const v164_fr: ChangelogEntry = {
  version: "v1.6.4",
  date: "2026-08-19",
  title: "Zero-scroll, suppression de la barre noire et Dock premium",
  items: [
    "Suppression du footer / bande noire pleine largeur en bas d'écran.",
    "Verrouillage strict du canevas à 100dvh : plus de scroll parasite sur la page d'accueil.",
    "Dock flottant repositionné en bottom-0, avec pb-[calc(1rem+env(safe-area-inset-bottom))].",
    "Bouton Live intégré dans le Dock, sans conteneur de fond bloquant.",
    "Densification des cartes Bento (p-4, gaps réduits, min-heights ajustés).",
    "Widget Live masqué par défaut sur le dashboard pour préserver le zéro-scroll.",
    "Thème Dark Obsidian du Dock (fond #0d0e12/85, blur 2xl, reflet interne, ombre profonde).",
    "Version affichée en bas à droite : v1.6.4.",
  ],
};

const v164_en: ChangelogEntry = {
  version: "v1.6.4",
  date: "2026-08-19",
  title: "Zero-scroll, bottom black bar removal and premium Dock",
  items: [
    "Removed the full-width footer / bottom black bar.",
    "Strict 100dvh canvas lock: no parasitic scroll on the home page.",
    "Floating Dock repositioned at bottom-0 with pb-[calc(1rem+env(safe-area-inset-bottom))].",
    "Live button integrated in the Dock, with no blocking background container.",
    "Denser Bento cards (p-4, reduced gaps, adjusted min-heights).",
    "Live widget hidden by default on the dashboard to preserve zero-scroll.",
    "Dock Dark Obsidian theme (#0d0e12/85, blur 2xl, inner highlight, deep shadow).",
    "Version badge bottom-right: v1.6.4.",
  ],
};

const v164_es: ChangelogEntry = {
  version: "v1.6.4",
  date: "2026-08-19",
  title: "Zero-scroll, eliminación de la barra negra inferior y Dock premium",
  items: [
    "Eliminación del footer / barra negra de ancho completo en la parte inferior.",
    "Bloqueo estricto del lienzo a 100dvh: sin scroll parásito en la página de inicio.",
    "Dock flotante reposicionado en bottom-0 con pb-[calc(1rem+env(safe-area-inset-bottom))].",
    "Botón Live integrado en el Dock, sin contenedor de fondo bloqueante.",
    "Cartas Bento más densas (p-4, gaps reducidos, min-heights ajustados).",
    "Widget Live oculto por defecto en el dashboard para preservar el zero-scroll.",
    "Tema Dark Obsidian del Dock (#0d0e12/85, blur 2xl, reflejo interno, sombra profunda).",
    "Versión mostrada abajo a la derecha: v1.6.4.",
  ],
};

const v164_de: ChangelogEntry = {
  version: "v1.6.4",
  date: "2026-08-19",
  title: "Zero-scroll, Entfernung der schwarzen unteren Leiste und Premium-Dock",
  items: [
    "Entfernung der durchgehenden Footer-/schwarzen unteren Leiste.",
    "Strikte 100dvh-Ansichtsfixierung: kein parasitisches Scrollen auf der Startseite.",
    "Schwimmendes Dock bei bottom-0 mit pb-[calc(1rem+env(safe-area-inset-bottom))].",
    "Live-Button im Dock integriert, ohne blockierenden Hintergrund-Container.",
    "Dichtere Bento-Karten (p-4, reduzierte Gaps, angepasste Min-Heights).",
    "Live-Widget standardmäßig im Dashboard ausgeblendet, um Zero-Scroll zu bewahren.",
    "Dock Dark Obsidian Theme (#0d0e12/85, blur 2xl, innerer Glanz, tiefer Schatten).",
    "Version unten rechts: v1.6.4.",
  ],
};

const v328_fr: ChangelogEntry = {
  version: "v328",
  date: "2026-08-20",
  title: "Tests E2E + audit responsive/a11y",
  items: [
    "Playwright + @axe-core/playwright : tests E2E routes, responsive, accessibilité.",
    "scripts/a11y-audit.mjs et responsive-audit.mjs avec rapports JSON.",
    "Corrige aria-label sur sidebar, dock, live overlay, toggles, boutons, inputs, selects et textareas.",
    "Hierarchie de titres corrigée.",
    "npm run test:all passe.",
  ],
};

const v328_en: ChangelogEntry = {
  version: "v328",
  date: "2026-08-20",
  title: "E2E tests + responsive/a11y audit",
  items: [
    "Playwright + @axe-core/playwright: E2E routes, responsive, accessibility tests.",
    "scripts/a11y-audit.mjs and responsive-audit.mjs with JSON reports.",
    "Fix aria-label on sidebar, dock, live overlay, toggles, buttons, inputs, selects and textareas.",
    "Heading hierarchy fixed.",
    "npm run test:all passes.",
  ],
};

const v328_es: ChangelogEntry = {
  version: "v328",
  date: "2026-08-20",
  title: "Tests E2E + auditoría responsive/a11y",
  items: [
    "Playwright + @axe-core/playwright: tests E2E de rutas, responsive y accesibilidad.",
    "scripts/a11y-audit.mjs y responsive-audit.mjs con informes JSON.",
    "Corrige aria-label en sidebar, dock, live overlay, toggles, botones, inputs, selects y textareas.",
    "Jerarquía de títulos corregida.",
    "npm run test:all pasa.",
  ],
};

const v328_de: ChangelogEntry = {
  version: "v328",
  date: "2026-08-20",
  title: "E2E-Tests + Responsive/A11y-Audit",
  items: [
    "Playwright + @axe-core/playwright: E2E-Routen-, Responsive- und Barrierefreiheitstests.",
    "scripts/a11y-audit.mjs und responsive-audit.mjs mit JSON-Berichten.",
    "aria-label in Sidebar, Dock, Live-Overlay, Toggles, Buttons, Inputs, Selects und Textareas korrigiert.",
    "Überschriften-Hierarchie korrigiert.",
    "npm run test:all besteht.",
  ],
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
  fr: [v166_fr, v165_fr, v164_fr, v328_fr, v327_fr, v326_fr, v325_fr, v324_fr, v323_fr, v322_fr],
  en: [v166_en, v165_en, v164_en, v328_en, v327_en, v326_en, v325_en,
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
  es: [v166_es, v165_es, v164_es, v328_es, v327_es, v326_es, v325_es,
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
  de: [v166_de, v165_de, v164_de, v328_de, v327_de, v326_de, v325_de,
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
