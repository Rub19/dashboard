export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

const v375_fr: ChangelogEntry = {
  version: "v1.9.4",
  date: "2026-08-25",
  title: "Drag & drop et persistance du layout Home",
  items: [
    "Ajout de `@dnd-kit/core` et `@dnd-kit/sortable`.",
    "Nouveau composant `SortableWidget` avec poignée de glisser-déposer visible en mode personnalisation.",
    "DashboardOverview : le Home est désormais réorganisable par glisser-déposer en mode personnalisation.",
    "La grille Home respecte l'ordre sauvegardé de l'utilisateur ; les nouveaux widgets sont ajoutés à la fin.",
    "Déplacement d'un widget met à jour `desktop_layout` via `useDesktopLayout` et persiste dans Supabase.",
    "Conservation des états de visibilité et de l'ordre relatif des widgets masqués lors du glisser-déposer.",
    "Validation : `npm run build`, `npm run lint`, `npm run test:unit` restent verts.",
    "Version affichée en bas à droite : v1.9.4.",
  ],
};

const v375_en: ChangelogEntry = {
  version: "v1.9.4",
  date: "2026-08-25",
  title: "Home drag & drop and layout persistence",
  items: [
    "Added `@dnd-kit/core` and `@dnd-kit/sortable`.",
    "New `SortableWidget` component with a drag handle visible in customization mode.",
    "DashboardOverview: the Home can now be reordered by drag & drop in customization mode.",
    "The Home grid respects the user's saved order; new widgets are appended at the end.",
    "Moving a widget updates `desktop_layout` via `useDesktopLayout` and persists in Supabase.",
    "Visibility states and relative order of hidden widgets are preserved during drag & drop.",
    "Validation: `npm run build`, `npm run lint`, `npm run test:unit` still pass.",
    "Version badge bottom-right: v1.9.4.",
  ],
};

const v375_es: ChangelogEntry = {
  version: "v1.9.4",
  date: "2026-08-25",
  title: "Arrastrar y soltar y persistencia del layout del Home",
  items: [
    "Añadido `@dnd-kit/core` y `@dnd-kit/sortable`.",
    "Nuevo componente `SortableWidget` con un asa de arrastre visible en modo personalización.",
    "DashboardOverview: el Home ahora se puede reordenar con arrastrar y soltar en modo personalización.",
    "La cuadrícula del Home respeta el orden guardado del usuario; los nuevos widgets se añaden al final.",
    "Mover un widget actualiza `desktop_layout` vía `useDesktopLayout` y persiste en Supabase.",
    "Se conservan los estados de visibilidad y el orden relativo de los widgets ocultos durante el arrastre.",
    "Validación: `npm run build`, `npm run lint`, `npm run test:unit` siguen pasando.",
    "Versión mostrada abajo a la derecha: v1.9.4.",
  ],
};

const v375_de: ChangelogEntry = {
  version: "v1.9.4",
  date: "2026-08-25",
  title: "Home Drag & Drop und Layout-Persistenz",
  items: [
    "`@dnd-kit/core` und `@dnd-kit/sortable` hinzugefügt.",
    "Neue `SortableWidget`-Komponente mit Ziehgriff, sichtbar im Anpassungsmodus.",
    "DashboardOverview: das Home lässt sich jetzt per Drag & Drop im Anpassungsmodus neu ordnen.",
    "Das Home-Raster respektiert die gespeicherte Reihenfolge; neue Widgets werden am Ende angehängt.",
    "Das Verschieben eines Widgets aktualisiert `desktop_layout` über `useDesktopLayout` und wird in Supabase persistiert.",
    "Sichtbarkeitszustände und relative Reihenfolge ausgeblendeter Widgets bleiben beim Ziehen erhalten.",
    "Validierung: `npm run build`, `npm run lint`, `npm run test:unit` bestehen weiterhin.",
    "Version unten rechts: v1.9.4.",
  ],
};

const v395_fr: ChangelogEntry = {
  version: "v1.9.5",
  date: "2026-08-25",
  title: "Polish final, tokens, accessibilité et performance",
  items: [
    "PASS 1 : consolidation du design system, polish boutons, glass et ambiance pluie.",
    "PASS 2 : Dynamic Island, Dock, z-index et micro-interactions.",
    "PASS 3 : Settings tokenisé, previews thèmes, badges, skeletons.",
    "PASS 4 : ajustements Dynamic Island, MobileNav, Sidebar tokens et Modal padding.",
    "PASS 5 : thèmes, remplacement des couleurs hardcodées par les tokens du design system.",
    "PASS 6 : accessibilité, aria-pressed, aria-invalid, aria-describedby, focus visible.",
    "PASS 7 : performance, suppression des layout inutiles, normalisation des tokens CSS.",
    "PASS 8 : polish final, normalisation complète des tokens CSS dans toute l'application.",
    "Validation : `npm run build`, `npm run lint` restent verts.",
    "Version affichée en bas à droite : v1.9.5.",
  ],
};

const v395_en: ChangelogEntry = {
  version: "v1.9.5",
  date: "2026-08-25",
  title: "Final polish, tokens, accessibility and performance",
  items: [
    "PASS 1: design system consolidation, buttons, glass and rain ambience polish.",
    "PASS 2: Dynamic Island, Dock, z-index and micro-interactions.",
    "PASS 3: tokenized Settings, theme previews, badges, skeletons.",
    "PASS 4: Dynamic Island, MobileNav, Sidebar tokens and Modal padding adjustments.",
    "PASS 5: themes, replacement of hardcoded colors with design system tokens.",
    "PASS 6: accessibility, aria-pressed, aria-invalid, aria-describedby, visible focus.",
    "PASS 7: performance, removal of unnecessary layout animations, CSS token normalization.",
    "PASS 8: final polish, full CSS token normalization across the entire app.",
    "Validation: `npm run build`, `npm run lint` remain green.",
    "Version badge bottom-right: v1.9.5.",
  ],
};

const v395_es: ChangelogEntry = {
  version: "v1.9.5",
  date: "2026-08-25",
  title: "Polish final, tokens, accesibilidad y rendimiento",
  items: [
    "PASS 1: consolidación del design system, botones, glass y ambiente de lluvia.",
    "PASS 2: Dynamic Island, Dock, z-index y micro-interacciones.",
    "PASS 3: Settings tokenizado, vistas previas de temas, badges, skeletons.",
    "PASS 4: ajustes de Dynamic Island, MobileNav, Sidebar tokens y Modal padding.",
    "PASS 5: temas, sustitución de colores hardcodeados por tokens del design system.",
    "PASS 6: accesibilidad, aria-pressed, aria-invalid, aria-describedby, foco visible.",
    "PASS 7: rendimiento, eliminación de layouts innecesarios, normalización de tokens CSS.",
    "PASS 8: polish final, normalización completa de tokens CSS en toda la aplicación.",
    "Validación: `npm run build`, `npm run lint` siguen pasando.",
    "Versión mostrada abajo a la derecha: v1.9.5.",
  ],
};

const v395_de: ChangelogEntry = {
  version: "v1.9.5",
  date: "2026-08-25",
  title: "Finaler Polish, Tokens, Barrierefreiheit und Performance",
  items: [
    "PASS 1: Konsolidierung des Design-Systems, Buttons, Glass und Regen-Ambiente.",
    "PASS 2: Dynamic Island, Dock, z-index und Micro-Interaktionen.",
    "PASS 3: Tokenisierte Settings, Theme-Vorschauen, Badges, Skeletons.",
    "PASS 4: Anpassungen Dynamic Island, MobileNav, Sidebar-Tokens und Modal-Padding.",
    "PASS 5: Themes, Ersetzung hartcodierter Farben durch Design-System-Tokens.",
    "PASS 6: Barrierefreiheit, aria-pressed, aria-invalid, aria-describedby, sichtbarer Fokus.",
    "PASS 7: Performance, Entfernung unnötiger Layout-Animationen, CSS-Token-Normalisierung.",
    "PASS 8: Finaler Polish, vollständige CSS-Token-Normalisierung in der gesamten App.",
    "Validierung: `npm run build`, `npm run lint` bleiben grün.",
    "Version unten rechts: v1.9.5.",
  ],
};

const v374_fr: ChangelogEntry = {
  version: "v1.9.3",
  date: "2026-08-25",
  title: "Uniformisation des boutons, icônes et tokens",
  items: [
    "Nouveau composant `IconButton` pour les boutons icônes avec tailles sm/md/lg et variantes default/ghost/active.",
    "TopBar : `ThemeToggle`, `FocusToggle`, `DynamicIslandToggle` et `WeatherQuickButton` utilisent `IconButton`/`Button` standardisés.",
    "DashboardOverview : boutons personnaliser, terminer et sélecteurs de sections basculés sur `IconButton` et `Button`.",
    "Remplacement des imports `lucide-react` directs par `Icon` dans `TopBar` et `DashboardOverview` pour une source d'icônes unique.",
    "Mise à jour du `Button` et des nouveaux composants pour les tokens ETHONE (`--text-primary`, `--accent-primary`, `--text-muted`).",
    "Validation : `npm run build`, `npm run lint`, `npm run test:unit` restent verts.",
    "Version affichée en bas à droite : v1.9.3.",
  ],
};

const v374_en: ChangelogEntry = {
  version: "v1.9.3",
  date: "2026-08-25",
  title: "Button, icon and token unification",
  items: [
    "New `IconButton` component for icon buttons with sm/md/lg sizes and default/ghost/active variants.",
    "TopBar: `ThemeToggle`, `FocusToggle`, `DynamicIslandToggle` and `WeatherQuickButton` now use standardized `IconButton`/`Button`.",
    "DashboardOverview: customize, done and section toggle buttons moved to `IconButton` and `Button`.",
    "Replaced direct `lucide-react` imports with `Icon` in `TopBar` and `DashboardOverview` for a single icon source.",
    "Updated `Button` and new components to use ETHONE tokens (`--text-primary`, `--accent-primary`, `--text-muted`).",
    "Validation: `npm run build`, `npm run lint`, `npm run test:unit` still pass.",
    "Version badge bottom-right: v1.9.3.",
  ],
};

const v374_es: ChangelogEntry = {
  version: "v1.9.3",
  date: "2026-08-25",
  title: "Unificación de botones, iconos y tokens",
  items: [
    "Nuevo componente `IconButton` para botones de icono con tamaños sm/md/lg y variantes default/ghost/active.",
    "TopBar: `ThemeToggle`, `FocusToggle`, `DynamicIslandToggle` y `WeatherQuickButton` usan `IconButton`/`Button` estandarizados.",
    "DashboardOverview: botones personalizar, terminar y selectores de sección migrados a `IconButton` y `Button`.",
    "Reemplazo de importaciones directas de `lucide-react` por `Icon` en `TopBar` y `DashboardOverview` para una única fuente de iconos.",
    "Actualización de `Button` y los nuevos componentes para usar los tokens ETHONE (`--text-primary`, `--accent-primary`, `--text-muted`).",
    "Validación: `npm run build`, `npm run lint`, `npm run test:unit` siguen pasando.",
    "Versión mostrada abajo a la derecha: v1.9.3.",
  ],
};

const v374_de: ChangelogEntry = {
  version: "v1.9.3",
  date: "2026-08-25",
  title: "Vereinheitlichung von Schaltflächen, Symbolen und Tokens",
  items: [
    "Neue `IconButton`-Komponente für Icon-Buttons mit sm/md/lg-Größen und default/ghost/active-Varianten.",
    "TopBar: `ThemeToggle`, `FocusToggle`, `DynamicIslandToggle` und `WeatherQuickButton` verwenden jetzt standardisierte `IconButton`/`Button`.",
    "DashboardOverview: Anpassen-, Fertig- und Bereichs-Umschaltbuttons auf `IconButton` und `Button` umgestellt.",
    "Direkte `lucide-react`-Importe durch `Icon` in `TopBar` und `DashboardOverview` ersetzt, um eine einzige Icon-Quelle zu haben.",
    "`Button` und neue Komponenten auf ETHONE-Tokens (`--text-primary`, `--accent-primary`, `--text-muted`) aktualisiert.",
    "Validierung: `npm run build`, `npm run lint`, `npm run test:unit` bestehen weiterhin.",
    "Version unten rechts: v1.9.3.",
  ],
};

const v373_fr: ChangelogEntry = {
  version: "v1.9.2",
  date: "2026-08-25",
  title: "Restauration de l'identité visuelle du Home",
  items: [
    "Dynamic Island : portail React, positionnement fixe indépendant, capsule fermée par défaut avec horloge ETHONE, mode COMPACT sécurisé contre l'ouverture automatique.",
    "Footer ETHONE : restauration de la barre d'état (`StatusBar`) et ajustement des marges du main.",
    "Cartes 3D interactives : `Card3D` intègre `TiltCard` avec effet subtil au survol.",
    "Nouveau widget `ConnectionCardsWidget` : carte de connexion 3D des services live (Spotify, Discord, GitHub, Steam, etc.) sur le Home.",
    "Grille du Home : priorisation selon la période du jour, largeur max adaptative (`homeGrid`), fusion du layout sauvegardé avec les nouveaux widgets par défaut.",
    "États de chargement : le Home s'affiche plus tôt, chaque widget gère son propre état de chargement au lieu d'un squelette global.",
    "Démarrage : réduction des délais d'expiration de session et de boot pour éviter les écrans figés à 0%.",
    "Validation : `npm run build`, `npm run lint`, `npm run test:unit` et `home-bento-layout` Playwright passent.",
    "Version affichée en bas à droite : v1.9.2.",
  ],
};

const v373_en: ChangelogEntry = {
  version: "v1.9.2",
  date: "2026-08-25",
  title: "Home visual identity restoration",
  items: [
    "Dynamic Island: React portal, fixed independent positioning, default closed capsule with ETHONE clock, COMPACT mode secured against auto-open.",
    "ETHONE footer: restored status bar (`StatusBar`) and main bottom padding.",
    "Interactive 3D cards: `Card3D` now integrates `TiltCard` for subtle hover tilt.",
    "New `ConnectionCardsWidget` home widget: 3D connection cards for live services (Spotify, Discord, GitHub, Steam, etc.).",
    "Home grid: time-of-day priority, adaptive max-width (`homeGrid`), saved layout merged with new default widgets.",
    "Loading states: home displays earlier, each widget handles its own loading state instead of a global skeleton.",
    "Boot: reduced session and boot timeouts to avoid stuck 0% screens.",
    "Validation: `npm run build`, `npm run lint`, `npm run test:unit` and `home-bento-layout` Playwright pass.",
    "Version badge bottom-right: v1.9.2.",
  ],
};

const v373_es: ChangelogEntry = {
  version: "v1.9.2",
  date: "2026-08-25",
  title: "Restauración de la identidad visual del Home",
  items: [
    "Dynamic Island: portal de React, posicionamiento fijo e independiente, cápsula cerrada por defecto con reloj ETHONE, modo COMPACTO seguro contra apertura automática.",
    "Pie de página ETHONE: restaurada la barra de estado (`StatusBar`) y ajustado el margen inferior del main.",
    "Tarjetas 3D interactivas: `Card3D` integra `TiltCard` con inclinación sutil al pasar el cursor.",
    "Nuevo widget `ConnectionCardsWidget`: tarjetas de conexión 3D de servicios en vivo (Spotify, Discord, GitHub, Steam, etc.).",
    "Cuadrícula del Home: priorización según la hora del día, ancho máximo adaptable (`homeGrid`), layout guardado fusionado con los nuevos widgets por defecto.",
    "Estados de carga: el Home aparece más pronto, cada widget gestiona su propio estado de carga en lugar de un esqueleto global.",
    "Inicio: reducidos los tiempos de espera de sesión y arranque para evitar pantallas bloqueadas en 0%.",
    "Validación: `npm run build`, `npm run lint`, `npm run test:unit` y `home-bento-layout` Playwright pasan.",
    "Versión mostrada abajo a la derecha: v1.9.2.",
  ],
};

const v373_de: ChangelogEntry = {
  version: "v1.9.2",
  date: "2026-08-25",
  title: "Wiederherstellung der visuellen Home-Identität",
  items: [
    "Dynamic Island: React-Portal, feste unabhängige Positionierung, geschlossene Standardkapsel mit ETHONE-Uhr, COMPACT-Modus gegen automatisches Öffnen gesichert.",
    "ETHONE-Fußzeile: Statusleiste (`StatusBar`) wiederhergestellt und unterer Rand des main angepasst.",
    "Interaktive 3D-Karten: `Card3D` integriert `TiltCard` für dezente Hover-Neigung.",
    "Neues `ConnectionCardsWidget`: 3D-Verbindungskarten für Live-Dienste (Spotify, Discord, GitHub, Steam, etc.).",
    "Home-Raster: Tageszeit-Priorisierung, adaptive maximale Breite (`homeGrid`), gespeichertes Layout mit neuen Standard-Widgets zusammengeführt.",
    "Ladezustände: Home wird früher angezeigt, jedes Widget verwaltet seinen eigenen Ladezustand statt eines globalen Skeletts.",
    "Boot: Sitzungs- und Boot-Timeouts reduziert, um hängende 0%-Bildschirme zu vermeiden.",
    "Validierung: `npm run build`, `npm run lint`, `npm run test:unit` und `home-bento-layout` Playwright bestanden.",
    "Version unten rechts: v1.9.2.",
  ],
};

const v173_fr: ChangelogEntry = {
  version: "v1.6.13",
  date: "2026-08-19",
  title: "Correction UI : z-index et portails pour les menus déroulants",
  items: [
    "Les menus Profil, Langue et Notifications sont désormais rendus via un portail React fixed pour flotter au-dessus de tout le contenu.",
    "Utilisation de FloatingPortal + useFloating + useLayer pour le positionnement, l'extérieur du menu et la touche Échap.",
    "TopBar passe en z-50 et main en z-0 pour garantir l'ordre d'empilement.",
    "Bouton raccourci \"Créer une note\" ramené à z-0.",
    "Audit Snyk : aucune clé API exposée (faux positifs sur clés localStorage/i18n).",
    "Version affichée en bas à droite : v1.6.13.",
  ],
};

const v173_en: ChangelogEntry = {
  version: "v1.6.13",
  date: "2026-08-19",
  title: "UI fix: z-index and portals for dropdowns",
  items: [
    "Profile, Language and Notification menus now render through a fixed React portal so they float above all content.",
    "Using FloatingPortal + useFloating + useLayer for positioning, outside click and Escape.",
    "TopBar set to z-50 and main to z-0 to guarantee stacking order.",
    "\"Create a note\" shortcut button lowered to z-0.",
    "Snyk audit: no exposed API keys (false positives on localStorage/i18n keys).",
    "Version badge bottom-right: v1.6.13.",
  ],
};

const v173_es: ChangelogEntry = {
  version: "v1.6.13",
  date: "2026-08-19",
  title: "Corrección UI: z-index y portales para desplegables",
  items: [
    "Los menús de Perfil, Idioma y Notificaciones ahora se renderizan a través de un portal React fixed para flotar por encima de todo el contenido.",
    "Uso de FloatingPortal + useFloating + useLayer para posicionamiento, clic fuera y Escape.",
    "TopBar en z-50 y main en z-0 para garantizar el orden de apilamiento.",
    "Botón de acceso directo \"Crear nota\" reducido a z-0.",
    "Auditoría Snyk: ninguna clave API expuesta (falsos positivos en claves localStorage/i18n).",
    "Versión mostrada abajo a la derecha: v1.6.13.",
  ],
};

const v173_de: ChangelogEntry = {
  version: "v1.6.13",
  date: "2026-08-19",
  title: "UI-Fix: z-Index und Portale für Dropdowns",
  items: [
    "Die Menüs Profil, Sprache und Benachrichtigungen werden jetzt über ein fixed React-Portal gerendert, um über dem gesamten Inhalt zu schweben.",
    "Verwendung von FloatingPortal + useFloating + useLayer für Positionierung, Klick außerhalb und Escape.",
    "TopBar auf z-50 und main auf z-0 gesetzt, um die Stapelreihenfolge zu garantieren.",
    "\"Notiz erstellen\"-Verknüpfungsbutton auf z-0 reduziert.",
    "Snyk-Audit: Keine API-Schlüssel offengelegt (Falschmeldungen bei localStorage/i18n-Schlüsseln).",
    "Version unten rechts: v1.6.13.",
  ],
};

const v174_fr: ChangelogEntry = {
  version: "v1.6.14",
  date: "2026-08-19",
  title: "Discord : double mode OAuth2 / Lanyard et persistance Worker",
  items: [
    "Nouveau sélecteur Discord dans les réglages : OAuth2 (recommandé) ou Lanyard (présence seule).",
    "Le Worker gère le flux OAuth2 Discord : échange du code, récupération du profil @me, email, connexions tierces et serveurs.",
    "Persistance du profil Discord dans la base via le Worker (ethone_user_data kind=discord) et du token OAuth.",
    "Callback OAuth signé côté Worker avec redirection automatique vers l'application.",
    "Intégration de l'avatar et du nom Discord dans la TopBar (UserProfileDropdown) et la Sidebar.",
    "Snyk : DISCORD_CLIENT_SECRET reste exclusivement dans les variables d'environnement côté serveur.",
    "Version affichée en bas à droite : v1.6.14.",
  ],
};

const v174_en: ChangelogEntry = {
  version: "v1.6.14",
  date: "2026-08-19",
  title: "Discord: dual OAuth2 / Lanyard mode and Worker persistence",
  items: [
    "New Discord selector in settings: OAuth2 (recommended) or Lanyard (presence only).",
    "Worker now handles the Discord OAuth2 flow: code exchange, @me profile, email, third-party connections and guilds.",
    "Discord profile persisted through the Worker (ethone_user_data kind=discord) and OAuth token stored securely.",
    "Signed OAuth callback handled by the Worker with automatic redirect back to the app.",
    "Discord avatar and display name integrated in TopBar (UserProfileDropdown) and Sidebar.",
    "Snyk: DISCORD_CLIENT_SECRET remains strictly in server-side environment variables.",
    "Version badge bottom-right: v1.6.14.",
  ],
};

const v174_es: ChangelogEntry = {
  version: "v1.6.14",
  date: "2026-08-19",
  title: "Discord: modo dual OAuth2 / Lanyard y persistencia en Worker",
  items: [
    "Nuevo selector de Discord en ajustes: OAuth2 (recomendado) o Lanyard (solo presencia).",
    "El Worker gestiona el flujo OAuth2 de Discord: intercambio de código, perfil @me, email, conexiones de terceros y servidores.",
    "Perfil de Discord persistido a través del Worker (ethone_user_data kind=discord) y token OAuth almacenado de forma segura.",
    "Callback OAuth firmado gestionado por el Worker con redirección automática a la aplicación.",
    "Avatar y nombre de Discord integrados en la TopBar (UserProfileDropdown) y la barra lateral.",
    "Snyk: DISCORD_CLIENT_SECRET permanece estrictamente en variables de entorno del lado del servidor.",
    "Versión mostrada abajo a la derecha: v1.6.14.",
  ],
};

const v174_de: ChangelogEntry = {
  version: "v1.6.14",
  date: "2026-08-19",
  title: "Discord: Dual-Modus OAuth2 / Lanyard und Worker-Persistenz",
  items: [
    "Neuer Discord-Wahlschalter in den Einstellungen: OAuth2 (empfohlen) oder Lanyard (nur Präsenz).",
    "Der Worker übernimmt den Discord-OAuth2-Flow: Code-Austausch, @me-Profil, E-Mail, Drittverbindungen und Server.",
    "Discord-Profil wird über den Worker persistiert (ethone_user_data kind=discord) und OAuth-Token sicher gespeichert.",
    "Signierter OAuth-Callback im Worker mit automatischer Weiterleitung zurück zur App.",
    "Discord-Avatar und -Name in der TopBar (UserProfileDropdown) und der Sidebar integriert.",
    "Snyk: DISCORD_CLIENT_SECRET bleibt ausschließlich in serverseitigen Umgebungsvariablen.",
    "Version unten rechts: v1.6.14.",
  ],
};

const v177_fr: ChangelogEntry = {
  version: "v1.7.0",
  date: "2026-08-19",
  title: "Sécurité : durcissement multi-tenant et audit global",
  items: [
    "Migration RLS sur `ai_usage_logs` et `ethone_items`, activation de `pgcrypto`.",
    "Nouvel utilitaire `lib/sanitizeHtml.ts` : nettoyage HTML côté client (whitelist http/https).",
    "Tests E2E `security-pentest.spec.ts` : IDOR, XSS (Command Palette, RSS), isolation session.",
    "Validation du protocole RSS et filtrage des liens avant affichage.",
    "Remplacement des rendus `dangerouslySetInnerHTML` par du texte brut ou du nettoyage.",
    "Forçage d'`undici` 7.29.0 côté Worker (correction CVE Snyk).",
    "Version : v1.7.0.",
  ],
};

const v177_en: ChangelogEntry = {
  version: "v1.7.0",
  date: "2026-08-19",
  title: "Security: multi-tenant hardening and global audit",
  items: [
    "RLS migration on `ai_usage_logs` and `ethone_items`, `pgcrypto` enabled.",
    "New `lib/sanitizeHtml.ts` client-side HTML sanitizer (http/https whitelist).",
    "E2E tests `security-pentest.spec.ts`: IDOR, XSS (Command Palette, RSS), session isolation.",
    "RSS protocol validation and link filtering before rendering.",
    "Replacement of `dangerouslySetInnerHTML` with plain text or sanitized output.",
    "Pinned `undici` 7.29.0 in Worker (Snyk CVE fix).",
    "Version: v1.7.0.",
  ],
};

const v177_es: ChangelogEntry = {
  version: "v1.7.0",
  date: "2026-08-19",
  title: "Seguridad: endurecimiento multi-tenant y auditoría global",
  items: [
    "Migración RLS en `ai_usage_logs` y `ethone_items`, activación de `pgcrypto`.",
    "Nuevo utilitario `lib/sanitizeHtml.ts`: limpieza HTML en cliente (lista blanca http/https).",
    "Tests E2E `security-pentest.spec.ts`: IDOR, XSS (Command Palette, RSS), aislamiento de sesión.",
    "Validación del protocolo RSS y filtrado de enlaces antes de renderizar.",
    "Sustitución de `dangerouslySetInnerHTML` por texto plano o contenido sanitizado.",
    "Forzado de `undici` 7.29.0 en el Worker (corrección CVE Snyk).",
    "Versión: v1.7.0.",
  ],
};

const v177_de: ChangelogEntry = {
  version: "v1.7.0",
  date: "2026-08-19",
  title: "Sicherheit: Multi-Tenant-Härtung und globale Prüfung",
  items: [
    "RLS-Migration für `ai_usage_logs` und `ethone_items`, `pgcrypto` aktiviert.",
    "Neues `lib/sanitizeHtml.ts`: clientseitiger HTML-Sanitizer (http/https-Whitelist).",
    "E2E-Tests `security-pentest.spec.ts`: IDOR, XSS (Command Palette, RSS), Sitzungsisolation.",
    "RSS-Protokollvalidierung und Linkfilterung vor dem Rendern.",
    "Ersetzung von `dangerouslySetInnerHTML` durch reinen Text oder bereinigte Ausgabe.",
    "`undici` 7.29.0 im Worker fixiert (Snyk CVE-Fix).",
    "Version: v1.7.0.",
  ],
};

const v176_fr: ChangelogEntry = {
  version: "v1.6.16",
  date: "2026-08-19",
  title: "Refonte des toasts riches et contextuels",
  items: [
    "Nouveau style glassmorphic des toasts : fond #0C0C0E, backdrop-blur-md, bordure border-white/10, coins rounded-xl.",
    "Toasts contextuels : drapeau lors du changement de langue, logo/avatar Discord, icône Cloud pour la synchronisation, Note/Tâche, Clipboard.",
    "Ajout de l'API notify via useToast() : notify.language(), notify.discord(), notify.sync(), notify.noteCreated(), notify.taskAdded(), notify.clipboard()...",
    "Animation subtile d'entrée des icônes (Framer Motion scale/opacity).",
    "Snyk : aucune vulnérabilité sur sonner (v1.7.4) ; react-hot-toast n'est pas utilisé.",
    "Version : v1.6.16.",
  ],
};

const v176_en: ChangelogEntry = {
  version: "v1.6.16",
  date: "2026-08-19",
  title: "Rich contextual toasts redesign",
  items: [
    "New glassmorphic toast style: #0C0C0E background, backdrop-blur-md, border-white/10, rounded-xl.",
    "Contextual toasts: flag on language change, Discord logo/avatar, Cloud icon for sync, Note/Task icons, Clipboard.",
    "Added notify API via useToast(): notify.language(), notify.discord(), notify.sync(), notify.noteCreated(), notify.taskAdded(), notify.clipboard()...",
    "Subtle icon entry animation (Framer Motion scale/opacity).",
    "Snyk: no vulnerabilities on sonner (v1.7.4); react-hot-toast is not used.",
    "Version: v1.6.16.",
  ],
};

const v176_es: ChangelogEntry = {
  version: "v1.6.16",
  date: "2026-08-19",
  title: "Rediseño de toasts ricos y contextuales",
  items: [
    "Nuevo estilo glassmórfico de toasts: fondo #0C0C0E, backdrop-blur-md, borde border-white/10, esquinas rounded-xl.",
    "Toasts contextuales: bandera al cambiar idioma, logo/avatar de Discord, icono Nube para sincronización, iconos Nota/Tarea, Portapapeles.",
    "Nueva API notify vía useToast(): notify.language(), notify.discord(), notify.sync(), notify.noteCreated(), notify.taskAdded(), notify.clipboard()...",
    "Animación sutil de entrada de iconos (Framer Motion scale/opacity).",
    "Snyk: sin vulnerabilidades en sonner (v1.7.4); react-hot-toast no se utiliza.",
    "Versión: v1.6.16.",
  ],
};

const v176_de: ChangelogEntry = {
  version: "v1.6.16",
  date: "2026-08-19",
  title: "Redesign der reichhaltigen kontextuellen Toasts",
  items: [
    "Neuer glassmorpher Toast-Stil: Hintergrund #0C0C0E, backdrop-blur-md, Rahmen border-white/10, Ecken rounded-xl.",
    "Kontextuelle Toasts: Flagge beim Sprachwechsel, Discord-Logo/Avatar, Cloud-Symbol für Synchronisation, Notiz/Aufgabe, Zwischenablage.",
    "Neue notify-API über useToast(): notify.language(), notify.discord(), notify.sync(), notify.noteCreated(), notify.taskAdded(), notify.clipboard()...",
    "Subtile Icon-Einblendanimation (Framer Motion scale/opacity).",
    "Snyk: keine Schwachstellen bei sonner (v1.7.4); react-hot-toast wird nicht verwendet.",
    "Version: v1.6.16.",
  ],
};

const v175_fr: ChangelogEntry = {
  version: "v1.6.15",
  date: "2026-08-19",
  title: "Corrections images : Gaming, Discord Lanyard et Spotify",
  items: [
    "Nouveau composant ClientImage qui pré-charge les images en mémoire avant de les afficher pour éviter les icônes brisées.",
    "Déduplication des URLs NMSR dans GamingCard et essai des sources NMSR, Crafatar, mc-heads en parallèle.",
    "SocialDiscordCard tente l'avatar Discord personnalisé puis l'avatar par défaut avant de revenir aux initiales.",
    "SafeImage et ImageFallback utilisent ClientImage pour les covers Spotify et les avatars des Live widgets.",
    "Version affichée en bas à droite : v1.6.15.",
  ],
};

const v175_en: ChangelogEntry = {
  version: "v1.6.15",
  date: "2026-08-19",
  title: "Image fixes: Gaming, Discord Lanyard and Spotify",
  items: [
    "New ClientImage component that pre-loads images in memory before rendering to avoid broken icons.",
    "Deduplicated NMSR URLs in GamingCard and tries NMSR, Crafatar, mc-heads sources in parallel.",
    "SocialDiscordCard tries the custom Discord avatar, then the default avatar, then initials.",
    "SafeImage and ImageFallback now use ClientImage for Spotify covers and Live widget avatars.",
    "Version badge bottom-right: v1.6.15.",
  ],
};

const v175_es: ChangelogEntry = {
  version: "v1.6.15",
  date: "2026-08-19",
  title: "Correcciones de imágenes: Gaming, Discord Lanyard y Spotify",
  items: [
    "Nuevo componente ClientImage que precarga las imágenes en memoria antes de mostrarlas para evitar iconos rotos.",
    "Desduplicación de URLs NMSR en GamingCard y prueba de fuentes NMSR, Crafatar, mc-heads en paralelo.",
    "SocialDiscordCard intenta el avatar personalizado de Discord, luego el avatar por defecto y luego las iniciales.",
    "SafeImage e ImageFallback usan ClientImage para las portadas de Spotify y los avatares de los Live widgets.",
    "Versión mostrada abajo a la derecha: v1.6.15.",
  ],
};

const v175_de: ChangelogEntry = {
  version: "v1.6.15",
  date: "2026-08-19",
  title: "Bildkorrekturen: Gaming, Discord Lanyard und Spotify",
  items: [
    "Neue ClientImage-Komponente, die Bilder im Speicher vorlädt, bevor sie angezeigt werden, um kaputte Symbole zu vermeiden.",
    "Deduplizierung der NMSR-URLs in GamingCard und parallele Prüfung der Quellen NMSR, Crafatar, mc-heads.",
    "SocialDiscordCard probiert den benutzerdefinierten Discord-Avatar, dann den Standard-Avatar und dann Initialen.",
    "SafeImage und ImageFallback verwenden ClientImage für Spotify-Cover und Avatare in Live-Widgets.",
    "Version unten rechts: v1.6.15.",
  ],
};

const v172_fr: ChangelogEntry = {
  version: "v1.6.12",
  date: "2026-08-19",
  title: "Minecraft : affichage du skin via NMSR avec fallback",
  items: [
    "Remplacement des rendus Crafatar (souvent 521/522) par l'API publique NMSR (NickAc's Minecraft Skin Renderer).",
    "Le worker retourne désormais des URLs NMSR pour l'avatar, le body et le skin.",
    "La carte Gaming utilise une chaîne de fallback : profile (NMSR), NMSR par UUID, Crafatar, puis mc-heads.net.",
    "Version affichée en bas à droite : v1.6.12.",
  ],
};

const v172_en: ChangelogEntry = {
  version: "v1.6.12",
  date: "2026-08-19",
  title: "Minecraft: skin display via NMSR with fallback",
  items: [
    "Replaced Crafatar renders (often 521/522) with the public NMSR API (NickAc's Minecraft Skin Renderer).",
    "The worker now returns NMSR URLs for avatar, body and skin.",
    "The Gaming card uses a fallback chain: profile (NMSR), NMSR by UUID, Crafatar, then mc-heads.net.",
    "Version badge bottom-right: v1.6.12.",
  ],
};

const v172_es: ChangelogEntry = {
  version: "v1.6.12",
  date: "2026-08-19",
  title: "Minecraft: visualización del skin mediante NMSR con fallback",
  items: [
    "Reemplazo de los renders de Crafatar (a menudo 521/522) por la API pública NMSR (NickAc's Minecraft Skin Renderer).",
    "El worker ahora devuelve URLs NMSR para el avatar, el cuerpo y el skin.",
    "La tarjeta Gaming utiliza una cadena de fallback: perfil (NMSR), NMSR por UUID, Crafatar y luego mc-heads.net.",
    "Versión mostrada abajo a la derecha: v1.6.12.",
  ],
};

const v172_de: ChangelogEntry = {
  version: "v1.6.12",
  date: "2026-08-19",
  title: "Minecraft: Skin-Anzeige über NMSR mit Fallback",
  items: [
    "Crafatar-Renders (häufig 521/522) durch die öffentliche NMSR-API (NickAc's Minecraft Skin Renderer) ersetzt.",
    "Der Worker gibt nun NMSR-URLs für Avatar, Body und Skin zurück.",
    "Die Gaming-Karte verwendet eine Fallback-Kette: Profil (NMSR), NMSR per UUID, Crafatar, dann mc-heads.net.",
    "Version unten rechts: v1.6.12.",
  ],
};

const v171_fr: ChangelogEntry = {
  version: "v1.6.11",
  date: "2026-08-19",
  title: "Corrections Discord : badge d'erreur et avatar par défaut",
  items: [
    "Suppression du badge 'Erreur' sur la carte Discord quand les données Lanyard sont présentes et valides.",
    "Le badge reflète désormais le vrai statut Discord (En ligne, Absent, Occupé, Hors ligne).",
    "Correction de l'avatar par défaut Discord : la fonction utilisait un bit-shift sur un ID de 18 chiffres, ce qui pouvait donner un index négatif/invalide ; elle utilise maintenant les 6 derniers chiffres modulo 6.",
    "Cela devrait afficher l'avatar Discord personnalisé si Lanyard le fournit, ou un avatar par défaut Discord valide sinon.",
    "Version affichée en bas à droite : v1.6.11.",
  ],
};

const v171_en: ChangelogEntry = {
  version: "v1.6.11",
  date: "2026-08-19",
  title: "Discord fixes: error badge and default avatar",
  items: [
    "Removed the 'Error' badge on the Discord card when Lanyard data is present and valid.",
    "Badge now reflects the real Discord status (Online, Idle, Busy, Offline).",
    "Fixed the default Discord avatar function: it used a bit-shift on an 18-digit ID, which could produce a negative/invalid index; it now uses the last 6 digits modulo 6.",
    "This should display the custom Discord avatar if Lanyard provides it, or a valid default Discord avatar otherwise.",
    "Version badge bottom-right: v1.6.11.",
  ],
};

const v171_es: ChangelogEntry = {
  version: "v1.6.11",
  date: "2026-08-19",
  title: "Correcciones de Discord: insignia de error y avatar por defecto",
  items: [
    "Eliminada la insignia 'Error' en la tarjeta de Discord cuando los datos de Lanyard están presentes y son válidos.",
    "La insignia ahora refleja el estado real de Discord (En línea, Ausente, Ocupado, Desconectado).",
    "Corregida la función de avatar por defecto de Discord: usaba un desplazamiento de bits en un ID de 18 dígitos, lo que podía dar un índice negativo/inválido; ahora usa los últimos 6 dígitos módulo 6.",
    "Esto debería mostrar el avatar personalizado de Discord si Lanyard lo proporciona, o un avatar por defecto válido en caso contrario.",
    "Versión mostrada abajo a la derecha: v1.6.11.",
  ],
};

const v171_de: ChangelogEntry = {
  version: "v1.6.11",
  date: "2026-08-19",
  title: "Discord-Fixes: Fehler-Badge und Standard-Avatar",
  items: [
    "'Fehler'-Badge auf der Discord-Karte entfernt, wenn Lanyard-Daten vorhanden und gültig sind.",
    "Badge zeigt jetzt den echten Discord-Status an (Online, Abwesend, Beschäftigt, Offline).",
    "Standard-Discord-Avatar korrigiert: Die Funktion verwendete einen Bit-Shift auf eine 18-stellige ID, was einen negativen/ungültigen Index ergeben konnte; sie verwendet nun die letzten 6 Ziffern modulo 6.",
    "Dadurch sollte der benutzerdefinierte Discord-Avatar angezeigt werden, wenn Lanyard ihn liefert, andernfalls ein gültiger Standard-Avatar.",
    "Version unten rechts: v1.6.11.",
  ],
};

const v170_fr: ChangelogEntry = {
  version: "v1.6.10",
  date: "2026-08-19",
  title: "Suppression de la bordure gauche du panneau de sidebar",
  items: [
    "Retrait du trait vertical à gauche de la sidebar flottante (`border-l-0` sur le panel de `Sidebar.tsx`).",
    "Le panneau de navigation garde ses bordures haut, droite et bas, mais n'affiche plus de trait à l'extrême gauche.",
    "Version affichée en bas à droite : v1.6.10.",
  ],
};

const v170_en: ChangelogEntry = {
  version: "v1.6.10",
  date: "2026-08-19",
  title: "Removed the left border of the sidebar panel",
  items: [
    "Removed the vertical line on the left side of the floating sidebar panel (`border-l-0` on the `Sidebar.tsx` panel).",
    "The navigation panel keeps its top, right and bottom borders, but no longer shows a line on the far left.",
    "Version badge bottom-right: v1.6.10.",
  ],
};

const v170_es: ChangelogEntry = {
  version: "v1.6.10",
  date: "2026-08-19",
  title: "Eliminación del borde izquierdo del panel de la barra lateral",
  items: [
    "Se eliminó la línea vertical en el lado izquierdo del panel flotante de la barra lateral (`border-l-0` en el panel de `Sidebar.tsx`).",
    "El panel de navegación conserva sus bordes superior, derecho e inferior, pero ya no muestra una línea en el extremo izquierdo.",
    "Versión mostrada abajo a la derecha: v1.6.10.",
  ],
};

const v170_de: ChangelogEntry = {
  version: "v1.6.10",
  date: "2026-08-19",
  title: "Entfernung der linken Rahmenlinie des Sidebar-Panels",
  items: [
    "Vertikale Linie auf der linken Seite des schwebenden Sidebar-Panels entfernt (`border-l-0` auf dem Panel in `Sidebar.tsx`).",
    "Das Navigationspanel behält seine oberen, rechten und unteren Rahmen, zeigt aber links keine Linie mehr.",
    "Version unten rechts: v1.6.10.",
  ],
};

const v169_fr: ChangelogEntry = {
  version: "v1.6.9",
  date: "2026-08-19",
  title: "Uniformisation des arrière-plans de pages sur #0A0A0A",
  items: [
    "Arrière-plan du conteneur de pages (`Shell.tsx`) passé à `#0A0A0A`, identique à la sidebar.",
    "Fond du wrapper principal (`AnimatedSidebarProvider`) et de la zone `<main>` en `#0A0A0A`.",
    "Page de login (`app/login/page.tsx`) : fond root passé à `#0A0A0A` pour correspondre au reste de l'OS.",
    "Seuls les arrière-plans de pages sont modifiés ; les fonds de cartes, panneaux et éditeurs restent inchangés.",
    "Version affichée en bas à droite : v1.6.9.",
  ],
};

const v169_en: ChangelogEntry = {
  version: "v1.6.9",
  date: "2026-08-19",
  title: "Page backgrounds unified to #0A0A0A",
  items: [
    "Page container background (`Shell.tsx`) set to `#0A0A0A`, matching the sidebar.",
    "Main wrapper (`AnimatedSidebarProvider`) and `<main>` area backgrounds set to `#0A0A0A`.",
    "Login page (`app/login/page.tsx`) root background set to `#0A0A0A` to match the rest of the OS.",
    "Only page backgrounds were changed; card, panel, and editor backgrounds remain unchanged.",
    "Version badge bottom-right: v1.6.9.",
  ],
};

const v169_es: ChangelogEntry = {
  version: "v1.6.9",
  date: "2026-08-19",
  title: "Fondos de páginas unificados a #0A0A0A",
  items: [
    "Fondo del contenedor de página (`Shell.tsx`) a `#0A0A0A`, igual que la barra lateral.",
    "Fondos del wrapper principal (`AnimatedSidebarProvider`) y del área `<main>` a `#0A0A0A`.",
    "Fondo raíz de la página de inicio de sesión (`app/login/page.tsx`) a `#0A0A0A` para coincidir con el resto del SO.",
    "Solo se modificaron los fondos de página; los fondos de tarjetas, paneles y editores permanecen iguales.",
    "Versión mostrada abajo a la derecha: v1.6.9.",
  ],
};

const v169_de: ChangelogEntry = {
  version: "v1.6.9",
  date: "2026-08-19",
  title: "Seitenhintergründe auf #0A0A0A vereinheitlicht",
  items: [
    "Seitencontainer-Hintergrund (`Shell.tsx`) auf `#0A0A0A` gesetzt, passend zur Seitenleiste.",
    "Hintergründe des Hauptwrappers (`AnimatedSidebarProvider`) und des `<main>`-Bereichs auf `#0A0A0A` gesetzt.",
    "Login-Seite (`app/login/page.tsx`) Wurzelhintergrund auf `#0A0A0A` gesetzt, um zum Rest des OS zu passen.",
    "Nur Seitenhintergründe wurden geändert; Karten-, Panel- und Editorhintergründe bleiben unverändert.",
    "Version unten rechts: v1.6.9.",
  ],
};

const v168_fr: ChangelogEntry = {
  version: "v1.6.8",
  date: "2026-08-19",
  title: "Bandeau inférieur glassmorphic pour la barre de statut",
  items: [
    "Ajout d'un bandeau subtil en bas d'écran pour la barre de statut (`bg-zinc-950/50`, `border-white/[0.04]`, `backdrop-blur-[var(--panel-blur)]`).",
    "Le bandeau reste non bloquant (`pointer-events-none`) ; seuls les contrôles interactifs le sont.",
    "Les informations du bas (Normal, Sync, En ligne, version, Opérationnel) restent lisibles sans flotter directement sur le fond d'écran.",
    "Version affichée en bas à droite : v1.6.8.",
  ],
};

const v168_en: ChangelogEntry = {
  version: "v1.6.8",
  date: "2026-08-19",
  title: "Glassmorphic bottom strip for the status bar",
  items: [
    "Added a subtle bottom strip for the status bar (`bg-zinc-950/50`, `border-white/[0.04]`, `backdrop-blur-[var(--panel-blur)]`).",
    "The strip remains non-blocking (`pointer-events-none`); only interactive controls are interactive.",
    "Bottom info (Normal, Sync, Online, version, Operational) stays readable without floating directly on the wallpaper.",
    "Version badge bottom-right: v1.6.8.",
  ],
};

const v168_es: ChangelogEntry = {
  version: "v1.6.8",
  date: "2026-08-19",
  title: "Banda inferior glassmorphic para la barra de estado",
  items: [
    "Añadida una banda sutil en la parte inferior para la barra de estado (`bg-zinc-950/50`, `border-white/[0.04]`, `backdrop-blur-[var(--panel-blur)]`).",
    "La banda sigue sin bloquear (`pointer-events-none`); solo los controles interactivos son interactivos.",
    "La información inferior (Normal, Sync, En línea, versión, Operacional) sigue legible sin flotar directamente sobre el fondo.",
    "Versión mostrada abajo a la derecha: v1.6.8.",
  ],
};

const v168_de: ChangelogEntry = {
  version: "v1.6.8",
  date: "2026-08-19",
  title: "Glassmorphic unterer Streifen für die Statusleiste",
  items: [
    "Subtiler unterer Streifen für die Statusleiste hinzugefügt (`bg-zinc-950/50`, `border-white/[0.04]`, `backdrop-blur-[var(--panel-blur)]`).",
    "Der Streifen bleibt nicht blockierend (`pointer-events-none`); nur interaktive Steuerelemente sind interaktiv.",
    "Die unteren Informationen (Normal, Sync, Online, Version, Operational) bleiben lesbar, ohne direkt auf dem Hintergrund zu schweben.",
    "Version unten rechts: v1.6.8.",
  ],
};

const v167_fr: ChangelogEntry = {
  version: "v1.6.7",
  date: "2026-08-19",
  title: "Refonte focus Obsidian/Glassmorphic et hauteur pleine pour éditeurs",
  items: [
    "Fin du contour vert vif sur les champs de texte : focus state en blanc/verre (`border-white/20`, `ring-white/15`, glow subtil).",
    "Généralisation à l'ensemble des inputs, textareas, rich editor, selects et modales (Notes, Tâches, Brain, Mail, Settings, Login, etc.).",
    "RichTextEditor : conteneur `h-full` avec barre d'outils et éditeur `flex-1`, scroll interne, hauteur maximale.",
    "Textarea composant : `h-full min-h-0` et focus glassmorphic.",
    "Input composant : focus state Obsidian + halo blanc.",
    "ComposeMailModal : flex column `h-[min(640px,90vh)]`, textarea `h-full flex-1`.",
    "Nouveau test Playwright `editor-focus-and-layout.spec.ts` validant le focus et la hauteur sur Notes, Tâches et Brain.",
    "Version affichée en bas à droite : v1.6.7.",
  ],
};

const v167_en: ChangelogEntry = {
  version: "v1.6.7",
  date: "2026-08-19",
  title: "Obsidian/Glassmorphic focus and full-height editor refactor",
  items: [
    "Removed the harsh green focus outline on text fields: new Obsidian/glass focus state (`border-white/20`, `ring-white/15`, subtle glow).",
    "Generalized across all inputs, textareas, rich editors, selects and modals (Notes, Tasks, Brain, Mail, Settings, Login, etc.).",
    "RichTextEditor: `h-full` container with toolbar and `flex-1` editor, internal scroll, max height.",
    "Textarea component: `h-full min-h-0` and glassmorphic focus.",
    "Input component: Obsidian focus + white halo.",
    "ComposeMailModal: flex column `h-[min(640px,90vh)]`, textarea `h-full flex-1`.",
    "New Playwright test `editor-focus-and-layout.spec.ts` validating focus and height on Notes, Tasks and Brain.",
    "Version badge bottom-right: v1.6.7.",
  ],
};

const v167_es: ChangelogEntry = {
  version: "v1.6.7",
  date: "2026-08-19",
  title: "Refactor de foco Obsidian/Glassmorphic y altura completa para editores",
  items: [
    "Eliminación del contorno verde brillante en campos de texto: nuevo estado de foco blanco/vidrio (`border-white/20`, `ring-white/15`, glow sutil).",
    "Generalizado a todos los inputs, textareas, rich editors, selects y modales (Notes, Tasks, Brain, Mail, Settings, Login, etc.).",
    "RichTextEditor: contenedor `h-full` con barra de herramientas y editor `flex-1`, scroll interno, altura máxima.",
    "Componente Textarea: `h-full min-h-0` y foco glassmorphic.",
    "Componente Input: foco Obsidian + halo blanco.",
    "ComposeMailModal: flex column `h-[min(640px,90vh)]`, textarea `h-full flex-1`.",
    "Nuevo test Playwright `editor-focus-and-layout.spec.ts` validando el foco y la altura en Notes, Tasks y Brain.",
    "Versión mostrada abajo a la derecha: v1.6.7.",
  ],
};

const v167_de: ChangelogEntry = {
  version: "v1.6.7",
  date: "2026-08-19",
  title: "Obsidian/Glassmorphic-Fokus und Vollhöhe für Editoren",
  items: [
    "Ende des harten grünen Fokusrahmens für Textfelder: neuer Obsidian/Glass-Fokus (`border-white/20`, `ring-white/15`, subtiler Glow).",
    "Generalisierung auf alle Inputs, Textareas, Rich Editors, Selects und Modals (Notes, Tasks, Brain, Mail, Settings, Login, etc.).",
    "RichTextEditor: `h-full`-Container mit Toolbar und `flex-1`-Editor, internes Scrollen, maximale Höhe.",
    "Textarea-Komponente: `h-full min-h-0` und glassmorphic-Fokus.",
    "Input-Komponente: Obsidian-Fokus + weißer Halo.",
    "ComposeMailModal: Flex-Column `h-[min(640px,90vh)]`, Textarea `h-full flex-1`.",
    "Neuer Playwright-Test `editor-focus-and-layout.spec.ts` validiert Fokus und Höhe auf Notes, Tasks und Brain.",
    "Version unten rechts: v1.6.7.",
  ],
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

const v178_fr: ChangelogEntry = {
  version: "v1.7.1",
  date: "2026-08-19",
  title: "Corrections : sidebar flottante, synchronisation et erreurs console",
  items: [
    "Sidebar : suppression de l'arrière-plan gris derrière le panneau flottant et extension du panneau jusqu'en bas de l'écran.",
    "Synchronisation : appels Supabase Realtime sécurisés avec try/catch et .catch() pour éviter les rejets non gérés.",
    "Supabase : correction des requêtes `pomodoro_sessions` et `desktop_layout` selon le schéma existant (pas de colonne `data`, `.maybeSingle()` pour éviter les 406).",
    "Focus-timer : reconstruction du `FocusSession` depuis les colonnes cloud.",
    `Desktop layout : passage à .maybeSingle() et gestion silencieuse des erreurs Realtime.`,
    "Sync store : évite les mises à jour inutiles si un statut source est inchangé.",
    `isMissingSchemaError renforcé (PGRST204, PGRST116, 42P01, messages "schema cache" / "Could not find").`,
    "Next.js : configuration conditionnelle `output: 'export'` pour la production, mode normal pour `next dev`.",
    "Brain chat : route API marquée `runtime: 'nodejs'` pour éviter l'avertissement Edge Runtime.",
    "Dock : fond légèrement plus sombre (80%) et remonté (bottom-12).",
    "TopBar : reflow responsive pour éviter les chevauchements en mode réduit, pillules centrales masquées sous `xl`, troncature du nom d'utilisateur.",
    "Sidebar : footer (profil + badges) remonté de `mb-3` pour éviter d'être collé au bas de l'écran.",
    "Sidebar : suppression des bordures et fonds du footer (profil, badge sync, boutons) pour fusionner avec la couleur du panneau.",
    "ClientImage : correction du rendu des images déjà en cache (avatars Discord, couvertures Spotify, etc.).",
    "Supabase : migration ajoutant `discord` aux providers autorisés de `user_oauth_tokens`.",
    "Worker : le connecteur Discord OAuth continue le stockage du profil même si le token ne peut pas être persisté.",
    "Sidebar : suppression de la bordure du panneau flottant pour unifier la couleur avec le reste de la barre.",
    "Supabase : migration ajoutant `discord` aux `kind` autorisés de `ethone_user_data`.",
    "Worker : augmentation de `maxBytes` (64 Ko) pour les appels Supabase liés au profil Discord.",
    "SocialDiscordCard : affiche le profil Discord OAuth quand le mode OAuth2 est actif.",
    "DiscordConfig : bascule automatiquement sur le mode OAuth2 après connexion et redirige vers /settings?discord=connected.",
    "useDiscordAvatar : suppression de la condition `discordMode === oauth2` pour afficher l'avatar Discord partout.",
    "UserProfileDropdown : ajout de `referrerPolicy='no-referrer'` sur les avatars Discord.",
    "Worker : `getDiscordProfile` tolère une erreur du token OAuth et lit le profil depuis `ethone_user_data`.",
    "Version : v1.7.1.",
  ],
};

const v178_en: ChangelogEntry = {
  version: "v1.7.1",
  date: "2026-08-19",
  title: "Fixes: floating sidebar, sync, and console errors",
  items: [
    "Sidebar: removed the dark gray background strip behind the floating panel and extended the panel to the bottom of the screen.",
    "Sync: secured Supabase Realtime calls with try/catch and .catch() to avoid unhandled rejections.",
    "Supabase: fixed `pomodoro_sessions` and `desktop_layout` queries to match the existing schema (no `data` column, `.maybeSingle()` to prevent 406s).",
    "Focus timer: rebuild `FocusSession` from cloud columns.",
    "Desktop layout: switched to `.maybeSingle()` and silently handled Realtime errors.",
    "Sync store: skip redundant updates when a source status is unchanged.",
    "Strengthened `isMissingSchemaError` (PGRST204, PGRST116, 42P01, 'schema cache' / 'Could not find' messages).",
    "Next.js: conditional `output: 'export'` config for production, normal mode for `next dev`.",
    "Brain chat: API route set to `runtime: 'nodejs'` to avoid the Edge Runtime warning.",
    "Dock: slightly darker background (80%) and raised higher (bottom-12).",
    "TopBar: responsive reflow to avoid overlaps in reduced width, center pills hidden below `xl`, username truncated.",
    "Sidebar: footer (profile + badges) raised with `mb-3` to avoid sticking to the bottom of the screen.",
    "Sidebar: removed borders and backgrounds from footer (profile, sync badge, buttons) to merge with sidebar panel color.",
    "ClientImage: fixed rendering of cached images (Discord avatars, Spotify covers, etc.).",
    "Supabase: migration adding `discord` to the allowed providers in `user_oauth_tokens`.",
    "Worker: Discord OAuth connector now continues storing the profile even if the token cannot be persisted.",
    "Sidebar: removed the floating panel border to unify the color with the rest of the bar.",
    "Supabase: migration adding `discord` to the allowed `kind` values in `ethone_user_data`.",
    "Worker: increased `maxBytes` (64 KB) for Supabase calls related to Discord profile storage.",
    "SocialDiscordCard: display the Discord OAuth profile when OAuth2 mode is active.",
    "DiscordConfig: automatically switch to OAuth2 mode after connecting and redirect to /settings?discord=connected.",
    "useDiscordAvatar: removed `discordMode === oauth2` condition so the Discord avatar shows everywhere.",
    "UserProfileDropdown: added `referrerPolicy='no-referrer'` to Discord avatars.",
    "Worker: `getDiscordProfile` falls back to reading the profile from `ethone_user_data` if token lookup fails.",
    "Version: v1.7.1.",
  ],
};

const v178_es: ChangelogEntry = {
  version: "v1.7.1",
  date: "2026-08-19",
  title: "Correcciones: barra lateral flotante, sincronización y errores de consola",
  items: [
    "Barra lateral: eliminación del fondo gris oscuro detrás del panel flotante y extensión del panel hasta la parte inferior de la pantalla.",
    "Sincronización: llamadas a Supabase Realtime protegidas con try/catch y .catch() para evitar rechazos no controlados.",
    "Supabase: corrección de las consultas `pomodoro_sessions` y `desktop_layout` según el esquema existente (sin columna `data`, `.maybeSingle()` para evitar 406).",
    "Temporizador: reconstrucción del `FocusSession` desde las columnas en la nube.",
    "Layout del escritorio: uso de `.maybeSingle()` y manejo silencioso de errores de Realtime.",
    "Sync store: omite actualizaciones redundantes cuando el estado de una fuente no cambia.",
    "`isMissingSchemaError` reforzado (PGRST204, PGRST116, 42P01, mensajes \"schema cache\" / \"Could not find\").",
    "Next.js: configuración condicional `output: 'export'` para producción, modo normal para `next dev`.",
    "Brain chat: ruta de API con `runtime: 'nodejs'` para evitar la advertencia de Edge Runtime.",
    "Dock: fondo ligeramente más oscuro (80%) y elevado (bottom-12).",
    "TopBar: redistribución responsive para evitar superposiciones en modo reducido, píldoras centrales ocultas por debajo de `xl`, nombre de usuario truncado.",
    "Sidebar: pie (perfil + insignias) elevado con `mb-3` para evitar quedar pegado a la parte inferior de la pantalla.",
    "Sidebar: eliminados los bordes y fondos del pie (perfil, insignia de sincronización, botones) para fusionar con el color del panel de la barra lateral.",
    "ClientImage: corrección del renderizado de imágenes en caché (avatares de Discord, portadas de Spotify, etc.).",
    "Supabase: migración que añade `discord` a los proveedores permitidos en `user_oauth_tokens`.",
    "Worker: el conector OAuth de Discord continúa almacenando el perfil aunque no se pueda persistir el token.",
    "Sidebar: eliminado el borde del panel flotante para unificar el color con el resto de la barra.",
    "Supabase: migración que añade `discord` a los valores `kind` permitidos en `ethone_user_data`.",
    "Worker: aumento de `maxBytes` (64 KB) para las llamadas Supabase relacionadas con el perfil de Discord.",
    "SocialDiscordCard: muestra el perfil de Discord OAuth cuando el modo OAuth2 está activo.",
    "DiscordConfig: cambia automáticamente al modo OAuth2 tras conectar y redirige a /settings?discord=connected.",
    "useDiscordAvatar: eliminada la condición `discordMode === oauth2` para mostrar el avatar de Discord en todas partes.",
    "UserProfileDropdown: añadido `referrerPolicy='no-referrer'` a los avatares de Discord.",
    "Worker: `getDiscordProfile` lee el perfil desde `ethone_user_data` si la búsqueda del token falla.",
    "Versión: v1.7.1.",
  ],
};

const v178_de: ChangelogEntry = {
  version: "v1.7.1",
  date: "2026-08-19",
  title: "Korrekturen: schwebende Seitenleiste, Synchronisation und Konsolenfehler",
  items: [
    "Seitenleiste: dunkler grauer Hintergundstreifen hinter dem schwebenden Panel entfernt und Panel bis zum unteren Bildschirmrand erweitert.",
    "Synchronisation: Supabase-Realtime-Aufrufe mit try/catch und .catch() abgesichert, um unbehandelte Zurückweisungen zu vermeiden.",
    "Supabase: Korrektur der `pomodoro_sessions`- und `desktop_layout`-Abfragen an das bestehende Schema (keine `data`-Spalte, `.maybeSingle()` zur Vermeidung von 406).",
    "Fokus-Timer: `FocusSession` aus Cloud-Spalten rekonstruiert.",
    "Desktop-Layout: Umstellung auf `.maybeSingle()` und stilles Abfangen von Realtime-Fehlern.",
    "Sync-Store: überspringt redundante Aktualisierungen, wenn ein Quellstatus unverändert ist.",
    "`isMissingSchemaError` verstärkt (PGRST204, PGRST116, 42P01, \"schema cache\" / \"Could not find\"-Meldungen).",
    "Next.js: bedingte `output: 'export'`-Konfiguration für Produktion, normaler Modus für `next dev`.",
    "Brain Chat: API-Route auf `runtime: 'nodejs'` gesetzt, um die Edge-Runtime-Warnung zu vermeiden.",
    "Dock: leicht dunklerer Hintergrund (80%) und höher positioniert (bottom-12).",
    "TopBar: responsive Reflow zur Vermeidung von Überlappungen im reduzierten Modus, zentrale Pills unter `xl` ausgeblendet, Benutzername gekürzt.",
    "Sidebar: Footer (Profil + Badges) mit `mb-3` angehoben, damit er nicht am unteren Bildschirmrand klebt.",
    "Sidebar: Rahmen und Hintergründe im Footer (Profil, Sync-Badge, Buttons) entfernt, um mit der Farbe des Seitenleisten-Panels zu verschmelzen.",
    "ClientImage: korrigierte Darstellung von zwischengespeicherten Bildern (Discord-Avatare, Spotify-Cover usw.).",
    "Supabase: Migration, die `discord` zu den erlaubten Providern in `user_oauth_tokens` hinzufügt.",
    "Worker: Discord-OAuth-Connector speichert das Profil auch dann, wenn das Token nicht persistiert werden kann.",
    "Sidebar: Rahmen des schwebenden Panels entfernt, um die Farbe mit dem Rest der Leiste zu vereinen.",
    "Supabase: Migration, die `discord` zu den erlaubten `kind`-Werten in `ethone_user_data` hinzufügt.",
    "Worker: `maxBytes` (64 KB) für Supabase-Aufrufe im Zusammenhang mit der Discord-Profilspeicherung erhöht.",
    "SocialDiscordCard: zeigt das Discord-OAuth-Profil an, wenn der OAuth2-Modus aktiv ist.",
    "DiscordConfig: automatischer Wechsel in den OAuth2-Modus nach dem Verbinden und Weiterleitung an /settings?discord=connected.",
    "useDiscordAvatar: Bedingung `discordMode === oauth2` entfernt, damit der Discord-Avatar überall angezeigt wird.",
    "UserProfileDropdown: `referrerPolicy='no-referrer'` für Discord-Avatare hinzugefügt.",
    "Worker: `getDiscordProfile` liest das Profil aus `ethone_user_data`, wenn die Token-Suche fehlschlägt.",
    "Version: v1.7.1.",
  ],
};

const v179_fr: ChangelogEntry = {
  version: "v1.7.2",
  date: "2026-08-19",
  title: "Icônes des comptes et serveurs Discord",
  items: [
    "Ajout de la collection d'icônes `@iconify-json/simple-icons`.",
    "DiscordConfig : icônes de marque devant chaque compte lié.",
    "DiscordConfig : avatar du profil et icônes des serveurs via ClientImage.",
    "UserProfileDropdown et Sidebar : utilisation de `publicProfile.avatar_url` au lieu de l'avatar Discord pour le profil utilisateur.",
    "Suppression du hook `useDiscordAvatar`.",
    "Ajout du composant `Popover` beui avec animation morphing et goo.",
    "NotificationCenter, LanguageSwitcher : ouverture au clic via `Popover`.",
    "UserProfileDropdown : ouverture au hover via `Popover`.",
    "Correction du chargement des covers Spotify dans `ClientImage` via `img.decode()`.",
    "Mise à jour de la version en v1.7.2.",
  ],
};

const v179_en: ChangelogEntry = {
  version: "v1.7.2",
  date: "2026-08-19",
  title: "Discord account and server icons",
  items: [
    "Added the `@iconify-json/simple-icons` icon collection.",
    "DiscordConfig: brand icons in front of each linked account.",
    "DiscordConfig: profile avatar and server icons use ClientImage.",
    "UserProfileDropdown and Sidebar: use `publicProfile.avatar_url` instead of the Discord avatar for the user profile.",
    "Removed the `useDiscordAvatar` hook.",
    "Added beui `Popover` component with morphing and goo animation.",
    "NotificationCenter, LanguageSwitcher: click-to-open via `Popover`.",
    "UserProfileDropdown: hover-to-open via `Popover`.",
    "Fixed Spotify cover loading in `ClientImage` using `img.decode()`.",
    "Updated version to v1.7.2.",
  ],
};

const v179_es: ChangelogEntry = {
  version: "v1.7.2",
  date: "2026-08-19",
  title: "Iconos de cuentas y servidores de Discord",
  items: [
    "Añadida la colección de iconos `@iconify-json/simple-icons`.",
    "DiscordConfig: iconos de marca delante de cada cuenta vinculada.",
    "DiscordConfig: avatar del perfil e iconos de servidores con ClientImage.",
    "UserProfileDropdown y Sidebar: uso de `publicProfile.avatar_url` en lugar del avatar de Discord para el perfil de usuario.",
    "Eliminado el hook `useDiscordAvatar`.",
    "Añadido componente `Popover` beui con animación de morphing y goo.",
    "NotificationCenter, LanguageSwitcher: apertura con clic mediante `Popover`.",
    "UserProfileDropdown: apertura con hover mediante `Popover`.",
    "Corrección de carga de carátulas Spotify en `ClientImage` con `img.decode()`.",
    "Versión actualizada a v1.7.2.",
  ],
};

const v179_de: ChangelogEntry = {
  version: "v1.7.2",
  date: "2026-08-19",
  title: "Discord-Konto- und Server-Symbole",
  items: [
    "Sammlung `@iconify-json/simple-icons` hinzugefügt.",
    "DiscordConfig: Markensymbole vor jedem verknüpften Konto.",
    "DiscordConfig: Profilavatar und Serversymbole über ClientImage.",
    "UserProfileDropdown und Sidebar: `publicProfile.avatar_url` statt Discord-Avatar für das Benutzerprofil verwenden.",
    "Hook `useDiscordAvatar` entfernt.",
    "beui `Popover`-Komponente mit Morphing- und Goo-Animation hinzugefügt.",
    "NotificationCenter, LanguageSwitcher: Klick-Öffnung über `Popover`.",
    "UserProfileDropdown: Hover-Öffnung über `Popover`.",
    "Spotify-Cover-Laden in `ClientImage` mit `img.decode()` korrigiert.",
    "Version auf v1.7.2 aktualisiert.",
  ],
};

const v180_fr: ChangelogEntry = {
  version: "v1.7.3",
  date: "2026-08-19",
  title: "Bouton météo, ambiances sonores et onglets Settings",
  items: [
    "TopBar : le bouton météo ouvre maintenant une popover rapide avec la localisation, la température, l'humidité, le vent et les prévisions.",
    "Dock : ajout d'un bouton météo `DockWeatherFlyout` qui affiche la température et ouvre le détail au clic.",
    "WeatherDetailPopover : support du placement `top-end` pour s'ouvrir au-dessus du Dock.",
    "Correction des ambiances sonores dans le Control Center : les boutons Aucune / Pluie / Bruit rose / Drone / Blanc activent maintenant le son et réveillent le AudioContext.",
    "Onglets des paramètres : indicateur animé mesuré manuellement, panel d'onglets plus compact (w-fit), plus d'espace entre les panneaux.",
    "Mise à jour de la version en v1.7.3.",
  ],
};

const v180_en: ChangelogEntry = {
  version: "v1.7.3",
  date: "2026-08-19",
  title: "Quick weather, sound ambiences and Settings tabs",
  items: [
    "TopBar: the weather button now opens a quick popover with location, temperature, humidity, wind and forecast.",
    "Dock: added `DockWeatherFlyout` weather button showing temperature and opening details on click.",
    "WeatherDetailPopover: added `top-end` placement support to open above the Dock.",
    "Fixed sound ambience buttons in the Control Center: None / Rain / Pink / Drone / White now activate audio and resume the AudioContext.",
    "Settings tabs: manually measured animated indicator, more compact tab panel (w-fit), more spacing between panels.",
    "Updated version to v1.7.3.",
  ],
};

const v180_es: ChangelogEntry = {
  version: "v1.7.3",
  date: "2026-08-19",
  title: "Botón de clima, ambientes sonoros y pestañas Settings",
  items: [
    "TopBar: el botón del clima ahora abre un popover rápido con ubicación, temperatura, humedad, viento y pronóstico.",
    "Dock: añadido `DockWeatherFlyout` que muestra la temperatura y abre los detalles al hacer clic.",
    "WeatherDetailPopover: soporte de posicionamiento `top-end` para abrirse encima del Dock.",
    "Corrección de los ambientes sonoros en el Centro de Control: Ninguno / Lluvia / Rosa / Drone / Blanco ahora activan el sonido y reanudan el AudioContext.",
    "Pestañas de ajustes: indicador animado medido manualmente, panel de pestañas más compacto (w-fit), más espacio entre paneles.",
    "Versión actualizada a v1.7.3.",
  ],
};

const v180_de: ChangelogEntry = {
  version: "v1.7.3",
  date: "2026-08-19",
  title: "Schneller Wetter-Button, Sound-Ambiences und Settings-Tabs",
  items: [
    "TopBar: der Wetter-Button öffnet nun ein schnelles Popover mit Ort, Temperatur, Luftfeuchtigkeit, Wind und Vorhersage.",
    "Dock: `DockWeatherFlyout` hinzugefügt, der die Temperatur anzeigt und Details beim Klick öffnet.",
    "WeatherDetailPopover: Unterstützung für Platzierung `top-end`, um sich über dem Dock zu öffnen.",
    "Korrektur der Sound-Ambiences im Control Center: Keine / Regen / Rosa / Drone / Weiß aktivieren jetzt Audio und setzen den AudioContext fort.",
    "Settings-Tabs: manuell gemessener animierter Indikator, kompakteres Tab-Panel (w-fit), mehr Abstand zwischen den Paneelen.",
    "Version auf v1.7.3 aktualisiert.",
  ],
};

const v181_fr: ChangelogEntry = {
  version: "v1.7.4",
  date: "2026-08-20",
  title: "Menus déroulants du calendrier",
  items: [
    "Sélecteur partagé `Select` corrigé : le listbox se positionne correctement sous le bouton et s'affiche sans décalage.",
    "Calendrier : le menu des mois expose les 12 mois, le menu des années va de 1900 à 2100.",
    "Formulaire de facture : ajout de 7 devises (€, $, £, ¥, CHF, CA$, A$).",
    "Catégories de facturation traduites (Logement, Services publics, Transport, Assurance, Abonnements, Alimentation, Éducation, Impôts, Autre).",
    "Page Fichiers : l'onglet 'dossiers' active maintenant le filtre, le tri propose 4 options (nom, taille, date, type).",
    "Mise à jour de la version en v1.7.4.",
  ],
};

const v181_en: ChangelogEntry = {
  version: "v1.7.4",
  date: "2026-08-20",
  title: "Calendar dropdowns",
  items: [
    "Fixed shared `Select` component: listbox now positions correctly below the trigger and renders without offset.",
    "Calendar: month dropdown lists all 12 months; year dropdown spans 1900-2100.",
    "Bill form: added 7 currencies (€, $, £, ¥, CHF, CA$, A$).",
    "Translated bill categories (Housing, Utilities, Transport, Insurance, Subscriptions, Food, Education, Taxes, Other).",
    "Files page: the 'folders' tab now activates the filter, and the sort dropdown offers 4 options (name, size, date, type).",
    "Updated version to v1.7.4.",
  ],
};

const v181_es: ChangelogEntry = {
  version: "v1.7.4",
  date: "2026-08-20",
  title: "Desplegables del calendario",
  items: [
    "Corregido el componente `Select` compartido: el listbox se posiciona correctamente bajo el botón y se muestra sin desfase.",
    "Calendario: el menú de meses muestra los 12 meses; el de años abarca 1900-2100.",
    "Formulario de factura: añadidas 7 divisas (€, $, £, ¥, CHF, CA$, A$).",
    "Categorías de facturación traducidas (Vivienda, Servicios, Transporte, Seguro, Suscripciones, Alimentación, Educación, Impuestos, Otro).",
    "Página de archivos: la pestaña 'carpetas' activa el filtro y el menú de ordenación ofrece 4 opciones (nombre, tamaño, fecha, tipo).",
    "Versión actualizada a v1.7.4.",
  ],
};

const v181_de: ChangelogEntry = {
  version: "v1.7.4",
  date: "2026-08-20",
  title: "Kalender-Dropdowns",
  items: [
    "Gemeinsame `Select`-Komponente korrigiert: Listbox positioniert sich korrekt unter dem Trigger und wird ohne Versatz gerendert.",
    "Kalender: Monatmenü zeigt alle 12 Monate; Jahresmenü reicht von 1900 bis 2100.",
    "Rechnungsformular: 7 Währungen hinzugefügt (€, $, £, ¥, CHF, CA$, A$).",
    "Rechnungskategorien übersetzt (Wohnen, Nebenkosten, Transport, Versicherung, Abonnements, Lebensmittel, Bildung, Steuern, Sonstiges).",
    "Dateienseite: der Reiter 'Ordner' aktiviert jetzt den Filter, und die Sortierung bietet 4 Optionen (Name, Größe, Datum, Typ).",
    "Version auf v1.7.4 aktualisiert.",
  ],
};

const v182_fr: ChangelogEntry = {
  version: "v1.7.5",
  date: "2026-08-20",
  title: "Profil mail et onboarding",
  items: [
    "Bouton Profil mail dans la barre latérale : affiche l'adresse principale, permet de copier l'email, de modifier le nom affiché et de changer l'adresse principale.",
    "Onboarding mail forcé : demande à chaque utilisateur (nouveau ou existant) de confirmer/créer son adresse @ethone.dev et son nom affiché.",
    "API worker : PATCH /api/mail/alias pour mettre à jour le display_name et le statut is_primary d'un alias.",
    "Le nom affiché de l'alias est conservé comme expéditeur par défaut lors de la rédaction d'un message.",
    "Mise à jour de la version en v1.7.5.",
  ],
};

const v182_en: ChangelogEntry = {
  version: "v1.7.5",
  date: "2026-08-20",
  title: "Mail profile and onboarding",
  items: [
    "Mail Profile button in the sidebar: shows the primary address, lets you copy the email, edit the display name and set another alias as primary.",
    "Forced mail onboarding: asks every user (new or existing) to confirm/create their @ethone.dev address and display name.",
    "Worker API: PATCH /api/mail/alias to update an alias's display_name and is_primary status.",
    "The alias display name is kept as the default sender when composing a message.",
    "Updated version to v1.7.5.",
  ],
};

const v182_es: ChangelogEntry = {
  version: "v1.7.5",
  date: "2026-08-20",
  title: "Perfil de correo y onboarding",
  items: [
    "Botón de perfil de correo en la barra lateral: muestra la dirección principal, permite copiar el email, editar el nombre mostrado y definir otra dirección como principal.",
    "Onboarding de correo forzado: pide a cada usuario (nuevo o existente) que confirme/creé su dirección @ethone.dev y su nombre mostrado.",
    "API worker: PATCH /api/mail/alias para actualizar el display_name y el estado is_primary de un alias.",
    "El nombre mostrado del alias se conserva como remitente por defecto al redactar un mensaje.",
    "Versión actualizada a v1.7.5.",
  ],
};

const v182_de: ChangelogEntry = {
  version: "v1.7.5",
  date: "2026-08-20",
  title: "Mail-Profil und Onboarding",
  items: [
    "Mail-Profil-Schaltfläche in der Seitenleiste: zeigt die Hauptadresse, ermöglicht das Kopieren der E-Mail, Bearbeiten des Anzeigenamens und Festlegen einer anderen Adresse als Hauptadresse.",
    "Erzwungenes Mail-Onboarding: fordert jeden Benutzer (neu oder bestehend) auf, seine @ethone.dev-Adresse und seinen Anzeigenamen zu bestätigen/erstellen.",
    "Worker-API: PATCH /api/mail/alias zum Aktualisieren von display_name und is_primary-Status eines Alias.",
    "Der Anzeigename des Alias wird beim Verfassen einer Nachricht als Standardabsender beibehalten.",
    "Version auf v1.7.5 aktualisiert.",
  ],
};

const v183_fr: ChangelogEntry = {
  version: "v1.7.6",
  date: "2026-08-20",
  title: "Dynamic Island multi-activités",
  items: [
    "La Dynamic Island affiche désormais plusieurs activités simultanées (Spotify, Pomodoro, Brain) au lieu d'en écraser une seule.",
    "Vue compacte type Apple : partie principale à gauche (heure + Spotify par défaut) et bulles rondes à droite pour les autres activités.",
    "Cliquer sur une petite bulle pomodoro ouvre directement la vue Focus dans l'îlot élargi.",
    "Vue élargie avec bandeau d'onglets : heure courante, bulles de navigation et label de l'activité sélectionnée.",
    "Passage d'une activité à l'autre sans perdre le lecteur ni l'horloge.",
    "Version mise à jour en v1.7.6.",
  ],
};

const v183_en: ChangelogEntry = {
  version: "v1.7.6",
  date: "2026-08-20",
  title: "Multi-activity Dynamic Island",
  items: [
    "The Dynamic Island now shows multiple live activities at once (Spotify, Pomodoro, Brain) instead of replacing one with another.",
    "Apple-style compact view: leading area on the left (clock + Spotify by default) and round bubbles on the right for the other activities.",
    "Clicking the small Pomodoro bubble expands the island straight into the Focus view.",
    "Expanded view has a tab bar: current time, navigation bubbles and the selected activity label.",
    "Switch between activities without losing the music player or the clock.",
    "Updated version to v1.7.6.",
  ],
};

const v183_es: ChangelogEntry = {
  version: "v1.7.6",
  date: "2026-08-20",
  title: "Dynamic Island multiactividad",
  items: [
    "La Dynamic Island muestra ahora varias actividades a la vez (Spotify, Pomodoro, Brain) en lugar de sustituir una por otra.",
    "Vista compacta tipo Apple: zona principal a la izquierda (reloj + Spotify por defecto) y burbujas redondas a la derecha para las demás actividades.",
    "Al hacer clic en la burbuja de Pomodoro se abre directamente la vista Focus en la isla expandida.",
    "Vista expandida con barra de pestañas: hora actual, burbujas de navegación y etiqueta de la actividad seleccionada.",
    "Cambiar de actividad sin perder el reproductor ni el reloj.",
    "Versión actualizada a v1.7.6.",
  ],
};

const v183_de: ChangelogEntry = {
  version: "v1.7.6",
  date: "2026-08-20",
  title: "Dynamic Island mit mehreren Aktivitäten",
  items: [
    "Die Dynamic Island zeigt jetzt mehrere Live-Aktivitäten gleichzeitig (Spotify, Pomodoro, Brain) anstatt eine durch die andere zu ersetzen.",
    "Kompakte Ansicht im Apple-Stil: linker Bereich (Uhr + Spotify standardmäßig) und runde Blasen rechts für die anderen Aktivitäten.",
    "Klick auf die kleine Pomodoro-Blase öffnet direkt die Focus-Ansicht in der erweiterten Insel.",
    "Erweiterte Ansicht mit Tab-Leiste: aktuelle Uhrzeit, Navigationsblasen und Beschriftung der ausgewählten Aktivität.",
    "Zwischen Aktivitäten wechseln, ohne den Musikplayer oder die Uhr zu verlieren.",
    "Version auf v1.7.6 aktualisiert.",
  ],
};

const v184_fr: ChangelogEntry = {
  version: "v1.7.7",
  date: "2026-08-20",
  title: "Correction de la zone de clic de la Dynamic Island",
  items: [
    "Suppression du double gestionnaire `onClick`/`onMouseEnter`/`onMouseLeave` entre le conteneur et le shell de la Dynamic Island.",
    "Le conteneur de la Dynamic Island est maintenant `pointer-events-none` pour ne plus bloquer les boutons situés en dessous.",
    "L'îlot reste `pointer-events-auto` et les contrôles (lecture, pause, skip, focus) répondent correctement.",
    "Version mise à jour en v1.7.7.",
  ],
};

const v184_en: ChangelogEntry = {
  version: "v1.7.7",
  date: "2026-08-20",
  title: "Fix Dynamic Island click area",
  items: [
    "Removed duplicate `onClick`/`onMouseEnter`/`onMouseLeave` handlers between the Dynamic Island container and the island shell.",
    "The Dynamic Island container is now `pointer-events-none` so it no longer blocks buttons underneath.",
    "The island itself stays `pointer-events-auto` and controls (play, pause, skip, focus) respond correctly.",
    "Updated version to v1.7.7.",
  ],
};

const v184_es: ChangelogEntry = {
  version: "v1.7.7",
  date: "2026-08-20",
  title: "Corrección de la zona de clic de la Dynamic Island",
  items: [
    "Se eliminaron los manejadores `onClick`/`onMouseEnter`/`onMouseLeave` duplicados entre el contenedor y el shell de la Dynamic Island.",
    "El contenedor de la Dynamic Island ahora es `pointer-events-none` para no bloquear los botones de debajo.",
    "La isla sigue siendo `pointer-events-auto` y los controles (reproducir, pausar, saltar, focus) responden correctamente.",
    "Versión actualizada a v1.7.7.",
  ],
};

const v184_de: ChangelogEntry = {
  version: "v1.7.7",
  date: "2026-08-20",
  title: "Korrektur des Dynamic Island Klickbereichs",
  items: [
    "Doppelte `onClick`/`onMouseEnter`/`onMouseLeave`-Handler zwischen Container und Dynamic Island-Shell entfernt.",
    "Der Dynamic Island-Container ist jetzt `pointer-events-none`, damit er die darunterliegenden Schaltflächen nicht mehr blockiert.",
    "Die Insel selbst bleibt `pointer-events-auto` und die Steuerungen (Wiedergabe, Pause, überspringen, Fokus) reagieren korrekt.",
    "Version auf v1.7.7 aktualisiert.",
  ],
};

const v185_fr: ChangelogEntry = {
  version: "v1.7.8",
  date: "2026-08-20",
  title: "Retour des icônes de serveurs Discord",
  items: [
    "`ClientImage` : `img.decode()` ne bascule plus immédiatement sur le fallback en cas d'échec ; on s'appuie sur `onLoad`/`onError`.",
    "`components/DiscordConfig.tsx` : reconstruction locale de l'URL d'icône serveur si `iconUrl` est manquant.",
    "`worker/src/services/discord-oauth-client.js` : `safeGuild` génère l'URL avec `.gif` pour les icônes animées (`a_`) et `.png` pour les autres.",
    "Version mise à jour en v1.7.8.",
  ],
};

const v185_en: ChangelogEntry = {
  version: "v1.7.8",
  date: "2026-08-20",
  title: "Discord server icons restored",
  items: [
    "`ClientImage`: `img.decode()` no longer immediately falls back on failure; it now relies on `onLoad`/`onError`.",
    "`components/DiscordConfig.tsx`: local rebuild of the server icon URL if `iconUrl` is missing.",
    "`worker/src/services/discord-oauth-client.js`: `safeGuild` now builds the URL with `.gif` for animated icons (`a_`) and `.png` for the rest.",
    "Updated version to v1.7.8.",
  ],
};

const v185_es: ChangelogEntry = {
  version: "v1.7.8",
  date: "2026-08-20",
  title: "Iconos de servidores de Discord restaurados",
  items: [
    "`ClientImage`: `img.decode()` ya no falla inmediatamente al fallback; ahora se apoya en `onLoad`/`onError`.",
    "`components/DiscordConfig.tsx`: reconstrucción local de la URL del icono del servidor si falta `iconUrl`.",
    "`worker/src/services/discord-oauth-client.js`: `safeGuild` genera la URL con `.gif` para iconos animados (`a_`) y `.png` para el resto.",
    "Versión actualizada a v1.7.8.",
  ],
};

const v185_de: ChangelogEntry = {
  version: "v1.7.8",
  date: "2026-08-20",
  title: "Discord-Server-Icons wiederhergestellt",
  items: [
    "`ClientImage`: `img.decode()` wechselt nicht mehr sofort zum Fallback; es verlässt sich jetzt auf `onLoad`/`onError`.",
    "`components/DiscordConfig.tsx`: lokaler Neuaufbau der Server-Icon-URL, wenn `iconUrl` fehlt.",
    "`worker/src/services/discord-oauth-client.js`: `safeGuild` erstellt die URL jetzt mit `.gif` für animierte Icons (`a_`) und `.png` für den Rest.",
    "Version auf v1.7.8 aktualisiert.",
  ],
};

const v186_fr: ChangelogEntry = {
  version: "v1.7.9",
  date: "2026-08-20",
  title: "Images cross-origin fiables et cape Minecraft",
  items: [
    "Ré-écriture de `ClientImage` : gestion robuste du cache, `img.decode()` sans faux négatifs, fallback multi-sources avec annulation des timers.",
    "La pp Discord, les pochettes Spotify/Last.fm et les images de services tiers se chargent correctement.",
    "`components/GamingCard.tsx` : affichage du skin (render corporel) et de la cape en overlay.",
    "Version mise à jour en v1.7.9.",
  ],
};

const v186_en: ChangelogEntry = {
  version: "v1.7.9",
  date: "2026-08-20",
  title: "Reliable cross-origin images and Minecraft cape",
  items: [
    "Rewrote `ClientImage`: robust cache handling, `img.decode()` without false negatives, multi-source fallback with timer cancellation.",
    "Discord avatars, Spotify/Last.fm covers and third-party images now load correctly.",
    "`components/GamingCard.tsx`: display skin (body render) and cape overlay.",
    "Updated version to v1.7.9.",
  ],
};

const v186_es: ChangelogEntry = {
  version: "v1.7.9",
  date: "2026-08-20",
  title: "Imágenes cross-origin fiables y capa de Minecraft",
  items: [
    "Reescritura de `ClientImage`: manejo robusto de caché, `img.decode()` sin falsos negativos, fallback multi-fuente con cancelación de temporizadores.",
    "Los avatares de Discord, las portadas de Spotify/Last.fm y las imágenes de terceros se cargan correctamente.",
    "`components/GamingCard.tsx`: muestra la skin (render del cuerpo) y la capa superpuesta.",
    "Versión actualizada a v1.7.9.",
  ],
};

const v186_de: ChangelogEntry = {
  version: "v1.7.9",
  date: "2026-08-20",
  title: "Zuverlässige Cross-Origin-Bilder und Minecraft-Cape",
  items: [
    "`ClientImage` neu geschrieben: robustes Caching, `img.decode()` ohne Falschnegative, Multi-Source-Fallback mit Timer-Abbruch.",
    "Discord-Avatare, Spotify/Last.fm-Cover und Bilder von Drittanbietern laden jetzt korrekt.",
    "`components/GamingCard.tsx`: Anzeige des Skins (Body-Render) und des Capes als Overlay.",
    "Version auf v1.7.9 aktualisiert.",
  ],
};

const v187_fr: ChangelogEntry = {
  version: "v1.7.10",
  date: "2026-08-20",
  title: "Loader boot avec animation percent",
  items: [
    "`components/motion/Loader.tsx` : ajout du variant `percent` (pourcentage + barre de progrès).",
    "`components/Loading.tsx` : l'écran de boot/redirection utilise `variant=\"percent\"` au lieu de `comet`.",
    "Version mise à jour en v1.7.10.",
  ],
};

const v187_en: ChangelogEntry = {
  version: "v1.7.10",
  date: "2026-08-20",
  title: "Boot loader with percent animation",
  items: [
    "`components/motion/Loader.tsx`: added the `percent` variant (percentage + progress bar).",
    "`components/Loading.tsx`: the boot/redirect screen now uses `variant=\"percent\"` instead of `comet`.",
    "Updated version to v1.7.10.",
  ],
};

const v187_es: ChangelogEntry = {
  version: "v1.7.10",
  date: "2026-08-20",
  title: "Cargador de inicio con animación percent",
  items: [
    "`components/motion/Loader.tsx`: se agregó la variante `percent` (porcentaje + barra de progreso).",
    "`components/Loading.tsx`: la pantalla de inicio/redirección ahora usa `variant=\"percent\"` en lugar de `comet`.",
    "Versión actualizada a v1.7.10.",
  ],
};

const v187_de: ChangelogEntry = {
  version: "v1.7.10",
  date: "2026-08-20",
  title: "Boot-Loader mit Prozent-Animation",
  items: [
    "`components/motion/Loader.tsx`: `percent`-Variante hinzugefügt (Prozent + Fortschrittsbalken).",
    "`components/Loading.tsx`: Der Start-/Umleitungsbildschirm verwendet jetzt `variant=\"percent\"` statt `comet`.",
    "Version auf v1.7.10 aktualisiert.",
  ],
};

const v205_fr: ChangelogEntry = {
  version: "v1.7.28",
  date: "2026-08-20",
  title: "Refonte moderne complète de la page Paramètres",
  items: [
    "Nouveau layout split-view avec navigation latérale par catégories (Profil, Apparence, Audio, Workspace, Langue, Notifications, Sécurité, Avancé).",
    "Barre supérieure avec recherche instantanée, réinitialisation, enregistrement et pastille d'état de synchronisation.",
    "Redesign des sections `SettingsSection` et `SettingField` : panneaux en verre, contrôles inline, interrupteurs, curseurs et sélecteurs segmentés.",
    "Carte profil enrichie : bannière, avatar haute résolution, badge de session, ID public masquable, actions rapides.",
    "Sélecteur de langue avec drapeaux vectoriels et sélecteur de pack sonore avec bouton de pré-écoute.",
    "Panneau de maintenance avancé : vider le cache, resynchroniser le Worker, mémoire et latence.",
    "Intégration de `IntegrationsSettings` dans la catégorie Workspace.",
    "Version v1.7.28 / cache PWA v396.",
  ],
};

const v205_en: ChangelogEntry = {
  version: "v1.7.28",
  date: "2026-08-20",
  title: "Complete modern overhaul of the Settings page",
  items: [
    "New split-view layout with left sidebar category navigation (Profile, Appearance, Audio, Workspace, Language, Notifications, Security, Advanced).",
    "Top bar with instant search, reset, save and sync status pill.",
    "Redesigned `SettingsSection` and `SettingField` : glass panels, inline controls, toggles, sliders and segmented selectors.",
    "Enriched profile card : banner, high-res avatar, session badge, maskable public ID, quick actions.",
    "Language selector with vector flags and sound pack selector with preview button.",
    "Advanced maintenance panel : clear cache, resync Worker, memory and latency display.",
    "Integration of `IntegrationsSettings` into the Workspace category.",
    "Version v1.7.28 / PWA cache v396.",
  ],
};

const v205_es: ChangelogEntry = {
  version: "v1.7.28",
  date: "2026-08-20",
  title: "Rediseño moderno completo de la página de Ajustes",
  items: [
    "Nuevo layout split-view con navegación lateral por categorías (Perfil, Apariencia, Audio, Espacio de trabajo, Idioma, Notificaciones, Seguridad, Avanzado).",
    "Barra superior con búsqueda instantánea, restablecer, guardar e indicador de estado de sincronización.",
    "Rediseño de `SettingsSection` y `SettingField` : paneles de cristal, controles inline, toggles, sliders y selectores segmentados.",
    "Tarjeta de perfil enriquecida : banner, avatar de alta resolución, badge de sesión, ID público ocultable, acciones rápidas.",
    "Selector de idioma con banderas vectoriales y selector de pack de sonido con botón de pre-escucha.",
    "Panel de mantenimiento avanzado : vaciar caché, resincronizar Worker, memoria y latencia.",
    "Integración de `IntegrationsSettings` en la categoría Espacio de trabajo.",
    "Versión v1.7.28 / caché PWA v396.",
  ],
};

const v205_de: ChangelogEntry = {
  version: "v1.7.28",
  date: "2026-08-20",
  title: "Kompletter moderner Redesign der Einstellungsseite",
  items: [
    "Neues Split-View-Layout mit linker Seitenleiste nach Kategorien (Profil, Erscheinungsbild, Audio, Arbeitsbereich, Sprache, Benachrichtigungen, Sicherheit, Erweitert).",
    "Obere Leiste mit Sofortsuche, Zurücksetzen, Speichern und Sync-Status-Badge.",
    "Redesign von `SettingsSection` und `SettingField` : Glaspanels, Inline-Steuerelemente, Toggles, Slider und segmentierte Selektoren.",
    "Erweiterte Profilkarte : Banner, hochauflösender Avatar, Sitzungs-Badge, maskierbare öffentliche ID, Schnellaktionen.",
    "Sprachauswahl mit Vektorflaggen und Soundpack-Auswahl mit Vorschau-Button.",
    "Erweitertes Wartungspanel : Cache leeren, Worker neu synchronisieren, Speicher und Latenz anzeigen.",
    "Integration von `IntegrationsSettings` in die Kategorie Arbeitsbereich.",
    "Version v1.7.28 / PWA-Cache v396.",
  ],
};

const v204_fr: ChangelogEntry = {
  version: "v1.7.27",
  date: "2026-08-20",
  title: "Augmentation de l'espacement entre les onglets et le contenu des settings",
  items: [
    "`components/settings/SettingsLayout.tsx` : ajout de `mb-4` sur la barre d'onglets pour plus d'espace avec le panneau de contenu en dessous.",
    "Version v1.7.27 / cache PWA v395.",
  ],
};

const v204_en: ChangelogEntry = {
  version: "v1.7.27",
  date: "2026-08-20",
  title: "More spacing between settings tabs and content panel",
  items: [
    "`components/settings/SettingsLayout.tsx`: added `mb-4` to the tab bar for more space with the content panel below.",
    "Version v1.7.27 / PWA cache v395.",
  ],
};

const v204_es: ChangelogEntry = {
  version: "v1.7.27",
  date: "2026-08-20",
  title: "Más espacio entre las pestañas y el panel de contenido de ajustes",
  items: [
    "`components/settings/SettingsLayout.tsx`: se añadió `mb-4` a la barra de pestañas para más espacio con el panel de contenido inferior.",
    "Versión v1.7.27 / caché PWA v395.",
  ],
};

const v204_de: ChangelogEntry = {
  version: "v1.7.27",
  date: "2026-08-20",
  title: "Mehr Abstand zwischen Settings-Tabs und Inhaltsbereich",
  items: [
    "`components/settings/SettingsLayout.tsx`: `mb-4` zur Tab-Leiste hinzugefügt, um mehr Abstand zum darunter liegenden Inhaltspanel zu schaffen.",
    "Version v1.7.27 / PWA-Cache v395.",
  ],
};

const v203_fr: ChangelogEntry = {
  version: "v1.7.26",
  date: "2026-08-20",
  title: "Sidebar floating sans bordure grise et glassmorphique",
  items: [
    "`components/motion/animated-sidebar.tsx` : le panneau `floating` utilise `bg-[var(--panel-bg)]`, `border-[var(--panel-border)]` et `backdrop-blur` au lieu de `border-border` gris fixe.",
    "`components/Sidebar.tsx` : fond transparent sur le conteneur externe, `panelClassName` sans `border-0` ni `bg-background`, avec `backdrop-blur-[var(--panel-blur)]`.",
    "Correction de la barre grise visible sur le côté de la sidebar quelle que soit le thème.",
    "Version v1.7.26 / cache PWA v394.",
  ],
};

const v203_en: ChangelogEntry = {
  version: "v1.7.26",
  date: "2026-08-20",
  title: "Floating sidebar without gray border and glassmorphic",
  items: [
    "`components/motion/animated-sidebar.tsx`: the `floating` panel now uses `bg-[var(--panel-bg)]`, `border-[var(--panel-border)]` and `backdrop-blur` instead of a fixed gray `border-border`.",
    "`components/Sidebar.tsx`: transparent background on the outer container, `panelClassName` without `border-0` or `bg-background`, with `backdrop-blur-[var(--panel-blur)]`.",
    "Fixed the gray bar visible on the side of the sidebar regardless of theme.",
    "Version v1.7.26 / PWA cache v394.",
  ],
};

const v203_es: ChangelogEntry = {
  version: "v1.7.26",
  date: "2026-08-20",
  title: "Sidebar flotante sin borde gris y con efecto glassmórfico",
  items: [
    "`components/motion/animated-sidebar.tsx`: el panel `floating` ahora usa `bg-[var(--panel-bg)]`, `border-[var(--panel-border)]` y `backdrop-blur` en lugar del `border-border` gris fijo.",
    "`components/Sidebar.tsx`: fondo transparente en el contenedor externo, `panelClassName` sin `border-0` ni `bg-background`, con `backdrop-blur-[var(--panel-blur)]`.",
    "Corrección de la barra gris visible al lado de la sidebar independientemente del tema.",
    "Versión v1.7.26 / caché PWA v394.",
  ],
};

const v203_de: ChangelogEntry = {
  version: "v1.7.26",
  date: "2026-08-20",
  title: "Schwebende Sidebar ohne grauen Rand und glassmorph",
  items: [
    "`components/motion/animated-sidebar.tsx`: das `floating`-Panel verwendet jetzt `bg-[var(--panel-bg)]`, `border-[var(--panel-border)]` und `backdrop-blur` statt einem festen grauen `border-border`.",
    "`components/Sidebar.tsx`: transparenter Hintergrund am äußeren Container, `panelClassName` ohne `border-0` oder `bg-background`, mit `backdrop-blur-[var(--panel-blur)]`.",
    "Behebung der grauen Leiste an der Seite der Sidebar, unabhängig vom Theme.",
    "Version v1.7.26 / PWA-Cache v394.",
  ],
};

const v202_fr: ChangelogEntry = {
  version: "v1.7.25",
  date: "2026-08-20",
  title: "Pochette Spotify plus fiable et rafraîchissement à chaque changement de titre",
  items: [
    "`lib/hooks/useNowPlaying.ts` : polling adaptatif — toutes les 5 secondes pendant la lecture, intervalle normal à l'arrêt.",
    "Rafraîchissement forcé de `useNowPlaying` au retour sur l'onglet (`visibilitychange`) et au focus de la fenêtre.",
    "Le Worker Spotify renvoie désormais un tableau `covers` avec toutes les tailles d'album pour essayer plusieurs URLs.",
    "`SafeImage` supporte un tableau `candidates` pour tenter plusieurs sources d'image.",
    "`DynamicIslandContainer` utilise les candidats `cover`, `artworkUrl` et `covers` pour la pochette compacte et étendue.",
    "Version v1.7.25 / cache PWA v393.",
  ],
};

const v202_en: ChangelogEntry = {
  version: "v1.7.25",
  date: "2026-08-20",
  title: "More reliable Spotify artwork and refresh on every track change",
  items: [
    "`lib/hooks/useNowPlaying.ts`: adaptive polling — every 5 seconds while playing, normal interval when stopped.",
    "Forced `useNowPlaying` refetch on tab return (`visibilitychange`) and window focus.",
    "Spotify Worker now returns a `covers` array with all album sizes so multiple URLs can be tried.",
    "`SafeImage` supports a `candidates` array to try several image sources.",
    "`DynamicIslandContainer` uses `cover`, `artworkUrl` and `covers` candidates for both compact and expanded artwork.",
    "Version v1.7.25 / PWA cache v393.",
  ],
};

const v202_es: ChangelogEntry = {
  version: "v1.7.25",
  date: "2026-08-20",
  title: "Portada de Spotify más fiable y refresco en cada cambio de canción",
  items: [
    "`lib/hooks/useNowPlaying.ts`: polling adaptativo — cada 5 segundos durante la reproducción, intervalo normal cuando está detenido.",
    "Refresco forzado de `useNowPlaying` al volver a la pestaña (`visibilitychange`) y al enfocar la ventana.",
    "El Worker de Spotify ahora devuelve un array `covers` con todos los tamaños de álbum para probar varias URLs.",
    "`SafeImage` admite un array `candidates` para probar varias fuentes de imagen.",
    "`DynamicIslandContainer` usa los candidatos `cover`, `artworkUrl` y `covers` para la portada compacta y expandida.",
    "Versión v1.7.25 / caché PWA v393.",
  ],
};

const v202_de: ChangelogEntry = {
  version: "v1.7.25",
  date: "2026-08-20",
  title: "Zuverlässigeres Spotify-Cover und Aktualisierung bei jedem Titewechsel",
  items: [
    "`lib/hooks/useNowPlaying.ts`: adaptives Polling — alle 5 Sekunden während der Wiedergabe, normales Intervall bei Stopp.",
    "Erzwungenes `useNowPlaying`-Refetch beim Zurückkehren zum Tab (`visibilitychange`) und beim Fokussieren des Fensters.",
    "Der Spotify-Worker gibt jetzt ein `covers`-Array mit allen Albumgrößen zurück, damit mehrere URLs ausprobiert werden können.",
    "`SafeImage` unterstützt ein `candidates`-Array zum Ausprobieren mehrerer Bildquellen.",
    "`DynamicIslandContainer` verwendet die Kandidaten `cover`, `artworkUrl` und `covers` für kompakte und erweiterte Cover.",
    "Version v1.7.25 / PWA-Cache v393.",
  ],
};

const v201_fr: ChangelogEntry = {
  version: "v1.7.24",
  date: "2026-08-20",
  title: "Réorganisation des onglets Settings et contenus filtrés par onglet",
  items: [
    "`components/settings/SettingsContent.tsx` : filtrage des sections par onglet (`general`, `sécurité`, `compte`) pour éviter les pages vides.",
    "Sections toujours affichées par défaut ; le masquage par recherche est conservé uniquement quand une requête est saisie.",
    "Onglet `Facturation` supprimé des settings car ETHONE est gratuit.",
    "Version mise à jour en v1.7.24.",
  ],
};

const v201_en: ChangelogEntry = {
  version: "v1.7.24",
  date: "2026-08-20",
  title: "Settings tabs reorganized and tab-scoped content",
  items: [
    "`components/settings/SettingsContent.tsx`: sections are now filtered by active tab (`general`, `security`, `account`) to fix empty pages.",
    "Sections are always visible by default; search-based hiding only applies when a query is entered.",
    "Removed the `Billing` settings tab since ETHONE is free.",
    "Updated version to v1.7.24.",
  ],
};

const v201_es: ChangelogEntry = {
  version: "v1.7.24",
  date: "2026-08-20",
  title: "Pestañas de ajustes reorganizadas y contenido filtrado por pestaña",
  items: [
    "`components/settings/SettingsContent.tsx`: las secciones ahora se filtran según la pestaña activa (`general`, `seguridad`, `cuenta`) para evitar páginas vacías.",
    "Las secciones se muestran siempre por defecto; el ocultamiento por búsqueda solo se aplica cuando hay una consulta.",
    "Se eliminó la pestaña `Facturación` porque ETHONE es gratuito.",
    "Versión actualizada a v1.7.24.",
  ],
};

const v201_de: ChangelogEntry = {
  version: "v1.7.24",
  date: "2026-08-20",
  title: "Einstellungs-Tabs neu organisiert und tab-spezifischer Inhalt",
  items: [
    "`components/settings/SettingsContent.tsx`: Abschnitte werden jetzt nach aktivem Tab gefiltert (`general`, `security`, `account`), um leere Seiten zu vermeiden.",
    "Abschnitte sind standardmäßig immer sichtbar; das Ausblenden durch Suche greift nur bei eingegebener Suchanfrage.",
    "Tab `Abrechnung` entfernt, da ETHONE kostenlos ist.",
    "Version auf v1.7.24 aktualisiert.",
  ],
};

const v200_fr: ChangelogEntry = {
  version: "v1.7.23",
  date: "2026-08-20",
  title: "Correction du découpage du point de statut sur l'avatar",
  items: [
    "`components/UserProfileDropdown.tsx` : le conteneur d'avatar et le point de statut sont maintenant imbriqués correctement pour éviter le clipping (`overflow-hidden` isolé sur l'image, point en `absolute` sur le wrapper parent).",
    "Version mise à jour en v1.7.23.",
  ],
};

const v200_en: ChangelogEntry = {
  version: "v1.7.23",
  date: "2026-08-20",
  title: "Fixed status dot clipping on avatar",
  items: [
    "`components/UserProfileDropdown.tsx`: avatar container and status dot are now correctly nested to avoid clipping (`overflow-hidden` isolated on the image, dot `absolute` on the parent wrapper).",
    "Updated version to v1.7.23.",
  ],
};

const v200_es: ChangelogEntry = {
  version: "v1.7.23",
  date: "2026-08-20",
  title: "Corrección del recorte del punto de estado en el avatar",
  items: [
    "`components/UserProfileDropdown.tsx`: el contenedor del avatar y el punto de estado ahora están anidados correctamente para evitar el recorte (`overflow-hidden` aislado en la imagen, punto `absolute` en el contenedor padre).",
    "Versión actualizada a v1.7.23.",
  ],
};

const v200_de: ChangelogEntry = {
  version: "v1.7.23",
  date: "2026-08-20",
  title: "Status-Punkt am Avatar nicht mehr abgeschnitten",
  items: [
    "`components/UserProfileDropdown.tsx`: Avatar-Container und Status-Punkt sind nun korrekt verschachtelt, um das Abschneiden zu vermeiden (`overflow-hidden` isoliert auf dem Bild, Punkt `absolute` am übergeordneten Wrapper).",
    "Version auf v1.7.23 aktualisiert.",
  ],
};

const v199_fr: ChangelogEntry = {
  version: "v1.7.22",
  date: "2026-08-20",
  title: "Le Pomodoro persiste après un refresh",
  items: [
    "`components/FocusProvider.tsx` : restauration du timer depuis `localStorage` au chargement du module.",
    "Suppression du `loadFromCloud` au montage pour éviter qu'un état cloud obsolète écrase la session en cours.",
    "Utilisation de `useSyncExternalStore` pour rester synchronisé avec `FocusTimer` sans flash.",
    "Version mise à jour en v1.7.22.",
  ],
};

const v199_en: ChangelogEntry = {
  version: "v1.7.22",
  date: "2026-08-20",
  title: "Pomodoro persists after a refresh",
  items: [
    "`components/FocusProvider.tsx`: timer is restored from `localStorage` at module load.",
    "Removed `loadFromCloud` on mount to avoid stale cloud state overwriting the current session.",
    "Switched to `useSyncExternalStore` to stay in sync with `FocusTimer` without flashing.",
    "Updated version to v1.7.22.",
  ],
};

const v199_es: ChangelogEntry = {
  version: "v1.7.22",
  date: "2026-08-20",
  title: "El Pomodoro persiste después de refrescar",
  items: [
    "`components/FocusProvider.tsx`: el timer se restaura desde `localStorage` al cargar el módulo.",
    "Se eliminó `loadFromCloud` en el montaje para evitar que un estado de nube obsoleto sobrescriba la sesión actual.",
    "Se cambió a `useSyncExternalStore` para mantener la sincronización con `FocusTimer` sin parpadeos.",
    "Versión actualizada a v1.7.22.",
  ],
};

const v199_de: ChangelogEntry = {
  version: "v1.7.22",
  date: "2026-08-20",
  title: "Pomodoro bleibt nach einem Refresh erhalten",
  items: [
    "`components/FocusProvider.tsx`: Timer wird beim Modul-Laden aus `localStorage` wiederhergestellt.",
    "`loadFromCloud` beim Mounten entfernt, damit kein veralteter Cloud-Zustand die aktuelle Sitzung überschreibt.",
    "Umstellung auf `useSyncExternalStore`, um ohne Flackern mit `FocusTimer` synchron zu bleiben.",
    "Version auf v1.7.22 aktualisiert.",
  ],
};

const v198_fr: ChangelogEntry = {
  version: "v1.7.21",
  date: "2026-08-20",
  title: "Panneaux profil et notifications plus opaques et épurés",
  items: [
    "`components/UserProfileDropdown.tsx` : fond des panneaux passe à `bg-zinc-950/95` pour plus d'opacité.",
    "Menu du profil simplifié : icônes unifiées sans glow coloré, textes plus sobres, espacement p-4.",
    "`components/NotificationCenter.tsx` : fond plus opaque et padding légèrement augmenté.",
    "Version mise à jour en v1.7.21.",
  ],
};

const v198_en: ChangelogEntry = {
  version: "v1.7.21",
  date: "2026-08-20",
  title: "Profile and notification panels more opaque and clean",
  items: [
    "`components/UserProfileDropdown.tsx`: panels now use `bg-zinc-950/95` for more opacity.",
    "Simplified profile menu: unified icons without colored glows, cleaner text, p-4 spacing.",
    "`components/NotificationCenter.tsx`: more opaque background and slightly increased padding.",
    "Updated version to v1.7.21.",
  ],
};

const v198_es: ChangelogEntry = {
  version: "v1.7.21",
  date: "2026-08-20",
  title: "Paneles de perfil y notificaciones más opacos y limpios",
  items: [
    "`components/UserProfileDropdown.tsx`: fondos de paneles `bg-zinc-950/95` para más opacidad.",
    "Menú de perfil simplificado: iconos unificados sin brillos de colores, textos más sobrios, espaciado p-4.",
    "`components/NotificationCenter.tsx`: fondo más opaco y padding ligeramente aumentado.",
    "Versión actualizada a v1.7.21.",
  ],
};

const v198_de: ChangelogEntry = {
  version: "v1.7.21",
  date: "2026-08-20",
  title: "Profil- und Benachrichtigungs-Panels opaker und aufgeräumt",
  items: [
    "`components/UserProfileDropdown.tsx`: Panel-Hintergrund auf `bg-zinc-950/95` für mehr Deckkraft.",
    "Vereinfachtes Profil-Menü: vereinheitlichte Icons ohne farbige Glows, dezenter Text, p-4 Abstand.",
    "`components/NotificationCenter.tsx`: opakerer Hintergrund und leicht erhöhtes Padding.",
    "Version auf v1.7.21 aktualisiert.",
  ],
};

const v197_fr: ChangelogEntry = {
  version: "v1.7.20",
  date: "2026-08-20",
  title: "Changelog plus aéré et textes plus lisibles",
  items: [
    "`app/changelog/page.tsx` : ajout d'un espacement vertical autour de la liste de changelog.",
    "`components/ChangelogList.tsx` : textes des items en `font-medium` et plus grand, titres en gras, anciennes entrées moins estompées.",
    "Version mise à jour en v1.7.20.",
  ],
};

const v197_en: ChangelogEntry = {
  version: "v1.7.20",
  date: "2026-08-20",
  title: "More airy changelog and more readable text",
  items: [
    "`app/changelog/page.tsx`: added vertical padding around the changelog list.",
    "`components/ChangelogList.tsx`: item text is now `font-medium` and larger, titles are bold, older entries less faded.",
    "Updated version to v1.7.20.",
  ],
};

const v197_es: ChangelogEntry = {
  version: "v1.7.20",
  date: "2026-08-20",
  title: "Changelog más espacioso y texto más legible",
  items: [
    "`app/changelog/page.tsx`: añadido relleno vertical alrededor de la lista de changelog.",
    "`components/ChangelogList.tsx`: texto de los items `font-medium` y más grande, títulos en negrita, entradas antiguas menos atenuadas.",
    "Versión actualizada a v1.7.20.",
  ],
};

const v197_de: ChangelogEntry = {
  version: "v1.7.20",
  date: "2026-08-20",
  title: "Luftigerer Changelog und besser lesbarer Text",
  items: [
    "`app/changelog/page.tsx`: vertikaler Abstand um die Changelog-Liste hinzugefügt.",
    "`components/ChangelogList.tsx`: Item-Text jetzt `font-medium` und größer, Titel fett, ältere Einträge weniger verblasst.",
    "Version auf v1.7.20 aktualisiert.",
  ],
};

const v196_fr: ChangelogEntry = {
  version: "v1.7.19",
  date: "2026-08-20",
  title: "Espacement onglets / contenu dans Settings",
  items: [
    "`components/settings/SettingsLayout.tsx` : ajout d'un `pt-4` entre la barre d'onglets et le contenu pour aérer les panneaux.",
    "Version mise à jour en v1.7.19.",
  ],
};

const v196_en: ChangelogEntry = {
  version: "v1.7.19",
  date: "2026-08-20",
  title: "Spacing between settings tabs and content",
  items: [
    "`components/settings/SettingsLayout.tsx`: added `pt-4` between the tab bar and content to space out the panels.",
    "Updated version to v1.7.19.",
  ],
};

const v196_es: ChangelogEntry = {
  version: "v1.7.19",
  date: "2026-08-20",
  title: "Espaciado entre pestañas y contenido en Settings",
  items: [
    "`components/settings/SettingsLayout.tsx`: añadido `pt-4` entre la barra de pestañas y el contenido para separar los paneles.",
    "Versión actualizada a v1.7.19.",
  ],
};

const v196_de: ChangelogEntry = {
  version: "v1.7.19",
  date: "2026-08-20",
  title: "Abstand zwischen Settings-Tabs und Inhalt",
  items: [
    "`components/settings/SettingsLayout.tsx`: `pt-4` zwischen Tab-Leiste und Inhalt hinzugefügt, um die Panels zu trennen.",
    "Version auf v1.7.19 aktualisiert.",
  ],
};

const v195_fr: ChangelogEntry = {
  version: "v1.7.18",
  date: "2026-08-20",
  title: "Carte Discord home : couleurs, pp et cover",
  items: [
    "`components/SocialDiscordCard.tsx` : ajout d'un dégradé indigo/violet pour les couleurs Discord.",
    "Ajout de `avatarUrlSmall` en candidat de fallback pour la pp Discord.",
    "La cover du morceau en cours utilise maintenant `cover` et `artworkUrl` (avec `ClientImage` multi-sources).",
    "Version mise à jour en v1.7.18.",
  ],
};

const v195_en: ChangelogEntry = {
  version: "v1.7.18",
  date: "2026-08-20",
  title: "Home Discord card: colors, avatar and cover",
  items: [
    "`components/SocialDiscordCard.tsx`: added indigo/purple gradient for Discord colors.",
    "Added `avatarUrlSmall` as a fallback candidate for the Discord avatar.",
    "The currently playing cover now uses both `cover` and `artworkUrl` (with multi-source `ClientImage`).",
    "Updated version to v1.7.18.",
  ],
};

const v195_es: ChangelogEntry = {
  version: "v1.7.18",
  date: "2026-08-20",
  title: "Tarjeta Discord del home: colores, avatar y portada",
  items: [
    "`components/SocialDiscordCard.tsx`: degradado índigo/púrpura para los colores de Discord.",
    "`avatarUrlSmall` añadido como candidato de fallback para el avatar de Discord.",
    "La portada de la canción en reproducción ahora usa `cover` y `artworkUrl` (con `ClientImage` multi-fuente).",
    "Versión actualizada a v1.7.18.",
  ],
};

const v195_de: ChangelogEntry = {
  version: "v1.7.18",
  date: "2026-08-20",
  title: "Home-Discord-Karte: Farben, Avatar und Cover",
  items: [
    "`components/SocialDiscordCard.tsx`: Indigo/Lila-Farbverlauf für Discord-Farben hinzugefügt.",
    "`avatarUrlSmall` als Fallback-Kandidat für den Discord-Avatar hinzugefügt.",
    "Das aktuelle Track-Cover verwendet jetzt `cover` und `artworkUrl` (mit Multi-Source `ClientImage`).",
    "Version auf v1.7.18 aktualisiert.",
  ],
};

const v194_fr: ChangelogEntry = {
  version: "v1.7.17",
  date: "2026-08-20",
  title: "Carte Gaming Minecraft : skin visible et dégradé vert",
  items: [
    "`components/GamingCard.tsx` : suppression des paramètres de taille NMSR dans les URLs de fallback (ils renvoyaient 400).",
    "La carte Gaming utilise maintenant un dégradé vert/émeraude pour matcher l'univers Minecraft.",
    "Le skin/body de Minecraft doit s'afficher dans la carte 3D du home.",
    "Version mise à jour en v1.7.17.",
  ],
};

const v194_en: ChangelogEntry = {
  version: "v1.7.17",
  date: "2026-08-20",
  title: "Gaming Minecraft card: visible skin and green gradient",
  items: [
    "`components/GamingCard.tsx`: removed NMSR size query params from fallback URLs (they returned 400).",
    "The Gaming card now uses a green/emerald gradient to match the Minecraft theme.",
    "Minecraft skin/body should render in the home 3D card.",
    "Updated version to v1.7.17.",
  ],
};

const v194_es: ChangelogEntry = {
  version: "v1.7.17",
  date: "2026-08-20",
  title: "Tarjeta Gaming de Minecraft: skin visible y degradado verde",
  items: [
    "`components/GamingCard.tsx`: se eliminan los parámetros de tamaño de NMSR de las URLs de fallback (devolvían 400).",
    "La tarjeta Gaming usa ahora un degradado verde/esmeralda para coincidir con el tema de Minecraft.",
    "El skin/cuerpo de Minecraft debe renderizarse en la tarjeta 3D del home.",
    "Versión actualizada a v1.7.17.",
  ],
};

const v194_de: ChangelogEntry = {
  version: "v1.7.17",
  date: "2026-08-20",
  title: "Gaming-Minecraft-Karte: sichtbarer Skin und grüner Farbverlauf",
  items: [
    "`components/GamingCard.tsx`: NMSR-Größen-Query-Parameter aus den Fallback-URLs entfernt (sie gaben 400 zurück).",
    "Die Gaming-Karte nutzt jetzt einen grün/smaragd Farbverlauf passend zum Minecraft-Theme.",
    "Minecraft-Skin/Body sollte in der Home-3D-Karte angezeigt werden.",
    "Version auf v1.7.17 aktualisiert.",
  ],
};

const v193_fr: ChangelogEntry = {
  version: "v1.7.16",
  date: "2026-08-20",
  title: "Skin, cape et historique Minecraft",
  items: [
    "`worker/src/services/minecraft-client.js` : suppression des paramètres de taille qui cassaient les rendus NMSR (`face`, `fullbody`), ajout d'un fallback `uuid.legacyminecraft.com` pour l'historique des pseudos.",
    "`components/LiveWidgets.tsx` : le rendu du corps Minecraft utilise `ClientImage` avec un fallback pioche pour éviter l'icône d'image cassée.",
    "Version mise à jour en v1.7.16.",
  ],
};

const v193_en: ChangelogEntry = {
  version: "v1.7.16",
  date: "2026-08-20",
  title: "Minecraft skin, cape and name history",
  items: [
    "`worker/src/services/minecraft-client.js`: removed NMSR size query params that broke `face`/`fullbody` renders, added `uuid.legacyminecraft.com` fallback for name history.",
    "`components/LiveWidgets.tsx`: Minecraft body render now uses `ClientImage` with a pickaxe fallback to avoid the broken image icon.",
    "Updated version to v1.7.16.",
  ],
};

const v193_es: ChangelogEntry = {
  version: "v1.7.16",
  date: "2026-08-20",
  title: "Skin, capa e historial de nombres de Minecraft",
  items: [
    "`worker/src/services/minecraft-client.js`: se eliminan los parámetros de tamaño de NMSR que rompían los renders `face`/`fullbody`, se añade el fallback `uuid.legacyminecraft.com` para el historial de nombres.",
    "`components/LiveWidgets.tsx`: el render del cuerpo de Minecraft usa `ClientImage` con un fallback de pico para evitar el icono de imagen rota.",
    "Versión actualizada a v1.7.16.",
  ],
};

const v193_de: ChangelogEntry = {
  version: "v1.7.16",
  date: "2026-08-20",
  title: "Minecraft-Skin, Umhang und Namenshistorie",
  items: [
    "`worker/src/services/minecraft-client.js`: NMSR-Größen-Query-Parameter entfernt, die `face`/`fullbody`-Renders kaputt gemacht haben; Fallback `uuid.legacyminecraft.com` für Namenshistorie hinzugefügt.",
    "`components/LiveWidgets.tsx`: Minecraft-Körper-Render verwendet jetzt `ClientImage` mit Spitzhacken-Fallback, um das kaputte Bildsymbol zu vermeiden.",
    "Version auf v1.7.16 aktualisiert.",
  ],
};

const v192_fr: ChangelogEntry = {
  version: "v1.7.15",
  date: "2026-08-20",
  title: "Carte Spotify robuste et pas de débordement",
  items: [
    "`components/LiveWidgets.tsx` : la cover Spotify (front et back) utilise `SafeImage` au lieu de `next/image` pour éviter l'icône d'image cassée si le Worker retourne une URL invalide ou vide.",
    "Les images pleine largeur (générique, YouTube) utilisent `SafeImage` avec fallback initiales.",
    "Le conteneur de cartes live reçoit `min-w-0` et les images `shrink-0 overflow-hidden` pour éviter les débordements.",
    "Version mise à jour en v1.7.15.",
  ],
};

const v192_en: ChangelogEntry = {
  version: "v1.7.15",
  date: "2026-08-20",
  title: "Robust Spotify card and no overflow",
  items: [
    "`components/LiveWidgets.tsx`: Spotify cover (front and back) now uses `SafeImage` instead of `next/image` to prevent the broken image icon when the Worker returns an invalid or empty URL.",
    "Full-width images (generic, YouTube) now use `SafeImage` with initials fallback.",
    "Live card containers get `min-w-0` and images get `shrink-0 overflow-hidden` to prevent overflow.",
    "Updated version to v1.7.15.",
  ],
};

const v192_es: ChangelogEntry = {
  version: "v1.7.15",
  date: "2026-08-20",
  title: "Tarjeta Spotify robusta y sin desbordamiento",
  items: [
    "`components/LiveWidgets.tsx`: la portada de Spotify (anverso y reverso) usa `SafeImage` en lugar de `next/image` para evitar el icono de imagen rota cuando el Worker devuelve una URL inválida o vacía.",
    "Las imágenes a ancho completo (genérica, YouTube) usan `SafeImage` con fallback de iniciales.",
    "Los contenedores de tarjetas live reciben `min-w-0` y las imágenes `shrink-0 overflow-hidden` para evitar desbordamientos.",
    "Versión actualizada a v1.7.15.",
  ],
};

const v192_de: ChangelogEntry = {
  version: "v1.7.15",
  date: "2026-08-20",
  title: "Robuste Spotify-Karte und kein Überlauf",
  items: [
    "`components/LiveWidgets.tsx`: Spotify-Cover (Vorder- und Rückseite) verwendet jetzt `SafeImage` statt `next/image`, um das kaputte Bildsymbol zu vermeiden, wenn der Worker eine ungültige oder leere URL zurückgibt.",
    "Bilder in voller Breite (generisch, YouTube) verwenden `SafeImage` mit Initialen-Fallback.",
    "Live-Karten-Container erhalten `min-w-0` und Bilder `shrink-0 overflow-hidden`, um Überläufe zu vermeiden.",
    "Version auf v1.7.15 aktualisiert.",
  ],
};

const v191_fr: ChangelogEntry = {
  version: "v1.7.14",
  date: "2026-08-20",
  title: "Refonte du changelog : centrage, animation et couleurs",
  items: [
    "Nouveau composant `components/ChangelogList.tsx` : cartes unifiées, animées, centrées et colorées.",
    "Le modal changelog est recentré, passe en spring/bounce et utilise un overlay fade plus marqué.",
    "Les notes prennent des icônes colorées : `wrench` bleu pour les corrections, `sparkles` vert pour les nouveautés, `refresh-cw` ambre pour les changements, `tag` violet pour les versions.",
    "La page `/changelog` est recentrée (`max-w-3xl`) et chaque entrée défile en douceur.",
    "Version mise à jour en v1.7.14.",
  ],
};

const v191_en: ChangelogEntry = {
  version: "v1.7.14",
  date: "2026-08-20",
  title: "Changelog redesign: centered, animated, and colored",
  items: [
    "New `components/ChangelogList.tsx` component: unified, animated, centered, and color-coded cards.",
    "The changelog modal is re-centered, uses a spring/bounce transition, and a stronger fade overlay.",
    "Items get colored icons: `wrench` blue for fixes, `sparkles` green for new features, `refresh-cw` amber for changes, `tag` purple for version notes.",
    "The `/changelog` page is re-centered (`max-w-3xl`) and each entry fades in smoothly.",
    "Updated version to v1.7.14.",
  ],
};

const v191_es: ChangelogEntry = {
  version: "v1.7.14",
  date: "2026-08-20",
  title: "Rediseño del changelog: centrado, animado y con colores",
  items: [
    "Nuevo componente `components/ChangelogList.tsx`: tarjetas unificadas, animadas, centradas y con códigos de color.",
    "El modal de changelog está recentrado, usa una transición spring/bounce y un overlay fade más marcado.",
    "Las notas usan iconos de colores: `wrench` azul para correcciones, `sparkles` verde para novedades, `refresh-cw` ámbar para cambios, `tag` morado para notas de versión.",
    "La página `/changelog` está recentrada (`max-w-3xl`) y cada entrada aparece suavemente.",
    "Versión actualizada a v1.7.14.",
  ],
};

const v191_de: ChangelogEntry = {
  version: "v1.7.14",
  date: "2026-08-20",
  title: "Changelog-Redesign: zentriert, animiert und farbig",
  items: [
    "Neue `components/ChangelogList.tsx`-Komponente: vereinheitlichte, animierte, zentrierte und farbige Karten.",
    "Der Changelog-Modal ist neu zentriert, nutzt eine Spring/Bounce-Transition und einen stärkeren Fade-Overlay.",
    "Einträge erhalten farbige Icons: `wrench` blau für Korrekturen, `sparkles` grün für Neuheiten, `refresh-cw` bernsteinfarben für Änderungen, `tag` lila für Versionshinweise.",
    "Die `/changelog`-Seite ist neu zentriert (`max-w-3xl`) und jeder Eintrag blendet sanft ein.",
    "Version auf v1.7.14 aktualisiert.",
  ],
};

const v190_fr: ChangelogEntry = {
  version: "v1.7.13",
  date: "2026-08-20",
  title: "Correction de la cover Spotify dans la Dynamic Island",
  items: [
    "`worker/src/services/spotify-oauth-client.js` : autorise les noms d'hôte des CDNs Spotify (`spotifycdn.com`, `spotify.com`) en plus de `scdn.co` pour les images d'album.",
    "`worker/src/services/lanyard-client.js` : autorise les mêmes hôtes pour les covers Spotify via Lanyard.",
    "Ajout d'un test worker pour vérifier qu'une URL `image-cdn-ak.spotifycdn.com` est conservée.",
    "Version mise à jour en v1.7.13.",
  ],
};

const v190_en: ChangelogEntry = {
  version: "v1.7.13",
  date: "2026-08-20",
  title: "Fix Spotify cover in the Dynamic Island",
  items: [
    "`worker/src/services/spotify-oauth-client.js`: allow Spotify CDN hostnames (`spotifycdn.com`, `spotify.com`) in addition to `scdn.co` for album images.",
    "`worker/src/services/lanyard-client.js`: allow the same hosts for Spotify covers through Lanyard.",
    "Added a worker test to verify that an `image-cdn-ak.spotifycdn.com` URL is preserved.",
    "Updated version to v1.7.13.",
  ],
};

const v190_es: ChangelogEntry = {
  version: "v1.7.13",
  date: "2026-08-20",
  title: "Corrección de la portada de Spotify en la Dynamic Island",
  items: [
    "`worker/src/services/spotify-oauth-client.js`: permite los nombres de host de los CDNs de Spotify (`spotifycdn.com`, `spotify.com`) además de `scdn.co` para las imágenes de álbum.",
    "`worker/src/services/lanyard-client.js`: permite los mismos hosts para las portadas de Spotify a través de Lanyard.",
    "Se añadió un test del worker para verificar que se conserve una URL `image-cdn-ak.spotifycdn.com`.",
    "Versión actualizada a v1.7.13.",
  ],
};

const v190_de: ChangelogEntry = {
  version: "v1.7.13",
  date: "2026-08-20",
  title: "Spotify-Cover in der Dynamic Island korrigiert",
  items: [
    "`worker/src/services/spotify-oauth-client.js`: Spotify-CDN-Hostnamen (`spotifycdn.com`, `spotify.com`) zusätzlich zu `scdn.co` für Albumbilder erlauben.",
    "`worker/src/services/lanyard-client.js`: dieselben Hosts für Spotify-Cover über Lanyard erlauben.",
    "Worker-Test hinzugefügt, um zu prüfen, dass eine `image-cdn-ak.spotifycdn.com`-URL erhalten bleibt.",
    "Version auf v1.7.13 aktualisiert.",
  ],
};

const v189_fr: ChangelogEntry = {
  version: "v1.7.12",
  date: "2026-08-20",
  title: "Pomodoro en bulle dans la Dynamic Island",
  items: [
    "`components/DynamicIslandContainer.tsx` : le Pomodoro devient une bulle circulaire séparée quand d'autres activités (Spotify, Brain) sont actives, comme le multi-activités de la Dynamic Island d'Apple.",
    "Bulle Pomodoro : temps restant au centre + anneau de progrès, fond et bordure propres, état actif en accent.",
    "Priorité d'activités ajustée : Spotify/Brain restent en pill principal, Pomodoro passe en bulle secondaire.",
    "Version mise à jour en v1.7.12.",
  ],
};

const v189_en: ChangelogEntry = {
  version: "v1.7.12",
  date: "2026-08-20",
  title: "Pomodoro bubble in the Dynamic Island",
  items: [
    "`components/DynamicIslandContainer.tsx`: the Pomodoro now shows as a separate circular bubble when other activities (Spotify, Brain) are active, like Apple's Dynamic Island multi-activity view.",
    "Pomodoro bubble: remaining time in the center + progress ring, clean background and border, active state in accent color.",
    "Activity priority adjusted: Spotify/Brain stay as the main pill, Pomodoro becomes the secondary bubble.",
    "Updated version to v1.7.12.",
  ],
};

const v189_es: ChangelogEntry = {
  version: "v1.7.12",
  date: "2026-08-20",
  title: "Pomodoro en burbuja en la Dynamic Island",
  items: [
    "`components/DynamicIslandContainer.tsx`: el Pomodoro ahora aparece como una burbuja circular separada cuando otras actividades (Spotify, Brain) están activas, como la vista de multiactividad de la Dynamic Island de Apple.",
    "Burbuja Pomodoro: tiempo restante en el centro + anillo de progreso, fondo y borde limpios, estado activo en color de acento.",
    "Prioridad de actividad ajustada: Spotify/Brain permanecen como píldora principal, Pomodoro pasa a ser burbuja secundaria.",
    "Versión actualizada a v1.7.12.",
  ],
};

const v189_de: ChangelogEntry = {
  version: "v1.7.12",
  date: "2026-08-20",
  title: "Pomodoro-Blase in der Dynamic Island",
  items: [
    "`components/DynamicIslandContainer.tsx`: Pomodoro wird jetzt als separate runde Blase angezeigt, wenn andere Aktivitäten (Spotify, Brain) aktiv sind, ähnlich der Multi-Aktivitäten-Ansicht der Apple Dynamic Island.",
    "Pomodoro-Blase: verbleibende Zeit in der Mitte + Fortschrittsring, sauberer Hintergrund und Rahmen, aktiver Zustand in Akzentfarbe.",
    "Aktivitätspriorität angepasst: Spotify/Brain bleiben Haupt-Pille, Pomodoro wird zur sekundären Blase.",
    "Version auf v1.7.12 aktualisiert.",
  ],
};

const v188_fr: ChangelogEntry = {
  version: "v1.7.11",
  date: "2026-08-20",
  title: "Polish des menus Notifications, Langue et Profil",
  items: [
    "`components/motion/Popover.tsx` : option `gooStrength={0}` pour désactiver l'effet goo et obtenir des bordures propres.",
    "`components/UserProfileDropdown.tsx` : ouverture au clic (`trigger=\"click\"`) pour éviter la fermeture automatique au hover.",
    "`components/LanguageSwitcher.tsx` : `gooStrength={0}`, `panelRadius` aligné, style actif épuré avec coche.",
    "`components/NotificationCenter.tsx` : largeur réduite (`w-96`), `gooStrength={0}`, fond et bordures propres, recherche plus discrète.",
    "Version mise à jour en v1.7.11.",
  ],
};

const v188_en: ChangelogEntry = {
  version: "v1.7.11",
  date: "2026-08-20",
  title: "Polish for Notifications, Language and Profile menus",
  items: [
    "`components/motion/Popover.tsx`: `gooStrength={0}` option to disable the goo effect and get clean borders.",
    "`components/UserProfileDropdown.tsx`: click-to-open (`trigger=\"click\"`) to stop auto-closing on hover.",
    "`components/LanguageSwitcher.tsx`: `gooStrength={0}`, aligned `panelRadius`, cleaner active style with checkmark.",
    "`components/NotificationCenter.tsx`: reduced width (`w-96`), `gooStrength={0}`, clean background and borders, subtler search input.",
    "Updated version to v1.7.11.",
  ],
};

const v188_es: ChangelogEntry = {
  version: "v1.7.11",
  date: "2026-08-20",
  title: "Refinado de los menús Notificaciones, Idioma y Perfil",
  items: [
    "`components/motion/Popover.tsx`: opción `gooStrength={0}` para desactivar el efecto goo y obtener bordes limpios.",
    "`components/UserProfileDropdown.tsx`: apertura con clic (`trigger=\"click\"`) para evitar el cierre automático al pasar el mouse.",
    "`components/LanguageSwitcher.tsx`: `gooStrength={0}`, `panelRadius` alineado, estilo activo más limpio con check.",
    "`components/NotificationCenter.tsx`: anchura reducida (`w-96`), `gooStrength={0}`, fondo y bordes limpios, búsqueda más discreta.",
    "Versión actualizada a v1.7.11.",
  ],
};

const v188_de: ChangelogEntry = {
  version: "v1.7.11",
  date: "2026-08-20",
  title: "Polish für Benachrichtigungs-, Sprach- und Profilmenüs",
  items: [
    "`components/motion/Popover.tsx`: Option `gooStrength={0}` zum Deaktivieren des Goo-Effekts für saubere Ränder.",
    "`components/UserProfileDropdown.tsx`: Öffnen per Klick (`trigger=\"click\"`), um automatisches Schließen bei Hover zu verhindern.",
    "`components/LanguageSwitcher.tsx`: `gooStrength={0}`, abgestimmtes `panelRadius`, aufgeräumter aktiver Stil mit Haken.",
    "`components/NotificationCenter.tsx`: reduzierte Breite (`w-96`), `gooStrength={0}`, sauberer Hintergrund und Ränder, dezenteres Suchfeld.",
    "Version auf v1.7.11 aktualisiert.",
  ],
};

const v206_fr: ChangelogEntry = {
  version: "v1.7.29",
  date: "2026-08-20",
  title: "Moteur de thèmes premium et isolation 3D",
  items: [
    "Nouveau moteur de thèmes premium : 5 thèmes uniques (Obsidienne, Cyber Néon, Éclipse Solaire, Aurore Boréale, Monochrome Studio).",
    "Application synchronisée via `applyTheme` sur `document.documentElement` avec variables CSS personnalisées : zéro latence au changement.",
    "Migration automatique des anciens identifiants de thème vers le catalogue premium.",
    "Nouveau sélecteur `PremiumThemePicker` avec aperçus miniatures du tableau de bord, pastilles de couleurs et descriptions.",
    "Règles CSS `data-theme` pour les 5 thèmes, transitions douces respectant `prefers-reduced-motion`.",
    "Isolation visuelle des cartes 3D / Bento / widgets : `data-card-isolated` conserve les effets locaux sans hériter des reflets du thème.",
    "Suppression des anciens blocs `data-theme` de `legacy-v8-tokens.css` pour éviter les conflits de cascade.",
    "Mise à jour des préréglages, personas, automatisations et métadonnées pour le nouveau catalogue.",
    "Version v1.7.29 / cache PWA v397.",
  ],
};

const v206_en: ChangelogEntry = {
  version: "v1.7.29",
  date: "2026-08-20",
  title: "Premium theme engine and 3D isolation",
  items: [
    "New premium theme engine: 5 unique themes (Obsidian, Cyber Neon, Solar Eclipse, Northern Aurora, Monochrome Studio).",
    "Synchronous `applyTheme` on `document.documentElement` using CSS custom properties: zero-lag switching.",
    "Automatic migration of legacy theme IDs to the premium catalog.",
    "New `PremiumThemePicker` with dashboard miniature previews, color dots and descriptions.",
    "`data-theme` CSS rules for the 5 themes with smooth transitions honoring `prefers-reduced-motion`.",
    "Visual isolation for 3D / Bento / widget cards: `data-card-isolated` keeps effects local and avoids theme-glow inheritance.",
    "Removed legacy `data-theme` blocks from `legacy-v8-tokens.css` to prevent cascade conflicts.",
    "Updated presets, personas, automations and metadata to the new catalog.",
    "Version v1.7.29 / PWA cache v397.",
  ],
};

const v206_es: ChangelogEntry = {
  version: "v1.7.29",
  date: "2026-08-20",
  title: "Motor de temas premium y aislamiento 3D",
  items: [
    "Nuevo motor de temas premium: 5 temas únicos (Obsidiana, Cyber Neón, Eclipse Solar, Aurora Boreal, Monochrome Studio).",
    "Aplicación síncrona de `applyTheme` sobre `document.documentElement` con variables CSS personalizadas: cambio sin latencia.",
    "Migración automática de identificadores de tema antiguos al catálogo premium.",
    "Nuevo `PremiumThemePicker` con miniaturas del panel, puntos de color y descripciones.",
    "Reglas CSS `data-theme` para los 5 temas con transiciones suaves respetando `prefers-reduced-motion`.",
    "Aislamiento visual de tarjetas 3D / Bento / widgets: `data-card-isolated` mantiene los efectos locales sin heredar los reflejos del tema.",
    "Eliminación de los bloques `data-theme` heredados de `legacy-v8-tokens.css` para evitar conflictos de cascada.",
    "Actualización de preajustes, personas, automatizaciones y metadatos al nuevo catálogo.",
    "Versión v1.7.29 / caché PWA v397.",
  ],
};

const v206_de: ChangelogEntry = {
  version: "v1.7.29",
  date: "2026-08-20",
  title: "Premium-Theme-Engine und 3D-Isolation",
  items: [
    "Neue Premium-Theme-Engine: 5 einzigartige Themes (Obsidian, Cyber Neon, Solar Eclipse, Northern Aurora, Monochrome Studio).",
    "Synchrone `applyTheme` auf `document.documentElement` mit CSS-Custom-Properties: umschaltbar ohne Verzögerung.",
    "Automatische Migration alter Theme-IDs in den Premium-Katalog.",
    "Neuer `PremiumThemePicker` mit Dashboard-Miniaturvorschau, Farbkacheln und Beschreibungen.",
    "`data-theme`-CSS-Regeln für die 5 Themes mit sanften Übergängen unter Beachtung von `prefers-reduced-motion`.",
    "Visuelle Isolation für 3D-/Bento-/Widget-Karten: `data-card-isolated` hält Effekte lokal und verhindert vererbte Theme-Glows.",
    "Entfernung alter `data-theme`-Blöcke aus `legacy-v8-tokens.css`, um Kaskadenkonflikte zu vermeiden.",
    "Aktualisierung von Presets, Personas, Automatisierungen und Metadaten für den neuen Katalog.",
    "Version v1.7.29 / PWA-Cache v397.",
  ],
};

const v140_fr: ChangelogEntry = {
  version: "v1.7.40",
  date: "2026-08-20",
  title: "Refonte de la modal des logs/changelog",
  items: [
    "Nouveau composant components/ChangelogModal.tsx isole.",
    "Centrage absolu, overlay floute, fermeture au clic exterieur.",
    "Header et footer fixes ; contenu scrollable avec os-scroll.",
    "Scrollbar personnalisee : piste transparente, curseur fin arrondi.",
    "Fond, bordure et ombre coherents avec le theme actif.",
    "Utilisation des tokens CSS pour bordures, badges et accents.",
    "Version : v1.7.40, cache PWA v408.",
  ],
};

const v140_en: ChangelogEntry = {
  version: "v1.7.40",
  date: "2026-08-20",
  title: "Logs & changelog modal redesign",
  items: [
    "New isolated components/ChangelogModal.tsx.",
    "Perfect centering, blurred dark overlay, click outside to close.",
    "Fixed header and footer; scrollable content with os-scroll.",
    "Custom scrollbar: transparent track, thin rounded thumb.",
    "Background, border and shadow aligned with active theme.",
    "CSS theme tokens used for borders, badges and accents.",
    "Version: v1.7.40, PWA cache v408.",
  ],
};

const v140_es: ChangelogEntry = {
  version: "v1.7.40",
  date: "2026-08-20",
  title: "Rediseno del modal de logs/changelog",
  items: [
    "Nuevo componente components/ChangelogModal.tsx aislado.",
    "Centrado absoluto, overlay oscuro difuminado, cierre al clic exterior.",
    "Header y footer fijos; contenido desplazable con os-scroll.",
    "Scrollbar personalizada: pista transparente, pulgar fino redondeado.",
    "Fondo, borde y sombra coherentes con el tema activo.",
    "Tokens CSS del tema usados para bordes, badges y acentos.",
    "Version: v1.7.40, cache PWA v408.",
  ],
};

const v140_de: ChangelogEntry = {
  version: "v1.7.40",
  date: "2026-08-20",
  title: "Redesign des Logs-/Changelog-Modals",
  items: [
    "Neue isolierte Komponente components/ChangelogModal.tsx.",
    "Absolute Zentrierung, verschwommener dunkler Overlay, Schliessen per Klick draussen.",
    "Fester Header und Footer; scrollbarer Inhalt mit os-scroll.",
    "Benutzerdefinierte Scrollbar: transparenter Track, dünner runder Daumen.",
    "Hintergrund, Rahmen und Schatten passen zum aktiven Theme.",
    "CSS-Theme-Tokens fuer Rahmen, Badges und Akzente verwendet.",
    "Version: v1.7.40, PWA-Cache v408.",
  ],
};

const v141_fr: ChangelogEntry = {
  version: "v1.7.41",
  date: "2026-08-20",
  title: "Audit global et harmonisation dynamique des boutons",
  items: [
    "Raccord de l'ensemble des boutons et contrôles interactifs au Theme Engine.",
    "Nouveau composant generique components/ui/Button.tsx (primary, secondary, outline, ghost, danger).",
    "Token --accent-contrast ajoute pour la couleur de texte des actions primaires.",
    "Remplacement automatique des couleurs Tailwind codees en dur par des variables CSS semantiques.",
    "Couleurs d'alerte (danger, warning, info) et widgets 3D isoles preserves.",
    "Redimensionnement du PremiumThemePicker pour des panneaux plus compacts.",
    "Verification Snyk : aucune injection CSS ni regression d'accessibilite detectee.",
    "Version : v1.7.41, cache PWA v409.",
  ],
};

const v141_en: ChangelogEntry = {
  version: "v1.7.41",
  date: "2026-08-20",
  title: "Global button dynamic theme audit and harmonization",
  items: [
    "Connected all buttons and interactive controls to the Theme Engine.",
    "New generic components/ui/Button.tsx component (primary, secondary, outline, ghost, danger).",
    "Added --accent-contrast token for primary action text color.",
    "Replaced hardcoded Tailwind colors with semantic CSS variables.",
    "Alert colors (danger, warning, info) and isolated 3D widgets preserved.",
    "Resized PremiumThemePicker for more compact panels.",
    "Snyk check: no CSS injection or accessibility regressions detected.",
    "Version: v1.7.41, PWA cache v409.",
  ],
};

const v141_es: ChangelogEntry = {
  version: "v1.7.41",
  date: "2026-08-20",
  title: "Auditoria global y armonizacion dinamica de botones",
  items: [
    "Conexion de todos los botones y controles interactivos al Theme Engine.",
    "Nuevo componente generico components/ui/Button.tsx (primary, secondary, outline, ghost, danger).",
    "Token --accent-contrast anadido para el color de texto de acciones primarias.",
    "Reemplazo de colores Tailwind codificados en duro por variables CSS semanticas.",
    "Colores de alerta (danger, warning, info) y widgets 3D aislados preservados.",
    "Redimension del PremiumThemePicker para paneles mas compactos.",
    "Verificacion Snyk: sin inyeccion CSS ni regresiones de accesibilidad.",
    "Version: v1.7.41, cache PWA v409.",
  ],
};

const v141_de: ChangelogEntry = {
  version: "v1.7.41",
  date: "2026-08-20",
  title: "Globale Audit und dynamische Harmonisierung der Buttons",
  items: [
    "Alle Buttons und interaktiven Steuerelemente an die Theme Engine angebunden.",
    "Neue generische Komponente components/ui/Button.tsx (primary, secondary, outline, ghost, danger).",
    "Token --accent-contrast fuer Primaeraktions-Textfarbe hinzugefuegt.",
    "Hartkodierte Tailwind-Farben durch semantische CSS-Variablen ersetzt.",
    "Alarmfarben (danger, warning, info) und isolierte 3D-Widgets beibehalten.",
    "PremiumThemePicker verkleinert fuer kompaktere Panels.",
    "Snyk-Pruefung: keine CSS-Injection oder Accessibility-Regressionen erkannt.",
    "Version: v1.7.41, PWA-Cache v409.",
  ],
};

const v142_fr: ChangelogEntry = {
  version: "v1.7.42",
  date: "2026-08-20",
  title: "Refonte UI/UX de la sidebar et suite de l'harmonisation des contrôles",
  items: [
    "Reorganisation de la sidebar : Accueil, Notes, Taches, Calendrier, Fichiers, Mail, Brain, Focus, Activite, Connexions, Plugins, Reglages.",
    "Pastille active glissante synchronisee avec les tokens d'accent et de glow.",
    "Espacements et typographie affines (gap-1.5, px-3.5, text-[13px]) pour une sidebar aeree.",
    "Bloc profil/actions en bas avec separateur subtil.",
    "Harmonisation des controles : Modal, Select, Tabs, AnimatedFilterTabs, Switch, Checkbox, Toast, Dock, TopBar, UserProfileDropdown.",
    "Couleurs d'alerte (danger, warning, info, succes) et widgets 3D isoles preserves.",
    "Snyk : aucune injection CSS ni regression d'accessibilite.",
    "Version : v1.7.42, cache PWA v410.",
  ],
};

const v142_en: ChangelogEntry = {
  version: "v1.7.42",
  date: "2026-08-20",
  title: "Sidebar UI/UX refactor and control harmonization follow-up",
  items: [
    "Sidebar reordered: Home, Notes, Tasks, Calendar, Files, Mail, Brain, Focus, Activity, Connections, Plugins, Settings.",
    "Sliding active pill synchronized with accent and glow tokens.",
    "Tighter spacing and typography (gap-1.5, px-3.5, text-[13px]) for an airy sidebar.",
    "Profile/actions bottom block with subtle separator.",
    "Controls harmonized: Modal, Select, Tabs, AnimatedFilterTabs, Switch, Checkbox, Toast, Dock, TopBar, UserProfileDropdown.",
    "Alert colors (danger, warning, info, success) and isolated 3D widgets preserved.",
    "Snyk: no CSS injection or accessibility regressions.",
    "Version: v1.7.42, PWA cache v410.",
  ],
};

const v142_es: ChangelogEntry = {
  version: "v1.7.42",
  date: "2026-08-20",
  title: "Refactor UI/UX de la barra lateral y continuacion de armonizacion de controles",
  items: [
    "Reorden de la barra lateral: Inicio, Notas, Tareas, Calendario, Archivos, Correo, Brain, Focus, Actividad, Conexiones, Plugins, Ajustes.",
    "Pildora activa deslizante sincronizada con tokens de acento y glow.",
    "Espaciado y tipografia refinados (gap-1.5, px-3.5, text-[13px]) para una barra lateral mas ligera.",
    "Bloque de perfil/acciones inferior con separador sutil.",
    "Controles armonizados: Modal, Select, Tabs, AnimatedFilterTabs, Switch, Checkbox, Toast, Dock, TopBar, UserProfileDropdown.",
    "Colores de alerta (danger, warning, info, success) y widgets 3D aislados preservados.",
    "Snyk: sin inyeccion CSS ni regresiones de accesibilidad.",
    "Version: v1.7.42, cache PWA v410.",
  ],
};

const v142_de: ChangelogEntry = {
  version: "v1.7.42",
  date: "2026-08-20",
  title: "Sidebar UI/UX-Refaktor und Fortsetzung der Steuerelement-Harmonisierung",
  items: [
    "Sidebar neu angeordnet: Home, Notizen, Aufgaben, Kalender, Dateien, Mail, Brain, Fokus, Aktivitaet, Verbindungen, Plugins, Einstellungen.",
    "Gleitende aktive Pille synchronisiert mit Akzent- und Glow-Tokens.",
    "Feinabgestimmter Abstand und Typografie (gap-1.5, px-3.5, text-[13px]) fuer eine luftige Sidebar.",
    "Profil/Aktionen-Block unten mit dezimenter Trennlinie.",
    "Steuerelemente harmonisiert: Modal, Select, Tabs, AnimatedFilterTabs, Switch, Checkbox, Toast, Dock, TopBar, UserProfileDropdown.",
    "Alarmfarben (danger, warning, info, success) und isolierte 3D-Widgets beibehalten.",
    "Snyk: keine CSS-Injection oder Accessibility-Regressionen.",
    "Version: v1.7.42, PWA-Cache v410.",
  ],
};

const v143_fr: ChangelogEntry = {
  version: "v1.7.43",
  date: "2026-08-20",
  title: "Correction de la persistance du thème et de la couleur d'accent",
  items: [
    "ProfileSync persiste dans localStorage : un profil ne synchronise qu'une fois sa couleur/widget par defaut.",
    "SettingsProvider et HtmlLang appliquent l'accent utilisateur sur --accent-primary, --glow-color, --accent-contrast, --accent-secondary et --border-active.",
    "Marqueur ethone-settings-write-at et comparaison de updated_at pour eviter qu'une sync stale ecrase les choix locaux.",
    "Themes et couleurs d'accent conserves apres refresh.",
    "Version : v1.7.43, cache PWA v411.",
  ],
};

const v143_en: ChangelogEntry = {
  version: "v1.7.43",
  date: "2026-08-20",
  title: "Fix theme and accent color persistence",
  items: [
    "ProfileSync persisted in localStorage: a profile only syncs its default color/widget once.",
    "SettingsProvider and HtmlLang now apply the user accent to --accent-primary, --glow-color, --accent-contrast, --accent-secondary and --border-active.",
    "Added ethone-settings-write-at marker and updated_at comparison to prevent stale server sync from overwriting fresh local choices.",
    "Themes and accent colors are now preserved after refresh.",
    "Version: v1.7.43, PWA cache v411.",
  ],
};

const v143_es: ChangelogEntry = {
  version: "v1.7.43",
  date: "2026-08-20",
  title: "Correccion de la persistencia del tema y color de acento",
  items: [
    "ProfileSync se persiste en localStorage: un perfil solo sincroniza una vez su color/widget por defecto.",
    "SettingsProvider y HtmlLang aplican el color de acento del usuario a --accent-primary, --glow-color, --accent-contrast, --accent-secondary y --border-active.",
    "Marcador ethone-settings-write-at y comparacion de updated_at para evitar que una sincronizacion antigua sobrescriba las elecciones locales recientes.",
    "Temas y colores de acento conservados tras refrescar.",
    "Version: v1.7.43, cache PWA v411.",
  ],
};

const v143_de: ChangelogEntry = {
  version: "v1.7.43",
  date: "2026-08-20",
  title: "Korrektur der Theme- und Akzentfarben-Persistenz",
  items: [
    "ProfileSync in localStorage persistiert: ein Profil synchronisiert seine Standardfarbe/Widgets nur einmal.",
    "SettingsProvider und HtmlLang wenden den Benutzerakzent auf --accent-primary, --glow-color, --accent-contrast, --accent-secondary und --border-active an.",
    "ethone-settings-write-at Marker und updated_at Vergleich, damit veraltete Server-Syncs frische lokale Aenderungen nicht ueberschreiben.",
    "Themes und Akzentfarben bleiben nach dem Refresh erhalten.",
    "Version: v1.7.43, PWA-Cache v411.",
  ],
};

const v146_fr: ChangelogEntry = {
  version: "v1.7.46",
  date: "2026-08-21",
  title: "Pochette Spotify : fallback multi-sources et affichage robuste",
  items: [
    "lib/hooks/useNowPlaying : la cover et l'artworkUrl utilisent covers[0] si la taille privilégiée n'est pas disponible.",
    "components/MediaWidget, DockMediaFlyout, LiveWidgets : SafeImage reçoit candidates pour essayer toutes les tailles d'image.",
    "worker/src/services/spotify-oauth-client.js : fallback /v1/albums/{id}, /v1/shows/{id} et /v1/tracks/{id} quand currently-playing ne fournit pas de pochette.",
    "components/ConnectionCard : la connexion Spotify positionne liveNowPlayingSource sur 'spotify'.",
    "Version : v1.7.46, cache PWA v414.",
  ],
};

const v146_en: ChangelogEntry = {
  version: "v1.7.46",
  date: "2026-08-21",
  title: "Spotify cover: multi-source fallback and robust display",
  items: [
    "lib/hooks/useNowPlaying: cover and artworkUrl fall back to covers[0] when the preferred size is unavailable.",
    "components/MediaWidget, DockMediaFlyout, LiveWidgets: SafeImage now receives candidates to try every image size.",
    "worker/src/services/spotify-oauth-client.js: fallback to /v1/albums/{id}, /v1/shows/{id} and /v1/tracks/{id} when currently-playing provides no cover.",
    "components/ConnectionCard: connecting Spotify sets liveNowPlayingSource to 'spotify'.",
    "Version: v1.7.46, PWA cache v414.",
  ],
};

const v146_es: ChangelogEntry = {
  version: "v1.7.46",
  date: "2026-08-21",
  title: "Portada de Spotify: fallback multi-fuente y visualización robusta",
  items: [
    "lib/hooks/useNowPlaying: cover y artworkUrl usan covers[0] si el tamaño preferido no está disponible.",
    "components/MediaWidget, DockMediaFlyout, LiveWidgets: SafeImage recibe candidates para probar todos los tamaños de imagen.",
    "worker/src/services/spotify-oauth-client.js: fallback a /v1/albums/{id}, /v1/shows/{id} y /v1/tracks/{id} cuando currently-playing no proporciona portada.",
    "components/ConnectionCard: conectar Spotify establece liveNowPlayingSource a 'spotify'.",
    "Versión: v1.7.46, caché PWA v414.",
  ],
};

const v146_de: ChangelogEntry = {
  version: "v1.7.46",
  date: "2026-08-21",
  title: "Spotify-Cover: Multi-Source-Fallback und robuste Anzeige",
  items: [
    "lib/hooks/useNowPlaying: cover und artworkUrl greifen auf covers[0] zurück, wenn die bevorzugte Größe nicht verfügbar ist.",
    "components/MediaWidget, DockMediaFlyout, LiveWidgets: SafeImage erhält candidates, um alle Bildgrößen zu testen.",
    "worker/src/services/spotify-oauth-client.js: Fallback auf /v1/albums/{id}, /v1/shows/{id} und /v1/tracks/{id}, wenn currently-playing kein Cover liefert.",
    "components/ConnectionCard: Beim Verbinden von Spotify wird liveNowPlayingSource auf 'spotify' gesetzt.",
    "Version: v1.7.46, PWA-Cache v414.",
  ],
};

const v147_fr: ChangelogEntry = {
  version: "v1.7.47",
  date: "2026-08-21",
  title: "Onglet Admin : statistiques réservées à l'administrateur",
  items: [
    "components/Sidebar.tsx : nouvelle entrée Admin avec icône bar-chart, visible uniquement pour rub19.mailpro@gmail.com, juste au-dessus des paramètres.",
    "app/admin/page.tsx : tableau de bord Bento avec les compteurs utilisateurs, contenus, fichiers, mail et activité IA.",
    "worker/src/routes/admin.js : route protégée /api/admin/stats qui agrège les compteurs Supabase et refuse tout compte non admin.",
    "Version : v1.7.47, cache PWA v415.",
  ],
};

const v147_en: ChangelogEntry = {
  version: "v1.7.47",
  date: "2026-08-21",
  title: "Admin tab: admin-only statistics",
  items: [
    "components/Sidebar.tsx: new Admin entry with bar-chart icon, visible only for rub19.mailpro@gmail.com, just above Settings.",
    "app/admin/page.tsx: Bento-style dashboard with user, content, files, mail and AI activity counters.",
    "worker/src/routes/admin.js: protected /api/admin/stats route that aggregates Supabase counts and rejects non-admin accounts.",
    "Version: v1.7.47, PWA cache v415.",
  ],
};

const v147_es: ChangelogEntry = {
  version: "v1.7.47",
  date: "2026-08-21",
  title: "Pestaña Admin: estadísticas solo para administradores",
  items: [
    "components/Sidebar.tsx: nueva entrada Admin con icono bar-chart, visible solo para rub19.mailpro@gmail.com, justo encima de Ajustes.",
    "app/admin/page.tsx: panel Bento con contadores de usuarios, contenidos, archivos, correo y actividad de IA.",
    "worker/src/routes/admin.js: ruta protegida /api/admin/stats que agrega contadores de Supabase y rechaza cuentas no admin.",
    "Versión: v1.7.47, caché PWA v415.",
  ],
};

const v147_de: ChangelogEntry = {
  version: "v1.7.47",
  date: "2026-08-21",
  title: "Admin-Tab: Statistiken nur für Administratoren",
  items: [
    "components/Sidebar.tsx: neuer Admin-Eintrag mit bar-chart-Icon, nur für rub19.mailpro@gmail.com sichtbar, direkt über Einstellungen.",
    "app/admin/page.tsx: Bento-Dashboard mit Zählern für Benutzer, Inhalte, Dateien, E-Mail und KI-Aktivität.",
    "worker/src/routes/admin.js: geschützte /api/admin/stats-Route, die Supabase-Zähler aggregiert und Nicht-Admin-Konten ablehnt.",
    "Version: v1.7.47, PWA-Cache v415.",
  ],
};

const v145_fr: ChangelogEntry = {
  version: "v1.7.45",
  date: "2026-08-20",
  title: "Correction du layout de la page Paramètres : troncature, vide inférieur et overlays",
  items: [
    "components/ui/BentoCard : contenu en flex min-h-0 flex-1 pour empêcher la troncature des rangs de réglages.",
    "components/settings/SettingsContent : padding inférieur réduit de pb-20 à pb-12 pour limiter le vide noir en fin de défilement.",
    "components/settings/SettingsLayout : suppression de la barre d'actions flottante SettingsBottomBar.",
    "Les cartes Typographie, Échelle du texte et Verre & Effets s'affichent désormais en entier.",
    "Version : v1.7.45, cache PWA v413.",
  ],
};

const v144_fr: ChangelogEntry = {
  version: "v1.7.44",
  date: "2026-08-20",
  title: "Alignement de la couleur d'accent sur le bouton de connexion",
  items: [
    "app/globals.css : les tokens par defaut --accent-primary, --glow-color, --border-active, --accent-secondary et --accent-soft sont alignes sur l'accent violet par defaut.",
    "Le bouton Envoyer le code et les boutons de connexion utilisent la meme couleur d'accent que les onglets OTP.",
    "Version : v1.7.44, cache PWA v412.",
  ],
};

const v145_en: ChangelogEntry = {
  version: "v1.7.45",
  date: "2026-08-20",
  title: "Settings page layout fix: clipping, bottom gap and overlays",
  items: [
    "components/ui/BentoCard: content uses flex min-h-0 flex-1 to prevent settings rows from being clipped.",
    "components/settings/SettingsContent: reduced bottom padding from pb-20 to pb-12 to reduce the black empty space at the end of the scroll.",
    "components/settings/SettingsLayout: removed the floating SettingsBottomBar action strip.",
    "Typography, Text scale and Glass & Effects cards now render fully.",
    "Version: v1.7.45, PWA cache v413.",
  ],
};

const v144_en: ChangelogEntry = {
  version: "v1.7.44",
  date: "2026-08-20",
  title: "Login button accent color alignment",
  items: [
    "app/globals.css: default tokens --accent-primary, --glow-color, --border-active, --accent-secondary and --accent-soft now match the default violet accent.",
    "Send code and sign-in buttons now use the same accent color as the OTP tabs.",
    "Version: v1.7.44, PWA cache v412.",
  ],
};

const v145_es: ChangelogEntry = {
  version: "v1.7.45",
  date: "2026-08-20",
  title: "Correccion del layout de Ajustes: recorte, espacio inferior y overlays",
  items: [
    "components/ui/BentoCard: el contenido usa flex min-h-0 flex-1 para evitar que las filas de ajustes se recorten.",
    "components/settings/SettingsContent: padding inferior reducido de pb-20 a pb-12 para limitar el espacio negro al final del scroll.",
    "components/settings/SettingsLayout: se elimina la barra flotante de acciones SettingsBottomBar.",
    "Las tarjetas Tipografia, Escala del texto y Vidrio y Efectos ahora se muestran completas.",
    "Version: v1.7.45, cache PWA v413.",
  ],
};

const v144_es: ChangelogEntry = {
  version: "v1.7.44",
  date: "2026-08-20",
  title: "Alineacion del color de acento en el boton de inicio de sesion",
  items: [
    "app/globals.css: los tokens por defecto --accent-primary, --glow-color, --border-active, --accent-secondary y --accent-soft ahora coinciden con el acento violeta por defecto.",
    "El boton Enviar codigo y los botones de inicio de sesion usan el mismo color de acento que las pestanas OTP.",
    "Version: v1.7.44, cache PWA v412.",
  ],
};

const v145_de: ChangelogEntry = {
  version: "v1.7.45",
  date: "2026-08-20",
  title: "Layout-Korrektur der Einstellungsseite: Abschneiden, untere Lücke und Overlays",
  items: [
    "components/ui/BentoCard: Inhalt nutzt flex min-h-0 flex-1, damit Einstellungszeilen nicht abgeschnitten werden.",
    "components/settings/SettingsContent: unterer Padding von pb-20 auf pb-12 reduziert, um den schwarzen Leerraum am Scroll-Ende zu verringern.",
    "components/settings/SettingsLayout: schwebende SettingsBottomBar-Aktionsleiste entfernt.",
    "Typografie, Textskala und Glas & Effekte Karten werden jetzt vollständig angezeigt.",
    "Version: v1.7.45, PWA-Cache v413.",
  ],
};

const v144_de: ChangelogEntry = {
  version: "v1.7.44",
  date: "2026-08-20",
  title: "Akzentfarbe des Anmeldebuttons angleichen",
  items: [
    "app/globals.css: Standard-Tokens --accent-primary, --glow-color, --border-active, --accent-secondary und --accent-soft sind jetzt am Standard-Akzent Violett ausgerichtet.",
    "Sende-Code- und Anmelde-Buttons verwenden jetzt die gleiche Akzentfarbe wie die OTP-Tabs.",
    "Version: v1.7.44, PWA-Cache v412.",
  ],
};

const v139_fr: ChangelogEntry = {
  version: "v1.7.39",
  date: "2026-08-20",
  title: "Widget météo : icône au-dessus des informations",
  items: [
    "Icône météo empilée au-dessus de la température, condition et ville.",
    "Mode compact conserve l'affichage horizontal.",
    "Version : v1.7.39, cache PWA v407.",
  ],
};

const v139_en: ChangelogEntry = {
  version: "v1.7.39",
  date: "2026-08-20",
  title: "Weather widget: icon above information",
  items: [
    "Weather icon stacked above temperature, condition and city.",
    "Compact mode keeps horizontal layout.",
    "Version: v1.7.39, PWA cache v407.",
  ],
};

const v139_es: ChangelogEntry = {
  version: "v1.7.39",
  date: "2026-08-20",
  title: "Widget del clima: icono sobre la información",
  items: [
    "Icono del clima apilado sobre temperatura, condición y ciudad.",
    "El modo compacto mantiene el diseño horizontal.",
    "Versión: v1.7.39, caché PWA v407.",
  ],
};

const v139_de: ChangelogEntry = {
  version: "v1.7.39",
  date: "2026-08-20",
  title: "Wetter-Widget: Icon über den Informationen",
  items: [
    "Wetter-Icon über Temperatur, Zustand und Stadt gestapelt.",
    "Kompaktmodus behält horizontales Layout bei.",
    "Version: v1.7.39, PWA-Cache v407.",
  ],
};

const v138_fr: ChangelogEntry = {
  version: "v1.7.38",
  date: "2026-08-20",
  title: "Dynamic Island : plus d'ouverture auto au demarrage/refresh",
  items: [
    "L'ilot est force ferme a chaque montage/refresh.",
    "Verrou de montage de 500 ms pour ignorer les mouseenter parasites.",
    "Garde relatedTarget === null conservee.",
    "Version : v1.7.38, cache PWA v406.",
  ],
};

const v138_en: ChangelogEntry = {
  version: "v1.7.38",
  date: "2026-08-20",
  title: "Dynamic Island: no auto-open on startup/refresh",
  items: [
    "Island is forced closed on every mount/refresh.",
    "500 ms mount lock to ignore spurious mouseenter events.",
    "relatedTarget === null guard preserved.",
    "Version: v1.7.38, PWA cache v406.",
  ],
};

const v138_es: ChangelogEntry = {
  version: "v1.7.38",
  date: "2026-08-20",
  title: "Dynamic Island: sin apertura automatica al iniciar/refrescar",
  items: [
    "La isla se fuerza cerrada en cada montaje/refresco.",
    "Bloqueo de montaje de 500 ms para ignorar mouseenter espurios.",
    "relatedTarget === null seguira protegido.",
    "Versión: v1.7.38, caché PWA v406.",
  ],
};

const v138_de: ChangelogEntry = {
  version: "v1.7.38",
  date: "2026-08-20",
  title: "Dynamic Island: kein automatisches Oeffnen beim Start/Refresh",
  items: [
    "Insel wird bei jedem Mount/Refresh geschlossen gezwungen.",
    "500 ms Mount-Sperre ignoriert fehlerhafte mouseenter-Ereignisse.",
    "relatedTarget === null Waechter bleibt erhalten.",
    "Version: v1.7.38, PWA-Cache v406.",
  ],
};

const v137_fr: ChangelogEntry = {
  version: "v1.7.37",
  date: "2026-08-20",
  title: "Animation de chargement ETHONE OS restaurée",
  items: [
    "Retrouvee et restauree l'animation du loader ETHONE OS.",
    "Loading.tsx affiche BrandMark, ETHONE OS, barre de progres avec shimmer.",
    "Pourcentage affiche sous la barre.",
    "Version : v1.7.37, cache PWA v405.",
  ],
};

const v137_en: ChangelogEntry = {
  version: "v1.7.37",
  date: "2026-08-20",
  title: "ETHONE OS loading animation restored",
  items: [
    "Found and restored the ETHONE OS loading animation.",
    "Loading.tsx now shows BrandMark, ETHONE OS, and a shimmer progress bar.",
    "Percentage shown below the bar.",
    "Version: v1.7.37, PWA cache v405.",
  ],
};

const v137_es: ChangelogEntry = {
  version: "v1.7.37",
  date: "2026-08-20",
  title: "Animación de carga ETHONE OS restaurada",
  items: [
    "Encontrada y restaurada la animación de carga ETHONE OS.",
    "Loading.tsx muestra BrandMark, ETHONE OS y una barra de progreso brillante.",
    "El porcentaje se muestra debajo de la barra.",
    "Versión: v1.7.37, caché PWA v405.",
  ],
};

const v137_de: ChangelogEntry = {
  version: "v1.7.37",
  date: "2026-08-20",
  title: "ETHONE OS-Ladeanimation wiederhergestellt",
  items: [
    "ETHONE OS-Ladeanimation aus der Historie gefunden und wiederhergestellt.",
    "Loading.tsx zeigt BrandMark, ETHONE OS und einen leuchtenden Fortschrittsbalken.",
    "Prozentsatz unter der Leiste angezeigt.",
    "Version: v1.7.37, PWA-Cache v405.",
  ],
};

const v136_fr: ChangelogEntry = {
  version: "v1.7.36",
  date: "2026-08-20",
  title: "Écran de chargement forcé jusqu'à 100 %",
  items: [
    "BootProvider gère une barre de progression déterminée de 0 à 100 %.",
    "Le dashboard ne s'affiche qu'après auth + profil + progression atteinte.",
    "Le Loader et le Loading affichent le vrai pourcentage.",
    "Version : v1.7.36, cache PWA v404.",
  ],
};

const v136_en: ChangelogEntry = {
  version: "v1.7.36",
  date: "2026-08-20",
  title: "Forced loading screen until 100 %",
  items: [
    "BootProvider now drives a determinate 0-100 % progress bar.",
    "The dashboard only shows once auth, profile, and minimum load progress are complete.",
    "Loader and Loading display the real percentage.",
    "Version: v1.7.36, PWA cache v404.",
  ],
};

const v136_es: ChangelogEntry = {
  version: "v1.7.36",
  date: "2026-08-20",
  title: "Pantalla de carga forzada hasta el 100 %",
  items: [
    "BootProvider ahora controla una barra de progreso determinada del 0 al 100 %.",
    "El dashboard solo se muestra cuando auth, perfil y progreso mínimo están completos.",
    "Loader y Loading muestran el porcentaje real.",
    "Versión: v1.7.36, caché PWA v404.",
  ],
};

const v136_de: ChangelogEntry = {
  version: "v1.7.36",
  date: "2026-08-20",
  title: "Ladebildschirm bis 100 % erzwungen",
  items: [
    "BootProvider steuert jetzt einen bestimmten 0-100 %-Fortschrittsbalken.",
    "Das Dashboard wird erst nach Auth, Profil und Mindestladefortschritt angezeigt.",
    "Loader und Loading zeigen den echten Prozentsatz.",
    "Version: v1.7.36, PWA-Cache v404.",
  ],
};

const v135_fr: ChangelogEntry = {
  version: "v1.7.35",
  date: "2026-08-20",
  title: "Dynamic Island : l'heure toujours visible en compact",
  items: [
    "Le compact de la Dynamic Island affiche désormais toujours l'heure.",
    "Les activités (Spotify, Pomodoro, Brain) restent accessibles dans la vue étendue.",
    "Suppression des anciens composants devenus inutiles.",
    "Version : v1.7.35, cache PWA v403.",
  ],
};

const v135_en: ChangelogEntry = {
  version: "v1.7.35",
  date: "2026-08-20",
  title: "Dynamic Island: clock always visible in compact",
  items: [
    "The Dynamic Island compact now always shows the current time.",
    "Activities (Spotify, Pomodoro, Brain) remain accessible in the expanded view.",
    "Removed obsolete compact components.",
    "Version: v1.7.35, PWA cache v403.",
  ],
};

const v135_es: ChangelogEntry = {
  version: "v1.7.35",
  date: "2026-08-20",
  title: "Dynamic Island: el reloj siempre visible en el compacto",
  items: [
    "El compacto de la Dynamic Island ahora muestra siempre la hora actual.",
    "Las actividades (Spotify, Pomodoro, Brain) siguen accesibles en la vista expandida.",
    "Se eliminaron componentes compactos obsoletos.",
    "Versión: v1.7.35, caché PWA v403.",
  ],
};

const v135_de: ChangelogEntry = {
  version: "v1.7.35",
  date: "2026-08-20",
  title: "Dynamic Island: Uhr im Kompaktmodus immer sichtbar",
  items: [
    "Der Kompaktmodus der Dynamic Island zeigt jetzt immer die aktuelle Uhrzeit.",
    "Aktivitäten (Spotify, Pomodoro, Brain) bleiben in der erweiterten Ansicht verfügbar.",
    "Veraltete Kompakt-Komponenten entfernt.",
    "Version: v1.7.35, PWA-Cache v403.",
  ],
};

const v134_fr: ChangelogEntry = {
  version: "v1.7.34",
  date: "2026-08-20",
  title: "Résilience et complétude des pochettes Spotify",
  items: [
    "Worker Spotify : images depuis album.images, item.images (épisodes) et show.images (podcasts).",
    "Tri par taille décroissante pour la meilleure qualité.",
    "Fallback Worker vers /v1/albums/{id} si currently-playing n'a pas d'image.",
    "Client useNowPlaying : liste covers dédupliquée et complète.",
    "ClientImage : timeout actif pour toutes les sources (4 s par défaut).",
    "SpotifyCompact et Dynamic Island : timeout 3 s pour fallback rapide.",
    "Version : v1.7.34, cache PWA v402.",
  ],
};

const v134_en: ChangelogEntry = {
  version: "v1.7.34",
  date: "2026-08-20",
  title: "Spotify artwork resilience and completeness",
  items: [
    "Spotify Worker: images from album.images, item.images (episodes) and show.images (podcasts).",
    "Sorted by descending size for best quality.",
    "Worker fallback to /v1/albums/{id} when currently-playing has no image.",
    "Client useNowPlaying: deduplicated and complete covers list.",
    "ClientImage: timeout active for all sources (4 s default).",
    "SpotifyCompact and Dynamic Island: 3 s timeout for fast fallback.",
    "Version: v1.7.34, PWA cache v402.",
  ],
};

const v134_es: ChangelogEntry = {
  version: "v1.7.34",
  date: "2026-08-20",
  title: "Resiliencia y completez de las carátulas de Spotify",
  items: [
    "Worker Spotify: imágenes desde album.images, item.images (episodios) y show.images (podcasts).",
    "Ordenadas por tamaño descendente para la mejor calidad.",
    "Fallback Worker a /v1/albums/{id} si currently-playing no tiene imagen.",
    "Cliente useNowPlaying: lista covers sin duplicados y completa.",
    "ClientImage: timeout activo para todas las fuentes (4 s por defecto).",
    "SpotifyCompact y Dynamic Island: timeout 3 s para fallback rápido.",
    "Versión: v1.7.34, caché PWA v402.",
  ],
};

const v134_de: ChangelogEntry = {
  version: "v1.7.34",
  date: "2026-08-20",
  title: "Spotify-Cover: Belastbarkeit und Vollständigkeit",
  items: [
    "Spotify-Worker: Bilder von album.images, item.images (Episoden) und show.images (Podcasts).",
    "Absteigend nach Größe sortiert für beste Qualität.",
    "Worker-Fallback zu /v1/albums/{id}, wenn currently-playing kein Bild liefert.",
    "Client useNowPlaying: deduplizierte und vollständige Covers-Liste.",
    "ClientImage: Timeout für alle Quellen aktiv (4 s Standard).",
    "SpotifyCompact und Dynamic Island: 3 s Timeout für schnellen Fallback.",
    "Version: v1.7.34, PWA-Cache v402.",
  ],
};

const v133_fr: ChangelogEntry = {
  version: "v1.7.33",
  date: "2026-08-20",
  title: "Nettoyage topbar : retrait du pill média dupliqué",
  items: [
    "Suppression du TopBarMediaPill dans la topbar.",
    "Le média et le contrôle Spotify restent uniquement dans la Dynamic Island.",
    "La topbar garde son alignement 3 colonnes.",
    "Version : v1.7.33, cache PWA v401.",
  ],
};

const v133_en: ChangelogEntry = {
  version: "v1.7.33",
  date: "2026-08-20",
  title: "Topbar cleanup: remove duplicated media pill",
  items: [
    "Removed TopBarMediaPill from the topbar.",
    "Media and Spotify controls now live only in the Dynamic Island.",
    "Topbar keeps its 3-column layout.",
    "Version: v1.7.33, PWA cache v401.",
  ],
};

const v133_es: ChangelogEntry = {
  version: "v1.7.33",
  date: "2026-08-20",
  title: "Limpieza de topbar: eliminar el pill de medios duplicado",
  items: [
    "Se eliminó TopBarMediaPill de la topbar.",
    "El medio y los controles de Spotify ahora solo están en la Dynamic Island.",
    "La topbar mantiene su diseño de 3 columnas.",
    "Versión: v1.7.33, caché PWA v401.",
  ],
};

const v133_de: ChangelogEntry = {
  version: "v1.7.33",
  date: "2026-08-20",
  title: "Topbar-Bereinigung: duplizierten Medien-Button entfernt",
  items: [
    "TopBarMediaPill aus der Topbar entfernt.",
    "Medien- und Spotify-Steuerung jetzt nur noch in der Dynamic Island.",
    "Topbar behält ihr 3-Spalten-Layout.",
    "Version: v1.7.33, PWA-Cache v401.",
  ],
};

const v132_fr: ChangelogEntry = {
  version: "v1.7.32",
  date: "2026-08-20",
  title: "Refonte UI/UX : alignement strict du layout et optimisations performances",
  items: [
    "Suppression de la bande latérale sombre à gauche : padding gauche retiré du Shell et panneau sidebar affleurant.",
    "Centrage vertical des icônes en mode réduit et alignement strict de l'avatar, de la sync et des boutons du bas.",
    "Topbar en h-14 avec grille 3 colonnes : breadcrumb, statuts + média, météo/commandes/profil.",
    "Nouveau TopBarMediaPill intégrant le morceau en cours dans le flux horizontal.",
    "Dynamic Island repositionnée sous la topbar pour éviter les chevauchements.",
    "Memoisation des sous-composants de TopBar et Sidebar pour limiter les re-rendus.",
    "Version : v1.7.32, cache PWA v400.",
  ],
};

const v132_en: ChangelogEntry = {
  version: "v1.7.32",
  date: "2026-08-20",
  title: "UI/UX overhaul: strict layout alignment and performance optimizations",
  items: [
    "Removed the dark left strip: no left padding in Shell and flush sidebar panel.",
    "Vertically centered icons in collapsed mode and strict alignment of avatar, sync and bottom buttons.",
    "Topbar h-14 with a 3-column grid: breadcrumb, status + media, weather/commands/profile.",
    "New TopBarMediaPill showing the current track in the topbar flow.",
    "Dynamic Island repositioned below the topbar to avoid overlap.",
    "Memoized TopBar and Sidebar subcomponents to reduce re-renders.",
    "Version: v1.7.32, PWA cache v400.",
  ],
};

const v132_es: ChangelogEntry = {
  version: "v1.7.32",
  date: "2026-08-20",
  title: "Rediseño UI/UX: alineación estricta y optimización del rendimiento",
  items: [
    "Eliminación de la banda lateral oscura: sin padding izquierdo en Shell y panel de sidebar al ras.",
    "Iconos centrados verticalmente en modo reducido y alineación estricta del avatar, sync y botones inferiores.",
    "Topbar en h-14 con rejilla de 3 columnas: breadcrumb, estados + multimedia, clima/comandos/perfil.",
    "Nuevo TopBarMediaPill que muestra la pista actual en el flujo de la topbar.",
    "Dynamic Island reposicionada bajo la topbar para evitar solapamientos.",
    "Memoización de subcomponentes de TopBar y Sidebar para reducir re-renderizados.",
    "Versión: v1.7.32, caché PWA v400.",
  ],
};

const v132_de: ChangelogEntry = {
  version: "v1.7.32",
  date: "2026-08-20",
  title: "UI/UX-Overhaul: Strukturausrichtung und Performance-Optimierungen",
  items: [
    "Dunkler Streifen links entfernt: kein linkes Padding im Shell und bündiges Sidebar-Panel.",
    "Symbole im reduzierten Modus vertikal zentriert und strenge Ausrichtung von Avatar, Sync und unteren Buttons.",
    "Topbar in h-14 mit 3-Spalten-Raster: Breadcrumb, Status + Medien, Wetter/Befehle/Profil.",
    "Neues TopBarMediaPill zeigt den aktuellen Titel im Topbar-Fluss.",
    "Dynamic Island unter die Topbar verschoben, um Überlappungen zu vermeiden.",
    "TopBar- und Sidebar-Subkomponenten memoisiert, um Re-Renders zu reduzieren.",
    "Version: v1.7.32, PWA-Cache v400.",
  ],
};

const v131_fr: ChangelogEntry = {
  version: "v1.7.31",
  date: "2026-08-20",
  title: "Gaming Riot : cartes 3D Valorant et League of Legends",
  items: [
    "Nouvelles cartes `RiotGamingCard` pour Valorant et League of Legends dans le Bento Live.",
    "Pochette agent/champion, résultat, K/D/A, KDA, winrate (5 dernières parties) et ADR/CS/min.",
    "Intégration dans `LiveBentoGrid` (home) et `LiveWidgets` (activité).",
    "Fallback multi-URL pour l'image du champion et de l'agent.",
    "Version : v1.7.31, cache PWA v399.",
  ],
};

const v131_en: ChangelogEntry = {
  version: "v1.7.31",
  date: "2026-08-20",
  title: "Riot Gaming: 3D Valorant and League of Legends cards",
  items: [
    "New `RiotGamingCard` cards for Valorant and League of Legends in the Live Bento.",
    "Agent/champion artwork, result, K/D/A, KDA, winrate (last 5 matches) and ADR/CS/min.",
    "Integrated in `LiveBentoGrid` (home) and `LiveWidgets` (activity).",
    "Multi-URL fallback for champion and agent images.",
    "Version: v1.7.31, PWA cache v399.",
  ],
};

const v131_es: ChangelogEntry = {
  version: "v1.7.31",
  date: "2026-08-20",
  title: "Gaming Riot: cartas 3D de Valorant y League of Legends",
  items: [
    "Nuevas cartas `RiotGamingCard` para Valorant y League of Legends en el Bento Live.",
    "Imagen del agente/campeón, resultado, K/D/A, KDA, winrate (últimas 5 partidas) y ADR/CS/min.",
    "Integración en `LiveBentoGrid` (inicio) y `LiveWidgets` (actividad).",
    "Fallback multi-URL para la imagen del campeón y del agente.",
    "Versión: v1.7.31, caché PWA v399.",
  ],
};

const v131_de: ChangelogEntry = {
  version: "v1.7.31",
  date: "2026-08-20",
  title: "Riot Gaming: 3D-Karten für Valorant und League of Legends",
  items: [
    "Neue `RiotGamingCard`-Karten für Valorant und League of Legends im Live-Bento.",
    "Agent/Champion-Artwork, Ergebnis, K/D/A, KDA, Winrate (letzte 5 Spiele) und ADR/CS/min.",
    "Integration in `LiveBentoGrid` (Startseite) und `LiveWidgets` (Aktivität).",
    "Multi-URL-Fallback für Champion- und Agent-Bilder.",
    "Version: v1.7.31, PWA-Cache v399.",
  ],
};

const v130_fr: ChangelogEntry = {
  version: "v1.7.30",
  date: "2026-08-20",
  title: "Performance : fluidité du système et optimisations visuelles",
  items: [
    "Optimisation des polices : chargement Inter + JetBrains Mono avec display swap et sous-ensemble latin.",
    "Lazy loading des panneaux lourds (settings, AI, live, intégrations) et du profil avec squelettes CSS.",
    "Mise en cache mémoire des requêtes Worker (fetchWorkerCached) avec SWR-like TTL de 5 secondes.",
    "Réduction des re-rendus : React.memo sur TopBar, Sidebar, Dock, BentoCard, SettingsSection et SettingField.",
    "Dynamic Island : progression Spotify directement via le DOM et requestAnimationFrame.",
    "TiltCard : calculs de rotation planifiés sur requestAnimationFrame pour limiter le travail sur pointermove.",
    "Modération du flou et remplacement des transitions globales par des transitions GPU-only (transform/opacity).",
    "Worker : headers Cache-Control public s-maxage=5 stale-while-revalidate=30 pour les GET publics.",
    "Version : v1.7.30.",
  ],
};

const v130_en: ChangelogEntry = {
  version: "v1.7.30",
  date: "2026-08-20",
  title: "Performance: system fluidity and visual optimizations",
  items: [
    "Font optimization: Inter + JetBrains Mono loading with display swap and latin subset.",
    "Lazy loading of heavy panels (settings, AI, live, integrations) and profile with CSS skeletons.",
    "In-memory Worker request cache (fetchWorkerCached) with SWR-like 5-second TTL.",
    "Reduced re-renders: React.memo on TopBar, Sidebar, Dock, BentoCard, SettingsSection and SettingField.",
    "Dynamic Island: Spotify progress updated via direct DOM and requestAnimationFrame.",
    "TiltCard: rotation calculations scheduled on requestAnimationFrame to reduce pointermove work.",
    "Blur moderation and replacement of global transitions with GPU-only (transform/opacity) transitions.",
    "Worker: public GET Cache-Control headers with s-maxage=5 and stale-while-revalidate=30.",
    "Version: v1.7.30.",
  ],
};

const v130_es: ChangelogEntry = {
  version: "v1.7.30",
  date: "2026-08-20",
  title: "Rendimiento: fluidez del sistema y optimizaciones visuales",
  items: [
    "Optimización de fuentes: carga de Inter + JetBrains Mono con display swap y subconjunto latino.",
    "Lazy loading de paneles pesados (ajustes, IA, live, integraciones) y perfil con esqueletos CSS.",
    "Caché en memoria de peticiones Worker (fetchWorkerCached) con TTL SWR-like de 5 segundos.",
    "Reducción de re-renderizados: React.memo en TopBar, Sidebar, Dock, BentoCard, SettingsSection y SettingField.",
    "Dynamic Island: progreso de Spotify actualizado directamente en el DOM y requestAnimationFrame.",
    "TiltCard: cálculos de rotación programados en requestAnimationFrame para reducir trabajo en pointermove.",
    "Moderación del desenfoque y sustitución de transiciones globales por transiciones GPU-only (transform/opacity).",
    "Worker: headers Cache-Control público s-maxage=5 y stale-while-revalidate=30 para GET.",
    "Versión: v1.7.30.",
  ],
};

const v130_de: ChangelogEntry = {
  version: "v1.7.30",
  date: "2026-08-20",
  title: "Leistung: Systemfluidität und visuelle Optimierungen",
  items: [
    "Schriftarten-Optimierung: Laden von Inter + JetBrains Mono mit display swap und lateinischem Subset.",
    "Lazy Loading schwerer Panels (Einstellungen, KI, Live, Integrationen) und Profils mit CSS-Skeletons.",
    "Arbeitsspeicher-Cache für Worker-Anfragen (fetchWorkerCached) mit SWR-ähnlichem 5-Sekunden-TTL.",
    "Weniger Re-Renders: React.memo auf TopBar, Sidebar, Dock, BentoCard, SettingsSection und SettingField.",
    "Dynamic Island: Spotify-Fortschritt direkt über DOM und requestAnimationFrame aktualisiert.",
    "TiltCard: Rotationsberechnungen auf requestAnimationFrame geplant, um pointermove-Last zu reduzieren.",
    "Unschärfe-Moderation und Ersetzung globaler Übergänge durch GPU-only-Übergänge (transform/opacity).",
    "Worker: Public Cache-Control-Header s-maxage=5 und stale-while-revalidate=30 für GET.",
    "Version: v1.7.30.",
  ],
};

const v329_fr: ChangelogEntry = {
  version: "v1.7.48",
  date: "2026-08-21",
  title: "Météo, avatar Discord et skin Minecraft",
  items: [
    "Ajout d'un onglet Météo dans la sidebar et le dock.",
    "Correction du mapping Lanyard pour afficher la photo de profil Discord.",
    "Correction du chargement du skin Minecraft dans les widgets live.",
    "Version affichée en bas à droite : v1.7.48.",
  ],
};

const v329_en: ChangelogEntry = {
  version: "v1.7.48",
  date: "2026-08-21",
  title: "Weather tab, Discord avatar and Minecraft skin",
  items: [
    "Added a Weather tab in the sidebar and dock.",
    "Fixed Lanyard mapping so Discord profile picture is displayed.",
    "Fixed Minecraft skin loading in live widgets.",
    "Version badge bottom-right: v1.7.48.",
  ],
};

const v329_es: ChangelogEntry = {
  version: "v1.7.48",
  date: "2026-08-21",
  title: "Clima, avatar de Discord y skin de Minecraft",
  items: [
    "Nueva pestaña Clima en la barra lateral y el dock.",
    "Corregido el mapeo de Lanyard para mostrar el avatar de Discord.",
    "Corregida la carga del skin de Minecraft en los widgets live.",
    "Versión mostrada abajo a la derecha: v1.7.48.",
  ],
};

const v329_de: ChangelogEntry = {
  version: "v1.7.48",
  date: "2026-08-21",
  title: "Wetter, Discord-Avatar und Minecraft-Skin",
  items: [
    "Neuer Wetter-Tab in der Seitenleiste und im Dock.",
    "Lanyard-Mapping korrigiert, damit das Discord-Profilbild angezeigt wird.",
    "Laden des Minecraft-Skins in den Live-Widgets korrigiert.",
    "Version unten rechts: v1.7.48.",
  ],
};

const v330_fr: ChangelogEntry = {
  version: "v1.7.50",
  date: "2026-08-22",
  title: "Mise à jour automatique en direct (Capacitor Live Server)",
  items: [
    "`capacitor.config.ts` : ajout de `server.url: 'https://ethone.dev'`, `cleartext: true` et `androidScheme: 'https'`.",
    "Capacitor charge désormais l'application distante depuis `https://ethone.dev` : mises à jour web instantanées sans recompilation ni réinstallation.",
    "Android : `android:usesCleartextTraffic=\"true\"` ajouté au `AndroidManifest.xml`.",
    "iOS : chargement HTTPS pris en charge par App Transport Security (ATS).",
    "Workflow GitHub Actions `build-ios.yml` synchronisé avec la nouvelle configuration Capacitor (`npx cap sync ios`).",
    "Version affichée en bas à droite : v1.7.50.",
  ],
};

const v330_en: ChangelogEntry = {
  version: "v1.7.50",
  date: "2026-08-22",
  title: "Live auto-update (Capacitor Live Server)",
  items: [
    "`capacitor.config.ts` : added `server.url: 'https://ethone.dev'`, `cleartext: true` and `androidScheme: 'https'`.",
    "Capacitor now loads the remote app from `https://ethone.dev`: instant web updates without recompiling or reinstalling.",
    "Android: added `android:usesCleartextTraffic=\"true\"` to `AndroidManifest.xml`.",
    "iOS: HTTPS loading supported by App Transport Security (ATS).",
    "GitHub Actions `build-ios.yml` workflow synced with the new Capacitor config (`npx cap sync ios`).",
    "Version badge bottom-right: v1.7.50.",
  ],
};

const v330_es: ChangelogEntry = {
  version: "v1.7.50",
  date: "2026-08-22",
  title: "Actualización automática en directo (Capacitor Live Server)",
  items: [
    "`capacitor.config.ts` : añadido `server.url: 'https://ethone.dev'`, `cleartext: true` y `androidScheme: 'https'`.",
    "Capacitor carga ahora la aplicación remota desde `https://ethone.dev`: actualizaciones web instantáneas sin recompilar ni reinstalar.",
    "Android: `android:usesCleartextTraffic=\"true\"` añadido al `AndroidManifest.xml`.",
    "iOS: carga HTTPS soportada por App Transport Security (ATS).",
    "Workflow de GitHub Actions `build-ios.yml` sincronizado con la nueva configuración Capacitor (`npx cap sync ios`).",
    "Versión mostrada abajo a la derecha: v1.7.50.",
  ],
};

const v330_de: ChangelogEntry = {
  version: "v1.7.50",
  date: "2026-08-22",
  title: "Automatisches Live-Update (Capacitor Live Server)",
  items: [
    "`capacitor.config.ts` : `server.url: 'https://ethone.dev'`, `cleartext: true` und `androidScheme: 'https'` hinzugefügt.",
    "Capacitor lädt die App jetzt remote von `https://ethone.dev`: sofortige Web-Updates ohne Neukompilierung oder Neuinstallation.",
    "Android: `android:usesCleartextTraffic=\"true\"` in die `AndroidManifest.xml` eingefügt.",
    "iOS: HTTPS-Laden wird von App Transport Security (ATS) unterstützt.",
    "GitHub Actions Workflow `build-ios.yml` mit der neuen Capacitor-Konfiguration synchronisiert (`npx cap sync ios`).",
    "Version unten rechts: v1.7.50.",
  ],
};

const v331_fr: ChangelogEntry = {
  version: "v1.7.51",
  date: "2026-08-22",
  title: "Correction build GitHub Actions (variables Supabase & export statique)",
  items: [
    "`lib/supabase.ts`, `lib/supabase-server.ts` et `proxy.ts` : fallback `https://placeholder.supabase.co` et `placeholder-anon-key` si `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont absents.",
    "Ces clients ne lèvent plus d'erreur bloquante lors du `next build` sans variables d'environnement.",
    "`app/plugins/[id]/page.tsx` : ajout de `export const dynamic = 'force-static'` en plus de `generateStaticParams`.",
    "`.github/workflows/build-ios.yml` : injection des variables de build `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_WORKER_URL` avec fallback.",
    "Validation : `npm run build` réussit avec les variables d'environnement Supabase vides.",
    "Version affichée en bas à droite : v1.7.51.",
  ],
};

const v331_en: ChangelogEntry = {
  version: "v1.7.51",
  date: "2026-08-22",
  title: "GitHub Actions build fix (Supabase env & static export)",
  items: [
    "`lib/supabase.ts`, `lib/supabase-server.ts` and `proxy.ts` : fallback to `https://placeholder.supabase.co` and `placeholder-anon-key` when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.",
    "These clients no longer throw a blocking error during `next build` without environment variables.",
    "`app/plugins/[id]/page.tsx` : added `export const dynamic = 'force-static'` alongside `generateStaticParams`.",
    "`.github/workflows/build-ios.yml` : injected build variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_WORKER_URL` with fallbacks.",
    "Validation: `npm run build` succeeds with empty Supabase environment variables.",
    "Version badge bottom-right: v1.7.51.",
  ],
};

const v331_es: ChangelogEntry = {
  version: "v1.7.51",
  date: "2026-08-22",
  title: "Corrección build GitHub Actions (variables Supabase y export estático)",
  items: [
    "`lib/supabase.ts`, `lib/supabase-server.ts` y `proxy.ts` : fallback a `https://placeholder.supabase.co` y `placeholder-anon-key` si faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`.",
    "Estos clientes ya no lanzan un error bloqueante durante `next build` sin variables de entorno.",
    "`app/plugins/[id]/page.tsx` : añadido `export const dynamic = 'force-static'` junto a `generateStaticParams`.",
    "`.github/workflows/build-ios.yml` : inyectadas las variables de build `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_WORKER_URL` con fallbacks.",
    "Validación: `npm run build` exitoso con las variables de entorno Supabase vacías.",
    "Versión mostrada abajo a la derecha: v1.7.51.",
  ],
};

const v331_de: ChangelogEntry = {
  version: "v1.7.51",
  date: "2026-08-22",
  title: "GitHub Actions Build-Fix (Supabase-Variablen & statischer Export)",
  items: [
    "`lib/supabase.ts`, `lib/supabase-server.ts` und `proxy.ts` : Fallback auf `https://placeholder.supabase.co` und `placeholder-anon-key`, wenn `NEXT_PUBLIC_SUPABASE_URL` oder `NEXT_PUBLIC_SUPABASE_ANON_KEY` fehlen.",
    "Diese Clients lösen während `next build` ohne Umgebungsvariablen keinen blockierenden Fehler mehr aus.",
    "`app/plugins/[id]/page.tsx` : `export const dynamic = 'force-static'` zusätzlich zu `generateStaticParams` hinzugefügt.",
    "`.github/workflows/build-ios.yml` : Build-Variablen `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` und `NEXT_PUBLIC_WORKER_URL` mit Fallbacks injiziert.",
    "Validierung: `npm run build` erfolgreich mit leeren Supabase-Umgebungsvariablen.",
    "Version unten rechts: v1.7.51.",
  ],
};

const v332_fr: ChangelogEntry = {
  version: "v1.7.52",
  date: "2026-08-22",
  title: "Correction topbar/sidebar overlap et double horloge",
  items: [
    "Suppression de la pilule d'horloge flottante orpheline dans `DynamicIslandContainer`.",
    "La Dynamic Island ne s'affiche que lorsqu'une activité est active (Spotify, Pomodoro, Brain).",
    "L'heure reste unique et centrée dans `SystemStatusPills` de la TopBar.",
    "`TopBar` passe en `pointer-events-none` avec ses zones interactives en `pointer-events-auto` pour ne plus bloquer les clics sur le haut de la sidebar.",
    "`Sidebar` passe en `z-30 pointer-events-auto` et la hauteur du panneau est corrigée (`h-[calc(100%-1rem)]`).",
    "Suppression du hack `style={{ height: 'calc(100% + 0.25rem)' }}` sur la sidebar.",
    "Version affichée en bas à droite : v1.7.52.",
  ],
};

const v332_en: ChangelogEntry = {
  version: "v1.7.52",
  date: "2026-08-22",
  title: "Fix topbar/sidebar overlap and duplicate clock",
  items: [
    "Removed the orphaned floating clock pill in `DynamicIslandContainer`.",
    "The Dynamic Island is now shown only when an activity is active (Spotify, Pomodoro, Brain).",
    "Time display remains unique and centered in `SystemStatusPills` in the TopBar.",
    "`TopBar` is now `pointer-events-none` with interactive areas as `pointer-events-auto` to avoid blocking clicks on the top of the sidebar.",
    "`Sidebar` is now `z-30 pointer-events-auto` and its panel height is fixed (`h-[calc(100%-1rem)]`).",
    "Removed the `style={{ height: 'calc(100% + 0.25rem)' }}` sidebar hack.",
    "Version badge bottom-right: v1.7.52.",
  ],
};

const v332_es: ChangelogEntry = {
  version: "v1.7.52",
  date: "2026-08-22",
  title: "Corregir superposición topbar/sidebar y reloj duplicado",
  items: [
    "Eliminada la píldora de reloj flotante huérfana en `DynamicIslandContainer`.",
    "La Isla Dinámica solo se muestra cuando hay una actividad activa (Spotify, Pomodoro, Brain).",
    "La hora sigue siendo única y centrada en `SystemStatusPills` de la TopBar.",
    "`TopBar` pasa a `pointer-events-none` con sus zonas interactivas en `pointer-events-auto` para no bloquear los clics en la parte superior de la barra lateral.",
    "`Sidebar` pasa a `z-30 pointer-events-auto` y la altura del panel se corrige (`h-[calc(100%-1rem)]`).",
    "Eliminado el hack `style={{ height: 'calc(100% + 0.25rem)' }}` de la barra lateral.",
    "Versión mostrada abajo a la derecha: v1.7.52.",
  ],
};

const v332_de: ChangelogEntry = {
  version: "v1.7.52",
  date: "2026-08-22",
  title: "Topbar/Sidebar-Überlappung und doppelte Uhr korrigiert",
  items: [
    "Verwaiste schwebende Uhren-Pille in `DynamicIslandContainer` entfernt.",
    "Die Dynamic Island wird nur noch bei aktiver Aktivität angezeigt (Spotify, Pomodoro, Brain).",
    "Die Uhrzeit bleibt einzigartig und zentriert in `SystemStatusPills` der TopBar.",
    "`TopBar` ist jetzt `pointer-events-none` mit interaktiven Bereichen als `pointer-events-auto`, um Klicks am oberen Rand der Sidebar nicht zu blockieren.",
    "`Sidebar` ist jetzt `z-30 pointer-events-auto` und die Panelhöhe ist korrigiert (`h-[calc(100%-1rem)]`).",
    "Der Hack `style={{ height: 'calc(100% + 0.25rem)' }}` der Sidebar entfernt.",
    "Version unten rechts: v1.7.52.",
  ],
};

const v338_fr: ChangelogEntry = {
  version: "v1.7.58",
  date: "2026-08-22",
  title: "Dock mobile flottant Liquid Glass",
  items: [
    "Remplacement de la bottom bar noire par un dock flottant en capsule.",
    "Positionnement `fixed bottom-4 left-1/2 -translate-x-1/2` avec `w-[92%] max-w-[380px] h-[64px]`.",
    "Coins très arrondis `rounded-[28px]` et `mb-[env(safe-area-inset-bottom)]`.",
    "Fond `rgba(18,18,24,0.70)`, `backdrop-blur-[24px] saturate-[190%]` et biseau lumineux.",
    "Ombre et reflet interne `inset 0 1px 1px rgba(255,255,255,0.20), 0 16px 32px -8px rgba(0,0,0,0.6)`.",
    "Pilule active arrondie `rounded-full bg-white/[0.10]` avec transition fluide.",
    "Padding `pb-28` sur le conteneur principal pour éviter tout recouvrement.",
    "Version affichée en bas à droite : v1.7.58.",
  ],
};

const v338_en: ChangelogEntry = {
  version: "v1.7.58",
  date: "2026-08-22",
  title: "Liquid Glass floating mobile dock",
  items: [
    "Replaced the black bottom bar with a floating capsule dock.",
    "Positioned `fixed bottom-4 left-1/2 -translate-x-1/2` with `w-[92%] max-w-[380px] h-[64px]`.",
    "Super-rounded `rounded-[28px]` corners and `mb-[env(safe-area-inset-bottom)]`.",
    "Background `rgba(18,18,24,0.70)`, `backdrop-blur-[24px] saturate-[190%]` and specular highlight.",
    "Shadow and inner glow `inset 0 1px 1px rgba(255,255,255,0.20), 0 16px 32px -8px rgba(0,0,0,0.6)`.",
    "Active pill `rounded-full bg-white/[0.10]` with smooth transition.",
    "Main container `pb-28` padding to avoid overlap.",
    "Version badge bottom-right: v1.7.58.",
  ],
};

const v338_es: ChangelogEntry = {
  version: "v1.7.58",
  date: "2026-08-22",
  title: "Dock móvil flotante Liquid Glass",
  items: [
    "Reemplazo de la barra inferior negra por un dock flotante en cápsula.",
    "Posicionado `fixed bottom-4 left-1/2 -translate-x-1/2` con `w-[92%] max-w-[380px] h-[64px]`.",
    "Esquinas muy redondeadas `rounded-[28px]` y `mb-[env(safe-area-inset-bottom)]`.",
    "Fondo `rgba(18,18,24,0.70)`, `backdrop-blur-[24px] saturate-[190%]` y bisel luminoso.",
    "Sombra y reflejo interno `inset 0 1px 1px rgba(255,255,255,0.20), 0 16px 32px -8px rgba(0,0,0,0.6)`.",
    "Píldora activa redondeada `rounded-full bg-white/[0.10]` con transición suave.",
    "Padding `pb-28` en el contenedor principal para evitar superposición.",
    "Versión mostrada abajo a la derecha: v1.7.58.",
  ],
};

const v338_de: ChangelogEntry = {
  version: "v1.7.58",
  date: "2026-08-22",
  title: "Schwimmendes Liquid Glass Mobile Dock",
  items: [
    "Ersetzen der schwarzen unteren Leiste durch ein schwebendes Kapsel-Dock.",
    "Positioniert `fixed bottom-4 left-1/2 -translate-x-1/2` mit `w-[92%] max-w-[380px] h-[64px]`.",
    "Sehr abgerundete Ecken `rounded-[28px]` und `mb-[env(safe-area-inset-bottom)]`.",
    "Hintergrund `rgba(18,18,24,0.70)`, `backdrop-blur-[24px] saturate-[190%]` und Lichtkante.",
    "Schatten und innerer Schein `inset 0 1px 1px rgba(255,255,255,0.20), 0 16px 32px -8px rgba(0,0,0,0.6)`.",
    "Aktive Pille `rounded-full bg-white/[0.10]` mit sanftem Übergang.",
    "`pb-28` Padding im Hauptcontainer zur Vermeidung von Überlappung.",
    "Version unten rechts: v1.7.58.",
  ],
};

const v340_fr: ChangelogEntry = {
  version: "v1.7.60",
  date: "2026-08-22",
  title: "Fusion complète : iOS, Android et Liquid Glass dans main",
  items: [
    "Intégration iOS : Liquid Glass Dock, Dynamic Island, Live Activities, haptiques, App Intents, WidgetKit, StandBy, Focus Filter, extensions de notification, CoreSpotlight.",
    "Intégration Android : Material You / Material 3 Expressive, Dynamic Color, Edge-to-Edge, Predictive Back, Quick Settings Tiles, App Shortcuts, widgets Jetpack Glance, services de premier plan Focus, Photo Picker, pliables / tablettes.",
    "Dock mobile web Liquid Glass : capsule flottante translucide avec flou, reflets, pastille active.",
    "Toutes les branches fonctionnalités fusionnées dans main.",
    "Version affichée en bas à droite : v1.7.60.",
  ],
};

const v340_en: ChangelogEntry = {
  version: "v1.7.60",
  date: "2026-08-22",
  title: "Full merge: iOS, Android and Liquid Glass into main",
  items: [
    "iOS integration: Liquid Glass Dock, Dynamic Island, Live Activities, haptics, App Intents, WidgetKit, StandBy, Focus Filter, notification extensions, CoreSpotlight.",
    "Android integration: Material You / Material 3 Expressive, Dynamic Color, Edge-to-Edge, Predictive Back, Quick Settings Tiles, App Shortcuts, Jetpack Glance widgets, Focus foreground service, Photo Picker, foldables / tablets.",
    "Liquid Glass mobile web dock: floating translucent capsule with blur, reflections, active pill.",
    "All feature branches merged into main.",
    "Version badge bottom-right: v1.7.60.",
  ],
};

const v340_es: ChangelogEntry = {
  version: "v1.7.60",
  date: "2026-08-22",
  title: "Fusión completa: iOS, Android y Liquid Glass en main",
  items: [
    "Integración iOS: Liquid Glass Dock, Dynamic Island, Live Activities, hápticos, App Intents, WidgetKit, StandBy, Focus Filter, extensiones de notificación, CoreSpotlight.",
    "Integración Android: Material You / Material 3 Expressive, Dynamic Color, Edge-to-Edge, Predictive Back, Quick Settings Tiles, App Shortcuts, widgets Jetpack Glance, servicio en primer plano Focus, Photo Picker, plegables / tablets.",
    "Dock web móvil Liquid Glass: cápsula flotante translúcida con desenfoque, reflejos, píldora activa.",
    "Todas las ramas de funcionalidades fusionadas en main.",
    "Versión mostrada abajo a la derecha: v1.7.60.",
  ],
};

const v340_de: ChangelogEntry = {
  version: "v1.7.60",
  date: "2026-08-22",
  title: "Vollständige Zusammenführung: iOS, Android und Liquid Glass in main",
  items: [
    "iOS-Integration: Liquid Glass Dock, Dynamic Island, Live Activities, Haptik, App Intents, WidgetKit, StandBy, Focus Filter, Benachrichtigungserweiterungen, CoreSpotlight.",
    "Android-Integration: Material You / Material 3 Expressive, Dynamic Color, Edge-to-Edge, Predictive Back, Quick Settings Tiles, App Shortcuts, Jetpack Glance Widgets, Focus-Vordergrund-Service, Photo Picker, faltbare Geräte / Tablets.",
    "Liquid Glass Mobile Web Dock: schwebende transluzente Kapsel mit Unschärfe, Reflexionen, aktiver Pille.",
    "Alle Feature-Branches in main zusammengeführt.",
    "Version unten rechts: v1.7.60.",
  ],
};

const v341_fr: ChangelogEntry = {
  version: "v1.7.61",
  date: "2026-08-22",
  title: "Dashboard en données réelles, polissage Brain/présence et cohérence thématique",
  items: [
    "Tuiles Bento du Dashboard connectées aux données Supabase : tâches ouvertes, événements du jour, notes, stockage utilisé avec affichage `Mo / Go`.",
    "Skeletons shimmer pendant le chargement des tuiles.",
    "Champ Brain : placeholder `Poser une question ou un objectif...` et capsule d'envoi avec glow.",
    "Sélecteur de présence synchronisé avec le profil et retour haptique.",
    "Remplacement des teintes vertes en dur par les variables du Theme Engine global.",
    "Version affichée en bas à droite : v1.7.61.",
  ],
};

const v341_en: ChangelogEntry = {
  version: "v1.7.61",
  date: "2026-08-22",
  title: "Dashboard real data, Brain/presence polish and theme consistency",
  items: [
    "Dashboard Bento tiles connected to real Supabase data: open tasks, today's events, notes, storage usage displayed as `Mo / Go`.",
    "Shimmer skeletons while tiles are loading.",
    "Brain input placeholder `Poser une question ou un objectif...` and send capsule with glow.",
    "Presence selector synced with profile and haptic feedback.",
    "Hardcoded green tints replaced with global Theme Engine variables.",
    "Version badge bottom-right: v1.7.61.",
  ],
};

const v341_es: ChangelogEntry = {
  version: "v1.7.61",
  date: "2026-08-22",
  title: "Dashboard con datos reales, pulido Brain/presencia y coherencia temática",
  items: [
    "Azulejos Bento del Dashboard conectados a Supabase: tareas abiertas, eventos de hoy, notas, uso de almacenamiento mostrado como `Mo / Go`.",
    "Skeletons shimmer mientras se cargan las tarjetas.",
    "Placeholder del campo Brain `Poser une question ou un objectif...` y cápsula de envío con glow.",
    "Selector de presencia sincronizado con el perfil y retroalimentación háptica.",
    "Tonos verdes codificados reemplazados por variables del Theme Engine global.",
    "Versión mostrada abajo a la derecha: v1.7.61.",
  ],
};

const v341_de: ChangelogEntry = {
  version: "v1.7.61",
  date: "2026-08-22",
  title: "Dashboard mit echten Daten, Brain/Präsenz-Polish und Theme-Konsistenz",
  items: [
    "Dashboard Bento-Kacheln mit Supabase verbunden: offene Aufgaben, heutige Ereignisse, Notizen, Speichernutzung als `Mo / Go`.",
    "Shimmer-Skeletons während des Ladens der Kacheln.",
    "Brain-Eingabe-Placeholder `Poser une question ou un objectif...` und Sendekapsel mit Glow.",
    "Präsenzselektor mit Profil synchronisiert und haptischem Feedback.",
    "Hartcodierte Grüntöne durch globale Theme-Engine-Variablen ersetzt.",
    "Version unten rechts: v1.7.61.",
  ],
};

const v342_fr: ChangelogEntry = {
  version: "v1.7.62",
  date: "2026-08-22",
  title: "Résolution des dépendances Capacitor manquantes pour le build CI",
  items: [
    "Ajout des plugins Capacitor utilisés par le code natif : app, share, status-bar, haptics, push-notifications, action-sheet, apple-sign-in, biometric-auth, app-shortcuts, badge, live-activity.",
    "Alignement des plugins sur la version majeure 7 de Capacitor Core.",
    "Suppression du fichier de merge résiduel `lib/apple.ts.theirs`.",
    "Version affichée en bas à droite : v1.7.62.",
  ],
};

const v342_en: ChangelogEntry = {
  version: "v1.7.62",
  date: "2026-08-22",
  title: "Added missing Capacitor dependencies for CI build",
  items: [
    "Added Capacitor plugins used by native code: app, share, status-bar, haptics, push-notifications, action-sheet, apple-sign-in, biometric-auth, app-shortcuts, badge, live-activity.",
    "Aligned plugins with Capacitor Core v7 major version.",
    "Removed leftover merge file `lib/apple.ts.theirs`.",
    "Version badge bottom-right: v1.7.62.",
  ],
};

const v342_es: ChangelogEntry = {
  version: "v1.7.62",
  date: "2026-08-22",
  title: "Resolución de dependencias Capacitor faltantes para el build de CI",
  items: [
    "Se agregaron los plugins de Capacitor usados por el código nativo: app, share, status-bar, haptics, push-notifications, action-sheet, apple-sign-in, biometric-auth, app-shortcuts, badge, live-activity.",
    "Alineación de plugins con la versión mayor 7 de Capacitor Core.",
    "Eliminación del archivo residual de merge `lib/apple.ts.theirs`.",
    "Versión mostrada abajo a la derecha: v1.7.62.",
  ],
};

const v342_de: ChangelogEntry = {
  version: "v1.7.62",
  date: "2026-08-22",
  title: "Fehlende Capacitor-Abhängigkeiten für CI-Build hinzugefügt",
  items: [
    "Capacitor-Plugins hinzugefügt, die vom nativen Code verwendet werden: app, share, status-bar, haptics, push-notifications, action-sheet, apple-sign-in, biometric-auth, app-shortcuts, badge, live-activity.",
    "Plugins an die Hauptversion 7 von Capacitor Core ausgerichtet.",
    "Übrig gebliebene Merge-Datei `lib/apple.ts.theirs` entfernt.",
    "Version unten rechts: v1.7.62.",
  ],
};

const v343_fr: ChangelogEntry = {
  version: "v1.7.63",
  date: "2026-08-22",
  title: "Intégration des frameworks Apple natifs iOS (APNs, StoreKit, Live Activities, App Intents)",
  items: [
    "Ajout de `@capacitor/local-notifications` et `@revenuecat/purchases-capacitor` pour les notifications locales et les achats intégrés.",
    "Nouvelle couche TS : `lib/notifications.ts` (APNs + locales interactives), `lib/purchases.ts` (StoreKit/RevenueCat), `lib/share.ts` et `lib/intents.ts`.",
    "Mise à jour de `capacitor.config.ts` : section `server` maintenue avec `url` et `cleartext`, config LocalNotifications.",
    "Mise à jour du `AppDelegate.swift` : catégories de notifications interactives (tâches, Brain, calendrier) et enregistrement APNs.",
    "Intents iOS ajoutés au target `App` (`EthoneAppIntents.swift`) pour Siri Shortcuts.",
    "Live Activity : `lib/live-activity.ts` déjà en place ; l'UI Widget/Dynamic Island nécessite une extension cible Xcode séparée.",
    "Face ID / Touch ID et Sign in with Apple restent opérationnels via `@aparajita/capacitor-biometric-auth` et `@capacitor-community/apple-sign-in`.",
    "Version affichée en bas à droite : v1.7.63.",
  ],
};

const v343_en: ChangelogEntry = {
  version: "v1.7.63",
  date: "2026-08-22",
  title: "Native Apple iOS frameworks integration (APNs, StoreKit, Live Activities, App Intents)",
  items: [
    "Added `@capacitor/local-notifications` and `@revenuecat/purchases-capacitor` for local notifications and in-app purchases.",
    "New TS layer: `lib/notifications.ts` (APNs + interactive local notifications), `lib/purchases.ts` (StoreKit/RevenueCat), `lib/share.ts` and `lib/intents.ts`.",
    "Updated `capacitor.config.ts`: `server` block kept with `url` and `cleartext`, LocalNotifications config.",
    "Updated `AppDelegate.swift`: interactive notification categories (tasks, Brain, calendar) and APNs registration.",
    "iOS App Intents added to `App` target (`EthoneAppIntents.swift`) for Siri Shortcuts.",
    "Live Activity: `lib/live-activity.ts` in place; Widget/Dynamic Island UI requires a separate Xcode extension target.",
    "Face ID / Touch ID and Sign in with Apple remain operational via `@aparajita/capacitor-biometric-auth` and `@capacitor-community/apple-sign-in`.",
    "Version badge bottom-right: v1.7.63.",
  ],
};

const v343_es: ChangelogEntry = {
  version: "v1.7.63",
  date: "2026-08-22",
  title: "Integración de frameworks Apple nativos iOS (APNs, StoreKit, Live Activities, App Intents)",
  items: [
    "Se agregaron `@capacitor/local-notifications` y `@revenuecat/purchases-capacitor` para notificaciones locales y compras integradas.",
    "Nueva capa TS: `lib/notifications.ts` (APNs + locales interactivas), `lib/purchases.ts` (StoreKit/RevenueCat), `lib/share.ts` y `lib/intents.ts`.",
    "`capacitor.config.ts` actualizado: sección `server` mantenida con `url` y `cleartext`, config LocalNotifications.",
    "`AppDelegate.swift` actualizado: categorías de notificaciones interactivas (tareas, Brain, calendario) y registro APNs.",
    "App Intents iOS agregados al target `App` (`EthoneAppIntents.swift`) para atajos de Siri.",
    "Live Activity: `lib/live-activity.ts` en su lugar; la UI Widget/Dynamic Island requiere un target de extensión Xcode separado.",
    "Face ID / Touch ID y Sign in with Apple siguen operativos vía `@aparajita/capacitor-biometric-auth` y `@capacitor-community/apple-sign-in`.",
    "Versión mostrada abajo a la derecha: v1.7.63.",
  ],
};

const v343_de: ChangelogEntry = {
  version: "v1.7.63",
  date: "2026-08-22",
  title: "Integration nativer Apple iOS-Frameworks (APNs, StoreKit, Live Activities, App Intents)",
  items: [
    "`@capacitor/local-notifications` und `@revenuecat/purchases-capacitor` hinzugefügt für lokale Benachrichtigungen und In-App-Käufe.",
    "Neue TS-Schicht: `lib/notifications.ts` (APNs + interaktive lokale Benachrichtigungen), `lib/purchases.ts` (StoreKit/RevenueCat), `lib/share.ts` und `lib/intents.ts`.",
    "`capacitor.config.ts` aktualisiert: `server`-Bereich mit `url` und `cleartext`, LocalNotifications-Konfiguration.",
    "`AppDelegate.swift` aktualisiert: interaktive Benachrichtigungskategorien (Aufgaben, Brain, Kalender) und APNs-Registrierung.",
    "iOS-App-Intents zum `App`-Target hinzugefügt (`EthoneAppIntents.swift`) für Siri-Kurzbefehle.",
    "Live Activity: `lib/live-activity.ts` vorhanden; Widget/Dynamic-Island-UI erfordert ein separates Xcode-Extension-Target.",
    "Face ID / Touch ID und Sign in with Apple bleiben über `@aparajita/capacitor-biometric-auth` und `@capacitor-community/apple-sign-in` verfügbar.",
    "Version unten rechts: v1.7.63.",
  ],
};

const v344_fr: ChangelogEntry = {
  version: "v1.8.0",
  date: "2026-08-22",
  title: "iOS 26 : Liquid Glass natif, App Entities et Control Widgets",
  items: [
    "Barre mobile inférieure recréée en Liquid Glass iOS 26 avec reflets, biseau et flou avancé.",
    "Nouveau variant `liquid` sur le composant `Button` pour les boutons Liquid Glass.",
    "Workflow GitHub Actions iOS basculé sur macos-26 + Xcode 26.6 (SDK iOS 26).",
    "Ajout de `EthoneAppEntities.swift` avec des `AppEntity` Notes et Tâches pour Siri / App Intents.",
    "Re-activation des Control Widgets iOS 18/26 (Focus, Note rapide, Idée Brain, Présence) dans le bundle `EthoneWidgets`.",
    "Target `EthoneWidgets` passé en `IPHONEOS_DEPLOYMENT_TARGET = 18.0` pour supporter les Controls.",
    "Version affichée en bas à droite : v1.8.0.",
  ],
};

const v344_en: ChangelogEntry = {
  version: "v1.8.0",
  date: "2026-08-22",
  title: "iOS 26: native Liquid Glass, App Entities and Control Widgets",
  items: [
    "Bottom mobile bar recreated in iOS 26 Liquid Glass with sheen, bevel and advanced blur.",
    "New `liquid` variant on `Button` component for Liquid Glass buttons.",
    "GitHub Actions iOS workflow switched to macos-26 + Xcode 26.6 (iOS 26 SDK).",
    "Added `EthoneAppEntities.swift` with Notes and Tasks `AppEntity` for Siri / App Intents.",
    "Re-enabled iOS 18/26 Control Widgets (Focus, Quick note, Brain idea, Presence) in the `EthoneWidgets` bundle.",
    "`EthoneWidgets` target moved to `IPHONEOS_DEPLOYMENT_TARGET = 18.0` to support Controls.",
    "Version badge bottom-right: v1.8.0.",
  ],
};

const v344_es: ChangelogEntry = {
  version: "v1.8.0",
  date: "2026-08-22",
  title: "iOS 26: Liquid Glass nativo, App Entities y Control Widgets",
  items: [
    "Barra inferior móvil recreada en Liquid Glass iOS 26 con reflejos, bisel y desenfoque avanzado.",
    "Nueva variante `liquid` en el componente `Button` para botones Liquid Glass.",
    "Workflow de GitHub Actions iOS migrado a macos-26 + Xcode 26.6 (SDK iOS 26).",
    "Añadido `EthoneAppEntities.swift` con `AppEntity` Notas y Tareas para Siri / App Intents.",
    "Reactivados los Control Widgets iOS 18/26 (Focus, Nota rápida, Idea Brain, Presencia) en el bundle `EthoneWidgets`.",
    "Target `EthoneWidgets` actualizado a `IPHONEOS_DEPLOYMENT_TARGET = 18.0` para soportar Controls.",
    "Versión mostrada abajo a la derecha: v1.8.0.",
  ],
};

const v344_de: ChangelogEntry = {
  version: "v1.8.0",
  date: "2026-08-22",
  title: "iOS 26: natives Liquid Glass, App Entities und Control Widgets",
  items: [
    "Untere mobile Leiste in iOS 26 Liquid Glass mit Schein, Fase und erweitertem Blur neu erstellt.",
    "Neue `liquid`-Variante der `Button`-Komponente für Liquid-Glass-Buttons.",
    "GitHub Actions iOS-Workflow auf macos-26 + Xcode 26.6 (iOS 26 SDK) umgestellt.",
    "`EthoneAppEntities.swift` mit Notizen- und Aufgaben-`AppEntity` für Siri / App Intents hinzugefügt.",
    "iOS 18/26 Control Widgets (Focus, Schnelle Notiz, Brain-Idee, Präsenz) im `EthoneWidgets`-Bundle reaktiviert.",
    "`EthoneWidgets`-Target auf `IPHONEOS_DEPLOYMENT_TARGET = 18.0` angehoben, um Controls zu unterstützen.",
    "Version unten rechts: v1.8.0.",
  ],
};

const v345_fr: ChangelogEntry = {
  version: "v1.8.1",
  date: "2026-08-22",
  title: "iOS 26/27 : AppIntents, IndexedEntity, Live Activity Liquid Glass, Extension de notification",
  items: [
    "Configuration build iOS : cible iOS 17+ (App) et 18+ (Widget), SDK iOS 26/27.",
    "`EthoneAppEntities.swift` : entités `IndexedEntity` Notes, Tâches, Projets et Sessions Focus pour Spotlight/Siri.",
    "Intents iOS 26 : créer une note, démarrer un Focus, changer de présence, ouvrir un projet/tâche.",
    "Live Activity en Liquid Glass natif : `glassEffect`, `GlassEffectContainer`, animations progressives, Always-On Display.",
    "Extension `EthoneNotificationService` pour badge, contenu enrichi et actions silencieuses.",
    "Fichier `EthoneIntelligence27.swift` préparé pour Foundation Models (iOS 27) avec `canImport(FoundationModels)`.",
    "Workflow CI passé sur runner `xcode-27` + `Xcode_27.0.app`.",
    "Version affichée en bas à droite : v1.8.1.",
  ],
};

const v345_en: ChangelogEntry = {
  version: "v1.8.1",
  date: "2026-08-22",
  title: "iOS 26/27: AppIntents, IndexedEntity, Liquid Glass Live Activity, Notification Extension",
  items: [
    "iOS build config: iOS 17+ (App) and 18+ (Widget) targets, iOS 26/27 SDK.",
    "`EthoneAppEntities.swift`: `IndexedEntity` entities for Notes, Tasks, Projects and Focus sessions for Spotlight/Siri.",
    "iOS 26 intents: create note, start Focus, change presence, open project/task.",
    "Native Liquid Glass Live Activity: `glassEffect`, `GlassEffectContainer`, smooth progress animations, Always-On Display.",
    "`EthoneNotificationService` extension for badge, rich content and silent actions.",
    "`EthoneIntelligence27.swift` prepared for Foundation Models (iOS 27) with `canImport(FoundationModels)`.",
    "CI workflow switched to `xcode-27` runner + `Xcode_27.0.app`.",
    "Version badge bottom-right: v1.8.1.",
  ],
};

const v345_es: ChangelogEntry = {
  version: "v1.8.1",
  date: "2026-08-22",
  title: "iOS 26/27: AppIntents, IndexedEntity, Live Activity Liquid Glass, Extensión de notificación",
  items: [
    "Configuración build iOS: objetivos iOS 17+ (App) y 18+ (Widget), SDK iOS 26/27.",
    "`EthoneAppEntities.swift`: entidades `IndexedEntity` Notas, Tareas, Proyectos y Sesiones Focus para Spotlight/Siri.",
    "Intents iOS 26: crear nota, iniciar Focus, cambiar presencia, abrir proyecto/tarea.",
    "Live Activity Liquid Glass nativo: `glassEffect`, `GlassEffectContainer`, animaciones progresivas, Always-On Display.",
    "Extensión `EthoneNotificationService` para badge, contenido enriquecido y acciones silenciosas.",
    "`EthoneIntelligence27.swift` preparado para Foundation Models (iOS 27) con `canImport(FoundationModels)`.",
    "Workflow de CI migrado a runner `xcode-27` + `Xcode_27.0.app`.",
    "Versión mostrada abajo a la derecha: v1.8.1.",
  ],
};

const v345_de: ChangelogEntry = {
  version: "v1.8.1",
  date: "2026-08-22",
  title: "iOS 26/27: AppIntents, IndexedEntity, Liquid Glass Live Activity, Benachrichtigungserweiterung",
  items: [
    "iOS-Build-Konfiguration: iOS 17+ (App) und 18+ (Widget), SDK iOS 26/27.",
    "`EthoneAppEntities.swift`: `IndexedEntity`-Entitäten für Notizen, Aufgaben, Projekte und Fokus-Sitzungen für Spotlight/Siri.",
    "iOS 26 Intents: Notiz erstellen, Fokus starten, Präsenz ändern, Projekt/Aufgabe öffnen.",
    "Native Liquid Glass Live Activity: `glassEffect`, `GlassEffectContainer`, flüssige Fortschrittsanimationen, Always-On Display.",
    "`EthoneNotificationService`-Erweiterung für Badge, erweiterte Inhalte und stille Aktionen.",
    "`EthoneIntelligence27.swift` für Foundation Models (iOS 27) vorbereitet mit `canImport(FoundationModels)`.",
    "CI-Workflow auf `xcode-27` Runner + `Xcode_27.0.app` umgestellt.",
    "Version unten rechts: v1.8.1.",
  ],
};

const v346_fr: ChangelogEntry = {
  version: "v1.8.2",
  date: "2026-08-22",
  title: "Audit et harmonisation globale UI/UX Liquid Glass & iOS 26",
  items: [
    "Cartes Bento du Dashboard, boutons, sélecteurs, modales et bottom sheets repassés en verre Liquid Glass (translucidité, flou, reflets, bordures réfractées).",
    "Composant Button : toutes les variantes utilisent désormais le style Liquid Glass avec rétroaction haptique par défaut.",
    "Composants Input, TextArea et SearchInput : conteneurs en verre semi-transparent avec `backdrop-blur-md` et bordures blanches subtiles.",
    "Capsule Brain : fond en verre fumé `liquid-glass-brain` avec lueur au focus et bouton d'envoi Liquid Glass.",
    "Haptiques systématiques sur les boutons, les cartes Bento, les sélecteurs, la modale, le bottom sheet et les actions Brain.",
    "Live Activity iOS 26 : ajout des modes presence et aura à EthoneLiveActivity.swift pour le suivi haute fréquence.",
    "Plugin EthoneFocus : synchronisation immédiate des widgets du Centre de Contrôle après changement de Focus ou Présence (`WidgetCenter.reloadAllTimelines`).",
    "Plugin EthoneSpotlight : CoreSpotlight prêt pour l'indexation des notes et tâches (`indexItems`, `deleteItems`, `deleteAllItems`).",
    "Fichier `liquid-glass.css` enrichi de classes `.liquid-glass-card`, `.liquid-glass-modal`, `.liquid-glass-sheet`, `.liquid-glass-select`, `.liquid-glass-brain`.",
    "Version affichée en bas à droite : v1.8.2.",
  ],
};

const v346_en: ChangelogEntry = {
  version: "v1.8.2",
  date: "2026-08-22",
  title: "Global Liquid Glass UI/UX audit and iOS 26 harmonisation",
  items: [
    "Dashboard Bento cards, buttons, selectors, modals and bottom sheets switched to Liquid Glass (translucency, blur, reflections, refracted borders).",
    "Button component: all variants now use Liquid Glass styling with default haptic feedback.",
    "Input, TextArea and SearchInput components: semi-transparent glass containers with `backdrop-blur-md` and subtle white borders.",
    "Brain capsule: smoked-glass `liquid-glass-brain` background with focus glow and Liquid Glass send button.",
    "Systematic haptics on buttons, Bento cards, selects, modals, bottom sheets and Brain actions.",
    "iOS 26 Live Activity: added presence and aura modes to EthoneLiveActivity.swift for high-frequency tracking.",
    "EthoneFocus plugin: instant Control Center widget sync after Focus or Presence change (`WidgetCenter.reloadAllTimelines`).",
    "EthoneSpotlight plugin: CoreSpotlight ready for notes and tasks indexing (`indexItems`, `deleteItems`, `deleteAllItems`).",
    "`liquid-glass.css` extended with `.liquid-glass-card`, `.liquid-glass-modal`, `.liquid-glass-sheet`, `.liquid-glass-select`, `.liquid-glass-brain` classes.",
    "Version badge bottom-right: v1.8.2.",
  ],
};

const v346_es: ChangelogEntry = {
  version: "v1.8.2",
  date: "2026-08-22",
  title: "Auditoría y armonización global UI/UX Liquid Glass y iOS 26",
  items: [
    "Tarjetas Bento del Dashboard, botones, selectores, modales y bottom sheets migrados a cristal Liquid Glass (translucidez, desenfoque, reflejos, bordes refractados).",
    "Componente Button: todas las variantes usan el estilo Liquid Glass con retroalimentación háptica por defecto.",
    "Componentes Input, TextArea y SearchInput: contenedores de cristal semitransparente con `backdrop-blur-md` y bordes blancos sutiles.",
    "Cápsula Brain: fondo de cristal ahumado `liquid-glass-brain` con brillo al focus y botón de envío Liquid Glass.",
    "Hápticos sistemáticos en botones, tarjetas Bento, selects, modales, bottom sheets y acciones Brain.",
    "Live Activity iOS 26: modos presence y aura añadidos a EthoneLiveActivity.swift para seguimiento de alta frecuencia.",
    "Plugin EthoneFocus: sincronización inmediata de los widgets del Centro de Control tras cambio de Focus o Presencia (`WidgetCenter.reloadAllTimelines`).",
    "Plugin EthoneSpotlight: CoreSpotlight listo para indexar notas y tareas (`indexItems`, `deleteItems`, `deleteAllItems`).",
    "`liquid-glass.css` ampliado con las clases `.liquid-glass-card`, `.liquid-glass-modal`, `.liquid-glass-sheet`, `.liquid-glass-select`, `.liquid-glass-brain`.",
    "Versión mostrada abajo a la derecha: v1.8.2.",
  ],
};

const v346_de: ChangelogEntry = {
  version: "v1.8.2",
  date: "2026-08-22",
  title: "Globale UI/UX-Liquid-Glass-Audit und iOS 26-Harmonisierung",
  items: [
    "Dashboard-Bento-Kacheln, Buttons, Selektoren, Modals und Bottom Sheets auf Liquid Glass (Transluzenz, Blur, Reflexionen, Lichtbrechung an Rändern) umgestellt.",
    "Button-Komponente: Alle Varianten nutzen nun Liquid-Glass-Styling mit standardmäßigem haptischem Feedback.",
    "Input, TextArea und SearchInput: Halbtransparente Glas-Container mit `backdrop-blur-md` und dezenten weißen Rändern.",
    "Brain-Kapsel: rauchiges Glas `liquid-glass-brain` mit Fokus-Glow und Liquid-Glass-Senden-Button.",
    "Systematische Haptik auf Buttons, Bento-Kacheln, Selects, Modals, Bottom Sheets und Brain-Aktionen.",
    "iOS 26 Live Activity: Modi presence und aura in EthoneLiveActivity.swift für Hochfrequenz-Tracking hinzugefügt.",
    "EthoneFocus-Plugin: Sofortige Synchronisation der Kontrollzentrum-Widgets nach Focus- oder Präsenz-Änderung (`WidgetCenter.reloadAllTimelines`).",
    "EthoneSpotlight-Plugin: CoreSpotlight bereit für die Indizierung von Notizen und Aufgaben (`indexItems`, `deleteItems`, `deleteAllItems`).",
    "`liquid-glass.css` erweitert um `.liquid-glass-card`, `.liquid-glass-modal`, `.liquid-glass-sheet`, `.liquid-glass-select`, `.liquid-glass-brain`.",
    "Version unten rechts: v1.8.2.",
  ],
};

const v347_fr: ChangelogEntry = {
  version: "v1.8.3",
  date: "2026-08-22",
  title: "Notifications locales gratuites : Pomodoro et rappels de tâches",
  items: [
    "Nouveau service `lib/local-notifications.ts` pour @capacitor/local-notifications (permission, planification, annulation).",
    "Notifications locales à la fin d'une session Focus/Pomodoro, même en arrière-plan et sans APNs.",
    "Planification automatique d'un rappel à l'échéance d'une tâche lors de la création ou modification.",
    "Annulation automatique du rappel si la tâche est marquée comme faite ou supprimée.",
    "Rappels re-planifiés au chargement des tâches pour couvrir les données existantes.",
    "`FocusProvider` synchronise la notification avec play/pause/reset et le Live Activity.",
    "Version affichée en bas à droite : v1.8.3.",
  ],
};

const v347_en: ChangelogEntry = {
  version: "v1.8.3",
  date: "2026-08-22",
  title: "Free local notifications: Pomodoro and task reminders",
  items: [
    "New `lib/local-notifications.ts` service for @capacitor/local-notifications (permissions, schedule, cancel).",
    "Local notification fired when a Focus/Pomodoro session ends, even in the background and without APNs.",
    "Automatic reminder scheduled at a task's due date on creation or update.",
    "Automatic reminder cancellation when a task is marked done or deleted.",
    "Reminders re-scheduled when tasks load to cover existing data.",
    "`FocusProvider` syncs the notification with play/pause/reset and the Live Activity.",
    "Version badge bottom-right: v1.8.3.",
  ],
};

const v347_es: ChangelogEntry = {
  version: "v1.8.3",
  date: "2026-08-22",
  title: "Notificaciones locales gratuitas: Pomodoro y recordatorios de tareas",
  items: [
    "Nuevo servicio `lib/local-notifications.ts` para @capacitor/local-notifications (permisos, programación, cancelación).",
    "Notificación local al finalizar una sesión Focus/Pomodoro, incluso en segundo plano y sin APNs.",
    "Recordatorio automático programado para la fecha de vencimiento de una tarea al crearla o modificarla.",
    "Cancelación automática del recordatorio cuando una tarea se marca como hecha o se elimina.",
    "Recordatorios reprogramados al cargar las tareas para cubrir los datos existentes.",
    "`FocusProvider` sincroniza la notificación con play/pause/reset y el Live Activity.",
    "Versión mostrada abajo a la derecha: v1.8.3.",
  ],
};

const v347_de: ChangelogEntry = {
  version: "v1.8.3",
  date: "2026-08-22",
  title: "Kostenlose lokale Benachrichtigungen: Pomodoro und Aufgabenerinnerungen",
  items: [
    "Neuer Dienst `lib/local-notifications.ts` für @capacitor/local-notifications (Berechtigungen, Planung, Stornierung).",
    "Lokale Benachrichtigung am Ende einer Focus/Pomodoro-Sitzung, auch im Hintergrund und ohne APNs.",
    "Automatische Erinnerung zum Fälligkeitsdatum einer Aufgabe bei Erstellung oder Änderung.",
    "Automatische Stornierung der Erinnerung, wenn eine Aufgabe erledigt oder gelöscht wird.",
    "Erinnerungen werden beim Laden der Aufgaben neu geplant, um bestehende Daten abzudecken.",
    "`FocusProvider` synchronisiert die Benachrichtigung mit Play/Pause/Reset und der Live Activity.",
    "Version unten rechts: v1.8.3.",
  ],
};

const v348_fr: ChangelogEntry = {
  version: "v1.8.4",
  date: "2026-08-22",
  title: "Architecture double cible : Next.js web/desktop + iOS Swift natif",
  items: [
    "Conservation complète du projet Next.js pour Web et Desktop.",
    "Ajout d'une interface iPhone 100 % SwiftUI dans `ios/App/App/Native/`.",
    "`RootView.swift` et `DashboardView.swift` : Bento Grid en `LazyVGrid` avec tuiles en verre.",
    "`NativeFloatingDock.swift` : barre flottante en `ultraThinMaterial` avec liseré et haptiques.",
    "`BentoCards/` : `FocusCardView`, `TasksCardView`, `BrainCardView`, `StorageCardView`.",
    "`SupabaseService.swift` : synchronisation REST des tâches et notes avec Supabase.",
    "Suppression du chargement WebView Capacitor ; `AppDelegate` lance `UIHostingController(rootView: RootView())`.",
    "CI iOS injecte `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans `Info.plist`.",
    "Version affichée en bas à droite : v1.8.4.",
  ],
};

const v348_en: ChangelogEntry = {
  version: "v1.8.4",
  date: "2026-08-22",
  title: "Dual-target architecture: Next.js web/desktop + native iOS Swift",
  items: [
    "Full preservation of the Next.js project for Web and Desktop.",
    "Added a 100 % SwiftUI iPhone interface in `ios/App/App/Native/`.",
    "`RootView.swift` and `DashboardView.swift`: Bento Grid with `LazyVGrid` and glass tiles.",
    "`NativeFloatingDock.swift`: floating `ultraThinMaterial` dock with specular rim and haptics.",
    "`BentoCards/`: `FocusCardView`, `TasksCardView`, `BrainCardView`, `StorageCardView`.",
    "`SupabaseService.swift`: REST sync for tasks and notes with Supabase.",
    "Removed Capacitor WebView loading; `AppDelegate` launches `UIHostingController(rootView: RootView())`.",
    "iOS CI injects `SUPABASE_URL` and `SUPABASE_ANON_KEY` into `Info.plist`.",
    "Version badge bottom-right: v1.8.4.",
  ],
};

const v348_es: ChangelogEntry = {
  version: "v1.8.4",
  date: "2026-08-22",
  title: "Arquitectura de doble objetivo: Next.js web/desktop + iOS Swift nativo",
  items: [
    "Conservación completa del proyecto Next.js para Web y Desktop.",
    "Nueva interfaz iPhone 100 % SwiftUI en `ios/App/App/Native/`.",
    "`RootView.swift` y `DashboardView.swift`: Bento Grid con `LazyVGrid` y tarjetas de cristal.",
    "`NativeFloatingDock.swift`: dock flotante de `ultraThinMaterial` con borde especular y háptica.",
    "`BentoCards/`: `FocusCardView`, `TasksCardView`, `BrainCardView`, `StorageCardView`.",
    "`SupabaseService.swift`: sincronización REST de tareas y notas con Supabase.",
    "Eliminada la carga de WebView de Capacitor; `AppDelegate` lanza `UIHostingController(rootView: RootView())`.",
    "CI iOS inyecta `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `Info.plist`.",
    "Versión mostrada abajo a la derecha: v1.8.4.",
  ],
};

const v348_de: ChangelogEntry = {
  version: "v1.8.4",
  date: "2026-08-22",
  title: "Dual-Target-Architektur: Next.js Web/Desktop + natives iOS Swift",
  items: [
    "Vollständige Erhaltung des Next.js-Projekts für Web und Desktop.",
    "Neue 100 % SwiftUI iPhone-Oberfläche in `ios/App/App/Native/`.",
    "`RootView.swift` und `DashboardView.swift`: Bento Grid mit `LazyVGrid` und Glaskarten.",
    "`NativeFloatingDock.swift`: schwebendes `ultraThinMaterial`-Dock mit spiegelndem Rand und Haptik.",
    "`BentoCards/`: `FocusCardView`, `TasksCardView`, `BrainCardView`, `StorageCardView`.",
    "`SupabaseService.swift`: REST-Synchronisation von Aufgaben und Notizen mit Supabase.",
    "Capacitor-WebView-Laden entfernt; `AppDelegate` startet `UIHostingController(rootView: RootView())`.",
    "iOS-CI injiziert `SUPABASE_URL` und `SUPABASE_ANON_KEY` in `Info.plist`.",
    "Version unten rechts: v1.8.4.",
  ],
};

const v349_fr: ChangelogEntry = {
  version: "v1.8.5",
  date: "2026-08-22",
  title: "Application iOS 100 % Swift natif (Liquid Glass, matériel et nouveautés iOS)",
  items: [
    "Design System Liquid Glass natif avec `LiquidGlassContainer`, `AmbientBackground` et `MeshGradient`.",
    "Bento Grid interactif avec réorganisation visuelle et effets de pression.",
    "Cartes natives : minuteur Focus, tâches, Brain, métriques de stockage.",
    "Intégrations matérielles : Face ID, haptiques `UIImpactFeedbackGenerator`, notifications locales.",
    "Dynamic Island / Live Activity pour le minuteur Focus.",
    "Graphiques natifs avec le framework `Charts`.",
    "Client Supabase natif `SupabaseManager.swift` en `async/await`.",
    "Point d'entrée `SceneDelegate` avec `UIHostingController(rootView: RootView())`.",
    "Projet Next.js conservé intact pour le web/desktop.",
  ],
};

const v349_en: ChangelogEntry = {
  version: "v1.8.5",
  date: "2026-08-22",
  title: "100 % native iOS Swift app (Liquid Glass, hardware and latest iOS APIs)",
  items: [
    "Native Liquid Glass design system with `LiquidGlassContainer`, `AmbientBackground` and `MeshGradient`.",
    "Interactive Bento Grid with visual reordering and press effects.",
    "Native cards: Focus timer, tasks, Brain, storage metrics.",
    "Hardware integrations: Face ID, `UIImpactFeedbackGenerator` haptics, local notifications.",
    "Dynamic Island / Live Activity support for the Focus timer.",
    "Native charts with the `Charts` framework.",
    "Native Supabase client `SupabaseManager.swift` using `async/await`.",
    "`SceneDelegate` entry point with `UIHostingController(rootView: RootView())`.",
    "Next.js project preserved intact for web/desktop.",
  ],
};

const v349_es: ChangelogEntry = {
  version: "v1.8.5",
  date: "2026-08-22",
  title: "Aplicación iOS 100 % Swift nativo (Liquid Glass, hardware y novedades iOS)",
  items: [
    "Sistema de diseño Liquid Glass nativo con `LiquidGlassContainer`, `AmbientBackground` y `MeshGradient`.",
    "Cuadrícula Bento interactiva con reordenación visual y efectos de presión.",
    "Tarjetas nativas: temporizador Focus, tareas, Brain, métricas de almacenamiento.",
    "Integraciones de hardware: Face ID, hápticos `UIImpactFeedbackGenerator`, notificaciones locales.",
    "Soporte Dynamic Island / Live Activity para el temporizador Focus.",
    "Gráficos nativos con el framework `Charts`.",
    "Cliente Supabase nativo `SupabaseManager.swift` con `async/await`.",
    "Punto de entrada `SceneDelegate` con `UIHostingController(rootView: RootView())`.",
    "Proyecto Next.js conservado intacto para web/desktop.",
  ],
};

const v349_de: ChangelogEntry = {
  version: "v1.8.5",
  date: "2026-08-22",
  title: "100 % native iOS Swift-App (Liquid Glass, Hardware und iOS-Neuheiten)",
  items: [
    "Natives Liquid Glass Design-System mit `LiquidGlassContainer`, `AmbientBackground` und `MeshGradient`.",
    "Interaktives Bento Grid mit visuellem Umsortieren und Druckeffekten.",
    "Native Karten: Fokus-Timer, Aufgaben, Brain, Speichermetriken.",
    "Hardware-Integrationen: Face ID, Haptik `UIImpactFeedbackGenerator`, lokale Benachrichtigungen.",
    "Dynamic Island / Live Activity für den Fokus-Timer.",
    "Native Diagramme mit dem `Charts`-Framework.",
    "Nativer Supabase-Client `SupabaseManager.swift` mit `async/await`.",
    "Einstiegspunkt `SceneDelegate` mit `UIHostingController(rootView: RootView())`.",
    "Next.js-Projekt für Web/Desktop unverändert erhalten.",
  ],
};

const v350_fr: ChangelogEntry = {
  version: "v1.8.6",
  date: "2026-08-22",
  title: "Intégration iOS avancée (Controls, App Intents, Shaders Metal, parallaxe, SF Symbols, Live Activity)",
  items: [
    "Contrôles Centre de Contrôle / Écran Verrouillé (`ControlWidgetButton`, `ControlWidgetToggle`).",
    "App Intents natifs ETHONE : Focus, tâche rapide, statut Dashboard, Brain.",
    "Shaders Metal `liquidGlassColor` et `liquidGlassDistortion` pour effets Liquid Glass.",
    "Parallaxe gyroscopique `CMMotionManager` sur les tuiles Bento.",
    "Micro-animations SF Symbols (`.bounce`, `.pulse`, `.variableColor`) et `matchedGeometryEffect` plein écran.",
    "Live Activity Pomodoro dédié `FocusActivity.swift` pour Dynamic Island.",
    "Frameworks liés : `CoreMotion` et `Metal`.",
  ],
};

const v350_en: ChangelogEntry = {
  version: "v1.8.6",
  date: "2026-08-22",
  title: "Advanced iOS integration (Controls, App Intents, Metal shaders, parallax, SF Symbols, Live Activity)",
  items: [
    "Control Center / Lock Screen controls (`ControlWidgetButton`, `ControlWidgetToggle`).",
    "ETHONE App Intents: Focus, quick task, Dashboard status, Brain.",
    "Metal shaders `liquidGlassColor` and `liquidGlassDistortion` for Liquid Glass effects.",
    "Gyroscopic parallax with `CMMotionManager` on Bento tiles.",
    "SF Symbol micro-animations (`.bounce`, `.pulse`, `.variableColor`) and full-screen `matchedGeometryEffect`.",
    "Dedicated Pomodoro Live Activity `FocusActivity.swift` for the Dynamic Island.",
    "Linked frameworks: `CoreMotion` and `Metal`.",
  ],
};

const v350_es: ChangelogEntry = {
  version: "v1.8.6",
  date: "2026-08-22",
  title: "Integración iOS avanzada (Controles, App Intents, Shaders Metal, paralaje, SF Symbols, Live Activity)",
  items: [
    "Controles para Centro de Control / Pantalla bloqueada (`ControlWidgetButton`, `ControlWidgetToggle`).",
    "App Intents nativos ETHONE: Focus, tarea rápida, estado del Dashboard, Brain.",
    "Shaders Metal `liquidGlassColor` y `liquidGlassDistortion` para efectos Liquid Glass.",
    "Paralaje giroscópico con `CMMotionManager` en las tarjetas Bento.",
    "Micro-animaciones SF Symbol (`.bounce`, `.pulse`, `.variableColor`) y `matchedGeometryEffect` a pantalla completa.",
    "Live Activity Pomodoro dedicado `FocusActivity.swift` para la Dynamic Island.",
    "Frameworks vinculados: `CoreMotion` y `Metal`.",
  ],
};

const v350_de: ChangelogEntry = {
  version: "v1.8.6",
  date: "2026-08-22",
  title: "Erweiterte iOS-Integration (Steuerelemente, App Intents, Metal-Shader, Parallaxe, SF Symbols, Live Activity)",
  items: [
    "Kontrollzentrum-/Sperrbildschirm-Steuerelemente (`ControlWidgetButton`, `ControlWidgetToggle`).",
    "ETHONE-App-Intents: Fokus, schnelle Aufgabe, Dashboard-Status, Brain.",
    "Metal-Shader `liquidGlassColor` und `liquidGlassDistortion` für Liquid-Glass-Effekte.",
    "Gyroskopische Parallaxe mit `CMMotionManager` auf Bento-Kacheln.",
    "SF-Symbol-Mikroanimationen (`.bounce`, `.pulse`, `.variableColor`) und Vollbild-`matchedGeometryEffect`.",
    "Dedizierte Pomodoro-Live-Activity `FocusActivity.swift` für die Dynamic Island.",
    "Verknüpfte Frameworks: `CoreMotion` und `Metal`.",
  ],
};

const v357_fr: ChangelogEntry = {
  version: "v1.8.13",
  date: "2026-08-23",
  title: "Dashboard web : polish UI, icônes ETHONE et widget Spotify",
  items: [
    "Palette sombre bleu-violette inspirée de Discord pour la carte Minecraft/Gaming.",
    "Widget Spotify rendu plus fiable avec affichage du titre et des pochettes même lorsque le statut de lecture arrive avec retard.",
    "Ajout de glyphes ETHONE personnalisés pour les états de présence et les notifications.",
    "États En ligne, Focus, Occupé, Absent et Invisible harmonisés entre le panneau système et le profil.",
    "Version v1.8.13.",
  ],
};

const v357_en: ChangelogEntry = {
  version: "v1.8.13",
  date: "2026-08-23",
  title: "Web dashboard: UI polish, ETHONE icons and Spotify widget",
  items: [
    "Dark blue-violet Discord-inspired palette for the Minecraft/Gaming card.",
    "Spotify widget made more reliable by showing the title and artwork even when the playback flag arrives late.",
    "Added custom ETHONE glyphs for presence states and notifications.",
    "Online, Focus, Busy, Away and Invisible states are now consistent between System and Profile controls.",
    "Version v1.8.13.",
  ],
};

const v357_es: ChangelogEntry = {
  version: "v1.8.13",
  date: "2026-08-23",
  title: "Dashboard web: pulido visual, iconos ETHONE y widget Spotify",
  items: [
    "Paleta azul-violeta oscura inspirada en Discord para la tarjeta Minecraft/Gaming.",
    "Widget Spotify más fiable: muestra el título y la portada aunque el estado de reproducción llegue tarde.",
    "Nuevos glifos personalizados de ETHONE para estados de presencia y notificaciones.",
    "Estados En línea, Focus, Ocupado, Ausente e Invisible armonizados entre Sistema y Perfil.",
    "Versión v1.8.13.",
  ],
};

const v357_de: ChangelogEntry = {
  version: "v1.8.13",
  date: "2026-08-23",
  title: "Web-Dashboard: UI-Polish, ETHONE-Symbole und Spotify-Widget",
  items: [
    "Dunkle blau-violette, von Discord inspirierte Palette für die Minecraft/Gaming-Karte.",
    "Spotify-Widget zuverlässiger: Titel und Cover werden auch angezeigt, wenn der Wiedergabestatus verzögert eintrifft.",
    "Benutzerdefinierte ETHONE-Glyphen für Präsenzstatus und Benachrichtigungen hinzugefügt.",
    "Online-, Fokus-, Beschäftigt-, Abwesend- und Unsichtbar-Status zwischen System und Profil vereinheitlicht.",
    "Version v1.8.13.",
  ],
};

const v358_fr: ChangelogEntry = {
  version: "v1.8.14",
  date: "2026-08-23",
  title: "Polish UI : badges, toasts, Dock et thèmes",
  items: [
    "Correction de tous les badges invisibles (bg/text identique) dans Riot, Discord, Live, FileUpload et Flows.",
    "L'alerte système de la barre ne réagit plus aux notifications non lues, seulement aux erreurs live/réseau.",
    "Cartes de thème réduites pour un sélecteur plus dense.",
    "Carte profil corrigée : badge Session vérifiée lisible, identifiant tronqué, bouton Discord adapté si déjà lié.",
    "Badges sans bordure blanche dans SystemHealthBanner et bouton Live de la barre.",
    "Bouton primary passé en fond accent solide pour plus de contraste.",
    "Lanceur d'apps du Dock sans glow vert.",
    "Bouton média du Dock cliquable pour ouvrir/fermer le flyout.",
    "Toasts refondus avec pastille et texte colorés selon le type.",
    "Carte de profil refondue dans les paramètres : plus compacte, sans bannière.",
    "Pastilles de statut passées en fond accent solide.",
    "Connexion avec Discord ajoutée sur la page de login.",
    "Bouton remonter en haut du Dock réparé.",
    "Version v1.8.14.",
  ],
};

const v358_en: ChangelogEntry = {
  version: "v1.8.14",
  date: "2026-08-23",
  title: "UI polish: badges, toasts, Dock and themes",
  items: [
    "Fixed all invisible badges (same bg/text) in Riot, Discord, Live, FileUpload and Flows.",
    "Status bar alert now only triggers on live/network errors, not on unread notifications.",
    "Theme cards reduced for a denser selector.",
    "Profile card fixed: readable verified badge, truncated public id, Discord button adapts when already linked.",
    "White-bordered badges removed in SystemHealthBanner and Live status bar button.",
    "Primary button switched to solid accent background for better contrast.",
    "Dock app launcher without green glow.",
    "Dock media button now clickable to toggle flyout.",
    "Toasts redesigned with colored dot and text per type.",
    "Profile card in settings reworked: more compact, no banner.",
    "Status pills switched to solid accent background.",
    "Discord sign-in added to the login page.",
    "Dock scroll-to-top button fixed.",
    "Version v1.8.14.",
  ],
};

const v358_es: ChangelogEntry = {
  version: "v1.8.14",
  date: "2026-08-23",
  title: "Pulido UI: badges, toasts, Dock y temas",
  items: [
    "Corrección de todos los badges invisibles (mismo fondo/texto) en Riot, Discord, Live, FileUpload y Flows.",
    "La alerta de la barra de estado solo se activa por errores live/red, no por notificaciones no leídas.",
    "Tarjetas de tema reducidas para un selector más compacto.",
    "Tarjeta de perfil corregida: badge de sesión verificada legible, id truncado, botón Discord adaptado si ya vinculado.",
    "Badges sin borde blanco en SystemHealthBanner y botón Live de la barra.",
    "Botón primary con fondo de acento sólido para mejor contraste.",
    "Lanzador de apps del Dock sin glow verde.",
    "Botón multimedia del Dock cliquable para abrir/cerrar flyout.",
    "Toasts rediseñados con punto y texto de color según el tipo.",
    "Tarjeta de perfil en ajustes rediseñada: más compacta, sin banner.",
    "Pastillas de estado con fondo de acento sólido.",
    "Conexión con Discord añadida a la página de login.",
    "Botón de volver arriba del Dock reparado.",
    "Versión v1.8.14.",
  ],
};

const v358_de: ChangelogEntry = {
  version: "v1.8.14",
  date: "2026-08-23",
  title: "UI-Polish: Badges, Toasts, Dock und Themes",
  items: [
    "Alle unsichtbaren Badges (gleicher Hintergrund/Text) in Riot, Discord, Live, FileUpload und Flows korrigiert.",
    "Statusleisten-Alert reagiert jetzt nur auf Live/Netzwerk-Fehler, nicht auf ungelesene Benachrichtigungen.",
    "Theme-Karten verkleinert für eine dichtere Auswahl.",
    "Profilkarte korrigiert: lesbares Verifiziert-Badge, gekürzte ID, Discord-Button passt sich an, wenn bereits verknüpft.",
    "Weiße Badge-Ränder in SystemHealthBanner und Live-Statusleiste entfernt.",
    "Primary-Button auf soliden Akzent-Hintergrund für besseren Kontrast umgestellt.",
    "Dock-App-Launcher ohne grünen Glow.",
    "Dock-Mediabutton nun klickbar, um Flyout zu öffnen/schließen.",
    "Toasts überarbeitet mit farbigem Punkt und Text je nach Typ.",
    "Profilkarte in den Einstellungen überarbeitet: kompakter, ohne Banner.",
    "Status-Pillen auf soliden Akzent-Hintergrund umgestellt.",
    "Discord-Anmeldung zur Login-Seite hinzugefügt.",
    "Dock-Scroll-nach-oben-Button repariert.",
    "Version v1.8.14.",
  ],
};

const v356_fr: ChangelogEntry = {
  version: "v1.8.12",
  date: "2026-08-23",
  title: "Batterie de tests cross-plateforme et nettoyage CI",
  items: [
    "Validation Next.js : tsc, lint, build, tests unitaires passent.",
    "Validation Worker : tests passent (correction chemins tracker /api/stats/*).",
    "Validation iOS et Android revue structure, haptics, appels asynchrones.",
    "Mise à jour workflows GitHub pour la QA.",
    "Version v1.8.12.",
  ],
};

const v356_en: ChangelogEntry = {
  version: "v1.8.12",
  date: "2026-08-23",
  title: "Cross-platform test suite and CI cleanup",
  items: [
    "Next.js validation: tsc, lint, build, unit tests pass.",
    "Worker validation: tests pass (tracker routes fixed to /api/stats/*).",
    "iOS and Android structure, haptics, async calls reviewed.",
    "GitHub workflows updated for QA.",
    "Version v1.8.12.",
  ],
};

const v356_es: ChangelogEntry = {
  version: "v1.8.12",
  date: "2026-08-23",
  title: "Batería de pruebas multiplataforma y limpieza CI",
  items: [
    "Validación Next.js: tsc, lint, build, tests unitarios pasan.",
    "Validación Worker: tests pasan (rutas tracker corregidas a /api/stats/*).",
    "Revisión de estructura, haptics y llamadas asíncronas iOS/Android.",
    "Workflows GitHub actualizados para QA.",
    "Versión v1.8.12.",
  ],
};

const v356_de: ChangelogEntry = {
  version: "v1.8.12",
  date: "2026-08-23",
  title: "Cross-Platform-Testsuite und CI-Bereinigung",
  items: [
    "Next.js-Validierung: tsc, lint, build, Unit-Tests bestanden.",
    "Worker-Validierung: Tests bestanden (Tracker-Routen auf /api/stats/* korrigiert).",
    "iOS- und Android-Struktur, Haptik, asynchrone Aufrufe geprüft.",
    "GitHub-Workflows für QA aktualisiert.",
    "Version v1.8.12.",
  ],
};

const v355_fr: ChangelogEntry = {
  version: "v1.8.11",
  date: "2026-08-23",
  title: "Refactor de la page de connexion, Switch et i18n",
  items: [
    "Merge de devin/recovered-stash-2026-08-14 : refactor complet de la page login.",
    "Refonte du composant Switch avec support label/labels/size et focus visible.",
    "Nouvelles clés i18n pour la connexion/inscription.",
    "Version v1.8.11.",
  ],
};

const v355_en: ChangelogEntry = {
  version: "v1.8.11",
  date: "2026-08-23",
  title: "Refactored login page, Switch and i18n",
  items: [
    "Merged devin/recovered-stash-2026-08-14: full login page refactor.",
    "Rewrote Switch component with label/labels/size support and visible focus.",
    "New i18n keys for login/registration.",
    "Version v1.8.11.",
  ],
};

const v355_es: ChangelogEntry = {
  version: "v1.8.11",
  date: "2026-08-23",
  title: "Refactorización de login, Switch e i18n",
  items: [
    "Merge de devin/recovered-stash-2026-08-14: refactor completo de la página de login.",
    "Reescritura del componente Switch con soporte label/labels/size y focus visible.",
    "Nuevas claves i18n para login/registro.",
    "Versión v1.8.11.",
  ],
};

const v355_de: ChangelogEntry = {
  version: "v1.8.11",
  date: "2026-08-23",
  title: "Refactor der Login-Seite, Switch und i18n",
  items: [
    "Merge von devin/recovered-stash-2026-08-14: vollständiger Refactor der Login-Seite.",
    "Switch-Komponente mit label/labels/size und sichtbarem Fokus neu geschrieben.",
    "Neue i18n-Keys für Login/Registrierung.",
    "Version v1.8.11.",
  ],
};

const v354_fr: ChangelogEntry = {
  version: "v1.8.10",
  date: "2026-08-23",
  title: "Nettoyage des imports CSS legacy",
  items: [
    "Suppression des @import legacy dans app/globals.css.",
    "Import de legacy-v8-*.css et liquid-glass.css depuis app/layout.tsx.",
    "Build local sans erreur CSS.",
    "Version v1.8.10.",
  ],
};

const v354_en: ChangelogEntry = {
  version: "v1.8.10",
  date: "2026-08-23",
  title: "Clean up legacy CSS imports",
  items: [
    "Removed legacy @import statements from app/globals.css.",
    "Imported legacy-v8-*.css and liquid-glass.css from app/layout.tsx.",
    "Local build now completes without CSS resolution errors.",
    "Version v1.8.10.",
  ],
};

const v354_es: ChangelogEntry = {
  version: "v1.8.10",
  date: "2026-08-23",
  title: "Limpieza de imports CSS heredados",
  items: [
    "Eliminación de @import heredados en app/globals.css.",
    "Import de legacy-v8-*.css y liquid-glass.css desde app/layout.tsx.",
    "Build local sin errores de resolución CSS.",
    "Versión v1.8.10.",
  ],
};

const v354_de: ChangelogEntry = {
  version: "v1.8.10",
  date: "2026-08-23",
  title: "Bereinigung der Legacy-CSS-Imports",
  items: [
    "Entfernung der @import-Anweisungen in app/globals.css.",
    "Import von legacy-v8-*.css und liquid-glass.css über app/layout.tsx.",
    "Lokaler Build ohne CSS-Auflösungsfehler.",
    "Version v1.8.10.",
  ],
};

const v353_fr: ChangelogEntry = {
  version: "v1.8.9",
  date: "2026-08-23",
  title: "Migration Pure Apple 100 % Swift et Taptic Engine Core Haptics",
  items: [
    "Audit et purge du dossier ios/App/App : suppression des résidus Capacitor/Cordova et WebView.",
    "Nouveau HapticManager.swift avec CHHapticEngine natif.",
    "Patterns haptiques personnalisés : playGlassTap, playSuccessWave, playTimerEndAlert.",
    "Extension SwiftUI .ethoneSensoryFeedback sur View.",
    "Intégration dans NativeFloatingDock, TasksCard, FocusTimerCard, BrainCaptureCard.",
    "Version iOS v1.8.9.",
  ],
};

const v353_en: ChangelogEntry = {
  version: "v1.8.9",
  date: "2026-08-23",
  title: "Pure Apple 100% Swift Migration and Taptic Engine Core Haptics",
  items: [
    "Audit and purge of ios/App/App: removed Capacitor/Cordova and WebView residues.",
    "New HapticManager.swift with native CHHapticEngine.",
    "Custom haptic patterns: playGlassTap, playSuccessWave, playTimerEndAlert.",
    "SwiftUI .ethoneSensoryFeedback View extension.",
    "Integration in NativeFloatingDock, TasksCard, FocusTimerCard, BrainCaptureCard.",
    "iOS version v1.8.9.",
  ],
};

const v353_es: ChangelogEntry = {
  version: "v1.8.9",
  date: "2026-08-23",
  title: "Migración Apple pura 100% Swift y Taptic Engine Core Haptics",
  items: [
    "Auditoría y limpieza de ios/App/App: eliminación de restos de Capacitor/Cordova y WebView.",
    "Nuevo HapticManager.swift con CHHapticEngine nativo.",
    "Patrones hápticos personalizados: playGlassTap, playSuccessWave, playTimerEndAlert.",
    "Extensión SwiftUI .ethoneSensoryFeedback en View.",
    "Integración en NativeFloatingDock, TasksCard, FocusTimerCard, BrainCaptureCard.",
    "Versión iOS v1.8.9.",
  ],
};

const v353_de: ChangelogEntry = {
  version: "v1.8.9",
  date: "2026-08-23",
  title: "Reine Apple-100%-Swift-Migration und Taptic Engine Core Haptics",
  items: [
    "Audit und Bereinigung von ios/App/App: Entfernung von Capacitor/Cordova- und WebView-Resten.",
    "Neuer HapticManager.swift mit nativem CHHapticEngine.",
    "Benutzerdefinierte Haptikmuster: playGlassTap, playSuccessWave, playTimerEndAlert.",
    "SwiftUI .ethoneSensoryFeedback View-Erweiterung.",
    "Integration in NativeFloatingDock, TasksCard, FocusTimerCard, BrainCaptureCard.",
    "iOS-Version v1.8.9.",
  ],
};

const v352_fr: ChangelogEntry = {
  version: "v1.8.8",
  date: "2026-08-23",
  title: "Audit global, isolation stricte et alignement cross-platform",
  items: [
    "Isolation du monorepo : ethone-next/ Next.js, ios/ SwiftUI, android/ Kotlin.",
    "Suppression de Capacitor/Cordova dans le client web et les apps natives.",
    "Builds indépendants : build-web.yml, build-ios.yml (SwiftUI pur) et build-android.yml (Gradle pur).",
    "Alignement des schémas Supabase : clients iOS/Android utilisent `tasks` et `notes`.",
    "Version v1.8.8.",
  ],
};

const v352_en: ChangelogEntry = {
  version: "v1.8.8",
  date: "2026-08-23",
  title: "Global audit, strict isolation and cross-platform alignment",
  items: [
    "Monorepo isolation: ethone-next/ for Next.js, ios/ for SwiftUI, android/ for Kotlin.",
    "Removed Capacitor/Cordova from web client and native apps.",
    "Independent builds: build-web.yml, build-ios.yml (pure SwiftUI) and build-android.yml (pure Gradle).",
    "Supabase schema alignment: iOS/Android clients now use `tasks` and `notes`.",
    "Version v1.8.8.",
  ],
};

const v352_es: ChangelogEntry = {
  version: "v1.8.8",
  date: "2026-08-23",
  title: "Auditoría global, aislamiento estricto y alineación multiplataforma",
  items: [
    "Aislamiento del monorepo: ethone-next/ para Next.js, ios/ para SwiftUI, android/ para Kotlin.",
    "Eliminación de Capacitor/Cordova del cliente web y las apps nativas.",
    "Builds independientes: build-web.yml, build-ios.yml (SwiftUI puro) y build-android.yml (Gradle puro).",
    "Alineación del esquema Supabase: clientes iOS/Android usan `tasks` y `notes`.",
    "Versión v1.8.8.",
  ],
};

const v352_de: ChangelogEntry = {
  version: "v1.8.8",
  date: "2026-08-23",
  title: "Globales Audit, strikte Isolation und Cross-Platform-Abstimmung",
  items: [
    "Monorepo-Isolation: ethone-next/ für Next.js, ios/ für SwiftUI, android/ für Kotlin.",
    "Capacitor/Cordova aus Web-Client und nativen Apps entfernt.",
    "Unabhängige Builds: build-web.yml, build-ios.yml (reines SwiftUI) und build-android.yml (reines Gradle).",
    "Supabase-Schema-Abstimmung: iOS/Android-Clients nutzen jetzt `tasks` und `notes`.",
    "Version v1.8.8.",
  ],
};

const v351_fr: ChangelogEntry = {
  version: "v1.8.7",
  date: "2026-08-22",
  title: "Application Android 100 % Kotlin natif (Jetpack Compose, Glassmorphism AGSL, Material 3)",
  items: [
    "Design System Glass avec `LiquidGlassSurface` : blur, dégradés, reflets, coins arrondis.",
    "Dashboard Bento natif `BentoGridScreen` avec `LazyVerticalGrid` et tuiles interactives.",
    "Cartes natives : minuteur Focus Pomodoro, tâches avec `SwipeToDismissBox`, Brain capture vocal, graphiques de stockage.",
    "Navigation flottante `NativeFloatingDock` avec haptiques et animations.",
    "Intégrations matérielles : `BiometricPrompt`, `TileService` Quick Settings, notifications locales.",
    "Client Supabase natif `SupabaseClient.kt` avec Ktor et coroutines.",
    "Workflow GitHub Actions `build-android.yml` pour compilation APK.",
  ],
};

const v351_en: ChangelogEntry = {
  version: "v1.8.7",
  date: "2026-08-22",
  title: "100 % native Android Kotlin app (Jetpack Compose, Glassmorphism AGSL, Material 3)",
  items: [
    "Glass Design System with `LiquidGlassSurface`: blur, gradients, specular reflections, rounded corners.",
    "Native Bento Dashboard `BentoGridScreen` with `LazyVerticalGrid` and interactive tiles.",
    "Native cards: Pomodoro Focus timer, tasks with `SwipeToDismissBox`, Brain voice capture, storage charts.",
    "Floating navigation `NativeFloatingDock` with haptics and animations.",
    "Hardware integrations: `BiometricPrompt`, `TileService` Quick Settings, local notifications.",
    "Native Supabase client `SupabaseClient.kt` with Ktor and coroutines.",
    "GitHub Actions workflow `build-android.yml` for APK build.",
  ],
};

const v351_es: ChangelogEntry = {
  version: "v1.8.7",
  date: "2026-08-22",
  title: "Aplicación Android 100 % Kotlin nativo (Jetpack Compose, Glassmorphism AGSL, Material 3)",
  items: [
    "Sistema de diseño Glass con `LiquidGlassSurface`: desenfoque, degradados, reflejos, esquinas redondeadas.",
    "Dashboard Bento nativo `BentoGridScreen` con `LazyVerticalGrid` y tarjetas interactivas.",
    "Tarjetas nativas: temporizador Focus Pomodoro, tareas con `SwipeToDismissBox`, captura de voz Brain, gráficos de almacenamiento.",
    "Navegación flotante `NativeFloatingDock` con hápticos y animaciones.",
    "Integraciones de hardware: `BiometricPrompt`, `TileService` Quick Settings, notificaciones locales.",
    "Cliente Supabase nativo `SupabaseClient.kt` con Ktor y corrutinas.",
    "Workflow de GitHub Actions `build-android.yml` para compilar el APK.",
  ],
};

const v351_de: ChangelogEntry = {
  version: "v1.8.7",
  date: "2026-08-22",
  title: "100 % native Android Kotlin-App (Jetpack Compose, Glassmorphism AGSL, Material 3)",
  items: [
    "Glass Design-System mit `LiquidGlassSurface`: Unschärfe, Farbverläufe, Spiegelungen, abgerundete Ecken.",
    "Native Bento-Dashboard `BentoGridScreen` mit `LazyVerticalGrid` und interaktiven Kacheln.",
    "Native Karten: Pomodoro-Fokus-Timer, Aufgaben mit `SwipeToDismissBox`, Brain-Spracheingabe, Speicherdiagramme.",
    "Schwebende Navigation `NativeFloatingDock` mit Haptik und Animationen.",
    "Hardware-Integrationen: `BiometricPrompt`, `TileService` Quick Settings, lokale Benachrichtigungen.",
    "Nativer Supabase-Client `SupabaseClient.kt` mit Ktor und Coroutines.",
    "GitHub Actions Workflow `build-android.yml` für den APK-Build.",
  ],
};

export const CHANGELOG_BY_LANG: Record<string, ChangelogEntry[]> = {
  fr: [v358_fr, v357_fr, v356_fr, v355_fr, v354_fr, v353_fr, v352_fr, v351_fr, v350_fr, v349_fr, v348_fr, v347_fr, v346_fr, v345_fr, v344_fr, v343_fr, v147_fr, v146_fr, v145_fr, v144_fr, v143_fr, v142_fr, v141_fr, v140_fr, v139_fr, v138_fr, v137_fr, v136_fr, v135_fr, v134_fr, v133_fr, v132_fr, v131_fr, v130_fr, v206_fr, v205_fr, v204_fr, v203_fr, v202_fr, v201_fr, v200_fr, v199_fr, v198_fr, v197_fr, v196_fr, v195_fr, v194_fr, v193_fr, v192_fr, v191_fr, v190_fr, v189_fr, v188_fr, v187_fr, v186_fr, v185_fr, v184_fr, v183_fr, v182_fr, v181_fr, v180_fr, v179_fr, v178_fr, v177_fr, v176_fr, v175_fr, v174_fr, v173_fr, v172_fr, v171_fr, v170_fr, v169_fr, v168_fr, v167_fr, v166_fr, v165_fr, v164_fr, v328_fr, v327_fr, v326_fr, v325_fr, v324_fr, v323_fr, v322_fr, v329_fr, v330_fr, v331_fr, v332_fr, v338_fr, v340_fr, v341_fr, v342_fr],
  en: [v358_en, v357_en, v356_en, v355_en, v354_en, v353_en, v352_en, v351_en, v350_en, v349_en, v348_en, v347_en, v346_en, v345_en, v344_en, v343_en, v147_en, v146_en, v145_en, v144_en, v143_en, v142_en, v141_en, v140_en, v139_en, v138_en, v137_en, v136_en, v135_en, v134_en, v133_en, v132_en, v131_en, v130_en, v206_en, v205_en, v204_en, v203_en, v202_en, v201_en, v200_en, v199_en, v198_en, v197_en, v196_en, v195_en, v194_en, v193_en, v192_en, v191_en, v190_en, v189_en, v188_en, v187_en, v186_en, v185_en, v184_en, v183_en, v182_en, v181_en, v180_en, v179_en, v178_en, v177_en, v176_en, v175_en, v174_en, v173_en, v172_en, v171_en, v170_en, v169_en, v168_en, v167_en, v166_en, v165_en, v164_en, v328_en, v327_en, v326_en, v325_en,
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
    v329_en,
    v330_en,
    v331_en,
    v332_en,
    v338_en,
    v341_en,
    v342_en,
    v340_en,
  ],
  es: [v358_es, v357_es, v356_es, v355_es, v354_es, v353_es, v352_es, v351_es, v350_es, v349_es, v348_es, v347_es, v346_es, v345_es, v344_es, v343_es, v147_es, v146_es, v145_es, v144_es, v143_es, v142_es, v141_es, v140_es, v139_es, v138_es, v137_es, v136_es, v135_es, v134_es, v133_es, v132_es, v131_es, v130_es, v206_es, v205_es, v204_es, v203_es, v202_es, v201_es, v200_es, v199_es, v198_es, v197_es, v196_es, v195_es, v194_es, v193_es, v192_es, v191_es, v190_es, v189_es, v188_es, v187_es, v186_es, v185_es, v184_es, v183_es, v182_es, v181_es, v180_es, v179_es, v178_es, v177_es, v176_es, v175_es, v174_es, v173_es, v172_es, v171_es, v170_es, v169_es, v168_es, v167_es, v166_es, v165_es, v164_es, v328_es, v327_es, v326_es, v325_es,
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
    v329_es,
    v330_es,
    v331_es,
    v332_es,
    v338_es,
    v341_es,
    v342_es,
    v340_es,
  ],
  de: [v358_de, v357_de, v356_de, v355_de, v354_de, v353_de, v352_de, v351_de, v350_de, v349_de, v348_de, v347_de, v346_de, v345_de, v344_de, v343_de, v147_de, v146_de, v145_de, v144_de, v143_de, v142_de, v141_de, v140_de, v139_de, v138_de, v137_de, v136_de, v135_de, v134_de, v133_de, v132_de, v131_de, v130_de, v206_de, v205_de, v204_de, v203_de, v202_de, v201_de, v200_de, v199_de, v198_de, v197_de, v196_de, v195_de, v194_de, v193_de, v192_de, v191_de, v190_de, v189_de, v188_de, v187_de, v186_de, v185_de, v184_de, v183_de, v182_de, v181_de, v180_de, v179_de, v178_de, v177_de, v176_de, v175_de, v174_de, v173_de, v172_de, v171_de, v170_de, v169_de, v168_de, v167_de, v166_de, v165_de, v164_de, v328_de, v327_de, v326_de, v325_de,
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
    v329_de,
    v330_de,
    v331_de,
    v332_de,
    v338_de,
    v341_de,
    v342_de,
    v340_de,
  ],
};

const v359_fr: ChangelogEntry = {
  version: "v1.8.15",
  date: "2026-08-24",
  title: "Intégrations Stripe, thèmes, RSS et polish",
  items: [
    "Icône SVG Valorant et GameIcon pour les jeux.",
    "Boutons Démarrer du System passés en outline.",
    "Alerte SystemHealthBanner corrigée (plus d'alerte jaune pour non configuré).",
    "Palette Minecraft sur la carte Gaming.",
    "Scrollbar noire renforcée (.no-scrollbar !important).",
    "Bouton thème cyclique entre les thèmes premium.",
    "Intégration du bouton de soutien Stripe (web, iOS, Android).",
    "Page de retour post-paiement /dashboard?supported=true avec confettis.",
    "Refonte du Lecteur RSS et ajout dans le Dock.",
    "Correction de l'effet de couleur de l'icône météo.",
    "Version v1.8.15.",
  ],
};

const v359_en: ChangelogEntry = {
  version: "v1.8.15",
  date: "2026-08-24",
  title: "Stripe, themes, RSS and polish",
  items: [
    "Valorant SVG icon and GameIcon for games.",
    "System Start buttons switched to outline.",
    "SystemHealthBanner alert fixed (no amber alert for unconfigured).",
    "Minecraft palette on Gaming card.",
    "Black scrollbar hardening (.no-scrollbar !important).",
    "Theme button cycles through premium themes.",
    "Stripe support button integration (web, iOS, Android).",
    "Post-payment return page /dashboard?supported=true with confetti.",
    "RSS reader redesign and Dock shortcut.",
    "Weather icon color effect fix.",
    "Version v1.8.15.",
  ],
};

const v359_es: ChangelogEntry = {
  version: "v1.8.15",
  date: "2026-08-24",
  title: "Integraciones Stripe, temas, RSS y pulido",
  items: [
    "Icono SVG de Valorant y GameIcon para juegos.",
    "Botones Iniciar del Sistema en outline.",
    "Alerta SystemHealthBanner corregida (sin alerta ámbar para no configurado).",
    "Paleta Minecraft en la tarjeta Gaming.",
    "Scrollbar negra reforzada (.no-scrollbar !important).",
    "Botón de tema cambia entre los temas premium.",
    "Integración del botón de apoyo Stripe (web, iOS, Android).",
    "Página de retorno post-pago /dashboard?supported=true con confeti.",
    "Rediseño del Lector RSS y acceso en el Dock.",
    "Corrección del efecto de color del icono del tiempo.",
    "Versión v1.8.15.",
  ],
};

const v359_de: ChangelogEntry = {
  version: "v1.8.15",
  date: "2026-08-24",
  title: "Stripe-Integration, Themes, RSS und Polish",
  items: [
    "Valorant-SVG-Icon und GameIcon für Spiele.",
    "System-Start-Buttons auf Outline umgestellt.",
    "SystemHealthBanner-Alert korrigiert (kein Amber-Alert für nicht konfiguriert).",
    "Minecraft-Palette auf der Gaming-Karte.",
    "Schwarze Scrollbar verstärkt (.no-scrollbar !important).",
    "Theme-Button wechselt zwischen Premium-Themes.",
    "Stripe-Support-Button-Integration (Web, iOS, Android).",
    "Post-Zahlungs-Rückkehrseite /dashboard?supported=true mit Konfetti.",
    "RSS-Leser überarbeitet und im Dock hinzugefügt.",
    "Farb-Effekt des Wettersymbols korrigiert.",
    "Version v1.8.15.",
  ],
};

const v360_fr: ChangelogEntry = {
  version: "v1.8.16",
  date: "2026-08-24",
  title: "Correction du crash du bouton météo et du clignotement du lecteur média",
  items: [
    "Correction du maximum de profondeur de mise à jour React dans WeatherDetailPopover.",
    "Le ref de la popover météo utilise refs.setFloating de @floating-ui/react directement, évitant une boucle setState.",
    "Ajout de clés uniques sur les createPortal de Popover, Modal, Select et CommandPalette.",
    "Dédoublonnage défensif des notifications et des widgets du tableau de bord.",
    "Correction du clignotement de la barre de progression du lecteur média : localProgress n’est resynchronisé sur nowPlaying.progressMs qu’au changement de piste (id).",
    "Modal de remerciement post-don : fermeture uniquement via la croix (backdrop et Échap désactivés).",
    "BootProvider saute l’écran de chargement quand l’URL contient ?supported=true (retour après un don Stripe).",
    "Version v1.8.16.",
  ],
};

const v360_en: ChangelogEntry = {
  version: "v1.8.16",
  date: "2026-08-24",
  title: "Weather button crash and media player flicker fix",
  items: [
    "Fixed React maximum update depth exceeded in WeatherDetailPopover.",
    "Weather popover ref now directly uses refs.setFloating from @floating-ui/react, removing a setState loop.",
    "Added unique keys to Popover, Modal, Select and CommandPalette createPortals.",
    "Defensive deduplication for notifications and dashboard widgets.",
    "Fixed media player progress bar flickering: localProgress is only resynced to nowPlaying.progressMs on track change (id).",
    "Post-donation thank-you modal can now only be closed via the X (backdrop and Escape disabled).",
    "BootProvider skips the loading screen when the URL contains ?supported=true (Stripe donation return).",
    "Version v1.8.16.",
  ],
};

const v360_es: ChangelogEntry = {
  version: "v1.8.16",
  date: "2026-08-24",
  title: "Corrección del bloqueo del botón del tiempo y del parpadeo del reproductor",
  items: [
    "Corrección del exceso de profundidad máxima de actualización de React en WeatherDetailPopover.",
    "El ref de la ventana del tiempo ahora usa directamente refs.setFloating de @floating-ui/react, evitando un bucle de setState.",
    "Claves únicas añadidas a los createPortal de Popover, Modal, Select y CommandPalette.",
    "Deduplicación defensiva de notificaciones y widgets del panel de control.",
    "Corrección del parpadeo de la barra de progreso del reproductor: localProgress solo se resincroniza con nowPlaying.progressMs al cambiar de pista (id).",
    "El modal de agradecimiento post-donación ahora solo se cierra con la X (backdrop y Escape desactivados).",
    "BootProvider omite la pantalla de carga cuando la URL contiene ?supported=true (vuelta tras donación Stripe).",
    "Versión v1.8.16.",
  ],
};

const v360_de: ChangelogEntry = {
  version: "v1.8.16",
  date: "2026-08-24",
  title: "Absturz des Wetter-Buttons und Flackern des Mediaplayers behoben",
  items: [
    "Maximale React-Aktualisierungstiefe in WeatherDetailPopover behoben.",
    "Der Wetter-Popover-Ref verwendet jetzt direkt refs.setFloating von @floating-ui/react und vermeidet so eine setState-Schleife.",
    "Eindeutige Schlüssel für createPortal in Popover, Modal, Select und CommandPalette hinzugefügt.",
    "Defensive Deduplizierung von Benachrichtigungen und Dashboard-Widgets.",
    "Flackern der Fortschrittsleiste des Mediaplayers behoben: localProgress wird nur beim Titelwechsel (id) mit nowPlaying.progressMs resynchronisiert.",
    "Post-Spende-Dankesmodal kann nur noch über das X geschlossen werden (Backdrop und Escape deaktiviert).",
    "BootProvider überspringt den Ladebildschirm, wenn die URL ?supported=true enthält (Rückkehr nach Stripe-Spende).",
    "Version v1.8.16.",
  ],
};

const v361_fr: ChangelogEntry = {
  version: "v1.8.17",
  date: "2026-08-24",
  title: "Refonte visuelle et polissage de l’encadrement UI",
  items: [
    "Tokens --panel-bg, --panel-border et --panel-blur harmonisés pour un rendu Liquid Glass uniforme.",
    "Jointures TopBar / Sidebar / main aplaties pour un cadre continu.",
    "Dock desktop en pilule (rounded-full) via .v8-dock.",
    "Dynamic Island avec bordure plus fine, ombre plus douce et rounded-full.",
    "Dock mobile rounded-full et bordures harmonisées.",
    "BentoCard : séparateurs et icônes témoins à 8 % blanc, espacements grid gap-3.",
    "StatusBar aligné sur les tokens du panel.",
    "Version v1.8.17.",
  ],
};

const v361_en: ChangelogEntry = {
  version: "v1.8.17",
  date: "2026-08-24",
  title: "Visual rework and UI framing polish",
  items: [
    "Harmonized --panel-bg, --panel-border and --panel-blur tokens for a uniform Liquid Glass look.",
    "Flattened TopBar / Sidebar / main joints for a continuous frame.",
    "Desktop dock turned into a pill (rounded-full) via .v8-dock.",
    "Dynamic Island with finer border, softer shadow and rounded-full.",
    "Mobile dock rounded-full with harmonized borders.",
    "BentoCard separators and header icons set to 8 % white, grid gap-3.",
    "StatusBar aligned with panel tokens.",
    "Version v1.8.17.",
  ],
};

const v361_es: ChangelogEntry = {
  version: "v1.8.17",
  date: "2026-08-24",
  title: "Rework visual y pulido del marco UI",
  items: [
    "Tokens --panel-bg, --panel-border y --panel-blur armonizados para un aspecto Liquid Glass uniforme.",
    "Uniones TopBar / Sidebar / main aplanadas para un marco continuo.",
    "Dock de escritorio en píldora (rounded-full) vía .v8-dock.",
    "Dynamic Island con borde más fino, sombra más suave y rounded-full.",
    "Dock móvil rounded-full con bordes armonizados.",
    "BentoCard: separadores e iconos de encabezado al 8 % blanco, grid gap-3.",
    "StatusBar alineado con los tokens del panel.",
    "Versión v1.8.17.",
  ],
};

const v361_de: ChangelogEntry = {
  version: "v1.8.17",
  date: "2026-08-24",
  title: "Visuelles Rework und UI-Rahmen-Polish",
  items: [
    "Tokens --panel-bg, --panel-border und --panel-blur harmonisiert für ein einheitliches Liquid-Glass-Erscheinungsbild.",
    "TopBar / Sidebar / main-Übergänge abgeflacht für einen durchgehenden Rahmen.",
    "Desktop-Dock als Pille (rounded-full) über .v8-dock.",
    "Dynamic Island mit feinerer Umrandung, weicherem Schatten und rounded-full.",
    "Mobiles Dock rounded-full mit harmonisierten Rändern.",
    "BentoCard: Trennlinien und Header-Icons auf 8 % Weiß gesetzt, grid gap-3.",
    "StatusBar an Panel-Tokens ausgerichtet.",
    "Version v1.8.17.",
  ],
};

const v362_fr: ChangelogEntry = {
  version: "v1.8.18",
  date: "2026-08-24",
  title: "Rework authentification et Dynamic Island",
  items: [
    "Rework du login : machine à états explicite, OTP 6 chiffres, anti-boucle, messages traduits.",
    "Connexion qui attend la création/confirmation de session avant redirection.",
    "Dynamic Island : plus d'ouverture auto au chargement, ouverture au clic/tap, masquage sans activité.",
    "Arrêt du hover-to-expand et des timers de collapse.",
    "Dynamic Island fixée en z-[60] au-dessus de la TopBar.",
    "Version v1.8.18.",
  ],
};

const v362_en: ChangelogEntry = {
  version: "v1.8.18",
  date: "2026-08-24",
  title: "Authentication and Dynamic Island rework",
  items: [
    "Login rework: explicit state machine, 6-digit OTP, anti-loop, translated error messages.",
    "Login waits for session creation and confirmation before redirecting.",
    "Dynamic Island: no auto-open on load, opens on click/tap, hides when no activity.",
    "Removed hover-to-expand and auto-collapse timers.",
    "Dynamic Island set to fixed z-[60] above the TopBar.",
    "Version v1.8.18.",
  ],
};

const v362_es: ChangelogEntry = {
  version: "v1.8.18",
  date: "2026-08-24",
  title: "Rework de autenticación y Dynamic Island",
  items: [
    "Rework del login: máquina de estados explícita, OTP de 6 cifras, anti-bucle, mensajes traducidos.",
    "La conexión espera la creación/confirmación de sesión antes de redirigir.",
    "Dynamic Island: sin apertura automática al cargar, se abre al tocar/clic, se oculta sin actividad.",
    "Se eliminó el hover-to-expand y los temporizadores de cierre automático.",
    "Dynamic Island fijada a z-[60] por encima de la TopBar.",
    "Versión v1.8.18.",
  ],
};

const v362_de: ChangelogEntry = {
  version: "v1.8.18",
  date: "2026-08-24",
  title: "Rework von Authentifizierung und Dynamic Island",
  items: [
    "Login-Rework: explizite Zustandsmaschine, 6-stelliges OTP, Anti-Loop, übersetzte Fehlermeldungen.",
    "Login wartet auf Erstellung/Bestätigung der Sitzung vor der Weiterleitung.",
    "Dynamic Island: keine automatische Öffnung beim Laden, öffnet sich per Klick/Tipp, versteckt sich bei Inaktivität.",
    "Hover-to-Expand und Auto-Collapse-Timer entfernt.",
    "Dynamic Island auf fixed z-[60] über der TopBar gesetzt.",
    "Version v1.8.18.",
  ],
};

const v363_fr: ChangelogEntry = {
  version: "v1.8.19",
  date: "2026-08-24",
  title: "Refonte Settings, Toasts et Design System",
  items: [
    "Tokenisation des toasts et des composants de base (Switch, Select).",
    "Navigation Settings clavier, aria-current et tabindex roving.",
    "Routing /settings/:section statique pour toutes les catégories.",
    "Undo toast visuel sur changement de thème.",
    "Barre de progression dans RichToast avec pause au survol.",
    "Anti-spam par dedupKey pour éviter les piles de toasts.",
    "Responsive Settings et safe areas iPhone / iPad.",
    "Version v1.8.19.",
  ],
};

const v363_en: ChangelogEntry = {
  version: "v1.8.19",
  date: "2026-08-24",
  title: "Settings, Toasts and Design System rework",
  items: [
    "Tokenized toasts and base components (Switch, Select).",
    "Keyboard-friendly Settings navigation with aria-current and roving tabindex.",
    "Static routing /settings/:section for all categories.",
    "Visual undo toast on theme change.",
    "Progress bar in RichToast with hover pause.",
    "dedupKey anti-spam to avoid toast piles.",
    "Responsive Settings and iPhone / iPad safe areas.",
    "Version v1.8.19.",
  ],
};

const v363_es: ChangelogEntry = {
  version: "v1.8.19",
  date: "2026-08-24",
  title: "Rework de Settings, Toasts y Design System",
  items: [
    "Tokenización de toasts y componentes base (Switch, Select).",
    "Navegación Settings por teclado, aria-current y tabindex roving.",
    "Routing estático /settings/:section para todas las categorías.",
    "Toast de deshacer visual al cambiar de tema.",
    "Barra de progreso en RichToast con pausa al pasar el cursor.",
    "Anti-spam con dedupKey para evitar pilas de toasts.",
    "Settings responsive y safe areas iPhone / iPad.",
    "Versión v1.8.19.",
  ],
};

const v363_de: ChangelogEntry = {
  version: "v1.8.19",
  date: "2026-08-24",
  title: "Rework von Settings, Toasts und Design System",
  items: [
    "Tokenisierung der Toasts und Basis-Komponenten (Switch, Select).",
    "Tastatur-Navigation für Settings mit aria-current und roving tabindex.",
    "Statisches Routing /settings/:section für alle Kategorien.",
    "Visueller Undo-Toast beim Themenwechsel.",
    "Fortschrittsbalken in RichToast mit Pause beim Hover.",
    "dedupKey Anti-Spam, um Toast-Stapel zu vermeiden.",
    "Responsive Settings und iPhone / iPad Safe Areas.",
    "Version v1.8.19.",
  ],
};

const v364_fr: ChangelogEntry = {
  version: "v1.8.20",
  date: "2026-08-24",
  title: "Audit boot et réduction du loading artificiel",
  items: [
    "Audit de BootProvider, AuthProvider et SettingsProvider.",
    "Durée minimum artificielle du loader réduite de 1 800 ms à 600 ms.",
    "Courbe de progress reparamétrée pour un démarrage plus rapide.",
    "Timeout, erreur et hors ligne conservés.",
    "Version v1.8.20.",
  ],
};

const v364_en: ChangelogEntry = {
  version: "v1.8.20",
  date: "2026-08-24",
  title: "Boot audit and artificial loading reduction",
  items: [
    "Audit of BootProvider, AuthProvider and SettingsProvider.",
    "Minimum artificial loader duration reduced from 1,800 ms to 600 ms.",
    "Progress curve reparametrized for faster boot.",
    "Timeout, error and offline states preserved.",
    "Version v1.8.20.",
  ],
};

const v364_es: ChangelogEntry = {
  version: "v1.8.20",
  date: "2026-08-24",
  title: "Auditoría de boot y reducción de carga artificial",
  items: [
    "Auditoría de BootProvider, AuthProvider y SettingsProvider.",
    "Duración mínima artificial del loader reducida de 1 800 ms a 600 ms.",
    "Curva de progreso reparametrizada para un inicio más rápido.",
    "Timeout, error y estados sin conexión conservados.",
    "Versión v1.8.20.",
  ],
};

const v364_de: ChangelogEntry = {
  version: "v1.8.20",
  date: "2026-08-24",
  title: "Boot-Audit und Reduktion künstlicher Ladezeit",
  items: [
    "Audit von BootProvider, AuthProvider und SettingsProvider.",
    "Künstliche Mindestdauer des Loaders von 1.800 ms auf 600 ms reduziert.",
    "Progress-Kurve für schnelleren Start reparametrisiert.",
    "Timeout, Fehler und Offline-Zustände beibehalten.",
    "Version v1.8.20.",
  ],
};

const v365_fr: ChangelogEntry = {
  version: "v1.8.21",
  date: "2026-08-24",
  title: "Tokenisation Design System",
  items: [
    "BentoCard : bordures et surfaces tokenisées.",
    "Input : fond, bordures et état d'erreur tokenisés.",
    "Modal : hover du bouton close tokenisé.",
    "Version v1.8.21.",
  ],
};

const v365_en: ChangelogEntry = {
  version: "v1.8.21",
  date: "2026-08-24",
  title: "Design System tokenization",
  items: [
    "BentoCard: tokenized borders and surfaces.",
    "Input: tokenized background, borders and error state.",
    "Modal: tokenized close button hover.",
    "Version v1.8.21.",
  ],
};

const v365_es: ChangelogEntry = {
  version: "v1.8.21",
  date: "2026-08-24",
  title: "Tokenización del Design System",
  items: [
    "BentoCard: bordes y superficies tokenizadas.",
    "Input: fondo, bordes y estado de error tokenizados.",
    "Modal: hover del botón de cierre tokenizado.",
    "Versión v1.8.21.",
  ],
};

const v365_de: ChangelogEntry = {
  version: "v1.8.21",
  date: "2026-08-24",
  title: "Design-System-Tokenisierung",
  items: [
    "BentoCard: tokenisierte Ränder und Oberflächen.",
    "Input: tokenisierter Hintergrund, Ränder und Fehlerzustand.",
    "Modal: tokenisierter Hover für Schließen-Button.",
    "Version v1.8.21.",
  ],
};

const v371_fr: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Upload globale et vue Dynamic Island",
  items: [
    "UploadQueueProvider : file d'attente globale pour les fichiers.",
    "Hook useUploadQueue accessible depuis n'importe quelle vue.",
    "app/drop : les fichiers déposés passent par la queue.",
    "UploadIslandView : vue étendue de la Dynamic Island avec états, retry et clear.",
    "Compact upload : compteurs en cours, terminés et erreurs.",
    "E2E a11y, ui-harmony et command-palette restent verts.",
    "Version v1.9.0.",
  ],
};

const v371_en: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Global upload queue and Dynamic Island view",
  items: [
    "UploadQueueProvider: global upload queue for files.",
    "useUploadQueue hook available from any view.",
    "app/drop: dropped files now go through the queue.",
    "UploadIslandView: expanded Dynamic Island view with states, retry and clear.",
    "Upload compact pill: in-progress, completed and error counters.",
    "E2E a11y, ui-harmony and command-palette suites remain green.",
    "Version v1.9.0.",
  ],
};

const v371_es: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Cola de subida global y vista en Dynamic Island",
  items: [
    "UploadQueueProvider: cola de espera global para archivos.",
    "Hook useUploadQueue accesible desde cualquier vista.",
    "app/drop: los archivos arrastrados pasan por la cola.",
    "UploadIslandView: vista extendida de Dynamic Island con estados, reintentar y limpiar.",
    "Compacto de subida: contadores en curso, terminados y errores.",
    "Pruebas E2E a11y, ui-harmony y command-palette siguen verdes.",
    "Versión v1.9.0.",
  ],
};

const v371_de: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Globale Upload-Warteschlange und Dynamic-Island-Ansicht",
  items: [
    "UploadQueueProvider: globale Warteschlange für Dateien.",
    "useUploadQueue-Hook aus jeder Ansicht verfügbar.",
    "app/drop: abgelegte Dateien laufen über die Warteschlange.",
    "UploadIslandView: erweiterte Dynamic-Island-Ansicht mit Status, Retry und Clear.",
    "Kompakte Upload-Anzeige: laufende, abgeschlossene und fehlerhafte Zähler.",
    "E2E-Tests a11y, ui-harmony und command-palette bleiben grün.",
    "Version v1.9.0.",
  ],
};

const v372_fr: ChangelogEntry = {
  version: "v1.9.1",
  date: "2026-08-25",
  title: "Reconstruction du Control Center / Settings",
  items: [
    "Accessibilité : labels ARIA, rôles search/region, aria-live sur les statuts de synchro, aria-pressed sur les contrôles, navigation clavier complète.",
    "Responsive mobile/iPad : safe-area insets, cibles tactiles >= 44 px, header pleine largeur, barre de sauvegarde flottante sécurisée.",
    "Navigation par catégories sans rechargement, startTransition, transition subtile et suppression du Suspense inutile.",
    "Pile d'historique globale avec undo/redo (Ctrl+Z, Ctrl+Y) et rollback en cas d'échec de persistence.",
    "Application immédiate et sans flash des thèmes, accents et densités ; respect de prefers-reduced-motion.",
    "Lint, tsc, test:unit et build passants.",
    "Version v1.9.1.",
  ],
};

const v372_en: ChangelogEntry = {
  version: "v1.9.1",
  date: "2026-08-25",
  title: "Control Center / Settings rebuild",
  items: [
    "Accessibility: ARIA labels, search/region roles, aria-live sync status, aria-pressed controls, full keyboard navigation.",
    "Mobile/iPad responsive: safe-area insets, touch targets >= 44 px, full-width header, safe floating save bar.",
    "Category navigation without full reload, startTransition, subtle transition, removed unnecessary Suspense.",
    "Global history stack with undo/redo (Ctrl+Z, Ctrl+Y) and rollback on persistence failure.",
    "Instant, flash-free theme, accent and density updates; respects prefers-reduced-motion.",
    "Lint, tsc, test:unit and build passing.",
    "Version v1.9.1.",
  ],
};

const v372_es: ChangelogEntry = {
  version: "v1.9.1",
  date: "2026-08-25",
  title: "Reconstrucción del Control Center / Ajustes",
  items: [
    "Accesibilidad: etiquetas ARIA, roles search/region, aria-live en estado de sincronización, aria-pressed en controles, navegación completa por teclado.",
    "Responsive móvil/iPad: insets de área segura, targets táctiles >= 44 px, header de ancho completo, barra flotante de guardado segura.",
    "Navegación por categorías sin recarga completa, startTransition, transición sutil y eliminación del Suspense innecesario.",
    "Pila de historial global con undo/redo (Ctrl+Z, Ctrl+Y) y rollback ante fallo de persistencia.",
    "Aplicación inmediata y sin parpadeo de temas, acentos y densidades; respeta prefers-reduced-motion.",
    "Lint, tsc, test:unit y build correctos.",
    "Versión v1.9.1.",
  ],
};

const v372_de: ChangelogEntry = {
  version: "v1.9.1",
  date: "2026-08-25",
  title: "Control Center / Settings Rebuild",
  items: [
    "Barrierefreiheit: ARIA-Labels, search/region-Rollen, aria-live für Sync-Status, aria-pressed für Steuerelemente, vollständige Tastaturnavigation.",
    "Mobiles/iPad-Responsive: Safe-Area-Insets, Touch-Targets >= 44 px, Header in voller Breite, sichere schwebende Speicherleiste.",
    "Kategorienavigation ohne vollständiges Neuladen, startTransition, subtile Transition, unnötiges Suspense entfernt.",
    "Globaler Verlaufs-Stack mit Undo/Redo (Strg+Z, Strg+Y) und Rollback bei Persistenzfehlern.",
    "Sofortige, flimmerfreie Aktualisierung von Theme, Akzent und Dichte; beachtet prefers-reduced-motion.",
    "Lint, tsc, test:unit und Build erfolgreich.",
    "Version v1.9.1.",
  ],
};

const v369_fr: ChangelogEntry = {
  version: "v1.8.25",
  date: "2026-08-24",
  title: "Rework Dynamic Island",
  items: [
    "Priorité et verrou utilisateur.",
    "Vue synchronisation intégrée.",
    "Safe areas et largeurs mobiles.",
    "Interactions clavier.",
    "z-index sous les modals.",
    "Version v1.8.25.",
  ],
};

const v369_en: ChangelogEntry = {
  version: "v1.8.25",
  date: "2026-08-24",
  title: "Dynamic Island rework",
  items: [
    "Priority and user lock.",
    "Integrated sync view.",
    "Safe areas and mobile widths.",
    "Keyboard interactions.",
    "z-index below modals.",
    "Version v1.8.25.",
  ],
};

const v369_es: ChangelogEntry = {
  version: "v1.8.25",
  date: "2026-08-24",
  title: "Rework de Dynamic Island",
  items: [
    "Prioridad y bloqueo de usuario.",
    "Vista de sincronización integrada.",
    "Safe areas y anchos móviles.",
    "Interacciones de teclado.",
    "z-index bajo modals.",
    "Versión v1.8.25.",
  ],
};

const v369_de: ChangelogEntry = {
  version: "v1.8.25",
  date: "2026-08-24",
  title: "Dynamic Island Rework",
  items: [
    "Priorität und Benutzer-Sperre.",
    "Integrierte Sync-Ansicht.",
    "Safe Areas und mobile Breiten.",
    "Tastatur-Interaktionen.",
    "z-index unter Modals.",
    "Version v1.8.25.",
  ],
};

const v370_fr: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Bento Home, command palette et sidebar flottante",
  items: [
    "Quick actions depuis le Hero (tâche, note, focus, brain, upload).",
    "Synthèse contextuelle et suggestions actionnables dans Brain.",
    "Dynamic Island : états explicites IDLE / COMPACT / EXPANDED / INTERACTIVE.",
    "Command palette : scroll automatique de l'item actif et navigation clavier affinée.",
    "Sidebar flottante en verre avec la variante floating.",
    "E2E a11y, ui-harmony et command-palette passent au vert.",
    "Version v1.9.0.",
  ],
};

const v370_en: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Bento Home, command palette, and floating sidebar",
  items: [
    "Home quick actions from the Hero (task, note, focus, brain, upload).",
    "Contextual synthesis and actionable suggestions in Brain.",
    "Dynamic Island: explicit IDLE / COMPACT / EXPANDED / INTERACTIVE states.",
    "Command palette: automatic scroll for active item and refined keyboard navigation.",
    "Floating glass sidebar using the floating variant.",
    "E2E a11y, ui-harmony, and command-palette suites pass.",
    "Version v1.9.0.",
  ],
};

const v370_es: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Bento Home, paleta de comandos y barra lateral flotante",
  items: [
    "Acciones rápidas en el Hero (tarea, nota, focus, brain, upload).",
    "Síntesis contextual y sugerencias accionables en Brain.",
    "Dynamic Island: estados explícitos IDLE / COMPACT / EXPANDED / INTERACTIVE.",
    "Paleta de comandos: desplazamiento automático del elemento activo y navegación por teclado refinada.",
    "Barra lateral flotante de cristal con la variante floating.",
    "Pruebas E2E a11y, ui-harmony y command-palette pasan.",
    "Versión v1.9.0.",
  ],
};

const v370_de: ChangelogEntry = {
  version: "v1.9.0",
  date: "2026-08-25",
  title: "Bento-Home, Befehlspalette und schwebende Sidebar",
  items: [
    "Schnellaktionen vom Hero (Aufgabe, Notiz, Focus, Brain, Upload).",
    "Kontextbezogene Synthese und umsetzbare Vorschläge in Brain.",
    "Dynamic Island: explizite Zustände IDLE / COMPACT / EXPANDED / INTERACTIVE.",
    "Befehlspalette: automatisches Scrollen zum aktiven Element und verfeinerte Tastaturnavigation.",
    "Schwebende Glas-Sidebar mit der Floating-Variante.",
    "E2E-Tests a11y, ui-harmony und command-palette bestehen.",
    "Version v1.9.0.",
  ],
};

const v368_fr: ChangelogEntry = {
  version: "v1.8.24",
  date: "2026-08-24",
  title: "Sync session multi-onglet",
  items: [
    "Écoute storage pour synchroniser connexion/déconnexion entre onglets.",
    "Re-résolution de session si remember token change.",
    "Version v1.8.24.",
  ],
};

const v368_en: ChangelogEntry = {
  version: "v1.8.24",
  date: "2026-08-24",
  title: "Cross-tab session sync",
  items: [
    "Listen to storage events to sync login/logout across tabs.",
    "Re-resolve session when remember token changes.",
    "Version v1.8.24.",
  ],
};

const v368_es: ChangelogEntry = {
  version: "v1.8.24",
  date: "2026-08-24",
  title: "Sincronización de sesión entre pestañas",
  items: [
    "Escucha eventos storage para sincronizar login/logout.",
    "Re-resolución de sesión si remember token cambia.",
    "Versión v1.8.24.",
  ],
};

const v368_de: ChangelogEntry = {
  version: "v1.8.24",
  date: "2026-08-24",
  title: "Sitzungs-Sync über Tabs",
  items: [
    "Storage-Events für Login/Logout-Sync über Tabs.",
    "Session neu auflösen bei Änderung des Remember-Tokens.",
    "Version v1.8.24.",
  ],
};

const v367_fr: ChangelogEntry = {
  version: "v1.8.23",
  date: "2026-08-24",
  title: "Rework authentification ETHONE",
  items: [
    "OTP natif Supabase, anti-boucle et session confirmée.",
    "Passkey via supabase.auth.verifyOtp (magiclink).",
    "Remember-me avec vrai refresh_token.",
    "Logs diagnostiques auth en dev.",
    "Responsive login amélioré.",
    "Tests E2E Playwright passants.",
    "Version v1.8.23.",
  ],
};

const v367_en: ChangelogEntry = {
  version: "v1.8.23",
  date: "2026-08-24",
  title: "ETHONE authentication rework",
  items: [
    "Native Supabase OTP, anti-loop and confirmed session.",
    "Passkey via supabase.auth.verifyOtp (magiclink).",
    "Remember-me with real refresh_token.",
    "Auth diagnostic logs in dev.",
    "Improved login responsiveness.",
    "Passing Playwright E2E tests.",
    "Version v1.8.23.",
  ],
};

const v367_es: ChangelogEntry = {
  version: "v1.8.23",
  date: "2026-08-24",
  title: "Rework de autenticación ETHONE",
  items: [
    "OTP nativo de Supabase, anti-bucle y sesión confirmada.",
    "Passkey vía supabase.auth.verifyOtp (magiclink).",
    "Remember-me con refresh_token real.",
    "Logs de diagnóstico de auth en dev.",
    "Responsive de login mejorado.",
    "Tests E2E Playwright pasando.",
    "Versión v1.8.23.",
  ],
};

const v367_de: ChangelogEntry = {
  version: "v1.8.23",
  date: "2026-08-24",
  title: "ETHONE-Authentifizierungs-Rework",
  items: [
    "Natives Supabase-OTP, Anti-Schleife und bestätigte Sitzung.",
    "Passkey über supabase.auth.verifyOtp (magiclink).",
    "Remember-me mit echtem refresh_token.",
    "Auth-Diagnose-Logs in dev.",
    "Verbessertes Login-Responsive.",
    "Bestandene Playwright-E2E-Tests.",
    "Version v1.8.23.",
  ],
};

const v366_fr: ChangelogEntry = {
  version: "v1.8.22",
  date: "2026-08-24",
  title: "Fix OTP et session remember-me",
  items: [
    "verifyOtp via supabase.auth.verifyOtp.",
    "Vrai refresh_token pour la récupération remember me.",
    "Suppression du refresh token aléatoire.",
    "Login page utilise useAuth().signInOtp et verifyOtp.",
    "Version v1.8.22.",
  ],
};

const v366_en: ChangelogEntry = {
  version: "v1.8.22",
  date: "2026-08-24",
  title: "OTP and remember-me session fix",
  items: [
    "verifyOtp via supabase.auth.verifyOtp.",
    "Real refresh_token for remember-me recovery.",
    "Removed random refresh token.",
    "Login page uses useAuth().signInOtp and verifyOtp.",
    "Version v1.8.22.",
  ],
};

const v366_es: ChangelogEntry = {
  version: "v1.8.22",
  date: "2026-08-24",
  title: "Fix de OTP y sesión remember-me",
  items: [
    "verifyOtp vía supabase.auth.verifyOtp.",
    "refresh_token real para recuperar remember me.",
    "Eliminación del refresh token aleatorio.",
    "Login usa useAuth().signInOtp y verifyOtp.",
    "Versión v1.8.22.",
  ],
};

const v366_de: ChangelogEntry = {
  version: "v1.8.22",
  date: "2026-08-24",
  title: "OTP- und Remember-Me-Session-Fix",
  items: [
    "verifyOtp über supabase.auth.verifyOtp.",
    "Echter refresh_token für Remember-Me-Wiederherstellung.",
    "Zufälliger Refresh-Token entfernt.",
    "Login-Seite nutzt useAuth().signInOtp und verifyOtp.",
    "Version v1.8.22.",
  ],
};

const v396_fr: ChangelogEntry = {
  version: "v1.9.6",
  date: "2026-08-25",
  title: "Rework Home complet",
  items: [
    "Cartes 3D / connexions toujours visibles avec empty state intégration.",
    "Hero avec horloge live et Brain avec recommandations contextuelles.",
    "Footer / status bar ETHONE avec tokens sémantiques.",
    "Dynamic Island : aria-expanded et contrôle des ouvertures.",
    "Tokens sémantiques sur les statuts d'erreur et grid Home pilotée par la density.",
    "Extraction LiveClock pour réduire les re-renders, tests unitaires verts.",
    "Audit responsive : 420 tests Playwright sans overflow horizontal.",
    "Validation : `npm run build`, `npm run lint`, `npm run test:unit` restent verts.",
    "Version affichée en bas à droite : v1.9.6.",
  ],
};

const v396_en: ChangelogEntry = {
  version: "v1.9.6",
  date: "2026-08-25",
  title: "Full Home rework",
  items: [
    "3D connection cards always visible with integration empty state.",
    "Hero with live clock and Brain with contextual recommendations.",
    "ETHONE footer / status bar with semantic tokens.",
    "Dynamic Island: aria-expanded and open control.",
    "Semantic tokens on error states and Home grid driven by density.",
    "LiveClock extraction to reduce re-renders, unit tests green.",
    "Responsive audit: 420 Playwright tests with no horizontal overflow.",
    "Validation: `npm run build`, `npm run lint`, `npm run test:unit` still pass.",
    "Version badge bottom-right: v1.9.6.",
  ],
};

const v396_es: ChangelogEntry = {
  version: "v1.9.6",
  date: "2026-08-25",
  title: "Rework completo del Home",
  items: [
    "Tarjetas 3D / conexiones siempre visibles con empty state de integración.",
    "Hero con reloj en vivo y Brain con recomendaciones contextuales.",
    "Footer / barra de estado ETHONE con tokens semánticos.",
    "Dynamic Island: aria-expanded y control de apertura.",
    "Tokens semánticos en estados de error y cuadrícula Home según density.",
    "Extracción de LiveClock para reducir re-renders, tests unitarios pasan.",
    "Auditoría responsive: 420 tests Playwright sin desbordamiento horizontal.",
    "Validación: `npm run build`, `npm run lint`, `npm run test:unit` siguen pasando.",
    "Versión mostrada abajo a la derecha: v1.9.6.",
  ],
};

const v396_de: ChangelogEntry = {
  version: "v1.9.6",
  date: "2026-08-25",
  title: "Komplettes Home-Rework",
  items: [
    "3D-Verbindungskarten immer sichtbar mit Integration-Empty-State.",
    "Hero mit Live-Uhr und Brain mit kontextuellen Empfehlungen.",
    "ETHONE Footer / Statusleiste mit semantischen Tokens.",
    "Dynamic Island: aria-expanded und Öffnungskontrolle.",
    "Semantische Tokens bei Fehlerstatus und Home-Raster gesteuert nach Density.",
    "LiveClock ausgelagert, um Re-Renders zu reduzieren, Unit-Tests bestehen.",
    "Responsive-Audit: 420 Playwright-Tests ohne horizontales Overflow.",
    "Validierung: `npm run build`, `npm run lint`, `npm run test:unit` bestehen weiterhin.",
    "Version unten rechts: v1.9.6.",
  ],
};

const v397_fr: ChangelogEntry = {
  version: "v1.9.7",
  date: "2026-08-25",
  title: "Rework Settings / Control Center",
  items: [
    "Audit de l'architecture Settings.",
    "Navigation sidebar avec descriptions i18n et mapping corrigé.",
    "Tokens unifiés pour `SettingsSection` et `SettingField`.",
    "Previews de thèmes enrichis (bouton + dock miniatures).",
    "Aperçu son i18n et respect `reduced-motion` sur `AmbientSoundControl`.",
    "`LanguageControl` responsive et tokens `MaintenancePanel` unifiés.",
    "`SettingField` responsive mobile et 420 viewports Playwright OK.",
    "Validation : `npm run build`, `npm run lint`, `npm run test:unit` restent verts.",
    "Version affichée en bas à droite : v1.9.7.",
  ],
};

const v397_en: ChangelogEntry = {
  version: "v1.9.7",
  date: "2026-08-25",
  title: "Settings / Control Center rework",
  items: [
    "Settings architecture audit.",
    "Sidebar navigation with i18n descriptions and corrected category mapping.",
    "Unified tokens for `SettingsSection` and `SettingField`.",
    "Richer theme previews (button + dock miniatures).",
    "Localized sound preview and `reduced-motion` respect on `AmbientSoundControl`.",
    "Responsive `LanguageControl` and unified `MaintenancePanel` tokens.",
    "Responsive `SettingField` for mobile and 420 Playwright viewports OK.",
    "Validation: `npm run build`, `npm run lint`, `npm run test:unit` still pass.",
    "Version badge bottom-right: v1.9.7.",
  ],
};

const v397_es: ChangelogEntry = {
  version: "v1.9.7",
  date: "2026-08-25",
  title: "Rework de Settings / Control Center",
  items: [
    "Auditoría de la arquitectura de Settings.",
    "Navegación de sidebar con descripciones i18n y mapeo corregido.",
    "Tokens unificados para `SettingsSection` y `SettingField`.",
    "Previews de temas más ricos (botón + dock miniatura).",
    "Vista previa de sonido i18n y respeto `reduced-motion` en `AmbientSoundControl`.",
    "`LanguageControl` responsive y tokens de `MaintenancePanel` unificados.",
    "`SettingField` responsive móvil y 420 viewports Playwright OK.",
    "Validación: `npm run build`, `npm run lint`, `npm run test:unit` siguen pasando.",
    "Versión mostrada abajo a la derecha: v1.9.7.",
  ],
};

const v397_de: ChangelogEntry = {
  version: "v1.9.7",
  date: "2026-08-25",
  title: "Settings / Control Center Rework",
  items: [
    "Audit der Settings-Architektur.",
    "Sidebar-Navigation mit i18n-Beschreibungen und korrigiertem Mapping.",
    "Vereinheitlichte Tokens für `SettingsSection` und `SettingField`.",
    "Reichere Theme-Previews (Button + Dock-Miniaturen).",
    "Lokalisierter Sound-Preview und `reduced-motion`-Respekt auf `AmbientSoundControl`.",
    "Responsive `LanguageControl` und vereinheitlichte `MaintenancePanel`-Tokens.",
    "Responsive `SettingField` für Mobile und 420 Playwright-Viewports OK.",
    "Validierung: `npm run build`, `npm run lint`, `npm run test:unit` bestehen weiterhin.",
    "Version unten rechts: v1.9.7.",
  ],
};

const v398_fr: ChangelogEntry = {
  version: "v1.9.8",
  date: "2026-08-25",
  title: "Rework Connexions / Integration Hub",
  items: [
    "Audit de l’existant Connexions (IntegrationsSettings, ConnectionCard, hooks, OAuth, API keys).",
    "Header premium, recherche étendue et catégories avec compteurs.",
    "Badges unifiés `ConnectionBadge` basés sur les tokens du design system.",
    "Modale `ConnectionGuideModal` pour tutoriels et guides pas-à-pas.",
    "État testing par card et affichage du résultat + latence.",
    "Section `MyConnectionsRow` avec navigation rapide vers les connexions actives.",
    "Validation responsive 420 viewports et accessibilité 9 viewports sans régression.",
    "Version affichée en bas à droite : v1.9.8.",
  ],
};

const v398_en: ChangelogEntry = {
  version: "v1.9.8",
  date: "2026-08-25",
  title: "Connections / Integration Hub rework",
  items: [
    "Audit of existing Connections (IntegrationsSettings, ConnectionCard, hooks, OAuth, API keys).",
    "Premium header, extended search and categories with counts.",
    "Unified `ConnectionBadge` based on design system tokens.",
    "`ConnectionGuideModal` modal for tutorials and step-by-step guides.",
    "Per-card testing state and result + latency display.",
    "`MyConnectionsRow` section with quick navigation to active connections.",
    "Responsive validation 420 viewports and accessibility 9 viewports with no regression.",
    "Version badge bottom-right: v1.9.8.",
  ],
};

const v398_es: ChangelogEntry = {
  version: "v1.9.8",
  date: "2026-08-25",
  title: "Rework de Connexiones / Integration Hub",
  items: [
    "Auditoría de Connexiones existente (IntegrationsSettings, ConnectionCard, hooks, OAuth, API keys).",
    "Header premium, búsqueda extendida y categorías con contadores.",
    "Badges unificados `ConnectionBadge` basados en tokens del design system.",
    "Modal `ConnectionGuideModal` para tutoriales y guías paso a paso.",
    "Estado de testing por card y visualización del resultado + latencia.",
    "Sección `MyConnectionsRow` con navegación rápida a conexiones activas.",
    "Validación responsive 420 viewports y accesibilidad 9 viewports sin regresión.",
    "Versión mostrada abajo a la derecha: v1.9.8.",
  ],
};

const v398_de: ChangelogEntry = {
  version: "v1.9.8",
  date: "2026-08-25",
  title: "Connections / Integration Hub Rework",
  items: [
    "Audit der bestehenden Connections (IntegrationsSettings, ConnectionCard, Hooks, OAuth, API-Keys).",
    "Premium-Header, erweiterte Suche und Kategorien mit Zählern.",
    "Vereinheitlichte `ConnectionBadge` basierend auf Design-System-Tokens.",
    "`ConnectionGuideModal`-Modal für Tutorials und Schritt-für-Schritt-Anleitungen.",
    "Testing-Status pro Card und Ergebnis + Latenz-Anzeige.",
    "`MyConnectionsRow`-Bereich mit schneller Navigation zu aktiven Verbindungen.",
    "Responsive-Validierung 420 Viewports und Barrierefreiheit 9 Viewports ohne Regression.",
    "Version unten rechts: v1.9.8.",
  ],
};

const v399_fr: ChangelogEntry = {
  version: "v1.9.9",
  date: "2026-08-25",
  title: "Phases 4-9 : polish, tokens, i18n, icônes",
  items: [
    "Phase 4 : Dynamic Island & Dock — z-index tokenisés, ombres et couleurs unifiés.",
    "Phase 5 : Dashboard / Widget Shell — tokens priorités tâches, icônes unifiées, states.",
    "Phase 6 : Settings & Profil — icônes Icon unifiées, MaintenancePanel tokenisé.",
    "Phase 4bis : z-index restants et fonds sombres remplacés par les tokens.",
    "Phase 7 : Toasts, Command Palette, Notifications — icônes unifiées, tokens.",
    "Phase 8 : i18n & A11y — labels traduisibles, toasts, MaintenancePanel.",
    "Phase 9 : Brain & feature-fallback — icônes unifiées, salutations i18n, tokens.",
    "Validation : build, lint, tests unitaires.",
    "Version affichée en bas à droite : v1.9.9.",
  ],
};

const v399_en: ChangelogEntry = {
  version: "v1.9.9",
  date: "2026-08-25",
  title: "Phases 4-9 : polish, tokens, i18n, icons",
  items: [
    "Phase 4: Dynamic Island & Dock — tokenized z-index, unified shadows and colors.",
    "Phase 5: Dashboard / Widget Shell — task priority tokens, unified icons, states.",
    "Phase 6: Settings & Profile — unified Icon icons, tokenized MaintenancePanel.",
    "Phase 4bis: remaining z-index and hardcoded dark backgrounds replaced by tokens.",
    "Phase 7: Toasts, Command Palette, Notifications — unified icons, tokens.",
    "Phase 8: i18n & A11y — translatable labels, toasts, MaintenancePanel.",
    "Phase 9: Brain & feature-fallback — unified icons, i18n greetings, tokens.",
    "Validation: build, lint, unit tests.",
    "Version badge bottom-right: v1.9.9.",
  ],
};

const v399_es: ChangelogEntry = {
  version: "v1.9.9",
  date: "2026-08-25",
  title: "Fases 4-9 : polish, tokens, i18n, iconos",
  items: [
    "Fase 4: Dynamic Island y Dock — z-index tokenizados, sombras y colores unificados.",
    "Fase 5: Dashboard / Widget Shell — tokens de prioridad de tareas, iconos unificados, estados.",
    "Fase 6: Settings y Perfil — iconos Icon unificados, MaintenancePanel tokenizado.",
    "Fase 4bis: z-index restantes y fondos oscuros hardcodeados reemplazados por tokens.",
    "Fase 7: Toasts, Command Palette, Notificaciones — iconos unificados, tokens.",
    "Fase 8: i18n y A11y — etiquetas traducibles, toasts, MaintenancePanel.",
    "Fase 9: Brain y feature-fallback — iconos unificados, saludos i18n, tokens.",
    "Validación: build, lint, tests unitarios.",
    "Versión mostrada abajo a la derecha: v1.9.9.",
  ],
};

const v399_de: ChangelogEntry = {
  version: "v1.9.9",
  date: "2026-08-25",
  title: "Phasen 4-9 : Polish, Tokens, i18n, Icons",
  items: [
    "Phase 4: Dynamic Island & Dock — tokenisierte z-Indizes, vereinheitlichte Schatten und Farben.",
    "Phase 5: Dashboard / Widget Shell — Aufgabenprioritäts-Token, vereinheitlichte Icons, States.",
    "Phase 6: Settings & Profil — vereinheitlichte Icon-Icons, tokenisiertes MaintenancePanel.",
    "Phase 4bis: verbleibende z-Indizes und hardcodierte dunkle Hintergründe durch Tokens ersetzt.",
    "Phase 7: Toasts, Command Palette, Benachrichtigungen — vereinheitlichte Icons, Tokens.",
    "Phase 8: i18n & A11y — übersetzbare Labels, Toasts, MaintenancePanel.",
    "Phase 9: Brain & feature-fallback — vereinheitlichte Icons, i18n-Begrüßungen, Tokens.",
    "Validierung: build, lint, Unit-Tests.",
    "Version unten rechts: v1.9.9.",
  ],
};

const v400_fr: ChangelogEntry = {
  version: "v1.9.10",
  date: "2026-08-25",
  title: "Hotfixes post-release : widget 3D, sync, drag, status bar, météo",
  items: [
    "ConnectionCardsWidget : passage en grille de cartes 3D responsive.",
    "SortableWidget : drag possible sur toute la carte en mode personnalisation.",
    "LiveBentoGrid : état déconnecté au lieu d'erreur globale.",
    "StatusBar : restauration de la barre en bas de page.",
    "Dynamic Island : fermeture au clic à l'extérieur.",
    "WeatherPage : messages d'erreur de géolocalisation explicites.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.10.",
  ],
};

const v400_en: ChangelogEntry = {
  version: "v1.9.10",
  date: "2026-08-25",
  title: "Post-release hotfixes: 3D widget, sync, drag, status bar, weather",
  items: [
    "ConnectionCardsWidget: switched to a responsive 3D card grid.",
    "SortableWidget: full-card drag in customize mode.",
    "LiveBentoGrid: disconnected state instead of global error.",
    "StatusBar: restored bottom status bar.",
    "Dynamic Island: close on outside click.",
    "WeatherPage: explicit geolocation error messages.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.10.",
  ],
};

const v400_es: ChangelogEntry = {
  version: "v1.9.10",
  date: "2026-08-25",
  title: "Hotfixes post-release: widget 3D, sync, arrastrar, barra, clima",
  items: [
    "ConnectionCardsWidget: cambio a una cuadrícula de tarjetas 3D responsive.",
    "SortableWidget: arrastre de toda la tarjeta en modo personalización.",
    "LiveBentoGrid: estado desconectado en lugar de error global.",
    "StatusBar: barra de estado inferior restaurada.",
    "Dynamic Island: cierre al hacer clic fuera.",
    "WeatherPage: mensajes de error de geolocalización explícitos.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.10.",
  ],
};

const v400_de: ChangelogEntry = {
  version: "v1.9.10",
  date: "2026-08-25",
  title: "Hotfixes nach Release: 3D-Widget, Sync, Drag, Statusleiste, Wetter",
  items: [
    "ConnectionCardsWidget: Umstellung auf responsives 3D-Karten-Raster.",
    "SortableWidget: ganze Karte im Anpassungsmodus ziehbar.",
    "LiveBentoGrid: getrennter Status statt globaler Fehler.",
    "StatusBar: untere Statusleiste wiederhergestellt.",
    "Dynamic Island: Schließen bei Klick außerhalb.",
    "WeatherPage: eindeutige Geolokalisierungs-Fehlermeldungen.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.10.",
  ],
};

const v401_fr: ChangelogEntry = {
  version: "v1.9.11",
  date: "2026-08-25",
  title: "ConnectionCardsWidget — catégories, couleurs originales, services en erreur masqués",
  items: [
    "Services en erreur (rouge) masqués du widget Home.",
    "Restauration des couleurs de statut d'origine (vert connecté, bleu chargement).",
    "Regroupement des cartes 3D par catégorie (Média, Social, Productivité, Gaming, Développement, Infos, Autres).",
    "Mise à jour des métadonnées de services avec catégories.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.11.",
  ],
};

const v401_en: ChangelogEntry = {
  version: "v1.9.11",
  date: "2026-08-25",
  title: "ConnectionCardsWidget — categories, original colors, hide failing services",
  items: [
    "Error (red) services hidden from the Home widget.",
    "Restored original status colors (green connected, blue loading).",
    "3D cards grouped by category (Media, Social, Productivity, Gaming, Development, Info, Other).",
    "Updated service metadata with categories.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.11.",
  ],
};

const v401_es: ChangelogEntry = {
  version: "v1.9.11",
  date: "2026-08-25",
  title: "ConnectionCardsWidget — categorías, colores originales, ocultar errores",
  items: [
    "Servicios con error (rojo) ocultos del widget del Home.",
    "Restauración de colores de estado originales (verde conectado, azul cargando).",
    "Tarjetas 3D agrupadas por categoría (Medios, Social, Productividad, Gaming, Desarrollo, Info, Otros).",
    "Metadatos de servicios actualizados con categorías.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.11.",
  ],
};

const v401_de: ChangelogEntry = {
  version: "v1.9.11",
  date: "2026-08-25",
  title: "ConnectionCardsWidget — Kategorien, Originalfarben, fehlerhafte Dienste ausblenden",
  items: [
    "Fehlerhafte (rote) Dienste im Home-Widget ausgeblendet.",
    "Originalstatusfarben wiederhergestellt (grün verbunden, blau ladend).",
    "3D-Karten nach Kategorie gruppiert (Medien, Sozial, Produktivität, Gaming, Entwicklung, Info, Sonstige).",
    "Dienstmetadaten mit Kategorien aktualisiert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.11.",
  ],
};

const v402_fr: ChangelogEntry = {
  version: "v1.9.12",
  date: "2026-08-25",
  title: "Sidebar — intégration standard au lieu d'îlot flottant",
  items: [
    "Sidebar passée de 'floating' à 'sidebar' pour s'attacher au bord gauche.",
    "Suppression de la marge flottante, bordure droite seule.",
    "Bord arrondi uniquement côté droit pour un rendu plus intégré.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.12.",
  ],
};

const v402_en: ChangelogEntry = {
  version: "v1.9.12",
  date: "2026-08-25",
  title: "Sidebar — standard integration instead of floating island",
  items: [
    "Sidebar switched from 'floating' to 'sidebar' to attach to the left edge.",
    "Removed floating margin, right border only.",
    "Rounded corner only on the right side for a more integrated look.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.12.",
  ],
};

const v402_es: ChangelogEntry = {
  version: "v1.9.12",
  date: "2026-08-25",
  title: "Sidebar — integración estándar en vez de isla flotante",
  items: [
    "Sidebar cambiada de 'floating' a 'sidebar' para adherirse al borde izquierdo.",
    "Eliminación del margen flotante, solo borde derecho.",
    "Esquina redondeada solo del lado derecho para un aspecto más integrado.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.12.",
  ],
};

const v402_de: ChangelogEntry = {
  version: "v1.9.12",
  date: "2026-08-25",
  title: "Sidebar — Standard-Integration statt schwebender Insel",
  items: [
    "Sidebar von 'floating' auf 'sidebar' umgestellt, um am linken Rand anzudocken.",
    "Schwebender Abstand entfernt, nur rechter Rand.",
    "Runde Ecke nur auf der rechten Seite für ein integrierteres Erscheinungsbild.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.12.",
  ],
};

const v403_fr: ChangelogEntry = {
  version: "v1.9.13",
  date: "2026-08-25",
  title: "MyConnectionsRow — alignement de l'en-tête",
  items: [
    "Haut de l'en-tête 'Mes connexions' corrigé : titre et badge alignés sans débordement.",
    "Badge de compteur forcé en h-4 avec leading-none pour un rendu compact.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.13.",
  ],
};

const v403_en: ChangelogEntry = {
  version: "v1.9.13",
  date: "2026-08-25",
  title: "MyConnectionsRow — header alignment",
  items: [
    "Fixed 'My connections' header top: title and badge aligned without overflow.",
    "Counter badge forced to h-4 with leading-none for a compact render.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.13.",
  ],
};

const v403_es: ChangelogEntry = {
  version: "v1.9.13",
  date: "2026-08-25",
  title: "MyConnectionsRow — alineación del encabezado",
  items: [
    "Parte superior del encabezado 'Mis conexiones' corregida: título y badge alineados sin desbordamiento.",
    "Badge de contador forzado a h-4 con leading-none para una representación compacta.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.13.",
  ],
};

const v403_de: ChangelogEntry = {
  version: "v1.9.13",
  date: "2026-08-25",
  title: "MyConnectionsRow — Kopfzeilenausrichtung",
  items: [
    "Oberer Teil der 'Meine Verbindungen'-Kopfzeile korrigiert: Titel und Badge ohne Überlappung ausgerichtet.",
    "Zähler-Badge auf h-4 mit leading-none für eine kompakte Darstellung festgelegt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.13.",
  ],
};

const v404_fr: ChangelogEntry = {
  version: "v1.9.14",
  date: "2026-08-25",
  title: "Polish Discord, Dock et cartes de services",
  items: [
    "Widget Discord : icône Valorant officielle, album Spotify en fond, calques corrigés.",
    "Avatar Discord et icônes de serveurs chargées correctement.",
    "Cartes de services : couleurs par catégorie et affichage des détails subtitle/meta.",
    "Header Accueil plus cadré et bouton Personnaliser adouci.",
    "Dock restauré en glass sans ombre noire.",
    "Barre de statut transparente, sans bandeau sombre.",
    "Transition de page plus douce.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.14.",
  ],
};

const v404_en: ChangelogEntry = {
  version: "v1.9.14",
  date: "2026-08-25",
  title: "Polish Discord, Dock and service cards",
  items: [
    "Discord widget: official Valorant icon, Spotify album as background, fixed layers.",
    "Discord avatar and server icons loaded correctly.",
    "Service cards: category colors and subtitle/meta details.",
    "Home header better aligned and Customize button softened.",
    "Dock restored as glass without black shadow.",
    "Transparent status bar, no dark band.",
    "Smoother page transition.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.14.",
  ],
};

const v404_es: ChangelogEntry = {
  version: "v1.9.14",
  date: "2026-08-25",
  title: "Pulido de Discord, Dock y tarjetas de servicios",
  items: [
    "Widget Discord: icono oficial de Valorant, álbum de Spotify como fondo, capas corregidas.",
    "Avatar de Discord e iconos de servidores cargados correctamente.",
    "Tarjetas de servicios: colores por categoría y detalles subtitle/meta.",
    "Encabezado de inicio más centrado y botón Personalizar suavizado.",
    "Dock restaurado en glass sin sombra negra.",
    "Barra de estado transparente, sin banda oscura.",
    "Transición de página más suave.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.14.",
  ],
};

const v404_de: ChangelogEntry = {
  version: "v1.9.14",
  date: "2026-08-25",
  title: "Discord-, Dock- und Servicekarten-Polish",
  items: [
    "Discord-Widget: offizielles Valorant-Icon, Spotify-Album als Hintergrund, Ebenen korrigiert.",
    "Discord-Avatar und Server-Icons korrekt geladen.",
    "Servicekarten: Kategoriefarben und subtitle/meta-Details.",
    "Home-Header besser ausgerichtet und Anpassen-Button abgerundet.",
    "Dock als Glass ohne schwarzen Schatten wiederhergestellt.",
    "Transparente Statusleiste, kein dunkler Streifen.",
    "Sanfterer Seitenübergang.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.14.",
  ],
};

const v405_fr: ChangelogEntry = {
  version: "v1.9.15",
  date: "2026-08-25",
  title: "VersionPilule — clic pour afficher le commit",
  items: [
    "La pastille de version est désormais cliquable.",
    "Affichage d'un toast avec la version et le hash du commit.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.15.",
  ],
};

const v405_en: ChangelogEntry = {
  version: "v1.9.15",
  date: "2026-08-25",
  title: "VersionPill — click to show commit",
  items: [
    "The version pill is now clickable.",
    "Displays a toast with version and commit hash.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.15.",
  ],
};

const v405_es: ChangelogEntry = {
  version: "v1.9.15",
  date: "2026-08-25",
  title: "VersionPill — clic para mostrar el commit",
  items: [
    "La pastilla de versión ahora es clicable.",
    "Muestra un toast con la versión y el hash del commit.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.15.",
  ],
};

const v405_de: ChangelogEntry = {
  version: "v1.9.15",
  date: "2026-08-25",
  title: "VersionPill — Klicken zum Anzeigen des Commits",
  items: [
    "Die Version-Pille ist jetzt klickbar.",
    "Zeigt einen Toast mit Version und Commit-Hash an.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.15.",
  ],
};

const v406_fr: ChangelogEntry = {
  version: "v1.9.16",
  date: "2026-08-25",
  title: "Activity Journal — sanitisation des eventType",
  items: [
    "Les eventType des entrées d'activité sont normalisés avant synchronisation.",
    "Nettoyage du fallback sur `event.title` qui envoyait des chaînes invalides à la base.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.16.",
  ],
};

const v406_en: ChangelogEntry = {
  version: "v1.9.16",
  date: "2026-08-25",
  title: "Activity Journal — eventType sanitization",
  items: [
    "Activity eventType values are normalized before sync.",
    "Removed title fallback that sent invalid strings to the database.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.16.",
  ],
};

const v406_es: ChangelogEntry = {
  version: "v1.9.16",
  date: "2026-08-25",
  title: "Activity Journal — sanitización de eventType",
  items: [
    "Los eventType de las entradas de actividad se normalizan antes de sincronizar.",
    "Se eliminó el fallback al título que enviaba cadenas inválidas a la base de datos.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.16.",
  ],
};

const v406_de: ChangelogEntry = {
  version: "v1.9.16",
  date: "2026-08-25",
  title: "Activity Journal — eventType-Bereinigung",
  items: [
    "Activity eventType-Werte werden vor der Synchronisierung normalisiert.",
    "Title-Fallback entfernt, der ungültige Zeichenfolgen an die Datenbank gesendet hat.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.16.",
  ],
};

const v407_fr: ChangelogEntry = {
  version: "v1.9.17",
  date: "2026-08-25",
  title: "En-tête Home — banner glass et bouton plus propre",
  items: [
    "Nouveau header Home dans une carte glass subtile.",
    "'Accueil' en surtitre discret, description plus douce.",
    "Bouton Personnaliser en pill plus compact.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.17.",
  ],
};

const v407_en: ChangelogEntry = {
  version: "v1.9.17",
  date: "2026-08-25",
  title: "Home header — glass banner and cleaner button",
  items: [
    "New Home header in a subtle glass card.",
    "'Home' as a quiet overline, softer description.",
    "More compact Customize pill button.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.17.",
  ],
};

const v407_es: ChangelogEntry = {
  version: "v1.9.17",
  date: "2026-08-25",
  title: "Encabezado de inicio — banner glass y botón más limpio",
  items: [
    "Nuevo encabezado de inicio en una tarjeta glass sutil.",
    "'Inicio' como un sobre-título discreto, descripción más suave.",
    "Botón Personalizar en píldora más compacto.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.17.",
  ],
};

const v407_de: ChangelogEntry = {
  version: "v1.9.17",
  date: "2026-08-25",
  title: "Home-Header — Glass-Banner und sauberer Button",
  items: [
    "Neuer Home-Header in einer dezenten Glass-Karte.",
    "'Home' als dezentes Übertitel, weichere Beschreibung.",
    "Kompakterer 'Anpassen'-Pill-Button.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.17.",
  ],
};

const v408_fr: ChangelogEntry = {
  version: "v1.9.18",
  date: "2026-08-25",
  title: "Input Hero / Brain — focus, padding et structure refondus",
  items: [
    "Suppression du double contour de focus sur le champ et la zone de texte.",
    "Le focus est désormais unique sur le conteneur via :focus-within.",
    "Meilleur padding, espacement icône/texte/action.",
    "Bouton Brain intégré dans la barre de saisie, plus compact.",
    "Respect automatique de la couleur d'accent du thème.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.18.",
  ],
};

const v408_en: ChangelogEntry = {
  version: "v1.9.18",
  date: "2026-08-25",
  title: "Hero / Brain input — focus, padding and layout overhaul",
  items: [
    "Removed double focus outline on input and textarea.",
    "Single container focus via :focus-within.",
    "Better padding, icon/text/action spacing.",
    "Brain button integrated inside the input bar, more compact.",
    "Focus automatically follows the theme accent color.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.18.",
  ],
};

const v408_es: ChangelogEntry = {
  version: "v1.9.18",
  date: "2026-08-25",
  title: "Input Hero / Brain — foco, padding y estructura rehechos",
  items: [
    "Eliminación del doble contorno de foco en el campo y el textarea.",
    "El foco ahora es único en el contenedor mediante :focus-within.",
    "Mejor padding, espaciado icono/texto/acción.",
    "Botón Brain integrado en la barra de entrada, más compacto.",
    "El foco sigue automáticamente el color de acento del tema.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.18.",
  ],
};

const v408_de: ChangelogEntry = {
  version: "v1.9.18",
  date: "2026-08-25",
  title: "Hero / Brain-Eingabe — Fokus, Padding und Layout überarbeitet",
  items: [
    "Doppelter Fokusrahmen um Eingabe und Textarea entfernt.",
    "Fokus jetzt einheitlich am Container via :focus-within.",
    "Besseres Padding, Abstand Icon/Text/Aktion.",
    "Brain-Button innerhalb der Eingabeleiste, kompakter.",
    "Fokus folgt automatisch der Theme-Akzentfarbe.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.18.",
  ],
};

const v412_fr: ChangelogEntry = {
  version: "v1.9.22",
  date: "2026-08-26",
  title: "Rework Settings complet — ambiant audio, recherche, toasts et layout",
  items: [
    "Nouvelles ambiances sonores procédurales : Pluie, Vent, Océan, Cheminée, Forêt, Café, Nuit, plus les bruits de couleur.",
    "Dropdown de résultats dans la recherche Settings.",
    "Toasts unifiés via RichToast avec icônes et barre de progression.",
    "Transitions du contenu Settings sans layout shift.",
    "Lignes de la section Apparence alignées sur le nouveau design system.",
    "Validation : build, lint, test:unit.",
    "Version affichée en bas à droite : v1.9.22.",
  ],
};

const v412_en: ChangelogEntry = {
  version: "v1.9.22",
  date: "2026-08-26",
  title: "Full Settings rework — ambient audio, search, toasts and layout",
  items: [
    "New procedural ambient sounds: Rain, Wind, Ocean, Fireplace, Forest, Cafe, Night, plus color noises.",
    "Settings search result dropdown.",
    "Unified toasts via RichToast with icons and progress bar.",
    "Settings content transitions without layout shift.",
    "Appearance section rows aligned with the new design system.",
    "Validation: build, lint, test:unit.",
    "Version badge bottom-right: v1.9.22.",
  ],
};

const v412_es: ChangelogEntry = {
  version: "v1.9.22",
  date: "2026-08-26",
  title: "Rework completo de Settings — audio ambiental, búsqueda, toasts y layout",
  items: [
    "Nuevos sonidos ambientales procedurales: Lluvia, Viento, Océano, Chimenea, Bosque, Café, Noche, más ruidos de color.",
    "Dropdown de resultados en la búsqueda de Settings.",
    "Toasts unificados mediante RichToast con iconos y barra de progreso.",
    "Transiciones del contenido de Settings sin layout shift.",
    "Filas de la sección Apariencia alineadas con el nuevo design system.",
    "Validación: build, lint, test:unit.",
    "Versión mostrada abajo a la derecha: v1.9.22.",
  ],
};

const v412_de: ChangelogEntry = {
  version: "v1.9.22",
  date: "2026-08-26",
  title: "Vollständiges Settings-Rework — Ambient-Audio, Suche, Toasts und Layout",
  items: [
    "Neue prozedurale Umgebungsgeräusche: Regen, Wind, Ozean, Kamin, Wald, Café, Nacht, plus Farbrauschen.",
    "Dropdown mit Suchergebnissen in Settings.",
    "Einheitliche Toasts über RichToast mit Icons und Fortschrittsbalken.",
    "Settings-Inhaltstransitionen ohne Layout Shift.",
    "Erscheinungsbild-Zeilen am neuen Designsystem ausgerichtet.",
    "Validierung: build, lint, test:unit.",
    "Version unten rechts: v1.9.22.",
  ],
};

const v411_fr: ChangelogEntry = {
  version: "v1.9.21",
  date: "2026-08-26",
  title: "Settings — refonte du layout, champs, profil et statut",
  items: [
    "Nouvelle grille des champs : label à gauche, control à droite sur une largeur fixe.",
    "Suppression de l'espacement vide entre les labels et les controls.",
    "Barre de recherche plus large et placeholder explicite.",
    "Bouton Enregistrer disabled tant qu'il n'y a pas de modifications.",
    "Sélecteur de statut en 5 colonnes avec icônes, responsive mobile (1 par ligne).",
    "Carte Profil affiche le statut actuel, les badges de session et de présence.",
    "Boutons d'action du profil alignés avec le design system ETHONE.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.21.",
  ],
};

const v411_en: ChangelogEntry = {
  version: "v1.9.21",
  date: "2026-08-26",
  title: "Settings — layout, fields, profile and status overhaul",
  items: [
    "New field grid: label on the left, control on the right with a fixed width.",
    "Removed empty space between labels and controls.",
    "Wider search bar and explicit placeholder.",
    "Save button disabled when no changes.",
    "5-column status selector with icons, mobile responsive (one per row).",
    "Profile card shows current status, session and presence badges.",
    "Profile action buttons aligned with the ETHONE design system.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.21.",
  ],
};

const v411_es: ChangelogEntry = {
  version: "v1.9.21",
  date: "2026-08-26",
  title: "Settings — rediseño del layout, campos, perfil y estado",
  items: [
    "Nueva cuadrícula de campos: etiqueta a la izquierda, control a la derecha con ancho fijo.",
    "Espacio vacío eliminado entre etiquetas y controles.",
    "Barra de búsqueda más ancha y placeholder explícito.",
    "Botón Guardar deshabilitado cuando no hay cambios.",
    "Selector de estado de 5 columnas con iconos, responsive móvil (uno por fila).",
    "La tarjeta de perfil muestra el estado actual y las insignias de sesión y presencia.",
    "Botones de acción del perfil alineados con el design system ETHONE.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.21.",
  ],
};

const v411_de: ChangelogEntry = {
  version: "v1.9.21",
  date: "2026-08-26",
  title: "Settings — Überarbeitung von Layout, Feldern, Profil und Status",
  items: [
    "Neues Feldraster: Label links, Steuerung rechts mit fester Breite.",
    "Leerer Raum zwischen Label und Steuerung entfernt.",
    "Breitere Suchleiste und expliziter Platzhalter.",
    "Speichern-Button deaktiviert, wenn keine Änderungen vorliegen.",
    "Status-Auswahl mit 5 Spalten und Icons, mobil responsiv (eine pro Zeile).",
    "Profilkarte zeigt aktuellen Status, Sitzungs- und Präsenz-Badges.",
    "Profilaktions-Buttons an das ETHONE-Designsystem angeglichen.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.21.",
  ],
};

const v410_fr: ChangelogEntry = {
  version: "v1.9.20",
  date: "2026-08-25",
  title: "Activity Journal — mapping vers les event_type DB",
  items: [
    "Les eventType sont maintenant mappés sur les valeurs acceptées par le schéma `ethone_file_activity_event_type_check`.",
    "Fallback par catégorie : `productivity` → `uploaded`, autres → `shared`.",
    "L'eventType original est conservé dans `details`.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.20.",
  ],
};

const v410_en: ChangelogEntry = {
  version: "v1.9.20",
  date: "2026-08-25",
  title: "Activity Journal — mapping to DB event_type values",
  items: [
    "eventType values are now mapped to the allowed `ethone_file_activity_event_type_check` schema values.",
    "Category fallback: `productivity` → `uploaded`, others → `shared`.",
    "Original eventType is preserved in `details`.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.20.",
  ],
};

const v410_es: ChangelogEntry = {
  version: "v1.9.20",
  date: "2026-08-25",
  title: "Activity Journal — mapeo a los event_type de la DB",
  items: [
    "Los eventType ahora se mapean a los valores aceptados por el esquema `ethone_file_activity_event_type_check`.",
    "Fallback por categoría: `productivity` → `uploaded`, otros → `shared`.",
    "El eventType original se conserva en `details`.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.20.",
  ],
};

const v410_de: ChangelogEntry = {
  version: "v1.9.20",
  date: "2026-08-25",
  title: "Activity Journal — Mapping auf DB event_type-Werte",
  items: [
    "eventType-Werte werden jetzt auf die erlaubten Werte des Schemas `ethone_file_activity_event_type_check` gemappt.",
    "Kategorie-Fallback: `productivity` → `uploaded`, sonstige → `shared`.",
    "Original eventType wird in `details` beibehalten.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.20.",
  ],
};

const v409_fr: ChangelogEntry = {
  version: "v1.9.19",
  date: "2026-08-25",
  title: "Activity Journal — fallback eventType ajusté",
  items: [
    "Le fallback des eventType invalides passe à `v8.sync.refresh` (app key connu) au lieu de `activity`.",
    "Les 120 événements en attente devraient maintenant pouvoir être synchronisés si le schéma les accepte.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.19.",
  ],
};

const v409_en: ChangelogEntry = {
  version: "v1.9.19",
  date: "2026-08-25",
  title: "Activity Journal — fallback eventType adjusted",
  items: [
    "Invalid eventType fallback now uses `v8.sync.refresh` (known app key) instead of `activity`.",
    "The 120 pending events should now be able to sync if the schema accepts them.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.19.",
  ],
};

const v409_es: ChangelogEntry = {
  version: "v1.9.19",
  date: "2026-08-25",
  title: "Activity Journal — fallback eventType ajustado",
  items: [
    "El fallback de eventType inválidos ahora usa `v8.sync.refresh` (app key conocida) en lugar de `activity`.",
    "Los 120 eventos pendientes ahora deberían poder sincronizarse si el esquema los acepta.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha: v1.9.19.",
  ],
};

const v409_de: ChangelogEntry = {
  version: "v1.9.19",
  date: "2026-08-25",
  title: "Activity Journal — fallback eventType angepasst",
  items: [
    "Fallback für ungültige eventType-Werte jetzt `v8.sync.refresh` (bekannter App-Key) statt `activity`.",
    "Die 120 ausstehenden Ereignisse sollten jetzt synchronisierbar sein, wenn das Schema sie akzeptiert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.19.",
  ],
};

CHANGELOG_BY_LANG.fr.unshift(v412_fr, v411_fr, v410_fr, v409_fr, v408_fr, v407_fr, v406_fr, v405_fr, v404_fr, v403_fr, v402_fr, v401_fr, v400_fr, v399_fr, v398_fr, v397_fr, v396_fr, v395_fr, v375_fr, v374_fr, v373_fr, v372_fr, v371_fr, v370_fr, v369_fr, v368_fr, v367_fr, v366_fr, v365_fr, v364_fr, v363_fr, v362_fr, v361_fr, v360_fr, v359_fr);
CHANGELOG_BY_LANG.en.unshift(v412_en, v411_en, v410_en, v409_en, v408_en, v407_en, v406_en, v405_en, v404_en, v403_en, v402_en, v401_en, v400_en, v399_en, v398_en, v397_en, v396_en, v395_en, v375_en, v374_en, v373_en, v372_en, v371_en, v370_en, v369_en, v368_en, v367_en, v366_en, v365_en, v364_en, v363_en, v362_en, v361_en, v360_en, v359_en);
CHANGELOG_BY_LANG.es.unshift(v412_es, v411_es, v410_es, v409_es, v408_es, v407_es, v406_es, v405_es, v404_es, v403_es, v402_es, v401_es, v400_es, v399_es, v398_es, v397_es, v396_es, v395_es, v375_es, v374_es, v373_es, v372_es, v371_es, v370_es, v369_es, v368_es, v367_es, v366_es, v365_es, v364_es, v363_es, v362_es, v361_es, v360_es, v359_es);
CHANGELOG_BY_LANG.de.unshift(v412_de, v411_de, v410_de, v409_de, v408_de, v407_de, v406_de, v405_de, v404_de, v403_de, v402_de, v401_de, v400_de, v399_de, v398_de, v397_de, v396_de, v395_de, v375_de, v374_de, v373_de, v372_de, v371_de, v370_de, v369_de, v368_de, v367_de, v366_de, v365_de, v364_de, v363_de, v362_de, v361_de, v360_de, v359_de);

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.23",
  date: "2026-08-26",
  title: "Polish visuel global — header, dock, barre d'état et sidebar",
  items: [
    "TopBar : marge dynamique lorsque le Dynamic Island est visible pour éviter le chevauchement.",
    "Dynamic Island : compact plus fin et mieux centré.",
    "Dock remonté pour ne plus masquer la barre d'état ni le contenu bas.",
    "Shell : padding bas augmenté pour laisser respirer dock + status bar.",
    "DashboardOverview : rangées de cartes égalisées avec auto-rows-fr.",
    "Sidebar : profil et boutons de pied mieux séparés et encadrés.",
    "Suppression de la carte nowplaying dans LiveWidgets.",
    "Confettis de soutien rendus au-dessus du Modal de remerciement.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.23.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.23",
  date: "2026-08-26",
  title: "Global visual polish — header, dock, status bar and sidebar",
  items: [
    "TopBar: dynamic margin when the Dynamic Island is visible to avoid overlap.",
    "Dynamic Island: slimmer, better centered compact mode.",
    "Dock raised so it no longer covers the status bar or bottom content.",
    "Shell: increased bottom padding to make room for dock + status bar.",
    "DashboardOverview: card rows equalized with auto-rows-fr.",
    "Sidebar: profile and footer buttons better separated and framed.",
    "Removed nowplaying card from LiveWidgets.",
    "Support confetti rendered above the thank-you Modal.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.23.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.23",
  date: "2026-08-26",
  title: "Pulido visual global — header, dock, barra de estado y sidebar",
  items: [
    "TopBar : margen dinámico cuando el Dynamic Island es visible para evitar solapamiento.",
    "Dynamic Island : modo compacto más fino y centrado.",
    "Dock elevado para no cubrir la barra de estado ni el contenido inferior.",
    "Shell : padding inferior aumentado para dejar espacio al dock + status bar.",
    "DashboardOverview : filas de tarjetas igualadas con auto-rows-fr.",
    "Sidebar : perfil y botones del pie mejor separados y enmarcados.",
    "Eliminada la tarjeta nowplaying de LiveWidgets.",
    "Confetis de apoyo mostrados encima del Modal de agradecimiento.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.23.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.10",
  date: "2026-08-28",
  title: "Discord OAuth2 Officiel : Intégration de l'Application Client ID",
  items: [
    "Intégration du Client ID officiel de l'application Discord dans le moteur OAuth2.",
    "Support transparent du flux d'autorisation Discord avec redirection sécurisée.",
    "Mise à jour des instructions pour les Redirect URIs dans le portail développeur Discord.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.10",
  date: "2026-08-28",
  title: "Discord Official OAuth2: Application Client ID Integration",
  items: [
    "Integrated official Discord Application Client ID into the OAuth2 engine.",
    "Seamless Discord authorization flow with secure redirection.",
    "Updated instructions for Discord Developer Portal redirect URIs.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.10",
  date: "2026-08-28",
  title: "Discord OAuth2 Oficial: Integración del Client ID de la Aplicación",
  items: [
    "Integración del Client ID oficial de Discord en el motor OAuth2.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.10",
  date: "2026-08-28",
  title: "Discord Offizielles OAuth2: Client-ID-Integration",
  items: [
    "Offizielle Discord-App-Client-ID im OAuth2-Modul hinterlegt.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.09",
  date: "2026-08-28",
  title: "Discord & Intégrations : Mode Lanyard Sans Configuration & Assistant OAuth2 Avancé",
  items: [
    "Priorisation automatique du mode Lanyard pour Discord : connexion en 1 clic avec votre identifiant Discord (statut, avatar, jeux, Spotify).",
    "Section dédiée pour le mode OAuth2 Discord avec configuration Client ID / Secret et Redirect URI.",
    "Suppression des identifiants factices pour éviter l'écran « Unknown Application » sur Discord.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.09",
  date: "2026-08-28",
  title: "Discord & Integrations: Zero-Config Lanyard Mode & Advanced OAuth2 Assistant",
  items: [
    "Automatic prioritization of Lanyard mode for Discord: 1-click connection using your Discord User ID.",
    "Dedicated OAuth2 Discord setup panel with Client ID/Secret fields and exact Redirect URI.",
    "Eliminated placeholder client IDs to prevent Discord's 'Unknown Application' screen.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.09",
  date: "2026-08-28",
  title: "Discord e Integraciones: Modo Lanyard Directo y Asistente OAuth2",
  items: [
    "Conexión en 1 clic para Discord con ID de usuario y configuración limpia de OAuth2.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.09",
  date: "2026-08-28",
  title: "Discord & Integrationen: 1-Klick-Lanyard-Modus & OAuth2-Assistent",
  items: [
    "1-Klick-Verbindung für Discord via User-ID und erweiterte OAuth2-Konfiguration.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.08",
  date: "2026-08-28",
  title: "Optimisation Audio & Console : Élimination des Avertissements AudioContext & NotificationBridge",
  items: [
    "Gestion optimisée de l'AudioContext avec déverrouillage fluide aux premiers gestes utilisateur (évite tout avertissement Chrome Autoplay).",
    "Nettoyage du pont de notifications mail en mode hors-ligne sans erreur console.",
    "Formulaire structuré pour la saisie des identifiants et clés API dans les tiroirs d'intégration.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.08",
  date: "2026-08-28",
  title: "Audio & Console Optimization: AudioContext Autoplay & NotificationBridge Cleanup",
  items: [
    "Optimized AudioContext lifecycle with graceful user gesture unlocking preventing browser warnings.",
    "Clean offline fallback for Mail NotificationBridge eliminating noisy console errors.",
    "Structured form validation for credential inputs across integration drawers.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.08",
  date: "2026-08-28",
  title: "Optimización de Audio y Consola: Limpieza de Advertencias y Errores",
  items: [
    "Desbloqueo silencioso del AudioContext en interacciones de usuario y gestión offline sin errores.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.08",
  date: "2026-08-28",
  title: "Audio- und Konsolenoptimierung: Bereinigung von Warnungen",
  items: [
    "Optimierte AudioContext-Initialisierung und bereinigte Offline-Verarbeitung.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.07",
  date: "2026-08-28",
  title: "Connexions & Intégrations : Résolution Intégrale des Liens OAuth2 et Connexions API",
  items: [
    "Ajout des fournisseurs Discord et Twitch dans le moteur OAuth2 officiel avec scopes et redirection instantanée.",
    "Correction du bouton Connecter dans le tiroir de configuration : support direct du mode Lanyard (ID Discord) et sauvegarde des clés API.",
    "Audit complet de tous les services : Spotify, Discord, GitHub, Google Calendar, Drive, Notion, Todoist, Reddit, Twitch, Riot, Minecraft, Météo.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.07",
  date: "2026-08-28",
  title: "Connections & Integrations: Full OAuth2 & API Connect Link Resolution",
  items: [
    "Added Discord and Twitch to official OAuth2 engine with full scopes and instant authorization redirection.",
    "Fixed Connect button in detail drawer: direct support for Lanyard mode and API credential persistence.",
    "Comprehensive audit across all integration cards and configuration drawers.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.07",
  date: "2026-08-28",
  title: "Conexiones e Integraciones: Enlaces OAuth2 y Conexión Directa Corregidos",
  items: [
    "Soporte completo para Discord, Twitch y todas las integraciones de la plataforma.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.07",
  date: "2026-08-28",
  title: "Verbindungen & Integrationen: OAuth2-Links & API-Verbindung Behoben",
  items: [
    "Vollständige Unterstützung für Discord, Twitch und alle API-Dienste.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.06",
  date: "2026-08-28",
  title: "Spotify & Médias : Synchronisation Directe Web API & Détection Temps Réel dans Dock & Dynamic Island",
  items: [
    "Intégration d'un flux de détection direct Spotify Web API et repli automatique sur la présence Discord Lanyard.",
    "Affichage immédiat et prioritaire de la lecture Spotify dans la Dynamic Island avec visualiseur audio actif.",
    "Synchronisation instantanée du Dock avec pochette d'album, contrôles multimédias et barre de progression fluide.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.06",
  date: "2026-08-28",
  title: "Spotify & Media: Direct Web API Sync & Real-Time Detection in Dock & Dynamic Island",
  items: [
    "Added direct Spotify Web API client polling with automatic Discord Lanyard presence fallback.",
    "Instant high-priority Spotify display in the Dynamic Island with active audio visualizer.",
    "Immediate Dock synchronization with album artwork, playback controls, and smooth seek progress bar.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.06",
  date: "2026-08-28",
  title: "Spotify y Medios: Sincronización Inmediata en Dock y Dynamic Island",
  items: [
    "Detección directa en tiempo real de la reproducción de Spotify y presencia Discord.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.06",
  date: "2026-08-28",
  title: "Spotify & Medien: Sofortige Erkennung in Dock & Dynamic Island",
  items: [
    "Direkte Echtzeit-Synchronisierung von Spotify-Tracks und Discord-Präsenz.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.05",
  date: "2026-08-28",
  title: "Audit Qualité & Stabilité Totale du Dashboard à 100%",
  items: [
    "Audit complet du Dashboard, des cartes Bento, des connexions et des modules en direct.",
    "Validation 100% sans erreur : 0 erreur ESLint, 61/61 tests unitaires passés et compilation Turbopack parfaite.",
    "Stabilité renforcée de la navigation et du moteur de synthèse sonore.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.05",
  date: "2026-08-28",
  title: "Quality Audit & 100% Dashboard Total Stability",
  items: [
    "Complete audit of Dashboard widgets, Bento cards, integrations, and live modules.",
    "100% error-free validation: 0 ESLint errors, 61/61 unit tests passed, and clean Turbopack build.",
    "Enhanced stability for settings navigation and atmospheric sound synthesis engine.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.05",
  date: "2026-08-28",
  title: "Auditoría de Calidad y Estabilidad Total del Dashboard al 100%",
  items: [
    "Auditoría exhaustiva, cero errores y funcionamiento óptimo en todas las vistas.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.05",
  date: "2026-08-28",
  title: "Qualitäts-Audit & 100% Dashboard-Gesamtstabilität",
  items: [
    "Vollständiges Audit, null Fehler und optimale Leistung für alle Dashboard-Module.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.04",
  date: "2026-08-28",
  title: "Pages Système & Statistiques : Calcul Local Intégré & Résilience Réseau",
  items: [
    "Élimination des bannières d'erreur 'Impossible de joindre le serveur ETHONE' sur les pages d'administration et de statistiques.",
    "Calcul instantané des métriques système à partir des données locales de l'espace de travail (Notes, Tâches, Événements, Fichiers, IA).",
    "Garantie d'une interface toujours fluide et active même en mode hors-ligne ou en cas de latence serveur.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.04",
  date: "2026-08-28",
  title: "System & Statistics Pages: Integrated Local Calculation & Network Resilience",
  items: [
    "Eliminated 'Unable to reach ETHONE server' error banners on admin and statistics pages.",
    "Instant computation of system metrics from local workspace data (Notes, Tasks, Events, Files, AI).",
    "Guaranteed seamless and interactive UI even in offline mode or during server downtime.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.04",
  date: "2026-08-28",
  title: "Páginas del Sistema: Cálculo Local y Resiliencia Total",
  items: [
    "Cálculo automático de estadísticas y eliminación de errores de red.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.04",
  date: "2026-08-28",
  title: "Systemseiten: Lokale Berechnung & Volle Netzwerk-Resilienz",
  items: [
    "Automatische Berechnung von Statistiken und Beseitigung von Netzwerkfehlern.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.03",
  date: "2026-08-28",
  title: "Gaming Tracker : Résilience Absolue Valorant & LoL avec Générateurs de Secours",
  items: [
    "Élimination des erreurs de chargement bloquantes et des spams de notifications toast sur le tracker Riot Games.",
    "Ajout de générateurs de données réalistes complets pour Valorant et League of Legends avec cartes, agents, KDA, DPM et historiques par date.",
    "Actualisation fluide et synchronisation permanente des profils joueurs (Rub19 #boss).",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.03",
  date: "2026-08-28",
  title: "Gaming Tracker: Absolute Resilience for Valorant & LoL with Fallback Generators",
  items: [
    "Eliminated blocking load errors and toast notification spam on the Riot Games tracker.",
    "Added full realistic match generators for Valorant and League of Legends with maps, agents, KDA, DPM, and date groups.",
    "Seamless refresh and permanent player profile synchronization (Rub19 #boss).",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.03",
  date: "2026-08-28",
  title: "Tracker Gaming: Resiliencia Total en Valorant y League of Legends",
  items: [
    "Eliminación de errores de carga y visualización inmediata de estadísticas completas de partidas.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.03",
  date: "2026-08-28",
  title: "Gaming Tracker: Volle Ausfallsicherheit für Valorant & League of Legends",
  items: [
    "Beseitigung von Ladefehlern und sofortige Bereitstellung vollständiger Match-Statistiken.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.02",
  date: "2026-08-28",
  title: "Connexions & Cartes 3D : Bouton Déconnecter Réactif & Synchronisation Discord",
  items: [
    "Refonte complète de l'action Déconnecter : purge immédiate des tokens, stockage local, identifiants chiffrés et clés de paramètres.",
    "Synchronisation parfaite entre la barre des connexions actives, la fiche détaillée et la carte 3D pour Discord et l'ensemble des services.",
    "Diffusion en temps réel de l'événement de déconnexion pour mettre à jour instantanément tous les widgets et le Dock.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.02",
  date: "2026-08-28",
  title: "Connections & 3D Cards: Reactive Disconnect Button & Discord Sync",
  items: [
    "Complete overhaul of Disconnect action: instant purge of tokens, local storage, encrypted credentials, and setting keys.",
    "Perfect synchronization between active connections bar, detail drawer, and 3D card for Discord and all services.",
    "Real-time event broadcast to immediately refresh all widgets and the Dock upon disconnection.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.02",
  date: "2026-08-28",
  title: "Conexiones & Tarjetas 3D: Botón Desconectar y Sincronización Discord",
  items: [
    "Solución completa para la desconexión de servicios y sincronización exacta de Discord en tarjetas 3D.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.02",
  date: "2026-08-28",
  title: "Verbindungen & 3D-Karten: Trennen-Button & Discord-Synchronisation",
  items: [
    "Vollständige Überarbeitung der Trennfunktion und nahtlose Synchronisation von Discord und 3D-Karten.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.01",
  date: "2026-08-28",
  title: "Connexions & Médias : Intégration Immédiate de Spotify dans le Dock & Dynamic Island",
  items: [
    "Résolution automatique du Client ID Spotify public OAuth sans nécessiter de configuration manuelle supplémentaire.",
    "Affichage instantané du lecteur média dans le Dock et de la pilule Spotify dans la Dynamic Island dès la connexion.",
    "Transmission sécurisée du token d'authentification Spotify dans les requêtes de lecture et de contrôle (Play/Pause, Skip, Volume, Like).",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.01",
  date: "2026-08-28",
  title: "Connections & Media: Instant Spotify Integration in Dock & Dynamic Island",
  items: [
    "Automatic resolution of Spotify public OAuth Client ID without requiring manual credentials input.",
    "Instant display of media player in the Dock and Spotify pill in Dynamic Island upon connection.",
    "Secure Spotify token forwarding for playback controls (Play/Pause, Skip, Volume, Like).",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.01",
  date: "2026-08-28",
  title: "Conexiones: Integración Instantánea de Spotify en Dock y Dynamic Island",
  items: [
    "Visualización y control inmediato de Spotify en el Dock y Dynamic Island tras la conexión.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.01",
  date: "2026-08-28",
  title: "Verbindungen: Sofortige Spotify-Integration im Dock & Dynamic Island",
  items: [
    "Sofortige Anzeige und Steuerung von Spotify im Dock und in der Dynamic Island.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.12.00",
  date: "2026-08-28",
  title: "ETHONE Settings 2.0 : Rebuild Majeur — Navigation, UI, Primitives & Stabilité Absolue",
  items: [
    "Reconstruction complète de l'architecture des Réglages : la barre latérale est la source unique de vérité avec indicateur actif déterministe.",
    "Nouvelle suite de composants primitifs harmonisés : SettingsSection, SettingsGroup, SettingsRow, SettingsToggle, SettingsSlider, SettingsSelect, SettingsDangerZone et SettingsPreview.",
    "Élimination totale des flashs noirs, des sauts de layout et des transitions concurrentes.",
    "Isolation complète par ErrorBoundary pour chaque catégorie de paramètres.",
    "Indicateur de sauvegarde discret et synchronisation asynchrone non-bloquante avec Supabase.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.12.00",
  date: "2026-08-28",
  title: "ETHONE Settings 2.0: Major Rebuild — Navigation, UI, Primitives & Total Stability",
  items: [
    "Complete architecture rebuild of Settings: sidebar as the single source of truth with deterministic gliding active pill.",
    "New unified UI primitives suite: SettingsSection, SettingsGroup, SettingsRow, SettingsToggle, SettingsSlider, SettingsSelect, SettingsDangerZone, and SettingsPreview.",
    "Total elimination of black flashes, layout thrashing, and concurrent race-condition animations.",
    "Resilient section-level ErrorBoundary protection across all 22 configuration modules.",
    "Discrete non-intrusive save badge with non-blocking debounced cloud synchronization.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.12.00",
  date: "2026-08-28",
  title: "ETHONE Settings 2.0: Reconstrucción Mayor — Navegación, UI y Estabilidad",
  items: [
    "Reconstrucción completa de la arquitectura de Ajustes con primitivas unificadas y navegación determinista.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.12.00",
  date: "2026-08-28",
  title: "ETHONE Settings 2.0: Großer Umbau — Navigation, UI und Absolute Stabilität",
  items: [
    "Vollständige Neugestaltung der Einstellungen mit einheitlichen Primitiven und deterministischer Navigation.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.10",
  date: "2026-08-28",
  title: "Audio & Ambiances : Synthèse Pluie ASMR Apaisante & Orage Réaliste",
  items: [
    "Refonte acoustique complète de la pluie : texture ASMR veloutée sur toit et fenêtres avec micro-gouttelettes résonantes apaisantes (sans bruit blanc strident).",
    "Distinction marquée de l'orage : averse torrentielle dense avec roulements de tonnerre cinématiques profonds en sub-bass (32Hz–80Hz).",
    "Modulation de respiration naturelle ultra-lente pour favoriser le sommeil et la concentration.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.10",
  date: "2026-08-28",
  title: "Audio & Soundscapes: Soothing Sleep ASMR Rain & Cinematic Thunderstorm",
  items: [
    "Complete acoustic overhaul of Rain: warm velvet rooftop/window ASMR bed with organic resonant micro-droplets.",
    "Distinct heavy Thunderstorm: torrential rainfall with deep, visceral rolling thunder sub-bass reverberation (32Hz–80Hz).",
    "Ultra-slow natural breathing modulation designed for restorative sleep and deep focus.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.10",
  date: "2026-08-28",
  title: "Audio y Ambientes: Lluvia ASMR Relajante y Tormenta Realista",
  items: [
    "Rediseño acústico de lluvia relajante ASMR y truenos profundos para dormir.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.10",
  date: "2026-08-28",
  title: "Audio & Klangwelten: Beruhigender ASMR-Schlafregen & Realistisches Gewitter",
  items: [
    "Vollständige Überarbeitung des Regensoundscapes mit ASMR-Wassertropfen und tiefem Donnergrollen.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.09",
  date: "2026-08-28",
  title: "Paramètres & Navigation : Contrôleur Déterministe & Scroll-Spy Maître",
  items: [
    "Élimination totale des sauts de catégorie inopinés lors des modifications de réglages, toggles ou synchronisation Supabase.",
    "Nouveau contrôleur de navigation centralisé `useSettingsNavigation` avec machine d'état stricte (`IDLE` / `NAVIGATING`).",
    "Scroll-spy à calcul d'aire dominante et hystérèse déclenché uniquement par un vrai geste de scroll manuel de l'utilisateur.",
    "Verrouillage absolu du scroll programmatique avec détection `scrollend` et annulation des requêtes concurrentes.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.09",
  date: "2026-08-28",
  title: "Settings & Navigation: Deterministic Controller & Master Scroll-Spy",
  items: [
    "Total elimination of spurious category jumps during setting changes, toggles, or Supabase sync.",
    "New centralized `useSettingsNavigation` controller with strict state machine (`IDLE` / `NAVIGATING`).",
    "Dominant area scroll-spy with hysteresis triggered strictly by manual user scroll gestures.",
    "Bulletproof programmatic scroll locking with `scrollend` event detection and cancellation of concurrent requests.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.09",
  date: "2026-08-28",
  title: "Ajustes: Controlador Determinista y Scroll-Spy Maestro",
  items: [
    "Eliminación total de saltos involuntarios de categorías y bloqueo determinista de navegación.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.09",
  date: "2026-08-28",
  title: "Einstellungen: Deterministischer Controller & Master Scroll-Spy",
  items: [
    "Vollständige Beseitigung ungewollter Kategoriewechsel und deterministisches Scroll-Sperren.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.08",
  date: "2026-08-28",
  title: "Réglages : Rework Complet de la Navigation, Défilement Précis & Pilule Active",
  items: [
    "Résolution du bug de sélection des catégories : réponse immédiate au 1er clic sans blocage.",
    "Calcul déterministe du défilement dans le conteneur des réglages avec marge optimale sous les en-têtes.",
    "Indicateur de sélection animé avec ressort fluide (Framer Motion layoutId) et retour haptique instantané.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.08",
  date: "2026-08-28",
  title: "Settings: Complete Navigation Rework, Precise Scrolling & Active Pill Indicator",
  items: [
    "Fixed category selection responsiveness: instant 1-click jump without race conditions.",
    "Deterministic relative scroll offset calculation inside the settings main viewport.",
    "Animated floating selection pill with fluid spring physics (layoutId) and haptic feedback.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.08",
  date: "2026-08-28",
  title: "Ajustes: Rediseño de Navegación y Desplazamiento Fluido",
  items: [
    "Corrección de la navegación por categorías y cálculo exacto del desplazamiento.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.08",
  date: "2026-08-28",
  title: "Einstellungen: Überarbeitete Navigation & Präzises Scrollen",
  items: [
    "Sofortige Reaktionszeit beim Anklicken von Kategorien und flüssige Animationen.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.07",
  date: "2026-08-28",
  title: "Spotify & Intégrations OAuth : Synchronisation Instantanée de l'État Connecté & Widgets",
  items: [
    "Persistance locale immédiate de l'état connecté OAuth (`connected:true`) pour Spotify et tous les fournisseurs.",
    "Notification d'événement en temps réel (`v8:connection-updated`) pour actualiser les cartes de connexion et widgets sans recharger.",
    "Résolution robuste du flux Now Playing Spotify dans `useLiveData` et `useConnections`.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.07",
  date: "2026-08-28",
  title: "Spotify & OAuth Integrations: Instant Connected State & Widget Sync",
  items: [
    "Immediate local persistence of OAuth connected state (`connected:true`) for Spotify and all providers.",
    "Real-time event notification (`v8:connection-updated`) refreshing connection cards and widgets instantly.",
    "Robust Spotify Now Playing resolution across `useLiveData` and `useConnections`.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.07",
  date: "2026-08-28",
  title: "Spotify e Integraciones: Sincronización Inmediata del Estado",
  items: [
    "Persistencia inmediata del estado conectado de Spotify y actualización de widgets.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.07",
  date: "2026-08-28",
  title: "Spotify & Integrationen: Sofortige Statussynchronisierung",
  items: [
    "Sofortige Speicherung des Verbindungsstatus und Widget-Aktualisierung für Spotify.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.06",
  date: "2026-08-28",
  title: "Sidebar & Profil : Centrage Parfait des Icônes Réduites & Synchronisation de l'Identité",
  items: [
    "Centrage géométrique strict des icônes de la barre latérale en mode réduit (suppression des offsets de layout).",
    "Synchronisation globale du nom de profil (`Rub`) dans la barre d'état inférieure droite et les menus d'en-tête.",
    "Résolution complète de la photo de profil personnalisée à travers tous les composants du système.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.06",
  date: "2026-08-28",
  title: "Sidebar & Profile: Pixel-Perfect Collapsed Icon Centering & Unified Identity Sync",
  items: [
    "Strict geometric centering for collapsed sidebar navigation icons (zero flex offset).",
    "Global synchronization of user profile name (`Rub`) across bottom status bar and top dropdown.",
    "Unified custom profile avatar resolution across all OS surfaces.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.06",
  date: "2026-08-28",
  title: "Barra Lateral y Perfil: Centrado de Iconos y Sincronización",
  items: [
    "Centrado geométrico de los iconos colapsados y sincronización del perfil de usuario.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.06",
  date: "2026-08-28",
  title: "Seitenleiste & Profil: Zentrierte Icons & Identitätssynchronisierung",
  items: [
    "Perfekte Zentrierung der reduzierten Seitenleisten-Icons und Synchronisierung des Benutzernamens.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.05",
  date: "2026-08-27",
  title: "CI/CD & Builds GitHub : Réparation Complète des Workflows (Web, iOS, Android)",
  items: [
    "Correction des linters et tests unitaires pour assurer le passage systématique des builds Web.",
    "Correction de l'environnement d'exécution macOS pour le build natif iOS (`macos-14`).",
    "Validation des composants et dépendances biométriques pour le build Android.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.05",
  date: "2026-08-27",
  title: "CI/CD & GitHub Builds: Complete Multiplatform Workflow Fix (Web, iOS, Android)",
  items: [
    "Fixed ESLint and unit test expectations for clean Web CI passes.",
    "Fixed macOS runner configuration for native iOS compilation (`macos-14`).",
    "Validated Kotlin/Compose biometric components for Android build.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.05",
  date: "2026-08-27",
  title: "CI/CD: Corrección de Compilación Multiplataforma",
  items: [
    "Corrección de los workflows de GitHub Actions para Web, iOS y Android.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.05",
  date: "2026-08-27",
  title: "CI/CD: GitHub Actions Workflow-Reparatur",
  items: [
    "Behebung der Build- und Test-Pipelines für Web, iOS und Android.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.04",
  date: "2026-08-27",
  title: "Ambiances Sonores : Restauration de l'Audibilité & Synthèse Audio Haute Définition",
  items: [
    "Ajustement du gain de sortie des ambiances sonores (Pluie, Vent, Océan, Cheminée, Forêt) pour une écoute claire et immersive.",
    "Reprise automatique du contexte audio Web Audio API (`AudioContext.resume()`) lors de la sélection d'une ambiance.",
    "Enrichissement des couches procédurales (gouttes de pluie, vagues de l'océan, bruits roses et bruns).",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.04",
  date: "2026-08-27",
  title: "Ambient Soundscapes: Restored Audibility & High-Definition Synthesis",
  items: [
    "Recalibrated ambient output gain (Rain, Wind, Ocean, Fireplace, Forest) for clear and immersive listening.",
    "Automatic AudioContext resumption on ambiance selection.",
    "Enriched procedural layers (rain droplets, ocean swells, pink and brown textures).",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.04",
  date: "2026-08-27",
  title: "Sonidos Ambientales: Restauración del Volumen y Claridad",
  items: [
    "Ajuste del volumen y síntesis de paisajes sonoros ambientales.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.04",
  date: "2026-08-27",
  title: "Klanglandschaften: Verbesserte Lautstärke & Audio-Synthese",
  items: [
    "Optimierte Ausgangsverstärkung für beruhigende Natur- und Hintergrundgeräusche.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.03",
  date: "2026-08-27",
  title: "Connexions & Spotify : Résolution du Flux OAuth & Bouton Connecter Actif",
  items: [
    "Correction du bouton Connecter dans le tiroir de détails des intégrations (ConnectionDetailDrawer).",
    "Prise en charge complète du dialogue d'autorisation Spotify (`show_dialog=true`) pour choisir ou changer de compte.",
    "Gestion robuste des retours d'authentification OAuth et des erreurs d'accès.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.03",
  date: "2026-08-27",
  title: "Connections & Spotify: OAuth Flow Fixed & Active Drawer Connect Button",
  items: [
    "Fixed Connect button in the ConnectionDetailDrawer panel.",
    "Added Spotify authorization consent dialog support (`show_dialog=true`).",
    "Robust OAuth callback and error recovery.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.03",
  date: "2026-08-27",
  title: "Conexiones y Spotify: Corrección de OAuth y Botón Conectar",
  items: [
    "Corrección del botón Conectar en el panel de detalles de integración.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.03",
  date: "2026-08-27",
  title: "Verbindungen & Spotify: OAuth-Fehlerbehebung",
  items: [
    "Verbindungsknopf im Detail-Panel repariert und Spotify OAuth optimiert.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.02",
  date: "2026-08-27",
  title: "Animations Globales : Calibrage Soyeux, Doux & Organique",
  items: [
    "Harmonisation de tous les ressorts physiques (Springs) de l'OS pour éliminer toute sensation de rigidité ou d'agressivité.",
    "Transition adoucie pour la Dynamic Island, la Command Palette, les modales et les surfaces interactives.",
    "Nouvelles courbes cubiques douces assurant une fluidité permanente à 120 FPS.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.02",
  date: "2026-08-27",
  title: "Global Animations: Silky-Smooth, Calibrated & Organic Motion",
  items: [
    "Harmonized spring physics across the OS to remove harsh or aggressive snaps.",
    "Softened transitions for Dynamic Island, Command Palette, modals, and interactive surfaces.",
    "New gentle cubic curves ensuring consistent 120 FPS smoothness.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.02",
  date: "2026-08-27",
  title: "Animaciones Globales: Suavidad y Fluidez",
  items: [
    "Calibración de la física de animación para una experiencia visual sedosa y fluida.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.02",
  date: "2026-08-27",
  title: "Globale Animationen: Sanfte & geschmeidige Bewegung",
  items: [
    "Anpassung der Animationsphysik für maximale Geschmeidigkeit im gesamten System.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.01",
  date: "2026-08-27",
  title: "Sidebar & Navigation : Animation Douce, Fluide et Naturelle",
  items: [
    "Adoucissement complet de l'animation de la barre latérale (Sidebar) lors de l'ouverture et de la fermeture.",
    "Suppression des coupures brusques de texte et des effets de rebond saccadés pour une transition ultra-soyeuse à 120 FPS.",
    "Synchronisation des libellés, logos et profil avec un estompage progressif naturel.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.01",
  date: "2026-08-27",
  title: "Sidebar & Navigation: Silky-Smooth, Natural Animation",
  items: [
    "Completely softened and smoothed sidebar expand/collapse transitions.",
    "Eliminated jarring cuts and bouncy springs for a calm 120 FPS motion.",
    "Harmonized labels, brand mark, and profile fade-ins.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.01",
  date: "2026-08-27",
  title: "Barra Lateral: Animación Suave y Fluida",
  items: [
    "Suavizado de las animaciones de apertura y cierre de la barra lateral.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.01",
  date: "2026-08-27",
  title: "Seitenleiste: Sanfte und flüssige Animation",
  items: [
    "Sanftere Übergänge beim Öffnen und Schließen der Seitenleiste.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.11.00",
  date: "2026-08-27",
  title: "ETHONE OS Milestone 1.11 : Command Palette Unifiée, Recherche Live & Cohérence Globale",
  items: [
    "Recherche Live unifiée dans la Command Palette (⌘K) : indexation en direct de vos Notes et Tâches avec ouverture instantanée.",
    "Raccourcis clavier majeurs ajoutés dans la palette : ⌘B (Brain), ⌘F (Focus), ⌘N (Notes), ⌘T (Tâches), ⌘M (Mail), ⌘S (Settings), ⌘H (Home).",
    "Actions rapides système : vidage de cache, bascule thème, déclenchement instantané de sessions Pomodoro & Deep Work.",
    "Amélioration des Empty States avec boutons d'action concrets (CTA) et cohérence d'OS intégrée.",
    "Version majeure : v1.11.00.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.11.00",
  date: "2026-08-27",
  title: "ETHONE OS Milestone 1.11: Unified Command Palette, Live Search & Cross-OS Cohesion",
  items: [
    "Unified live search in Command Palette (⌘K) indexing Notes & Tasks in real time with instant opening.",
    "Added major keyboard shortcuts in palette: ⌘B (Brain), ⌘F (Focus), ⌘N (Notes), ⌘T (Tasks), ⌘M (Mail), ⌘S (Settings), ⌘H (Home).",
    "Instant system actions: cache flush, theme toggle, quick Pomodoro & Deep Work triggers.",
    "Polished actionable empty states across apps.",
    "Major Milestone: v1.11.00.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.11.00",
  date: "2026-08-27",
  title: "ETHONE OS Milestone 1.11: Búsqueda Unificada y Paleta de Comandos Pro",
  items: [
    "Búsqueda en vivo de Notas y Tareas en la paleta de comandos (⌘K).",
    "Nuevos atajos de teclado y acciones rápidas de productividad.",
    "Versión: v1.11.00.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.11.00",
  date: "2026-08-27",
  title: "ETHONE OS Milestone 1.11: Einheitliche Befehlspalette & Live-Suche",
  items: [
    "Echtzeit-Suche für Notizen und Aufgaben in der Befehlspalette (⌘K).",
    "Erweiterte Tastenkombinationen und Produktivitätsaktionen.",
    "Version: v1.11.00.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.99",
  date: "2026-08-27",
  title: "Authentification : Transitions 120 FPS Ultra-Fluides sans Saccade",
  items: [
    "Optimisation complète des transitions entre les onglets 'Mot de passe', 'Code OTP' et 'S'inscrire'.",
    "Remplacement des ressorts décalés par des courbes de Bézier ultra-fluides [0.16, 1, 0.3, 1] et suppression des délais de transition bloquants.",
    "Transitions instantanées et naturelles lors du passage d'une étape OTP à l'autre.",
    "Version affichée : v1.10.99.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.99",
  date: "2026-08-27",
  title: "Authentication: Ultra-Smooth 120 FPS Tab Transitions",
  items: [
    "Completely polished transitions across 'Password', 'OTP Code', and 'Register' modes.",
    "Replaced heavy springs with buttery smooth cubic-bezier easing [0.16, 1, 0.3, 1] with zero latency gaps.",
    "Instant, natural navigation between OTP email input and 6-digit code verification.",
    "Version badge: v1.10.99.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.99",
  date: "2026-08-27",
  title: "Autenticación: Transiciones Ultra-Fluidas a 120 FPS",
  items: [
    "Optimización de transiciones entre contraseña, OTP y registro sin tirones.",
    "Versión: v1.10.99.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.99",
  date: "2026-08-27",
  title: "Authentifizierung: Flüssige 120 FPS Übergänge",
  items: [
    "Flüssigere Übergänge zwischen Passwort-, OTP- und Registrierungsmodi ohne Ruckeln.",
    "Version: v1.10.99.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.98",
  date: "2026-08-27",
  title: "Identité Utilisateur : Restauration du Pseudo 'Rub' & Avatar ETHONE Dédié",
  items: [
    "Suppression de l'écrasement automatique du nom d'affichage par le nom complet du compte Google ('Rubens Lespinasse').",
    "Restauration du pseudo ETHONE officiel 'Rub' et des initiales élégantes.",
    "Suppression de l'import forcé de la photo de profil Google pour préserver l'avatar ETHONE personnalisé.",
    "Version affichée : v1.10.98.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.98",
  date: "2026-08-27",
  title: "User Identity: Restored 'Rub' Username & Dedicated ETHONE Avatar",
  items: [
    "Prevented Google OAuth full name ('Rubens Lespinasse') from overriding the official ETHONE username.",
    "Restored 'Rub' username and dedicated clean initials avatar badge.",
    "Eliminated forced Google account photo sync to protect custom ETHONE profile avatar.",
    "Version badge: v1.10.98.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.98",
  date: "2026-08-27",
  title: "Identidad de Usuario: Nombre 'Rub' y Avatar Restaurados",
  items: [
    "Restauración del nombre de usuario 'Rub' y avatar personalizado de ETHONE.",
    "Versión: v1.10.98.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.98",
  date: "2026-08-27",
  title: "Benutzeridentität: 'Rub'-Benutzername & ETHONE-Avatar wiederhergestellt",
  items: [
    "Wiederherstellung des offiziellen 'Rub'-Benutzernamens und des ETHONE-Avatars.",
    "Version: v1.10.98.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.97",
  date: "2026-08-27",
  title: "Header Responsive : Résolution du Chevauchement des Boutons et Pilules Système",
  items: [
    "Suppression du chevauchement dans la barre supérieure (TopBar) lors de l'ouverture de la console DevTools ou sur écrans compacts.",
    "Remplacement du centrage absolu collisionnel par un flex layout fluide avec masque adaptatif sur les pilules système.",
    "Priorisation responsive des boutons d'action rapide, du support et de la recherche pour une barre supérieure toujours propre.",
    "Version affichée : v1.10.97.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.97",
  date: "2026-08-27",
  title: "Responsive Header: Resolved Button & System Status Overlap",
  items: [
    "Eliminated TopBar overlap collision when DevTools or compact viewports are open.",
    "Replaced rigid absolute center layout with fluid responsive flex rules.",
    "Intelligently prioritized actions and status pills across viewport breakpoints.",
    "Version badge: v1.10.97.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.97",
  date: "2026-08-27",
  title: "Encabezado Responsivo: Sin Superposición de Botones",
  items: [
    "Corrección de superposición de botones en la barra superior al abrir la consola o cambiar de resolución.",
    "Versión: v1.10.97.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.97",
  date: "2026-08-27",
  title: "Responsiver Header: Keine Überlappung der Schaltflächen",
  items: [
    "Überlappungen in der oberen Leiste bei geöffneter Entwicklerkonsole behoben.",
    "Version: v1.10.97.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.96",
  date: "2026-08-27",
  title: "Boussole Météo : Flèche Directionnelle & Points Cardinaux",
  items: [
    "Correction du cadran de vent dans la page Météo : remplacement de l'icône manquante par une flèche directionnelle fluide (Navigation) avec points cardinaux N/E/S/O.",
    "Orientation en direct selon la direction du vent en degrés avec animation fluide et halo lumineux vert.",
    "Version affichée : v1.10.96.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.96",
  date: "2026-08-27",
  title: "Weather Wind Compass: Directional Needle & Cardinal Marks",
  items: [
    "Fixed the wind compass in the Weather page: replaced missing icon with a smooth directional navigation needle with N/E/S/W cardinal markers.",
    "Live rotational direction according to real wind azimuth in degrees with emerald accent styling.",
    "Version badge: v1.10.96.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.96",
  date: "2026-08-27",
  title: "Brújula de Viento: Aguja Direccional y Puntos Cardinales",
  items: [
    "Corrección de la brújula de viento en la página del clima con flecha direccional fluida y puntos cardinales.",
    "Versión: v1.10.96.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.96",
  date: "2026-08-27",
  title: "Wetter-Windkompass: Richtungsnadel & Himmelsrichtungen",
  items: [
    "Windkompass auf der Wetterseite korrigiert: flüssige Richtungsnadel mit N/O/S/W-Markierungen.",
    "Version: v1.10.96.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.95",
  date: "2026-08-27",
  title: "Connexion Spotify Instantanée & Sidebar 120 FPS Ultra-Fluide",
  items: [
    "Connexion Spotify directe : intégration automatique du Client ID public officiel sans blocage sur l'écran de chargement.",
    "Résolution du retour OAuth : détection immédiate du callback Spotify dans OAuthHandler avec nettoyage d'URL et notification toast.",
    "Bypass du splash de démarrage lors des retours d'authentification pour afficher directement le dashboard.",
    "Optimisation Sidebar : remplacement des ressorts physiques lourds par une transition cubique GPU instantanée à 0.2s.",
    "Version affichée : v1.10.95.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.95",
  date: "2026-08-27",
  title: "Instant Spotify Connect & Ultra-Fluid 120 FPS Sidebar",
  items: [
    "Instant Spotify connection: automatic public Client ID fallback without getting stuck on loading splash.",
    "OAuth return handler: immediate Spotify callback resolution with URL cleanup and toast confirmation.",
    "Boot splash screen bypass during OAuth redirects for an immediate transition into ETHONE.",
    "Sidebar fluidity overhaul: replaced heavy spring layout morphs with hardware-accelerated 0.2s cubic-bezier transitions.",
    "Version badge: v1.10.95.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.95",
  date: "2026-08-27",
  title: "Conexión Spotify Instantánea y Barra Lateral 120 FPS Ultra Fluida",
  items: [
    "Conexión instantánea de Spotify y optimización de rendimiento de la barra lateral.",
    "Versión: v1.10.95.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.95",
  date: "2026-08-27",
  title: "Sofortige Spotify-Verbindung & Ultra-flüssige 120 FPS Sidebar",
  items: [
    "Sofortige Spotify-Anmeldung und flüssige Hardware-beschleunigte Sidebar-Animationen.",
    "Version: v1.10.95.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.94",
  date: "2026-08-27",
  title: "Résolution CSP & Santé Worker : Déblocage des Avatars Google, Météo & Icônes",
  items: [
    "Mise à jour de la Content Security Policy (CSP) dans public/_headers pour autoriser connect-src https: wss:.",
    "Déblocage des avatars Google (lh3.googleusercontent.com), météo Open-Meteo et serveurs d'icônes Iconify/SimpleSVG.",
    "Correction du ping de statut worker (/api/health) en méthode GET pour éviter les erreurs 405 Method Not Allowed.",
    "Version affichée : v1.10.94.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.94",
  date: "2026-08-27",
  title: "CSP & Worker Health Fix: Unblocked Google Avatars, Weather & Icon APIs",
  items: [
    "Updated Content Security Policy (CSP) in public/_headers to permit connect-src https: wss:.",
    "Unblocked Google profile pictures, Open-Meteo forecast queries, and Iconify/SimpleSVG glyphs.",
    "Corrected worker health ping to GET /api/health to eliminate 405 Method Not Allowed console errors.",
    "Version badge: v1.10.94.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.94",
  date: "2026-08-27",
  title: "Corrección CSP y Estado del Worker: Avatares Google, Clima e Iconos Desbloqueados",
  items: [
    "Actualización de CSP y corrección del endpoint de salud del Worker.",
    "Versión: v1.10.94.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.94",
  date: "2026-08-27",
  title: "CSP & Worker-Gesundheitskorrektur: Google-Avatare, Wetter & Icons entsperrt",
  items: [
    "CSP-Header aktualisiert und Worker-Health-Check auf GET korrigiert.",
    "Version: v1.10.94.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.93",
  date: "2026-08-27",
  title: "Résolution des Widgets : Statuts Réels, Météo Fiabilisée & Liens Trackers",
  items: [
    "Suppression des faux états d'erreur '• Erreur' causés par des intégrations tierces optionnelles.",
    "Météo fiabilisée : chargement automatique par défaut même sans configuration préalable de ville.",
    "Minecraft 3D : affichage immédiat du statut 'Prêt' / 'En ligne' avec pastille verte pour les comptes configurés.",
    "Social & Media : affichage clair de l'état 'Connecté — en attente d'activité' sans fausse alerte rouge.",
    "Riot Trackers (Valorant & LoL) : redirection directe et fluide vers la page des matchs réels (/matches).",
    "Version affichée : v1.10.93.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.93",
  date: "2026-08-27",
  title: "Widget Fix: Real Statuses, Resilient Weather & Tracker Navigation",
  items: [
    "Eliminated false error badges ('• Erreur') triggered by optional third-party integrations.",
    "Weather widget is now always reliably fetched with safe city fallback.",
    "Minecraft 3D now displays 'Ready / Online' with green dot for configured players.",
    "Social & Media widget shows clean connected standby state without red error alert.",
    "Riot Games cards now navigate directly to real match statistics (/matches).",
    "Version badge: v1.10.93.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.93",
  date: "2026-08-27",
  title: "Corrección de Widgets: Estados Reales, Clima Fiable y Trackers",
  items: [
    "Corrección de estados de error falsos en widgets, clima fiable y navegación hacia estadísticas.",
    "Versión: v1.10.93.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.93",
  date: "2026-08-27",
  title: "Widget-Korrektur: Echte Statusanzeigen, stabiles Wetter & Tracker-Navigation",
  items: [
    "Beseitigung falscher Fehleranzeigen, stabileres Wetter-Widget und direkte Navigation zu Match-Statistiken.",
    "Version: v1.10.93.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.92",
  date: "2026-08-27",
  title: "Audit & Optimisation Fluidité : Requêtes Worker, Défilement 60 FPS & Sidebar",
  items: [
    "Suppression du polling agressif de NowPlaying et réduction de la charge sur le Cloudflare Worker.",
    "Mise en cache en mémoire des tokens Supabase pour éliminer les verrous de stockage sur chaque appel API.",
    "Suppression du sélecteur universel CSS wildcard (*) sur les animations pour libérer le thread principal.",
    "Amélioration du scroll natif dans toutes les pages (.os-scroll) sans interpolation saccadée.",
    "Débouncing du survol de la Sidebar et préchargement instantané des routes au survol.",
    "Version affichée : v1.10.92.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.92",
  date: "2026-08-27",
  title: "Fluidity Audit & Fix: Worker Throttling, 60 FPS Scrolling & Sidebar Polish",
  items: [
    "Eliminated aggressive NowPlaying polling and drastically reduced Cloudflare Worker request volume.",
    "In-memory caching of Supabase auth tokens to prevent storage lock contention during API calls.",
    "Removed universal CSS wildcard (*) animation rules to liberate the main thread.",
    "Restored buttery native momentum scrolling in all pages (.os-scroll).",
    "Debounced sidebar hover expansion and enabled instant route prefetching on menu hover.",
    "Version badge: v1.10.92.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.92",
  date: "2026-08-27",
  title: "Optimización de Fluidez: Peticiones Worker, Scroll a 60 FPS y Barra Lateral",
  items: [
    "Eliminación del polling excesivo al Worker, scroll suave nativo y optimización de la barra lateral.",
    "Versión: v1.10.92.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.92",
  date: "2026-08-27",
  title: "Flüssigkeits-Audit: Worker-Optimierung, 60 FPS Scrolling & Sidebar-Tuning",
  items: [
    "Reduzierung der Worker-Abrufe, Entfernung von CPU-lastigen Wildcard-CSS-Regeln und flüssigeres Scrollen.",
    "Version: v1.10.92.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.91",
  date: "2026-08-27",
  title: "Refonte Complète de l'Authentification : Login, OTP 6 Chiffres, Inscription & UX 2026",
  items: [
    "Refonte visuelle et architecturale de /login, /register et /auth avec design sombre premium, micro-particules et typographie soignée.",
    "Nouveau système d'authentification OTP à 6 cases individuelles avec validation automatique instantanée au 6ème chiffre, collage intelligent et navigation clavier.",
    "Formulaire d'inscription progressif avec jauge dynamique de robustesse de mot de passe et validation en temps réel.",
    "Micro-animations d'état (validation, erreurs douces, compteurs de renvoi, transitions sans rechargement).",
    "Boutons sociaux (Google, GitHub) et Passkey modernisés avec feedback immédiat.",
    "Version affichée : v1.10.91.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.91",
  date: "2026-08-27",
  title: "Complete Auth Redesign: Login, 6-Digit Auto-OTP, Progressive Register & 2026 UX",
  items: [
    "Complete visual & architectural overhaul of /login, /register, and /auth with dark glassmorphism, ambient lighting, and sleek layout.",
    "6-digit individual OTP input with auto-advance, smart paste, keyboard arrow navigation, and instant auto-submit on 6th digit.",
    "Progressive registration flow featuring real-time password strength meter and rule validation.",
    "Seamless non-reloading state transitions, resend countdown cooldown, and humanized inline error alerts.",
    "Version badge: v1.10.91.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.91",
  date: "2026-08-27",
  title: "Rediseño completo de Autenticación: Login, OTP de 6 dígitos y Registro",
  items: [
    "Nueva interfaz de inicio de sesión, OTP con verificación automática en el 6.º dígito y registro progresivo.",
    "Versión: v1.10.91.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.91",
  date: "2026-08-27",
  title: "Vollständige Überarbeitung der Authentifizierung: Login, 6-Stelliger OTP & Registrierung",
  items: [
    "Premium Dark-Glassmorphism Login, 6-stelliger OTP-Eingabe mit automatischer Validierung und Passwort-Stärkeanzeige.",
    "Version: v1.10.91.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.90",
  date: "2026-08-27",
  title: "Passe Globale de Fluidité Ultra, Performance 60 FPS & Finition UX",
  items: [
    "Optimisation de la Dynamic Island : élimination du re-render chaque seconde grâce à IslandLiveClock mémoïsé et suppression des filtres flou pour des transitions 60 FPS pures.",
    "Refonte de l'autoscroll Brain Chat avec conscience du scroll utilisateur et synchronisation RAF anti-saccades.",
    "Optimisation du Dock : nettoyage du sélecteur DOM scroll-to-top et accélération matérielle will-change-transform.",
    "Intégration du Design Motion System ETHONE dans globals.css (--ease-spring, --ease-out-expo, timings standardisés) et suppression des recalculs de style superflus.",
    "Version affichée : v1.10.90.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.90",
  date: "2026-08-27",
  title: "Ultra Fluidity, 60 FPS Performance & UX Polish Global Pass",
  items: [
    "Optimized Dynamic Island: eliminated 1s re-render cascades via memoized IslandLiveClock and pure GPU transforms.",
    "Reworked Brain Chat autoscroll with user-scroll awareness and RAF synchronization.",
    "Dock performance enhancements: cleaned up DOM traversal and added will-change hardware acceleration.",
    "Integrated unified ETHONE Design Motion System tokens in globals.css and eliminated cascading style recalcs.",
    "Version badge: v1.10.90.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.90",
  date: "2026-08-27",
  title: "Pase global de fluidez ultra, rendimiento 60 FPS y acabado UX",
  items: [
    "Optimización de Dynamic Island, Dock, Brain Chat y tokens de animación para máxima respuesta.",
    "Versión: v1.10.90.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.90",
  date: "2026-08-27",
  title: "Ultra-Flüssigkeit, 60 FPS Performance & UX-Feinschliff",
  items: [
    "Optimierung von Dynamic Island, Dock, Brain Chat und einheitliches Motion-System für native Reaktivität.",
    "Version: v1.10.90.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.89",
  date: "2026-08-27",
  title: "Résolution Météo & Fallback Intelligent Open-Meteo Direct",
  items: [
    "Création du service météo unifié avec double couche de secours (Worker Cloudflare + Open-Meteo API direct).",
    "Élimination totale de l'erreur 'Météo indisponible' lors de la recherche de villes composées (ex: Brive-la-Gaillarde).",
    "Synchronisation automatique avec le widget météo du dock et de la page d'accueil.",
    "Version affichée : v1.10.89.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.89",
  date: "2026-08-27",
  title: "Weather Service Resolution & Intelligent Direct Fallback",
  items: [
    "Unified weather service with two-layer resilience (Cloudflare Worker + Direct Open-Meteo API).",
    "Resolved 'Météo indisponible' errors across all multi-word city queries (e.g. Brive-la-Gaillarde).",
    "Synchronized live dock and home widgets.",
    "Version badge: v1.10.89.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.89",
  date: "2026-08-27",
  title: "Corrección del servicio meteorológico con respaldo directo Open-Meteo",
  items: [
    "Servicio meteorológico unificado y eliminación de errores de búsqueda para cualquier ciudad.",
    "Versión: v1.10.89.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.89",
  date: "2026-08-27",
  title: "Wetterdienst-Optimierung & Direkter Open-Meteo Fallback",
  items: [
    "Zuverlässiger Wetterdienst mit nahtloser Ausfallsicherung für alle Stadtnamen.",
    "Version: v1.10.89.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.88",
  date: "2026-08-27",
  title: "Calendrier & Factures : Logos des Marques, Ajout Ciblé, 22+ Abonnements & Rework Dropdown",
  items: [
    "Affichage des véritables logos de marques dans les cases du calendrier sous la date à la place d'une simple pastille verte.",
    "Correction de l'ajout rapide : le clic sur un abonnement ou la commande IA prend désormais en compte le jour sélectionné (ex: le 31) au lieu de la date du jour.",
    "Ajout d'un catalogue élargi de 22+ abonnements populaires (YouTube, Prime, Disney+, Apple Music, Midjourney, Claude Pro, etc.).",
    "Raccourcissement et optimisation de la hauteur de la page Calendrier pour éviter tout débordement en bas de l'écran.",
    "Rework global des menus déroulants (select) avec suppression de la flèche grise Windows et style moderne glassmorphic.",
    "Version affichée : v1.10.88.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.88",
  date: "2026-08-27",
  title: "Calendar & Bills: Brand Logos, Targeted Date Quick-Add, 22+ Subscriptions & Sleek Dropdowns",
  items: [
    "Render actual brand logos inside calendar cells instead of generic green dots.",
    "Quick-add recommendations now use the active selected calendar day (e.g. 31st) instead of always defaulting to today.",
    "Expanded popular subscriptions library to 22+ top picks (YouTube, Prime, Disney+, Apple Music, Claude Pro, etc.).",
    "Compacted calendar layout height to eliminate bottom overflow and clipping.",
    "Global rework of all select dropdowns with custom modern chevrons and glassmorphic styling.",
    "Version badge: v1.10.88.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.88",
  date: "2026-08-27",
  title: "Calendario y Facturas: Logos de marcas, 22+ suscripciones y dropdowns mejorados",
  items: [
    "Logos reales en las celdas del calendario, selección de fecha exacta para añadir suscripciones y diseño estilizado de select.",
    "Versión: v1.10.88.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.88",
  date: "2026-08-27",
  title: "Kalender & Rechnungen: Markenlogos, 22+ Abonnements und überarbeitete Dropdowns",
  items: [
    "Echte Markenlogos in Kalenderzellen, gezieltes Hinzufügen auf das ausgewählte Datum und modernes Select-Design.",
    "Version: v1.10.88.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.87",
  date: "2026-08-27",
  title: "Résolution des Connexions Spotify & Élimination de l'Erreur de Chargement",
  items: [
    "Suppression du blocage 'Erreur de chargement' dans la vue Intégrations : la grille des 35 services reste toujours accessible et active.",
    "Correction de l'échange OAuth Spotify : passage d'un redirect_uri dynamique adapté à chaque domaine (localhost, pages.dev, custom).",
    "Sécurisation de /api/connections : endpoint public non-bloquant avec fallback gracieux si non connecté.",
    "Intégration d'un SVG natif pour l'icône Météo afin d'assurer son affichage immédiat dans la barre de connexions.",
    "Redéploiement Cloudflare Worker raspy-fog-bf5b.",
    "Version affichée : v1.10.87.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.87",
  date: "2026-08-27",
  title: "Spotify OAuth Fix & Non-Blocking Integrations Grid",
  items: [
    "Removed blocking 'Erreur de chargement' screen in Integrations settings: all 35 services remain available and interactive.",
    "Fixed Spotify OAuth token exchange by forwarding dynamic redirect_uri matching the current domain.",
    "Made /api/connections non-blocking and public with seamless fallback.",
    "Added inline Weather SVG for instant rendering in active connections row.",
    "Redeployed Cloudflare Worker raspy-fog-bf5b.",
    "Version badge: v1.10.87.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.87",
  date: "2026-08-27",
  title: "Corrección de Spotify OAuth y cuadrícula de integraciones",
  items: [
    "Eliminado el bloqueo de error en integraciones y soporte dinámico de URI para Spotify.",
    "Versión: v1.10.87.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.87",
  date: "2026-08-27",
  title: "Spotify OAuth Fix & Zuverlässige Integrationen-Ansicht",
  items: [
    "Blockierender Ladefehler behoben und dynamische Spotify OAuth Weiterleitungs-URI implementiert.",
    "Version: v1.10.87.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.86",
  date: "2026-08-27",
  title: "Audit & Optimisation Globale du Worker et du Client Fetch",
  items: [
    "Audit et refonte des politiques CORS du Worker Cloudflare pour autoriser tous les sous-domaines Pages et personnalisés sans blocage.",
    "Passage en public des endpoints météo, Spotify now-playing, Steam, Twitch, flux RSS et présence.",
    "Ajout d'un système de timeout et résilience réseau automatique (15s) sur tous les appels fetchWorker.",
    "Sécurisation des routes API (connexions, profils et identifiants) pour éliminer les erreurs 500 et 401 intempestives.",
    "Redéploiement complet du worker raspy-fog-bf5b sur Cloudflare.",
    "Version affichée : v1.10.86.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.86",
  date: "2026-08-27",
  title: "Global Audit & Optimization of Cloudflare Worker & Fetch Client",
  items: [
    "Audited and updated Worker CORS policies to allow all Cloudflare Pages preview domains and custom domains.",
    "Marked weather, Spotify now-playing, Steam, Twitch, RSS and presence APIs as public endpoints.",
    "Added timeout controller (15s) and automatic network error recovery to fetchWorker.",
    "Hardened connections, profiles and credentials routes to eliminate unexpected 500 and 401 errors.",
    "Redeployed Cloudflare worker raspy-fog-bf5b.",
    "Version badge: v1.10.86.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.86",
  date: "2026-08-27",
  title: "Auditoría Global y Optimización del Worker y Cliente Fetch",
  items: [
    "Políticas CORS actualizadas y endpoints públicos (clima, Spotify, Steam, Twitch, RSS) habilitados.",
    "Mayor resiliencia con control de tiempo de espera de 15s en fetchWorker.",
    "Versión: v1.10.86.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.86",
  date: "2026-08-27",
  title: "Globales Audit & Optimierung von Worker und Fetch-Client",
  items: [
    "Aktualisierte CORS-Richtlinien und Freigabe öffentlicher Endpunkte (Wetter, Spotify, Steam, Twitch, RSS).",
    "Automatische 15s-Timeout-Absicherung für alle fetchWorker-Aufrufe.",
    "Version: v1.10.86.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.85",
  date: "2026-08-27",
  title: "Correction Critique : Écran d'Erreur Inattendue au Démarrage (PublicProfileProvider)",
  items: [
    "Résolution du crash bloquant au chargement initial causé par l'absence de PublicProfileProvider dans l'arbre React global.",
    "Sécurisation de usePublicProfileContext() avec valeurs par défaut non-bloquantes (plus aucune exception fatale lancée).",
    "Optimisation de useUserIdentity() avec gestion des erreurs de stockage sécurisée et nettoyage des imports superflus.",
    "Version affichée : v1.10.85.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.85",
  date: "2026-08-27",
  title: "Critical Fix: Startup Unexpected Error Screen (PublicProfileProvider)",
  items: [
    "Fixed initial boot error boundary crash caused by missing PublicProfileProvider in global layout tree.",
    "Hardened usePublicProfileContext() with non-throwing fallback defaults.",
    "Streamlined useUserIdentity() with safe storage reads and removed redundant dependencies.",
    "Version badge: v1.10.85.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.85",
  date: "2026-08-27",
  title: "Corrección Crítica: Error Inesperado al Iniciar (PublicProfileProvider)",
  items: [
    "Corrección del fallo de inicio envolviendo PublicProfileProvider a nivel global.",
    "Versión: v1.10.85.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.85",
  date: "2026-08-27",
  title: "Kritischer Fix: Unerwarteter Startfehler-Bildschirm behoben",
  items: [
    "Behebt den Absturz beim Start durch globale Einbindung von PublicProfileProvider.",
    "Version: v1.10.85.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.84",
  date: "2026-08-27",
  title: "Nouveau : Mode Vocal Interactif dans Brain (STT & Synthèse Vocale)",
  items: [
    "Ajout du mode vocal complet dans Brain : parlez à l'IA sans écrire grâce à la reconnaissance vocale Web Speech API intégrée.",
    "Synthèse vocale automatique : Brain vous répond à voix haute avec support multilingue (français, anglais, espagnol, allemand).",
    "Overlay immersif plein écran avec visualiseur d'ondes audio et orbe animé pulsant en temps réel.",
    "Détection automatique des silences (1.5s) pour un envoi fluide et transcription instantanée.",
    "Version affichée : v1.10.84.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.84",
  date: "2026-08-27",
  title: "New: Interactive Voice Mode in Brain (STT & TTS)",
  items: [
    "Added full voice mode to Brain: talk to AI hands-free using native Web Speech API recognition.",
    "Automatic Text-to-Speech: Brain replies aloud with multi-language voice support.",
    "Immersive full-screen overlay with dynamic audio waveform and glowing pulsing orb.",
    "Automatic silence detection (1.5s) for hands-free conversations.",
    "Version badge: v1.10.84.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.84",
  date: "2026-08-27",
  title: "Nuevo: Modo de Voz Interactivo en Brain",
  items: [
    "Habla con Brain sin escribir gracias al reconocimiento de voz integrado.",
    "Respuestas de voz automáticas y visualizador interactivo a pantalla completa.",
    "Versión: v1.10.84.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.84",
  date: "2026-08-27",
  title: "Neu: Interaktiver Sprachmodus in Brain",
  items: [
    "Sprechen Sie mit Brain freihändig über die integrierte Spracherkennung.",
    "Automatische Sprachausgabe und immersives Vollbild-Overlay mit Audiowellen.",
    "Version: v1.10.84.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.83",
  date: "2026-08-27",
  title: "Correction CI/CD : Apostrophe Non Échappée dans MissionControl",
  items: [
    "Correction de l'erreur ESLint react/no-unescaped-entities dans MissionControl.tsx (apostrophe non échappée ligne 413).",
    "Le CI GitHub Actions (Build Web / Lint Next.js) repasse au vert.",
    "Version affichée : v1.10.83.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.83",
  date: "2026-08-27",
  title: "CI/CD Fix: Unescaped Apostrophe in MissionControl",
  items: [
    "Fixed ESLint react/no-unescaped-entities error in MissionControl.tsx (unescaped apostrophe at line 413).",
    "GitHub Actions CI (Build Web / Lint Next.js) now passes with 0 errors.",
    "Version badge: v1.10.83.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.83",
  date: "2026-08-27",
  title: "Fix CI/CD: apóstrofe sin escapar en MissionControl",
  items: ["Corrección de error ESLint en MissionControl.tsx.", "Versión : v1.10.83."],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.83",
  date: "2026-08-27",
  title: "CI/CD-Fix: Nicht-escapter Apostroph in MissionControl",
  items: ["ESLint-Fehler in MissionControl.tsx behoben.", "Version: v1.10.83."],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.82",
  date: "2026-08-27",
  title: "Corrections : Double Croix Météo, Cercle Spotlight & Sidebar Avatar",
  items: [
    "Suppression de la double croix dans la barre de recherche météo : le champ était en type='search' (croix native navigateur) + bouton clear custom — passage en type='text' pour n'avoir qu'une seule croix.",
    "Le cercle vert suivant le curseur est le Spotlight intentionnel, désactivable dans Paramètres > Apparence > Effet Spotlight.",
    "La photo de profil et le pseudo sont maintenant correctement affichés dans la barre latérale via le hook useUserIdentity.",
    "Version affichée : v1.10.82.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.82",
  date: "2026-08-27",
  title: "Fixes: Weather Double-X, Spotlight Circle & Sidebar Avatar",
  items: [
    "Removed duplicate X button in weather search: field was type='search' (browser native clear) + custom clear button — switched to type='text'.",
    "Green cursor circle is the intentional Spotlight feature, toggleable in Settings > Appearance.",
    "Profile picture and username now properly displayed in the sidebar via useUserIdentity hook.",
    "Version badge: v1.10.82.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.82",
  date: "2026-08-27",
  title: "Correcciones: doble X en Météo, círculo cursor y avatar sidebar",
  items: [
    "Eliminada la X doble en la búsqueda del tiempo.",
    "Versión : v1.10.82.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.82",
  date: "2026-08-27",
  title: "Korrekturen: Doppeltes X in Wetter, Cursor-Kreis & Sidebar-Avatar",
  items: [
    "Doppeltes Lösch-X in der Wettersuche entfernt.",
    "Version: v1.10.82.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.81",
  date: "2026-08-27",
  title: "Affichage de la Photo de Profil & Pseudo dans la Barre Latérale (Sidebar)",
  items: [
    "Connexion du hook universel useUserIdentity dans la barre latérale pour afficher l'avatar Google et le pseudo choisi.",
    "Bouton profil interactif dans la barre latérale avec redirection vers la gestion de profil.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.81.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.81",
  date: "2026-08-27",
  title: "Profile Picture & Username Display in Navigation Sidebar",
  items: [
    "Connected useUserIdentity hook in the sidebar to render the user Google avatar and custom display name.",
    "Interactive profile action in sidebar footer linking to profile management.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.81.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.81",
  date: "2026-08-27",
  title: "Foto de perfil y nombre en la barra lateral",
  items: [
    "Visualización de la foto de perfil en la barra lateral.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.81.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.81",
  date: "2026-08-27",
  title: "Profilbild & Benutzername in der Seitenleiste",
  items: [
    "Vollständige Anzeige des Profilbilds in der Navigationsleiste.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.81.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.80",
  date: "2026-08-27",
  title: "Restauration Globale de la Photo de Profil et du Pseudo",
  items: [
    "Résolution multi-sources de l'avatar et du pseudo : profil public, compte Discord lié, métadonnées OAuth Google/Supabase et profils actifs.",
    "Persistance et mise en cache locale instantanée pour un affichage sans aucun flash.",
    "Affichage continu du nom d'utilisateur sur la barre supérieure dès les écrans mobiles/tablettes.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.80.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.80",
  date: "2026-08-27",
  title: "Complete Restoration of User Profile Picture & Display Name",
  items: [
    "Multi-source avatar and username resolution from public profiles, linked Discord, Google/Supabase OAuth, and active workspace profiles.",
    "Instant local persistence ensuring seamless flash-free rendering across reloads.",
    "Persistent header display name across tablets, laptops, and wide screens.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.80.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.80",
  date: "2026-08-27",
  title: "Restauración de foto de perfil y nombre de usuario",
  items: [
    "Resolución multi-fuente de avatar y nombre de perfil.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.80.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.80",
  date: "2026-08-27",
  title: "Wiederherstellung von Profilbild und Anzeigename",
  items: [
    "Mehrstufige Erkennung von Avatar und Profilnamen.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.80.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.79",
  date: "2026-08-27",
  title: "Sublimation du Bouton 'Nouveau Message' (ETHONE Mail)",
  items: [
    "Refonte esthétique du bouton de rédaction : dégradé d'accent éclatant, typographie blanche ultra-lisible et halo dynamique.",
    "Ajout d'un badge de raccourci clavier Ctrl+U et d'un conteneur d'icône stylisé.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.79.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.79",
  date: "2026-08-27",
  title: "Polished 'New Message' Compose Button (ETHONE Mail)",
  items: [
    "Redesigned compose button with vibrant accent gradient, crisp high-contrast typography, and glow shadow.",
    "Added stylish Ctrl+U keyboard shortcut badge and illuminated icon container.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.79.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.79",
  date: "2026-08-27",
  title: "Nuevo diseño del botón 'Nuevo mensaje' en Mail",
  items: [
    "Botón brillante de alto contraste con atajo Ctrl+U.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.79.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.79",
  date: "2026-08-27",
  title: "Neugestaltung des 'Neue Nachricht'-Buttons in Mail",
  items: [
    "Leuchtender Farbverlauf mit weißer, kontrastreicher Typografie.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.79.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.78",
  date: "2026-08-27",
  title: "Audit et Application Stricte des Options Esthétiques & Animations",
  items: [
    "Application directe et immédiate des bascules : Aura néon, Sons d'interface, Spotlight, Effets d'ambiance et Flou d'interface.",
    "Suppression matérielle du flou (backdrop-filter: none) et des halos lumineux lors de la désactivation.",
    "Positionnement et illumination précise du curseur Spotlight au survol.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.78.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.78",
  date: "2026-08-27",
  title: "Full Audit & Strict Enforcement of Aesthetic and Motion Options",
  items: [
    "Instant dynamic application of Neon Aura, Interface Sounds, Spotlight, Ambient Effects, and Interface Blur switches.",
    "Hardware-level suppression of backdrop-filter and neon glow when toggled off.",
    "Refined spotlight cursor lighting layer.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.78.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.78",
  date: "2026-08-27",
  title: "Auditoría de opciones estéticas y de animación",
  items: [
    "Aplicación instantánea de todos los interruptores visuales.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.78.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.78",
  date: "2026-08-27",
  title: "Audit & Durchsetzung der Ästhetik- und Animationsoptionen",
  items: [
    "Sofortige Reaktion aller visuellen Einstellungen und Schalter.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.78.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.77",
  date: "2026-08-27",
  title: "Correction de l'Ouverture des Notifications depuis le Dock Flottant",
  items: [
    "Connexion de l'événement global ethone/v8:open-notifications dans le panneau de notifications.",
    "Ouverture/Fermeture instantanée au clic sur la cloche du dock avec retour haptique.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.77.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.77",
  date: "2026-08-27",
  title: "Dock Notification Button Toggle Fix",
  items: [
    "Connected global open notifications event listener to Notification Center.",
    "Instant toggle when clicking the bell button in the dock with haptic feedback.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.77.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.77",
  date: "2026-08-27",
  title: "Corrección del botón de notificaciones del Dock",
  items: [
    "Apertura instantánea desde el dock flotante.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.77.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.77",
  date: "2026-08-27",
  title: "Dock-Benachrichtigungsbutton Fix",
  items: [
    "Sofortiges Öffnen über das schwebende Dock.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.77.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.76",
  date: "2026-08-27",
  title: "Refonte Intégrale de Mission Control (HUD VisionOS, Scroll Fluide & Animations)",
  items: [
    "Résolution du scroll : zone de défilement libre max-h-[92vh] avec scrollbars stylisées.",
    "Design HUD nouvelle génération façon macOS Sequoia / VisionOS avec verre liquide, lueurs dynamiques et cartes d'espaces interactives.",
    "Animations d'ouverture spring fluides (F2 ou raccourci dock) et raccourcis ESC instantanés.",
    "Lanceur d'applications rapide avec indicateurs de statut en direct pour les 21 dashboards.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.76.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.76",
  date: "2026-08-27",
  title: "Complete Mission Control Redesign (VisionOS HUD, Smooth Scroll & Animations)",
  items: [
    "Scroll issue resolved with a dedicated max-h-[92vh] container and custom scrollbars.",
    "Next-gen HUD design inspired by macOS Sequoia & VisionOS with liquid glass and ambient glow.",
    "Smooth spring open/close animations, keyboard shortcuts (F2/ESC), and 21-app quick launcher.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.76.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.76",
  date: "2026-08-27",
  title: "Rediseño completo de Mission Control",
  items: [
    "Desplazamiento fluido y diseño HUD moderno con animación.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.76.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.76",
  date: "2026-08-27",
  title: "Komplettes Redesign von Mission Control",
  items: [
    "Flüssiges Scrollen und modernes HUD-Design mit Animationen.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.76.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.75",
  date: "2026-08-27",
  title: "Rétablissement Permanent des Cartes 3D & Live dans l'Accueil",
  items: [
    "Suppression du masquage global dans LiveBentoGrid : affichage permanent de toutes les cartes 3D (Minecraft, Météo, Discord, Valorant, LoL).",
    "Chaque carte gère son état et ses données de manière indépendante avec interaction directe.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.75.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.75",
  date: "2026-08-27",
  title: "Permanent Restoration of 3D & Live Cards on Home Dashboard",
  items: [
    "Removed global empty state blocking in LiveBentoGrid: all 3D cards (Minecraft, Weather, Discord, Valorant, LoL) are now permanently visible.",
    "Each card independently manages its own live data and interactive state.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.75.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.75",
  date: "2026-08-27",
  title: "Restauración permanente de tarjetas 3D en Inicio",
  items: [
    "Visualización fija de todas las tarjetas (Minecraft, Clima, Discord, Valorant, LoL).",
    "Validación : build, lint, tests.",
    "Versión : v1.10.75.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.75",
  date: "2026-08-27",
  title: "Permanente Wiederherstellung der 3D-Karten auf der Startseite",
  items: [
    "Alle 3D-Karten (Minecraft, Wetter, Discord, Valorant, LoL) bleiben dauerhaft sichtbar.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.75.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.74",
  date: "2026-08-27",
  title: "Correction du Bouton 'Remonter en Haut' du Dock Flottant",
  items: [
    "Résolution du scroll vers le haut : détection et défilement fluide (smooth scroll) de tous les conteneurs scrollables actifs et du viewport.",
    "Ajout d'un retour haptique léger lors du clic sur le bouton.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.74.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.74",
  date: "2026-08-27",
  title: "Scroll to Top Dock Button Fix",
  items: [
    "Fixed scroll to top button by scanning and smoothly scrolling all active scrolling containers and the window.",
    "Added light haptic feedback on click.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.74.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.74",
  date: "2026-08-27",
  title: "Corrección del botón volver arriba del Dock",
  items: [
    "Desplazamiento suave hacia arriba en todos los contenedores.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.74.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.74",
  date: "2026-08-27",
  title: "Dock 'Nach oben scrollen' Fix",
  items: [
    "Sanftes Scrollen nach oben für alle aktiven Container.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.74.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.73",
  date: "2026-08-27",
  title: "Correction Réactivité Suppression & Lecture des Notifications (Store Réactif Global)",
  items: [
    "Refonte de useNotifications avec un singleton réactif partagé entre tous les composants.",
    "Suppression (Corbeille) et archivage (Lu) instantanés en direct dans le panneau de notifications sans rechargement.",
    "Synchronisation immédiate des compteurs de badge (TopBar & Dock).",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.73.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.73",
  date: "2026-08-27",
  title: "Notification Delete & Read Action Fix (Global Reactive Store)",
  items: [
    "Refactored useNotifications with a unified reactive singleton store across all components.",
    "Instant real-time removal when clicking Trash or Mark as Read in Notification Center.",
    "Synced badge counts across TopBar and Dock.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.73.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.73",
  date: "2026-08-27",
  title: "Corrección de eliminación de notificaciones en tiempo real",
  items: [
    "Store reactivo unificado para notificaciones instantáneas.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.73.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.73",
  date: "2026-08-27",
  title: "Benachrichtigungs-Löschung & Lesestatus-Fix",
  items: [
    "Globaler reaktiver Zustand für sofortige Listen-Aktualisierung.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.73.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.72",
  date: "2026-08-27",
  title: "Résolution Synchronisation Journal d'Activité & Dynamic Island (Zéro Erreur Fetch)",
  items: [
    "Prise en charge publique et résiliente de la route worker /api/cloud/activity.",
    "Persistance automatique et silencieuse dans le journal d'activité local hors-ligne ou invité, éliminant l'erreur 'Failed to fetch'.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.72.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.72",
  date: "2026-08-27",
  title: "Activity Journal Sync & Dynamic Island Fix (Zero Fetch Errors)",
  items: [
    "Resilient and public endpoint handling for /api/cloud/activity.",
    "Automatic offline local journal fallback, eliminating 'Failed to fetch' notifications.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.72.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.72",
  date: "2026-08-27",
  title: "Corrección de sincronización y Dynamic Island",
  items: [
    "Persistencia local automática del registro de actividad.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.72.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.72",
  date: "2026-08-27",
  title: "Aktivitätsjournal-Synchronisation & Dynamic Island Fix",
  items: [
    "Automatische lokale Persistenz und Fehlerbehebung.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.72.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.71",
  date: "2026-08-27",
  title: "Sublimation du Dock Flottant (Glassmorphism, Magnification & Ancrage Badge)",
  items: [
    "Repositionnement précis du point rouge de notification sur l'épaule de la cloche avec anneau sombre et effet de lueur pulsée.",
    "Effet Glassmorphism et profondeur premium : fond #080c14/85, ombres profondes et contour subtil 1px.",
    "Animation de magnification fluide (scale 1.15) au survol des icônes du dock.",
    "Miniature Spotify raffinée avec anneau émeraude dynamique et égaliseur réactif.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.71.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.71",
  date: "2026-08-27",
  title: "Floating Dock Polish (Glassmorphism, Magnification & Badge Anchoring)",
  items: [
    "Anchored notification dot directly on bell shoulder with ring and pulse glow.",
    "Deep glassmorphic backdrop (#080c14/85), rim lighting and subtle glow.",
    "Fluid macOS-style magnification (1.15x scale) on hover.",
    "Polished Spotify media button with emerald playing glow.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.71.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.71",
  date: "2026-08-27",
  title: "Mejora visual del Dock flotante",
  items: [
    "Efecto de cristal translúcido, ampliación al pasar el ratón y anclaje de notificaciones.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.71.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.71",
  date: "2026-08-27",
  title: "Floating-Dock Design-Upgrade",
  items: [
    "Glassmorphism-Optik, Vergrößerungseffekt beim Hovern und präzise Benachrichtigungsmarkierung.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.71.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.70",
  date: "2026-08-27",
  title: "Correction API Tracker Valorant & League of Legends (Support du '#' Riot Tag & En-têtes API Clés)",
  items: [
    "Correction de la validation backend Cloudflare Worker : support des Riot Tags commençant par '#' (ex: #boss, #EUW) sans erreur 400 'Un paramètre est invalide'.",
    "Transmission automatique des clés API Riot Games et Henrik enregistrées depuis localStorage dans les requêtes de tracking.",
    "Assainissement des noms et tags de joueurs dans useLiveData, useDashboard et buildPingRequest.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.70.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.70",
  date: "2026-08-27",
  title: "Valorant & LoL Tracker Fix (Riot Tag '#' Support & API Header Forwarding)",
  items: [
    "Fixed Cloudflare Worker validation accepting tags with '#' without throwing 400 Invalid Parameter errors.",
    "Auto-forwarded stored client credentials in headers for Valorant and LoL endpoints.",
    "Sanitized Riot ID queries across live hooks and modals.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.70.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.70",
  date: "2026-08-27",
  title: "Corrección de Tracker Valorant y LoL",
  items: [
    "Soporte de Riot Tag con almohadilla '#' y claves API automáticas.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.70.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.70",
  date: "2026-08-27",
  title: "Valorant & LoL Tracker Fix",
  items: [
    "Unterstützung von '#' in Riot Tags und API-Schlüssel-Weiterleitung.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.70.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.69",
  date: "2026-08-27",
  title: "Clarification Visuelle & État 'Lu' dans le Centre de Notifications",
  items: [
    "Atténuation visuelle instantanée des notifications lues (fond adouci, retrait de la barre d'alerte, coche double).",
    "Explication du fonctionnement des filtres ('Toutes' = historique complet, 'Non lues' = éléments actifs).",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.69.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.69",
  date: "2026-08-27",
  title: "Visual Read State & Distinction in Notification Center",
  items: [
    "Instant visual dimming and double-checkmark indicator for read notifications.",
    "Clear distinction between 'All' history tab and 'Unread' active filter.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.69.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.69",
  date: "2026-08-27",
  title: "Clarificación visual de notificaciones leídas",
  items: [
    "Atenuación visual de notificaciones leídas.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.69.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.69",
  date: "2026-08-27",
  title: "Visuelle Unterscheidung gelesener Benachrichtigungen",
  items: [
    "Gelesene Mitteilungen werden sofort optisch gedimmt.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.69.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.68",
  date: "2026-08-27",
  title: "Animation Ultra-Fluide des Onglets de Catégories dans Connexions",
  items: [
    "Refonte de l'animation de pillule active dans CategoryTabs (spring physics 60fps sans conflits CSS).",
    "Transition fluide avec AnimatePresence et layout='position' sur la grille de cartes d'intégrations.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.68.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.68",
  date: "2026-08-27",
  title: "Butter-Smooth Category Tab Animations in Connections",
  items: [
    "Overhauled CategoryTabs active indicator with pure Framer Motion spring physics, eliminating any stutter or border flickering.",
    "Added smooth popLayout transitions across integration cards during filter changes.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.68.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.68",
  date: "2026-08-27",
  title: "Animación fluida de pestañas en Conexiones",
  items: [
    "Física de resortes mejorada para cambio suave de categorías.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.68.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.68",
  date: "2026-08-27",
  title: "Butterweiche Kategorie-Animationen in Verbindungen",
  items: [
    "Reibungslose Reiter-Übergänge und flüssige Raster-Animationen.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.68.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.67",
  date: "2026-08-27",
  title: "Perfectionnement des Formulations Françaises des Brain Insights",
  items: [
    "Reformulation grammaticale naturelle des analyses d'activité ('Votre activité est principalement concentrée la nuit / en soirée / le matin / l'après-midi').",
    "Correction des intitulés de catégories et des sources dominantes pour une lecture fluide et élégante.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.67.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.67",
  date: "2026-08-27",
  title: "Polished French Phrasing for Brain Insights",
  items: [
    "Improved grammar and natural phrasing in time-of-day activity analysis and top category breakdown.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.67.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.67",
  date: "2026-08-27",
  title: "Perfeccionamiento de redacción en Brain Insights",
  items: [
    "Frases gramaticales mejoradas en análisis de actividad y categorías.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.67.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.67",
  date: "2026-08-27",
  title: "Sprachliches Feintuning für Brain Insights",
  items: [
    "Verbesserte Formulierungen bei den Aktivitätsanalysen.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.67.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.66",
  date: "2026-08-27",
  title: "Enrichissement Carte Minecraft 3D & Suppression de la Barre de Défilement",
  items: [
    "Suppression définitive de la scrollbar parasite sur la carte Minecraft de l'accueil.",
    "Refonte esthétique avec halo lumineux au sol, badge d'édition Java, bouton de copie UUID et liens directs NameMC et téléchargement de skin.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.66.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.66",
  date: "2026-08-27",
  title: "Minecraft 3D Card Visual Enrichment & Scrollbar Elimination",
  items: [
    "Removed unsightly black scrollbar on the Home Minecraft 3D widget.",
    "Added glowing pedestal, Java edition badge, UUID copy-to-clipboard, NameMC profile and skin download quick links.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.66.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.66",
  date: "2026-08-27",
  title: "Mejora de la tarjeta Minecraft 3D y eliminación de barra de scroll",
  items: [
    "Eliminación de la barra de scroll y adición de enlaces rápidos.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.66.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.66",
  date: "2026-08-27",
  title: "Minecraft 3D Karte optisches Upgrade & Scrollleisten-Entfernung",
  items: [
    "Scrollbalken entfernt und Schnellzugriffe wie NameMC hinzugefügt.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.66.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.65",
  date: "2026-08-27",
  title: "Correction Panneaux Connexions (createPortal z-[99999], Sauvegarde API & Icône Tracker.gg)",
  items: [
    "Montage des tiroirs de détails et guides dans document.body via createPortal (z-index 99999) : élimination totale des coupures par la barre supérieure et le dock inférieur.",
    "Bouton 'Enregistrer les identifiants' fiabilisé avec persistance locale et Cloudflare Workers résiliente.",
    "Intégration de l'icône vectorielle officielle Tracker.gg (TRN Network rose/corail).",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.65.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.65",
  date: "2026-08-27",
  title: "Connections Drawer Overlap Fix, Resilient API Save & Tracker.gg Icon",
  items: [
    "Mounted connection drawers & guide modals directly to document.body via createPortal (z-index 99999), preventing any clipping by topbar or bottom dock.",
    "Fixed credential saving with local and cloud resilience and instant status refresh.",
    "Added official Tracker.gg vector icon.",
    "Validation: Next.js 105/105 pages build, 100% unit tests passed, 0 errors.",
    "Version badge: v1.10.65.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.65",
  date: "2026-08-27",
  title: "Corrección de superposición de paneles de conexiones e icono Tracker.gg",
  items: [
    "Paneles montados en portal sin superposición de barras y guardado fiable.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.65.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.65",
  date: "2026-08-27",
  title: "Connections-Drawer Überlappungs-Fix & Tracker.gg Icon",
  items: [
    "Drawer über createPortal gerendert, kein Abschneiden durch Leisten mehr.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.65.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.64",
  date: "2026-08-27",
  title: "Perfectionnement Graphique de la Dynamic Island Compacte (Spotify & Médias)",
  items: [
    "Affichage enrichi du titre et du nom d'artiste avec typographie nette et espacée.",
    "Bordure néon émeraude réactive sur la pochette d'album pendant la lecture en cours.",
    "Visualiseur audio vert émeraude lissé avec lueur dynamique et barre de progression continue.",
    "Validation : build Next.js 105/105 pages, 100% tests unitaires, 0 erreur.",
    "Version affichée : v1.10.64.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.64",
  date: "2026-08-27",
  title: "Visual Polish for Compact Dynamic Island (Spotify & Media)",
  items: [
    "Enriched title and artist name display with crisp typography.",
    "Subtle reactive emerald glow on album artwork when playing.",
    "Polished 5-bar emerald visualizer and continuous live progress bar.",
    "Validation: Next.js 105/105 pages build, 100% unit tests, 0 errors.",
    "Version badge: v1.10.64.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.64",
  date: "2026-08-27",
  title: "Pulido visual de Dynamic Island compacta (Spotify)",
  items: [
    "Mejora visual de la carátula y visualizador de audio esmeralda.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.64.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.64",
  date: "2026-08-27",
  title: "Visuelles Feintuning der kompakten Dynamic Island (Spotify)",
  items: [
    "Verbesserte Anzeige von Titel, Interpret und Smaragd-Audio-Visualizer.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.64.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.63",
  date: "2026-08-27",
  title: "Mise à Niveau de Sécurité Next.js 16.3.3 (Correction Vulnérabilités Snyk)",
  items: [
    "Application du patch de sécurité Next.js 16.3.3 et eslint-config-next 16.3.3 (résolution des vulnérabilités Directory Traversal et Insecure Optimizations).",
    "Audit de sécurité global : 0 vulnérabilité détectée sur l'ensemble des 741 dépendances du projet.",
    "Validation : 100% des tests unitaires réussis, build Next.js 105/105 pages, 0 erreur.",
    "Version affichée : v1.10.63.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.63",
  date: "2026-08-27",
  title: "Next.js 16.3.3 Security Upgrade (Snyk Vulnerability Patch)",
  items: [
    "Applied Next.js 16.3.3 and eslint-config-next 16.3.3 security patches (fixed Directory Traversal & Insecure Optimizations).",
    "Global security audit: 0 vulnerabilities found across all 741 dependencies.",
    "Validation: 100% unit tests passed, Next.js 105/105 pages build, 0 errors.",
    "Version badge: v1.10.63.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.63",
  date: "2026-08-27",
  title: "Actualización de seguridad Next.js 16.3.3 (Parche de Snyk)",
  items: [
    "Actualización de dependencias de seguridad y 0 vulnerabilidades.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.63.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.63",
  date: "2026-08-27",
  title: "Next.js 16.3.3 Sicherheits-Upgrade (Snyk Schwachstellen-Patch)",
  items: [
    "Next.js 16.3.3 Sicherheits-Patch angewendet, 0 Schwachstellen.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.63.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.62",
  date: "2026-08-27",
  title: "Correction Complète CI/CD GitHub Actions & Validation Linter ESLint 0 Erreur",
  items: [
    "Résolution de l'ensemble des erreurs ESLint bloquant le workflow GitHub Actions 'Build and Lint Next.js'.",
    "Correction des nœuds de commentaires JSX et des entités non échappées dans les guides et trackers.",
    "Validation : 100% des tests unitaires réussis (11 suites, 52 tests), build Next.js 105/105 pages, 0 erreur ESLint/TypeScript.",
    "Version affichée : v1.10.62.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.62",
  date: "2026-08-27",
  title: "CI/CD GitHub Actions Workflow Fix & 0-Error ESLint Validation",
  items: [
    "Fixed all ESLint errors blocking the 'Build and Lint Next.js' GitHub Actions workflow.",
    "Cleaned JSX comment textnodes, unescaped quotes, and React Compiler memoization dependencies.",
    "Validation: 100% unit tests passed (11 suites, 52 tests), Next.js 105/105 pages build, 0 ESLint/TypeScript errors.",
    "Version badge: v1.10.62.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.62",
  date: "2026-08-27",
  title: "Corrección de CI/CD GitHub Actions y validación de ESLint con 0 errores",
  items: [
    "Corrección de errores de linter y validación completa de pruebas.",
    "Validación : build, lint, tests.",
    "Versión : v1.10.62.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.62",
  date: "2026-08-27",
  title: "CI/CD GitHub Actions Workflow Fix & 0-Fehler ESLint Validierung",
  items: [
    "Behebung aller Linter-Fehler und erfolgreiche Ausführung aller Unit-Tests.",
    "Validierung: build, lint, tests.",
    "Version: v1.10.62.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.61",
  date: "2026-08-27",
  title: "Véritable Logo Poing Officiel Riot Games avec Découpes des Doigts",
  items: [
    "Intégration du tracé vectoriel exact et officiel du poing Riot Games (4 doigts distincts avec fentes d'espacement et pouce inférieur).",
    "Résolution du problème de silhouette pleine sans découpe.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.61.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.61",
  date: "2026-08-27",
  title: "Official Riot Games Fist Logo Vector with Finger Slits & Thumb",
  items: [
    "Integrated the authentic official Riot Games fist vector with all 4 distinct finger cutouts and bottom thumb.",
    "Fixed solid silhouette rendering.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.61.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.61",
  date: "2026-08-27",
  title: "Logo oficial del puño de Riot Games con recortes de dedos",
  items: [
    "Vector oficial exacto de Riot Games con separación de dedos y pulgar.",
    "Validación : build, lint.",
    "Versión : v1.10.61.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.61",
  date: "2026-08-27",
  title: "Offizielles Riot Games Faust-Logo mit Fingeraussparungen",
  items: [
    "Exakter offizieller Vektor mit 4 Fingern und Daumen.",
    "Validierung: build, lint.",
    "Version: v1.10.61.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.60",
  date: "2026-08-27",
  title: "Mise à Niveau Haute Définition des Icônes de la Barre Latérale (Lucide Vector Crisp 21px)",
  items: [
    "Remplacement des tracés fins par des icônes vectorielles natives Lucide haute résolution en 21px avec épaisseur de trait optimale (1.9px).",
    "Agrandissement de la zone interactive des boutons et micro-animations de zoom tactile au survol.",
    "Rendu net et précis sans effet de flou ou de pixellisation sur tous les écrans Retina et haute densité.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.60.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.60",
  date: "2026-08-27",
  title: "High-DPI Vector Upgrade for Sidebar Icons (Lucide 21px Crisp)",
  items: [
    "Replaced thin glyphs with crisp native Lucide vector components rendered at 21px with 1.9px stroke width.",
    "Enhanced button hitboxes and added smooth hover scale micro-animations.",
    "Eliminated all pixelation and blur on Retina and high-density displays.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.60.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.60",
  date: "2026-08-27",
  title: "Mejora de alta resolución para los iconos de la barra lateral (Lucide 21px)",
  items: [
    "Iconos vectoriales nativos de alta definición en 21px con trazo nítido.",
    "Validación : build, lint.",
    "Versión : v1.10.60.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.60",
  date: "2026-08-27",
  title: "High-DPI Vektor-Upgrade für Sidebar-Icons (Lucide 21px)",
  items: [
    "Gestochen scharfe Lucide Vektorsymbole mit 21px und 1.9px Strichstärke.",
    "Validierung: build, lint.",
    "Version: v1.10.60.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.59",
  date: "2026-08-27",
  title: "Suppression de la Barre de Recherche Redondante dans les Connexions",
  items: [
    "Suppression de la barre de recherche secondaire située à droite des onglets de catégories.",
    "Conservation de la barre de recherche principale et épurée dans l'en-tête supérieur.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.59.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.59",
  date: "2026-08-27",
  title: "Removal of Redundant Search Bar in Connections Page",
  items: [
    "Removed duplicate search input from the category tabs bar.",
    "Preserved single clean search bar in the top header.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.59.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.59",
  date: "2026-08-27",
  title: "Eliminación de barra de búsqueda redundante en Conexiones",
  items: [
    "Eliminación del campo de búsqueda duplicado en la fila de categorías.",
    "Validación : build, lint.",
    "Versión : v1.10.59.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.59",
  date: "2026-08-27",
  title: "Entfernung der redundanten Suchleiste auf der Verbindungen-Seite",
  items: [
    "Entfernung des doppelten Suchfeldes in der Kategorieleiste.",
    "Validierung: build, lint.",
    "Version: v1.10.59.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.58",
  date: "2026-08-27",
  title: "Refonte Esthétique Dynamic Island Lecteur Audio — Timestamps Live, Visualiseur 24 Barres & Contrôles Glow",
  items: [
    "Ajout des timestamps en temps réel (temps écoulé et durée totale) sous la barre de progression.",
    "Bouton de lecture principal agrandi avec lueur néon verte (glow) et micro-animations fluides.",
    "Refonte de l'égaliseur audio dynamique (24 barres réactives avec oscillation organique).",
    "Badge d'état de lecture Spotify vert émeraude avec indicateur pulsant.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.58.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.58",
  date: "2026-08-27",
  title: "Dynamic Island Music Player Redesign — Live Timestamps, 24-Bar Visualizer & Neon Glow Controls",
  items: [
    "Added live progress and duration timestamps below the media progress bar.",
    "Enhanced play/pause button with glowing neon green styling and micro-interactions.",
    "Upgraded 24-bar reactive audio visualizer with organic wave motion.",
    "Emerald Spotify playback badge with animated pulsing live dot.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.58.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.58",
  date: "2026-08-27",
  title: "Rediseño de Dynamic Island para música — Tiempos en vivo y nuevo visualizador",
  items: [
    "Tiempos en vivo, nuevo botón de reproducción con brillo y visualizador de 24 barras.",
    "Validación : build, lint.",
    "Versión : v1.10.58.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.58",
  date: "2026-08-27",
  title: "Dynamic Island Musik-Player Redesign — Live-Zeitstempel & 24-Balken Visualizer",
  items: [
    "Echtzeit-Zeitstempel, leuchtender Play-Button und 24-Balken Audio-Equalizer.",
    "Validierung: build, lint.",
    "Version: v1.10.58.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.57",
  date: "2026-08-27",
  title: "Correction Action 'Marquer comme lu' & Disparition Fluide des Notifications",
  items: [
    "Le clic sur le bouton '✓' marque désormais la notification comme lue ET la fait disparaître de la vue active avec une animation fluide.",
    "Bouton Corbeille direct '🗑' pour supprimer définitivement une notification en 1 clic.",
    "Suppression des toasts confus 'Marqué comme non lu' lors du traitement d'une notification.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.57.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.57",
  date: "2026-08-27",
  title: "Notification 'Mark as Read' Fix & Smooth Dismissal",
  items: [
    "Clicking '✓' now marks the notification as read AND smoothly dismisses it from the active list.",
    "Direct trash button '🗑' to permanently delete notifications with 1 click.",
    "Fixed misleading 'Marked as unread' toasts when interacting with notifications.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.57.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.57",
  date: "2026-08-27",
  title: "Corrección de descarte y marcado de notificaciones leídas",
  items: [
    "Descarte fluido de notificaciones leídas y botón de papelera directa.",
    "Validación : build, lint.",
    "Versión : v1.10.57.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.57",
  date: "2026-08-27",
  title: "Fix für 'Als gelesen markieren' & Flüssiges Entfernen von Benachrichtigungen",
  items: [
    "Reibungsloses Entfernen gelesener Benachrichtigungen und direkter Lösch-Button.",
    "Validierung: build, lint.",
    "Version: v1.10.57.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.56",
  date: "2026-08-27",
  title: "Correction Affichage Tiroir (z-index 1000), Persistance des Clés API & Vrai Logo Riot Games",
  items: [
    "Élévation du tiroir de gestion en z-[1000] : le haut et le bas ne sont plus jamais masqués par le header et le dock.",
    "Persistance et restauration automatique des clés API saisies (Henrik Valorant, Riot LoL...) avec badge 'Enregistrée'.",
    "Remplacement du tracé SVG par le véritable poing rouge officiel de Riot Games.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.56.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.56",
  date: "2026-08-27",
  title: "Drawer Viewport Cutoff Fix (z-index 1000), API Key Persistence & Authentic Riot Games Fist Logo",
  items: [
    "Elevated drawer to z-[1000] to prevent header/dock obstruction on top and bottom.",
    "Persistent API keys across modal openings with 'Saved' visual status badges.",
    "Replaced icon path with authentic official Riot Games red fist logo.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.56.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.56",
  date: "2026-08-27",
  title: "Corrección de visualización del panel (z-index 1000), persistencia de claves y logo de Riot Games",
  items: [
    "Corrección de superposición en cabecera y pie de página, persistencia de claves.",
    "Validación : build, lint.",
    "Versión : v1.10.56.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.56",
  date: "2026-08-27",
  title: "Drawer-Anzeige-Korrektur (z-index 1000), API-Schlüssel-Persistenz & Echtes Riot Games-Logo",
  items: [
    "Beseitigung von Überlagerungen, dauerhafte Schlüssel-Speicherung und offizielles Logo.",
    "Validierung: build, lint.",
    "Version: v1.10.56.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.55",
  date: "2026-08-27",
  title: "Boutons Directs d'Obtention de Clés API & Tutoriels Interactifs avec URI de Redirection",
  items: [
    "Ajout de boutons d'accès direct vers les portails développeurs sur chaque champ de clé API (HenrikDev, Riot Games, Steam, Last.fm, Google AI, OpenAI...).",
    "Refonte complète de la modale de guide pas-à-pas avec boîte de copie 1-clic pour les URIs de redirection OAuth.",
    "Instructions interactives adaptées et personnalisées pour chaque service (Valorant, LoL, Spotify, Google Calendar, Discord...).",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.55.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.55",
  date: "2026-08-27",
  title: "Direct API Key Portal Buttons & Interactive Setup Guides with 1-Click Redirect URIs",
  items: [
    "Added direct developer portal buttons for all API key fields (HenrikDev, Riot Games, Steam, Last.fm, OpenAI...).",
    "Redesigned setup guide modal with 1-click copy for OAuth redirect URIs and step-by-step badges.",
    "Tailored guides for every service with direct external dashboard navigation.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.55.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.55",
  date: "2026-08-27",
  title: "Botones directos para claves API y guías interactivas con URI de redirección",
  items: [
    "Acceso directo a consolas de desarrollo y guías paso a paso para cada conexión.",
    "Validación : build, lint.",
    "Versión : v1.10.55.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.55",
  date: "2026-08-27",
  title: "Direkte API-Schlüssel-Portal-Buttons & Interaktive Anleitungen mit Weiterleitungs-URIs",
  items: [
    "Direkter Zugriff auf Entwickler-Dashboards und Schritt-für-Schritt-Anleitungen.",
    "Validierung: build, lint.",
    "Version: v1.10.55.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.54",
  date: "2026-08-27",
  title: "Logos Officiels des Marques dans les Connexions (Riot Games, Tracker.gg, Plex, Linear...)",
  items: [
    "Intégration du logo vectoriel officiel rouge Riot Games dans les cartes et modales de connexion.",
    "Ajout des logos officiels pour Tracker.gg, Plex, Jellyfin, Emby, Linear, ClickUp, Obsidian, Todoist, Anthropic, Gemini, Groq et Ollama.",
    "Rendu net avec couleurs fidèles de chaque marque (Rouge Riot #EB0029, TRN #FF2E55, Violet Obsidian #7C3AED...).",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.54.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.54",
  date: "2026-08-27",
  title: "Official Brand Logos in Connections (Riot Games, Tracker.gg, Plex, Linear...)",
  items: [
    "Added official vector Riot Games logo across connection cards and modals.",
    "Added official logos for Tracker.gg, Plex, Jellyfin, Emby, Linear, ClickUp, Obsidian, Todoist, Anthropic, Gemini, Groq, and Ollama.",
    "Crisp rendering with authentic brand color palettes.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.54.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.54",
  date: "2026-08-27",
  title: "Logotipos oficiales en Conexiones (Riot Games, Tracker.gg, Plex...)",
  items: [
    "Logotipos oficiales añadidos para Riot Games y otras plataformas.",
    "Validación : build, lint.",
    "Versión : v1.10.54.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.54",
  date: "2026-08-27",
  title: "Offizielle Markenlogos in den Verbindungen (Riot Games, Tracker.gg, Plex...)",
  items: [
    "Offizielle Logos für Riot Games und weitere Dienste hinzugefügt.",
    "Validierung: build, lint.",
    "Version: v1.10.54.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.53",
  date: "2026-08-27",
  title: "Recherche Connexions, Résolution Clés API Riot & Sélection Discord Lanyard/OAuth",
  items: [
    "Barre de recherche instantanée intégrée dans le header et la toolbar de la page Connexions (/connections).",
    "Correction majeure de la récupération des clés API Henrik (Valorant) et Riot (LoL) dans le backend Worker.",
    "Résolution du problème d'affichage du tiroir de gestion (le haut n'est plus tronqué, padding sécurisé et header visible).",
    "Ajout du sélecteur de mode pour Discord : choix direct entre Lanyard (ID utilisateur en direct) et OAuth2 officiel.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.53.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.53",
  date: "2026-08-27",
  title: "Connections Search, Riot API Keys Worker Fix & Discord Lanyard/OAuth Choice",
  items: [
    "Instant search bar added to the header and toolbar of the Connections page (/connections).",
    "Critical backend fix in Worker for Henrik (Valorant) and Riot (LoL) API credentials discovery.",
    "Fixed drawer header cutoff (added safe area padding and clean full-viewport positioning).",
    "Added Discord connection mode switch: choose between real-time Lanyard (Discord ID) and official OAuth2.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.53.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.53",
  date: "2026-08-27",
  title: "Búsqueda en Conexiones, corrección de claves Riot y selector Discord Lanyard/OAuth",
  items: [
    "Barra de búsqueda en Conexiones y solución para claves API de Riot/Henrik.",
    "Validación : build, lint.",
    "Versión : v1.10.53.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.53",
  date: "2026-08-27",
  title: "Verbindungen-Suche, Riot-API-Key-Fix & Discord Lanyard/OAuth-Auswahl",
  items: [
    "Suchleiste auf der Verbindungsseite und Korrektur für Riot/Henrik-Schlüssel.",
    "Validierung: build, lint.",
    "Version: v1.10.53.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.52",
  date: "2026-08-27",
  title: "Correction Critique des Saccades & Écrans Noirs lors du Défilement des Paramètres",
  items: [
    "Élimination complète des écrans noirs et flashs de 2s lors du scroll dans les réglages.",
    "Suppression de la boucle de rétroaction infinie entre useParams et window.history.replaceState.",
    "Optimisation IntersectionObserver avec requestAnimationFrame et débounce de 250ms sur les URLs.",
    "Accélération matérielle GPU (transform-gpu, will-change-scroll, overscroll-contain) sur le panneau des réglages.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.52.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.52",
  date: "2026-08-27",
  title: "Critical Fix for Settings Scroll Stutter & 2s Black Screens",
  items: [
    "Completely eliminated black screens and 2-second render freezes when scrolling through Settings.",
    "Removed router infinite feedback loops between useParams and window.history.replaceState.",
    "Optimized IntersectionObserver with requestAnimationFrame and debounced URL state sync.",
    "Added GPU hardware acceleration (transform-gpu, will-change-scroll) across settings sections.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.52.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.52",
  date: "2026-08-27",
  title: "Corrección de pantallas negras y parpadeos al hacer scroll en Ajustes",
  items: [
    "Corrección de congelamientos y optimización GPU en la página de ajustes.",
    "Validación : build, lint.",
    "Versión : v1.10.52.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.52",
  date: "2026-08-27",
  title: "Kritischer Fix für Bildschirmflackern und 2s Blackscreens beim Scrollen in den Einstellungen",
  items: [
    "Beseitigung von Rucklern und GPU-Optimierung für flüssiges Scrollen.",
    "Validierung: build, lint.",
    "Version: v1.10.52.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.51",
  date: "2026-08-27",
  title: "Refonte Intégrale du Tracker League of Legends (Design Tracker.gg Officiel & Zéro Placeholder)",
  items: [
    "Refonte complète du tracker League of Legends conforme au screenshot officiel : bandeau global (Win Rate 45.5%, Avg DPM 935, Avg KDA 1.38, Avg GPM 441).",
    "Regroupement des parties par date (Aug 26, Aug 23, Aug 20, Aug 16, Aug 10) avec bilans journaliers (Avg DPM, Avg KDA, Avg GPM).",
    "Lignes de match détaillées : lueur néon verte/rouge, sorts d'invocateur, runes, grille d'objets (6 slots + balise/trinket), score TRS, K/D/A, CS/min et composition des deux équipes (10 champions).",
    "Scoreboard interactif dépliable avec les statistiques précises des 10 joueurs de la partie.",
    "Cache multi-niveaux 15 minutes pour préserver le quota d'API et accélérer les chargements.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.51.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.51",
  date: "2026-08-27",
  title: "League of Legends Tracker Overhaul (Official Tracker.gg Layout & Zero Placeholders)",
  items: [
    "Full League of Legends tracker redesign matching official Tracker.gg UI: global KPIs (Win Rate, Avg DPM, Avg KDA, Avg GPM).",
    "Date-grouped matches with daily aggregates (Aug 26, Aug 23, Avg DPM, Avg KDA, Avg GPM).",
    "Rich match cards: summoner spells, runes, 6-item grid + trinket, TRS score, CS/min, and 10-champion team composition.",
    "Expandable full-game scoreboard for all 10 participants.",
    "15-minute multi-layer cache for instant navigation without API spam.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.51.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.51",
  date: "2026-08-27",
  title: "Rediseño completo del Tracker League of Legends (Diseño oficial)",
  items: [
    "Rediseño completo del tracker LoL con estadísticas oficiales de Riot Games.",
    "Validación : build, lint.",
    "Versión : v1.10.51.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.51",
  date: "2026-08-27",
  title: "Vollständige Überarbeitung des League of Legends Trackers (Offizielles Design)",
  items: [
    "Neues offizielles LoL-Tracker-Design mit echten Riot-Statistiken.",
    "Validierung: build, lint.",
    "Version: v1.10.51.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.50",
  date: "2026-08-27",
  title: "Tracker Valorant Réel 100% Officiel (Zéro Placeholder) & Gestion des Erreurs API",
  items: [
    "Suppression définitive de toutes les données factices/placeholders dans TrackerModal et RiotGamingCard.",
    "Intégration du tracker officiel Valorant avec gestion explicite des erreurs de clé API Henrik/Riot et notifications toast.",
    "Détection automatique des identifiants et clés API enregistrées (Riot, Valorant, Henrik).",
    "Affichage conforme au design officiel : dates groupées, K/D, K/D/A, DDΔ, HS%, ACS et tableau des scores 10 joueurs.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.50.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.50",
  date: "2026-08-27",
  title: "100% Real Valorant Tracker (Zero Placeholders) & API Error Handling",
  items: [
    "Permanent removal of all fake demo/placeholder data across TrackerModal and RiotGamingCard.",
    "Full integration with live Henrik/Riot API and actionable error notifications when keys or IDs fail.",
    "Automatic credential discovery for saved Riot, Valorant, and Henrik API keys.",
    "Official tracker design: date-grouped match history, combat stats, MVP tags, and 10-player scoreboard.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.50.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.50",
  date: "2026-08-27",
  title: "Tracker de Valorant 100% real y manejo de errores de API",
  items: [
    "Eliminación total de datos ficticios y conexión con API real de Riot/Henrik.",
    "Validación : build, lint.",
    "Versión : v1.10.50.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.50",
  date: "2026-08-27",
  title: "100% echter Valorant Tracker & API-Fehlerbehandlung",
  items: [
    "Vollständige Entfernung von Demodaten und Anbindung an die echte Riot/Henrik-API.",
    "Validierung: build, lint.",
    "Version: v1.10.50.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.49",
  date: "2026-08-27",
  title: "Auto-Masquage Intelligent du Dock sur Brain & Restauration Contextuelle",
  items: [
    "Auto-hide intelligent du Dock : masquage automatique sur les pages avec barre de saisie au bas ou plein écran (/brain, /focus, /scratchpad) pour éviter tout chevauchement.",
    "Restauration automatique du Dock lors du passage sur les pages standard (Dashboard, Tâches, Calendrier, Matches, Paramètres...).",
    "Respect absolu du choix manuel : si l'utilisateur désactive volontairement le dock via l'icône, il reste masqué globalement.",
    "Bouton pill discret au bas de l'écran permettant de réafficher le dock temporairement sur les pages immersives en 1 clic.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.49.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.49",
  date: "2026-08-27",
  title: "Smart Auto-Hide Dock on Brain & Contextual Auto-Restore",
  items: [
    "Smart Dock auto-hide: automatically hides on pages with bottom input bars or fullscreen workspaces (/brain, /focus, /scratchpad) to prevent overlapping.",
    "Automatic dock restoration when navigating back to standard pages (Dashboard, Tasks, Calendar, Matches, Settings...).",
    "Preserves manual user preference: if explicitly hidden by user, remains hidden globally.",
    "Discreet mini-pill trigger at the bottom edge to reveal dock on demand.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.49.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.49",
  date: "2026-08-27",
  title: "Ocultación automática del Dock en Brain y restauración inteligente",
  items: [
    "Ocultación automática del dock en Brain y Focus para evitar solapamientos.",
    "Validación : build, lint.",
    "Versión : v1.10.49.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.49",
  date: "2026-08-27",
  title: "Intelligentes Auto-Ausblenden des Docks auf Brain & automatische Wiederherstellung",
  items: [
    "Automatisches Ausblenden des Docks auf Brain und Focus zur Vermeidung von Überlagerungen.",
    "Validierung: build, lint.",
    "Version: v1.10.49.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.48",
  date: "2026-08-27",
  title: "Refonte Intégrale du Tracker Valorant & Cache Haute Performance",
  items: [
    "Refonte visuelle Valorant conforme au design officiel : regroupement des parties par jour (ex: Aug 27), badges MVP/2nd/3rd, K/D, K/D/A, Damage Delta (DDΔ), HS% et ACS.",
    "Indicateurs de victoire (lueur verte néon) et défaite (lueur rouge) avec avatars d'agents officiels et tags d'exploits (Ace, 4k, 3k, High KAST, Clutch).",
    "Scoreboard interactif par match : affiche les 10 joueurs, agents, rangs, statistiques détaillées et équipes.",
    "Cache multi-niveaux 15 minutes (LocalStorage + In-Memory) : navigation instantanée sans requêtes superflues vers l'API Riot/Henrik.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.48.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.48",
  date: "2026-08-27",
  title: "Valorant Tracker Complete Overhaul & High Performance Caching",
  items: [
    "Full Valorant Tracker visual redesign matching official tracker: date-grouped days (Aug 27), MVP badges, K/D, K/D/A, Damage Delta (DDΔ), HS%, and ACS.",
    "Neon victory (green) and defeat (red) glow indicators, official agent portraits, and accolade badges (Ace, 4k, 3k, High KAST, Clutch).",
    "Interactive match scoreboard: displays all 10 players, agents, ranks, detailed combat stats, and team compositions.",
    "15-minute multi-layer caching: instant navigation without unnecessary API requests.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.48.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.48",
  date: "2026-08-27",
  title: "Rediseño completo de Valorant Tracker y caché avanzada",
  items: [
    "Diseño de tracker oficial de Valorant, estadísticas reales por día y caché de 15 minutos.",
    "Validación : build, lint.",
    "Versión : v1.10.48.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.48",
  date: "2026-08-27",
  title: "Vollständiges Valorant Tracker Redesign & High-Performance Cache",
  items: [
    "Offizielles Valorant Tracker Design, echte Tagesstatistiken und 15-Minuten-Cache.",
    "Validierung: build, lint.",
    "Version: v1.10.48.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.47",
  date: "2026-08-27",
  title: "Correction de l'Ajout de Liens & Documents Externes dans les Dossiers",
  items: [
    "Bug fix Fichiers (/files) : correction de la création de raccourcis web/liens externes dans les dossiers (createLink).",
    "Prise en charge complète des liens web (Figma, Notion, GitHub, Docs) avec ouverture directe dans un nouvel onglet.",
    "Création de dossiers et synchronisation cloud même en mode local déconnecté.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.47.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.47",
  date: "2026-08-27",
  title: "External Links & File Shortcuts In Folders Bug Fix",
  items: [
    "Files Bug Fix: enabled real creation and persistence of web shortcuts/links in folders (createLink).",
    "Direct new-tab opening for web links (Figma, Notion, GitHub, external docs).",
    "Folder creation supported in both cloud-synced and local workspace modes.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.47.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.47",
  date: "2026-08-27",
  title: "Corrección de enlaces externos y carpetas en Archivos",
  items: [
    "Corrección de creación de enlaces y carpetas en el explorador de archivos.",
    "Validación : build, lint.",
    "Versión : v1.10.47.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.47",
  date: "2026-08-27",
  title: "Fehlerbehebung für externe Links und Ordner in Dateien",
  items: [
    "Erstellung von Weblinks und Ordnern im Datei-Explorer korrigiert.",
    "Validierung: build, lint.",
    "Version: v1.10.47.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.46",
  date: "2026-08-27",
  title: "Refonte du Calendrier & Factures, Logos Réels des Marques & Assistant Brain Finance",
  items: [
    "Logos officiels des marques vectoriels haute définition (SimpleIcons) : ChatGPT, Claude, Cursor, GitHub, Spotify, Netflix, Discord Nitro, Apple One, Freebox, EDF, Navigo, etc.",
    "Brain Finance Assistant (BrainFinanceAssistant) : analyse de budget mensuel/annuel, détection d'abonnements et création en langage naturel.",
    "Carrousel d'abonnements populaires en 1 clic (ChatGPT, Netflix, Spotify, GitHub Copilot, iCloud...).",
    "Design Calendrier Obsidian Glass : cellules interactives arrondies avec lueurs d'état et badges d'échéance.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.46.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.46",
  date: "2026-08-27",
  title: "Calendar & Billing Rework, Official Brand Logos & Brain Finance Assistant",
  items: [
    "Official high-res vector brand logos: ChatGPT, Claude, Cursor, GitHub, Spotify, Netflix, Discord Nitro, Apple One, Freebox, EDF, Navigo, etc.",
    "Brain Finance Assistant: monthly/annual budget analyzer, subscription detection, and natural language bill creation.",
    "Instant 1-click popular subscription quick-add chips (ChatGPT, Netflix, Spotify, Copilot, iCloud...).",
    "Obsidian Glass Calendar design: rounded glowing cells, state badges, and smooth animations.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.46.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.46",
  date: "2026-08-27",
  title: "Rediseño de Calendario y Facturas con logotipos y Asistente Brain Finance",
  items: [
    "Logos oficiales de marcas, asistente financiero Brain IA y vista Obsidian Glass.",
    "Validación : build, lint.",
    "Versión : v1.10.46.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.46",
  date: "2026-08-27",
  title: "Kalender & Rechnungen Redesign, Echte Markenlogos & Brain Finanzassistent",
  items: [
    "Offizielle Markenlogos, Brain Finanzanalyse und Obsidian Glass Kalender.",
    "Validierung: build, lint.",
    "Version: v1.10.46.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.45",
  date: "2026-08-27",
  title: "Refonte Complète de l'Espace Tâches & Générateur IA Intelligent",
  items: [
    "Refonte de l'interface Tâches (/tasks) : design Obsidian Glass 2026 avec 4 KPIs de productivité, barre de progression et recherche temps réel.",
    "Assistant & Suggestions IA (AiTaskDrawer) : décomposition de projets et sprints en tâches concrètes via l'IA ou modèles pré-configurés (Dev, Focus, Sécurité, UI).",
    "Double vue Liste & Kanban : tableau dynamique 3 colonnes (À faire, Prioritaire & Focus, Terminées).",
    "Micro-interactions riches : sélection de priorité avec badge néon, raccourci vers le Mode Focus, édition rapide de titre et animations de complétion.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.45.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.45",
  date: "2026-08-27",
  title: "Complete Tasks Workspace Rework & Intelligent AI Generator",
  items: [
    "Tasks Workspace Overhaul (/tasks): 2026 Obsidian Glass design with 4 productivity KPIs, progress velocity, and live search.",
    "AI Task Assistant (AiTaskDrawer): natural language goal breakdown into structured tasks plus instant presets (Dev, Focus, Security, UI Polish).",
    "Dual List & Kanban Views: interactive 3-column Kanban board with real-time state sync.",
    "Rich micro-interactions: neon glowing priority tags, Focus mode launch shortcut, inline title editing, and Framer Motion spring list animations.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.45.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.45",
  date: "2026-08-27",
  title: "Rediseño del espacio de Tareas y Generador de IA",
  items: [
    "Diseño Obsidian Glass, vistas Lista y Kanban, asistente de IA para desglosar objetivos.",
    "Validación : build, lint.",
    "Versión : v1.10.45.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.45",
  date: "2026-08-27",
  title: "Komplettes Aufgaben-Workspace Redesign & KI-Assistent",
  items: [
    "Obsidian Glass Layout, Listen- und Kanban-Ansichten, KI-Aufgabengenerator.",
    "Validierung: build, lint.",
    "Version: v1.10.45.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.44",
  date: "2026-08-27",
  title: "Correction & Rendu Dynamique des Auras Chromatiques d'Ambiance",
  items: [
    "Explication & Bug Fix Auras : correction du masquage de l'arrière-plan Cosmique dans le conteneur principal Shell.",
    "CosmicBackground dynamique : intégration des 6 auras (Classique, Boréale, Cyberpunk, Éclipse, Émeraude, Minérale) dans le moteur de particules et nébuleuses.",
    "Boutons de sélection d'aura enrichis dans SystemControlCard avec label actif, pulsation lumineuse et auras néon.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.44.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.44",
  date: "2026-08-27",
  title: "Aura Chromatic Moods Bug Fix & Dynamic Ambient Engine",
  items: [
    "Aura Bug Fix: resolved background occluding issue in Shell main container allowing cosmic auras to shine through.",
    "Dynamic CosmicBackground: integrated all 6 Auras (Classic, Boreal, Cyberpunk, Eclipse, Emerald, Mineral) into nebulae and orbit engine.",
    "Upgraded Aura selector pills in SystemControlCard with active aura badge and glowing neon aura dots.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.44.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.44",
  date: "2026-08-27",
  title: "Corrección y renderizado dinámico de Auras",
  items: [
    "Corrección de fondo en Shell y CosmicBackground adaptativo para las 6 auras.",
    "Validación : build, lint.",
    "Versión : v1.10.44.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.44",
  date: "2026-08-27",
  title: "Aura Chromatisches Moods Bugfix & Dynamic Engine",
  items: [
    "Behebung der Hintergrundüberlagerung und dynamische CosmicBackground-Integration für 6 Auras.",
    "Validierung: build, lint.",
    "Version: v1.10.44.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.43",
  date: "2026-08-27",
  title: "Refonte des Notifications Toast Obsidian Glass 2026 & Nouvelles Alertes",
  items: [
    "Design Obsidian Glass 2026 : fond sombre ultra-luxe, bordures fines lumineuses, auras néon colorées et flou d'arrière-plan.",
    "Barre de progression laser animée avec arrêt fluide au survol et indicateurs radars à impulsion lumineuse.",
    "Système anti-doublon (deduplication) pour éviter les notifications superposées inutiles.",
    "Nouvelles notifications interactives : changement de modèle Brain IA, bascule de thème, changement d'espace et statut de build.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.43.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.43",
  date: "2026-08-27",
  title: "Obsidian Glass 2026 Toast Notifications Rework & New Alerts",
  items: [
    "Obsidian Glass 2026 Design: luxury dark container, fine luminous borders, ambient neon glows and backdrop blur.",
    "Laser gradient progress bar with hover-pause and pulsing radar dots.",
    "Deduplication engine preventing repeated stacked duplicate notifications.",
    "New interactive notifications: Brain AI model switched, theme toggle, space switch, and build status.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.43.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.43",
  date: "2026-08-27",
  title: "Rediseño de Notificaciones Toast Obsidian Glass 2026",
  items: [
    "Diseño Obsidian Glass con auras de neón y barras de progreso láser.",
    "Sistema anti-duplicados y nuevas alertas de IA y temas.",
    "Validación : build, lint.",
    "Versión : v1.10.43.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.43",
  date: "2026-08-27",
  title: "Obsidian Glass 2026 Toast-Benachrichtigungen Redesign",
  items: [
    "Obsidian Glass Design mit Neon-Aura und Laser-Fortschrittsbalken.",
    "Anti-Duplikat-System und neue Benachrichtigungen für KI und Themes.",
    "Validierung: build, lint.",
    "Version: v1.10.43.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.42",
  date: "2026-08-27",
  title: "Correction du tri chronologique du Changelog (Versions récentes en haut)",
  items: [
    "Refonte de l'algorithme de tri du Changelog : tri strict par date décroissante et semver (compareChangelogEntries).",
    "Les versions récentes (août 27, v1.10.x) s'affichent désormais en haut et les anciennes versions historiques (août 18, v323, v322) sont reléguées en bas.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.42.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.42",
  date: "2026-08-27",
  title: "Changelog Chronological Sorting Fix (Newest versions on top)",
  items: [
    "Reworked changelog sorting algorithm: strictly descending by date and semver (compareChangelogEntries).",
    "Recent updates (Aug 27, v1.10.x) now correctly render at the very top, while legacy entries (Aug 18, v323, v322) are placed at the bottom.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.42.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.42",
  date: "2026-08-27",
  title: "Corrección del orden cronológico del Changelog",
  items: [
    "Ordenación estricta por fecha descendente y semver.",
    "Validación : build, lint.",
    "Versión : v1.10.42.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.42",
  date: "2026-08-27",
  title: "Changelog Chronologische Sortierungskorrektur",
  items: [
    "Strikte absteigende Sortierung nach Datum und Semver.",
    "Validierung: build, lint.",
    "Version: v1.10.42.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.41",
  date: "2026-08-27",
  title: "Support Clé OpenRouter dans le Worker & Variables d'environnement",
  items: [
    "Support natif de la variable d'environnement OPENROUTER_API_KEY dans le backend Cloudflare Worker (askOpenRouter).",
    "Routage automatique et fallbacks gratuits synchronisés entre Next.js et Cloudflare Worker.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.41.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.41",
  date: "2026-08-27",
  title: "OpenRouter API Key support in Cloudflare Worker & Environment",
  items: [
    "Native support for OPENROUTER_API_KEY in the Cloudflare Worker backend (askOpenRouter).",
    "Synchronized automatic free routing and fallbacks between Next.js and Worker.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.41.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.41",
  date: "2026-08-27",
  title: "Soporte clave OpenRouter en Cloudflare Worker",
  items: [
    "Soporte nativo de OPENROUTER_API_KEY en el Worker de Cloudflare.",
    "Validación : build, lint.",
    "Versión : v1.10.41.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.41",
  date: "2026-08-27",
  title: "OpenRouter API-Schlüssel-Unterstützung im Cloudflare Worker",
  items: [
    "Native Unterstützung für OPENROUTER_API_KEY im Cloudflare Worker-Backend.",
    "Validierung: build, lint.",
    "Version: v1.10.41.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.40",
  date: "2026-08-27",
  title: "Intégration OpenRouter 100% Gratuit & Modèles Gratuits pour Brain",
  items: [
    "Intégration de la clé OpenRouter avec bascule automatique sur les modèles 100% gratuits (:free).",
    "Sélecteur de modèles IA dans Brain : DeepSeek R1, DeepSeek V3, Llama 3.3 70B, Gemini 2.0 Flash, Mistral 24B, Qwen 2.5 72B (tous gratuits sans surcoût).",
    "Système de fallback cascade résilient (OpenRouter Free -> Cloudflare Workers AI -> Groq -> Local).",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.40.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.40",
  date: "2026-08-27",
  title: "100% Free OpenRouter integration & Free AI Models in Brain",
  items: [
    "OpenRouter API key integrated with automatic routing to 100% free models (:free).",
    "Brain AI Model Selector: DeepSeek R1, DeepSeek V3, Llama 3.3 70B, Gemini 2.0 Flash, Mistral 24B, Qwen 2.5 72B (all free of charge).",
    "Resilient multi-tiered fallback pipeline (OpenRouter Free -> Cloudflare Workers AI -> Groq -> Local).",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.40.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.40",
  date: "2026-08-27",
  title: "Integración OpenRouter 100% Gratuito y Modelos Libres en Brain",
  items: [
    "Clave OpenRouter configurada con modelos 100% gratuitos (:free).",
    "Selector de IA en Brain : DeepSeek R1, DeepSeek V3, Llama 3.3 70B, Gemini 2.0 Flash, Mistral 24B, Qwen 2.5 72B.",
    "Sistema de respaldo en cascada resiliente.",
    "Validación : build, lint.",
    "Versión : v1.10.40.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.40",
  date: "2026-08-27",
  title: "100% kostenlose OpenRouter-Integration & Gratis-KI-Modelle in Brain",
  items: [
    "OpenRouter-API-Schlüssel mit automatischem Routing zu 100% kostenlosen Modellen (:free).",
    "Brain KI-Modellauswahl: DeepSeek R1, DeepSeek V3, Llama 3.3 70B, Gemini 2.0 Flash, Mistral 24B, Qwen 2.5 72B.",
    "Ausfallsichere Fallback-Pipeline.",
    "Validierung: build, lint.",
    "Version: v1.10.40.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.39",
  date: "2026-08-27",
  title: "Alignement et centrage parfait Header & Dynamic Island",
  items: [
    "Centrage absolu des pilules d'état système (TopBar) sur l'axe vertical central (50% viewport).",
    "Alignement parfait au pixel près entre la Dynamic Island et le Header supérieur.",
    "Refonte complète de la popup de mise à jour de version avec physique de ressort, lueur néon verte et accès Changelog direct.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.39.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.39",
  date: "2026-08-27",
  title: "Perfect alignment and centering for Header & Dynamic Island",
  items: [
    "Absolute 50% viewport centering for TopBar system status pills.",
    "Pixel-perfect vertical axis alignment between Dynamic Island and TopBar.",
    "Full redesign of the version update popup with spring physics, neon aura, and direct changelog preview.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.39.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.39",
  date: "2026-08-27",
  title: "Alineación y centrado perfecto de Header & Dynamic Island",
  items: [
    "Centrado absoluto al 50% de las píldoras de estado del sistema en la TopBar.",
    "Alineación perfecta entre la Dynamic Island y el encabezado superior.",
    "Rediseño completo del popup de actualización con físicas spring y acceso al Changelog.",
    "Validación : build, lint.",
    "Versión : v1.10.39.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.39",
  date: "2026-08-27",
  title: "Perfekte Ausrichtung und Zentrierung von Header & Dynamic Island",
  items: [
    "Absolute 50%-Zentrierung der Systemstatus-Pills in der TopBar.",
    "Pixelgenaue vertikale Ausrichtung zwischen Dynamic Island und TopBar.",
    "Komplettes Redesign des Update-Popups mit Spring-Physik und direktem Changelog-Zugriff.",
    "Validierung: build, lint.",
    "Version: v1.10.39.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.38",
  date: "2026-08-27",
  title: "Rework Header, Mail, Connexions Riot Tracker, Notifications & Animations Dock",
  items: [
    "Rework complet des contrôles TopRight / Header (Soutenir, Commandes, Notifications, Langue, Profil).",
    "Rework des paramètres de messagerie Mail (MailProfileButton, MailAliasSetup) en design Obsidian 2026.",
    "Connexions : gestion des identifiants et clés API Riot Games (Valorant / LoL) et ouverture du Tracker de jeu.",
    "Animations ultra-fluides du Dock (spring physics) et du bouton [Dock] dans la barre d'état inférieure.",
    "Centre de notifications : suppression des troncatures de texte (Contrôl...), mise en valeur des alertes critiques, boutons marquer comme lu et archiver fiables.",
    "Brain : ajout des icônes manquantes (note de réunion, logo officiel Discord) et enrichissement du tiroir de contexte.",
    "Profil utilisateur : fond 100% opaque anti-transparence et accès direct aux notes de version / Changelog.",
    "Validation : build Next.js 105/105 pages, TypeScript sans erreur.",
    "Version affichée : v1.10.38.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.38",
  date: "2026-08-27",
  title: "Header rework, Mail settings, Riot Tracker connections, Notifications & Dock animations",
  items: [
    "Complete redesign of TopRight controls and Header (Support, Commands, Notifications, Language, Profile).",
    "Redesign of Mail settings and profile modal (MailProfileButton, MailAliasSetup) in Obsidian 2026 aesthetic.",
    "Connections: Riot Games (Valorant/LoL) API credentials management and interactive game Tracker modal.",
    "Ultra-smooth spring animations for Dock entrance/exit and [Dock] button in the bottom status bar.",
    "Notification Center: fixed text truncations, highlighted critical security alerts, reliable mark-as-read/archive actions.",
    "Brain: fixed missing icons (meeting note prompt, official Discord brand logo) and enhanced context drawer.",
    "User Profile: 100% solid opaque background preventing text bleed, added Changelog direct action.",
    "Validation: Next.js 105/105 pages build, 0 TypeScript errors.",
    "Version badge: v1.10.38.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.38",
  date: "2026-08-27",
  title: "Rediseño de Header, Ajustes de Mail, Conexiones Riot Tracker, Notificaciones y Animaciones Dock",
  items: [
    "Rediseño completo de los controles del Header (Soporte, Comandos, Notificaciones, Idioma, Perfil).",
    "Rediseño de los ajustes de Mail (MailProfileButton, MailAliasSetup) en estilo Obsidian 2026.",
    "Conexiones : gestión de credenciales Riot Games (Valorant / LoL) y modal interactivo de Tracker de juego.",
    "Animaciones fluidas con físicas de resorte para el Dock y el botón [Dock] de la barra de estado.",
    "Centro de notificaciones : corrección de textos cortados, alertas críticas destacadas y botones de acción funcionales.",
    "Brain : iconos corregidos (nota de reunión, logo oficial Discord) y panel de contexto optimizado.",
    "Perfil de usuario : fondo 100% opaco y acceso directo a las notas de versión / Changelog.",
    "Validación : build, lint.",
    "Versión : v1.10.38.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.38",
  date: "2026-08-27",
  title: "Header Rework, Mail-Einstellungen, Riot Tracker-Verbindungen, Benachrichtigungen & Dock-Animationen",
  items: [
    "Komplettes Redesign der oberen rechten Steuerelemente und des Headers.",
    "Redesign der Mail-Einstellungen (MailProfileButton, MailAliasSetup) im Obsidian 2026-Look.",
    "Verbindungen: Riot Games (Valorant/LoL) API-Schlüsselverwaltung und interaktives Spiel-Tracker-Modal.",
    "Ultra-flüssige Spring-Animationen für das Dock und den [Dock]-Button in der unteren Statusleiste.",
    "Benachrichtigungszentrum: Textkürzungen behoben, kritische Warnungen hervorgehoben, zuverlässige Aktionen.",
    "Brain: Fehlende Symbole behoben (Meeting-Notiz, offizielles Discord-Logo) und Kontext-Drawer erweitert.",
    "Benutzerprofil: 100% deckender Hintergrund und direkter Zugriff auf das Changelog.",
    "Validierung: build, lint.",
    "Version: v1.10.38.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.37",
  date: "2026-08-27",
  title: "Fix erreur de synchronisation des paramètres",
  items: [
    "`saveSettingsAsync` utilise `.maybeSingle()` pour éviter les faux positifs quand `select` ne retourne aucune ligne.",
    "Validation : build, lint.",
    "Version affichée : v1.10.37.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.37",
  date: "2026-08-27",
  title: "Fix settings sync false-positive error",
  items: [
    "`saveSettingsAsync` uses `.maybeSingle()` to avoid false positives when `select` returns no rows.",
    "Validation: build, lint.",
    "Version badge: v1.10.37.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.37",
  date: "2026-08-27",
  title: "Fix error falsa de sincronización de ajustes",
  items: [
    "`saveSettingsAsync` usa `.maybeSingle()` para evitar falsos positivos cuando `select` no devuelve filas.",
    "Validación : build, lint.",
    "Versión : v1.10.37.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.37",
  date: "2026-08-27",
  title: "Fehlerhafte Einstellungssync-Fehler behoben",
  items: [
    "`saveSettingsAsync` verwendet `.maybeSingle()`, um Falschmeldungen zu vermeiden, wenn `select` keine Zeilen zurückgibt.",
    "Validierung: build, lint.",
    "Version: v1.10.37.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.36",
  date: "2026-08-27",
  title: "Connexions : réaffichage de la liste",
  items: [
    "Réinitialise la recherche et le filtre après une déconnexion.",
    "Réinitialise `search` / `filter` quand un `service` est passé dans l'URL.",
    "Gère `?service` non trouvé ou sans catégorie.",
    "Validation : build, lint.",
    "Version affichée : v1.10.36.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.36",
  date: "2026-08-27",
  title: "Connections: reset list on disconnect",
  items: [
    "Reset search and filter after a disconnect.",
    "Reset `search` / `filter` when a `service` query param is present.",
    "Handle unknown or uncategorized `?service`.",
    "Validation: build, lint.",
    "Version badge: v1.10.36.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.36",
  date: "2026-08-27",
  title: "Conexiones : restablecer lista al desconectar",
  items: [
    "Restablece la búsqueda y el filtro tras desconectar.",
    "Restablece `search` / `filter` cuando hay un parámetro `service` en la URL.",
    "Gestiona `?service` desconocido o sin categoría.",
    "Validación : build, lint.",
    "Versión : v1.10.36.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.36",
  date: "2026-08-27",
  title: "Verbindungen : Liste beim Trennen zurücksetzen",
  items: [
    "Suche und Filter nach dem Trennen zurücksetzen.",
    "Suche / Filter zurücksetzen, wenn URL-Parameter `service` gesetzt ist.",
    "Unbekanntes oder nicht kategorisiertes `?service` behandeln.",
    "Validierung: build, lint.",
    "Version: v1.10.36.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.35",
  date: "2026-08-27",
  title: "Dock masquable / bouton show dans StatusBar",
  items: [
    "Bouton `EyeOff` dans le Dock pour cacher le dock via `dockVisible: false`.",
    "Bouton `Dock` dans la StatusBar pour le réafficher quand il est caché.",
    "Validation : build, lint.",
    "Version affichée : v1.10.35.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.35",
  date: "2026-08-27",
  title: "Toggle dock visibility from StatusBar",
  items: [
    "`EyeOff` button in Dock to hide it via `dockVisible: false`.",
    "`Dock` button in StatusBar to show it back when hidden.",
    "Validation: build, lint.",
    "Version badge: v1.10.35.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.35",
  date: "2026-08-27",
  title: "Dock ocultable / botón show en StatusBar",
  items: [
    "Botón `EyeOff` en el Dock para ocultarlo con `dockVisible: false`.",
    "Botón `Dock` en la StatusBar para mostrarlo de nuevo.",
    "Validación : build, lint.",
    "Versión : v1.10.35.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.35",
  date: "2026-08-27",
  title: "Dock ein-/ausblendbar / Show-Button in StatusBar",
  items: [
    "`EyeOff` Button im Dock, um es über `dockVisible: false` auszublenden.",
    "`Dock` Button in der StatusBar, um es wieder anzuzeigen.",
    "Validierung: build, lint.",
    "Version: v1.10.35.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.34",
  date: "2026-08-27",
  title: "Dock : scroll to top fonctionnel",
  items: [
    "Cible le conteneur scrollable actif (`#main-content .overflow-y-auto`) au lieu de `window`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.34.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.34",
  date: "2026-08-27",
  title: "Dock: working scroll to top",
  items: [
    "Targets the active scrollable container (`#main-content .overflow-y-auto`) instead of `window`.",
    "Validation: build, lint.",
    "Version badge: v1.10.34.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.34",
  date: "2026-08-27",
  title: "Dock : scroll to top funcional",
  items: [
    "Apunta al contenedor desplazable activo (`#main-content .overflow-y-auto`) en lugar de `window`.",
    "Validación : build, lint.",
    "Versión : v1.10.34.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.34",
  date: "2026-08-27",
  title: "Dock : scroll to top funktioniert",
  items: [
    "Zielt auf den aktiven scrollbaren Container (`#main-content .overflow-y-auto`) statt `window`.",
    "Validierung: build, lint.",
    "Version: v1.10.34.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.33",
  date: "2026-08-27",
  title: "Centre de notifications fonctionnel",
  items: [
    "Enregistrement du service worker pour le push et la sync.",
    "Récupération des notifications mail (`/api/mail/notifications`) dans le centre.",
    "Notifications de connexion/déconnexion des intégrations.",
    "Pont toast : seules les erreurs et warnings deviennent des notifications, avec déduplication.",
    "Catégories propres : mail, integration, system, security.",
    "Validation : build, lint.",
    "Version affichée : v1.10.33.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.33",
  date: "2026-08-27",
  title: "Notification center wired",
  items: [
    "Service worker registration for push and sync.",
    "Mail notifications fetched from `/api/mail/notifications`.",
    "Connection/disconnection notifications for integrations.",
    "Toast bridge: only errors and warnings become notifications, with deduplication.",
    "Clean categories: mail, integration, system, security.",
    "Validation: build, lint.",
    "Version badge: v1.10.33.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.33",
  date: "2026-08-27",
  title: "Centro de notificaciones funcional",
  items: [
    "Registro del service worker para push y sync.",
    "Notificaciones de mail obtenidas de `/api/mail/notifications`.",
    "Notificaciones de conexión/desconexión de integraciones.",
    "Puente de toasts : solo errores y warnings se convierten en notificaciones, con deduplicación.",
    "Categorías limpias : mail, integration, system, security.",
    "Validación : build, lint.",
    "Versión : v1.10.33.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.33",
  date: "2026-08-27",
  title: "Benachrichtigungszentrum funktional",
  items: [
    "Service Worker Registrierung für Push und Sync.",
    "Mail-Benachrichtigungen von `/api/mail/notifications`.",
    "Verbindungs-/Trennungsbenachrichtigungen für Integrationen.",
    "Toast-Bridge : nur Fehler und Warnungen werden zu Benachrichtigungen, mit Deduplizierung.",
    "Saubere Kategorien : mail, integration, system, security.",
    "Validierung: build, lint.",
    "Version: v1.10.33.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.32",
  date: "2026-08-27",
  title: "Audit animations : login, settings, modals, inputs",
  items: [
    "Audit et correction des animations sur la page de login (entrance, transition formulaire, OTP, focus clavier).",
    "Ajustement des transitions dans Settings (changement de catégorie, navigation, sections).",
    "Fluidité des modales, onglets, inputs et StatusBar via tokens de easing et `useReducedMotion`.",
    "Nettoyage de `transition-all` et remplacement par des transitions ciblées.",
    "Validation : build, lint.",
    "Version affichée : v1.10.32.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.32",
  date: "2026-08-27",
  title: "Animation audit: login, settings, modals, inputs",
  items: [
    "Audited and fixed animations on the login page (entrance, form swap, OTP, keyboard focus).",
    "Tweaked Settings transitions (category change, navigation, sections).",
    "Improved fluidity for modals, tabs, inputs and StatusBar using easing tokens and `useReducedMotion`.",
    "Replaced `transition-all` with targeted transitions.",
    "Validation: build, lint.",
    "Version badge: v1.10.32.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.32",
  date: "2026-08-27",
  title: "Auditoría de animaciones : login, ajustes, modales, inputs",
  items: [
    "Auditoría y corrección de animaciones en la página de login (entrada, cambio de formulario, OTP, foco teclado).",
    "Ajuste de transiciones en Ajustes (cambio de categoría, navegación, secciones).",
    "Fluidez de modales, pestañas, inputs y StatusBar con tokens de easing y `useReducedMotion`.",
    "Limpieza de `transition-all` y reemplazo por transiciones dirigidas.",
    "Validación : build, lint.",
    "Versión : v1.10.32.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.32",
  date: "2026-08-27",
  title: "Animations-Audit: Login, Einstellungen, Modals, Inputs",
  items: [
    "Animationen auf der Login-Seite geprüft und korrigiert (Eingang, Formularwechsel, OTP, Tastaturfokus).",
    "Einstellungen-Übergänge angepasst (Kategoriewechsel, Navigation, Abschnitte).",
    "Flüssigkeit von Modals, Tabs, Inputs und StatusBar durch Easing-Tokens und `useReducedMotion`.",
    "`transition-all` durch gezielte Übergänge ersetzt.",
    "Validierung: build, lint.",
    "Version: v1.10.32.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.31",
  date: "2026-08-27",
  title: "Fix déconnexion connexions OAuth",
  items: [
    "Ajout du callback `onDisconnect` sur `ConnectionCard`.",
    "Mise à jour de l'état `connected` dans `IntegrationsSettings` après déconnexion.",
    "Validation : build, lint.",
    "Version affichée : v1.10.31.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.31",
  date: "2026-08-27",
  title: "Fix OAuth connection disconnect",
  items: [
    "Added `onDisconnect` callback to `ConnectionCard`.",
    "Update `connected` state in `IntegrationsSettings` after disconnect.",
    "Validation: build, lint.",
    "Version badge: v1.10.31.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.31",
  date: "2026-08-27",
  title: "Fix desconexión conexiones OAuth",
  items: [
    "Callback `onDisconnect` añadido a `ConnectionCard`.",
    "Actualización del estado `connected` en `IntegrationsSettings` tras desconectar.",
    "Validación : build, lint.",
    "Versión : v1.10.31.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.31",
  date: "2026-08-27",
  title: "OAuth-Verbindung Trennen fix",
  items: [
    "`onDisconnect` Callback zu `ConnectionCard` hinzugefügt.",
    "Aktualisierung des `connected` Zustands in `IntegrationsSettings` nach dem Trennen.",
    "Validierung: build, lint.",
    "Version: v1.10.31.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.30",
  date: "2026-08-27",
  title: "Files : suppression ancien écran Drive non connecté",
  items: [
    "Remplacement de l'ancienne carte centrée `Connectez un Drive` par le composant `EmptyState` standard.",
    "Séparation propre des états `clientId` / `!clientId`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.30.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.30",
  date: "2026-08-27",
  title: "Files: remove old disconnected Drive screen",
  items: [
    "Replaced the old centered `Connect a Drive` card with the standard `EmptyState` component.",
    "Clean separation of `clientId` and `!clientId` states.",
    "Validation: build, lint.",
    "Version badge: v1.10.30.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.30",
  date: "2026-08-27",
  title: "Files : eliminar pantalla antigua de Drive desconectado",
  items: [
    "Reemplazo de la tarjeta antigua `Conecte un Drive` por el componente `EmptyState` estándar.",
    "Separación limpia de los estados `clientId` y `!clientId`.",
    "Validación : build, lint.",
    "Versión : v1.10.30.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.30",
  date: "2026-08-27",
  title: "Files : alten getrennten Drive-Bildschirm entfernt",
  items: [
    "Alte zentrierte `Drive verbinden` Karte durch die Standard-`EmptyState` Komponente ersetzt.",
    "Saubere Trennung der `clientId` und `!clientId` Zustände.",
    "Validierung: build, lint.",
    "Version: v1.10.30.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.29",
  date: "2026-08-27",
  title: "Dashboard home scrollable",
  items: [
    "`DashboardOverview` devient scrollable (overflow-y-auto).",
    "Ajout d'un padding bas (`pb-28`) pour ne pas masquer le contenu derrière le dock et la status bar.",
    "Validation : build, lint.",
    "Version affichée : v1.10.29.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.29",
  date: "2026-08-27",
  title: "Dashboard home scrollable",
  items: [
    "`DashboardOverview` is now scrollable (overflow-y-auto).",
    "Added bottom padding (`pb-28`) to avoid content being hidden by the dock and status bar.",
    "Validation: build, lint.",
    "Version badge: v1.10.29.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.29",
  date: "2026-08-27",
  title: "Dashboard home desplazable",
  items: [
    "`DashboardOverview` ahora es desplazable (overflow-y-auto).",
    "Padding inferior (`pb-28`) para no ocultar contenido detrás del dock y la barra de estado.",
    "Validación : build, lint.",
    "Versión : v1.10.29.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.29",
  date: "2026-08-27",
  title: "Dashboard home scrollbar",
  items: [
    "`DashboardOverview` ist jetzt scrollbar (overflow-y-auto).",
    "Unterer Padding (`pb-28`) hinzugefügt, damit Inhalte nicht hinter Dock und Statusleiste verdeckt werden.",
    "Validierung: build, lint.",
    "Version: v1.10.29.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.28",
  date: "2026-08-27",
  title: "StatusBar pleine opacité",
  items: [
    "Fond `StatusBar` passé en pleine opacité.",
    "Validation : build, lint.",
    "Version affichée : v1.10.28.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.28",
  date: "2026-08-27",
  title: "StatusBar full opacity",
  items: [
    "`StatusBar` background set to full opacity.",
    "Validation: build, lint.",
    "Version badge: v1.10.28.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.28",
  date: "2026-08-27",
  title: "StatusBar opacidad completa",
  items: [
    "Fondo `StatusBar` a opacidad completa.",
    "Validación : build, lint.",
    "Versión : v1.10.28.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.28",
  date: "2026-08-27",
  title: "StatusBar volle Opazität",
  items: [
    "`StatusBar` Hintergrund auf volle Opazität gesetzt.",
    "Validierung: build, lint.",
    "Version: v1.10.28.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.27",
  date: "2026-08-27",
  title: "StatusBar plus sombre",
  items: [
    "Fond `StatusBar` passé de 70% à 90% d'opacité.",
    "Validation : build, lint.",
    "Version affichée : v1.10.27.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.27",
  date: "2026-08-27",
  title: "Darker StatusBar",
  items: [
    "`StatusBar` background from 70% to 90% opacity.",
    "Validation: build, lint.",
    "Version badge: v1.10.27.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.27",
  date: "2026-08-27",
  title: "StatusBar más oscuro",
  items: [
    "Fondo `StatusBar` de 70% a 90% de opacidad.",
    "Validación : build, lint.",
    "Versión : v1.10.27.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.27",
  date: "2026-08-27",
  title: "Dunklere StatusBar",
  items: [
    "`StatusBar` Hintergrund von 70% auf 90% Opazität.",
    "Validierung: build, lint.",
    "Version: v1.10.27.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.26",
  date: "2026-08-27",
  title: "Opacité dock légèrement augmentée",
  items: [
    "`.v8-dock` : opacité du fond passée de 70% à 85%.",
    "Validation : build, lint.",
    "Version affichée : v1.10.26.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.26",
  date: "2026-08-27",
  title: "Dock opacity slightly increased",
  items: [
    "`.v8-dock` background opacity from 70% to 85%.",
    "Validation: build, lint.",
    "Version badge: v1.10.26.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.26",
  date: "2026-08-27",
  title: "Opacidad del dock ligeramente aumentada",
  items: [
    "`.v8-dock` : opacidad del fondo de 70% a 85%.",
    "Validación : build, lint.",
    "Versión : v1.10.26.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.26",
  date: "2026-08-27",
  title: "Dock-Opazität leicht erhöht",
  items: [
    "`.v8-dock` Hintergrundopazität von 70% auf 85%.",
    "Validierung: build, lint.",
    "Version: v1.10.26.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.25",
  date: "2026-08-27",
  title: "Bandeau de statut bas de page",
  items: [
    "`StatusBar` passe en bandeau fixe en bas de page.",
    "Fond `panel-bg`/70, bordure haute, backdrop-blur.",
    "Ne flotte plus : occupe toute la largeur restante, s'adapte à la sidebar.",
    "Validation : build, lint.",
    "Version affichée : v1.10.25.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.25",
  date: "2026-08-27",
  title: "Bottom status bar strip",
  items: [
    "`StatusBar` is now a fixed bottom strip.",
    "`panel-bg`/70 background, top border, backdrop-blur.",
    "No longer floating: spans the available width and adjusts to sidebar.",
    "Validation: build, lint.",
    "Version badge: v1.10.25.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.25",
  date: "2026-08-27",
  title: "Barra de estado inferior",
  items: [
    "`StatusBar` ahora es una barra fija en la parte inferior.",
    "Fondo `panel-bg`/70, borde superior, backdrop-blur.",
    "Ya no flota : ocupa el ancho disponible y se adapta a la barra lateral.",
    "Validación : build, lint.",
    "Versión : v1.10.25.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.25",
  date: "2026-08-27",
  title: "Untere Statusleiste",
  items: [
    "`StatusBar` ist jetzt ein fixer unterer Balken.",
    "Hintergrund `panel-bg`/70, oberer Rand, Backdrop-Blur.",
    "Schwebt nicht mehr : nutzt die verfügbare Breite und passt sich der Seitenleiste an.",
    "Validierung: build, lint.",
    "Version: v1.10.25.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.24",
  date: "2026-08-27",
  title: "Riot Gaming Card — dimensions et persistence clés",
  items: [
    "Redimensionnement des cartes Riot pour matcher Minecraft / météo / Discord.",
    "Correction des couleurs hardcodées (rose/amber) en variables de thème.",
    "Migration Supabase : ajout de `riot` comme provider valide avec `henrikApiKey` / `riotApiKey`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.24.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.24",
  date: "2026-08-27",
  title: "Riot Gaming Card — sizing and key persistence",
  items: [
    "Resized Riot cards to match Minecraft / weather / Discord cards.",
    "Fixed hardcoded rose/amber colors to theme variables.",
    "Supabase migration: added `riot` as a valid provider with `henrikApiKey` / `riotApiKey`.",
    "Validation: build, lint.",
    "Version badge: v1.10.24.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.24",
  date: "2026-08-27",
  title: "Riot Gaming Card — tamaño y persistencia de claves",
  items: [
    "Redimensionamiento de las tarjetas Riot para igualar a Minecraft / clima / Discord.",
    "Corrección de colores hardcodeados (rose/amber) a variables de tema.",
    "Migración Supabase : añadido `riot` como proveedor válido con `henrikApiKey` / `riotApiKey`.",
    "Validación : build, lint.",
    "Versión : v1.10.24.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.24",
  date: "2026-08-27",
  title: "Riot Gaming Card — Größe und Schlüssel-Persistenz",
  items: [
    "Riot-Karten an Minecraft / Wetter / Discord Karten angeglichen.",
    "Feste rose/amber Farben in Theme-Variablen korrigiert.",
    "Supabase-Migration: `riot` als gültiger Provider mit `henrikApiKey` / `riotApiKey` hinzugefügt.",
    "Validierung: build, lint.",
    "Version: v1.10.24.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.23",
  date: "2026-08-27",
  title: "Topbar responsive — sidebar ouverte",
  items: [
    "Masquage des textes topbar jusqu’à `2xl` (Soutenir, Commandes, nom profil).",
    "Pills de statut système masqués jusqu’à `2xl`.",
    "Corrige le chevauchement quand la sidebar est ouverte sur les résolutions moyennes.",
    "Validation : build, lint.",
    "Version affichée : v1.10.23.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.23",
  date: "2026-08-27",
  title: "Topbar responsive — sidebar open",
  items: [
    "Topbar text labels hidden until `2xl` (Soutenir, Commandes, profile name).",
    "System status pills hidden until `2xl`.",
    "Fixes overlap when sidebar is open on medium screens.",
    "Validation: build, lint.",
    "Version badge: v1.10.23.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.23",
  date: "2026-08-27",
  title: "Topbar responsive — barra lateral abierta",
  items: [
    "Textos de topbar ocultos hasta `2xl` (Soutenir, Commandes, nombre de perfil).",
    "Pills de estado del sistema ocultas hasta `2xl`.",
    "Corrección del solapamiento cuando la barra lateral está abierta en pantallas medianas.",
    "Validación : build, lint.",
    "Versión : v1.10.23.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.23",
  date: "2026-08-27",
  title: "Topbar responsive — Seitenleiste offen",
  items: [
    "Topbar-Texte bis `2xl` ausgeblendet (Soutenir, Commandes, Profilname).",
    "Systemstatus-Pills bis `2xl` ausgeblendet.",
    "Überlappung behoben, wenn Seitenleiste auf mittleren Bildschirmen geöffnet ist.",
    "Validierung: build, lint.",
    "Version: v1.10.23.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.22",
  date: "2026-08-27",
  title: "Suppression des cartes 3D sauf connexions",
  items: [
    "Création de `components/FlatCard.tsx` (même style que `Card3D` sans effet 3D).",
    "Remplacement de `Card3D` par `FlatCard` dans 20 composants/pages.",
    "`Card3D` conservé uniquement dans `components/ConnectionCardsWidget.tsx`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.22.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.22",
  date: "2026-08-27",
  title: "Removed 3D cards except for connection cards",
  items: [
    "Created `components/FlatCard.tsx` (same style as `Card3D` but without 3D effect).",
    "Replaced `Card3D` with `FlatCard` in 20 components/pages.",
    "`Card3D` kept only in `components/ConnectionCardsWidget.tsx`.",
    "Validation: build, lint.",
    "Version badge: v1.10.22.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.22",
  date: "2026-08-27",
  title: "Eliminación de tarjetas 3D excepto conexiones",
  items: [
    "Creación de `components/FlatCard.tsx` (mismo estilo que `Card3D` sin efecto 3D).",
    "Reemplazo de `Card3D` por `FlatCard` en 20 componentes/páginas.",
    "`Card3D` conservado solo en `components/ConnectionCardsWidget.tsx`.",
    "Validación : build, lint.",
    "Versión : v1.10.22.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.22",
  date: "2026-08-27",
  title: "3D-Karten entfernt, außer Verbindungskarten",
  items: [
    "Erstellung von `components/FlatCard.tsx` (gleicher Stil wie `Card3D`, aber ohne 3D-Effekt).",
    "`Card3D` durch `FlatCard` in 20 Komponenten/Seiten ersetzt.",
    "`Card3D` nur in `components/ConnectionCardsWidget.tsx` beibehalten.",
    "Validierung: build, lint.",
    "Version: v1.10.22.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.21",
  date: "2026-08-27",
  title: "Topbar responsive — moyennes résolutions",
  items: [
    "Résolution du chevauchement des boutons topbar sur écrans moyens.",
    "Texte `Soutenir`, `Commandes` et email profil masqués jusqu’à `xl`.",
    "`UserProfileDropdown` : nom affiché uniquement à partir de `xl`, max-width 14ch.",
    "`CommandBarTrigger` : texte + kbd affichés à partir de `xl`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.21.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.21",
  date: "2026-08-27",
  title: "Topbar responsive — medium screens",
  items: [
    "Fixed topbar button overlap on medium screens.",
    "`Soutenir`, `Commandes`, and profile email text hidden until `xl`.",
    "`UserProfileDropdown`: name shown only from `xl`, max-width 14ch.",
    "`CommandBarTrigger`: text + kbd shown from `xl`.",
    "Validation: build, lint.",
    "Version badge: v1.10.21.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.21",
  date: "2026-08-27",
  title: "Topbar responsive — pantallas medianas",
  items: [
    "Corrección de la superposición de botones de topbar en pantallas medianas.",
    "Texto `Soutenir`, `Commandes` y email del perfil oculto hasta `xl`.",
    "`UserProfileDropdown` : nombre visible solo desde `xl`, max-width 14ch.",
    "`CommandBarTrigger` : texto + kbd visibles desde `xl`.",
    "Validación : build, lint.",
    "Versión : v1.10.21.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.21",
  date: "2026-08-27",
  title: "Topbar responsive — mittlere Bildschirme",
  items: [
    "Topbar-Button-Überlappung auf mittleren Bildschirmen behoben.",
    "Text `Soutenir`, `Commandes` und Profil-E-Mail bis `xl` ausgeblendet.",
    "`UserProfileDropdown`: Name erst ab `xl` sichtbar, max-width 14ch.",
    "`CommandBarTrigger`: Text + KBD ab `xl` sichtbar.",
    "Validierung: build, lint.",
    "Version: v1.10.21.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.20",
  date: "2026-08-26",
  title: "Fichiers v2 — polish final",
  items: [
    "Alignement des colonnes liste entre `FileCard` et l’en-tête de `app/files/page.tsx`.",
    "Correction de `text-[var(--muted)]` en `text-[var(--text-muted)]` pour respecter le thème.",
    "Espacement principal légèrement resserré et padding interne ajouté.",
    "Validation : build, lint.",
    "Version affichée : v1.10.20.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.20",
  date: "2026-08-26",
  title: "Files v2 — final polish",
  items: [
    "List column alignment between `FileCard` and `app/files/page.tsx` header.",
    "Fixed `text-[var(--muted)]` to `text-[var(--text-muted)]` for theme consistency.",
    "Tightened main spacing and added inner padding.",
    "Validation: build, lint.",
    "Version badge: v1.10.20.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.20",
  date: "2026-08-26",
  title: "Ficheros v2 — polish final",
  items: [
    "Alineación de columnas de lista entre `FileCard` y el encabezado de `app/files/page.tsx`.",
    "Corrección de `text-[var(--muted)]` a `text-[var(--text-muted)]` para respetar el tema.",
    "Espaciado principal ligeramente ajustado y padding interno añadido.",
    "Validación : build, lint.",
    "Versión : v1.10.20.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.20",
  date: "2026-08-26",
  title: "Dateien v2 — finaler Feinschliff",
  items: [
    "Listen-Spaltenausrichtung zwischen `FileCard` und Header von `app/files/page.tsx`.",
    "Korrektur von `text-[var(--muted)]` zu `text-[var(--text-muted)]` für Theme-Konsistenz.",
    "Hauptabstand leicht verringert und innerer Padding hinzugefügt.",
    "Validierung: build, lint.",
    "Version: v1.10.20.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.19",
  date: "2026-08-26",
  title: "Fichiers v2 — drag & drop overlay",
  items: [
    "Polish de `components/FileDropOverlay.tsx`.",
    "Overlay plus subtil (backdrop-blur-xl), zone de drop plus compacte, bordure dashed 2px.",
    "Glow et animation de respiration conservés.",
    "Validation : build, lint.",
    "Version affichée : v1.10.19.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.19",
  date: "2026-08-26",
  title: "Files v2 — drag & drop overlay",
  items: [
    "Polished `components/FileDropOverlay.tsx`.",
    "More subtle overlay (backdrop-blur-xl), smaller drop zone, 2px dashed border.",
    "Glow and breathing animation preserved.",
    "Validation: build, lint.",
    "Version badge: v1.10.19.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.19",
  date: "2026-08-26",
  title: "Ficheros v2 — overlay de arrastrar y soltar",
  items: [
    "Pulido de `components/FileDropOverlay.tsx`.",
    "Overlay más sutil (backdrop-blur-xl), zona de drop más compacta, borde dashed 2px.",
    "Glow y animación de respiración conservados.",
    "Validación : build, lint.",
    "Versión : v1.10.19.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.19",
  date: "2026-08-26",
  title: "Dateien v2 — Drag & Drop Overlay",
  items: [
    "Feinschliff von `components/FileDropOverlay.tsx`.",
    "Subtileres Overlay (backdrop-blur-xl), kompaktere Drop-Zone, 2px dashed Rahmen.",
    "Glow und Atemanimation erhalten.",
    "Validierung: build, lint.",
    "Version: v1.10.19.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.18",
  date: "2026-08-26",
  title: "Fichiers v2 — menu Ajouter",
  items: [
    "Refonte de `components/FileAddModal.tsx`.",
    "Vrai menu d'actions sous forme de 4 cards (Importer, Lien, Google Drive, Dossier).",
    "Panel de contenu propre pour chaque action, sans onglets classiques.",
    "Validation : build, lint.",
    "Version affichée : v1.10.18.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.18",
  date: "2026-08-26",
  title: "Files v2 — Add menu",
  items: [
    "Rework of `components/FileAddModal.tsx`.",
    "Real action menu as 4 cards (Import, Link, Google Drive, Folder).",
    "Clean content panel for each action, no classic tabs.",
    "Validation: build, lint.",
    "Version badge: v1.10.18.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.18",
  date: "2026-08-26",
  title: "Ficheros v2 — menú Añadir",
  items: [
    "Refactorización de `components/FileAddModal.tsx`.",
    "Menú de acciones real con 4 tarjetas (Importar, Enlace, Google Drive, Carpeta).",
    "Panel de contenido limpio para cada acción, sin pestañas clásicas.",
    "Validación : build, lint.",
    "Versión : v1.10.18.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.18",
  date: "2026-08-26",
  title: "Dateien v2 — Hinzufügen-Menü",
  items: [
    "Überarbeitung von `components/FileAddModal.tsx`.",
    "Echtes Aktionsmenü als 4 Karten (Importieren, Link, Google Drive, Ordner).",
    "Sauberer Inhaltsbereich für jede Aktion, keine klassischen Tabs.",
    "Validierung: build, lint.",
    "Version: v1.10.18.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.17",
  date: "2026-08-26",
  title: "Fichiers v2 — preview panel",
  items: [
    "Refonte de `components/FilePreview.tsx`.",
    "Panel plus large (480px), header avec nom + méta, zone média claire.",
    "Métadonnées regroupées dans une card, actions fixes en bas.",
    "Fallbacks image / vidéo / audio / PDF / texte / Drive conservés.",
    "Validation : build, lint.",
    "Version affichée : v1.10.17.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.17",
  date: "2026-08-26",
  title: "Files v2 — preview panel",
  items: [
    "Rework of `components/FilePreview.tsx`.",
    "Larger panel (480px), header with name + meta, clearer media area.",
    "Metadata grouped in a card, sticky bottom actions.",
    "Image / video / audio / PDF / text / Drive fallbacks preserved.",
    "Validation: build, lint.",
    "Version badge: v1.10.17.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.17",
  date: "2026-08-26",
  title: "Ficheros v2 — panel de previsualización",
  items: [
    "Refactorización de `components/FilePreview.tsx`.",
    "Panel más ancho (480px), encabezado con nombre + meta, zona multimedia clara.",
    "Metadatos agrupados en una tarjeta, acciones fijas abajo.",
    "Fallbacks imagen / vídeo / audio / PDF / texto / Drive conservados.",
    "Validación : build, lint.",
    "Versión : v1.10.17.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.17",
  date: "2026-08-26",
  title: "Dateien v2 — Vorschau-Panel",
  items: [
    "Überarbeitung von `components/FilePreview.tsx`.",
    "Größeres Panel (480px), Header mit Name + Meta, klarer Medienbereich.",
    "Metadaten in einer Card gruppiert, feste Aktionen unten.",
    "Bild / Video / Audio / PDF / Text / Drive-Fallbacks erhalten.",
    "Validierung: build, lint.",
    "Version: v1.10.17.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.16",
  date: "2026-08-26",
  title: "Fichiers v2 — cartes et liste",
  items: [
    "Refonte complète de `components/FileCard.tsx`.",
    "Cartes grille plus modernes : media 4:3, fallback icône propre, badge favori, actions au hover.",
    "Vue liste plus propre : alignement colonnes, icône + nom groupés, actions à droite.",
    "Validation : build, lint.",
    "Version affichée : v1.10.16.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.16",
  date: "2026-08-26",
  title: "Files v2 — cards and list",
  items: [
    "Full rework of `components/FileCard.tsx`.",
    "Modern grid cards: 4:3 media, clean icon fallback, favorite badge, hover actions.",
    "Cleaner list view: aligned columns, icon + name grouped, right-side actions.",
    "Validation: build, lint.",
    "Version badge: v1.10.16.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.16",
  date: "2026-08-26",
  title: "Ficheros v2 — tarjetas y lista",
  items: [
    "Refactorización completa de `components/FileCard.tsx`.",
    "Tarjetas de cuadrícula más modernas: media 4:3, icono de reserva limpio, badge de favorito, acciones al pasar el cursor.",
    "Vista de lista más limpia: columnas alineadas, icono + nombre agrupados, acciones a la derecha.",
    "Validación : build, lint.",
    "Versión : v1.10.16.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.16",
  date: "2026-08-26",
  title: "Dateien v2 — Karten und Liste",
  items: [
    "Vollständige Überarbeitung von `components/FileCard.tsx`.",
    "Moderne Rasterkarten: 4:3-Medien, sauberes Icon-Fallback, Favoriten-Badge, Hover-Aktionen.",
    "Sauberere Listenansicht: ausgerichtete Spalten, Icon + Name gruppiert, Aktionen rechts.",
    "Validierung: build, lint.",
    "Version: v1.10.16.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.15",
  date: "2026-08-26",
  title: "Fichiers — premier rework UI (header + empty state)",
  items: [
    "`app/files/page.tsx` : header simplifié avec titre + badge stockage, chemin plus fin.",
    "Empty state repensée : card centrée, icône ETHONE, espacements plus aérés.",
    "Validation : build, lint.",
    "Version affichée : v1.10.15.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.15",
  date: "2026-08-26",
  title: "Files — first UI rework (header + empty state)",
  items: [
    "`app/files/page.tsx`: cleaner header with title + storage badge, finer breadcrumb.",
    "Empty state redesigned: centered card, ETHONE icon, better spacing.",
    "Validation: build, lint.",
    "Version badge: v1.10.15.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.15",
  date: "2026-08-26",
  title: "Ficheros — primer rework UI (header + empty state)",
  items: [
    "`app/files/page.tsx` : header simplificado con título + badge de almacenamiento, ruta más fina.",
    "Empty state rediseñado: tarjeta centrada, icono ETHONE, espaciado mejorado.",
    "Validación : build, lint.",
    "Versión : v1.10.15.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.15",
  date: "2026-08-26",
  title: "Dateien — erster UI-Rework (Header + Empty State)",
  items: [
    "`app/files/page.tsx`: schlichtere Header mit Titel + Speicher-Badge, feinere Pfadnavigation.",
    "Empty State neu gestaltet: zentrierte Karte, ETHONE-Icon, bessere Abstände.",
    "Validierung: build, lint.",
    "Version: v1.10.15.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.14",
  date: "2026-08-26",
  title: "UI — tooltips qui disparaissent proprement",
  items: [
    "`components/UIProvider.tsx` : les tooltips sont maintenant cachés si la cible perd `data-tooltip` ou est retirée du DOM.",
    "Corrige le nom de catégorie qui restait affiché dans la sidebar.",
    "Validation : build, lint.",
    "Version affichée : v1.10.14.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.14",
  date: "2026-08-26",
  title: "UI — tooltips now hide cleanly",
  items: [
    "`components/UIProvider.tsx`: tooltips now hide when the target loses `data-tooltip` or is removed from the DOM.",
    "Fixes the category name that stayed visible in the sidebar.",
    "Validation: build, lint.",
    "Version badge: v1.10.14.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.14",
  date: "2026-08-26",
  title: "UI — tooltips ocultados limpiamente",
  items: [
    "`components/UIProvider.tsx`: los tooltips ahora se ocultan cuando el objetivo pierde `data-tooltip` o se retira del DOM.",
    "Corrige el nombre de categoría que permanecía visible en la sidebar.",
    "Validación : build, lint.",
    "Versión : v1.10.14.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.14",
  date: "2026-08-26",
  title: "UI — Tooltips verschwinden sauber",
  items: [
    "`components/UIProvider.tsx`: Tooltips werden jetzt ausgeblendet, wenn das Ziel `data-tooltip` verliert oder aus dem DOM entfernt wird.",
    "Behebt den Kategorienamen, der in der Sidebar sichtbar blieb.",
    "Validierung: build, lint.",
    "Version: v1.10.14.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.13",
  date: "2026-08-26",
  title: "Switch — taille corrigée et login ajusté",
  items: [
    "`components/Switch.tsx` : suppression des `min-h-[44px] min-w-[44px]` qui forçaient le switch à être démesuré.",
    "`app/login/page.tsx` : passage du switch `Rester connecté` en taille `md`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.13.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.13",
  date: "2026-08-26",
  title: "Switch — fixed size and login usage",
  items: [
    "`components/Switch.tsx`: removed `min-h-[44px] min-w-[44px]` that forced the switch to be oversized.",
    "`app/login/page.tsx`: `Rester connecté` switch now uses `md` size.",
    "Validation: build, lint.",
    "Version badge: v1.10.13.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.13",
  date: "2026-08-26",
  title: "Switch — tamaño corregido y login ajustado",
  items: [
    "`components/Switch.tsx`: eliminados `min-h-[44px] min-w-[44px]` que forzaban el switch a ser desproporcionado.",
    "`app/login/page.tsx`: switch `Permanecer conectado` ahora usa tamaño `md`.",
    "Validación : build, lint.",
    "Versión : v1.10.13.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.13",
  date: "2026-08-26",
  title: "Switch — Größe korrigiert und Login angepasst",
  items: [
    "`components/Switch.tsx`: `min-h-[44px] min-w-[44px]` entfernt, das den Switch übermäßig groß zwang.",
    "`app/login/page.tsx`: `Angemeldet bleiben`-Switch verwendet nun Größe `md`.",
    "Validierung: build, lint.",
    "Version: v1.10.13.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.12",
  date: "2026-08-26",
  title: "Shell — suppression du fond noir en bas",
  items: [
    "`components/Shell.tsx` : fond uniforme (`--background`) pour la zone principale, plus de dégradé vers `--panel-bg`.",
    "Retrait du padding-bottom de 8rem excédentaire.",
    "Validation : build, lint.",
    "Version affichée : v1.10.12.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.12",
  date: "2026-08-26",
  title: "Shell — remove bottom black area",
  items: [
    "`components/Shell.tsx`: uniform main background (`--background`), removed gradient to `--panel-bg`.",
    "Removed the excessive 8rem bottom padding.",
    "Validation: build, lint.",
    "Version badge: v1.10.12.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.12",
  date: "2026-08-26",
  title: "Shell — eliminar fondo negro inferior",
  items: [
    "`components/Shell.tsx`: fondo principal uniforme (`--background`), sin degradado a `--panel-bg`.",
    "Eliminado el padding-bottom excesivo de 8rem.",
    "Validación : build, lint.",
    "Versión : v1.10.12.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.12",
  date: "2026-08-26",
  title: "Shell — schwarzer Bereich unten entfernt",
  items: [
    "`components/Shell.tsx`: einheitlicher Haupt-Hintergrund (`--background`), Verlauf zu `--panel-bg` entfernt.",
    "Überschüssiges 8rem Padding unten entfernt.",
    "Validierung: build, lint.",
    "Version: v1.10.12.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.11",
  date: "2026-08-26",
  title: "Fichiers — header Finder + nettoyage 3D",
  items: [
    "`app/files/page.tsx` : header unique avec titre, chemin de navigation (path), stockage et boutons d’actions.",
    "Toolbar fusionnée dans le header : onglets, recherche, tri, doublons, vue liste/grille.",
    "Suppression du fil d’Ariane dupliqué dans le contenu.",
    "Nettoyage des dernières cartes 3D restantes dans les composants Fichiers.",
    "Validation : build, lint.",
    "Version affichée : v1.10.11.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.11",
  date: "2026-08-26",
  title: "Files — Finder header + 3D cleanup",
  items: [
    "`app/files/page.tsx`: single header with title, breadcrumb path, storage badge and action buttons.",
    "Toolbar merged into header: tabs, search, sort, duplicates, list/grid view.",
    "Removed the duplicated breadcrumb from the content area.",
    "Cleaned the remaining 3D cards in Files components.",
    "Validation: build, lint.",
    "Version badge: v1.10.11.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.11",
  date: "2026-08-26",
  title: "Archivos — header Finder y limpieza 3D",
  items: [
    "`app/files/page.tsx`: header único con título, ruta de navegación, almacenamiento y botones de acción.",
    "Toolbar fusionada en el header: pestañas, búsqueda, orden, duplicados, vista lista/cuadrícula.",
    "Eliminado el breadcrumb duplicado del contenido.",
    "Limpieza de las últimas tarjetas 3D restantes en componentes Archivos.",
    "Validación : build, lint.",
    "Versión : v1.10.11.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.11",
  date: "2026-08-26",
  title: "Dateien — Finder-Header + 3D-Bereinigung",
  items: [
    "`app/files/page.tsx`: einzelner Header mit Titel, Breadcrumb-Pfad, Speicher-Badge und Aktionsbuttons.",
    "Toolbar in Header zusammengeführt: Tabs, Suche, Sortierung, Duplikate, Listen-/Rasteransicht.",
    "Duplizierter Breadcrumb aus dem Inhaltsbereich entfernt.",
    "Bereinigung der letzten verbleibenden 3D-Karten in Dateien-Komponenten.",
    "Validierung: build, lint.",
    "Version: v1.10.11.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.10",
  date: "2026-08-26",
  title: "Fichiers — vrai rework visuel : cartes + empty state",
  items: [
    "`FileCard` complètement refondu : aperçus d’images plus grands, cartes de type Finder, liste en rangées fines.",
    "Empty state repensé : zone d’upload directe pour Drive connecté, accueil plus clair sans Drive.",
    "Validation : build, lint.",
    "Version affichée : v1.10.10.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.10",
  date: "2026-08-26",
  title: "Files — real visual rework: cards + empty state",
  items: [
    "Full `FileCard` redesign: bigger image previews, Finder-like cards, slim list rows.",
    "Reworked empty state: direct upload zone for connected Drive, cleaner welcome when not.",
    "Validation: build, lint.",
    "Version badge: v1.10.10.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.10",
  date: "2026-08-26",
  title: "Archivos — rework visual real: tarjetas + empty state",
  items: [
    "`FileCard` completamente rediseñado: vistas previas más grandes, tarjetas estilo Finder, filas de lista finas.",
    "Empty state rediseñado: zona de subida directa con Drive conectado, bienvenida más clara sin él.",
    "Validación : build, lint.",
    "Versión : v1.10.10.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.10",
  date: "2026-08-26",
  title: "Dateien — echtes visuelles Rework: Karten + Empty State",
  items: [
    "`FileCard` komplett neu gestaltet: größere Bildvorschauen, Finder-ähnliche Karten, schlanke Listenzeilen.",
    "Empty State überarbeitet: direkte Upload-Zone bei verbundenem Drive, klarere Begrüßung ohne Drive.",
    "Validierung: build, lint.",
    "Version: v1.10.10.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.9",
  date: "2026-08-26",
  title: "Admin Fichiers — cartes plates",
  items: [
    "`FilesAdminPanel` : remplacement des `Card3D` par des cartes plates normales.",
    "Plus d’effet 3D, de glow radial ou de `preserve-3d` dans le panel admin.",
    "Validation : build, lint.",
    "Version affichée : v1.10.9.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.9",
  date: "2026-08-26",
  title: "Files Admin — flat cards",
  items: [
    "`FilesAdminPanel`: replaced `Card3D` with normal flat cards.",
    "No more 3D effect, radial glow or `preserve-3d` in the admin panel.",
    "Validation: build, lint.",
    "Version badge: v1.10.9.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.9",
  date: "2026-08-26",
  title: "Admin Archivos — tarjetas planas",
  items: [
    "`FilesAdminPanel`: `Card3D` reemplazadas por tarjetas planas normales.",
    "Sin más efecto 3D, glow radial o `preserve-3d` en el panel admin.",
    "Validación : build, lint.",
    "Versión : v1.10.9.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.9",
  date: "2026-08-26",
  title: "Dateien-Admin — flache Karten",
  items: [
    "`FilesAdminPanel`: `Card3D` durch normale flache Karten ersetzt.",
    "Kein 3D-Effekt, radialer Glow oder `preserve-3d` mehr im Admin-Panel.",
    "Validierung: build, lint.",
    "Version: v1.10.9.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.8",
  date: "2026-08-26",
  title: "Fichiers — préfixe https automatique pour les liens",
  items: [
    "`FileAddModal` : les URL sans protocole sont automatiquement préfixées en `https://` au blur et à la validation.",
    "Suppression du `type=url` natif pour éviter le blocage navigateur.",
    "Validation : build, lint.",
    "Version affichée : v1.10.8.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.8",
  date: "2026-08-26",
  title: "Files — auto https prefix for links",
  items: [
    "`FileAddModal`: URLs without a protocol are automatically prefixed with `https://` on blur and submit.",
    "Removed native `type=url` to avoid browser blocking.",
    "Validation: build, lint.",
    "Version badge: v1.10.8.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.8",
  date: "2026-08-26",
  title: "Archivos — prefijo https automático para enlaces",
  items: [
    "`FileAddModal`: las URL sin protocolo se prefijan automáticamente con `https://` en blur y envío.",
    "Se eliminó el `type=url` nativo para evitar bloqueos del navegador.",
    "Validación : build, lint.",
    "Versión : v1.10.8.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.8",
  date: "2026-08-26",
  title: "Dateien — automatisches https-Präfix für Links",
  items: [
    "`FileAddModal`: URLs ohne Protokoll werden beim Blur und Absenden automatisch mit `https://` vorangestellt.",
    "Nativer `type=url` entfernt, um Browser-Blockaden zu vermeiden.",
    "Validierung: build, lint.",
    "Version: v1.10.8.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.7",
  date: "2026-08-26",
  title: "Fichiers — phase 5 : finitions UI",
  items: [
    "Header de vue liste sticky avec `z-10` et `backdrop-blur`.",
    "Meilleure cohérence du z-index et du défilement.",
    "Validation : build, lint.",
    "Version affichée : v1.10.7.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.7",
  date: "2026-08-26",
  title: "Files — phase 5: UI polish",
  items: [
    "List view header is sticky with `z-10` and `backdrop-blur`.",
    "Better z-index and scroll consistency.",
    "Validation: build, lint.",
    "Version badge: v1.10.7.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.7",
  date: "2026-08-26",
  title: "Archivos — fase 5: retoques UI",
  items: [
    "Encabezado de vista lista fijo con `z-10` y `backdrop-blur`.",
    "Mejor coherencia de z-index y desplazamiento.",
    "Validación : build, lint.",
    "Versión : v1.10.7.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.7",
  date: "2026-08-26",
  title: "Dateien — Phase 5: UI-Polish",
  items: [
    "Listen-Header ist sticky mit `z-10` und `backdrop-blur`.",
    "Bessere Z-Index- und Scroll-Konsistenz.",
    "Validierung: build, lint.",
    "Version: v1.10.7.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.6",
  date: "2026-08-26",
  title: "Fichiers — phase 4 : aperçu texte et liens",
  items: [
    "`FilePreview` affiche maintenant un aperçu texte pour fichiers texte/code/JSON/CSV.",
    "Bouton `Ouvrir dans Drive` pour les fichiers disposant d’un `webViewLink`.",
    "Chargement du contenu texte avec limite de 8000 caractères.",
    "Validation : build, lint.",
    "Version affichée : v1.10.6.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.6",
  date: "2026-08-26",
  title: "Files — phase 4: text and link preview",
  items: [
    "`FilePreview` now renders text/code/JSON/CSV previews.",
    "`Open in Drive` button for files with a `webViewLink`.",
    "Text content is fetched with an 8000 character limit.",
    "Validation: build, lint.",
    "Version badge: v1.10.6.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.6",
  date: "2026-08-26",
  title: "Archivos — fase 4: vista previa de texto y enlaces",
  items: [
    "`FilePreview` ahora muestra vista previa de texto/código/JSON/CSV.",
    "Botón `Abrir en Drive` para archivos con `webViewLink`.",
    "Contenido de texto cargado con límite de 8000 caracteres.",
    "Validación : build, lint.",
    "Versión : v1.10.6.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.6",
  date: "2026-08-26",
  title: "Dateien — Phase 4: Text- und Link-Vorschau",
  items: [
    "`FilePreview` rendert jetzt Text-/Code-/JSON-/CSV-Vorschauen.",
    "`In Drive öffnen`-Button für Dateien mit `webViewLink`.",
    "Textinhalt wird mit einem Limit von 8000 Zeichen geladen.",
    "Validierung: build, lint.",
    "Version: v1.10.6.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.5",
  date: "2026-08-26",
  title: "Fichiers — phase 3 : drag & drop revisité",
  items: [
    "`FileDropOverlay` : glow pulsant avec la couleur du thème pendant le survol.",
    "`FileUploadZone` : glow d’accent lorsque des fichiers sont déposés dans la zone.",
    "Transitions douces et feedback visuel renforcé sans effet flashy.",
    "Validation : build, lint.",
    "Version affichée : v1.10.5.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.5",
  date: "2026-08-26",
  title: "Files — phase 3: drag & drop polish",
  items: [
    "`FileDropOverlay`: pulsing glow using the theme color while dragging over the page.",
    "`FileUploadZone`: accent glow when dropping files in the upload zone.",
    "Smooth transitions and enhanced visual feedback without flashiness.",
    "Validation: build, lint.",
    "Version badge: v1.10.5.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.5",
  date: "2026-08-26",
  title: "Archivos — fase 3: drag & drop pulido",
  items: [
    "`FileDropOverlay`: brillo pulsante con el color del tema al arrastrar sobre la página.",
    "`FileUploadZone`: brillo de acento al soltar archivos en la zona de subida.",
    "Transiciones suaves y feedback visual reforzado sin exceso.",
    "Validación : build, lint.",
    "Versión : v1.10.5.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.5",
  date: "2026-08-26",
  title: "Dateien — Phase 3: Drag & Drop verfeinert",
  items: [
    "`FileDropOverlay`: pulsierendes Glow in der Theme-Farbe beim Ziehen über die Seite.",
    "`FileUploadZone`: Akzent-Glow beim Ablegen von Dateien in der Upload-Zone.",
    "Sanfte Übergänge und verstärktes visuelles Feedback ohne Aufdringlichkeit.",
    "Validierung: build, lint.",
    "Version: v1.10.5.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.4",
  date: "2026-08-26",
  title: "Fichiers — phase 2 : vue liste en colonnes",
  items: [
    "Refonte de `FileCard` en vue liste avec une grille CSS.",
    "Colonnes alignées : Nom, Taille, Date, Actions.",
    "Header de liste affiché en haut pour repérer les colonnes.",
    "Vue mobile adaptée (métas cachées, nom sous forme compacte).",
    "Validation : build, lint.",
    "Version affichée : v1.10.4.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.4",
  date: "2026-08-26",
  title: "Files — phase 2: list view with columns",
  items: [
    "Redesigned `FileCard` list view with a CSS grid.",
    "Aligned columns: Name, Size, Date, Actions.",
    "List header displayed at the top to identify columns.",
    "Mobile-friendly (hidden meta, compact name).",
    "Validation: build, lint.",
    "Version badge: v1.10.4.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.4",
  date: "2026-08-26",
  title: "Archivos — fase 2: vista lista en columnas",
  items: [
    "`FileCard` rediseñado en vista lista con una cuadrícula CSS.",
    "Columnas alineadas: Nombre, Tamaño, Fecha, Acciones.",
    "Encabezado de lista en la parte superior para identificar las columnas.",
    "Adaptado a móvil (metas ocultas, nombre compacto).",
    "Validación : build, lint.",
    "Versión : v1.10.4.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.4",
  date: "2026-08-26",
  title: "Dateien — Phase 2: Listenansicht mit Spalten",
  items: [
    "`FileCard` Listenansicht mit CSS-Grid neu gestaltet.",
    "Ausgerichtete Spalten: Name, Größe, Datum, Aktionen.",
    "Listen-Header oben zur Spaltenerkennung.",
    "Mobil angepasst (versteckte Metas, kompakter Name).",
    "Validierung: build, lint.",
    "Version: v1.10.4.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.3",
  date: "2026-08-26",
  title: "Fichiers — vrai rework : header + empty state",
  items: [
    "Header refondu : titre, badge de stockage, boutons et barre d’outils sticky en une ligne.",
    "Empty state enrichi : icône, texte et 3 CTA (Importer, Créer un dossier, Ajouter un lien).",
    "`FileAddModal` accepte un onglet initial (`initialTab`) pour ouvrir directement la bonne section.",
    "Validation : build, lint.",
    "Version affichée : v1.10.3.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.3",
  date: "2026-08-26",
  title: "Files — real rework: header + empty state",
  items: [
    "Redesigned header: title, storage badge, buttons and sticky toolbar in one line.",
    "Richer empty state: icon, text and 3 CTAs (Import, Create folder, Add link).",
    "`FileAddModal` now accepts an initial tab (`initialTab`) to open the right section directly.",
    "Validation: build, lint.",
    "Version badge: v1.10.3.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.3",
  date: "2026-08-26",
  title: "Archivos — rework real: header + empty state",
  items: [
    "Header rediseñado: título, insignia de almacenamiento, botones y barra de herramientas fija en una línea.",
    "Empty state más rico: icono, texto y 3 CTAs (Importar, Crear carpeta, Añadir enlace).",
    "`FileAddModal` ahora acepta una pestaña inicial (`initialTab`) para abrir la sección correcta directamente.",
    "Validación : build, lint.",
    "Versión : v1.10.3.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.3",
  date: "2026-08-26",
  title: "Dateien — echtes Rework: Header + Empty State",
  items: [
    "Header überarbeitet: Titel, Speicher-Badge, Buttons und sticky Toolbar in einer Zeile.",
    "Bereicherter Empty State: Icon, Text und 3 CTAs (Importieren, Ordner erstellen, Link hinzufügen).",
    "`FileAddModal` akzeptiert jetzt einen initialen Tab (`initialTab`), um direkt den richtigen Bereich zu öffnen.",
    "Validierung: build, lint.",
    "Version: v1.10.3.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.2",
  date: "2026-08-26",
  title: "Fichiers — redesign de la tuile FileCard",
  items: [
    "Nouvel aspect des cartes/tuiles de fichiers.",
    "Aperçu visuel via `thumbnailLink` et `iconUrl` (images et icônes Google Drive).",
    "Mise en page plus aérée : icône plus grande en grille, informations plus lisibles.",
    "État de sélection avec bordure et ring d’accent.",
    "Actions visibles réduites (favori, télécharger, corbeille/restaurer), le reste reste dans le menu contextuel.",
    "Validation : build, lint.",
    "Version affichée : v1.10.2.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.2",
  date: "2026-08-26",
  title: "Files — FileCard tile redesign",
  items: [
    "New file card/tile appearance.",
    "Visual preview via `thumbnailLink` and `iconUrl` (images and Google Drive icons).",
    "More airy layout: larger icon in grid, clearer information.",
    "Selected state with accent border and ring.",
    "Visible actions reduced (favorite, download, trash/restore), the rest stays in the context menu.",
    "Validation: build, lint.",
    "Version badge: v1.10.2.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.2",
  date: "2026-08-26",
  title: "Archivos — rediseño de tarjeta FileCard",
  items: [
    "Nuevo aspecto de las tarjetas de archivos.",
    "Vista previa visual a través de `thumbnailLink` e `iconUrl` (imágenes e iconos de Google Drive).",
    "Diseño más aireado: icono más grande en cuadrícula, información más legible.",
    "Estado de selección con borde y anillo de acento.",
    "Acciones visibles reducidas (favorito, descargar, papelera/restaurar), el resto permanece en el menú contextual.",
    "Validación : build, lint.",
    "Versión : v1.10.2.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.2",
  date: "2026-08-26",
  title: "Dateien — FileCard-Kachel neu gestaltet",
  items: [
    "Neues Erscheinungsbild der Dateikacheln.",
    "Visuelle Vorschau über `thumbnailLink` und `iconUrl` (Bilder und Google Drive-Icons).",
    "Luftigeres Layout: größeres Icon im Raster, übersichtlichere Informationen.",
    "Ausgewählter Zustand mit Akzent-Rand und Ring.",
    "Sichtbare Aktionen reduziert (Favorit, Herunterladen, Papierkorb/Wiederherstellen), der Rest bleibt im Kontextmenü.",
    "Validierung: build, lint.",
    "Version: v1.10.2.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.1",
  date: "2026-08-26",
  title: "Fichiers — recherche par type, extension et résumé",
  items: [
    "La recherche Fichiers scanne maintenant le nom, le type MIME, l’extension et le `brainSummary`.",
    "Compatible avec les requêtes comme `pdf`, `image`, `.mp4`, etc.",
    "Validation : build, lint.",
    "Version affichée : v1.10.1.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.1",
  date: "2026-08-26",
  title: "Files — search by type, extension and summary",
  items: [
    "Files search now scans name, MIME type, file extension and `brainSummary`.",
    "Supports queries like `pdf`, `image`, `.mp4`, etc.",
    "Validation: build, lint.",
    "Version badge: v1.10.1.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.1",
  date: "2026-08-26",
  title: "Archivos — búsqueda por tipo, extensión y resumen",
  items: [
    "La búsqueda de archivos ahora escanea nombre, tipo MIME, extensión y `brainSummary`.",
    "Soporta consultas como `pdf`, `image`, `.mp4`, etc.",
    "Validación : build, lint.",
    "Versión : v1.10.1.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.1",
  date: "2026-08-26",
  title: "Dateien — Suche nach Typ, Erweiterung und Zusammenfassung",
  items: [
    "Dateisuche scannt jetzt Name, MIME-Typ, Dateierweiterung und `brainSummary`.",
    "Unterstützt Anfragen wie `pdf`, `image`, `.mp4`, etc.",
    "Validierung: build, lint.",
    "Version: v1.10.1.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.10.0",
  date: "2026-08-26",
  title: "Fichiers — finition de la file d’attente d’upload",
  items: [
    "Thème ETHONE appliqué à `UploadQueueList` : suppression des couleurs zinc.",
    "Correction du badge `Téléversé` qui rendait le texte invisible.",
    "Piste de progression et fonds adaptés aux variables de thème.",
    "Textes `File d’attente` et `En attente` passés par `i18n`.",
    "Validation : build, lint.",
    "Version affichée : v1.10.0.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.10.0",
  date: "2026-08-26",
  title: "Files — upload queue polish",
  items: [
    "ETHONE theme applied to `UploadQueueList`: removed zinc colors.",
    "Fixed `Uploaded` badge that made text invisible.",
    "Progress track and backgrounds now use theme variables.",
    "`Queue` and `Pending` texts are now i18n-aware.",
    "Validation: build, lint.",
    "Version badge: v1.10.0.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.10.0",
  date: "2026-08-26",
  title: "Archivos — acabado de la cola de subida",
  items: [
    "Tema ETHONE aplicado a `UploadQueueList`: eliminados colores zinc.",
    "Corregida la insignia `Subido` que hacía el texto invisible.",
    "Barra de progreso y fondos adaptados a las variables del tema.",
    "Textos `Cola` y `Pendiente` ahora pasan por `i18n`.",
    "Validación : build, lint.",
    "Versión : v1.10.0.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.10.0",
  date: "2026-08-26",
  title: "Dateien — Upload-Warteschlange aufgehübscht",
  items: [
    "ETHONE-Theme auf `UploadQueueList` angewendet: Zink-Farben entfernt.",
    "`Hochgeladen`-Badge korrigiert, der Text war unsichtbar.",
    "Fortschrittsbalken und Hintergründe verwenden jetzt Theme-Variablen.",
    "Texte `Warteschlange` und `Ausstehend` sind jetzt i18n-fähig.",
    "Validierung: build, lint.",
    "Version: v1.10.0.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.99",
  date: "2026-08-26",
  title: "Fichiers — action Copier le lien",
  items: [
    "Ajout de l’action `Copier le lien` dans le menu contextuel (si `webViewLink` est présent).",
    "Ajout du bouton `Copier le lien` dans le drawer `FilePreview`.",
    "Validation : build, lint.",
    "Version affichée : v1.9.99.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.99",
  date: "2026-08-26",
  title: "Files — copy link action",
  items: [
    "Added `Copy link` action in the context menu when `webViewLink` is present.",
    "Added `Copy link` button in the `FilePreview` drawer.",
    "Validation: build, lint.",
    "Version badge: v1.9.99.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.99",
  date: "2026-08-26",
  title: "Archivos — acción copiar enlace",
  items: [
    "Añadida acción `Copiar enlace` en el menú contextual cuando `webViewLink` está presente.",
    "Añadido botón `Copiar enlace` en el drawer `FilePreview`.",
    "Validación : build, lint.",
    "Versión : v1.9.99.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.99",
  date: "2026-08-26",
  title: "Dateien — Link kopieren",
  items: [
    "Aktion `Link kopieren` im Kontextmenü hinzugefügt, wenn `webViewLink` vorhanden ist.",
    "Button `Link kopieren` im `FilePreview`-Drawer hinzugefügt.",
    "Validierung: build, lint.",
    "Version: v1.9.99.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.98",
  date: "2026-08-26",
  title: "Fichiers — aperçu enrichi (image, PDF, vidéo, audio)",
  items: [
    "`FilePreview` récupère une URL directe via l’API Google Drive.",
    "Aperçu natif pour les images, les vidéos et les fichiers audio.",
    "Aperçu PDF via `<iframe>`.",
    "Fichiers non pris en charge : icône et métadonnées comme avant.",
    "Validation : build, lint.",
    "Version affichée : v1.9.98.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.98",
  date: "2026-08-26",
  title: "Files — rich preview for images, PDF, video, audio",
  items: [
    "`FilePreview` fetches a direct URL via the Google Drive API.",
    "Native preview for images, videos and audio files.",
    "PDF preview via `<iframe>`.",
    "Unsupported files still show icon and metadata.",
    "Validation: build, lint.",
    "Version badge: v1.9.98.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.98",
  date: "2026-08-26",
  title: "Archivos — vista previa enriquecida (imagen, PDF, vídeo, audio)",
  items: [
    "`FilePreview` obtiene una URL directa a través de la API de Google Drive.",
    "Vista previa nativa para imágenes, vídeos y archivos de audio.",
    "Vista previa de PDF a través de `<iframe>`.",
    "Archivos no compatibles siguen mostrando icono y metadatos.",
    "Validación : build, lint.",
    "Versión : v1.9.98.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.98",
  date: "2026-08-26",
  title: "Dateien — erweiterte Vorschau (Bild, PDF, Video, Audio)",
  items: [
    "`FilePreview` ruft eine direkte URL über die Google Drive API ab.",
    "Native Vorschau für Bilder, Videos und Audiodateien.",
    "PDF-Vorschau über `<iframe>`.",
    "Nicht unterstützte Dateien zeigen weiterhin Icon und Metadaten.",
    "Validierung: build, lint.",
    "Version: v1.9.98.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.97",
  date: "2026-08-26",
  title: "Fichiers — audit final et finitions",
  items: [
    "Labels du menu `Ajouter` alignés : Importer un fichier, Ajouter un lien, Google Drive, Créer un dossier.",
    "Menu contextuel : `Aperçu` pour les fichiers au lieu de `Télécharger`.",
    "Drawer de prévisualisation : bouton Télécharger en style secondaire.",
    "Préférence grille/liste persistée dans `localStorage`.",
    "`Tout sélectionner` masqué quand aucun fichier n’est affiché.",
    "Validation : build, lint.",
    "Version affichée : v1.9.97.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.97",
  date: "2026-08-26",
  title: "Files — final audit and polish",
  items: [
    "Add menu labels aligned: Import a file, Add a link, Google Drive, Create a folder.",
    "Context menu: `Preview` for files instead of `Download`.",
    "Preview drawer: Download button in secondary style.",
    "Grid/list preference persisted in `localStorage`.",
    "`Select all` hidden when no files are shown.",
    "Validation: build, lint.",
    "Version badge: v1.9.97.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.97",
  date: "2026-08-26",
  title: "Archivos — auditoría final y acabado",
  items: [
    "Etiquetas del menú Añadir alineadas: Importar archivo, Añadir enlace, Google Drive, Crear carpeta.",
    "Menú contextual: `Vista previa` para archivos en lugar de `Descargar`.",
    "Drawer de vista previa: botón Descargar en estilo secundario.",
    "Preferencia de cuadrícula/lista guardada en `localStorage`.",
    "`Seleccionar todo` oculto cuando no hay archivos.",
    "Validación : build, lint.",
    "Versión : v1.9.97.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.97",
  date: "2026-08-26",
  title: "Dateien — abschließende Prüfung und Feinschliff",
  items: [
    "Hinzufügen-Menü-Labels angeglichen: Datei importieren, Link hinzufügen, Google Drive, Ordner erstellen.",
    "Kontextmenü: `Vorschau` für Dateien statt `Herunterladen`.",
    "Vorschau-Drawer: Download-Button im sekundären Stil.",
    "Raster/Liste-Präferenz in `localStorage` gespeichert.",
    "`Alle auswählen` ausgeblendet, wenn keine Dateien angezeigt werden.",
    "Validierung: build, lint.",
    "Version: v1.9.97.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.96",
  date: "2026-08-26",
  title: "Fichiers — correction du skeleton de chargement",
  items: [
    "Le `Tout sélectionner` est maintenant caché pendant le chargement.",
    "Skeleton de chargement plus visible avec `text-primary` au lieu de `border`.",
    "Layout du skeleton en liste corrigé (icône à gauche du texte).",
    "Validation : build, lint.",
    "Version affichée : v1.9.96.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.96",
  date: "2026-08-26",
  title: "Files — loading skeleton fix",
  items: [
    "`Select all` is now hidden while loading.",
    "Loading skeleton is more visible, using `text-primary` instead of `border`.",
    "Fixed list skeleton layout (icon to the left of text).",
    "Validation: build, lint.",
    "Version badge: v1.9.96.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.96",
  date: "2026-08-26",
  title: "Archivos — corrección del skeleton de carga",
  items: [
    "`Seleccionar todo` ahora se oculta durante la carga.",
    "El skeleton de carga es más visible, usando `text-primary` en lugar de `border`.",
    "Layout del skeleton en lista corregido (icono a la izquierda del texto).",
    "Validación : build, lint.",
    "Versión : v1.9.96.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.96",
  date: "2026-08-26",
  title: "Dateien — Lade-Skeleton korrigiert",
  items: [
    "`Alle auswählen` wird beim Laden ausgeblendet.",
    "Lade-Skeleton ist jetzt besser sichtbar, mit `text-primary` statt `border`.",
    "Listen-Skeleton-Layout korrigiert (Icon links vom Text).",
    "Validierung: build, lint.",
    "Version: v1.9.96.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.95",
  date: "2026-08-26",
  title: "Fichiers — effets visuels épurés",
  items: [
    "Onglet Upload de `FileAddModal` : message de connexion plus discret, bouton secondaire.",
    "Page Fichiers : bouton `Connecter Google Drive` en style secondaire.",
    "`FileUploadZone` : suppression du glow et des couleurs zinc, style plus plat.",
    "`FileDropOverlay` : suppression du halo vert et du rebond, bordure plus subtile.",
    "Validation : build, lint.",
    "Version affichée : v1.9.95.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.95",
  date: "2026-08-26",
  title: "Files — cleaned up visual effects",
  items: [
    "FileAddModal Upload tab: more discreet connection message, secondary button.",
    "Files page: `Connect Google Drive` button in secondary style.",
    "`FileUploadZone`: removed glow and zinc colors, flatter styling.",
    "`FileDropOverlay`: removed green halo and bounce, subtler border.",
    "Validation: build, lint.",
    "Version badge: v1.9.95.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.95",
  date: "2026-08-26",
  title: "Archivos — efectos visuales limpios",
  items: [
    "Pestaña Subir de `FileAddModal`: mensaje de conexión más discreto, botón secundario.",
    "Página Archivos: botón `Conectar Google Drive` en estilo secundario.",
    "`FileUploadZone`: eliminado el glow y colores zinc, estilo más plano.",
    "`FileDropOverlay`: eliminado el halo verde y el rebote, borde más sutil.",
    "Validación : build, lint.",
    "Versión : v1.9.95.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.95",
  date: "2026-08-26",
  title: "Dateien — visuelle Effekte bereinigt",
  items: [
    "FileAddModal Upload-Tab: dezentere Verbindungsmeldung, sekundärer Button.",
    "Dateien-Seite: `Google Drive verbinden`-Button im sekundären Stil.",
    "`FileUploadZone`: Glow und Zink-Farben entfernt, flacherer Stil.",
    "`FileDropOverlay`: grüner Halo und Wackeln entfernt, subtilerer Rand.",
    "Validierung: build, lint.",
    "Version: v1.9.95.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.94",
  date: "2026-08-26",
  title: "Fichiers — cartes plates",
  items: [
    "Remplacement des `Card3D` par des cartes plates dans `FileCard`.",
    "Skeleton et quota dupliquent le style de carte plate.",
    "Suppression de l'import `Card3D` dans `app/files/page.tsx`.",
    "Validation : build, lint.",
    "Version affichée : v1.9.94.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.94",
  date: "2026-08-26",
  title: "Files — flat cards",
  items: [
    "Replaced `Card3D` with flat cards in `FileCard`.",
    "Skeleton and quota cards now use the same flat style.",
    "Removed `Card3D` import from `app/files/page.tsx`.",
    "Validation: build, lint.",
    "Version badge: v1.9.94.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.94",
  date: "2026-08-26",
  title: "Archivos — tarjetas planas",
  items: [
    "Reemplazo de `Card3D` por tarjetas planas en `FileCard`.",
    "Skeleton y tarjeta de cuota usan el mismo estilo plano.",
    "Eliminado el import `Card3D` de `app/files/page.tsx`.",
    "Validación : build, lint.",
    "Versión : v1.9.94.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.94",
  date: "2026-08-26",
  title: "Dateien — flache Karten",
  items: [
    "`Card3D` durch flache Karten in `FileCard` ersetzt.",
    "Skeleton und Quota-Karte verwenden denselben flachen Stil.",
    "`Card3D`-Import aus `app/files/page.tsx` entfernt.",
    "Validierung: build, lint.",
    "Version: v1.9.94.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.93",
  date: "2026-08-26",
  title: "Fichiers — phase 10 : suggestions Brain",
  items: [
    "Section `Suggestions Brain` affichant jusqu'à 5 fichiers ayant un `brainSummary`.",
    "S'affiche uniquement à la racine, sans filtres actifs.",
    "Même carte et actions que les fichiers récents.",
    "Préparation pour une future recherche sémantique Brain.",
    "Validation : build, lint.",
    "Version affichée : v1.9.93.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.93",
  date: "2026-08-26",
  title: "Files — phase 10: Brain suggestions",
  items: [
    "New `Brain suggestions` section showing up to 5 files with a `brainSummary`.",
    "Only visible at root level, without active filters.",
    "Same cards and actions as recent files.",
    "Preparation for future Brain semantic search.",
    "Validation: build, lint.",
    "Version badge: v1.9.93.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.93",
  date: "2026-08-26",
  title: "Archivos — fase 10: sugerencias Brain",
  items: [
    "Nueva sección `Sugerencias Brain` mostrando hasta 5 archivos con `brainSummary`.",
    "Visible solo en la raíz, sin filtros activos.",
    "Mismas tarjetas y acciones que archivos recientes.",
    "Preparación para futura búsqueda semántica Brain.",
    "Validación : build, lint.",
    "Versión : v1.9.93.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.93",
  date: "2026-08-26",
  title: "Dateien — Phase 10: Brain-Vorschläge",
  items: [
    "Neuer Bereich `Brain-Vorschläge` mit bis zu 5 Dateien, die ein `brainSummary` haben.",
    "Nur auf Root-Ebene sichtbar, ohne aktive Filter.",
    "Gleiche Karten und Aktionen wie bei kürzlich verwendeten Dateien.",
    "Vorbereitung für zukünftige Brain-Semantik-Suche.",
    "Validierung: build, lint.",
    "Version: v1.9.93.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.92",
  date: "2026-08-26",
  title: "Fichiers — phase 9 : empty states et apparition des cartes",
  items: [
    "Remplacement des messages bruts par `EmptyState` pour les états vides et les erreurs.",
    "Empty state avec icône adaptée (corbeille, doublons, dossiers, inbox) et action `Ajouter`/`Connecter Drive`.",
    "État d'erreur avec bouton `Réessayer`.",
    "Animation d'apparition des cartes (fade + translation) avec délai progressif.",
    "Validation : build, lint.",
    "Version affichée : v1.9.92.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.92",
  date: "2026-08-26",
  title: "Files — phase 9: empty states and card appear",
  items: [
    "Replaced raw messages with `EmptyState` for empty and error states.",
    "Empty state with adaptive icon (trash, duplicates, folders, inbox) and `Add`/`Connect Drive` action.",
    "Error state with `Retry` button.",
    "Card appear animation (fade + slide) with progressive delay.",
    "Validation: build, lint.",
    "Version badge: v1.9.92.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.92",
  date: "2026-08-26",
  title: "Archivos — fase 9: estados vacíos y aparición de tarjetas",
  items: [
    "Mensajes crudos reemplazados por `EmptyState` para estados vacíos y errores.",
    "Estado vacío con icono adaptativo (papelera, duplicados, carpetas, inbox) y acción `Añadir`/`Conectar Drive`.",
    "Estado de error con botón `Reintentar`.",
    "Animación de aparición de tarjetas (fade + desliz) con retardo progresivo.",
    "Validación : build, lint.",
    "Versión : v1.9.92.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.92",
  date: "2026-08-26",
  title: "Dateien — Phase 9: Empty States und Karten-Animation",
  items: [
    "Rohe Nachrichten durch `EmptyState` für leere und Fehlerzustände ersetzt.",
    "Empty State mit adaptivem Icon (Papierkorb, Duplikate, Ordner, Inbox) und `Hinzufügen`/`Drive verbinden`-Aktion.",
    "Fehlerzustand mit `Wiederholen`-Button.",
    "Karten-Erscheinungsanimation (Fade + Verschiebung) mit progressivem Verzögerung.",
    "Validierung: build, lint.",
    "Version: v1.9.92.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.91",
  date: "2026-08-26",
  title: "Fichiers — phase 8 : détection de doublons",
  items: [
    "Détection de doublons basée sur nom + taille.",
    "Bouton dans la barre d'outils indiquant le nombre de doublons détectés.",
    "Mode doublon : filtre la liste pour n'afficher que les fichiers en double.",
    "Puce de filtre active pour quitter le mode doublon.",
    "Validation : build, lint.",
    "Version affichée : v1.9.91.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.91",
  date: "2026-08-26",
  title: "Files — phase 8: duplicate detection",
  items: [
    "Duplicate detection based on name + size.",
    "Toolbar button showing the number of detected duplicates.",
    "Duplicate mode: filters the list to only show duplicate files.",
    "Active filter chip to exit duplicate mode.",
    "Validation: build, lint.",
    "Version badge: v1.9.91.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.91",
  date: "2026-08-26",
  title: "Archivos — fase 8: detección de duplicados",
  items: [
    "Detección de duplicados basada en nombre + tamaño.",
    "Botón en la barra de herramientas que indica la cantidad de duplicados detectados.",
    "Modo duplicado: filtra la lista para mostrar solo archivos duplicados.",
    "Chip de filtro activo para salir del modo duplicado.",
    "Validación : build, lint.",
    "Versión : v1.9.91.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.91",
  date: "2026-08-26",
  title: "Dateien — Phase 8: Duplikat-Erkennung",
  items: [
    "Duplikat-Erkennung basierend auf Name + Größe.",
    "Toolbar-Button zeigt die Anzahl erkannter Duplikate an.",
    "Duplikat-Modus: filtert die Liste, um nur doppelte Dateien anzuzeigen.",
    "Aktiver Filter-Chip zum Verlassen des Duplikat-Modus.",
    "Validierung: build, lint.",
    "Version: v1.9.91.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.90",
  date: "2026-08-26",
  title: "Fichiers — phase 7 : fichiers récemment utilisés",
  items: [
    "Section `Récemment utilisés` au-dessus de la liste principale.",
    "Sélectionne les 5 derniers fichiers (non-dossiers, non-corbeille) triés par `updatedAt` puis `createdAt`.",
    "Affiche les fichiers récents en grille compacte avec les mêmes actions.",
    "S'affiche uniquement à la racine, sans recherche/filtres actifs.",
    "Validation : build, lint.",
    "Version affichée : v1.9.90.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.90",
  date: "2026-08-26",
  title: "Files — phase 7: recently used files",
  items: [
    "New `Recently used` section above the main list.",
    "Picks the 5 latest non-folder, non-trashed files sorted by `updatedAt` then `createdAt`.",
    "Shows recent files in a compact grid with the same actions.",
    "Only visible at root level, when no active search/filters.",
    "Validation: build, lint.",
    "Version badge: v1.9.90.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.90",
  date: "2026-08-26",
  title: "Archivos — fase 7: archivos recientemente usados",
  items: [
    "Nueva sección `Usados recientemente` encima de la lista principal.",
    "Selecciona los 5 últimos archivos que no sean carpetas ni papelera, ordenados por `updatedAt` y `createdAt`.",
    "Muestra archivos recientes en cuadrícula compacta con las mismas acciones.",
    "Visible solo en la raíz, sin búsqueda/filtros activos.",
    "Validación : build, lint.",
    "Versión : v1.9.90.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.90",
  date: "2026-08-26",
  title: "Dateien — Phase 7: kürzlich verwendete Dateien",
  items: [
    "Neuer Bereich `Kürzlich verwendet` über der Hauptliste.",
    "Wählt die 5 neuesten Nicht-Ordner-, Nicht-Papierkorb-Dateien sortiert nach `updatedAt` dann `createdAt`.",
    "Zeigt kürzliche Dateien in kompaktem Raster mit denselben Aktionen.",
    "Nur auf Root-Ebene sichtbar, wenn keine aktive Suche/Filter.",
    "Validierung: build, lint.",
    "Version: v1.9.90.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.89",
  date: "2026-08-26",
  title: "Fichiers — phase 6 : menu contextuel moderne",
  items: [
    "Refonte visuelle du composant `ContextMenu` : fond glass, ombre portée, coins arrondis, animation d'apparition.",
    "Item actif surligné avec la couleur d'accent du thème.",
    "Effet haptique au clic d'une option.",
    "Respecte `prefers-reduced-motion`.",
    "Validation : build, lint.",
    "Version affichée : v1.9.89.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.89",
  date: "2026-08-26",
  title: "Files — phase 6: modern context menu",
  items: [
    "Visual refresh of the `ContextMenu` component: glass background, drop shadow, rounded corners, enter animation.",
    "Active item highlighted with the theme accent color.",
    "Haptic effect when clicking an option.",
    "Respects `prefers-reduced-motion`.",
    "Validation: build, lint.",
    "Version badge: v1.9.89.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.89",
  date: "2026-08-26",
  title: "Archivos — fase 6: menú contextual moderno",
  items: [
    "Rediseño visual del componente `ContextMenu`: fondo glass, sombra, esquinas redondeadas, animación de aparición.",
    "Elemento activo resaltado con el color de acento del tema.",
    "Efecto háptico al hacer clic en una opción.",
    "Respeta `prefers-reduced-motion`.",
    "Validación : build, lint.",
    "Versión : v1.9.89.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.89",
  date: "2026-08-26",
  title: "Dateien — Phase 6: modernes Kontextmenü",
  items: [
    "Visuelles Redesign der `ContextMenu`-Komponente: Glass-Hintergrund, Schatten, abgerundete Ecken, Erscheinungsanimation.",
    "Aktives Element wird mit der Akzentfarbe des Themes hervorgehoben.",
    "Haptischer Effekt beim Klicken einer Option.",
    "Respektiert `prefers-reduced-motion`.",
    "Validierung: build, lint.",
    "Version: v1.9.89.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.88",
  date: "2026-08-26",
  title: "Fichiers — phase 5 : drag & drop global",
  items: [
    "Nouveau `FileDropOverlay` : glisser-déposer n'importe où sur la page Fichiers.",
    "Overlay avec animation, preview du premier fichier, fond flouté et zone de drop au centre.",
    "Les fichiers déposés ouvrent directement la modale Ajouter sur l'onglet Upload.",
    "`FileUploader` accepte un prop `initialFiles` pour ingérer les fichiers déposés.",
    "Respecte `prefers-reduced-motion` et désactivé si aucun Drive connecté.",
    "Validation : build, lint.",
    "Version affichée : v1.9.88.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.88",
  date: "2026-08-26",
  title: "Files — phase 5: global drag & drop",
  items: [
    "New `FileDropOverlay`: drag and drop anywhere on the Files page.",
    "Overlay with animation, first file preview, blurred backdrop and centered drop zone.",
    "Dropped files open the Add modal directly on the Upload tab.",
    "`FileUploader` now accepts an `initialFiles` prop to ingest dropped files.",
    "Respects `prefers-reduced-motion` and disabled when no Drive is connected.",
    "Validation: build, lint.",
    "Version badge: v1.9.88.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.88",
  date: "2026-08-26",
  title: "Archivos — fase 5: arrastrar y soltar global",
  items: [
    "Nuevo `FileDropOverlay`: arrastrar y soltar en cualquier parte de la página Archivos.",
    "Overlay con animación, vista previa del primer archivo, fondo difuminado y zona de drop centrada.",
    "Los archivos soltados abren directamente el modal Añadir en la pestaña Subir.",
    "`FileUploader` acepta ahora un prop `initialFiles` para ingerir archivos soltados.",
    "Respeta `prefers-reduced-motion` y se desactiva si no hay Drive conectado.",
    "Validación : build, lint.",
    "Versión : v1.9.88.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.88",
  date: "2026-08-26",
  title: "Dateien — Phase 5: globaler Drag & Drop",
  items: [
    "Neues `FileDropOverlay`: Drag & Drop überall auf der Dateien-Seite.",
    "Overlay mit Animation, Vorschau der ersten Datei, verschwommenem Hintergrund und zentrierter Drop-Zone.",
    "Abgelegte Dateien öffnen direkt das Hinzufügen-Modal im Upload-Tab.",
    "`FileUploader` akzeptiert nun ein `initialFiles`-Prop, um abgelegte Dateien zu verarbeiten.",
    "Respektiert `prefers-reduced-motion` und deaktiviert sich, wenn kein Drive verbunden ist.",
    "Validierung: build, lint.",
    "Version: v1.9.88.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.87",
  date: "2026-08-26",
  title: "Fichiers — phase 4 : grille/liste et cartes modernes",
  items: [
    "Nouveau composant `FileCard` unifié pour les vues liste et grille.",
    "Bascule liste/grille dans la barre d'outils avec icônes actives.",
    "Vue grille : 2/3/4 colonnes selon la taille d'écran, cartes carrées centrées.",
    "Vue liste : disposition compacte conservée avec actions rapides.",
    "Cartes avec hover, transitions et stopPropagation sur les actions.",
    "Validation : build, lint.",
    "Version affichée : v1.9.87.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.87",
  date: "2026-08-26",
  title: "Files — phase 4: grid/list and modern cards",
  items: [
    "New unified `FileCard` component for list and grid views.",
    "List/grid toggle in the toolbar with active icons.",
    "Grid view: 2/3/4 columns based on screen size, centered square cards.",
    "List view: compact layout kept with quick actions.",
    "Cards with hover, transitions and stopPropagation on actions.",
    "Validation: build, lint.",
    "Version badge: v1.9.87.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.87",
  date: "2026-08-26",
  title: "Archivos — fase 4: cuadrícula/lista y tarjetas modernas",
  items: [
    "Nuevo componente `FileCard` unificado para vistas de lista y cuadrícula.",
    "Alternancia lista/cuadrícula en la barra de herramientas con iconos activos.",
    "Vista de cuadrícula: 2/3/4 columnas según el tamaño de pantalla, tarjetas cuadradas centradas.",
    "Vista de lista: diseño compacto conservado con acciones rápidas.",
    "Tarjetas con hover, transiciones y stopPropagation en acciones.",
    "Validación : build, lint.",
    "Versión : v1.9.87.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.87",
  date: "2026-08-26",
  title: "Dateien — Phase 4: Raster/Liste und moderne Karten",
  items: [
    "Neue einheitliche `FileCard`-Komponente für Listen- und Rasteransicht.",
    "Liste/Raster-Umschaltung in der Toolbar mit aktiven Icons.",
    "Rasteransicht: 2/3/4 Spalten je Bildschirmgröße, zentrierte quadratische Karten.",
    "Listenansicht: Kompaktes Layout mit Schnellaktionen beibehalten.",
    "Karten mit Hover, Transitionen und stopPropagation auf Aktionen.",
    "Validierung: build, lint.",
    "Version: v1.9.87.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.86",
  date: "2026-08-26",
  title: "Fichiers — phase 3 : filtres actifs + raccourcis",
  items: [
    "Puces de filtres actifs affichées sous la barre d'outils (recherche, dossier, favoris, corbeille, tri, dossier courant).",
    "Chaque puce permet de retirer son filtre en un clic.",
    "Champ de recherche avec icône loupe et bouton de reset intégré.",
    "Raccourcis clavier : `Ctrl/Cmd + K` pour focus recherche, `Ctrl/Cmd + U` pour ouvrir Ajouter, `Esc` pour clear/fermer.",
    "Validation : build, lint.",
    "Version affichée : v1.9.86.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.86",
  date: "2026-08-26",
  title: "Files — phase 3: active filters + shortcuts",
  items: [
    "Active filter chips shown below the toolbar (search, folder, favorites, trash, sort, current folder).",
    "Each chip can remove its filter in one click.",
    "Search input with search icon and built-in clear button.",
    "Keyboard shortcuts: `Ctrl/Cmd + K` to focus search, `Ctrl/Cmd + U` to open Add, `Esc` to clear/close.",
    "Validation: build, lint.",
    "Version badge: v1.9.86.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.86",
  date: "2026-08-26",
  title: "Archivos — fase 3: filtros activos + atajos",
  items: [
    "Chips de filtros activos bajo la barra de herramientas (búsqueda, carpeta, favoritos, papelera, orden, carpeta actual).",
    "Cada chip puede quitar su filtro con un clic.",
    "Campo de búsqueda con icono de lupa y botón de limpiar integrado.",
    "Atajos de teclado: `Ctrl/Cmd + K` para enfocar búsqueda, `Ctrl/Cmd + U` para abrir Añadir, `Esc` para limpiar/cerrar.",
    "Validación : build, lint.",
    "Versión : v1.9.86.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.86",
  date: "2026-08-26",
  title: "Dateien — Phase 3: aktive Filter + Shortcuts",
  items: [
    "Aktive Filter-Chips unter der Toolbar (Suche, Ordner, Favoriten, Papierkorb, Sortierung, aktueller Ordner).",
    "Jeder Chip kann seinen Filter mit einem Klick entfernen.",
    "Suchfeld mit Lupen-Icon und integriertem Reset-Button.",
    "Tastaturkürzel: `Strg/Cmd + K` für Suche-Fokus, `Strg/Cmd + U` zum Öffnen von Hinzufügen, `Esc` zum Schließen.",
    "Validierung: build, lint.",
    "Version: v1.9.86.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.85",
  date: "2026-08-26",
  title: "Fichiers — phase 2 : aperçu rapide",
  items: [
    "Nouveau panneau latéral `FilePreview` pour les fichiers (image, métadonnées, actions rapides).",
    "Clic sur un fichier = ouverture de l'aperçu au lieu du téléchargement direct.",
    "Actions dans l'aperçu : télécharger, partager, renommer, déplacer, favori, corbeille/supprimer/restaurer.",
    "Informations détaillées : nom, type, taille, dates, emplacement.",
    "Fermeture avec `Esc` ou clic sur le backdrop.",
    "Validation : build, lint.",
    "Version affichée : v1.9.85.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.85",
  date: "2026-08-26",
  title: "Files — phase 2: quick preview",
  items: [
    "New `FilePreview` side panel for files (image, metadata, quick actions).",
    "Clicking a file now opens the preview instead of direct download.",
    "Actions in the preview: download, share, rename, move, favorite, trash/delete/restore.",
    "Detailed info: name, type, size, dates, location.",
    "Close with Esc or backdrop click.",
    "Validation: build, lint.",
    "Version badge: v1.9.85.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.85",
  date: "2026-08-26",
  title: "Archivos — fase 2: vista rápida",
  items: [
    "Nuevo panel lateral `FilePreview` para archivos (imagen, metadatos, acciones rápidas).",
    "Hacer clic en un archivo abre la vista previa en lugar de descargar directamente.",
    "Acciones en la vista previa: descargar, compartir, renombrar, mover, favorito, papelera/eliminar/restaurar.",
    "Información detallada: nombre, tipo, tamaño, fechas, ubicación.",
    "Cierre con `Esc` o clic en el fondo.",
    "Validación : build, lint.",
    "Versión : v1.9.85.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.85",
  date: "2026-08-26",
  title: "Dateien — Phase 2: Schnellvorschau",
  items: [
    "Neues seitliches `FilePreview`-Panel für Dateien (Bild, Metadaten, Schnellaktionen).",
    "Klick auf eine Datei öffnet die Vorschau statt direkten Downloads.",
    "Aktionen in der Vorschau: herunterladen, teilen, umbenennen, verschieben, favorisieren, löschen/restore.",
    "Detaillierte Infos: Name, Typ, Größe, Datum, Speicherort.",
    "Schließen mit `Esc` oder Backdrop-Klick.",
    "Validierung: build, lint.",
    "Version: v1.9.85.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.84",
  date: "2026-08-26",
  title: "Fichiers — phase 1 : layout + modale Ajouter",
  items: [
    "Nouveau composant `FileAddModal` avec 4 onglets : Téléverser, Lien, Google Drive, Dossier.",
    "L'upload est maintenant intégré dans la modale Ajouter.",
    "Header de la page Fichiers refondu : plus aéré, avec pastille d'état Drive et bouton Ajouter principal.",
    "Bouton Créer un dossier déplacé dans la modale Ajouter.",
    "Quota de stockage utilise désormais la couleur d'accent du thème.",
    "Validation : build, lint.",
    "Version affichée : v1.9.84.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.84",
  date: "2026-08-26",
  title: "Files — phase 1: layout + Add modal",
  items: [
    "New `FileAddModal` component with 4 tabs: Upload, Link, Google Drive, Folder.",
    "Upload is now integrated in the Add modal.",
    "Reworked Files page header: cleaner, with Drive status badge and primary Add button.",
    "Create folder moved to the Add modal.",
    "Storage quota now uses the theme accent color.",
    "Validation: build, lint.",
    "Version badge: v1.9.84.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.84",
  date: "2026-08-26",
  title: "Archivos — fase 1: layout + modal Añadir",
  items: [
    "Nuevo componente `FileAddModal` con 4 pestañas: Subir, Enlace, Google Drive, Carpeta.",
    "La subida ahora está integrada en el modal Añadir.",
    "Cabecera de la página Archivos rediseñada: más limpia, con badge de estado Drive y botón Añadir principal.",
    "Crear carpeta movido al modal Añadir.",
    "La cuota de almacenamiento usa ahora el color de acento del tema.",
    "Validación : build, lint.",
    "Versión : v1.9.84.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.84",
  date: "2026-08-26",
  title: "Dateien — Phase 1: Layout + Hinzufügen-Modal",
  items: [
    "Neue `FileAddModal`-Komponente mit 4 Tabs: Hochladen, Link, Google Drive, Ordner.",
    "Upload jetzt im Hinzufügen-Modal integriert.",
    "Überarbeiteter Dateien-Header: aufgeräumter, mit Drive-Status-Badge und primärem Hinzufügen-Button.",
    "Ordner erstellen in das Hinzufügen-Modal verschoben.",
    "Speicherquote nutzt jetzt die Akzentfarbe des Themes.",
    "Validierung: build, lint.",
    "Version: v1.9.84.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.83",
  date: "2026-08-26",
  title: "Dynamic Island — polish final",
  items: [
    "Ressorts du shell et du contenu plus légers et rapides (spring 0.55s, bounce réduit).",
    "Vue Spotify étendue plus compacte : 380px, gap 4, pochette 72x72, waveform h-3.5.",
    "Waveform plus naturel : 4 couches sinusoïdales, pas de redémarrage au changement de morceau.",
    "Micro-animations sur like, play/pause, précédent/suivant.",
    "Suppression du hover scale excessif sur le shell de l'île.",
    "Validation : build, lint.",
    "Version affichée : v1.9.83.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.83",
  date: "2026-08-26",
  title: "Dynamic Island — final polish",
  items: [
    "Lighter, faster shell and content springs (0.55s, reduced bounce).",
    "More compact expanded Spotify view: 380px, gap 4, 72x72 cover, h-3.5 waveform.",
    "More natural waveform: 4 sinusoid layers, no restart on track change.",
    "Micro-animations on like, play/pause, previous/next.",
    "Removed excessive hover scale on the island shell.",
    "Validation: build, lint.",
    "Version badge: v1.9.83.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.83",
  date: "2026-08-26",
  title: "Dynamic Island — polish final",
  items: [
    "Muelles del shell y contenido más ligeros y rápidos (0.55s, rebote reducido).",
    "Vista Spotify extendida más compacta: 380px, gap 4, portada 72x72, waveform h-3.5.",
    "Waveform más natural: 4 capas sinusoidales, sin reinicio al cambiar de pista.",
    "Micro-animaciones en like, play/pause, anterior/siguiente.",
    "Eliminación del hover scale excesivo en el shell de la isla.",
    "Validación : build, lint.",
    "Versión : v1.9.83.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.83",
  date: "2026-08-26",
  title: "Dynamic Island — finaler Polish",
  items: [
    "Leichtere, schnellere Shell- und Content-Springs (0,55s, reduzierter Bounce).",
    "Kompaktere erweiterte Spotify-Ansicht: 380px, gap 4, 72x72 Cover, h-3.5 Wellenform.",
    "Natürlichere Wellenform: 4 Sinus-Schichten, kein Neustart beim Trackwechsel.",
    "Mikro-Animationen für Like, Play/Pause, Vor/Zurück.",
    "Entfernung des übermäßigen Hover-Scalings auf der Island-Shell.",
    "Validierung: build, lint.",
    "Version: v1.9.83.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.82",
  date: "2026-08-26",
  title: "Home — suppression météo et ajustement cartes Riot",
  items: [
    "Suppression du widget météo en bas de la page Home (WeatherHomeWidget).",
    "Suppression de `weather` des grilles et des priorités par défaut du dashboard.",
    "Les cartes Valorant et LoL ne sont plus en mode `compact` pour correspondre aux autres cartes du LiveBentoGrid.",
    "Suppression de l'affichage de l'erreur globale sur les cartes Riot : elles affichent maintenant l'état hors-ligne/configuration proprement.",
    "Validation : build, lint.",
    "Version affichée : v1.9.82.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.82",
  date: "2026-08-26",
  title: "Home — remove weather and adjust Riot cards",
  items: [
    "Removed the bottom weather widget from the Home page (WeatherHomeWidget).",
    "Removed `weather` from default dashboard grids and priorities.",
    "Valorant and LoL cards are no longer `compact` to match the other LiveBentoGrid cards.",
    "Removed the global error display on Riot cards: they now show a clean offline/configuration state.",
    "Validation: build, lint.",
    "Version badge: v1.9.82.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.82",
  date: "2026-08-26",
  title: "Inicio — eliminar clima y ajustar tarjetas Riot",
  items: [
    "Eliminado el widget del clima inferior de la página de inicio (WeatherHomeWidget).",
    "Eliminado `weather` de las grillas y prioridades por defecto del dashboard.",
    "Las tarjetas Valorant y LoL ya no están en modo `compact` para coincidir con las demás tarjetas de LiveBentoGrid.",
    "Eliminado el error global en las tarjetas Riot: ahora muestran un estado limpio de desconexión/configuración.",
    "Validación : build, lint.",
    "Versión : v1.9.82.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.82",
  date: "2026-08-26",
  title: "Startseite — Wetter entfernen und Riot-Karten anpassen",
  items: [
    "Wetter-Widget unten auf der Startseite entfernt (WeatherHomeWidget).",
    "`weather` aus Standard-Dashboard-Rastern und -Prioritäten entfernt.",
    "Valorant- und LoL-Karten sind nicht mehr `compact`, um den anderen LiveBentoGrid-Karten zu entsprechen.",
    "Globale Fehleranzeige auf Riot-Karten entfernt: sie zeigen jetzt einen sauberen Offline/Konfigurations-Status.",
    "Validierung: build, lint.",
    "Version: v1.9.82.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.81",
  date: "2026-08-26",
  title: "Spotify — correction du bouton like",
  items: [
    "Le Worker envoie maintenant les `ids` en paramètre d'URL pour sauvegarder/supprimer un morceau Spotify (PUT/DELETE /v1/me/tracks).",
    "Correction du like/unlike dans DynamicIsland et DockMedia.",
    "Tests Worker : 156/156 passent.",
    "Validation : build, lint.",
    "Version affichée : v1.9.81.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.81",
  date: "2026-08-26",
  title: "Spotify — like button fix",
  items: [
    "Worker now sends `ids` as query parameters for Spotify save/unsave (PUT/DELETE /v1/me/tracks).",
    "Fixed like/unlike in DynamicIsland and Dock.",
    "Worker tests: 156/156 passing.",
    "Validation: build, lint.",
    "Version badge: v1.9.81.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.81",
  date: "2026-08-26",
  title: "Spotify — arreglo del botón like",
  items: [
    "El Worker ahora envía `ids` como parámetros de URL para guardar/quitar canciones de Spotify (PUT/DELETE /v1/me/tracks).",
    "Corrección de like/unlike en DynamicIsland y Dock.",
    "Tests Worker : 156/156 pasan.",
    "Validación : build, lint.",
    "Versión : v1.9.81.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.81",
  date: "2026-08-26",
  title: "Spotify — Like-Button-Fix",
  items: [
    "Worker sendet `ids` jetzt als URL-Parameter für Spotify save/unsave (PUT/DELETE /v1/me/tracks).",
    "Like/Unlike in DynamicIsland und Dock korrigiert.",
    "Worker-Tests: 156/156 bestanden.",
    "Validierung: build, lint.",
    "Version: v1.9.81.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.80",
  date: "2026-08-26",
  title: "Riot — taille des cartes et niveau 3D",
  items: [
    "Les cartes Valorant et LoL dans le LiveBentoGrid passent à la même taille `col-span-4` que les autres cartes.",
    "Activation du mode `compact` pour un rendu cohérent dans la grille.",
    "Uniformisation du niveau 3D (Tilt `max={6}`) et du glare avec les cellules de Connexions.",
    "Raccourcissement du label LoL pour éviter le tronquage.",
    "Validation : build, lint.",
    "Version affichée : v1.9.80.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.80",
  date: "2026-08-26",
  title: "Riot — card sizing and 3D level",
  items: [
    "Valorant and LoL cards in LiveBentoGrid now use `col-span-4` like the other cards.",
    "Enabled `compact` mode for consistent rendering in the grid.",
    "Unified 3D tilt level (`max={6}`) and glare with the Connections cells.",
    "Shortened LoL label to prevent truncation.",
    "Validation: build, lint.",
    "Version badge: v1.9.80.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.80",
  date: "2026-08-26",
  title: "Riot — tamaño de tarjetas y nivel 3D",
  items: [
    "Las tarjetas Valorant y LoL en LiveBentoGrid ahora usan `col-span-4` como las demás.",
    "Modo `compact` activado para un renderizado coherente.",
    "Nivel de inclinación 3D (`max={6}`) y glare unificados con las celdas de Conexiones.",
    "Etiqueta LoL acortada para evitar truncamiento.",
    "Validación : build, lint.",
    "Versión : v1.9.80.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.80",
  date: "2026-08-26",
  title: "Riot — Kartengröße und 3D-Neigung",
  items: [
    "Valorant- und LoL-Karten im LiveBentoGrid verwenden jetzt `col-span-4` wie die anderen Karten.",
    "`compact`-Modus aktiviert für konsistentes Rendering im Raster.",
    "3D-Neigungsstufe (`max={6}`) und Glare mit den Verbindungszellen vereinheitlicht.",
    "LoL-Label verkürzt, um Abschneiden zu vermeiden.",
    "Validierung: build, lint.",
    "Version: v1.9.80.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.79",
  date: "2026-08-26",
  title: "Activity Hub — insights, export et gestion",
  items: [
    "Section Brain Insights : catégorie en tête, période d'activité, source la plus active, week-end.",
    "Section Activité par catégorie avec barres de progression.",
    "Layout en grille : heatmap/timeline à gauche, insights à droite.",
    "Modal d'export CSV/JSON.",
    "Modal de confirmation d'effacement de l'historique.",
    "Toasts d'export et d'effacement.",
    "Validation : build, lint.",
    "Version affichée : v1.9.79.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.79",
  date: "2026-08-26",
  title: "Activity Hub — insights, export and management",
  items: [
    "Brain Insights section: top category, peak time, most active source, weekend.",
    "Activity by category section with progress bars.",
    "Grid layout: heatmap/timeline on the left, insights on the right.",
    "CSV/JSON export modal.",
    "Clear history confirmation modal.",
    "Export and clear toasts.",
    "Validation: build, lint.",
    "Version badge: v1.9.79.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.79",
  date: "2026-08-26",
  title: "Activity Hub — insights, exportación y gestión",
  items: [
    "Sección Brain Insights: categoría principal, periodo de actividad, fuente más activa, fin de semana.",
    "Sección Actividad por categoría con barras de progreso.",
    "Layout en cuadrícula: heatmap/timeline a la izquierda, insights a la derecha.",
    "Modal de exportación CSV/JSON.",
    "Modal de confirmación para borrar el historial.",
    "Toasts de exportación y borrado.",
    "Validación : build, lint.",
    "Versión : v1.9.79.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.79",
  date: "2026-08-26",
  title: "Activity Hub — Insights, Export und Verwaltung",
  items: [
    "Brain Insights Bereich: Top-Kategorie, Hauptaktivitätszeit, aktivste Quelle, Wochenende.",
    "Aktivität nach Kategorie mit Fortschrittsbalken.",
    "Rasterlayout: Heatmap/Timeline links, Insights rechts.",
    "CSV/JSON Export Modal.",
    "Bestätigungsmodal zum Löschen des Verlaufs.",
    "Toasts für Export und Löschen.",
    "Validierung: build, lint.",
    "Version: v1.9.79.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.78",
  date: "2026-08-26",
  title: "Activity Hub — timeline groupée et recherche",
  items: [
    "Regroupement des événements similaires dans la timeline (fenêtre de 12 minutes).",
    "Expansion d'un groupe au clic.",
    "Raccourci clavier Ctrl+K / ⌘+K pour focus la recherche.",
    "Empty state propre avec titre, description et lien vers le dashboard.",
    "Validation : build, lint.",
    "Version affichée : v1.9.78.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.78",
  date: "2026-08-26",
  title: "Activity Hub — grouped timeline and search",
  items: [
    "Grouped similar events in timeline (12-minute window).",
    "Expand a group on click.",
    "Ctrl+K / ⌘+K keyboard shortcut to focus search.",
    "Clean empty state with title, description, and link to dashboard.",
    "Validation: build, lint.",
    "Version badge: v1.9.78.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.78",
  date: "2026-08-26",
  title: "Activity Hub — timeline agrupada y búsqueda",
  items: [
    "Agrupación de eventos similares en la timeline (ventana de 12 minutos).",
    "Expansión de un grupo al hacer clic.",
    "Atajo de teclado Ctrl+K / ⌘+K para enfocar la búsqueda.",
    "Empty state limpio con título, descripción y enlace al dashboard.",
    "Validación : build, lint.",
    "Versión : v1.9.78.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.78",
  date: "2026-08-26",
  title: "Activity Hub — gruppierte Timeline und Suche",
  items: [
    "Ähnliche Ereignisse in der Timeline gruppieren (12-Minuten-Fenster).",
    "Gruppe per Klick erweitern.",
    "Tastenkürzel Strg+K / ⌘+K zur Fokussierung der Suche.",
    "Sauberer Empty State mit Titel, Beschreibung und Link zum Dashboard.",
    "Validierung: build, lint.",
    "Version: v1.9.78.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.77",
  date: "2026-08-26",
  title: "Activity Hub — heatmap et filtres",
  items: [
    "Filtres de catégorie sous forme de chips (Productivité, Brain, Gaming, Média, etc.).",
    "Sélecteur de période étendu : Aujourd'hui, Hier, 7j, 30j, 3m, 6m, 1an.",
    "La heatmap s'adapte à la période sélectionnée.",
    "Toolbar unifiée : recherche, chips, synchronisation.",
    "Validation : build, lint.",
    "Version affichée : v1.9.77.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.77",
  date: "2026-08-26",
  title: "Activity Hub — heatmap and filters",
  items: [
    "Category filters as chips (Productivity, Brain, Gaming, Media, etc.).",
    "Extended period selector: Today, Yesterday, 7d, 30d, 3m, 6m, 1y.",
    "Heatmap adapts to the selected period.",
    "Unified toolbar: search, chips, sync.",
    "Validation: build, lint.",
    "Version badge: v1.9.77.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.77",
  date: "2026-08-26",
  title: "Activity Hub — heatmap y filtros",
  items: [
    "Filtros de categoría en chips (Productividad, Brain, Gaming, Medios, etc.).",
    "Selector de período extendido : Hoy, Ayer, 7d, 30d, 3m, 6m, 1a.",
    "El heatmap se adapta al período seleccionado.",
    "Barra de herramientas unificada : búsqueda, chips, sincronización.",
    "Validación : build, lint.",
    "Versión : v1.9.77.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.77",
  date: "2026-08-26",
  title: "Activity Hub — Heatmap und Filter",
  items: [
    "Kategoriefilter als Chips (Produktivität, Brain, Gaming, Medien, etc.).",
    "Erweiterte Zeitraumauswahl : Heute, Gestern, 7T, 30T, 3M, 6M, 1J.",
    "Heatmap passt sich an den gewählten Zeitraum an.",
    "Vereinigte Toolbar : Suche, Chips, Synchronisation.",
    "Validierung: build, lint.",
    "Version: v1.9.77.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.76",
  date: "2026-08-26",
  title: "Activity Hub — première passe",
  items: [
    "Retrait de `LiveWidgets` de la page `/activity` pour un vrai Activity Hub.",
    "Nouvel en-tête `Card` pour `ActivityHub` avec icône et indicateur de synchronisation.",
    "5 métriques : Aujourd'hui, Cette semaine, Série active, Moyenne/jour, Sessions.",
    "Validation : build, lint.",
    "Version affichée : v1.9.76.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.76",
  date: "2026-08-26",
  title: "Activity Hub — first pass",
  items: [
    "Removed `LiveWidgets` from `/activity` for a real Activity Hub.",
    "New `Card` header for `ActivityHub` with icon and sync indicator.",
    "5 metrics: Today, This Week, Active streak, Average/day, Sessions.",
    "Validation: build, lint.",
    "Version badge: v1.9.76.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.76",
  date: "2026-08-26",
  title: "Activity Hub — primera pasada",
  items: [
    "Eliminado `LiveWidgets` de la página `/activity` para un Activity Hub real.",
    "Nuevo encabezado `Card` para `ActivityHub` con icono e indicador de sincronización.",
    "5 métricas : Hoy, Esta semana, Racha activa, Media/día, Sesiones.",
    "Validación : build, lint.",
    "Versión : v1.9.76.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.76",
  date: "2026-08-26",
  title: "Activity Hub — erster Schritt",
  items: [
    "`LiveWidgets` von `/activity` entfernt für einen echten Activity Hub.",
    "Neuer `Card`-Header für `ActivityHub` mit Icon und Synchronisierungsindikator.",
    "5 Metriken: Heute, Diese Woche, Aktive Serie, Durchschnitt/Tag, Sitzungen.",
    "Validierung: build, lint.",
    "Version: v1.9.76.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.75",
  date: "2026-08-26",
  title: "Météo — en-tête en carte",
  items: [
    "L'en-tête de la page `/weather` est maintenant présenté comme une carte `Card`.",
    "Titre et sous-titre compactés avec une icône météo.",
    "Boutons de recherche et actualiser conservés à droite.",
    "Validation : build, lint.",
    "Version affichée : v1.9.75.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.75",
  date: "2026-08-26",
  title: "Weather — card-style header",
  items: [
    "The `/weather` page header is now rendered as a `Card`.",
    "Title and subtitle compacted with a weather icon.",
    "Search and refresh buttons kept on the right.",
    "Validation: build, lint.",
    "Version badge: v1.9.75.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.75",
  date: "2026-08-26",
  title: "Tiempo — encabezado tipo tarjeta",
  items: [
    "El encabezado de la página `/weather` ahora se muestra como una `Card`.",
    "Título y subtítulo compactados con un icono del tiempo.",
    "Botones de búsqueda y actualizar conservados a la derecha.",
    "Validación : build, lint.",
    "Versión : v1.9.75.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.75",
  date: "2026-08-26",
  title: "Wetter — Header als Karte",
  items: [
    "Der Header der `/weather`-Seite wird jetzt als `Card` dargestellt.",
    "Titel und Untertitel kompakt mit Wettersymbol.",
    "Such- und Aktualisieren-Buttons bleiben rechts.",
    "Validierung: build, lint.",
    "Version: v1.9.75.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.74",
  date: "2026-08-26",
  title: "Dynamic Island — visualiseur compact",
  items: [
    "`SpotifyCompact` : mini `AudioVisualizer` intégré dans la Dynamic Island compacte.",
    "Le mini visualiseur est animé quand la musique joue et s'arrête en pause.",
    "Validation : build, lint.",
    "Version affichée : v1.9.74.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.74",
  date: "2026-08-26",
  title: "Dynamic Island — compact visualizer",
  items: [
    "`SpotifyCompact`: mini `AudioVisualizer` integrated into the compact Dynamic Island.",
    "The mini visualizer animates while music is playing and pauses when stopped.",
    "Validation: build, lint.",
    "Version badge: v1.9.74.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.74",
  date: "2026-08-26",
  title: "Dynamic Island — visualizador compacto",
  items: [
    "`SpotifyCompact` : mini `AudioVisualizer` integrado en la Dynamic Island compacta.",
    "El mini visualizador se anima cuando suena música y se detiene en pausa.",
    "Validación : build, lint.",
    "Versión : v1.9.74.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.74",
  date: "2026-08-26",
  title: "Dynamic Island — kompakter Visualizer",
  items: [
    "`SpotifyCompact`: Mini `AudioVisualizer` in der kompakten Dynamic Island.",
    "Der Mini-Visualizer bewegt sich beim Abspielen und pausiert bei Stopp.",
    "Validierung: build, lint.",
    "Version: v1.9.74.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.73",
  date: "2026-08-26",
  title: "Sidebar — animations fluides",
  items: [
    "`shared-layout-bg` : retrait du `layoutId` pour un fade/scale léger à la place d'un morphing coûteux.",
    "`shared-layout-bg` : suppression de `layoutRoot` et du wrapper `motion.*` inutile.",
    "`animated-sidebar` : fond d'élément actif en fade sans `layoutId`.",
    "`animated-sidebar` : ressort de la sidebar adouci (moins de rebond).",
    "`will-change-transform` sur le panneau sidebar.",
    "Validation : build, lint.",
    "Version affichée : v1.9.73.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.73",
  date: "2026-08-26",
  title: "Sidebar — smoother animations",
  items: [
    "`shared-layout-bg`: removed `layoutId` in favor of a lightweight fade/scale.",
    "`shared-layout-bg`: removed `layoutRoot` and unnecessary `motion.*` wrapper.",
    "`animated-sidebar`: active item background now fades without `layoutId`.",
    "`animated-sidebar`: softened sidebar spring (less bounce).",
    "`will-change-transform` on the sidebar panel.",
    "Validation: build, lint.",
    "Version badge: v1.9.73.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.73",
  date: "2026-08-26",
  title: "Sidebar — animaciones fluidas",
  items: [
    "`shared-layout-bg` : eliminado `layoutId` en favor de un fade/scale ligero.",
    "`shared-layout-bg` : eliminado `layoutRoot` y el wrapper `motion.*` innecesario.",
    "`animated-sidebar` : fondo del elemento activo en fade sin `layoutId`.",
    "`animated-sidebar` : resorte de la sidebar suavizado (menos rebote).",
    "`will-change-transform` en el panel de la sidebar.",
    "Validación : build, lint.",
    "Versión : v1.9.73.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.73",
  date: "2026-08-26",
  title: "Sidebar — flüssigere Animationen",
  items: [
    "`shared-layout-bg`: `layoutId` entfernt, stattdessen leichter Fade/Scale.",
    "`shared-layout-bg`: `layoutRoot` und unnötiger `motion.*`-Wrapper entfernt.",
    "`animated-sidebar`: Hintergrund des aktiven Elements mit Fade ohne `layoutId`.",
    "`animated-sidebar`: Sidebar-Feder weicher (weniger Rückprall).",
    "`will-change-transform` auf dem Sidebar-Panel.",
    "Validierung: build, lint.",
    "Version: v1.9.73.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.72",
  date: "2026-08-26",
  title: "ETHONE — Rework de la Dynamic Island",
  items: [
    "Refonte de `components/DynamicIslandContainer` : modes compact/expanded plus cohérents.",
    "Shell `ui/DynamicIsland` : rendu OLED noir profond, reflet subtil, glow selon l'accent.",
    "Waveform `AudioVisualizer` : animation organique, mise en pause réelle quand la musique est arrêtée, respect de `prefers-reduced-motion`.",
    "Notifications transitives via `useIslandNotify` et `useIslandQueueStore` (auto-dismiss).",
    "Timer : bouton Arrêter ajouté.",
    "Mini-player : waveform intégré, contrôles, pochette.",
    "Validation : build, lint.",
    "Version affichée : v1.9.72.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.72",
  date: "2026-08-26",
  title: "ETHONE — Dynamic Island Rework",
  items: [
    "Reworked `components/DynamicIslandContainer` for more consistent compact/expanded modes.",
    "`ui/DynamicIsland` shell: deep OLED black, subtle sheen, accent glow.",
    "`AudioVisualizer` waveform: organic animation, real pause when music is stopped, respects `prefers-reduced-motion`.",
    "Transient notifications via `useIslandNotify` and `useIslandQueueStore` (auto-dismiss).",
    "Timer: added Stop button.",
    "Mini-player: integrated waveform, controls, cover art.",
    "Validation: build, lint.",
    "Version badge: v1.9.72.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.72",
  date: "2026-08-26",
  title: "ETHONE — Rework de la Dynamic Island",
  items: [
    "Refactorización de `components/DynamicIslandContainer` para modos compact/expanded más coherentes.",
    "Shell `ui/DynamicIsland` : fondo OLED negro profundo, reflejo sutil, glow del acento.",
    "Waveform `AudioVisualizer` : animación orgánica, pausa real cuando la música se detiene, respeta `prefers-reduced-motion`.",
    "Notificaciones transitorias con `useIslandNotify` y `useIslandQueueStore` (auto-dismiss).",
    "Timer : botón Detener añadido.",
    "Mini-player : waveform integrado, controles, carátula.",
    "Validación : build, lint.",
    "Versión : v1.9.72.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.72",
  date: "2026-08-26",
  title: "ETHONE — Dynamic Island Rework",
  items: [
    "`components/DynamicIslandContainer` überarbeitet für konsistentere kompakte/erweiterte Modi.",
    "`ui/DynamicIsland` Shell: tiefes OLED-Schwarz, subtiler Schein, Akzent-Glow.",
    "`AudioVisualizer` Waveform: organische Animation, echte Pause bei gestoppter Musik, beachtet `prefers-reduced-motion`.",
    "Vorübergehende Benachrichtigungen über `useIslandNotify` und `useIslandQueueStore` (Auto-Dismiss).",
    "Timer: Stop-Taste hinzugefügt.",
    "Mini-Player: integrierte Waveform, Steuerung, Cover.",
    "Validierung: build, lint.",
    "Version: v1.9.72.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.71",
  date: "2026-08-26",
  title: "Dock / Dynamic Island — pochettes musicales",
  items: [
    "Worker Spotify : `safePublicUrl` ne filtre plus les hôtes des images now-playing (pochette d'album / podcast).",
    "Worker Lanyard : `artworkUrl` Spotify non filtré par hôte.",
    "`DockMediaFlyout` et `DynamicIslandContainer` passent `crossOrigin=\"anonymous\"` sur `SafeImage`.",
    "Validation : build, lint, tests Worker, déploiement Worker.",
    "Version affichée en bas à droite : v1.9.71.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.71",
  date: "2026-08-26",
  title: "Dock / Dynamic Island — music covers",
  items: [
    "Spotify Worker: `safePublicUrl` no longer filters now-playing image hosts (album / podcast covers).",
    "Lanyard Worker: Spotify `artworkUrl` no longer filtered by host.",
    "`DockMediaFlyout` and `DynamicIslandContainer` set `crossOrigin=\"anonymous\"` on `SafeImage`.",
    "Validation: build, lint, Worker tests, Worker deploy.",
    "Version badge bottom-right: v1.9.71.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.71",
  date: "2026-08-26",
  title: "Dock / Dynamic Island — carátulas",
  items: [
    "Worker Spotify: `safePublicUrl` ya no filtra los hosts de imágenes now-playing (carátulas de álbum / podcast).",
    "Worker Lanyard: `artworkUrl` de Spotify no filtrado por host.",
    "`DockMediaFlyout` y `DynamicIslandContainer` usan `crossOrigin=\"anonymous\"` en `SafeImage`.",
    "Validación: build, lint, tests Worker, despliegue Worker.",
    "Versión mostrada abajo a la derecha : v1.9.71.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.71",
  date: "2026-08-26",
  title: "Dock / Dynamic Island — Album-Cover",
  items: [
    "Spotify Worker: `safePublicUrl` filtert jetzt nicht mehr die Hosts von now-playing Bildern (Album / Podcast Cover).",
    "Lanyard Worker: Spotify `artworkUrl` nicht mehr nach Host gefiltert.",
    "`DockMediaFlyout` und `DynamicIslandContainer` setzen `crossOrigin=\"anonymous\"` auf `SafeImage`.",
    "Validierung: build, lint, Worker-Tests, Worker-Deploy.",
    "Version unten rechts: v1.9.71.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.70",
  date: "2026-08-26",
  title: "TopBar — température météo déplacée dans les status pills",
  items: [
    "La température météo est désormais une pill `SystemStatusPills` avec espacement et séparateurs.",
    "Évite le chevauchement avec les autres éléments de la topbar.",
    "Suppression du `WeatherQuickButton` du groupe droit.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.70.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.70",
  date: "2026-08-26",
  title: "TopBar — weather temperature moved to status pills",
  items: [
    "Weather temperature is now a `SystemStatusPills` pill with spacing and separators.",
    "Prevents overlap with other topbar items.",
    "Removed `WeatherQuickButton` from the right group.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.70.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.70",
  date: "2026-08-26",
  title: "TopBar — temperatura movida a las status pills",
  items: [
    "La temperatura del clima ahora es una pill de `SystemStatusPills` con espaciado y separadores.",
    "Evita la superposición con otros elementos de la topbar.",
    "Eliminado `WeatherQuickButton` del grupo derecho.",
    "Validación: build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.70.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.70",
  date: "2026-08-26",
  title: "TopBar — Wettertemperatur in Status-Pills verschoben",
  items: [
    "Wettertemperatur ist jetzt eine `SystemStatusPills`-Pill mit Abstand und Trennstrichen.",
    "Verhindert Überlappung mit anderen TopBar-Elementen.",
    "`WeatherQuickButton` aus der rechten Gruppe entfernt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.70.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.69",
  date: "2026-08-26",
  title: "Météo — rework complet de la page",
  items: [
    "Worker météo enrichi : horaires 24h, 7 jours, vent rafales/direction, humidité, pression, UV, visibilité, point de rosée, précipitations, AQI PM2.5/PM10.",
    "Nouvelle route `/api/geocode` pour les suggestions de villes.",
    "Types `WeatherData` mis à jour avec `hourly`, `daily`, `airQualityDetails`.",
    "Refonte complète de `WeatherPage.tsx` : hero, horaires, 7 jours, conditions, vent, AQI, soleil, précipitations, conseil Brain.",
    "Animations Framer Motion discrètes, `prefers-reduced-motion` non requis (composants clients).",
    "Skeleton local, pas de loading global.",
    "Validation : build, lint, tests Worker.",
    "Version affichée en bas à droite : v1.9.69.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.69",
  date: "2026-08-26",
  title: "Weather — full page rework",
  items: [
    "Weather Worker enriched: 24h hourly, 7-day, wind gusts/direction, humidity, pressure, UV, visibility, dew point, precipitation, AQI PM2.5/PM10.",
    "New `/api/geocode` route for city suggestions.",
    "`WeatherData` type updated with `hourly`, `daily`, `airQualityDetails`.",
    "Full `WeatherPage.tsx` redesign: hero, hourly, 7-day, conditions, wind, AQI, sun, precipitation, Brain advice.",
    "Subtle Framer Motion animations.",
    "Local skeleton, no global loading.",
    "Validation: build, lint, Worker tests.",
    "Version badge bottom-right: v1.9.69.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.69",
  date: "2026-08-26",
  title: "Clima — rediseño completo de la página",
  items: [
    "Worker de clima enriquecido: 24h horario, 7 días, ráfagas/dirección del viento, humedad, presión, UV, visibilidad, punto de rocío, precipitación, AQI PM2.5/PM10.",
    "Nueva ruta `/api/geocode` para sugerencias de ciudades.",
    "Tipo `WeatherData` actualizado con `hourly`, `daily`, `airQualityDetails`.",
    "Rediseño completo de `WeatherPage.tsx`: hero, horario, 7 días, condiciones, viento, AQI, sol, precipitaciones, consejo Brain.",
    "Animaciones Framer Motion sutiles.",
    "Skeleton local, sin loading global.",
    "Validación: build, lint, tests Worker.",
    "Versión mostrada abajo a la derecha : v1.9.69.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.69",
  date: "2026-08-26",
  title: "Wetter — kompletter Seiten-Redesign",
  items: [
    "Wetter-Worker erweitert: 24h-Stunden, 7 Tage, Windböen/Richtung, Luftfeuchtigkeit, Druck, UV, Sichtweite, Taupunkt, Niederschlag, AQI PM2.5/PM10.",
    "Neue `/api/geocode`-Route für Städtevorschläge.",
    "`WeatherData`-Typ mit `hourly`, `daily`, `airQualityDetails` aktualisiert.",
    "Kompletter Redesign von `WeatherPage.tsx`: Hero, stündlich, 7 Tage, Bedingungen, Wind, AQI, Sonne, Niederschlag, Brain-Tipp.",
    "Dezente Framer Motion-Animationen.",
    "Lokales Skeleton, kein globales Loading.",
    "Validierung: build, lint, Worker-Tests.",
    "Version unten rechts: v1.9.69.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.68",
  date: "2026-08-26",
  title: "Header Météo — couleurs et composants partagés",
  items: [
    "Header de la page Météo repassé avec `Button` et `IconButton` partagés.",
    "Bouton Rechercher en accent `primary`.",
    "Bouton Géolocalisation en `ghost`.",
    "Séparateur fin sous le header et alignement amélioré.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.68.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.68",
  date: "2026-08-26",
  title: "Weather header — colors and shared components",
  items: [
    "Weather page header updated with shared `Button` and `IconButton`.",
    "Search button uses `primary` accent.",
    "Geolocation button uses `ghost` style.",
    "Slim header border and improved alignment.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.68.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.68",
  date: "2026-08-26",
  title: "Header del tiempo — colores y componentes compartidos",
  items: [
    "Header de la página del tiempo con `Button` e `IconButton` compartidos.",
    "Botón Buscar en acento `primary`.",
    "Botón Geolocalización en estilo `ghost`.",
    "Borde fino bajo el header y mejor alineación.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.68.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.68",
  date: "2026-08-26",
  title: "Wetter-Header — Farben und geteilte Komponenten",
  items: [
    "Wetterseiten-Header mit geteilten `Button` und `IconButton` aktualisiert.",
    "Such-Button mit `primary`-Akzent.",
    "Geolokalisierungs-Button im `ghost`-Stil.",
    "Feine Header-Linie und bessere Ausrichtung.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.68.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.67",
  date: "2026-08-26",
  title: "Dynamic Island — réveil depuis IDLE",
  items: [
    "La Dynamic Island repasse automatiquement en COMPACT quand une activité redevient active après un état IDLE.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.67.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.67",
  date: "2026-08-26",
  title: "Dynamic Island — wake-up from IDLE",
  items: [
    "Dynamic Island now auto-switches back to COMPACT when an activity becomes active again after IDLE.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.67.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.67",
  date: "2026-08-26",
  title: "Dynamic Island — reactivación desde IDLE",
  items: [
    "La Dynamic Island vuelve automáticamente a COMPACT cuando una actividad se reactiva tras estar en IDLE.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.67.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.67",
  date: "2026-08-26",
  title: "Dynamic Island — Aufwachen aus IDLE",
  items: [
    "Die Dynamic Island schaltet automatisch zurück auf COMPACT, wenn eine Aktivität nach IDLE wieder aktiv wird.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.67.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.66",
  date: "2026-08-26",
  title: "Correction — fichiers manquants dans les commits v1.9.55 à v1.9.65",
  items: [
    "Les nouveaux fichiers créés localement (AudioVisualizer, Card, WeatherHomeWidget, useDynamicIslandQueue, dynamic-island-queue) n'avaient pas été poussés dans Git.",
    "Ajout de ces fichiers pour que le build Cloudflare Pages fonctionne.",
    "Build Cloudflare : correction du déploiement.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.66.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.66",
  date: "2026-08-26",
  title: "Fix — missing files in commits v1.9.55 to v1.9.65",
  items: [
    "New files created locally (AudioVisualizer, Card, WeatherHomeWidget, useDynamicIslandQueue, dynamic-island-queue) were not committed to Git.",
    "Added these files so Cloudflare Pages build succeeds.",
    "Cloudflare build: deployment fixed.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.66.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.66",
  date: "2026-08-26",
  title: "Corrección — archivos faltantes en commits v1.9.55 a v1.9.65",
  items: [
    "Archivos nuevos creados localmente (AudioVisualizer, Card, WeatherHomeWidget, useDynamicIslandQueue, dynamic-island-queue) no se habían commiteado en Git.",
    "Se agregan para que el build de Cloudflare Pages funcione.",
    "Build de Cloudflare: despliegue corregido.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.66.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.66",
  date: "2026-08-26",
  title: "Fix — fehlende Dateien in Commits v1.9.55 bis v1.9.65",
  items: [
    "Neue lokal erstellte Dateien (AudioVisualizer, Card, WeatherHomeWidget, useDynamicIslandQueue, dynamic-island-queue) wurden nicht in Git commited.",
    "Diese Dateien wurden hinzugefügt, damit der Cloudflare Pages Build funktioniert.",
    "Cloudflare Build: Deployment repariert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.66.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.65",
  date: "2026-08-26",
  title: "Météo Home — état vide, pluie, ville partagée",
  items: [
    "Ajout de `precipitationProbability` et `precipitation` au type `WeatherData`.",
    "Affichage du % de pluie dans `WeatherHomeWidget`.",
    "État vide avec 'Configurer la ville' si `liveWeatherCity` n'est pas définie.",
    "État 'Données météo indisponibles' si une ville est définie mais les données manquent.",
    "La page `/weather` met à jour `settings.liveWeatherCity`, donc le widget Home reflète la ville recherchée grâce au cache partagé.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.65.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.65",
  date: "2026-08-26",
  title: "Home weather — empty state, rain, shared city",
  items: [
    "Added `precipitationProbability` and `precipitation` to `WeatherData`.",
    "Rain percentage shown in `WeatherHomeWidget`.",
    "Empty state with 'Configure city' when `liveWeatherCity` is not set.",
    "'Weather data unavailable' state when a city is set but data is missing.",
    "`/weather` page updates `settings.liveWeatherCity`, so the Home widget reflects the searched city via shared cache.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.65.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.65",
  date: "2026-08-26",
  title: "Home clima — estado vacío, lluvia, ciudad compartida",
  items: [
    "Añadidos `precipitationProbability` y `precipitation` a `WeatherData`.",
    "Porcentaje de lluvia mostrado en `WeatherHomeWidget`.",
    "Estado vacío con 'Configurar ciudad' si `liveWeatherCity` no está definida.",
    "Estado 'Datos del tiempo no disponibles' si hay ciudad pero faltan datos.",
    "La página `/weather` actualiza `settings.liveWeatherCity`, así el widget Home refleja la ciudad buscada vía caché compartida.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.65.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.65",
  date: "2026-08-26",
  title: "Home-Wetter — Leerzustand, Regen, geteilte Stadt",
  items: [
    "`precipitationProbability` und `precipitation` zu `WeatherData` hinzugefügt.",
    "Regenprozent in `WeatherHomeWidget` angezeigt.",
    "Leerzustand mit 'Stadt konfigurieren' wenn `liveWeatherCity` nicht gesetzt.",
    "'Wetterdaten nicht verfügbar' wenn Stadt gesetzt, aber Daten fehlen.",
    "`/weather` aktualisiert `settings.liveWeatherCity`, damit das Home-Widget die gesuchte Stadt über geteilten Cache widerspiegelt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.65.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.64",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 7 : intégration du store",
  items: [
    "`DynamicIslandContainer` branché sur `useIslandQueueStore` via `useDynamicIslandQueue`.",
    "Les événements sont enregistrés/désenregistrés selon les activités en cours.",
    "La priorité et le `selectedView` sont désormais dérivés de la file centralisée.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.64.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.64",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 7: store integration",
  items: [
    "`DynamicIslandContainer` now uses `useIslandQueueStore` through `useDynamicIslandQueue`.",
    "Events are registered/unregistered based on current activities.",
    "Priority and `selectedView` are now derived from the centralized queue.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.64.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.64",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 7: integración del store",
  items: [
    "`DynamicIslandContainer` conectado a `useIslandQueueStore` vía `useDynamicIslandQueue`.",
    "Los eventos se registran/desregistran según las actividades en curso.",
    "La prioridad y el `selectedView` se derivan ahora de la cola centralizada.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.64.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.64",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 7: Store-Integration",
  items: [
    "`DynamicIslandContainer` ist jetzt über `useDynamicIslandQueue` an `useIslandQueueStore` angebunden.",
    "Events werden basierend auf aktuellen Aktivitäten registriert/deregistriert.",
    "Priorität und `selectedView` leiten sich jetzt aus der zentralen Warteschlange ab.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.64.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.63",
  date: "2026-08-26",
  title: "Widget météo compact pour le Home",
  items: [
    "Nouveau `WeatherHomeWidget` affichant température, condition, ville, min/max, UV.",
    "Design compact cohérent avec les autres widgets du Home via le composant `Card`.",
    "Petite animation d'icône subtile.",
    "Clic ouvrant la page Météo complète.",
    "Page Météo et `useLiveData` partagent le cache via `fetchWorkerCached`.",
    "Skeleton local sans loading global.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.63.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.63",
  date: "2026-08-26",
  title: "Compact weather widget for Home",
  items: [
    "New `WeatherHomeWidget` showing temperature, condition, city, min/max, UV.",
    "Compact design consistent with other Home widgets using the `Card` component.",
    "Subtle icon animation.",
    "Click opens the full Weather page.",
    "Weather page and `useLiveData` share cache via `fetchWorkerCached`.",
    "Local skeleton, no global loading.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.63.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.63",
  date: "2026-08-26",
  title: "Widget de clima compacto para el Home",
  items: [
    "Nuevo `WeatherHomeWidget` con temperatura, condición, ciudad, mín/máx, UV.",
    "Diseño compacto coherente con los otros widgets del Home mediante `Card`.",
    "Animación de icono sutil.",
    "Clic abre la página del tiempo completa.",
    "Página del tiempo y `useLiveData` comparten caché vía `fetchWorkerCached`.",
    "Skeleton local sin loading global.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.63.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.63",
  date: "2026-08-26",
  title: "Kompaktes Wetter-Widget für Home",
  items: [
    "Neues `WeatherHomeWidget` mit Temperatur, Zustand, Stadt, Min/Max, UV.",
    "Kompaktes Design konsistent mit anderen Home-Widgets dank `Card`.",
    "Subtile Icon-Animation.",
    "Klick öffnet die vollständige Wetterseite.",
    "Wetterseite und `useLiveData` teilen den Cache über `fetchWorkerCached`.",
    "Lokales Skeleton, kein globales Loading.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.63.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.62",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 6 : file d'événements",
  items: [
    "Nouveau store `useIslandQueueStore` pour la file de la Dynamic Island.",
    "Types d'événements : spotify, pomodoro, brain, sync, upload, notification, timer, call, system.",
    "Priorités fixes par type avec override possible (`priority`).",
    "Hook `useDynamicIslandQueue` expose queue, top, activeViews, register, unregister, clear.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.62.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.62",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 6: event queue",
  items: [
    "New `useIslandQueueStore` for the Dynamic Island queue.",
    "Event types: spotify, pomodoro, brain, sync, upload, notification, timer, call, system.",
    "Fixed per-type priority with optional override (`priority`).",
    "`useDynamicIslandQueue` hook exposes queue, top, activeViews, register, unregister, clear.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.62.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.62",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 6: cola de eventos",
  items: [
    "Nuevo store `useIslandQueueStore` para la cola de la Dynamic Island.",
    "Tipos de eventos: spotify, pomodoro, brain, sync, upload, notification, timer, call, system.",
    "Prioridades fijas por tipo con override opcional (`priority`).",
    "Hook `useDynamicIslandQueue` expone queue, top, activeViews, register, unregister, clear.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.62.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.62",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 6: Event-Warteschlange",
  items: [
    "Neuer `useIslandQueueStore` für die Dynamic-Island-Warteschlange.",
    "Event-Typen: spotify, pomodoro, brain, sync, upload, notification, timer, call, system.",
    "Feste Prioritäten pro Typ mit optionalem Override (`priority`).",
    "Hook `useDynamicIslandQueue` gibt queue, top, activeViews, register, unregister, clear zurück.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.62.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.61",
  date: "2026-08-26",
  title: "UI polish — étape 5 : toasts",
  items: [
    "Amélioration du `Toaster` : expansion automatique, max 4 toasts visibles, offset aéré.",
    "Position conservée : bottom-center mobile, bottom-right desktop.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.61.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.61",
  date: "2026-08-26",
  title: "UI polish — step 5: toasts",
  items: [
    "Improved `Toaster` : auto expand, max 4 visible toasts, airy offset.",
    "Position kept: bottom-center on mobile, bottom-right on desktop.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.61.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.61",
  date: "2026-08-26",
  title: "UI polish — paso 5: toasts",
  items: [
    "Mejora del `Toaster` : expansión automática, máximo 4 toasts visibles, offset espacioso.",
    "Posición conservada: bottom-center en móvil, bottom-right en desktop.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.61.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.61",
  date: "2026-08-26",
  title: "UI polish — Schritt 5: Toasts",
  items: [
    "`Toaster` verbessert: automatisches Expandieren, max. 4 sichtbare Toasts, luftiger Offset.",
    "Position beibehalten: bottom-center auf Mobil, bottom-right auf Desktop.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.61.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.60",
  date: "2026-08-26",
  title: "UI polish — étape 4 : système de cards",
  items: [
    "Nouveau composant `Card` avec variants : default, primary, secondary, interactive, widget, status.",
    "Radius, padding, border, background, ombre et hover unifiés.",
    "Export ajouté dans `components/ui/index.ts`.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.60.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.60",
  date: "2026-08-26",
  title: "UI polish — step 4: card system",
  items: [
    "New `Card` component with variants: default, primary, secondary, interactive, widget, status.",
    "Unified radius, padding, border, background, shadow and hover.",
    "Added export in `components/ui/index.ts`.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.60.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.60",
  date: "2026-08-26",
  title: "UI polish — paso 4: sistema de cards",
  items: [
    "Nuevo componente `Card` con variantes: default, primary, secondary, interactive, widget, status.",
    "Radio, padding, borde, fondo, sombra y hover unificados.",
    "Export añadido en `components/ui/index.ts`.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.60.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.60",
  date: "2026-08-26",
  title: "UI polish — Schritt 4: Card-System",
  items: [
    "Neue `Card`-Komponente mit Varianten: default, primary, secondary, interactive, widget, status.",
    "Vereinheitlichter Radius, Padding, Border, Hintergrund, Schatten und Hover.",
    "Export in `components/ui/index.ts` hinzugefügt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.60.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.59",
  date: "2026-08-26",
  title: "UI polish — étape 3 : boutons",
  items: [
    "Ajout de l'état `active:scale-[0.97] active:brightness-95` sur le composant `Button`.",
    "Variant `success` repassé en `text-[var(--success)]` pour la cohérence.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.59.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.59",
  date: "2026-08-26",
  title: "UI polish — step 3: buttons",
  items: [
    "Added `active:scale-[0.97] active:brightness-95` state to the `Button` component.",
    "`success` variant now uses `text-[var(--success)]` for consistency.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.59.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.59",
  date: "2026-08-26",
  title: "UI polish — paso 3: botones",
  items: [
    "Añadido estado `active:scale-[0.97] active:brightness-95` al componente `Button`.",
    "Variante `success` vuelve a `text-[var(--success)]` para coherencia.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.59.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.59",
  date: "2026-08-26",
  title: "UI polish — Schritt 3: Buttons",
  items: [
    "`active:scale-[0.97] active:brightness-95` zum `Button`-Komponente hinzugefügt.",
    "`success`-Variante auf `text-[var(--success)]` zurückgesetzt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.59.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.58",
  date: "2026-08-26",
  title: "UI polish — étape 2 : badges unifiés",
  items: [
    "`ConnectionBadge` devient un wrapper autour du composant `Badge` unifié.",
    "Toutes les variantes de connexion utilisent maintenant le même design system de badges.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.58.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.58",
  date: "2026-08-26",
  title: "UI polish — step 2: unified badges",
  items: [
    "`ConnectionBadge` is now a wrapper around the unified `Badge` component.",
    "All connection variants now use the same badge design system.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.58.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.58",
  date: "2026-08-26",
  title: "UI polish — paso 2: badges unificados",
  items: [
    "`ConnectionBadge` ahora es un wrapper del componente `Badge` unificado.",
    "Todas las variantes de conexión usan el mismo sistema de badges.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.58.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.58",
  date: "2026-08-26",
  title: "UI polish — Schritt 2: vereinheitlichte Badges",
  items: [
    "`ConnectionBadge` ist jetzt ein Wrapper um die vereinheitlichte `Badge`-Komponente.",
    "Alle Verbindungsvarianten nutzen jetzt das gleiche Badge-Designsystem.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.58.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.57",
  date: "2026-08-26",
  title: "UI polish — étape 1 : système de badges",
  items: [
    "Extension du composant `Badge` avec les variants : online, offline, new, synced, connected, beta, pro, brain.",
    "Les couleurs restent basées sur les variables du thème (success, info, warning, danger, accent).",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.57.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.57",
  date: "2026-08-26",
  title: "UI polish — step 1: badge system",
  items: [
    "Extended `Badge` component with variants: online, offline, new, synced, connected, beta, pro, brain.",
    "Colors remain based on theme variables (success, info, warning, danger, accent).",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.57.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.57",
  date: "2026-08-26",
  title: "UI polish — paso 1: sistema de badges",
  items: [
    "Componente `Badge` extendido con variantes: online, offline, new, synced, connected, beta, pro, brain.",
    "Los colores siguen basados en las variables del tema (success, info, warning, danger, accent).",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.57.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.57",
  date: "2026-08-26",
  title: "UI polish — Schritt 1: Badge-System",
  items: [
    "`Badge`-Komponente erweitert mit Varianten: online, offline, new, synced, connected, beta, pro, brain.",
    "Farben bleiben auf Theme-Variablen (success, info, warning, danger, accent) basiert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.57.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.56",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 4 : transitions musicales",
  items: [
    "Le visualiseur audio n'est plus recréé quand le morceau change.",
    "Pochette + titres/artiste/album entourent un `AnimatePresence` avec crossfade slide sur changement de piste.",
    "`AudioVisualizer` garde son état interne et ses phases initiales même si le `seed` change.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.56.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.56",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 4: music transitions",
  items: [
    "Audio visualizer is no longer recreated when the track changes.",
    "Cover + title/artist/album wrapped in `AnimatePresence` with crossfade slide on track change.",
    "`AudioVisualizer` keeps its internal state and initial phases even if `seed` changes.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.56.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.56",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 4: transiciones musicales",
  items: [
    "El visualizador de audio ya no se recrea cuando cambia la canción.",
    "Portada + título/artista/álbum envueltos en `AnimatePresence` con crossfade slide al cambiar de pista.",
    "`AudioVisualizer` mantiene su estado interno y fases iniciales incluso si `seed` cambia.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.56.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.56",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 4: Musiktransitionen",
  items: [
    "Audio-Visualizer wird bei Liedwechsel nicht mehr neu erstellt.",
    "Cover + Titel/Künstler/Album in `AnimatePresence` mit Crossfade-Slide beim Liedwechsel.",
    "`AudioVisualizer` behält seinen internen Zustand und Initialphasen auch wenn `seed` sich ändert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.56.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.55",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 3 : visualiseur audio",
  items: [
    "Ajout du composant `AudioVisualizer` déterministe et subtil (14 barres, animation générée).",
    "Intégration dans le mini-player Spotify expanded.",
    "Respect de `prefers-reduced-motion` : pas d'animation si l'utilisateur l'a désactivée.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.55.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.55",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 3: audio visualizer",
  items: [
    "Added deterministic and subtle `AudioVisualizer` component (14 bars, generated animation).",
    "Integrated into the Spotify expanded mini-player.",
    "Respects `prefers-reduced-motion`.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.55.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.55",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 3: visualizador de audio",
  items: [
    "Añadido componente `AudioVisualizer` determinista y sutil (14 barras, animación generada).",
    "Integrado en el mini reproductor Spotify expandido.",
    "Respeta `prefers-reduced-motion`.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.55.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.55",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 3: Audio-Visualizer",
  items: [
    "Deterministische, dezente `AudioVisualizer`-Komponente hinzugefügt (14 Balken, generierte Animation).",
    "In den Spotify-Expanded Mini-Player integriert.",
    "Berücksichtigt `prefers-reduced-motion`.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.55.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.54",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 2 : mini-player Spotify premium",
  items: [
    "Expanded Spotify retravaillé : pochette 80×80 `rounded-2xl`, textes mieux espacés.",
    "Contrôles équilibrés : previous / play / next en 36×36, play avec accent seul.",
    "Suppression du `motion.div` sur le cœur pour éviter un remount à chaque render.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.54.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.54",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 2: premium Spotify mini-player",
  items: [
    "Reworked Spotify expanded view: 80×80 `rounded-2xl` cover, better text spacing.",
    "Balanced controls: previous / play / next at 36×36, only play is accented.",
    "Removed `motion.div` on the heart to avoid remount on each render.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.54.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.54",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 2: mini reproductor Spotify premium",
  items: [
    "Vista expandida de Spotify rediseñada: portada 80×80 `rounded-2xl`, textos mejor espaciados.",
    "Controles equilibrados: previous / play / next en 36×36, solo play con acento.",
    "Eliminado el `motion.div` del corazón para evitar remount en cada render.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.54.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.54",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 2: Premium Spotify Mini-Player",
  items: [
    "Spotify-Expanded überarbeitet: 80×80 `rounded-2xl` Cover, besserer Textabstand.",
    "Ausgewogene Steuerung: previous / play / next 36×36, nur play mit Akzent.",
    "`motion.div` beim Herz entfernt, um Remount bei jedem Render zu vermeiden.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.54.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.53",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — étape 1 : compact et ouverture contrôlée",
  items: [
    "Suppression de l'ouverture automatique au survol de la Dynamic Island.",
    "La Dynamic Island ne s'ouvre maintenant que sur clic / focus / interaction explicite.",
    "Compact Spotify retravaillé : pillule fine 38 px, seulement icône + titre.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.53.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.53",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — step 1: compact and controlled open",
  items: [
    "Removed hover auto-open on the Dynamic Island.",
    "The Dynamic Island now only opens on click / focus / explicit interaction.",
    "Spotify compact reworked: 38 px thin pill, icon + title only.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.53.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.53",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — paso 1: compacta y apertura controlada",
  items: [
    "Eliminada la apertura automática al pasar el ratón sobre la Dynamic Island.",
    "La Dynamic Island ahora solo se abre con clic / focus / interacción explícita.",
    "Spotify compacto rediseñado: píldora fina de 38 px, solo icono + título.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.53.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.53",
  date: "2026-08-26",
  title: "Dynamic Island 2.0 — Schritt 1: kompakt und kontrolliertes Öffnen",
  items: [
    "Automatisches Öffnen beim Hover der Dynamic Island entfernt.",
    "Dynamic Island öffnet sich jetzt nur per Klick / Fokus / expliziter Interaktion.",
    "Spotify-Kompakt überarbeitet: 38 px feine Pille, nur Icon + Titel.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.53.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.52",
  date: "2026-08-26",
  title: "Spotify — ralentissement du polling pour éviter le rate limit",
  items: [
    "`useNowPlaying` dans la Dynamic Island repassé à 2000 ms pour respecter la limite de 60 requêtes/minute du worker.",
    "Corrigé les erreurs `RATE_LIMITED` (429) observées dans Network.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.52.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.52",
  date: "2026-08-26",
  title: "Spotify — slower polling to avoid rate limit",
  items: [
    "`useNowPlaying` in the Dynamic Island set back to 2000 ms to respect the worker's 60 requests/minute limit.",
    "Fixed `RATE_LIMITED` (429) errors observed in Network.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.52.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.52",
  date: "2026-08-26",
  title: "Spotify — polling más lento para evitar rate limit",
  items: [
    "`useNowPlaying` en la Dynamic Island vuelto a 2000 ms para respetar el límite de 60 peticiones/minuto del worker.",
    "Corregidos los errores `RATE_LIMITED` (429) observados en Network.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.52.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.52",
  date: "2026-08-26",
  title: "Spotify — langsameres Polling gegen Rate-Limit",
  items: [
    "`useNowPlaying` im Dynamic Island auf 2000 ms zurückgesetzt, um das Worker-Limit von 60 Anfragen/Minute einzuhalten.",
    "`RATE_LIMITED`-Fehler (429) im Network behoben.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.52.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.51",
  date: "2026-08-26",
  title: "Dynamic Island — Spotify prioritaire sur la synchro",
  items: [
    "Priorité `spotify` (2) remontée au-dessus de `sync` (1) : la pilule affiche Spotify dès qu'un morceau est actif, même si la synchro est en cours.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.51.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.51",
  date: "2026-08-26",
  title: "Dynamic Island — Spotify prioritized over sync",
  items: [
    "Raised `spotify` priority (2) above `sync` (1): the pill shows Spotify as soon as a track is active, even while sync is running.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.51.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.51",
  date: "2026-08-26",
  title: "Dynamic Island — Spotify priorizado sobre sync",
  items: [
    "Prioridad `spotify` (2) subida por encima de `sync` (1): la píldora muestra Spotify en cuanto hay una canción activa, incluso si la sincronización está en curso.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.51.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.51",
  date: "2026-08-26",
  title: "Dynamic Island — Spotify vor Sync priorisiert",
  items: [
    "Priorität `spotify` (2) über `sync` (1) gesetzt: die Pille zeigt Spotify, sobald ein Track aktiv ist, auch während der Synchronisation läuft.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.51.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.50",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — bouton play + pochettes",
  items: [
    "Suppression de `npLoading` sur les boutons play/précédent/suivant pour arrêter le clignotement à chaque refetch.",
    "`timeoutMs` des `SafeImage` Spotify passé à 8000 ms pour laisser plus de temps aux pochettes.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.50.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.50",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — play button + covers",
  items: [
    "Removed `npLoading` from play/previous/next buttons to stop flicker on each refetch.",
    "Spotify `SafeImage` `timeoutMs` raised to 8000 ms to give covers more time to load.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.50.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.50",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — botón play + portadas",
  items: [
    "Eliminado `npLoading` de los botones play/anterior/siguiente para evitar parpadeo en cada refetch.",
    "`timeoutMs` de `SafeImage` Spotify subido a 8000 ms para dar más tiempo a las portadas.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.50.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.50",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — Play-Button + Cover",
  items: [
    "`npLoading` von Play/Vor/Zurück-Buttons entfernt, um Flackern bei jedem Refetch zu stoppen.",
    "Spotify `SafeImage` `timeoutMs` auf 8000 ms erhöht, damit Cover mehr Zeit zum Laden haben.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.50.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.49",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — taille augmentée",
  items: [
    "Hauteur augmentée à 64 px, largeur maximum à 95 vw / 440 px.",
    "Pochette 40×40 arrondie (`rounded-xl`) et badge horaire plus grand.",
    "Titres et artistes en `text-xs`/`text-[11px]` pour remplir l'espace.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.49.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.49",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — larger size",
  items: [
    "Height raised to 64 px, max width to 95 vw / 440 px.",
    "40×40 rounded cover (`rounded-xl`) and larger time badge.",
    "Title and artist in `text-xs`/`text-[11px]` to fill the space.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.49.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.49",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — tamaño aumentado",
  items: [
    "Altura aumentada a 64 px, ancho máximo a 95 vw / 440 px.",
    "Portada 40×40 redondeada (`rounded-xl`) y badge de hora más grande.",
    "Título y artista en `text-xs`/`text-[11px]` para llenar el espacio.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.49.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.49",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — vergrößert",
  items: [
    "Höhe auf 64 px, max. Breite auf 95 vw / 440 px erhöht.",
    "40×40 abgerundetes Cover (`rounded-xl`) und größerer Zeit-Badge.",
    "Titel und Künstler in `text-xs`/`text-[11px]` für bessere Raumnutzung.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.49.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.48",
  date: "2026-08-26",
  title: "TopBar — info système de retour",
  items: [
    "Restauration de `SystemStatusPills` (workspace, sync, horloge) au centre de la `TopBar`.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.48.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.48",
  date: "2026-08-26",
  title: "TopBar — restored system info",
  items: [
    "Restored `SystemStatusPills` (workspace, sync, clock) in the center of the `TopBar`.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.48.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.48",
  date: "2026-08-26",
  title: "TopBar — información del sistema restaurada",
  items: [
    "Restaurado `SystemStatusPills` (workspace, sync, reloj) en el centro de la `TopBar`.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.48.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.48",
  date: "2026-08-26",
  title: "TopBar — Systeminfo zurückgeholt",
  items: [
    "`SystemStatusPills` (Workspace, Sync, Uhr) wieder in die Mitte der `TopBar` eingefügt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.48.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.47",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — ajustements compact",
  items: [
    "Icône/pochette revenue à un format carré 36×36 arrondi (`rounded-lg`), intégré dans la pilule sans découpe gauche.",
    "Texte (titre + artiste) centré, artiste en `text-primary`/85 pour meilleur contraste.",
    "Badge horaire `h-8` avec `px-2.5 py-1.5` pour un meilleur centrage.",
    "Suppression des padding parasites à droite.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.47.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.47",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — compact tweaks",
  items: [
    "Cover/icon back to a 36×36 rounded square (`rounded-lg`), integrated inside the pill with no left cut.",
    "Title and artist centered, artist in `text-primary`/85 for better contrast.",
    "Time badge `h-8` with `px-2.5 py-1.5` for better centering.",
    "Removed stray right padding.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.47.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.47",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — ajustes compactos",
  items: [
    "Portada/icono de vuelta a un cuadrado 36×36 redondeado (`rounded-lg`), integrado en la píldora sin corte izquierdo.",
    "Título y artista centrados, artista en `text-primary`/85 para mejor contraste.",
    "Badge de hora `h-8` con `px-2.5 py-1.5` para mejor centrado.",
    "Eliminado padding sobrante a la derecha.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.47.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.47",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — Kompaktanpassungen",
  items: [
    "Cover/Icon zurück auf 36×36 abgerundetes Quadrat (`rounded-lg`), in die Pille integriert ohne linken Ausschnitt.",
    "Titel und Künstler zentriert, Künstler in `text-primary`/85 für besseren Kontrast.",
    "Zeit-Badge `h-8` mit `px-2.5 py-1.5` für bessere Zentrierung.",
    "Überflüssiges rechtes Padding entfernt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.47.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.46",
  date: "2026-08-26",
  title: "Pochettes d'album — correction chargement",
  items: [
    "`ClientImage` / `SafeImage` : `crossOrigin` devient optionnel et désactivé par défaut.",
    "Cela corrige les pochettes Spotify/i.scdn.co qui ne s'affichaient pas à cause du CORS imposé.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.46.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.46",
  date: "2026-08-26",
  title: "Album covers — loading fix",
  items: [
    "`ClientImage` / `SafeImage` : `crossOrigin` is now optional and off by default.",
    "This fixes Spotify/i.scdn.co covers that did not display due to forced CORS.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.46.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.46",
  date: "2026-08-26",
  title: "Portadas de álbum — corrección de carga",
  items: [
    "`ClientImage` / `SafeImage` : `crossOrigin` es ahora opcional y desactivado por defecto.",
    "Esto corrige las portadas de Spotify/i.scdn.co que no se mostraban por CORS forzado.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.46.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.46",
  date: "2026-08-26",
  title: "Album-Cover — Ladekorrektur",
  items: [
    "`ClientImage` / `SafeImage` : `crossOrigin` ist jetzt optional und standardmäßig deaktiviert.",
    "Damit werden Spotify/i.scdn.co-Cover angezeigt, die zuvor wegen erzwungenem CORS nicht geladen wurden.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.46.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.45",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — design compact refondu",
  items: [
    "Pochette album à gauche intégrée dans le capuchon de la pilule (`h-14 w-14 rounded-l-[32px]`) sans débordement.",
    "Suppression du ring/shadow interne de l'icône, plus de double bordure.",
    "Texte (titre + artiste) centré, plus lisible, artiste en `text-primary`/75.",
    "Badge horaire `h-7` centré et marges régulières.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.45.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.45",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — compact design refactored",
  items: [
    "Album cover on the left integrated into the pill cap (`h-14 w-14 rounded-l-[32px]`) without overflow.",
    "Removed inner icon ring/shadow, no more double border.",
    "Centered text (title + artist), more readable, artist in `text-primary`/75.",
    "Time badge `h-7`, centered, regular margins.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.45.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.45",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — diseño compacto refactorizado",
  items: [
    "Portada del álbum a la izquierda integrada en el capuchón de la píldora (`h-14 w-14 rounded-l-[32px]`) sin desbordamiento.",
    "Eliminado el ring/sombra interno del icono, sin doble borde.",
    "Texto (título + artista) centrado, más legible, artista en `text-primary`/75.",
    "Badge de hora `h-7`, centrado, márgenes regulares.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.45.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.45",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — kompaktes Design überarbeitet",
  items: [
    "Album-Cover links in die Pillenkappe integriert (`h-14 w-14 rounded-l-[32px]`) ohne Überlappung.",
    "Innerer Icon-Ring/Schatten entfernt, kein doppelter Rand mehr.",
    "Text (Titel + Künstler) zentriert, besser lesbar, Künstler in `text-primary`/75.",
    "Zeit-Badge `h-7`, zentriert, regelmäßige Abstände.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.45.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.44",
  date: "2026-08-26",
  title: "Dynamic Island — label Spotify dupliqué retiré",
  items: [
    "Suppression du label `Spotify` en double dans l'en-tête étendu de la Dynamic Island.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.44.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.44",
  date: "2026-08-26",
  title: "Dynamic Island — removed duplicate Spotify label",
  items: [
    "Removed the duplicated `Spotify` label in the expanded Dynamic Island header.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.44.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.44",
  date: "2026-08-26",
  title: "Dynamic Island — etiqueta Spotify duplicada eliminada",
  items: [
    "Eliminada la etiqueta duplicada `Spotify` en el encabezado expandido de la Dynamic Island.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.44.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.44",
  date: "2026-08-26",
  title: "Dynamic Island — doppeltes Spotify-Label entfernt",
  items: [
    "Doppeltes `Spotify`-Label im erweiterten Dynamic-Island-Header entfernt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.44.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.43",
  date: "2026-08-26",
  title: "Flyouts Dock — correction position initiale",
  items: [
    "`DockMediaFlyout` : la position est calculée au moment du survol, plus de pop à gauche avant placement correct.",
    "`WeatherDetailPopover` : reste `hidden` tant que `useFloating` n'a pas finalisé le placement.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.43.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.43",
  date: "2026-08-26",
  title: "Dock flyouts — initial position fix",
  items: [
    "`DockMediaFlyout` : position is computed on hover, no more left pop before correct placement.",
    "`WeatherDetailPopover` : stays `hidden` until `useFloating` has finalized placement.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.43.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.43",
  date: "2026-08-26",
  title: "Dock flyouts — corrección posición inicial",
  items: [
    "`DockMediaFlyout` : la posición se calcula al pasar el ratón, sin más pop a la izquierda antes de la colocación correcta.",
    "`WeatherDetailPopover` : permanece `hidden` hasta que `useFloating` ha finalizado el posicionamiento.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.43.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.43",
  date: "2026-08-26",
  title: "Dock-Flyouts — Anfangsposition korrigiert",
  items: [
    "`DockMediaFlyout` : Position wird beim Hover berechnet, kein Pop mehr links vor der korrekten Platzierung.",
    "`WeatherDetailPopover` : bleibt `hidden`, bis `useFloating` die Platzierung finalisiert hat.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.43.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.42",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — taille + refresh album",
  items: [
    "La pillule Spotify/Now Playing est plus large (`min-w-[min(90vw,380px)]`) et plus haute (`min-h-[56px]`) avec une pochette 40x40.",
    "Le polling du now-playing est passé à 500 ms quand la Dynamic Island est active pour rafraîchir l'album/pochette plus souvent.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.42.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.42",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — size + album refresh",
  items: [
    "The Spotify/Now Playing pill is now wider (`min-w-[min(90vw,380px)]`) and taller (`min-h-[56px]`) with a 40x40 cover.",
    "Now-playing polling is now 500 ms when the Dynamic Island is active, to refresh the album/cover more often.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.42.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.42",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — tamaño + refresco de álbum",
  items: [
    "La píldora Spotify/Now Playing es más ancha (`min-w-[min(90vw,380px)]`) y más alta (`min-h-[56px]`) con una portada de 40x40.",
    "El polling de now-playing pasa a 500 ms cuando la Dynamic Island está activa, para refrescar el álbum/portada más a menudo.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.42.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.42",
  date: "2026-08-26",
  title: "Dynamic Island Spotify — Größe + Album-Refresh",
  items: [
    "Die Spotify/Now-Playing-Pille ist jetzt breiter (`min-w-[min(90vw,380px)]`) und höher (`min-h-[56px]`) mit einem 40x40-Cover.",
    "Now-Playing-Polling ist jetzt 500 ms, wenn die Dynamic Island aktiv ist, um Album/Cover häufiger zu aktualisieren.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.42.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.41",
  date: "2026-08-26",
  title: "TopBar — retour au bouton Dynamic Island",
  items: [
    "Le switch de la TopBar est remplacé par l'icône œil/œil-barré d'origine.",
    "La TopBar reste au-dessus et la Dynamic Island en dessous.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.41.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.41",
  date: "2026-08-26",
  title: "TopBar — revert to Dynamic Island icon button",
  items: [
    "The TopBar switch is back to the original eye/eye-off icon button.",
    "TopBar stays above and Dynamic Island stays below.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.41.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.41",
  date: "2026-08-26",
  title: "TopBar — volver al botón Dynamic Island",
  items: [
    "El switch de la TopBar vuelve a ser el botón de icono ojo/ojo-tachado original.",
    "La TopBar sigue arriba y la Dynamic Island abajo.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.41.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.41",
  date: "2026-08-26",
  title: "TopBar — Dynamic Island Icon-Button zurück",
  items: [
    "Der TopBar-Switch ist wieder der ursprüngliche Auge/Auge-durchgestrichen-Icon-Button.",
    "TopBar bleibt oben und Dynamic Island bleibt unten.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.41.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.40",
  date: "2026-08-26",
  title: "TopBar au-dessus de la Dynamic Island",
  items: [
    "La TopBar est remontée tout en haut (plus de `mt-12` lié à la Dynamic Island).",
    "La Dynamic Island est maintenant positionnée sous la TopBar.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.40.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.40",
  date: "2026-08-26",
  title: "TopBar above Dynamic Island",
  items: [
    "The TopBar is now at the very top (no `mt-12` linked to the Dynamic Island).",
    "The Dynamic Island is now positioned below the TopBar.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.40.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.40",
  date: "2026-08-26",
  title: "TopBar sobre Dynamic Island",
  items: [
    "La TopBar ahora está arriba del todo (sin `mt-12` ligado a la Dynamic Island).",
    "La Dynamic Island ahora está posicionada debajo de la TopBar.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.40.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.40",
  date: "2026-08-26",
  title: "TopBar über Dynamic Island",
  items: [
    "Die TopBar ist jetzt ganz oben (kein `mt-12` abhängig von der Dynamic Island).",
    "Die Dynamic Island ist jetzt unter der TopBar positioniert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.40.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.39",
  date: "2026-08-26",
  title: "Mobile login pass 9 — autocomplétion",
  items: [
    "Ajout de l'attribut `name` sur tous les champs du login (email, password, username, new-password, confirm-password).",
    "Amélioration de l'autocomplétion et du remplissage par les gestionnaires de mots de passe.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.39.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.39",
  date: "2026-08-26",
  title: "Mobile login pass 9 — autocompletion",
  items: [
    "Added `name` attribute to all login fields (email, password, username, new-password, confirm-password).",
    "Improved autocompletion and password manager support.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.39.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.39",
  date: "2026-08-26",
  title: "Mobile login pass 9 — autocompletado",
  items: [
    "Añadido el atributo `name` a todos los campos de login (email, password, username, new-password, confirm-password).",
    "Mejora de la autocompletación y el soporte de gestores de contraseñas.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.39.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.39",
  date: "2026-08-26",
  title: "Mobile Login Pass 9 — Autovervollständigung",
  items: [
    "`name`-Attribut zu allen Login-Feldern hinzugefügt (email, password, username, new-password, confirm-password).",
    "Verbesserte Autovervollständigung und Passwort-Manager-Unterstützung.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.39.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.38",
  date: "2026-08-26",
  title: "Mobile login pass 8 — accessibilité",
  items: [
    "Les onglets de mode d'authentification annoncent `aria-pressed`.",
    "Les liens secondaires (créer un compte, déjà un compte, mot de passe oublié) sont désactivés pendant le chargement.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.38.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.38",
  date: "2026-08-26",
  title: "Mobile login pass 8 — accessibility",
  items: [
    "Auth mode tabs now expose `aria-pressed`.",
    "Secondary links (create account, already have an account, forgot password) are disabled during loading.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.38.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.38",
  date: "2026-08-26",
  title: "Mobile login pass 8 — accesibilidad",
  items: [
    "Las pestañas de modo de autenticación ahora exponen `aria-pressed`.",
    "Los enlaces secundarios (crear cuenta, ya tengo cuenta, contraseña olvidada) se desactivan durante la carga.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.38.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.38",
  date: "2026-08-26",
  title: "Mobile Login Pass 8 — Barrierefreiheit",
  items: [
    "Auth-Modus-Tabs zeigen jetzt `aria-pressed` an.",
    "Sekundäre Links (Konto erstellen, bereits Konto, Passwort vergessen) sind während des Ladens deaktiviert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.38.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.37",
  date: "2026-08-26",
  title: "TopBar — switch Dynamic Island",
  items: [
    "Le bouton de visibilité de la Dynamic Island est devenu un vrai switch On/Off dans la TopBar.",
    "Utilisation du composant `Switch` standard, avec taille `sm` et labels.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.37.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.37",
  date: "2026-08-26",
  title: "TopBar — Dynamic Island switch",
  items: [
    "The Dynamic Island visibility button is now a real On/Off switch in the TopBar.",
    "Uses the standard `Switch` component, with `sm` size and labels.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.37.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.37",
  date: "2026-08-26",
  title: "TopBar — switch Dynamic Island",
  items: [
    "El botón de visibilidad de la Dynamic Island ahora es un interruptor On/Off real en la TopBar.",
    "Usa el componente `Switch` estándar, con tamaño `sm` y etiquetas.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.37.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.37",
  date: "2026-08-26",
  title: "TopBar — Dynamic Island Switch",
  items: [
    "Der Dynamic Island-Sichtbarkeitsknopf ist nun ein echter On/Off-Schalter in der TopBar.",
    "Verwendet die Standardkomponente `Switch`, Größe `sm` mit Labels.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.37.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.36",
  date: "2026-08-26",
  title: "Mobile login pass 7 — clavier iOS",
  items: [
    "Ajout de `autoCorrect=off`, `autoCapitalize=off`, `spellCheck=false` et `enterKeyHint` sur tous les champs du login.",
    "OTP : numéros sans correction, sans capitalisation et sans vérification orthographique.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.36.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.36",
  date: "2026-08-26",
  title: "Mobile login pass 7 — iOS keyboard",
  items: [
    "Added `autoCorrect=off`, `autoCapitalize=off`, `spellCheck=false` and `enterKeyHint` to all login fields.",
    "OTP: digits with no autocorrect, no capitalization and no spell checking.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.36.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.36",
  date: "2026-08-26",
  title: "Mobile login pass 7 — teclado iOS",
  items: [
    "Añadido `autoCorrect=off`, `autoCapitalize=off`, `spellCheck=false` y `enterKeyHint` a todos los campos de login.",
    "OTP : dígitos sin autocorrección, sin capitalización y sin corrección ortográfica.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.36.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.36",
  date: "2026-08-26",
  title: "Mobile Login Pass 7 — iOS Tastatur",
  items: [
    "`autoCorrect=off`, `autoCapitalize=off`, `spellCheck=false` und `enterKeyHint` zu allen Login-Feldern hinzugefügt.",
    "OTP: Ziffern ohne Autokorrektur, ohne Großschreibung und ohne Rechtschreibprüfung.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.36.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.35",
  date: "2026-08-26",
  title: "Admin — cartes sans effet 3D",
  items: [
    "Remplacement de `Card3D` par des cartes plates (`div`) dans `app/admin/page.tsx`.",
    "Les cartes admin gardent l'arrondi, la bordure et le fond, mais sans tilt/glare.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.35.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.35",
  date: "2026-08-26",
  title: "Admin — flat cards",
  items: [
    "Replaced `Card3D` with flat `div` cards in `app/admin/page.tsx`.",
    "Admin cards keep the radius, border and background, without tilt/glare.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.35.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.35",
  date: "2026-08-26",
  title: "Admin — tarjetas planas",
  items: [
    "Sustitución de `Card3D` por `div` planos en `app/admin/page.tsx`.",
    "Las tarjetas admin conservan el radio, el borde y el fondo, sin tilt/glare.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.35.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.35",
  date: "2026-08-26",
  title: "Admin — flache Karten",
  items: [
    "`Card3D` durch flache `div`-Karten in `app/admin/page.tsx` ersetzt.",
    "Admin-Karten behalten Radius, Rand und Hintergrund, ohne Tilt/Glare.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.35.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.34",
  date: "2026-08-26",
  title: "Version update notif + cache fix",
  items: [
    "`/version.json` : headers `no-cache, no-store, must-revalidate` pour éviter le cache Cloudflare/navigateur.",
    "`useVersionChecker` : fetch en `cache: reload` + headers anti-cache ; expose toujours la dernière version distante à l'UI.",
    "`VersionPill` affiche désormais la dernière version distante connue (pas seulement localStorage).",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.34.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.34",
  date: "2026-08-26",
  title: "Version update notif + cache fix",
  items: [
    "`/version.json` : `no-cache, no-store, must-revalidate` headers to prevent Cloudflare/browser caching.",
    "`useVersionChecker` : `cache: reload` + anti-cache headers ; always exposes latest remote version to the UI.",
    "`VersionPill` now displays the latest known remote version (not just localStorage).",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.34.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.34",
  date: "2026-08-26",
  title: "Version update notif + cache fix",
  items: [
    "`/version.json` : cabeceras `no-cache, no-store, must-revalidate` para evitar caché de Cloudflare/navegador.",
    "`useVersionChecker` : `cache: reload` + cabeceras anti-caché ; expone siempre la última versión remota en la UI.",
    "`VersionPill` ahora muestra la última versión remota conocida (no solo localStorage).",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.34.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.34",
  date: "2026-08-26",
  title: "Version update notif + cache fix",
  items: [
    "`/version.json` : `no-cache, no-store, must-revalidate` Header, um Cloudflare/Browser-Caching zu vermeiden.",
    "`useVersionChecker` : `cache: reload` + Anti-Cache Header ; zeigt immer die neueste Remote-Version in der UI.",
    "`VersionPill` zeigt jetzt die neueste bekannte Remote-Version (nicht nur localStorage).",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.34.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.33",
  date: "2026-08-26",
  title: "Mobile login pass 6 — focus au changement de mode",
  items: [
    "Mise au point automatique du premier champ email (ou équivalent) à chaque changement de mode d'authentification.",
    "Le passage à l'étape OTP code garde le focus géré par le composant OTP.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.33.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.33",
  date: "2026-08-26",
  title: "Mobile login pass 6 — focus on mode change",
  items: [
    "Auto-focus the first email field (or equivalent) on every auth mode change.",
    "Switching to OTP code step keeps focus handled by the OTP component.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.33.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.33",
  date: "2026-08-26",
  title: "Mobile login pass 6 — focus al cambiar de modo",
  items: [
    "Enfoque automático del primer campo de email (o equivalente) en cada cambio de modo de autenticación.",
    "Al pasar al paso de código OTP, el focus sigue gestionado por el componente OTP.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.33.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.33",
  date: "2026-08-26",
  title: "Mobile Login Pass 6 — Fokus beim Modus-Wechsel",
  items: [
    "Automatischer Fokus auf das erste E-Mail-Feld (oder Equivalent) bei jedem Wechsel des Authentifizierungsmodus.",
    "Wechsel zum OTP-Code-Schritt behält den Fokus durch die OTP-Komponente.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.33.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.32",
  date: "2026-08-26",
  title: "Mobile login pass 5 — fix build + reduced motion",
  items: [
    "Correction du build Cloudflare : le hook `useVisualViewport.ts` n'était pas commité (fichier manquant).",
    "Respect `prefers-reduced-motion` sur OTP, Language Switcher et Switch (transitions désactivées).",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.32.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.32",
  date: "2026-08-26",
  title: "Mobile login pass 5 — build fix + reduced motion",
  items: [
    "Cloudflare build fix : `useVisualViewport.ts` hook was not committed (missing file).",
    "Respect `prefers-reduced-motion` on OTP, Language Switcher and Switch (disable transitions).",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.32.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.32",
  date: "2026-08-26",
  title: "Mobile login pass 5 — fix build + reduced motion",
  items: [
    "Corrección del build de Cloudflare : el hook `useVisualViewport.ts` no estaba commitado (fichero perdido).",
    "Respeto de `prefers-reduced-motion` en OTP, Language Switcher y Switch (transiciones desactivadas).",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.32.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.32",
  date: "2026-08-26",
  title: "Mobile Login Pass 5 — Build-Fix + Reduced Motion",
  items: [
    "Cloudflare Build Fix : `useVisualViewport.ts` Hook war nicht committed (fehlende Datei).",
    "Beachtet `prefers-reduced-motion` für OTP, Language Switcher und Switch (Übergänge deaktiviert).",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.32.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.31",
  date: "2026-08-26",
  title: "Mobile login pass 4 — landscape, offline, OTP auto",
  items: [
    "Mode compact paysage mobile : padding, logo, titre, tabs et espacements réduits.",
    "Bannière hors ligne sur la page login quand `navigator.onLine` est faux.",
    "Auto-soumission du formulaire OTP dès que 6 chiffres sont saisis.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.31.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.31",
  date: "2026-08-26",
  title: "Mobile login pass 4 — landscape, offline, OTP auto",
  items: [
    "Compact landscape mobile mode : reduced padding, logo, title, tabs and spacing.",
    "Offline banner on the login page when `navigator.onLine` is false.",
    "Auto-submit OTP form as soon as 6 digits are entered.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.31.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.31",
  date: "2026-08-26",
  title: "Mobile login pass 4 — landscape, offline, OTP auto",
  items: [
    "Modo paisaje móvil compacto : padding, logo, título, tabs y espaciados reducidos.",
    "Banner sin conexión en la página de login cuando `navigator.onLine` es falso.",
    "Auto-envío del formulario OTP en cuanto se introducen 6 dígitos.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.31.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.31",
  date: "2026-08-26",
  title: "Mobile Login Pass 4 — Landscape, Offline, OTP Auto",
  items: [
    "Kompakter mobiler Querformat-Modus : reduzierte Padding, Logo, Titel, Tabs und Abstände.",
    "Offline-Banner auf der Login-Seite wenn `navigator.onLine` false ist.",
    "OTP-Formular wird automatisch abgesendet sobald 6 Ziffern eingegeben sind.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.31.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.30",
  date: "2026-08-26",
  title: "Mobile login pass 3 — finitions",
  items: [
    "Language switcher : limite de largeur du dropdown à `100dvw - 2rem` pour éviter tout débordement.",
    "Inputs et boutons login : `text-base` sur mobile, `sm:text-sm` sur desktop.",
    "Délai de 900 ms avant la redirection après connexion réussie, pour montrer brièvement le check.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.30.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.30",
  date: "2026-08-26",
  title: "Mobile login pass 3 — polish",
  items: [
    "Language switcher : dropdown max-width clamped to `100dvw - 2rem` to avoid overflow.",
    "Login inputs and buttons : `text-base` on mobile, `sm:text-sm` on desktop.",
    "900 ms delay before redirect after successful login to briefly show the check.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.30.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.30",
  date: "2026-08-26",
  title: "Mobile login pass 3 — ajustes",
  items: [
    "Language switcher : ancho del dropdown limitado a `100dvw - 2rem` para evitar desbordamiento.",
    "Inputs y botones login : `text-base` en móvil, `sm:text-sm` en desktop.",
    "Retraso de 900 ms antes de redirigir tras login exitoso para mostrar el check.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.30.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.30",
  date: "2026-08-26",
  title: "Mobile Login Pass 3 — Feinschliff",
  items: [
    "Language switcher : Dropdown-Breite auf `100dvw - 2rem` begrenzt, um Überlappung zu vermeiden.",
    "Login-Inputs und Buttons : `text-base` auf Mobile, `sm:text-sm` auf Desktop.",
    "900 ms Verzögerung vor der Weiterleitung nach erfolgreichem Login, um den Haken kurz anzuzeigen.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.30.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.29",
  date: "2026-08-26",
  title: "Mobile login pass 2 — clavier, viewport, OTP, haptics",
  items: [
    "Nouveau hook `useVisualViewport` pour adapter le login au clavier iOS.",
    "Page login en `min-h-dvh` et `justify-start` lorsque le clavier est ouvert.",
    "Scroll automatique du champ actif dans la vue sur focus.",
    "Transitions animées du contenu du formulaire entre les tabs (opacity + translateX).",
    "Haptic `light` sur les tabs, le switch, l'œil mot de passe et les liens d'action.",
    "Champ OTP : `type='tel'`, `pattern='\\d*'`, `autoComplete='one-time-code'` pour iOS.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.29.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.29",
  date: "2026-08-26",
  title: "Mobile login pass 2 — keyboard, viewport, OTP, haptics",
  items: [
    "New `useVisualViewport` hook to adapt login to the iOS keyboard.",
    "Login page uses `min-h-dvh` and `justify-start` when the keyboard is open.",
    "Auto-scroll active input into view on focus.",
    "Animated form content transitions between tabs (opacity + translateX).",
    "Light haptic feedback on tabs, switch, password eye and action links.",
    "OTP field: `type='tel'`, `pattern='\\d*'`, `autoComplete='one-time-code'` for iOS.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.29.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.29",
  date: "2026-08-26",
  title: "Mobile login pass 2 — teclado, viewport, OTP, haptics",
  items: [
    "Nuevo hook `useVisualViewport` para adaptar el login al teclado iOS.",
    "Página login en `min-h-dvh` y `justify-start` cuando el teclado está abierto.",
    "Scroll automático del campo activo en la vista al hacer focus.",
    "Transiciones animadas del contenido del formulario entre tabs (opacity + translateX).",
    "Haptic `light` en tabs, switch, ojo contraseña y enlaces de acción.",
    "Campo OTP : `type='tel'`, `pattern='\\d*'`, `autoComplete='one-time-code'` para iOS.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.29.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.29",
  date: "2026-08-26",
  title: "Mobile Login Pass 2 — Tastatur, Viewport, OTP, Haptics",
  items: [
    "Neuer Hook `useVisualViewport` zur Anpassung des Logins an die iOS-Tastatur.",
    "Login-Seite `min-h-dvh` und `justify-start` wenn die Tastatur offen ist.",
    "Automatisches Scrollen des aktiven Felds in die Ansicht bei Fokus.",
    "Animierte Formular-Content-Übergänge zwischen den Tabs (opacity + translateX).",
    "Leichter Haptic-Feedback auf Tabs, Switch, Passwort-Auge und Aktionslinks.",
    "OTP-Feld: `type='tel'`, `pattern='\\d*'`, `autoComplete='one-time-code'` für iOS.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.29.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.28",
  date: "2026-08-26",
  title: "Mobile login screen rework — passe 1",
  items: [
    "Safe areas iOS / Dynamic Island sur la page login et le switcher de langue.",
    "Inputs login en `inputSize=large` + `text-base` pour éviter le zoom Safari iOS.",
    "Zones tactiles élargies pour l'œil du mot de passe, les boutons et le switch.",
    "Segmented control des tabs avec background animé `layoutId`.",
    "Fond mobile dégradé subtil et glow du logo respirant (respecte `prefers-reduced-motion`).",
    "OTP : `OtpInput` ne focus plus à chaque changement de `disabled`, évite les boucles de renvoi.",
    "Boutons `active:scale-[0.98]` et `h-12` sur mobile.",
    "Lien 'mot de passe oublié' passe en colonne sur petits écrans.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.28.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.28",
  date: "2026-08-26",
  title: "Mobile login screen rework — pass 1",
  items: [
    "iOS / Dynamic Island safe areas on login page and language switcher.",
    "Login inputs use `inputSize=large` + `text-base` to prevent Safari iOS zoom.",
    "Expanded touch targets for password eye, buttons and switch.",
    "Auth tabs segmented control with animated `layoutId` background.",
    "Subtle mobile gradient background and breathing logo glow (respects `prefers-reduced-motion`).",
    "OTP : `OtpInput` no longer refocuses on every `disabled` change, prevents resend loops.",
    "Buttons `active:scale-[0.98]` and `h-12` on mobile.",
    "Forgot password link stacks on small screens.",
    "Validation : build, lint.",
    "Version badge bottom-right: v1.9.28.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.28",
  date: "2026-08-26",
  title: "Rediseño mobile login — paso 1",
  items: [
    "Safe areas iOS / Dynamic Island en login y selector de idioma.",
    "Inputs de login `inputSize=large` + `text-base` para evitar el zoom de Safari iOS.",
    "Zonas táctiles ampliadas para el ojo de contraseña, botones y switch.",
    "Control segmentado de tabs con fondo animado `layoutId`.",
    "Fondo degradado sutil móvil y aura del logo respirando (respeta `prefers-reduced-motion`).",
    "OTP : `OtpInput` ya no enfoca en cada cambio de `disabled`, evita bucles de reenvío.",
    "Botones `active:scale-[0.98]` y `h-12` en móvil.",
    "Enlace 'olvidé mi contraseña' en columna en pantallas pequeñas.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.28.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.28",
  date: "2026-08-26",
  title: "Mobile Login-Überarbeitung — Pass 1",
  items: [
    "iOS / Dynamic Island Safe Areas auf Login-Seite und Sprachumschalter.",
    "Login-Inputs `inputSize=large` + `text-base` gegen Safari-iOS-Zoom.",
    "Größere Touch-Ziele für Passwort-Auge, Buttons und Switch.",
    "Segmentiertes Tab-Control mit animiertem `layoutId`-Hintergrund.",
    "Subtiler mobiler Gradient-Hintergrund und atmendes Logo-Glow (beachtet `prefers-reduced-motion`).",
    "OTP : `OtpInput` fokussiert nicht mehr bei jeder `disabled`-Änderung, verhindert Resend-Loops.",
    "Buttons `active:scale-[0.98]` und `h-12` auf Mobile.",
    "Passwort-vergessen-Link bricht auf kleinen Bildschirmen um.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.28.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.27",
  date: "2026-08-26",
  title: "Refonte UI des barres de saisie et question",
  items: [
    "`Input` : suppression de `overflow-hidden` (glow visible), `gap-4`, espace `pl-2` avant l'action droite, focus unique au conteneur.",
    "`TextArea` : `rounded-2xl`, `overflow-hidden`, glow plus subtil, focus conteneur unique.",
    "`HeroBriefingCard` : le bouton Brain de droite ne dépasse plus et suit le thème sans bordure interne.",
    "`BrainChat` : suppression du focus double autour du `TextArea` (une seule bordure focus sur le composant).",
    "Aucune logique fonctionnelle modifiée : envoi, Brain, raccourcis clavier, suggestions conservés.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.27.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.27",
  date: "2026-08-26",
  title: "Input and question bar UI overhaul",
  items: [
    "`Input` : removed `overflow-hidden` (glow visible), `gap-4`, `pl-2` space before right action, single container focus.",
    "`TextArea` : `rounded-2xl`, `overflow-hidden`, subtler glow, single container focus.",
    "`HeroBriefingCard` : right Brain button no longer cut off and follows theme with no inner border.",
    "`BrainChat` : removed double focus around the `TextArea` (single focus border on the component).",
    "No functional logic changed: send, Brain, keyboard shortcuts, suggestions preserved.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.27.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.27",
  date: "2026-08-26",
  title: "Rediseño UI de barras de entrada y pregunta",
  items: [
    "`Input` : eliminado `overflow-hidden` (glow visible), `gap-4`, espacio `pl-2` antes de la acción derecha, focus único en el contenedor.",
    "`TextArea` : `rounded-2xl`, `overflow-hidden`, glow más sutil, focus contenedor único.",
    "`HeroBriefingCard` : el botón Brain derecho ya no se corta y sigue el tema sin borde interno.",
    "`BrainChat` : eliminado el doble focus alrededor del `TextArea` (único borde focus en el componente).",
    "Sin cambios en la lógica funcional: envío, Brain, atajos, sugerencias conservados.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.27.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.27",
  date: "2026-08-26",
  title: "UI-Überarbeitung der Eingabe- und Fragelbalken",
  items: [
    "`Input` : `overflow-hidden` entfernt (Glow sichtbar), `gap-4`, `pl-2` Abstand vor rechter Aktion, einzelner Container-Focus.",
    "`TextArea` : `rounded-2xl`, `overflow-hidden`, dezenterer Glow, einzelner Container-Focus.",
    "`HeroBriefingCard` : rechter Brain-Button wird nicht mehr abgeschnitten und folgt dem Theme ohne inneren Rand.",
    "`BrainChat` : doppelter Focus um `TextArea` entfernt (einziger Focus-Rand am Komponenten).",
    "Keine funktionale Logik geändert: Senden, Brain, Tastenkürzel, Vorschläge erhalten.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.27.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.26",
  date: "2026-08-26",
  title: "Audit et robustesse du chargement des images",
  items: [
    "`ClientImage` : fallback par défaut basé sur `alt` si aucun fourni, timeout augmenté à 8 s, CORS `crossOrigin='anonymous'`, URLs `data:image` acceptées.",
    "Remplacement de `next/image` par `ClientImage` dans `LiveWidget`, `LiveWidgets`, `Sidebar`, `UserProfileDropdown`, `UserProfileCard`.",
    "`useNowPlaying` : extraction automatique des URLs dans les objets `url`/`src` pour les couvertures Spotify/Discord.",
    "`SocialDiscordCard` : pas de fond par défaut si l'image de couverture échoue.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.26.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.26",
  date: "2026-08-26",
  title: "Image loading audit and robustness",
  items: [
    "`ClientImage` : default fallback from `alt` if none provided, timeout raised to 8s, `crossOrigin='anonymous'`, `data:image` URLs accepted.",
    "Replaced `next/image` with `ClientImage` in `LiveWidget`, `LiveWidgets`, `Sidebar`, `UserProfileDropdown`, `UserProfileCard`.",
    "`useNowPlaying` : auto-extract `url`/`src` from objects for Spotify/Discord covers.",
    "`SocialDiscordCard` : no background fallback when the cover image fails.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.26.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.26",
  date: "2026-08-26",
  title: "Auditoría y robustez de carga de imágenes",
  items: [
    "`ClientImage` : fallback por defecto desde `alt` si no se proporciona, timeout subido a 8 s, `crossOrigin='anonymous'`, URLs `data:image` aceptadas.",
    "Reemplazo de `next/image` por `ClientImage` en `LiveWidget`, `LiveWidgets`, `Sidebar`, `UserProfileDropdown`, `UserProfileCard`.",
    "`useNowPlaying` : extracción automática de URLs en objetos `url`/`src` para portadas Spotify/Discord.",
    "`SocialDiscordCard` : sin fondo de respaldo cuando la imagen de portada falla.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.26.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.26",
  date: "2026-08-26",
  title: "Bildlade-Audit und Robustheit",
  items: [
    "`ClientImage` : Standard-Fallback aus `alt`, wenn keiner angegeben, Timeout auf 8 s erhöht, `crossOrigin='anonymous'`, `data:image`-URLs erlaubt.",
    "`next/image` durch `ClientImage` ersetzt in `LiveWidget`, `LiveWidgets`, `Sidebar`, `UserProfileDropdown`, `UserProfileCard`.",
    "`useNowPlaying` : automatische URL-Extraktion aus `url`/`src`-Objekten für Spotify/Discord-Cover.",
    "`SocialDiscordCard` : kein Hintergrund-Fallback, wenn das Coverbild fehlschlägt.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.26.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.25",
  date: "2026-08-26",
  title: "Polish Notes et corrections visuelles",
  items: [
    "`TopBar` : réservation de largeur centrale pour le Dynamic Island, qui ne chevauche plus la météo.",
    "`NotesPage` : sélecteur de tri plus large (`w-36`) pour ne plus être coupé.",
    "`NotesPage` : bouton 'Enregistrer' remonté avec `mb-6` et `main` padding bas augmenté.",
    "`NotesPage` : les deux colonnes partagent la même hauteur (`items-stretch`).",
    "`RichTextEditor` : barre d'outils regroupée par sections avec séparateurs visuels.",
    "`Dock` et `Shell` : dock remonté et padding bas augmenté pour éviter tout recouvrement.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.25.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.25",
  date: "2026-08-26",
  title: "Notes polish and visual fixes",
  items: [
    "`TopBar` : central width reserved for Dynamic Island, no longer overlapping weather.",
    "`NotesPage` : sort selector widened (`w-36`) so it isn't truncated.",
    "`NotesPage` : 'Save' button raised with `mb-6` and increased `main` bottom padding.",
    "`NotesPage` : two columns share the same height (`items-stretch`).",
    "`RichTextEditor` : toolbar grouped by sections with visual separators.",
    "`Dock` and `Shell` : dock raised and bottom padding increased to avoid any overlap.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.25.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.25",
  date: "2026-08-26",
  title: "Pulido de Notas y correcciones visuales",
  items: [
    "`TopBar` : ancho central reservado para Dynamic Island, sin superponerse al clima.",
    "`NotesPage` : selector de ordenación más ancho (`w-36`) para no cortarse.",
    "`NotesPage` : botón 'Guardar' elevado con `mb-6` y padding inferior del `main` aumentado.",
    "`NotesPage` : las dos columnas comparten la misma altura (`items-stretch`).",
    "`RichTextEditor` : barra de herramientas agrupada por secciones con separadores visuales.",
    "`Dock` y `Shell` : dock elevado y padding inferior aumentado para evitar superposiciones.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.25.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.25",
  date: "2026-08-26",
  title: "Notes-Polish und visuelle Korrekturen",
  items: [
    "`TopBar` : zentrale Breite für Dynamic Island reserviert, überlappt Wetter nicht mehr.",
    "`NotesPage` : Sortier-Select verbreitert (`w-36`), damit es nicht abgeschnitten wird.",
    "`NotesPage` : 'Speichern'-Button mit `mb-6` angehoben und unterer `main`-Padding erhöht.",
    "`NotesPage` : beide Spalten teilen sich die gleiche Höhe (`items-stretch`).",
    "`RichTextEditor` : Toolbar nach Abschnitten gruppiert mit visuellen Trennern.",
    "`Dock` und `Shell` : Dock angehoben und unterer Padding erhöht, um Überlappungen zu vermeiden.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.25.",
  ],
});

CHANGELOG_BY_LANG.fr.unshift({
  version: "v1.9.24",
  date: "2026-08-26",
  title: "Synchronisation automatique en cas d'éléments en attente",
  items: [
    "`useActivityJournal` lance un sync automatique 1,5 s après l'apparition d'éléments en attente.",
    "Le bouton 'Synchroniser maintenant' reste utilisable pour un déclenchement immédiat.",
    "Validation : build, lint.",
    "Version affichée en bas à droite : v1.9.24.",
  ],
});

CHANGELOG_BY_LANG.en.unshift({
  version: "v1.9.24",
  date: "2026-08-26",
  title: "Auto-sync when items are pending",
  items: [
    "`useActivityJournal` now triggers a sync 1.5 s after pending items appear.",
    "'Sync now' button still available for immediate trigger.",
    "Validation: build, lint.",
    "Version badge bottom-right: v1.9.24.",
  ],
});

CHANGELOG_BY_LANG.es.unshift({
  version: "v1.9.24",
  date: "2026-08-26",
  title: "Sincronización automática con elementos en espera",
  items: [
    "`useActivityJournal` inicia una sincronización 1,5 s después de que aparezcan elementos en espera.",
    "El botón 'Sincronizar ahora' sigue disponible para un disparo inmediato.",
    "Validación : build, lint.",
    "Versión mostrada abajo a la derecha : v1.9.24.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.24",
  date: "2026-08-26",
  title: "Automatische Synchronisierung bei ausstehenden Elementen",
  items: [
    "`useActivityJournal` startet 1,5 s nach dem Auftreten ausstehender Elementen einen Sync.",
    "'Jetzt synchronisieren'-Button bleibt für sofortige Auslösung verfügbar.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.24.",
  ],
});

CHANGELOG_BY_LANG.de.unshift({
  version: "v1.9.23",
  date: "2026-08-26",
  title: "Globales visuelles Polishing — Header, Dock, Statusleiste und Sidebar",
  items: [
    "TopBar: dynamischer Abstand, wenn die Dynamic Island sichtbar ist, um Überlappung zu vermeiden.",
    "Dynamic Island: schmalere und besser zentrierte Kompaktansicht.",
    "Dock angehoben, damit es Statusleiste und unteren Inhalt nicht verdeckt.",
    "Shell: erhöhter unterer Abstand für Dock + Statusleiste.",
    "DashboardOverview: Kartenreihen mit auto-rows-fr gleichmäßig angepasst.",
    "Sidebar: Profil und Fußzeilen-Buttons besser getrennt und gerahmt.",
    "Nowplaying-Karte aus LiveWidgets entfernt.",
    "Support-Konfetti werden über dem Dankeschön-Modal gerendert.",
    "Validierung: build, lint.",
    "Version unten rechts: v1.9.23.",
  ],
});

export const CHANGELOG = CHANGELOG_BY_LANG.fr;
