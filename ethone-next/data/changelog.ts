export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
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

export const CHANGELOG_BY_LANG: Record<string, ChangelogEntry[]> = {
  fr: [v193_fr, v192_fr, v191_fr, v190_fr, v189_fr, v188_fr, v187_fr, v186_fr, v185_fr, v184_fr, v183_fr, v182_fr, v181_fr, v180_fr, v179_fr, v178_fr, v177_fr, v176_fr, v175_fr, v174_fr, v173_fr, v172_fr, v171_fr, v170_fr, v169_fr, v168_fr, v167_fr, v166_fr, v165_fr, v164_fr, v328_fr, v327_fr, v326_fr, v325_fr, v324_fr, v323_fr, v322_fr],
  en: [v193_en, v192_en, v191_en, v190_en, v189_en, v188_en, v187_en, v186_en, v185_en, v184_en, v183_en, v182_en, v181_en, v180_en, v179_en, v178_en, v177_en, v176_en, v175_en, v174_en, v173_en, v172_en, v171_en, v170_en, v169_en, v168_en, v167_en, v166_en, v165_en, v164_en, v328_en, v327_en, v326_en, v325_en,
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
  es: [v193_es, v192_es, v191_es, v190_es, v189_es, v188_es, v187_es, v186_es, v185_es, v184_es, v183_es, v182_es, v181_es, v180_es, v179_es, v178_es, v177_es, v176_es, v175_es, v174_es, v173_es, v172_es, v171_es, v170_es, v169_es, v168_es, v167_es, v166_es, v165_es, v164_es, v328_es, v327_es, v326_es, v325_es,
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
  de: [v193_de, v192_de, v191_de, v190_de, v189_de, v188_de, v187_de, v186_de, v185_de, v184_de, v183_de, v182_de, v181_de, v180_de, v179_de, v178_de, v177_de, v176_de, v175_de, v174_de, v173_de, v172_de, v171_de, v170_de, v169_de, v168_de, v167_de, v166_de, v165_de, v164_de, v328_de, v327_de, v326_de, v325_de,
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
