export interface TrackerTranslations {
  hub: string;
  wip: string;
  live: string;
  beta: string;
  valorant: string;
  lol: string;
  tft: string;
  vctPickems: string;
  liveMatch: string;
  coachIa: string;
  telemetry: string;
  training: string;

  riotIdPlaceholder: string;
  riotTagPlaceholder: string;
  analyze: string;
  scanning: string;

  refresh: string;
  compare: string;
  notConnected: string;
  connected: string;
  noProfile: string;
  unrated: string;
  matches: string;
  match: string;
  victory: string;
  defeat: string;
  draw: string;

  kdRatio: string;
  winRate: string;
  combatScoreAcs: string;
  headshotPrecision: string;
  rankProgression: string;
  avgPerRound: string;
  eliteTier: string;

  topCompetitiveAgents: string;
  recentAgents: string;
  noAgent: string;
  duelWinrate: string;

  shootingTelemetryImpact: string;
  impactDistribution: string;
  head: string;
  body: string;
  legs: string;
  firstDuelWinrate: string;
  crosshairAboveAverage: string;

  competitiveMatchHistory: string;
  last5Matches: string;
  allQueues: string;
  competitiveQueue: string;
  unratedQueue: string;
  swiftplayQueue: string;
  spikeRushQueue: string;
  deathmatchQueue: string;
  noMatchFound: string;
  searchPrompt: string;

  valEmptyTitle: string;
  valEmptyDesc: string;
  valPerfTitle: string;
  valPerfDesc: string;
  valTelemTitle: string;
  valTelemDesc: string;
  valCoachTitle: string;
  valCoachDesc: string;
  valLoadingTitle: string;
  valLoadingDesc: string;

  lolEmptyTitle: string;
  lolEmptyDesc: string;
  lolKdaTitle: string;
  lolKdaDesc: string;
  lolDpmTitle: string;
  lolDpmDesc: string;
  lolKpTitle: string;
  lolKpDesc: string;
  lolLoadingTitle: string;
  lolLoadingDesc: string;
  lolAverageKda: string;
  lolDpm: string;
  lolKp: string;
  lolMatchesAnalyzed: string;
  lolRecentMatches: string;

  tftModuleTitle: string;
  tftModuleDesc: string;
  tftConfigKeyBtn: string;

  coachDiagnosticTitle: string;
  coachDiagnosticActive: string;
  coachEvalPrefix: string;
  coachPendingTitle: string;
  coachPendingDesc: string;
  coachArchetype: string;
  coachStrength: string;
  coachWeakness: string;
  coachRecommendations: string;
  coachRoutineBtn: string;

  trainingPlanTitle: string;
  trainingPendingTitle: string;
  trainingPendingDesc: string;
  trainingRoutineFor: string;
  phase1Title: string;
  phase1Desc: string;
  phase2Title: string;
  phase2Desc: string;
  phase3Title: string;
  phase3Desc: string;

  telemHeaderTitle: string;
  telemPendingTitle: string;
  telemPendingDesc: string;
  telemTotalKills: string;
  telemTotalDeaths: string;
  telemHeadPrecision: string;
  telemOverallAdr: string;
  telemSpreadTitle: string;
  telemHeadshots: string;
  telemBodyshots: string;
  telemLegshots: string;
  telemMapTitle: string;
  telemNoMap: string;

  liveHeaderTitle: string;
  liveSubtitleWithId: string;
  liveSubtitleGeneric: string;
  liveCheckBtn: string;
  liveCheckingBtn: string;
  liveNoSessionTitle: string;
  liveNoSessionDesc: string;
  liveLocalVanguardTitle: string;
  liveLocalVanguardDesc: string;
  liveRealRoundTitle: string;
  liveRealRoundDesc: string;
  liveFairPlayTitle: string;
  liveFairPlayDesc: string;

  vctScorePickems: string;
  vctAccuracy: string;
  vctSavedPickems: string;
  vctSavedLocally: string;
  vctUpcomingTab: string;
  vctResultsTab: string;
  vctMyPickemsTab: string;
  vctSearchPlaceholder: string;
  vctEditionLabel: string;
  vctAllCompetitions: string;
  vctAll: string;

