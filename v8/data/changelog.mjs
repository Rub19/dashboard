function entry(version, date, title, items) {
  return Object.freeze({
    version,
    date,
    title,
    items: Object.freeze(items.map((item) => Object.freeze({ ...item })))
  });
}

export const CHANGELOG_KIND_ICONS = Object.freeze({
  feature: "sparkles",
  fix: "wrench",
  improvement: "trending-up",
  cleanup: "eraser",
  i18n: "languages"
});

export const CHANGELOG_KIND_LABELS = Object.freeze({
  feature: "Nouveau",
  fix: "Corrige",
  improvement: "Amélioré",
  cleanup: "Nettoyage",
  i18n: "Traduction"
});

export const CHANGELOG = Object.freeze([
  entry("v260", "2026-08-10", "Phase 9 : accessibilite, i18n et stabilite CI", [
    { kind: "improvement", text: "128 traductions manquantes ajoutees (en, es, de) dans le catalogue i18n." },
    { kind: "fix", text: "Barre d'actions groupées du panel de notifications : texte tronque, icônes visibles avec aria-label." },
    { kind: "fix", text: "Correction du script RLS QA pour ne plus exiger de lignes seedees pour les utilisateurs de test." },
    { kind: "fix", text: "Ajout du package.json et mise a jour wrangler.toml pour le worker deploy-status." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v260." }
  ]),
  entry("v259", "2026-08-09", "Phase 9 : stabilite, navigation mobile et error boundaries", [
    { kind: "fix", text: "Correction de la validation GitHub Pages : cache SW v258, lazy-load des pages lourdes et ajustement des budgets JS." },
    { kind: "feature", text: "Barre de navigation mobile avec drawer Applications (bottom nav)." },
    { kind: "improvement", text: "Error boundaries et gestion des erreurs de montage pour eviter les ecrans noirs." },
    { kind: "improvement", text: "Lazy-loading des pages Fichiers, Partage, Drop et Matchs pour ameliorer le demarrage." },
    { kind: "improvement", text: "Chargement paresseux des modules et renforcement du lifecycle." }
  ]),
  entry("v258", "2026-08-08", "ETHONE Cloud : partages, drops, recherche, offline et admin", [
    { kind: "feature", text: "Synchronisation des metadata Drive vers Supabase (ethone_files) avec tags, favoris et resume Brain." },
    { kind: "feature", text: "Recherche cloud full-text sur noms, tags et resume Brain." },
    { kind: "feature", text: "Partages securises (public, prive, mot de passe, expiration, limite de telechargements)." },
    { kind: "feature", text: "Drops pour recevoir des fichiers de tiers sans connexion." },
    { kind: "feature", text: "Pages publiques #/share?slug=... et #/drop?slug=... avec apercu, QR code et drag & drop." },
    { kind: "feature", text: "Analyse Brain sur les fichiers : resume et suggestion de dossier." },
    { kind: "feature", text: "Journal d'activite cloud integre a Activity Hub." },
    { kind: "feature", text: "Cache offline IndexedDB pour metadata, favoris et file d'attente d'uploads." },
    { kind: "feature", text: "Panneau Admin dans Fichiers : dashboard, liste des partages/drops, revocation et nettoyage des expires." },
    { kind: "feature", text: "Cleanup automatique des shares et drops expires via POST /api/cloud/cleanup." },
    { kind: "improvement", text: "Mise a jour du bordereau PWA vers experience-v258." }
  ]),
  entry("v257", "2026-08-07", "Securite et identite par appareil", [
    { kind: "feature", text: "Gestion des appareils : enregistrement, approbation, revocation et suppression." },
    { kind: "feature", text: "Passkeys (WebAuthn) pour la connexion sans mot de passe." },
    { kind: "feature", text: "Fallback OTP par e-mail avec code a 6 chiffres." },
    { kind: "feature", text: "Journal de securite (ethone_security_events) pour auditer connexions et modifications." },
    { kind: "feature", text: "Nouvelle route #/security pour gerer les appareils et consulter le journal." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v257." }
  ]),
  entry("v256", "2026-08-07", "Polish mobile et correction du module Activity", [
    { kind: "fix", text: "Correction d'un ReferenceError sur la page Activity (import manquant de translateSource)." },
    { kind: "improvement", text: "Masquage du raccourci Ctrl+K dans le bouton de recherche topbar sur mobile." },
    { kind: "improvement", text: "Mise a jour du bordereau PWA a experience-v256." }
  ]),
  entry("v255", "2026-08-07", "Correction ecran noir apres connexion sur mobile", [
    { kind: "fix", text: "Correction de l'ecran noir apres connexion sur mobile (TDZ focusTimer dans app-runtime.mjs)." },
    { kind: "fix", text: "Initialisation de focusTimer avant mountShell pour eviter une ReferenceError au demarrage." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v255." }
  ]),
  entry("v254", "2026-08-07", "Notifications, suggestions Brain et import/export configuration", [
    { kind: "feature", text: "Centre de notifications : historique persistant, categories, priorite, badge et panneau." },
    { kind: "feature", text: "Silencieux par categorie pour les notifications avec persistance." },
    { kind: "feature", text: "Suggestions Brain contextuelles sur le dashboard : focus, calendrier, notes." },
    { kind: "feature", text: "Import/export complet de la configuration ETHONE depuis les reglages." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v254." }
  ]),
  entry("v253", "2026-08-07", "Refonte graphique Notes, Tâches et personnalisation du dashboard", [
    { kind: "feature", text: "Nouvelle mise en page centree des Notes sous forme de feuille avec largeur de lecture confortable." },
    { kind: "feature", text: "Vue tableau Kanban sur les Tâches avec colonnes À faire et Terminées." },
    { kind: "feature", text: "Banniere de statistiques sur les Tâches avec jauge circulaire et filtres par priorité." },
    { kind: "feature", text: "Cartes de tâches avec accent de couleur selon la priorite et badges echeance/tag." },
    { kind: "feature", text: "Personnalisation du dashboard : panneau pour masquer/afficher les sections et sauvegarde locale." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v253." }
  ]),
  entry("v252", "2026-08-07", "Corrections affichage LoL : rank, items vides et placeholders", [
    { kind: "fix", text: "Meilleure recuperation du rank LoL depuis l'API Riot et formattage securise (tier + rank)." },
    { kind: "fix", text: "Image de profil LoL desormais en version DDragon a jour." },
    { kind: "fix", text: "Masquage des emplacements d'objets vides dans le scoreboard LoL." },
    { kind: "fix", text: "Traduction de 'Unranked' en 'Non Classé' sur la carte LoL Live." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v252." }
  ]),
  entry("v251", "2026-08-07", "Menu Pomodoro en survol dans le Dock et la barre du haut", [
    { kind: "feature", text: "Popover Focus Timer au survol du bouton Pomodoro du Dock." },
    { kind: "feature", text: "Popover Focus Timer au survol du status Focus de la topbar." },
    { kind: "feature", text: "Actions rapides Pomodoro : demarrer, pause/reprendre, arreter, passer la phase." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v251." }
  ]),
  entry("v250", "2026-08-07", "Recommandations explicables sur le dashboard", [
    { kind: "feature", text: "Carte de recommandation contextuelle sur l'accueil avec titre, detail et raisons justifiant la suggestion." },
    { kind: "feature", text: "Generation de recommandations basee sur les taches, evenements et connexions actives (GitHub + Notion, Spotify, etc.)." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v250." }
  ]),
  entry("v249", "2026-08-07", "Affinement du survol des icones du Dock", [
    { kind: "fix", text: "Suppression du filtre drop-shadow sur le survol des icones du Dock pour eliminer l'effet pixelise." },
    { kind: "improvement", text: "Ombre portee et leger agrandissement de l'icone sur le survol pour un rendu plus net et premium." },
    { kind: "improvement", text: "Bordereau PWA mis a jour vers experience-v249." }
  ]),
  entry("v248", "2026-08-07", "Redesign du Control Center du Dock", [
    { kind: "feature", text: "Nouveau design du Control Center en panneaux groupes avec sections Animations, Ambiance, Pack sonore, Audio, Ambiance sonore et Focus Timer." },
    { kind: "feature", text: "Interrupteurs a glissière pour Aura néon et Sons d'interface." },
    { kind: "feature", text: "Pack sonore et Focus Timer présentés en grille de tuiles avec icones." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v248." }
  ]),
  entry("v247", "2026-08-07", "Centre d'activité intelligent : pagination et actions contextuelles", [
    { kind: "feature", text: "Pagination du flux d'activité avec bouton Charger plus par lots de 15 signaux." },
    { kind: "feature", text: "Actions contextuelles sur chaque entrée : copier le titre, filtrer par catégorie et ouvrir la source associée." },
    { kind: "improvement", text: "Compteur d'activité affichant le nombre de signaux visibles sur le total filtré." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v247." }
  ]),
  entry("v246", "2026-08-07", "Scoreboard LoL type tracker.gg et icônes DDragon", [
    { kind: "feature", text: "Scoreboard détaillé League of Legends enrichi aux stats Riot : objectifs d'équipe (Barons, Dragons, Tours), dégâts subis, dégâts aux objectifs, score de vision, CS/min, GPM et DPM." },
    { kind: "feature", text: "Mise en page tracker.gg du scoreboard LoL avec en-têtes d'équipe colorés et grille par équipe." },
    { kind: "fix", text: "Résolution automatique de la dernière version DDragon et mapping correct des clés de champions pour charger les icônes LoL." },
    { kind: "fix", text: "Icônes de champions, sorts, runes et objets LoL avec fallback DDragon puis CommunityDragon si l'image échoue." },
    { kind: "improvement", text: "Budget JavaScript total ajusté pour accueillir la refonte du scoreboard LoL." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v246." }
  ]),
  entry("v241", "2026-08-07", "Accessibilité commande, cibles tactiles et nettoyage", [
    { kind: "improvement", text: "Bouton d'effacement dans le Command Center avec une cible tactile de 44 px." },
    { kind: "improvement", text: "Cibles tactiles des favoris du Command Center et des contrôles de densité relevées à 44 px." },
    { kind: "improvement", text: "Touch targets minimum 44 px pour dock, topbar et breadcrumb sur écrans ≤ 360 px." },
    { kind: "cleanup", text: "Suppression des scripts one-shot et du fichier temporaire deriveLolDdragonVersion." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v241." }
  ]),
  entry("v242", "2026-08-07", "Commandes intelligentes et actions rapides", [
    { kind: "feature", text: "Barre d'actions rapides sur l'accueil : nouvelle note, tâche, événement, Brain et Pomodoro en un clic." },
    { kind: "improvement", text: "Command Center : les commandes les plus utilisées remontent plus haut grâce au scoring par fréquence." },
    { kind: "improvement", text: "Alias de commandes ajoutés : 'todo', 'note', 'ia', 'rdv', 'cmd' et autres raccourcis naturels." },
    { kind: "improvement", text: "Filtre rapide par catégorie dans le Command Center avec /reglages, /nav, etc." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v242." }
  ]),
  entry("v243", "2026-08-07", "Système de presets d'interface", [
    { kind: "feature", text: "Presets d'interface : Productivité, Focus, Gaming, Créatif, Minimal, Développement." },
    { kind: "feature", text: "Section Presets dans les réglages pour appliquer une ambiance en un clic." },
    { kind: "feature", text: "Sauvegarde de la configuration actuelle et export des presets personnalisés." },
    { kind: "improvement", text: "Le Command Center propose l'activation des presets." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v243." }
  ]),
  entry("v244", "2026-08-07", "Topbar unifiée et cohérente", [
    { kind: "improvement", text: "Tous les boutons de la barre d'outils topbar partagent le même style visuel : bordure, fond, survol et focus." },
    { kind: "improvement", text: "Les status Focus, Brain et Sync conservent leur indicateur coloré dans une forme uniforme." },
    { kind: "improvement", text: "Adaptation tactile pour les contrôles topbar sur mobile." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v244." }
  ]),
  entry("v245", "2026-08-07", "Traductions de la barre d'état et du statut de session", [
    { kind: "fix", text: "Le statut Session chiffrée, Session vérifiée et Session expirée est désormais traduit." },
    { kind: "fix", text: "Les libellés de synchronisation et de sauvegarde de la barre d'état sont localisés." },
    { kind: "improvement", text: "Orthographe et accents corrigés dans les statuts du shell." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v245." }
  ]),
  entry("v240", "2026-08-07", "Corrections LoL, responsive mobile et accessibilité commande", [
    { kind: "fix", text: "Correction de deriveLolDdragonVersion : la version est désormais extraite proprement du gameVersion Riot (fallback 16.15.1)." },
    { kind: "fix", text: "Le widget LoL tente DDragon, CommunityDragon puis l'icône de fallback sans boucle infinie si les images échouent." },
    { kind: "improvement", text: "Breakpoint max-width: 360px pour améliorer topbar, dock, scoreboard et rangées de matchs LoL sur très petits écrans." },
    { kind: "improvement", text: "Le Command Center est de nouveau accessible sous 820 px sous forme d'icône." },
    { kind: "improvement", text: "Budget CSS ajusté pour accueillir la refonte responsive." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v240." }
  ]),
  entry("v239", "2026-08-07", "Améliorations responsive et mobile", [
    { kind: "improvement", text: "Meilleure gestion du mode tactile (iPad, tablettes) avec hover: none dans le touch query." },
    { kind: "improvement", text: "Les actions de ligne restent visibles sur les appareils à pointeur grossier." },
    { kind: "improvement", text: "Breakpoints responsive pour topbar et dock sur petits ecrans." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v239." }
  ]),
  entry("v238", "2026-08-07", "Barres de groupe style tracker.gg sur le scoreboard", [
    { kind: "improvement", text: "La barre colorée de gauche est maintenant plus visible (5px pleine hauteur) et suit la couleur du groupe/party, comme sur tracker.gg." },
    { kind: "improvement", text: "Le joueur et ses coéquipiers de groupe partagent la même couleur de barre." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v238." }
  ]),
  entry("v237", "2026-08-07", "Fallback icône LoL via CommunityDragon et CSP", [
    { kind: "fix", text: "Le widget LoL tente maintenant DDragon puis CommunityDragon pour la photo de profil si l'image échoue." },
    { kind: "fix", text: "Suppression de referrerpolicy='no-referrer' sur l'image du widget LoL." },
    { kind: "improvement", text: "Le Worker renvoie profileIconId pour permettre les fallbacks d'icônes." },
    { kind: "improvement", text: "CSP et headers mis à jour pour autoriser raw.communitydragon.org." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v237." }
  ]),
  entry("v236", "2026-08-07", "Barres colorées par groupe sur le scoreboard Valorant", [
    { kind: "improvement", text: "Chaque groupe/duo a maintenant une barre colorée à gauche de ses membres, avec des couleurs distinctes par party_id." },
    { kind: "improvement", text: "Le groupe du joueur reste bleu, les autres groupes utilisent des couleurs différentes (orange, vert, rouge)." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v236." }
  ]),
  entry("v235", "2026-08-07", "Affiche les duos/groupes adverses sur le scoreboard Valorant", [
    { kind: "feature", text: "Le scoreboard Valorant affiche les autres duos/groupes détectés via party_id (badge DUO/TEAM orange)." },
    { kind: "improvement", text: "Le badge de votre propre groupe affiche PARTY si vous êtes plus de 2." },
    { kind: "improvement", text: "Bordereau PWA mis à jour vers experience-v235." }
  ]),
  entry("v234", "2026-08-07", "Correction images LoL (champions, items, profil)", [
    { kind: "fix", text: "Toutes les images LoL utilisent la version DDragon connue/fallback (16.15.1) au lieu de la version brute du match qui peut ne pas exister." },
    { kind: "fix", text: "Les avatars de profil LoL retombent sur l'icône par défaut si l'icône du compte manque." },
    { kind: "improvement", text: "Bust du cache sessionStorage pour forcer le rechargement des matches avec les images corrigées." },
    { kind: "improvement", text: "Worker redéployé avec les corrections d'images LoL." }
  ]),
  entry("v233", "2026-08-07", "Stabilité LoL, pp/rank widget et déploiement Worker", [
    { kind: "fix", text: "L'historique LoL est de nouveau accessible : DDragon non disponible est géré par fallback, les matchs dont le détail échoue sont ignorés." },
    { kind: "fix", text: "Le widget LoL affiche la photo de profil avec une icône par défaut si celle-ci manque ou échoue." },
    { kind: "improvement", text: "Les appels summoner/league de LoL sont résilients (plus de blocage si une sous-requête échoue)." },
    { kind: "improvement", text: "Déploiement du Worker Cloudflare avec les dernières corrections côté API." }
  ]),
  entry("v232", "2026-08-07", "Plus de matches, cache et correction groupe/DUO", [
    { kind: "feature", text: "L'historique récupère jusqu'à 25 matches pour Valorant et LoL (paramètre size/count augmenté)." },
    { kind: "feature", text: "Mise en cache côté client (sessionStorage) et côté worker (10 min) pour l'historique des matches." },
    { kind: "fix", text: "Le scoreboard n'affiche plus le trait/la pastille de groupe sur tous les joueurs : seuls les vrais membres du groupe sont marqués DUO." },
    { kind: "improvement", text: "Suppression de la pastille colorée inutile devant chaque joueur dans le scoreboard." }
  ]),
  entry("v231", "2026-08-07", "Navigation vers les stats depuis les widgets gaming", [
    { kind: "feature", text: "Un clic sur les widgets League of Legends, Valorant et Apex Legends de l'accueil ouvre désormais la page d'historique des matches." },
    { kind: "fix", text: "Le widget Apex Legends affiche correctement le pseudo au lieu de \"undefined - undefined\"." },
    { kind: "improvement", text: "Les cartes de jeu conservent le retournement dans l'activité, mais naviguent dans l'accueil." }
  ]),
  entry("v230", "2026-08-07", "Runes LoL et keystone dans l'historique", [
    { kind: "feature", text: "La rune clé (keystone) du joueur s'affiche dans la ligne de match LoL et dans le scoreboard détaillé." },
    { kind: "improvement", text: "Chargement des données runesReforged.json depuis Data Dragon pour mapper les runes par version de patch." },
    { kind: "fix", text: "Les assets rune sont normalisés comme les sorts et items (image + nom) dans le worker." }
  ]),
  entry("v229", "2026-08-06", "Détails LoL : sorts, items nommés et scoreboard enrichi", [
    { kind: "feature", text: "Les sorts d'invocateur s'affichent dans la ligne de match LoL et dans le scoreboard détaillé." },
    { kind: "improvement", text: "Le scoreboard LoL affiche le niveau du champion, l'or total et renomme la colonne Score en Dégâts." },
    { kind: "improvement", text: "Tooltips avec le nom de l'item au survol dans la ligne de match et le scoreboard (données Data Dragon)." },
    { kind: "improvement", text: "Chargement des données Data Dragon (summoner.json et item.json) pour enrichir les assets LoL." }
  ]),
  entry("v228", "2026-08-06", "Items LoL versionnés et polish UI", [
    { kind: "fix", text: "Les images de champions et items LoL utilisent désormais la version du patch de la partie au lieu du hardcoded." },
    { kind: "fix", text: "Les 7 emplacements items s'affichent toujours, avec un placeholder quand il n'y a pas d'item." },
    { kind: "improvement", text: "Chargement eager des images pour les 3 premières lignes de matchs LoL." },
    { kind: "improvement", text: "Badge de niveau du champion plus lisible avec z-index et halo visuel." },
    { kind: "fix", text: "Correction du SHA de actions/checkout dans le workflow de déploiement GitHub Pages." }
  ]),
  entry("v227", "2026-08-06", "Tracker LoL : responsive UI et filtre par mode", [
    { kind: "improvement", text: "Responsive UI des matchs LoL : avatar champion, badge niveau, grille adaptative et breakpoints." },
    { kind: "feature", text: "Filtre par mode (ranked, normal, aram) dans l'historique LoL via l'API Riot." },
    { kind: "improvement", text: "Contrôle de concurrence (mapLimit) et tri chronologique pour les détails de matchs LoL." },
    { kind: "improvement", text: "Couverture de tests route pour all, ranked, normal et ARAM." }
  ]),
  entry("v226", "2026-08-06", "Tracker LoL, stats perso et recherche de mate", [
    { kind: "improvement", text: "Profil LoL enrichi avec les stats personnelles calculées sur l'historique (W/L, Win %, KDA, CS/min, DPM, GPM)." },
    { kind: "improvement", text: "Affichage des matchs LoL retravaillé avec CS, dégâts, gold et participation aux kills." },
    { kind: "feature", text: "Barre de recherche de mate sur les pages Valorant et League of Legends." },
    { kind: "improvement", text: "Traductions des nouvelles statistiques et libellés de recherche." }
  ]),
  entry("v225", "2026-08-06", "CSP, tracker Apex et icônes", [
    { kind: "fix", text: "Correction du CSP script-src pour débloquer le chargement des icônes Lucide." },
    { kind: "fix", text: "Correction de la clé de cache des matchs Apex dans le worker Tracker.gg." },
    { kind: "feature", text: "Nouveau rendu des matchs Apex : placement, légende, kills, dégâts, headshots et score." },
    { kind: "improvement", text: "Profil Apex enrichi avec le rank, le level, les kills, les wins, les dégâts et le K/D." },
    { kind: "improvement", text: "Carte Live Now Apex améliorée avec les statistiques overview au verso." }
  ]),
  entry("v224", "2026-08-06", "Accessibilité, i18n et polish des cartes Live Now", [
    { kind: "feature", text: "Les cartes Live Now sont focusables et activables au clavier (Entrée / Espace)." },
    { kind: "improvement", text: "Comportement de flip factorisé dans un helper partagé pour toutes les cartes." },
    { kind: "i18n", text: "Ajout des traductions manquantes et compactage du catalogue i18n." },
    { kind: "improvement", text: "Corrections d'accents et de libellés sur les cartes YouTube, Discord, Steam, Todoist, etc." },
    { kind: "improvement", text: "Respect de prefers-reduced-motion sur le retournement 3D des cartes." }
  ]),
  entry("v223", "2026-08-06", "Flip 3D généralisé sur toutes les cartes Live Now", [
    { kind: "feature", text: "Toutes les cartes Live Now se retournent au clic pour afficher plus de détails au verso." },
    { kind: "improvement", text: "Couleurs de verso harmonisées avec chaque service." }
  ]),
  entry("v222", "2026-08-06", "Flip 3D des cartes Live Now", [
    { kind: "feature", text: "Les cartes Spotify, Discord et Minecraft se retournent au clic pour afficher plus de détails au verso." },
    { kind: "improvement", text: "Styles de verso cohérents avec la charte de chaque service (succès, violet Discord, vert Minecraft)." }
  ]),
  entry("v221", "2026-08-06", "Signout securise et UI premium", [
    { kind: "feature", text: "Endpoint /api/signout worker avec header Clear-Site-Data pour nettoyer cache, cookies et storage au logout." },
    { kind: "improvement", text: "Spotlight interactif qui suit la souris sur les cartes Live Now." },
    { kind: "improvement", text: "Rail de navigation animé : pulse de l'indicateur actif et lift au survol." },
    { kind: "improvement", text: "Augmentation du budget CSS pour les améliorations UI à venir." }
  ]),
  entry("v220", "2026-08-06", "Renforcement securite CSP et navigation", [
    { kind: "fix", text: "CSP : retrait des connexions localhost et restriction des sources de scripts aux URLs exactes des dépendances." },
    { kind: "fix", text: "Ajout de Cross-Origin-Resource-Policy: same-origin pour limiter l'embarquement des ressources." },
    { kind: "fix", text: "Échappement du nom d'icône dans la navigation pour éviter une injection d'attribut." }
  ]),
  entry("v219", "2026-08-06", "Cartes Live Now premium", [
    { kind: "improvement", text: "Effet shine, glow et tilt 3D au survol de toutes les cartes Live Now." },
    { kind: "improvement", text: "Bordure lumineuse et halo d'accent au hover pour un rendu plus premium." }
  ]),
  entry("v218", "2026-08-06", "Dock net et i18n", [
    { kind: "improvement", text: "Icônes du Dock moins pixélisées au survol : scale réduit, icône légèrement agrandie et netteté améliorée." },
    { kind: "fix", text: "Réparation du catalogue i18n après une édition manuelle." }
  ]),
  entry("v217", "2026-08-06", "CSP DDragon et fallback LoL", [
    { kind: "fix", text: "Ajout de ddragon.leagueoflegends.com au CSP pour débloquer les icônes League of Legends." },
    { kind: "fix", text: "Fallback icône épée sur la carte LoL Live Now si l'avatar de profil ne charge pas." }
  ]),
  entry("v216", "2026-08-06", "Minecraft enrichi et animations Live Now", [
    { kind: "feature", text: "Carte Minecraft améliorée avec cape, modèle du skin, UUID copiable et stats de profil." },
    { kind: "improvement", text: "Animations d'entrée et effets de survol sur toutes les cartes Live Now de l'accueil." },
    { kind: "fix", text: "Le worker Minecraft récupère désormais cape, modèle slim/classic et l'URL complète du skin." }
  ]),
  entry("v215", "2026-08-06", "Profils LoL / Apex, Fluidité et Scoreboard Animé", [
    { kind: "feature", text: "En-têtes de profil League of Legends et Apex affichant rang, niveau et statistiques perso en haut de l'historique." },
    { kind: "improvement", text: "Animations d'ouverture/fermeture fluides et skeleton de chargement sur la page des matchs." },
    { kind: "improvement", text: "Chargement asynchrone et différé des images sur la page Matches pour améliorer la fluidité." }
  ]),
  entry("v214", "2026-08-06", "Valorant, LoL et réglages interactifs", [
    { kind: "feature", text: "En-tête de profil Valorant affichant le vrai rang et les statistiques perso (RR, ELO, niveau) en haut de l'historique." },
    { kind: "fix", text: "Correction du chargement des images League of Legends : version DDragon 16.15.1 et normalisation des noms de champions." },
    { kind: "fix", text: "Les options Dock, Home, Space et Densité des Réglages répondent désormais au clic." }
  ]),
  entry("v213", "2026-08-06", "Dock Size : icône, traductions et alignement", [
    { kind: "fix", text: "Remplacement de l'icône manquante 'layout-bottom' par l'icône Lucide 'dock' dans les Réglages et le Command Center." },
    { kind: "i18n", text: "Ajout des traductions manquantes pour les options de taille du Dock (Normal), de style du Dock (Ultra Blur, Subtle) et de Space (Studio)." },
    { kind: "improvement", text: "Alignement uniforme des boutons de taille du Dock avec la classe v8-dock-scale-options." }
  ]),
  entry("v212", "2026-08-06", "Complet i18n settings et dashboard", [
    { kind: "i18n", text: "Ajout des traductions manquantes pour les auras, polices, densités, états vides, raccourcis clavier et catalogues de commandes." },
    { kind: "improvement", text: "L'audit i18n détecte désormais les labels, descriptions, titres et copies des options de réglages." }
  ]),
  entry("v211", "2026-08-06", "Changelog entièrement traduit", [
    { kind: "i18n", text: "Ajout des traductions en anglais, espagnol et allemand pour l'ensemble des Notes de version et de leurs libellés (NEW, FIXED, IMPROVED, etc.)." },
    { kind: "improvement", text: "Ajustement du budget JavaScript de validation pour accueillir le dictionnaire de traductions enrichi." }
  ]),
  entry("v210", "2026-08-06", "Audit i18n et traductions du dashboard", [
    { kind: "improvement", text: "Audit complet du dashboard pour identifier les chaînes non traduites." },
    { kind: "improvement", text: "Ajout de plus de 100 traductions pour le panneau Profil, les Préférences, le Dock, les états vides, le Brain et les pages de l'application." }
  ]),
  entry("v209", "2026-08-06", "Traductions complètes de l'historique de matchs", [
    { kind: "improvement", text: "Ajout des traductions pour toutes les chaînes de l'historique Valorant, League of Legends et Apex (modes, stats, scoreboard, filtres)." },
    { kind: "fix", text: "Les dates relatives sont désormais localisées (ex. \"11h ago\" → \"11h\")." }
  ]),
  entry("v208", "2026-08-06", "Historique League of Legends style Tracker.gg", [
    { kind: "feature", text: "Nouveau rendu des matchs League of Legends : champion, runes, items, KDA, CS/min, DPM, GPM et équipes adverses." },
    { kind: "feature", text: "Scoreboard détaillé LoL avec items, CS, gold et dégâts par joueur." },
    { kind: "improvement", text: "Moyennes de session LoL : Avg KDA, Avg DPM et Avg GPM." }
  ]),
  entry("v207", "2026-08-06", "Historique Valorant : Scoreboard & Séparations", [
    { kind: "fix", text: "Correction de l'encodage du message d'absence de scoreboard (mojibake)." },
    { kind: "improvement", text: "Score final affiché en haut du détail de chaque match." },
    { kind: "improvement", text: "En-têtes d'équipe du scoreboard indiquent le nombre de rounds gagnés et de joueurs." },
    { kind: "improvement", text: "Badges DUO et MOI visibles à côté des noms des joueurs dans le scoreboard." },
    { kind: "improvement", text: "Chevron de dépliage déplacé à côté du score pour une meilleure lisibilité." },
    { kind: "improvement", text: "Séparations renforcées entre les groupes de matchs et les équipes du scoreboard." }
  ]),
  entry("v201", "2026-08-06", "Refonte Backend Valorant & League of Legends", [
    { kind: "feature", text: "Nouveaux clients API (HenrikDev et Riot Games) pour isoler l'acquisition de données Valorant et League of Legends." },
    { kind: "improvement", text: "Refonte de l'onglet Connexions pour configurer vos propres clés API indépendantes (HenrikDev, Riot) au lieu de Tracker.gg." },
    { kind: "fix", text: "Correction de la propagation des événements dans les menus contextuels bloquant les clics externes." },
    { kind: "cleanup", text: "Suppression du parsing et des appels Tracker.gg défectueux (erreurs 403) pour Valorant et League of Legends." }
  ]),
  entry("v200", "2026-08-05", "Historique de Matchs : Bouton retour & Mock Data", [
    { kind: "fix", text: "Le bouton retour de l'historique de matchs renvoie désormais correctement à l'accueil." },
    { kind: "feature", text: "En l'absence du serveur backend tracker, l'historique génère de fausses données (mock) pour simuler la page plutôt que d'afficher 'Failed to fetch'." }
  ]),
  entry("v199", "2026-08-05", "Application de l'Aura au Démarrage", [
    { kind: "fix", text: "Ambiance et Couleurs : L'aura personnalisée et les autres préférences visuelles globales (Typographie, Courbure) sont désormais appliquées dès l'écran de sélection de profil (et non plus seulement après l'entrée dans un Space)." }
  ]),
  entry("v198", "2026-08-05", "Correctif : Toggles Réactifs dans les Réglages", [
    { kind: "fix", text: "Mode Zen, Spotlight, Effets d'ambiance, Flou d'interface, et tous les autres toggles ON/OFF montrent désormais leur état correct immédiatement après le clic — plus besoin de recharger la page." },
    { kind: "fix", text: "Le mécanisme de synchronisation des toggles booléens a été generalisé : chaque switch lit maintenant l'état du store via subscribeState plutôt que l'état initial figé de la page." }
  ]),
  entry("v197", "2026-08-05", "Correctif Critique : Boutons Réglages Réactifs", [
    { kind: "fix", text: "Ambiance Lumineuse (Aura), Typographie et Courbure : Cliquer sur un bouton reflète désormais instantanément la sélection active (indicateur visuel + coche) sans nécessiter de rechargement de page." },
    { kind: "fix", text: "Dock, Accueil, Spaces : Tous les boutons de choix (Taille du Dock, Alignement, Style Verre, Auto-Hide, Grille d'Accueil, Bannière, etc.) montrent maintenant correctement l'état actif et se mettent à jour en temps réel à chaque clic." },
    { kind: "fix", text: "Architecture du store : Les actions Aura, Police et Courbure déclenchent désormais une mise à jour du store d'état, ce qui déclenche la réactivité de l'interface via subscribeState." }
  ]),
  entry("v196", "2026-08-05", "Historique de Matchs Premium & Fluide", [
    { kind: "feature", text: "Page d'Historique de Matchs : Vos statistiques Valorant, League of Legends et Apex s'affichent désormais sur une page dédiée ultra-détaillée (style Tracker.gg) avec filtres par mode de jeu, regroupement par date et calculs agrégés de vos performances (K/D, ACS, DDΔ, etc.)." },
    { kind: "improvement", text: "Navigation instantanée des cartes : Suppression de l'ancien effet 3D (flip) sur les cartes Riot et Tracker au profit d'un clic direct vers votre historique complet." },
    { kind: "fix", text: "Lecteur Spotify : La barre de progression a été entièrement réécrite (requestAnimationFrame) pour un affichage parfaitement fluide, sans aucun clignotement ou saccade." }
  ]),
  entry("v195", "2026-08-05", "Interactive Widgets, Transitions Fluides & Auto-Hide", [
    { kind: "feature", text: "Dynamic Island Extensible : l'île de focus s'agrandit d'un simple clic pour révéler plus de détails, et se masque automatiquement après 30s de pause pour dégager votre vue." },
    { kind: "feature", text: "Transitions Fluides (View Transitions) : la navigation entre les pages s'effectue désormais avec un fondu croisé cinématographique natif pour un confort visuel optimal." },
    { kind: "feature", text: "Dock Auto-hide Intelligent : le dock peut se cacher avec une zone de détection repensée, réagissant instantanément dès que votre souris approche le bord de l'écran." },
    { kind: "feature", text: "Cartes Riot Games Interactives (3D) : vos statistiques League of Legends et Valorant se présentent sous forme de cartes qui se retournent au clic." },
    { kind: "feature", text: "Aura Musicale Réactive : lorsque vous écoutez Spotify, l'Aura d'arrière-plan pulse subtilement pour une immersion parfaite." }
  ]),
  entry("v194", "2026-08-05", "Control Center, Focus Island & Animations Premium", [
    { kind: "feature", text: "Nouveau Control Center : séparation des paramètres d'environnement (Aura, Son, Focus) dans un panneau flottant dédié avec effet Glassmorphism, accessible depuis le Dock." },
    { kind: "feature", text: "Focus Timer (Dynamic Island) : le minuteur Pomodoro et Deep Work s'affiche désormais sous forme d'île dynamique animée en haut de l'écran avec contrôles rapides (play/pause/stop)." },
    { kind: "improvement", text: "Effets de survol (Hover Glow) premium ajoutés aux boutons du Control Center et du Dock pour un rendu organique et interactif." },
    { kind: "fix", text: "Les boutons avec de longs textes dans le Dock ne cassent plus la mise en page, grâce à une grille optimisée (wrap et scroll)." }
  ]),
  entry("v189", "2026-08-04", "Comptes uniques isolés, Studio d'ambiance visuelle & Correction des onglets Réglages", [
    { kind: "feature", text: "Multi-comptes avec isolation complète : séparation stricte et persistante des tâches, notes et profils pour chaque compte en ligne, avec avatar unique et synchronisation cloud Supabase dédiée." },
    { kind: "feature", text: "Studio d'ambiance visuelle (Réglages > Apparence) : 6 Auras lumineuses (Classic, Cyber, Sunset, Emerald, Monolith, Royal), 4 styles typographiques (Inter, Outfit, Fira Code, System) et 3 échelles de courbure (Arrondi, Subtil, Sharp)." },
    { kind: "feature", text: "Badge de Mode de Session dans l'Accueil : pilule interactive sur la bannière Hero affichant l'environnement actif (Personnel, Focus, Studio) avec bascule instantanée en un clic." },
    { kind: "feature", text: "Accès universel aux Notes de version : ouverture directe du Changelog depuis le panneau Profil, les Réglages (onglets Profil & Système) et le Command Center (Ctrl+K)." },
    { kind: "fix", text: "Stabilité des Réglages : correction d'un bug qui forçait le retour à l'onglet Profil lors de la modification des paramètres d'apparence ; vos onglets restent 100% stables." }
  ]),
  entry("v187", "2026-08-04", "Compte Switcher, Horloges mondiales & Focus Express", [
    { kind: "feature", text: "Panneau Profil multi-comptes : le panneau latéral Profil liste désormais tous les environnements (comptes) de la session avec un bouton 'Basculer' pour changer instantanément de profil, sans fermer ni recharger l'application." },
    { kind: "feature", text: "Horloges & Hubs mondiaux dans le panneau Widgets : grille de 4 horloges (Paris, New York, Tokyo, San Francisco) avec indication Jour/Nuit, mise à jour en temps réel — cliquer copie l'heure dans le presse-papier." },
    { kind: "feature", text: "Focus Express (Pomodoro) dans le panneau Widgets : minuteur intégré avec modes 25 min Focus / 5 min Pause, barre de progression animée et notification sonore (launch cue) à la fin de la session." },
    { kind: "improvement", text: "Deux nouveaux sons ajoutés au catalogue audio : focus.complete (confirmation sonore en fin de session Pomodoro) et profile.switch (retour sonore lors du changement de compte)." }
  ]),
  entry("v186", "2026-08-04", "Suite Premium, concentration Zen, fluidité et audit i18n 100%", [
    { kind: "feature", text: "Suite de fonctionnalités Premium & Concentration : Mode Zen (Alt+Z) pour masquer instantanément l'en-tête et le Dock pour un focus maximal, et nouveau sélecteur de taille du Dock (Compacte, Normale, Grande) dans les Réglages." },
    { kind: "feature", text: "Recherche Type-to-Select et Lecture : navigation fluide par saisie clavier directe dans les listes de fichiers et de tâches (sélection automatique de l'élément correspondant), et barre de progression de lecture avec estimation du temps sur les Notes." },
    { kind: "feature", text: "Badges Discord dans Live Now : affichage direct des badges officiels (Nitro, HypeSquad, Active Developer, Staff, Partner, etc.) et personnalisés sur votre carte Discord Live Now avec tooltips et micro-animations au survol." },
    { kind: "improvement", text: "Audit sonore complet et Audio Interactive : retour sonore enrichi à 100% sur toutes les actions de navigation, changements d'onglets, toggles et boutons interactifs de l'interface avec gestion intelligente des fallbacks et respect des préférences spatiales." },
    { kind: "improvement", text: "Command HUD (Ctrl+K) et Design Ultra-Aesthetic : affichage de badges de catégorie colorés pour chaque commande, effets Glassmorphism premium, lueur ambiante sur le Dock flottant et l'en-tête, et micro-élévations dynamiques au survol." },
    { kind: "improvement", text: "Navigation au clavier et fluidité : raccourcis numériques (touches 1 à 9) pour basculer instantanément entre les pages de l'application, et préchargement transparent de l'assistance Brain en arrière-plan (requestIdleCallback)." },
    { kind: "i18n", text: "Audit intégral de l'internationalisation : vérification complète et prise en charge à 100% des nouvelles clés de concentration, de taille du Dock, des temps de lecture et des notifications dans les 4 langues (français, anglais, espagnol, allemand)." }
  ]),
  entry("v185", "2026-08-01", "Traductions completées : plus de 200 textes réparés", [
    { kind: "fix", text: "23 traductions incorrectes ou copiées-collées d'une langue à l'autre corrigées (ex : \"Dossier\" traduit par \"File\" en anglais, un message d'arrêt d'ETHONE traduit par \"arrested\" au lieu de \"stopped\")." },
    { kind: "i18n", text: "Plus de 60 messages jamais traduits ont rejoint le dictionnaire : notifications de tâches et de notes, connexions aux services (GitHub, Google, Notion, Spotify, Todoist, Google Drive, YouTube, Reddit), sections des Préférences Brain, et libellés de l'accueil et du Dock. Ils s'affichaient en français brut quel que soit la langue choisie." },
    { kind: "fix", text: "Une dizaine d'accents manquants supplémentaires corrigés (\"chargé\", \"déranger\", \"démarrer\", \"réorganiser\"...) découverts pendant cette passe." }
  ]),
  entry("v184", "2026-08-01", "Recherches plus fluides", [
    { kind: "fix", text: "Command HUD (Ctrl+K) : chaque frappe relançait immédiatement un calcul de pertinence sur toutes les commandes, dans les 4 langues. Léger lissage ajouté pour éviter les à-coups en tapant vite." },
    { kind: "fix", text: "La recherche dans l'historique Brain reconstruisait aussi tout l'onglet Chat à chaque frappe, sans rapport avec la recherche. Séparé et lissé." },
    { kind: "fix", text: "Renommer une note reparcourait toute la liste affichée à chaque frappe pour retrouver la bonne ligne. Ciblage direct désormais." }
  ]),
  entry("v183", "2026-08-01", "Textes qui se chevauchaient : corrigés", [
    { kind: "fix", text: "Les menus contextuels (clic droit / actions sur une ligne) pouvaient afficher un intitulé long sur plusieurs lignes qui débordait par-dessus l'option suivante au lieu de le raccourcir avec des points de suspension. Corrigé sur les deux systèmes de menu de l'application." },
    { kind: "fix", text: "Même souci sur le fil d'Ariane (en-tête), les titres des choix de thème et de densité dans les Préférences, les libellés du panneau \"Personnaliser\" de l'accueil et d'Activity, les onglets de la fiche connexion, et les liens de ressources compacts : le texte pouvait s'étirer ou se couper au milieu d'un caractère au lieu de se terminer proprement par \"…\"." }
  ]),
  entry("v182", "2026-08-01", "163 traductions cassées réparées", [
    { kind: "fix", text: "En corrigeant les accents manquants la semaine dernière, 163 textes ont perdu leur traduction anglais/espagnol/allemand sans que ça se voie en français : le correctif changeait le texte affiché mais pas la clé interne utilisée pour retrouver sa traduction, qui devait rester identique au caractère près. Recherché et réparé un par un dans tout le catalogue." },
    { kind: "fix", text: "22 entrées du dictionnaire de traduction étaient dupliquées (souvent avec des traductions légèrement différentes) ; seule la plus récente comptait vraiment, les autres étaient invisibles et trompeuses. Nettoyées." }
  ]),
  entry("v181", "2026-08-01", "Densité d'affichage sur le Calendrier", [
    { kind: "improvement", text: "Le Calendrier propose désormais le même réglage de densité (automatique, confortable, compacte) que Tasks, Notes, Files, Activity et Connections. Il était déjà sensible à ce réglage global, il manquait juste le bouton pour le changer depuis cette page." }
  ]),
  entry("v180", "2026-08-01", "Préférences : de vraies sections, une à la fois", [
    { kind: "fix", text: "Les 7 sections des Préférences (Profil, Apparence, Brain, Sons, Workspace, Système, Developer) ressemblaient à des onglets mais s'affichaient toutes en même temps, empilées sur toute la hauteur de la page. Un seul onglet s'affiche désormais à la fois, avec navigation complète au clavier (flèches haut/bas, Début/Fin)." }
  ]),
  entry("v179", "2026-08-01", "Catalogue de connexions moins chargé", [
    { kind: "improvement", text: "Chaque carte du catalogue de connexions n'affiche plus qu'un seul bouton principal (plus Déconnecter si besoin) au lieu de 4 actions côte à côte. Changer de méthode et lancer un diagnostic restent disponibles en un clic, dans la fiche détaillée." }
  ]),
  entry("v178", "2026-08-01", "Personnalisez vos widgets Live Now sur l'accueil", [
    { kind: "feature", text: "Bouton \"Personnaliser\" au-dessus des cartes Live Now de l'accueil : réordonnez chaque widget (Spotify, Discord, Minecraft...) ou masquez ceux qui ne vous intéressent pas, comme sur la page Activity." },
    { kind: "improvement", text: "Vos préférences d'ordre et de visibilité sont sauvegardées et synchronisées avec votre compte, comme le reste de vos réglages." }
  ]),
  entry("v177", "2026-08-01", "Minecraft réparé et centaines d'accents manquants corrigés", [
    { kind: "fix", text: "Minecraft ne s'affichait plus jamais dans Live Now : Mojang a fermé en 2023 l'API que le Worker utilisait pour retrouver un pseudo. Bascule vers un miroir maintenu qui répond exactement au même format." },
    { kind: "fix", text: "Riot Games (Valorant / League of Legends) affichait un message vague \"backend sécurisé requis\" même quand la connexion échouait pour une autre raison ; le message nomme désormais précisément ce qui manque (ex : votre clé API Tracker.gg)." },
    { kind: "fix", text: "Des centaines de mots français affichés sans accent (é, è, à, ê, ç...) dans les guides de connexion, les notifications et les libellés de l'interface ont été corrigés pour une lecture plus naturelle." }
  ]),
  entry("v176", "2026-08-01", "Accent personnalisé et accueil désencombré", [
    { kind: "feature", text: "Nouveau sélecteur de couleur d'accent personnalisée dans les Préférences : choisissez n'importe quelle couleur (pas seulement les 5 presets) et elle se propage instantanément à toute l'interface." },
    { kind: "fix", text: "Les swatches d'accent (presets et personnalisé) reflètent désormais correctement l'accent actif en toutes circonstances, un décalage d'affichage préexistant." },
    { kind: "improvement", text: "Les cartes Live Now de l'accueil sont regroupées dans une grille compacte à plusieurs colonnes au lieu de s'empiler verticalement sur toute la hauteur de la page." }
  ]),
  entry("v163 - v175", "2026-07-31 -> 2026-08-01", "Correctifs Live Now : ancrage du badge, Riot Games et Minecraft", [
    { kind: "fix", text: "Le badge \"Actualisé à\" des cartes Live Now s'ancre désormais précisément dans le coin de la carte, même quand une carte voisine plus haute étirait la grille." },
    { kind: "fix", text: "Riot Games (Valorant / League of Legends) ne reste plus bloqué sur \"En préparation\" après une reconnexion : la vérification automatique post-configuration couvre désormais ce type de connexion." },
    { kind: "fix", text: "Suppression d'une carte générique redondante qui s'affichait en double pour Riot Games sur la page Activité." }
  ]),
  entry("v159 - v162", "2026-07-31", "Connexions fiables et Automations traduites", [
    { kind: "fix", text: "Les connexions \"publiques\" (Météo, Minecraft, profil Twitch public) s'activent désormais automatiquement des l'enregistrement, au lieu d'exiger un clic cache sur \"Tester\" pour passer a l'état connecté." },
    { kind: "cleanup", text: "Suppression du backend Henrik / Riot API, code mort jamais appelé depuis le passage a Tracker.gg pour Valorant et League of Legends." },
    { kind: "i18n", text: "Traduction complète (EN / ES / DE) du selecteur de Thème, de l'onglet Automations, du détail météo et du badge de fraîcheur des cartes Live Now." }
  ]),
  entry("v153 - v158", "2026-07-31", "Correctifs mobile et nettoyage du guide Riot", [
    { kind: "fix", text: "Le badge \"Actualisé a\" ne chevauche plus le texte des cartes Live Now, sur mobile comme sur desktop." },
    { kind: "improvement", text: "Onze cartes Live Now supplementaires (Minecraft, Steam, Google Calendar, Todoist, LoL, Twitch, Last.fm, Tracker.gg, Google Drive, YouTube, Reddit) se compactent désormais proprement sur petit écran." },
    { kind: "fix", text: "Le guide de connexion Riot Games décrivait a tort un passage par Tracker.gg pour une clé qui n'était jamais utilisée ; le guide reflète maintenant l'intégration reelle." },
    { kind: "feature", text: "Un vrai moteur d'automatisation dans Brain : créez des règles (\"a l'ouverture d'une page\", \"au passage vers un Space\", \"a une heure précise\") qui déclenchent un changement de Space, de densité ou de thème." }
  ]),
  entry("v148 - v152", "2026-07-30", "Thème clair, popup météo et catalogue allégé", [
    { kind: "feature", text: "Nouveau mode \"Jour\" (clair) et mode \"Automatique\" qui suit les préférences système, avec un selecteur visuel a swatches de couleurs comme le Density Engine." },
    { kind: "feature", text: "Cliquer sur la carte météo ouvre désormais un détail complet (prévisions sur 3 jours, vent, humidité) au lieu d'un texte tronqué." },
    { kind: "fix", text: "La recherche de ville météo réessaie automatiquement avec des tirets (\"Brive-la-Gaillarde\") quand le nom simple ne trouve aucun résultat." },
    { kind: "cleanup", text: "Retrait des intégrations redondantes ou impossibles a livrer : Apple Music, Google Docs, Google Tasks, Battle.net, YouTube Music, Google Photos, Health Connect." }
  ]),
  entry("v143 - v147", "2026-07-29", "Brain prend vie et vraies icônes de marque", [
    { kind: "feature", text: "Brain peut désormais répondre via un vrai modele d'IA (Groq, gratuit) au lieu d'un mode contextuel simule sans génération de texte." },
    { kind: "improvement", text: "Les cartes Live Now affichent les vraies icônes de marque (Discord, Steam, Spotify, Notion, Reddit, Todoist, Google Drive, Google Calendar, Last.fm, Valorant, League of Legends) au lieu d'icônes génériques." },
    { kind: "feature", text: "Contrôle de lecture Spotify (lecture, pause, suivant, précédent) directement depuis la carte Live Now." }
  ]),
  entry("v132 - v142", "2026-07-28 -> 2026-07-29", "Dix nouvelles intégrations Live Now", [
    { kind: "feature", text: "Valorant, League of Legends, Twitch, Last.fm, Tracker.gg (Apex Legends), Reddit, YouTube et Google Drive rejoignent Live Now." },
    { kind: "improvement", text: "Presence Discord en temps reel via WebSocket (Lanyard) au lieu d'un sondage périodique — les mises a jour sont désormais instantanées." },
    { kind: "fix", text: "Connexions OAuth GitHub, Google Calendar, Notion, Todoist et Spotify (PKCE) entièrement câblées, chacune avec sa carte Live Now dédiée." }
  ]),
  entry("v107 - v131", "2026-07-15 -> 2026-07-27", "Fondations de l'experience V8", [
    { kind: "feature", text: "Refonte complète de l'authentification (connexion, inscription, mot de passe oublié) et nouvel écran de demarrage ETHONE." },
    { kind: "improvement", text: "Améliorations générales de performance de l'interface et premières cartes Live Now (Discord, Météo, Steam)." }
  ])
]);

export function latestChangelogVersion() {
  return CHANGELOG[0]?.version || "";
}
