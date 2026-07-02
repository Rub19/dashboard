/* ETHONE legacy compatibility module: auth-changelog. */
// -- AUTH UI --------------------------------------
function showChangelog(){
  const versions=[
    {v:'v5.3.2',date:'25/06/2026',changes:[
      'i18n: audit complet des textes visibles sur dashboard, connexions, settings, modales, dock, command palette et changelog',
      'Fix: traduction runtime appliquée aussi aux contenus générés par JavaScript après changement de page ou de langue',
      'Fix: placeholders, titres, aria-labels et boutons du topbar/search synchronisés avec la langue active',
      'UI: palette changelog conservée en violet ETHONE avec badges i18n/FIX/UI cohérents',
      'QA: ajout de ethoneI18nAudit() pour lister les textes anglais restants dans la langue FR'
    ]},
    {v:'v5.3.1',date:'25/06/2026',changes:[
      'Fix: le dock quick actions ne s’affiche plus sur Sign In, Profile Selection ou Password Screen',
      'Fix: barre de recherche topbar recalibrée pour éviter les chevauchements avec les boutons',
      'UI: changelog harmonisé avec la palette ETHONE violette et les badges de statut',
      'UX: titres et descriptions des boutons rapides clarifiés pour notes, tâches, recherche et personnalisation',
      'Accessibilité: états visibles, aria-labels et focus améliorés sur les actions rapides',
    ]},
    {v:'v5.3.0',date:'25/06/2026',changes:[
      'UI: Profile Selection redesign premium avec cards modernes, hover, sélection active et empty state',
      'Fix: restauration du vrai profil Rub depuis la source profils globale et le backup local',
      'UI: icône ETHONE corrigée en carré violet arrondi avec lignes blanches',
      'UI: Sign In restauré avec langues, Google OAuth, GitHub OAuth, Register, Forgot Password et Remember Me',
      'Perf: animations premium ajoutées sans casser les préférences reduced-motion',
    ]},
    {v:'v5.2.0',date:'16/06/2026',changes:[
      'Recherche dans les notes: filtre par titre et contenu',
      'Indicateur sync Supabase: vert=synced, orange=saving, rouge=offline',
      'Habitudes: streak recalculé depuis le log (plus fiable)',
      'Stats: streak affiché depuis le vrai log de l\'habitude',
      'Traductions: notes, habitudes, stats, kanban, countdown',
      'UX: nom des notes traduit en FR/ES/DE',
    ]},
    {v:'v5.1.0',date:'16/06/2026',changes:[
      'Fix: clearAIChat reset _aiSessionId (save auto supprimé, save manuel uniquement)',
      'Fix: Countdown — date passée affiche "Date passée" avec nb de jours écoulés',
      'Fix: Quick note sauvegardée automatiquement au changement de page',
      'Fix: Lanyard WS reconnexion exponentielle (5s→10s→20s→30s max)',
      'Fix: Confirmation avant suppression d\'un chat AI',
      'Fix: Confirmation avant suppression d\'un profil',
      'Fix: Cache météo invalidé si ville différente',
      'Fix: Gaming overview affiche — si données manquantes (au lieu de Loading...)',
      'UX: ETHONE AI — bouton Sauvegarder explicite, historique = chats sauvegardés manuellement',
      'UX: Drawer historique AI redesigné avec compteur, date/heure, bouton supprimer',
    ]},
    {v:'v5.0.0',date:'16/06/2026',changes:[
      'Fix: Pomodoro reprend exactement au bon endroit après refresh (endTime exact conservé)',
      'Fix: interval _npProgressInterval nettoyé au changement de profil',
      'Fix: renderLastfmCard avec .catch pour éviter les erreurs silencieuses',
      'Traductions: 11 toasts/messages UI traduits en FR/ES/DE selon la langue active',
      'Traductions: bouton \'Add item\' → \'Ajouter\' en FR',
      'Perf: console.log supprimés en production',
      'UX: toast \'Pause terminée\' avec notif browser',
      'UX: raccourci Espace pour play/pause Pomodoro',
    ]},
    {v:'v4.9.0',date:'16/06/2026',changes:['Perf: debounce Supabase 800ms→2s (moins d\'appels API)','Perf: tous les intervals (Lanyard, Last.fm, Spotify) nettoyés au changement de profil','UX: notif browser quand la pause Pomodoro se termine','UX: touche Espace pour play/pause Pomodoro (depuis le dashboard)','Fix: Pomodoro ne montre plus le toast \'repris\' au refresh sans raison','Fix: QOTD utilise les bonnes clés des fallback quotes','Fix: bouton son Pomodoro sorti du ring, dans le header']},
    {v:'v4.8.0',date:'16/06/2026',changes:['Last.fm: smart refresh — détecte changement de piste en 10s (au lieu de 30s fixe)','Météo: recherche Nominatim améliorée (normalize, capitalize, countrycodes=fr, multi-variantes)','Tokens Groq optimisés: system prompt ultra-compact (~120 tokens vs ~500 avant)','Tokens Groq: historique 4 messages, max_tokens 500, contexte dashboard compressé','Tokens Groq: ~700-900 tokens/message vs ~4K avant']},
    {v:'v4.7.0',date:'16/06/2026',changes:['Now Playing: ne s\'affiche plus au refresh quand Discord est DND sans Spotify','Discord connecté: fallback Last.fm bloqué jusqu\'à réponse Lanyard','updateSpotifyFromLanyard: Discord online sans Spotify → cache le fallback aussi','Last.fm scrobble card: refresh toutes les 10s avec détection changement de piste']},
    {v:'v4.6.0',date:'16/06/2026',changes:['Widget Discord: contour coloré selon statut (rouge DND, vert online, orange idle, transparent invis)','Widget Now Playing: contour vert Spotify (#1db954)','Widget Last.fm: contour rouge (#d51007)','Sidebar compact: items Account (Connexions/Paramètres/IA) maintenant groupés après Main, plus en bas','Flash Connexions corrigé: loadConnectionsUI ne relance plus initSidebarWidgets']},
    {v:'v4.5.0',date:'16/06/2026',changes:['ETHONE AI: contexte dashboard avec vrais noms (notes, fichiers, tâches, habitudes, objectifs)','ETHONE AI: historique corrigé — saveAIChats sauvegarde en cloud (Supabase)','ETHONE AI: message de bienvenue ne se répète plus au retour sur l\'onglet','ETHONE AI: erreur indiquait Gemini au lieu de Groq — corrigé','Overview widgets: ordre drag-drop sauvegardé et restauré après refresh (Supabase)','Météo: ville manuelle prioritaire — jamais écrasée par géoloc','Page navigation: display:none/block au lieu d\'opacity (élimine le bug page-petite)']},
    {v:'v4.4.0',date:'16/06/2026',changes:['Now Playing (sidebar): logique Discord online→Lanyard / offline→Last.fm fallback','Double widget Spotify corrigé: jamais deux widgets en même temps','Discord offline/invis: widget Last.fm iframe affiché automatiquement','Discord online sans Spotify: widget Now Playing caché']},
    {v:'v4.3.0',date:'16/06/2026',changes:['Boot corrigé: boucle infinie updateBannerDisplay↔updateSidebarAvatar supprimée','POMO_MODES.forEach corrigé (POMO_MODES est une fonction, nécessite ())','Variables globales manquantes déclarées: _ambientFrame, _bgFrame, _bgParticles, _bioSaveTO, _socialSaveTO, _lastRank, _npProgressInterval, _valoMatchList']},
    {v:'v4.0.0',date:'14/06/2026',changes:['Widgets sidebar: chargement automatique au boot (WORKER_URL et LASTFM_KEY déplacés en tête de script)','Boot ultra-rapide: cache sessionStorage + auto-enter si profil unique sans mot de passe','Greeting localisé: Bonjour/Bon après-midi/Bonsoir sans dépendance à t()','Date localisée: jours et mois traduits en FR/EN/ES/DE dans l\'horloge','Sidebar widgets toggle: bouton ◫ Sidebar dans l\'onglet Connexions pour Discord et Last.fm','Personal dashboard remplacé par ETHONE (ou bio si définie)','Changelog: refonte visuelle — timeline verticale, tags par catégorie, plus lisible','Flash au boot corrigé: sidebar/main-content cachés par défaut, écran de chargement ETHONE','Sidebar: fond noir corrigé, overflow:hidden, footer toujours visible','renderDiscordCard appelle refreshDiscordSidebar automatiquement']},
    {v:'v3.9.1',date:'12/06/2026',changes:['Stats: heatmap GitHub-style sur 6 mois (26 semaines, 4 niveaux orange)','Valorant: graphe RR progression sur les derniers matchs compétitifs','Stats: renderStatsHeatmap() hookée dans renderStatsPage()','Présentation: mode plein écran 2x3 grid (tasks/pomo/habits/streaks/files)','Présentation: horloge live, bouton dans stats topbar + Cmd+K','Présentation: fullscreen API + ESC pour quitter']},
    {v:'v3.9.0',date:'12/06/2026',changes:['Notifications in-app: cloche + badge + panneau slide-in','Notifs auto: tâches en retard, tâches du jour, streaks en danger, événements à venir, milestone pomo','Transitions directionnelles: gauche/droite selon ordre des pages dans la nav','Page order: slide depuis droite si on avance dans la nav, gauche si on recule','Pomo: notification in-app à chaque session terminée','Topbar: bouton cloche avec badge animé']},
    {v:'v3.8.0',date:'12/06/2026',changes:['Command Palette: Cmd+K ouvre une recherche globale avec actions rapides','Command Palette: navigation clavier ↑↓ + Enter, raccourcis N/T','Link preview: hover sur les liens File & Links affiche favicon + domaine','Drag & drop: widgets de l\'overview réorganisables par glisser-déposer','Sidebar: Discord + Spotify/Last.fm refonte — compact, propre, EQ animé','EQ animation: barres musicales animées quand Spotify joue','doLogin/doRegister: try/catch global, plus de loading infini']},
    {v:'v3.7.1',date:'12/06/2026',changes:['i18n: Espagnol (ES) et Allemand (DE) ajoutés — 4 langues au total','Sélecteur mis à jour avec 🇪🇸 ES et 🇩🇪 DE','ps-title: dégradé sur dernier mot préservé dans toutes les langues','Persistance langue vérifiée: applyI18n() au boot lit localStorage']},
    {v:'v3.7.0',date:'12/06/2026',changes:['i18n: système de langue FR/EN complet','Sélecteur de langue avec drapeaux dans auth et dashboard','Français par défaut, mémorisé en localStorage','Traductions: nav, dashboard, settings, auth, AI, pomodoro, météo, connexions','data-i18n attributes sur tous les éléments statiques clés','Greeting dynamique selon langue (Bonjour/Bon après-midi/Bonsoir)']},
    {v:'v3.6.0',date:'12/06/2026',changes:['UI: full modern polish pass — typography, spacing, radius system','New CSS var system: --r-xs/sm/md/lg/xl/2xl for consistent border-radius','Typography: JetBrains Mono for labels/stats, Syne for titles, tighter letter-spacing','Buttons: refined hover states, shadows, active scale','Panels/cards: shadow system, hover lift, consistent borders','Modals: darker backdrop, blur 10px, larger border-radius','Cat tabs: orange active state, cleaner pills','Autofill: dark background override for Chrome autofill','Responsive: better padding/radius on mobile for all components','Bugfix: deleteProfile now deletes from Supabase DB (no more reappearing after refresh)','Discord card: banner, accent color, status dot, activity block','Region selector: pill-style for Valo & LoL (no more ugly select dropdown)','XP: fixed render on settings page open, new bar class']},
    {v:'v3.5.1',date:'12/06/2026',changes:['Color system: full palette unification — orange #8b5cf6 + red #7c3aed everywhere','Auth screen: left panel near-black coherent, buttons orange/red gradient','Auth: card border orange-tinted, right panel explicit dark bg','Root vars: surfaces neutral rgba (no more red-tinted backgrounds)','Root vars: muted colors warm neutral (no more blue-purple muted)','Accent: #8b5cf6 replaces #e11d48 crimson as primary accent throughout']},
    {v:'v3.5.0',date:'12/06/2026',changes:['Pomodoro v2: larger 160px animated ring with pulse while running','Pomodoro: Web Audio API sounds (tick/start/done/break chimes)','Pomodoro: sound toggle button, SVG controls (reset/play/skip)','Pomodoro: 4-cell stats grid (today/total/focus time/streak)','Last.fm v2: blurred album art hero card for now playing','Last.fm: section labels, track rows, artist bars with new CSS classes','Valorant v2: rank hero with floating emblem + winrate donut ring','Valorant: valo-stats-row with color-coded good/bad KDA/ACS/HS/WR','Valorant: new valo-match-row with left color bar + hover slide','Valorant: valo-agents-grid 3-col with agent images']},
    {v:'v3.4.0',date:'12/06/2026',changes:['Animations: full system — scroll reveal, page transitions, stat counters','Auth: 6 floating animated icons (tasks, stats, gaming, notes, habits, AI)','Auth: animated title gradient shift, staggered feature items with SVG icons','Auth: pulsing orbs, glow logo animation','Profile select: cursor glow follows mouse, staggered card entrance','Dashboard: IntersectionObserver scroll reveal on all panels/cards','Dashboard: animated number counters on stat cards','Dashboard: nav icon bounce on hover, shimmer on active item','Dashboard: page transition with fade+slide on every tab switch','Buttons: ripple effect on all primary/ghost buttons']},
    {v:'v3.3.0',date:'12/06/2026',changes:['Weather widget v2: animated SVG weather icons (sun, clouds, rain, snow, storm)','Weather: 5-day forecast redesign with clean cards','Weather: feels like / wind / humidity meta row','Weather: location pin with city name','ETHONE AI: new Claude-powered chat assistant page','ETHONE AI: dashboard context awareness (tasks, habits, notes, pomos)','ETHONE AI: typing indicator, markdown support, suggestion chips','ETHONE AI: conversation history (last 24 messages)']},
    {v:'v3.2.1',date:'12/06/2026',changes:['Bugfix: duplicate modal-add-countdown removed','Bugfix: duplicate github-username-input removed (static HTML removed, JS handles rendering)','Bugfix: missing CSS variables (--radius, --radius-sm, --transition, --glow-blue, --shadow-sm) added as aliases in :root','Full scan: IDs, divs, functions — no remaining issues']},
    {v:'v3.2.0',date:'12/06/2026',changes:['Mobile: full auth screen redesign (left panel hidden, full screen form)','Mobile: profile select adapted (smaller cards, canvas disabled)','Mobile: dashboard single-column layout on <=768px','Mobile: bottom nav SVG icons (Home/Files/Tasks/Gaming/Settings)','Mobile: SVG hamburger, sidebar slides from left','Mobile: stat cards 2-column grid, panels reduced padding','Mobile: settings nav horizontal scrollable sticky','Mobile: all grids forced to 1 column on mobile','Mobile: safe area insets for iPhone notch/home bar']},
    {v:'v3.1.1',date:'12/06/2026',changes:['Icons: all nav emojis replaced with proper Lucide SVG','Favicon: ETHONE SVG diamond icon in browser tab','Stats: full page redesign (2x2 grid, SVG panel-title-icons, habit bars)','Overview: 2-column layout (main content + sidebar widgets)','Overview: widgets logically grouped (no more mixing)','Overview: SVG panel-title-icon on all widgets']},
    {v:'v3.1.0',date:'12/06/2026',changes:['Bugfix: images stay within frame (overflow:hidden, object-fit:cover everywhere)','Bugfix: themes consistent — applyTheme restarts ambient bg + sets --bg-rgb','Bugfix: saveStateNow deduplicated — single clean definition with debounce','Bugfix: xp now saved in cloud state','Bugfix: localStorage fallback if cloud session empty','Bugfix: todo filter tabs use CSS classes (persistent on re-render)','Bugfix: settings avatar preview transparent if avatarImg set','Fix: note toolbar uses btn-ghost, title input without outline']},
    {v:'v3.0.9',date:'12/06/2026',changes:['Settings: full redesign (2-column layout, vertical nav, grouped cards)','Settings: XP card with orange gradient, quick stats grid, redesigned toggle','All tabs: section eyebrow + Syne title','Pomodoro: tabs style consistent with theme','Kanban, Calendar, Habits, Gaming: unified components','Components: nx-tag, nx-divider, empty-state, unified form fields','Upload zone, pinned cards, avatar selector: restyled']},
    {v:'v3.0.8',date:'12/06/2026',changes:['Dashboard: full minimal precision + immersive redesign','New palette black #050507 + orange/red consistent with auth/profile','Ambient background: dust particles + pulsing orange orbs (canvas)','Sidebar: 220px, transparent blur, ultra-subtle nav','Stat cards: invisible at rest, massive mono value, top-line on hover','Panels: near-transparent at rest, orange light thread on hover','Buttons, items, todos, notes, habits, kanban: unified palette','Mobile: responsive overrides kept and improved']},
    {v:'v3.0.7',date:'12/06/2026',changes:['Dashboard: premium dark sidebar (blur, subtle border, orange nav)','Dashboard: topbar with thin border-bottom, revised padding','Dashboard: stat cards glassmorphism + radial spotlight on hover','Dashboard: panels redesigned (ultra-subtle bg, action mono uppercase)','Dashboard: gradient orange/red buttons, ghost and danger restyled','Dashboard: new search bar + orange focus ring','Dashboard: items, links, todos, notes redesigned consistently','Dashboard: profile banner orange accent, enriched gradient']},
    {v:'v3.0.6',date:'12/06/2026',changes:['Profile select: full premium dark UI redesign','Profile select: glassmorphism rectangular cards','Profile select: spotlight effect (light follows mouse)','Profile select: 3D tilt on hover (mouse tracking)','Profile select: ember particles canvas (red/orange embers)','Profile select: Syne title with red/orange gradient accent','Profile select: minimalist bottom actions (mono uppercase)']},
    {v:'v3.0.5',date:'12/06/2026',changes:['Rebrand: ETHONE (name + SVG bolt logo)','New violet/indigo gradient premium palette','Auth: split layout (branding left, form right)','New fonts: Inter + Syne + JetBrains Mono','Fix: template literal bug in profile screen']},
    {v:'v2.6.4',date:'07/06/2026',changes:['Fix Pomodoro stats using UTC instead of local timezone','Fix Today count and streak now accurate in any timezone','Fix Focus time shows decimals (1.5h instead of 1h)','Responsive: new 1200px breakpoint for large tablets','Responsive: improved 768px layout for mobile']},
    {v:'v2.6.3',date:'07/06/2026',changes:['Fix bannerImg not saved to cloud','Fix pomoHistory not in defState (lost on new profile)','Fix defState now includes all fields (habits, kanban, events, pinned, manualBadges, countdown)','Greeting improved: Good night after 22h and before 5h','Gaming subtitle translated to English','All save/load fields verified and complete']},
    {v:'v2.6.2',date:'07/06/2026',changes:['Pomodoro runs in background (tab switching safe)','Timer uses absolute end time via localStorage','Auto-resumes if page reloaded mid-session','Clean CSS keyframe animations on all buttons','Bounce effect on PIN numpad, slide on nav items']},
    {v:'v2.6.1',date:'07/06/2026',changes:['Fix animated background not saved after refresh','Fix sidebar config (order + hidden items) not persisted','Fix compact mode not restored on reload','Fix custom accent color not saved','All profile display preferences now saved to cloud']},
    {v:'v2.6.0',date:'07/06/2026',changes:['Valorant: MVP & Team MVP badges on match cards','ACS (Average Combat Score) per match','First blood stats + damage delta','Winrate graph on last 10 matches','Best match highlight','Stats by agent (WR%, KD, ACS)','Match date on each card','History extended to 20 matches']},
    {v:'v2.5.2',date:'07/06/2026',changes:['Fix 30+ profilee typos in HTML+JS','Fix modal IDs (create-profile)','Fix Steam profileUrl broken link','Fix export/import profiles key','Null checks added in render functions']},
    {v:'v2.5.1',date:'07/06/2026',changes:['Fix sidebar flash on load','Fix weather + QOTD loading timing','Fix refresh buttons showing raw HTML entity code','Fix saveState() replaced by saveStateNow() everywhere','Fix avatar emojis in profile picker']},
    {v:'v2.5.0',date:'07/06/2026',changes:['Pomodoro: animated ring timer','3 mode tabs: Focus 25m / Short Break 5m / Long Break 15m','Session dots showing cycle (4 focus = long break)','Stats: today, total, focus time, day streak','Session history saved to cloud']},
    {v:'v2.4.0',date:'07/06/2026',changes:['Weather widget: 5-day forecast','Current temp, feels like, wind, humidity','Daily icons with max/min and rain probability','Auto-loads on dashboard open via geolocation']},
    {v:'v2.3.0',date:'07/06/2026',changes:['Sidebar customization in Settings','Drag & drop to reorder nav items','Toggle hide/show per item','Compact mode toggle (icons only, 62px)']},
    {v:'v2.2.0',date:'07/06/2026',changes:['8 color themes: Electric Blue, Violet, Emerald, Rose, Amber, Cyan, Pink, Mono','Each theme changes glow, bg, surfaces','4 animated backgrounds: Particles, Aurora, Grid, Waves','Background color syncs with active theme']},
    {v:'v2.1.0',date:'07/06/2026',changes:['Ctrl+K command palette','Search files, tasks, events','Quick actions: Add Task / Event / File','Arrow key navigation + Enter to confirm','Calendar overview updates instantly on add']},
    {v:'v2.0.2',date:'06/06/2026',changes:['Fix sidebar overflow on mobile','Fix refresh buttons showing HTML entities','Fix version on auth screen','Fix empty map icon in Valorant','Fix blurry favicons in Quick Access (sz=64)']},
    {v:'v2.0.1',date:'06/06/2026',changes:['Fix Settings page tabs (missing page wrapper)','Last.fm auto-refresh every 30 seconds','IPv4 + IPv6 both shown in admin panel']},
    {v:'v2.0.0',date:'06/06/2026',changes:['Last.fm: now playing, recent tracks, top artists (7 days)','Last.fm sidebar widget (only shows when playing)','Cloudflare Worker CORS proxy for Last.fm']},
    {v:'v1.9.0',date:'06/06/2026',changes:['Full visual upgrade: electric blue theme','Glassmorphism sidebar, depth shadows, bounce transitions','Gradient logo + page titles','Custom scrollbar']},
    {v:'v1.8.0',date:'06/06/2026',changes:['Overwatch 2 stats via Tracker.gg','Ranks: Tank / DPS / Support with icons','Win rate, KDA, avg elim, time played','Top 5 heroes + Competitive / Quick Play tabs']},
    {v:'v1.7.0',date:'06/06/2026',changes:['Full mobile responsive','Bottom navigation bar (5 tabs)','Sidebar overlay + close on navigate','All grids adapt to single column']},
    {v:'v1.6.0',date:'06/06/2026',changes:['Calendar widget in Overview','Color dots + countdown (Today / Tomorrow / Xd)','Updates live when adding events']},
    {v:'v1.5.3',date:'06/06/2026',changes:['Twitch: up to 3 streamers','Sidebar shows only live streamers','Live card with game + viewer count']},
    {v:'v1.5.0',date:'06/06/2026',changes:['Compare with Friends: Valorant + Steam','Side-by-side stats with winner highlight','Pick from dashboard users or enter manually']},
    {v:'v1.4.0',date:'06/06/2026',changes:['Twitch live status widget','Sidebar badge when streamer is live']},
    {v:'v1.3.2',date:'05/06/2026',changes:['Admin: view any user dashboard','See notes, tasks, files, connections, stats']},
    {v:'v1.3.0',date:'05/06/2026',changes:['Admin panel: expandable user details','IP (IPv4+IPv6), city, country, browser, OS','Login count per user']},
    {v:'v1.2.0',date:'05/06/2026',changes:['Settings My Account: edit username, email, password','Username login with email fallback','Cloud save on import']},
    {v:'v1.1.0',date:'05/06/2026',changes:['Changelog popup','Admin button in sidebar for owner']},
    {v:'v1.0.0',date:'05/06/2026',changes:['Initial release','Multi-profile with avatar + PIN','Discord, Steam, Spotify, Valorant, LoL','Kanban, Habits, Calendar, Tasks, Notes, Stats, Pomodoro']},
  ];
  let html=`<div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">
  <div class="ethone-changelog-shell" style="background:rgba(10,8,14,.97);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:0;width:100%;max-width:560px;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.7)">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0">
      <div>
        <div class="ethone-changelog-title" style="font-size:17px;font-weight:800;letter-spacing:-.02em;font-family:'Syne',sans-serif">Changelog</div>
        <div style="font-size:11px;color:rgba(245,245,247,.3);margin-top:2px;font-family:'JetBrains Mono',monospace">ETHONE Dashboard</div>
      </div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(245,245,247,.4);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s" onmouseover="this.style.background='rgba(248,113,113,.1)';this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,.05)';this.style.color='rgba(245,245,247,.4)'">✕</button>
    </div>
    <!-- Body -->
    <div style="overflow-y:auto;padding:20px 24px;flex:1;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent">`;
  const tagFor=c=>{
    if(/fix|bugfix|corrig/i.test(c)) return '<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:rgba(248,113,113,.15);color:#f87171;font-family:var(--mono);letter-spacing:.04em;flex-shrink:0">FIX</span>';
    if(/i18n|langue|traduct|locali/i.test(c)) return '<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:rgba(129,140,248,.15);color:#818cf8;font-family:var(--mono);letter-spacing:.04em;flex-shrink:0">i18n</span>';
    if(/ui|css|design|style|visuel|modern/i.test(c)) return '<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:rgba(52,211,153,.15);color:#34d399;font-family:var(--mono);letter-spacing:.04em;flex-shrink:0">UI</span>';
    if(/perf|rapide|cache|boot|speed|fast/i.test(c)) return '<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:rgba(251,191,36,.15);color:#fbbf24;font-family:var(--mono);letter-spacing:.04em;flex-shrink:0">PERF</span>';
    return '';
  };
  versions.forEach((v,i)=>{
    const isLatest=i===0;
    const isMajor=v.v.endsWith('.0.0')||v.v.endsWith('.0');
    html+=`<div style="display:flex;gap:14px;margin-bottom:${isLatest?20:14}px;position:relative">
      <!-- Timeline dot -->
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:${isLatest?12:8}px;height:${isLatest?12:8}px;border-radius:50%;margin-top:3px;flex-shrink:0;
          background:${isLatest?'linear-gradient(135deg,#8b5cf6,#7c3aed)':isMajor?'rgba(139,92,246,.5)':'rgba(255,255,255,.15)'};
          box-shadow:${isLatest?'0 0 10px rgba(139,92,246,.5)':'none'}"></div>
        ${i<versions.length-1?`<div style="width:1px;flex:1;margin-top:4px;background:linear-gradient(to bottom,rgba(139,92,246,.${isLatest?'3':'15'}),rgba(255,255,255,.05));min-height:20px"></div>`:''}
      </div>
      <!-- Content -->
      <div style="flex:1;min-width:0;padding-bottom:${i<versions.length-1?'4':'0'}px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:${isLatest?'15':'13'}px;font-weight:800;
            background:${isLatest?'linear-gradient(90deg,#8b5cf6,#7c3aed)':'none'};
            -webkit-background-clip:${isLatest?'text':'unset'};
            -webkit-text-fill-color:${isLatest?'transparent':'unset'};
            color:${isLatest?'unset':isMajor?'rgba(245,245,247,.85)':'rgba(245,245,247,.5)'}">${v.v}</span>
          ${isLatest?'<span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:4px;background:linear-gradient(90deg,rgba(139,92,246,.2),rgba(124,58,237,.2));color:#8b5cf6;font-family:var(--mono);letter-spacing:.08em;border:1px solid rgba(139,92,246,.3)">LATEST</span>':''}
          <span style="font-size:10px;color:rgba(245,245,247,.25);font-family:var(--mono);margin-left:auto">${v.date}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${v.changes.map(c=>`<div style="display:flex;align-items:flex-start;gap:7px;padding:4px 0">
            <span style="color:rgba(139,92,246,.4);font-size:11px;margin-top:1px;flex-shrink:0">▸</span>
            ${tagFor(c)}
            <span style="font-size:12px;color:rgba(245,245,247,.5);line-height:1.45;flex:1">${c}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  });
  html+=`</div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