  footerCompliance: string;
  footerNotAffiliated: string;
  footerLegalDesc: string;
  footerCreditsBtn: string;
  footerApiKeyBtn: string;
  footerNoticeTitle: string;
  footerNoticeBody: string;
  footerPrivacyTitle: string;
  footerPrivacyBody: string;
  footerPrivacyBadge: string;

  siteVersion: string;
  siteVersionLabel: string;
  updateBannerTag: string;
  updateBannerHeadline: string;
  updateBannerDesc: string;
  updateBannerBtn: string;
  patchNotesTitle: string;
  patchNotesBadge: string;
  patchNotesDesc: string;
  patchNotesClose: string;

  coachChatTitle: string;
  coachChatSubtitle: string;
  coachChatReset: string;
  coachChatDiagnostic: string;
  coachChatPlaceholder: string;
  coachChatSend: string;
  coachChatThinking: string;
  coachChatPromptsLabel: string;
  coachPrompt1: string;
  coachPrompt2: string;
  coachPrompt3: string;
  coachPrompt4: string;
  coachPrompt5: string;
}

export const TRACKER_TRANSLATIONS: Record<"fr" | "en", TrackerTranslations> = {
  fr: {
    hub: "Hub",
    wip: "WIP",
    live: "LIVE",
    beta: "Bêta",
    valorant: "VALORANT",
    lol: "LoL",
    tft: "TFT",
    vctPickems: "VCT & Pick'ems",
    liveMatch: "Partie en direct",
    coachIa: "Coach IA",
    telemetry: "Télémétrie",
    training: "Entraînement",

    riotIdPlaceholder: "Riot ID",
    riotTagPlaceholder: "TAG",
    analyze: "Analyser",
    scanning: "Scan...",

    refresh: "Actualiser",
    compare: "Comparer",
    notConnected: "— Non connecté",
    connected: "Riot Games · Connecté",
    noProfile: "Aucun profil",
    unrated: "Non classé",
    matches: "parties",
    match: "partie",
    victory: "Victoire",
    defeat: "Défaite",
    draw: "Égalité",

    kdRatio: "Ratio K/D",
    winRate: "Taux de Victoire",
    combatScoreAcs: "Score Combat ACS",
    headshotPrecision: "Précision Tête (HS)",
    rankProgression: "Progression de Rang",
    avgPerRound: "Moyenne par manche",
    eliteTier: "Tier Élite · Vandal / Phantom",

    topCompetitiveAgents: "Top Agents Compétitifs",
    recentAgents: "agents récents",
    noAgent: "Aucun agent",
    duelWinrate: "Victoires en duel",

    shootingTelemetryImpact: "Télémétrie de Tir & Impact",
    impactDistribution: "Localisation des impacts",
    head: "Tête",
    body: "Corps",
    legs: "Jambes",
    firstDuelWinrate: "Victoires 1er duel",
    crosshairAboveAverage: "Alignement réticule supérieur à la moyenne",

    competitiveMatchHistory: "Journal des Matchs Compétitifs",
    last5Matches: "5 dernières parties officielles",
    allQueues: "Toutes files",
    competitiveQueue: "Compétitif",
    unratedQueue: "Non classé",
    swiftplayQueue: "Swiftplay",
    spikeRushQueue: "Spike Rush",
    deathmatchQueue: "Deathmatch",
    noMatchFound: "Aucun match trouvé",
    searchPrompt: "Recherchez un Riot ID ci-dessus pour charger l'historique complet des parties.",

    valEmptyTitle: "Aucun profil VALORANT sélectionné",
    valEmptyDesc: "Saisissez votre Riot ID et votre TAG dans la barre ci-dessus puis cliquez sur « Analyser » pour charger vos statistiques compétitives officielles, votre télémétrie de tir et votre historique de parties.",
    valPerfTitle: "Performances",
    valPerfDesc: "ACS officiel, ratio K/D, taux de victoire et suivi précis de la progression de rang et des RR.",
    valTelemTitle: "Télémétrie",
    valTelemDesc: "Précision anatomique calculée (tête, corps, jambes) et analyse des engagements round par round.",
    valCoachTitle: "Coach Tactique",
    valCoachDesc: "Diagnostic de style de jeu, détection des points faibles et plan d'entraînement adapté.",
    valLoadingTitle: "Analyse du profil en cours...",
    valLoadingDesc: "Synchronisation des statistiques compétitives et des matchs récents via l'API officielle.",

    lolEmptyTitle: "Aucun invocateur League of Legends sélectionné",
    lolEmptyDesc: "Saisissez votre Riot ID et votre TAG dans la barre ci-dessus puis cliquez sur « Analyser » pour charger votre KDA moyen, vos dégâts par minute et l'historique de vos parties récentes.",
    lolKdaTitle: "KDA & Impact",
    lolKdaDesc: "Ratio KDA moyen, éliminations, morts et assistances cumulées sur les dernières parties.",
    lolDpmTitle: "Dégâts / Minute",
    lolDpmDesc: "Volume de dégâts infligés aux champions calculé par minute de jeu.",
    lolKpTitle: "Kill Participation",
    lolKpDesc: "Taux d'implication dans les prises d'objectifs et les éliminations collectives.",
    lolLoadingTitle: "Analyse de l'Invocateur en cours...",
    lolLoadingDesc: "Récupération de l'historique de match SoloQ et Flex via l'API Riot Games.",
    lolAverageKda: "KDA Moyen",
    lolDpm: "Dégâts / Minute",
    lolKp: "Kill Participation",
    lolMatchesAnalyzed: "Parties analysées :",
    lolRecentMatches: "Parties Récentes League of Legends",

    tftModuleTitle: "Module Teamfight Tactics",
    tftModuleDesc: "L'intégration des données de match TFT (compositions d'unités, synergies d'équipe et classements de fin de manche) requiert la configuration d'une clé API Riot Games personnalisée.",
    tftConfigKeyBtn: "Configurer la Clé API Riot",

    coachDiagnosticTitle: "Diagnostic Tactique Coach IA",
    coachDiagnosticActive: "Analyse active",
    coachEvalPrefix: "Évaluation basée sur",
    coachPendingTitle: "Diagnostic Tactique Coach IA en attente",
    coachPendingDesc: "Le Coach IA requiert au moins une partie compétitive enregistrée pour analyser votre style de jeu, l'efficacité de vos engagements et la rentabilité de vos achats. Recherchez un Riot ID ci-dessus pour lancer l'audit.",
    coachArchetype: "Archétype",
    coachStrength: "Point Fort Majeur",
    coachWeakness: "Axe d'Amélioration",
    coachRecommendations: "Recommandations Tactiques Personnalisées",
    coachRoutineBtn: "Routine d'entraînement",

    trainingPlanTitle: "Plan d'Entraînement Personnalisé · Coach IA",
    trainingPendingTitle: "Plan d'Entraînement en Attente",
    trainingPendingDesc: "Synchronisez un profil VALORANT ci-dessus pour générer une routine d'entraînement adaptée à votre agent favori et votre niveau actuel.",
    trainingRoutineFor: "Routine ciblée",
    phase1Title: "Phase 1 : Calibrage Mécanique & Placement de Réticule (10 min)",
    phase1Desc: "Éliminez 50 bots en mode Entraînement avec Vandal sans vous accroupir. Focus sur le micro-ajustement horizontal à hauteur de tête avant de tirer la première balle.",
    phase2Title: "Phase 2 : Prise d'Espace & Duels sous Pression (15 min)",
    phase2Desc: "Entraînez les entrées de site agressives avec vos capacités d'utilitaires posées pour briser la ligne ennemie et forcer un duel avantageux.",
    phase3Title: "Phase 3 : Débriefing & Suivi des Crédits (5 min)",
    phase3Desc: "Vérifiez vos rounds d'économie sur la télémétrie post-match. Assurez-vous d'avoir acheté au moins 3 utilitaires clés sur les rounds armés.",

    telemHeaderTitle: "Télémétrie de Combat Post-Match · VALORANT",
    telemPendingTitle: "Télémétrie en attente de données",
    telemPendingDesc: "Aucune partie VALORANT n'a été enregistrée pour ce joueur. Entrez un Riot ID valide ci-dessus pour calculer l'analyse balistique, la précision anatomique et les ratios de duel réels.",
    telemTotalKills: "Éliminations Totales",
    telemTotalDeaths: "Morts Totales",
    telemHeadPrecision: "Précision Tête",
    telemOverallAdr: "ADR Global",
    telemSpreadTitle: "Répartition Anatomique des Tirs",
    telemHeadshots: "Tirs à la tête (HS)",
    telemBodyshots: "Tirs au corps",
    telemLegshots: "Tirs aux jambes",
    telemMapTitle: "Performance par Carte",
    telemNoMap: "Aucune carte disponible",

    liveHeaderTitle: "Partie en Direct (WIP)",
    liveSubtitleWithId: "Suivi de session en temps réel pour",
    liveSubtitleGeneric: "Suivi de session en temps réel via le client local VALORANT.",
    liveCheckBtn: "Vérifier le client VALORANT",
    liveCheckingBtn: "Recherche de session...",
    liveNoSessionTitle: "Aucune session de jeu active détectée",
    liveNoSessionDesc: "Le tracker de match en direct est actuellement en phase WIP. Pour synchroniser la télémétrie en manche réelle, démarrez VALORANT sur votre ordinateur et entrez dans une partie personnalisée, non classée ou compétitive.",
    liveLocalVanguardTitle: "Détection Locale Vanguard",
    liveLocalVanguardDesc: "Synchronisation instantanée avec le client officiel VALORANT en local dès le début de la première manche de votre partie.",
    liveRealRoundTitle: "Télémétrie en Manche Réelle",
    liveRealRoundDesc: "Suivi automatisé de l'économie d'équipe, des points d'ultime, des scores de combat et du statut du Spike round après round.",
    liveFairPlayTitle: "Conformité Fair-Play",
    liveFairPlayDesc: "100% passif, zéro modification des fichiers de jeu, certifié strictement conforme aux règles d'intégrité Riot Vanguard.",

    vctScorePickems: "Score Pick'ems",
    vctAccuracy: "Précision des Pronos",
    vctSavedPickems: "Pronostics Enregistrés",
    vctSavedLocally: "Sauvegardés en local",
    vctUpcomingTab: "À venir & En direct",
    vctResultsTab: "Scores & Anciens matchs",
    vctMyPickemsTab: "Mes Pick'ems",
    vctSearchPlaceholder: "Rechercher une équipe ou tournoi...",
    vctEditionLabel: "Édition :",
    vctAllCompetitions: "Toutes les compétitions",
    vctAll: "Tous",

    footerCompliance: "Attributions & Conformité Compétitive",
    footerNotAffiliated: "Non Affilié à Riot Games",
    footerLegalDesc: "Politique Legal Jibber Jabber de Riot Games et APIs communautaires.",
    footerCreditsBtn: "Tous les crédits",
    footerApiKeyBtn: "Clé API",
    footerNoticeTitle: "Notice Légale :",
    footerNoticeBody: "ETHONE n'est pas affilié à Riot Games et ne reflète en rien les points de vue ou opinions de Riot Games ou de quiconque impliqué officiellement dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques ou des marques déposées de Riot Games, Inc.",
    footerPrivacyTitle: "Confidentialité & Stockage Local :",
    footerPrivacyBody: "Aucun compte obligatoire, zéro trace sur serveur externe. Les données de profil et Riot ID sont stockées exclusivement dans le navigateur local de l'utilisateur.",
    footerPrivacyBadge: "✓ 100% Local · Zéro Log · Conforme Fair-Play Vanguard",

    siteVersion: "v2.4.0",
    siteVersionLabel: "Version du site",
    updateBannerTag: "NOUVEAUTÉ",
    updateBannerHeadline: "Mise à jour v2.4.0 — ETHONE Tactical",
    updateBannerDesc: "Traduction bilingue EN/FR, Pick'ems VCT interactifs, Télémétrie de tir et Coach IA en direct !",
    updateBannerBtn: "Notes de version",
    patchNotesTitle: "Notes de mise à jour — ETHONE Tactical",
    patchNotesBadge: "v2.4.0 · Build Compétitif",
    patchNotesDesc: "Historique des mises à jour du site, indépendant d'ETHONE OS.",
    patchNotesClose: "Fermer",

    coachChatTitle: "Coach IA Tactique",
    coachChatSubtitle: "Expertise VALORANT & VCT Esport · Analyse de vos statistiques réelles",
    coachChatReset: "Nouvelle discussion",
    coachChatDiagnostic: "Diagnostic de synthèse",
    coachChatPlaceholder: "Posez une question tactique (ex: Comment jouer Haven en défense ?)...",
    coachChatSend: "Envoyer",
    coachChatThinking: "Le Coach analyse vos données tactiques...",
    coachChatPromptsLabel: "Pistes :",
    coachPrompt1: "🎯 Analyse mon tir et mon crosshair placement",
    coachPrompt2: "⚡ Conseils pour progresser sur mon agent principal",
    coachPrompt3: "🛡️ Comment gérer les retakes et le 4v5",
    coachPrompt4: "🏆 Méta VCT : compositions et stratégies pros",
    coachPrompt5: "💰 Gestion économique des armes et rounds bonus",
  },
  en: {
    hub: "Hub",
    wip: "WIP",
    live: "LIVE",
    beta: "Beta",
    valorant: "VALORANT",
    lol: "LoL",
    tft: "TFT",
    vctPickems: "VCT & Pick'ems",
    liveMatch: "Live Match",
    coachIa: "AI Coach",
    telemetry: "Telemetry",
    training: "Training",

    riotIdPlaceholder: "Riot ID",
    riotTagPlaceholder: "TAG",
    analyze: "Analyze",
    scanning: "Scanning...",

    refresh: "Refresh",
    compare: "Compare",
    notConnected: "— Not connected",
    connected: "Riot Games · Connected",
    noProfile: "No profile",
    unrated: "Unrated",
    matches: "matches",
    match: "match",
    victory: "Victory",
    defeat: "Defeat",
    draw: "Draw",

    kdRatio: "K/D Ratio",
    winRate: "Win Rate",
    combatScoreAcs: "Combat Score (ACS)",
    headshotPrecision: "Headshot Precision (HS)",
    rankProgression: "Rank Progression",
    avgPerRound: "Average per round",
    eliteTier: "Elite Tier · Vandal / Phantom",

    topCompetitiveAgents: "Top Competitive Agents",
    recentAgents: "recent agents",
    noAgent: "No agent",
    duelWinrate: "Duel Win Rate",

    shootingTelemetryImpact: "Shooting Telemetry & Impact",
    impactDistribution: "Impact Distribution",
    head: "Head",
    body: "Body",
    legs: "Legs",
    firstDuelWinrate: "First Duel Win Rate",
    crosshairAboveAverage: "Crosshair alignment above average",

    competitiveMatchHistory: "Competitive Match History",
    last5Matches: "Last 5 official matches",
    allQueues: "All Queues",
    competitiveQueue: "Competitive",
    unratedQueue: "Unrated",
    swiftplayQueue: "Swiftplay",
    spikeRushQueue: "Spike Rush",
    deathmatchQueue: "Deathmatch",
    noMatchFound: "No matches found",
    searchPrompt: "Search for a Riot ID above to load complete match history.",

    valEmptyTitle: "No VALORANT profile selected",
    valEmptyDesc: "Enter your Riot ID and TAG in the bar above then click \"Analyze\" to load your official competitive stats, shooting telemetry, and match history.",
    valPerfTitle: "Performance",
    valPerfDesc: "Official ACS, K/D ratio, win rate, and precise rank & RR progression tracking.",
    valTelemTitle: "Telemetry",
    valTelemDesc: "Calculated hit distribution (head, body, legs) and round-by-round duel analysis.",
    valCoachTitle: "Tactical Coach",
    valCoachDesc: "Playstyle diagnosis, weak point detection, and tailored training plan.",
    valLoadingTitle: "Analyzing player profile...",
    valLoadingDesc: "Syncing competitive statistics and recent matches from the official API.",

    lolEmptyTitle: "No League of Legends summoner selected",
    lolEmptyDesc: "Enter your Riot ID and TAG in the bar above then click \"Analyze\" to load your average KDA, damage per minute, and recent match history.",
    lolKdaTitle: "KDA & Impact",
    lolKdaDesc: "Average KDA ratio, total kills, deaths, and assists across recent matches.",
    lolDpmTitle: "Damage / Minute",
    lolDpmDesc: "Total damage dealt to champions calculated per minute of gameplay.",
    lolKpTitle: "Kill Participation",
    lolKpDesc: "Involvement rate in team objectives and takedowns.",
    lolLoadingTitle: "Analyzing Summoner...",
    lolLoadingDesc: "Retrieving SoloQ and Flex match history via Riot Games API.",
    lolAverageKda: "Average KDA",
    lolDpm: "Damage / Minute",
    lolKp: "Kill Participation",
    lolMatchesAnalyzed: "Matches analyzed:",
    lolRecentMatches: "Recent League of Legends Matches",

    tftModuleTitle: "Teamfight Tactics Module",
    tftModuleDesc: "TFT match integration (unit comps, team synergies, and end-of-round placements) requires setting up a custom Riot Games API key.",
    tftConfigKeyBtn: "Configure Riot API Key",

    coachDiagnosticTitle: "Tactical AI Coach Diagnosis",
    coachDiagnosticActive: "Active analysis",
    coachEvalPrefix: "Evaluation based on",
    coachPendingTitle: "Tactical AI Coach Diagnosis Pending",
    coachPendingDesc: "The AI Coach requires at least one recorded competitive match to evaluate your playstyle, duel efficiency, and economy. Search a Riot ID above to begin the audit.",
    coachArchetype: "Archetype",
    coachStrength: "Major Strength",
    coachWeakness: "Area for Improvement",
    coachRecommendations: "Custom Tactical Recommendations",
    coachRoutineBtn: "Training Routine",

    trainingPlanTitle: "Personalized Training Plan · AI Coach",
    trainingPendingTitle: "Training Plan Pending",
    trainingPendingDesc: "Sync a VALORANT profile above to generate a tailored training routine for your favorite agent and current skill level.",
    trainingRoutineFor: "Targeted routine",
    phase1Title: "Phase 1: Mechanical Calibration & Crosshair Placement (10 min)",
    phase1Desc: "Eliminate 50 bots in Practice mode with Vandal without crouching. Focus on horizontal micro-adjustments at head height before firing the first shot.",
    phase2Title: "Phase 2: Space Taking & Duels Under Pressure (15 min)",
    phase2Desc: "Practice aggressive site entries using utility to break enemy crossfires and force an advantageous duel.",
    phase3Title: "Phase 3: Debriefing & Economy Tracking (5 min)",
    phase3Desc: "Review your economy rounds in post-match telemetry. Make sure you bought at least 3 key utilities on gun rounds.",

    telemHeaderTitle: "Post-Match Combat Telemetry · VALORANT",
    telemPendingTitle: "Telemetry Awaiting Data",
    telemPendingDesc: "No VALORANT matches recorded for this player. Enter a valid Riot ID above to calculate ballistics, anatomical hit distribution, and real duel ratios.",
    telemTotalKills: "Total Kills",
    telemTotalDeaths: "Total Deaths",
    telemHeadPrecision: "Headshot Precision",
    telemOverallAdr: "Overall ADR",
    telemSpreadTitle: "Anatomical Hit Spread",
    telemHeadshots: "Headshots (HS)",
    telemBodyshots: "Body shots",
    telemLegshots: "Leg shots",
    telemMapTitle: "Performance by Map",
    telemNoMap: "No maps available",

    liveHeaderTitle: "Live Match (WIP)",
    liveSubtitleWithId: "Real-time session tracking for",
    liveSubtitleGeneric: "Real-time session tracking via local VALORANT client.",
    liveCheckBtn: "Check VALORANT client",
    liveCheckingBtn: "Searching for session...",
    liveNoSessionTitle: "No active game session detected",
    liveNoSessionDesc: "The live match tracker is currently WIP. To sync real-round telemetry, start VALORANT on your computer and join a custom, unrated, or competitive match.",
    liveLocalVanguardTitle: "Local Vanguard Detection",
    liveLocalVanguardDesc: "Instant local synchronization with the official VALORANT client as soon as round one starts.",
    liveRealRoundTitle: "Real-Round Telemetry",
    liveRealRoundDesc: "Automated round-by-round tracking of team economy, ultimate points, combat scores, and Spike status.",
    liveFairPlayTitle: "Fair-Play Compliance",
    liveFairPlayDesc: "100% passive, zero game file modification, strictly compliant with Riot Vanguard integrity rules.",

    vctScorePickems: "Pick'ems Score",
    vctAccuracy: "Prediction Accuracy",
    vctSavedPickems: "Saved Predictions",
    vctSavedLocally: "Saved locally",
    vctUpcomingTab: "Upcoming & Live",
    vctResultsTab: "Scores & Match History",
    vctMyPickemsTab: "My Pick'ems",
    vctSearchPlaceholder: "Search team or tournament...",
    vctEditionLabel: "Edition:",
    vctAllCompetitions: "All competitions",
    vctAll: "All",

    footerCompliance: "Attributions & Competitive Compliance",
    footerNotAffiliated: "Not Affiliated with Riot Games",
    footerLegalDesc: "Riot Games Legal Jibber Jabber policy and community APIs.",
    footerCreditsBtn: "All credits",
    footerApiKeyBtn: "API Key",
    footerNoticeTitle: "Legal Notice:",
    footerNoticeBody: "ETHONE isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.",
    footerPrivacyTitle: "Privacy & Local Storage:",
    footerPrivacyBody: "No mandatory account, zero trace on external servers. Profile data and Riot ID are stored exclusively in the user's local browser.",
    footerPrivacyBadge: "✓ 100% Local · Zero Log · Vanguard Fair-Play Compliant",

    siteVersion: "v2.4.0",
    siteVersionLabel: "Site version",
    updateBannerTag: "WHAT'S NEW",
    updateBannerHeadline: "Update v2.4.0 — ETHONE Tactical",
    updateBannerDesc: "Full bilingual EN/FR support, interactive VCT Pick'ems, Shooting Telemetry & Live Coach AI!",
    updateBannerBtn: "Patch notes",
    patchNotesTitle: "Release Notes — ETHONE Tactical",
    patchNotesBadge: "v2.4.0 · Competitive Build",
    patchNotesDesc: "Site release history, independent from ETHONE OS.",
    patchNotesClose: "Close",

    coachChatTitle: "Tactical AI Coach",
    coachChatSubtitle: "VALORANT & VCT Esports Expertise · Analyzes your actual stats",
    coachChatReset: "New conversation",
    coachChatDiagnostic: "Summary Diagnostic",
    coachChatPlaceholder: "Ask a tactical question (e.g. How to play defense on Haven?)...",
    coachChatSend: "Send",
    coachChatThinking: "Coach is analyzing your tactical data...",
    coachChatPromptsLabel: "Prompts :",
    coachPrompt1: "🎯 Analyze my shooting and crosshair placement",
    coachPrompt2: "⚡ Tips to improve on my main agent",
    coachPrompt3: "🛡️ How to manage retakes and 4v5 disadvantage",
    coachPrompt4: "🏆 VCT Meta: pro compositions and strategies",
    coachPrompt5: "💰 Weapon economy management and bonus rounds",
  },
};

export function getTrackerI18n(lang?: string): TrackerTranslations {
  const normalized = (lang || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
  return TRACKER_TRANSLATIONS[normalized];
}

export interface PatchNoteRelease {
  version: string;
  badge: string;
  date: string;
  title: string;
  items: string[];
}

export function getPatchNotes(lang?: string): PatchNoteRelease[] {
  const isEn = (lang || "").toLowerCase().startsWith("en");
  if (isEn) {
    return [
      {
        version: "v2.4.0",
        badge: "Latest",
        date: "October 2026",
        title: "Full Bilingual EN/FR, VCT Pick'ems & Advanced Telemetry",
        items: [
          "Bilingual French / English toggle with instant local sync and flag badge.",
          "VCT 2026 interactive Pick'ems: real-time match predictions, automated scoring (+15 pts exact, +10 pts winner), edition filters.",
          "Anatomical shooting telemetry: accurate Head / Body / Leg hit distribution & round-by-round spray analysis.",
          "Tactical AI Coach: personalized diagnostic of weak points and custom training plans.",
          "Riot Fair Play compliance: 100% passive Vanguard architecture, official CDNs, and legal attributions.",
        ],
      },
      {
        version: "v2.3.0",
        badge: "Ecosystem",
        date: "September 2026",
        title: "League of Legends & Teamfight Tactics Integration",
        items: [
          "LoL Summoner Match Journal: KDA stats, damage per min, and kill participation tracking.",
          "Teamfight Tactics module: Riot Developer API key integration for live tactical data.",
          "Interactive match timeline with victory / defeat breakdown.",
        ],
      },
      {
        version: "v2.2.0",
        badge: "Architecture",
        date: "August 2026",
        title: "Dark Cyber UI & Fluid Motion Design",
        items: [
          "Spring animations with full Reduced Motion accessibility support.",
          "Zero-placeholder design: clean neutral empty states with actionable guidance.",
          "Secure local storage for all user preferences and profiles.",
        ],
      },
    ];
  }
  return [
    {
      version: "v2.4.0",
      badge: "Dernière",
      date: "Octobre 2026",
      title: "Bilinguisme EN/FR, VCT Pick'ems & Télémétrie avancée",
      items: [
        "Sélecteur bilingue Français / Anglais interactif avec mémorisation instantanée et drapeaux.",
        "VCT 2026 Pick'ems interactifs : pronostics en direct, calcul des points (+15 pts exact, +10 pts vainqueur), filtres par tournoi.",
        "Télémétrie de tir anatomique : répartition précise Tête / Corps / Jambes et analyse des duels.",
        "Coach IA Tactique : diagnostic automatique des axes de travail et plan d'exercices personnalisé.",
        "Conformité Riot Fair Play : architecture 100% passive Vanguard, CDN officiels et Legal Jibber Jabber.",
      ],
    },
    {
      version: "v2.3.0",
      badge: "Écosystème",
      date: "Septembre 2026",
      title: "Intégration League of Legends & Teamfight Tactics",
      items: [
        "Journal des parties Invocateur LoL : statistiques KDA, dégâts/min et participation aux éliminations.",
        "Module Teamfight Tactics : intégration clé API Riot Developer pour les données tactiques.",
        "Chronologie interactive des affrontements avec bilan Victoire / Défaite.",
      ],
    },
    {
      version: "v2.2.0",
      badge: "Architecture",
      date: "Août 2026",
      title: "Interface Dark Cyber & Fluidité Motion Design",
      items: [
        "Animations spring optimisées avec prise en compte du mode 'Reduced Motion'.",
        "Conception sans placeholder : états vides neutres et élégants guidant l'utilisateur.",
        "Stockage local sécurisé pour tous les profils et préférences de jeu.",
      ],
    },
  ];
}

export function formatStatPercent(
  value: number | string | null | undefined,
  lang: string = "fr",
  maxDecimals: number = 1
): string {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "—";
  }
  const num = Number(value);
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  const isWhole = Math.round(rounded) === rounded;
  const formattedNumber = isWhole
    ? String(Math.round(rounded))
    : (lang === "fr" ? rounded.toFixed(maxDecimals).replace(".", ",") : rounded.toFixed(maxDecimals));
  return lang === "fr" ? `${formattedNumber} %` : `${formattedNumber}%`;
}

export function formatKdRatio(
  kills: number | null | undefined,
  deaths: number | null | undefined
): string {
  if (kills === null || kills === undefined || Number.isNaN(Number(kills))) return "—";
  const k = Number(kills);
  const d = deaths !== null && deaths !== undefined ? Math.max(0, Number(deaths)) : 0;
  if (d === 0) return k > 0 ? k.toFixed(2) : "0.00";
  return (k / d).toFixed(2);
}

export function formatStatScore(
  value: number | string | null | undefined,
  unit?: string
): string {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "—";
  }
  const rounded = Math.round(Number(value));
  return unit ? `${rounded} ${unit}` : String(rounded);
}
