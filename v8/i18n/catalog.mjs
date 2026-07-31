/* ETHONE localized source catalog. */
export const SUPPORTED_LOCALES = Object.freeze(["fr", "en", "es", "de"]);

const ENTRIES = {
  "Dock ETHONE": { "fr": "Dock ETHONE", "en": "ETHONE Dock", "es": "Dock de ETHONE", "de": "ETHONE Dock" },
  "Personnaliser le Dock": { "fr": "Personnaliser le Dock", "en": "Customize Dock", "es": "Personalizar el Dock", "de": "Dock anpassen" },
  "Epingle": { "fr": "\u00c9pingl\u00e9", "en": "Pinned", "es": "Fijado", "de": "Angeheftet" },
  "Masque": { "fr": "Masqu\u00e9", "en": "Hidden", "es": "Oculto", "de": "Ausgeblendet" },
  "Retirer du Dock": { "fr": "Retirer du Dock", "en": "Remove from Dock", "es": "Quitar del Dock", "de": "Aus Dock entfernen" },
  "Ajouter au Dock": { "fr": "Ajouter au Dock", "en": "Add to Dock", "es": "A\u00f1adir al Dock", "de": "Zum Dock hinzuf\u00fcgen" },
  "Deplacer a gauche": { "fr": "D\u00e9placer \u00e0 gauche", "en": "Move left", "es": "Mover a la izquierda", "de": "Nach links verschieben" },
  "Deplacer a droite": { "fr": "D\u00e9placer \u00e0 droite", "en": "Move right", "es": "Mover a la derecha", "de": "Nach rechts verschieben" },
  "Reinitialiser": { "fr": "R\u00e9initialiser", "en": "Reset", "es": "Restablecer", "de": "Zur\u00fccksetzen" },
  "Mission Control": { "fr": "Mission Control", "en": "Mission Control", "es": "Mission Control", "de": "Mission Control" },
  "Navigation systeme": { "fr": "Navigation syst\u00e8me", "en": "System navigation", "es": "Navegaci\u00f3n del sistema", "de": "Systemnavigation" },
  "Spaces": { "fr": "Spaces", "en": "Spaces", "es": "Espacios", "de": "Spaces" },
  "Flows": { "fr": "Flows", "en": "Flows", "es": "Flujos", "de": "Flows" },
  "Fenetres": { "fr": "Fen\u00eatres", "en": "Windows", "es": "Ventanas", "de": "Fenster" },
  "Dashboards": { "fr": "Tableaux de bord", "en": "Dashboards", "es": "Paneles", "de": "Dashboards" },
  "Widgets ouverts": { "fr": "Widgets ouverts", "en": "Open widgets", "es": "Widgets abiertos", "de": "Ge\u00f6ffnete Widgets" },
  "Activites Brain": { "fr": "Activit\u00e9s Brain", "en": "Brain activity", "es": "Actividad de Brain", "de": "Brain-Aktivit\u00e4ten" },
  "Fenetre active": { "fr": "Fen\u00eatre active", "en": "Active window", "es": "Ventana activa", "de": "Aktives Fenster" },
  "Aucune activite recente": { "fr": "Aucune activit\u00e9 r\u00e9cente", "en": "No recent activity", "es": "Sin actividad reciente", "de": "Keine aktuelle Aktivit\u00e4t" },
  "Brain attend votre prochaine demande.": { "fr": "Brain attend votre prochaine demande.", "en": "Brain is ready for your next request.", "es": "Brain espera tu pr\u00f3xima solicitud.", "de": "Brain wartet auf Ihre n\u00e4chste Anfrage." },
  "Fermer Mission Control": { "fr": "Fermer Mission Control", "en": "Close Mission Control", "es": "Cerrar Mission Control", "de": "Mission Control schlie\u00dfen" },
  "Rechercher": { "fr": "Rechercher", "en": "Search", "es": "Buscar", "de": "Suchen" },
  "ETHONE Command HUD": { "fr": "ETHONE Command HUD", "en": "ETHONE Command HUD", "es": "ETHONE Command HUD", "de": "ETHONE Command HUD" },
  "Rechercher ou executer une commande...": { "fr": "Rechercher ou ex\u00e9cuter une commande...", "en": "Search or run a command...", "es": "Buscar o ejecutar un comando...", "de": "Befehl suchen oder ausf\u00fchren..." },
  "Briefing quotidien": { "fr": "Briefing quotidien", "en": "Daily briefing", "es": "Informe diario", "de": "Tagesbriefing" },
  "Votre journee en un regard.": { "fr": "Votre journ\u00e9e en un regard.", "en": "Your day at a glance.", "es": "Tu d\u00eda de un vistazo.", "de": "Ihr Tag auf einen Blick." },
  "Briefing Brain pret": { "fr": "Briefing Brain pr\u00eat", "en": "Brain briefing ready", "es": "Informe de Brain listo", "de": "Brain-Briefing bereit" },
  "Meteo": { "fr": "M\u00e9t\u00e9o", "en": "Weather", "es": "Tiempo", "de": "Wetter" },
  "Priorites": { "fr": "Priorit\u00e9s", "en": "Priorities", "es": "Prioridades", "de": "Priorit\u00e4ten" },
  "Musique": { "fr": "Musique", "en": "Music", "es": "M\u00fasica", "de": "Musik" },
  "Hier": { "fr": "Hier", "en": "Yesterday", "es": "Ayer", "de": "Gestern" },
  "Non connectee": { "fr": "Non connect\u00e9e", "en": "Not connected", "es": "No conectada", "de": "Nicht verbunden" },
  "Aucune activite": { "fr": "Aucune activit\u00e9", "en": "No activity", "es": "Sin actividad", "de": "Keine Aktivit\u00e4t" },
  "Aucun evenement aujourd'hui": { "fr": "Aucun \u00e9v\u00e9nement aujourd'hui", "en": "No events today", "es": "Sin eventos hoy", "de": "Heute keine Termine" },
  "Aucune tache prioritaire": { "fr": "Aucune t\u00e2che prioritaire", "en": "No priority tasks", "es": "Sin tareas prioritarias", "de": "Keine vorrangigen Aufgaben" },
  "Aucune ecoute": { "fr": "Aucune \u00e9coute", "en": "No listening", "es": "Sin reproducci\u00f3n", "de": "Keine Wiedergabe" },
  "Configurer": { "fr": "Configurer", "en": "Set up", "es": "Configurar", "de": "Einrichten" },
  "evenement aujourd'hui": { "fr": "\u00e9v\u00e9nement aujourd'hui", "en": "event today", "es": "evento hoy", "de": "Termin heute" },
  "evenements aujourd'hui": { "fr": "\u00e9v\u00e9nements aujourd'hui", "en": "events today", "es": "eventos hoy", "de": "Termine heute" },
  "priorite ouverte": { "fr": "priorit\u00e9 ouverte", "en": "open priority", "es": "prioridad abierta", "de": "offene Priorit\u00e4t" },
  "priorites ouvertes": { "fr": "priorit\u00e9s ouvertes", "en": "open priorities", "es": "prioridades abiertas", "de": "offene Priorit\u00e4ten" },
  "Commencer par la priorite principale": { "fr": "Commencer par la priorit\u00e9 principale", "en": "Start with the top priority", "es": "Empieza por la prioridad principal", "de": "Mit der wichtigsten Priorit\u00e4t beginnen" },
  "Voir la tache": { "fr": "Voir la t\u00e2che", "en": "View task", "es": "Ver tarea", "de": "Aufgabe anzeigen" },
  "Preparer le prochain evenement": { "fr": "Pr\u00e9parer le prochain \u00e9v\u00e9nement", "en": "Prepare the next event", "es": "Preparar el pr\u00f3ximo evento", "de": "Den n\u00e4chsten Termin vorbereiten" },
  "Voir l'agenda": { "fr": "Voir l'agenda", "en": "View calendar", "es": "Ver agenda", "de": "Kalender anzeigen" },
  "Creer un bloc Focus": { "fr": "Cr\u00e9er un bloc Focus", "en": "Create a Focus block", "es": "Crear un bloque Focus", "de": "Einen Focus-Block erstellen" },
  "Activer Focus": { "fr": "Activer Focus", "en": "Enable Focus", "es": "Activar Focus", "de": "Focus aktivieren" },
  "Preserver un bloc calme": { "fr": "Pr\u00e9server un bloc calme", "en": "Protect a quiet block", "es": "Reserva un bloque tranquilo", "de": "Einen ruhigen Block sch\u00fctzen" },
  "Protegez un moment sans interruption.": { "fr": "Prot\u00e9gez un moment sans interruption.", "en": "Protect an uninterrupted moment.", "es": "Reserva un momento sin interrupciones.", "de": "Sch\u00fctzen Sie eine ungest\u00f6rte Zeit." },
  "action enregistree": { "fr": "action enregistr\u00e9e", "en": "recorded action", "es": "acci\u00f3n registrada", "de": "erfasste Aktion" },
  "actions enregistrees": { "fr": "actions enregistr\u00e9es", "en": "recorded actions", "es": "acciones registradas", "de": "erfasste Aktionen" },
  "Voir le briefing": { "fr": "Voir le briefing", "en": "View briefing", "es": "Ver informe", "de": "Briefing anzeigen" },
  "Spotlight": { "fr": "Spotlight", "en": "Spotlight", "es": "Spotlight", "de": "Spotlight" },
  "Reveler le Dashboard avec une transition breve au demarrage.": { "fr": "R\u00e9v\u00e9ler le Dashboard avec une transition br\u00e8ve au d\u00e9marrage.", "en": "Reveal the Dashboard with a brief startup transition.", "es": "Mostrar el Dashboard con una breve transici\u00f3n de inicio.", "de": "Das Dashboard mit einem kurzen Start\u00fcbergang einblenden." },
  "Animation Spotlight au demarrage": { "fr": "Animation Spotlight au d\u00e9marrage", "en": "Spotlight startup animation", "es": "Animaci\u00f3n Spotlight al iniciar", "de": "Spotlight-Startanimation" },
  "Sons": { "fr": "Sons", "en": "Sounds", "es": "Sonidos", "de": "Kl\u00e4nge" },
  "Audio system": { "fr": "Syst\u00e8me audio", "en": "Audio system", "es": "Sistema de audio", "de": "Audiosystem" },
  "Des retours courts et discrets, toujours facultatifs.": { "fr": "Des retours courts et discrets, toujours facultatifs.", "en": "Short, subtle feedback that always remains optional.", "es": "Respuestas breves y discretas, siempre opcionales.", "de": "Kurze, dezente R\u00fcckmeldungen, die immer optional bleiben." },
  "Retours sonores": { "fr": "Retours sonores", "en": "Sound feedback", "es": "Respuesta sonora", "de": "Klangfeedback" },
  "Activer ou couper tout le systeme audio.": { "fr": "Activer ou couper tout le syst\u00e8me audio.", "en": "Enable or mute the entire sound system.", "es": "Activa o silencia todo el sistema de audio.", "de": "Das gesamte Audiosystem aktivieren oder stummschalten." },
  "Le son n'est pas disponible dans ce navigateur.": { "fr": "Le son n'est pas disponible dans ce navigateur.", "en": "Sound is not available in this browser.", "es": "El sonido no est\u00e1 disponible en este navegador.", "de": "Audio ist in diesem Browser nicht verf\u00fcgbar." },
  "Activer les sons": { "fr": "Activer les sons", "en": "Enable sounds", "es": "Activar sonidos", "de": "Kl\u00e4nge aktivieren" },
  "Mode silencieux": { "fr": "Mode silencieux", "en": "Silent mode", "es": "Modo silencioso", "de": "Stummmodus" },
  "Couper temporairement toutes les interactions sonores.": { "fr": "Couper temporairement toutes les interactions sonores.", "en": "Temporarily mute all interaction sounds.", "es": "Silenciar temporalmente todos los sonidos de interacci\u00f3n.", "de": "Alle Interaktionskl\u00e4nge vor\u00fcbergehend stummschalten." },
  "Activer le mode silencieux": { "fr": "Activer le mode silencieux", "en": "Enable silent mode", "es": "Activar el modo silencioso", "de": "Stummmodus aktivieren" },
  "Audio spatial": { "fr": "Audio spatial", "en": "Spatial audio", "es": "Audio espacial", "de": "R\u00e4umliches Audio" },
  "Orienter tres legerement les sons selon leur origine.": { "fr": "Orienter tr\u00e8s l\u00e9g\u00e8rement les sons selon leur origine.", "en": "Subtly position sounds according to their origin.", "es": "Orientar sutilmente los sonidos seg\u00fan su origen.", "de": "Kl\u00e4nge dezent nach ihrem Ursprung ausrichten." },
  "L'audio spatial n'est pas disponible dans ce navigateur.": { "fr": "L'audio spatial n'est pas disponible dans ce navigateur.", "en": "Spatial audio is not available in this browser.", "es": "El audio espacial no est\u00e1 disponible en este navegador.", "de": "R\u00e4umliches Audio ist in diesem Browser nicht verf\u00fcgbar." },
  "Activer l'audio spatial": { "fr": "Activer l'audio spatial", "en": "Enable spatial audio", "es": "Activar el audio espacial", "de": "R\u00e4umliches Audio aktivieren" },
  "Pack sonore": { "fr": "Pack sonore", "en": "Sound pack", "es": "Paquete de sonidos", "de": "Soundpaket" },
  "Choisir une identite sonore originale pour ETHONE.": { "fr": "Choisir une identit\u00e9 sonore originale pour ETHONE.", "en": "Choose an original sound identity for ETHONE.", "es": "Elige una identidad sonora original para ETHONE.", "de": "Eine eigenst\u00e4ndige Klangidentit\u00e4t f\u00fcr ETHONE w\u00e4hlen." },
  "Ecouter un apercu": { "fr": "\u00c9couter un aper\u00e7u", "en": "Play preview", "es": "Escuchar vista previa", "de": "Vorschau anh\u00f6ren" },
  "Volume general": { "fr": "Volume g\u00e9n\u00e9ral", "en": "Master volume", "es": "Volumen general", "de": "Gesamtlautst\u00e4rke" },
  "Limiter le niveau de tout ETHONE.": { "fr": "Limiter le niveau de tout ETHONE.", "en": "Control the level of all ETHONE sounds.", "es": "Controla el nivel de todos los sonidos de ETHONE.", "de": "Die Lautst\u00e4rke aller ETHONE-Kl\u00e4nge steuern." },
  "Informations, succes, alertes et mises a jour.": { "fr": "Informations, succ\u00e8s, alertes et mises \u00e0 jour.", "en": "Information, success, alerts and updates.", "es": "Informaci\u00f3n, confirmaciones, alertas y actualizaciones.", "de": "Informationen, Erfolge, Warnungen und Updates." },
  "Fenetres, commandes et interactions importantes.": { "fr": "Fen\u00eatres, commandes et interactions importantes.", "en": "Windows, commands and important interactions.", "es": "Ventanas, comandos e interacciones importantes.", "de": "Fenster, Befehle und wichtige Interaktionen." },
  "Reflexion, reponse et fin de traitement.": { "fr": "R\u00e9flexion, r\u00e9ponse et fin de traitement.", "en": "Thinking, response and completion.", "es": "Reflexi\u00f3n, respuesta y finalizaci\u00f3n.", "de": "Denken, Antworten und Abschluss." },
  "Connexion, sauvegarde, synchronisation et Spaces.": { "fr": "Connexion, sauvegarde, synchronisation et Spaces.", "en": "Sign-in, saving, sync and Spaces.", "es": "Inicio de sesi\u00f3n, guardado, sincronizaci\u00f3n y Spaces.", "de": "Anmeldung, Speichern, Synchronisierung und Spaces." },
  "Signature douce et lumineuse.": { "fr": "Signature douce et lumineuse.", "en": "Soft, luminous signature.", "es": "Firma suave y luminosa.", "de": "Sanfte, helle Signatur." },
  "Retours courts et presque tactiles.": { "fr": "Retours courts et presque tactiles.", "en": "Short, almost tactile feedback.", "es": "Respuestas breves y casi t\u00e1ctiles.", "de": "Kurze, fast taktile R\u00fcckmeldungen." },
  "Tonalite chaleureuse et familiere.": { "fr": "Tonalit\u00e9 chaleureuse et famili\u00e8re.", "en": "Warm, familiar tone.", "es": "Tono c\u00e1lido y familiar.", "de": "Warmer, vertrauter Klang." },
  "Clarte cristalline, composition originale.": { "fr": "Clart\u00e9 cristalline, composition originale.", "en": "Crystal clarity, original composition.", "es": "Claridad cristalina, composici\u00f3n original.", "de": "Kristallklare, eigenst\u00e4ndige Komposition." },
  "Aucun retour sonore.": { "fr": "Aucun retour sonore.", "en": "No sound feedback.", "es": "Sin respuesta sonora.", "de": "Kein Klangfeedback." },
  "La synchronisation attend le reseau.": { "fr": "La synchronisation attend le r\u00e9seau.", "en": "Sync is waiting for the network.", "es": "La sincronizaci\u00f3n espera la conexi\u00f3n.", "de": "Die Synchronisierung wartet auf das Netzwerk." },
  "Volume notifications": { "fr": "Volume des notifications", "en": "Notification volume", "es": "Volumen de notificaciones", "de": "Benachrichtigungslautst\u00e4rke" },
  "Volume interface": { "fr": "Volume de l'interface", "en": "Interface volume", "es": "Volumen de la interfaz", "de": "Oberfl\u00e4chenlautst\u00e4rke" },
  "Volume brain": { "fr": "Volume de Brain", "en": "Brain volume", "es": "Volumen de Brain", "de": "Brain-Lautst\u00e4rke" },
  "Volume system": { "fr": "Volume du syst\u00e8me", "en": "System volume", "es": "Volumen del sistema", "de": "Systemlautst\u00e4rke" },
  "Systeme": { "fr": "Syst\u00e8me", "en": "System", "es": "Sistema", "de": "System" },
  "Workspace": { "fr": "Workspace", "en": "Workspace", "es": "Espacio de trabajo", "de": "Arbeitsbereich" },
  "Mode": { "fr": "Mode", "en": "Mode", "es": "Modo", "de": "Modus" },
  "Synchronise": { "fr": "Synchronisé", "en": "Synced", "es": "Sincronizado", "de": "Synchronisiert" },
  "Synchronisation": { "fr": "Synchronisation", "en": "Syncing", "es": "Sincronizando", "de": "Synchronisierung" },
  "Hors ligne": { "fr": "Hors ligne", "en": "Offline", "es": "Sin conexión", "de": "Offline" },
  "Brain actif": { "fr": "Brain actif", "en": "Brain active", "es": "Brain activo", "de": "Brain aktiv" },
  "Brain prêt": { "fr": "Brain prêt", "en": "Brain ready", "es": "Brain listo", "de": "Brain bereit" },
  "Agenda prêt": { "fr": "Agenda prêt", "en": "Calendar ready", "es": "Calendario listo", "de": "Kalender bereit" },
  "Connecteurs": { "fr": "Connecteurs", "en": "Connectors", "es": "Conectores", "de": "Konnektoren" },
  "Widgets prêts": { "fr": "Widgets prêts", "en": "Widgets ready", "es": "Widgets listos", "de": "Widgets bereit" },
  "Ajustez son identité sans toucher à ses données.": { "fr": "Ajustez son identité sans toucher à ses données.", "en": "Adjust its identity without changing its data.", "es": "Ajusta su identidad sin modificar sus datos.", "de": "Passe die Identität an, ohne die Daten zu verändern." },
  "Créer le profil": { "fr": "Créer le profil", "en": "Create profile", "es": "Crear perfil", "de": "Profil erstellen" },
  "Créer un environnement": { "fr": "Créer un environnement", "en": "Create environment", "es": "Crear entorno", "de": "Umgebung erstellen" },
  "Définissez son identité. Le dashboard restera vide et prêt à être construit.": { "fr": "Définissez son identité. Le dashboard restera vide et prêt à être construit.", "en": "Define its identity. The dashboard will remain empty and ready to build.", "es": "Define su identidad. El dashboard quedará vacío y listo para construir.", "de": "Lege die Identität fest. Das Dashboard bleibt leer und kann anschließend aufgebaut werden." },
  "Enregistrer": { "fr": "Enregistrer", "en": "Save", "es": "Guardar", "de": "Speichern" },
  "Supprimer ce profil ?": { "fr": "Supprimer ce profil ?", "en": "Delete this profile?", "es": "¿Eliminar este perfil?", "de": "Dieses Profil löschen?" },
  "Une confirmation est nécessaire avant toute suppression.": { "fr": "Une confirmation est nécessaire avant toute suppression.", "en": "Confirmation is required before deletion.", "es": "Es necesario confirmar antes de eliminar.", "de": "Vor dem Löschen ist eine Bestätigung erforderlich." },
  "Ambre": { "fr": "Ambre", "en": "Amber", "es": "Ámbar", "de": "Bernstein" },
  "Azur": { "fr": "Azur", "en": "Sky", "es": "Azul cielo", "de": "Himmelblau" },
  "Bon après-midi": { "fr": "Bon après-midi", "en": "Good afternoon", "es": "Buenas tardes", "de": "Guten Tag" },
  "Bonjour": { "fr": "Bonjour", "en": "Good morning", "es": "Buenos días", "de": "Guten Morgen" },
  "Bonsoir": { "fr": "Bonsoir", "en": "Good evening", "es": "Buenas tardes", "de": "Guten Abend" },
  "Clips": { "fr": "Clips", "en": "Clips", "es": "Clips", "de": "Clips" },
  "Code, documentation et outils réunis.": { "fr": "Code, documentation et outils réunis.", "en": "Code, documentation and tools together.", "es": "Código, documentación y herramientas en un solo lugar.", "de": "Code, Dokumentation und Werkzeuge an einem Ort." },
  "Connexion": { "fr": "Connexion", "en": "Sign in", "es": "Iniciar sesión", "de": "Anmelden" },
  "Cours, planning et concentration.": { "fr": "Cours, planning et concentration.", "en": "Courses, planning and focus.", "es": "Cursos, planificación y concentración.", "de": "Kurse, Planung und Konzentration." },
  "Créatif": { "fr": "Créatif", "en": "Creative", "es": "Creativo", "de": "Kreativ" },
  "Développement": { "fr": "Développement", "en": "Development", "es": "Desarrollo", "de": "Entwicklung" },
  "Direct": { "fr": "Direct", "en": "Live", "es": "En directo", "de": "Live" },
  "Discord": { "fr": "Discord", "en": "Discord", "es": "Discord", "de": "Discord" },
  "Encore éveillé": { "fr": "Encore éveillé", "en": "Still awake", "es": "Aún despierto", "de": "Noch wach" },
  "Études": { "fr": "Études", "en": "Study", "es": "Estudios", "de": "Studium" },
  "Focus": { "fr": "Focus", "en": "Focus", "es": "Focus", "de": "Focus" },
  "Gaming": { "fr": "Gaming", "en": "Gaming", "es": "Gaming", "de": "Gaming" },
  "GitHub": { "fr": "GitHub", "en": "GitHub", "es": "GitHub", "de": "GitHub" },
  "Idées, médias et projets créatifs.": { "fr": "Idées, médias et projets créatifs.", "en": "Ideas, media and creative projects.", "es": "Ideas, medios y proyectos creativos.", "de": "Ideen, Medien und kreative Projekte." },
  "Menthe": { "fr": "Menthe", "en": "Mint", "es": "Menta", "de": "Mint" },
  "Planning": { "fr": "Planning", "en": "Schedule", "es": "Planificación", "de": "Planung" },
  "Production, direct et contenus.": { "fr": "Production, direct et contenus.", "en": "Production, live sessions and content.", "es": "Producción, directos y contenidos.", "de": "Produktion, Live-Sessions und Inhalte." },
  "Projets": { "fr": "Projets", "en": "Projects", "es": "Proyectos", "de": "Projekte" },
  "Profils": { "fr": "Profils", "en": "Profiles", "es": "Perfiles", "de": "Profile" },
  "Rose": { "fr": "Rose", "en": "Rose", "es": "Rosa", "de": "Rosé" },
  "Sessions": { "fr": "Sessions", "en": "Sessions", "es": "Sesiones", "de": "Sessions" },
  "Sessions, progression et communauté.": { "fr": "Sessions, progression et communauté.", "en": "Sessions, progress and community.", "es": "Sesiones, progreso y comunidad.", "de": "Sessions, Fortschritt und Community." },
  "Spotify": { "fr": "Spotify", "en": "Spotify", "es": "Spotify", "de": "Spotify" },
  "Streaming": { "fr": "Streaming", "en": "Streaming", "es": "Streaming", "de": "Streaming" },
  "Terminal": { "fr": "Terminal", "en": "Terminal", "es": "Terminal", "de": "Terminal" },
  "Travail": { "fr": "Travail", "en": "Work", "es": "Trabajo", "de": "Arbeit" },
  "Un espace concentré sur vos priorités.": { "fr": "Un espace concentré sur vos priorités.", "en": "A space focused on your priorities.", "es": "Un espacio centrado en tus prioridades.", "de": "Ein Space für deine Prioritäten." },
  "à faire": {
    "fr": "à faire",
    "en": "to do",
    "es": "pendientes",
    "de": "offen"
  },
  "À faire": {
    "fr": "À faire",
    "en": "To do",
    "es": "Pendiente",
    "de": "Offen"
  },
  "À venir": {
    "fr": "À venir",
    "en": "Upcoming",
    "es": "Próximamente",
    "de": "Anstehend"
  },
  "Accéder aux modules en migration": {
    "fr": "Accéder aux modules en migration",
    "en": "Access modules in migration",
    "es": "Acceder a módulos en migración",
    "de": "Zugriffsmodule in der Migration"
  },
  "Accueil": {
    "fr": "Accueil",
    "en": "Home",
    "es": "Inicio",
    "de": "Start"
  },
  "Actif": {
    "fr": "Actif",
    "en": "Active",
    "es": "Activo",
    "de": "Aktiv"
  },
  "Action interrompue": {
    "fr": "Action interrompue",
    "en": "Action interrupted",
    "es": "Acción interrumpida",
    "de": "Aktion unterbrochen"
  },
  "Actions": {
    "fr": "Actions",
    "en": "Actions",
    "es": "Acciones",
    "de": "Aktionen"
  },
  "Actions du profil": {
    "fr": "Actions du profil",
    "en": "Profile Actions",
    "es": "Acciones de perfil",
    "de": "Profilaktionen"
  },
  "Adresse du lien": {
    "fr": "Adresse du lien",
    "en": "Link address",
    "es": "Dirección del enlace",
    "de": "Linkadresse"
  },
  "Affichage": {
    "fr": "Affichage",
    "en": "Display",
    "es": "Pantalla",
    "de": "Anzeige"
  },
  "Agenda": {
    "fr": "Agenda",
    "en": "Agenda",
    "es": "Agenda",
    "de": "Tagesordnung"
  },
  "Agenda du jour": {
    "fr": "Agenda du jour",
    "en": "Today's agenda",
    "es": "La agenda de hoy",
    "de": "Die heutige Tagesordnung"
  },
  "Ajouté": {
    "fr": "Ajouté",
    "en": "Added",
    "es": "Añadido",
    "de": "Hinzugefügt"
  },
  "Ajouter": {
    "fr": "Ajouter",
    "en": "Add",
    "es": "Agregar",
    "de": "Hinzufügen"
  },
  "Ajouter à votre liste": {
    "fr": "Ajouter à votre liste",
    "en": "Add to your list",
    "es": "Añadir a tu lista",
    "de": "Zur Liste hinzufügen"
  },
  "Ajouter au calendrier": {
    "fr": "Ajouter au calendrier",
    "en": "Add to calendar",
    "es": "Añadir al calendario",
    "de": "Zum Kalender hinzufügen"
  },
  "Ajouter aux favoris": {
    "fr": "Ajouter aux favoris",
    "en": "Add to favorites",
    "es": "Añadir a favoritos",
    "de": "Zu Favoriten hinzufügen"
  },
  "Ajouter un lien": {
    "fr": "Ajouter un lien",
    "en": "Add a link",
    "es": "Agregar un enlace",
    "de": "Link hinzufügen"
  },
  "Ajouter une tâche": {
    "fr": "Ajouter une tâche",
    "en": "Add a task",
    "es": "Agregar una tarea",
    "de": "Aufgabe hinzufügen"
  },
  "Ajoutez un nom avant de continuer.": {
    "fr": "Ajoutez un nom avant de continuer.",
    "en": "Add a name before continuing.",
    "es": "Añade un nombre antes de continuar.",
    "de": "Fügen Sie einen Namen hinzu, bevor Sie fortfahren."
  },
  "Ajoutez un titre à l'événement.": {
    "fr": "Ajoutez un titre à l'événement.",
    "en": "Add a title to the event.",
    "es": "Añade un título al evento.",
    "de": "Fügen Sie der Veranstaltung einen Titel hinzu."
  },
  "Ajoutez un titre avant de continuer.": {
    "fr": "Ajoutez un titre avant de continuer.",
    "en": "Add a title before continuing.",
    "es": "Añade un título antes de continuar.",
    "de": "Fügen Sie einen Titel hinzu, bevor Sie fortfahren."
  },
  "Ajoutez une tâche lorsque quelque chose mérite votre attention.": {
    "fr": "Ajoutez une tâche lorsque quelque chose mérite votre attention.",
    "en": "Add a task when something needs your attention.",
    "es": "Añade una tarea cuando algo necesite tu atención.",
    "de": "Füge eine Aufgabe hinzu, sobald etwas deine Aufmerksamkeit braucht."
  },
  "Annuler": {
    "fr": "Annuler",
    "en": "Cancel",
    "es": "Cancelar",
    "de": "Abbrechen"
  },
  "Aperçu": {
    "fr": "Aperçu",
    "en": "Overview",
    "es": "Descripción general",
    "de": "Übersicht"
  },
  "Aperçu de l'environnement": {
    "fr": "Aperçu de l'environnement",
    "en": "Environment Overview",
    "es": "Descripción general del entorno",
    "de": "Umgebungsübersicht"
  },
  "Aperçu du fichier": {
    "fr": "Aperçu du fichier",
    "en": "File preview",
    "es": "Vista previa del archivo",
    "de": "Dateivorschau"
  },
  "Aperçu du panneau": {
    "fr": "Aperçu du panneau",
    "en": "Panel Overview",
    "es": "Descripción general del panel",
    "de": "Panel-Übersicht"
  },
  "Apparence": {
    "fr": "Apparence",
    "en": "Appearance",
    "es": "Apariencia",
    "de": "Darstellung"
  },
  "Apparence et préférences": {
    "fr": "Apparence et préférences",
    "en": "Appearance and preferences",
    "es": "Apariencia y preferencias",
    "de": "Aussehen und Vorlieben"
  },
  "Application essentielle": {
    "fr": "Application essentielle",
    "en": "Essential app",
    "es": "Aplicación esencial",
    "de": "Unverzichtbare App"
  },
  "Applications": {
    "fr": "Applications",
    "en": "Applications",
    "es": "Aplicaciones",
    "de": "Anwendungen"
  },
  "Aucun": {
    "fr": "Aucun",
    "en": "None",
    "es": "Ninguno",
    "de": "Keine"
  },
  "Aucun contenu": {
    "fr": "Aucun contenu",
    "en": "No content",
    "es": "Sin contenido",
    "de": "Kein Inhalt"
  },
  "Aucun événement à cette date.": {
    "fr": "Aucun événement à cette date.",
    "en": "No events on this date.",
    "es": "No hay eventos en esta fecha.",
    "de": "An diesem Datum gibt es keine Veranstaltungen."
  },
  "Aucun impératif": {
    "fr": "Aucun impératif",
    "en": "Nothing urgent",
    "es": "Nada urgente",
    "de": "Nichts Dringendes"
  },
  "Aucun résultat": {
    "fr": "Aucun résultat",
    "en": "No results",
    "es": "Sin resultados",
    "de": "Keine Ergebnisse"
  },
  "Aucune note récente": {
    "fr": "Aucune note récente",
    "en": "No recent notes",
    "es": "No hay notas recientes",
    "de": "Keine aktuellen Notizen"
  },
  "Aucune notification récente. Les événements importants apparaîtront ici, groupés sans doublons.": {
    "fr": "Aucune notification récente. Les événements importants apparaîtront ici, groupés sans doublons.",
    "en": "No recent notifications. Important events will appear here, grouped without duplicates.",
    "es": "No hay notificaciones recientes. Los eventos importantes aparecerán aquí, agrupados sin duplicados.",
    "de": "Keine aktuellen Benachrichtigungen. Wichtige Ereignisse werden hier gruppiert und ohne Duplikate angezeigt."
  },
  "aujourd'hui": {
    "fr": "aujourd'hui",
    "en": "today",
    "es": "hoy",
    "de": "heute"
  },
  "Aujourd'hui": {
    "fr": "Aujourd'hui",
    "en": "Today",
    "es": "Hoy",
    "de": "Heute"
  },
  "Bibliothèque": {
    "fr": "Bibliothèque",
    "en": "Library",
    "es": "Biblioteca",
    "de": "Bibliothek"
  },
  "Bibliothèque (racine)": {
    "fr": "Bibliothèque (racine)",
    "en": "Library (root)",
    "es": "Biblioteca (raíz)",
    "de": "Bibliothek (Stammverzeichnis)"
  },
  "Bibliothèque locale": {
    "fr": "Bibliothèque locale",
    "en": "Local library",
    "es": "biblioteca local",
    "de": "Lokale Bibliothek"
  },
  "Brain": {
    "fr": "Brain",
    "en": "Brain",
    "es": "Brain",
    "de": "Brain"
  },
  "Brain rejoint ETHONE.": { "fr": "Brain rejoint ETHONE.", "en": "Brain is joining ETHONE.", "es": "Brain se incorpora a ETHONE.", "de": "Brain kommt zu ETHONE." },
  "Brain sera intégré comme intelligence contextuelle, puis comme espace de travail complet.": {
    "fr": "Brain sera intégré comme intelligence contextuelle, puis comme espace de travail complet.",
    "en": "Brain will be integrated as contextual intelligence, then as a complete workspace.",
    "es": "Brain se integrará como inteligencia contextual y, después, como un espacio de trabajo completo.",
    "de": "Brain wird zuerst als kontextuelle Intelligenz und anschließend als vollständiger Arbeitsbereich integriert."
  },
  "Calendrier": {
    "fr": "Calendrier",
    "en": "Calendar",
    "es": "Calendario",
    "de": "Kalender"
  },
  "Calendrier mensuel": {
    "fr": "Calendrier mensuel",
    "en": "Monthly calendar",
    "es": "calendario mensual",
    "de": "Monatskalender"
  },
  "Capturer une idée": {
    "fr": "Capturer une idée",
    "en": "Capture an idea",
    "es": "Captar una idea",
    "de": "Idee festhalten"
  },
  "Capturez, retrouvez et reprenez une idée sans quitter votre contexte.": {
    "fr": "Capturez, retrouvez et reprenez une idée sans quitter votre contexte.",
    "en": "Capture, find and continue an idea without leaving your context.",
    "es": "Captura, encuentra y retoma una idea sin salir de tu contexto.",
    "de": "Halte Ideen fest, finde sie wieder und arbeite weiter, ohne deinen Kontext zu verlassen."
  },
  "Centre de signal": {
    "fr": "Centre de signal",
    "en": "Signal Center",
    "es": "Centro de señales",
    "de": "Signalzentrum"
  },
  "Changer de compte": {
    "fr": "Changer de compte",
    "en": "Change account",
    "es": "Cambiar cuenta",
    "de": "Konto ändern"
  },
  "Changer l'accent": {
    "fr": "Changer l'accent",
    "en": "Change the accent",
    "es": "Cambiar el acento",
    "de": "Akzent ändern"
  },
  "Changer l'accent ETHONE": {
    "fr": "Changer l'accent ETHONE",
    "en": "Change ETHONE accent",
    "es": "Cambiar el acento de ETHONE",
    "de": "ETHONE-Akzent ändern"
  },
  "Changer l'avatar": {
    "fr": "Changer l'avatar",
    "en": "Change avatar",
    "es": "Cambiar avatar",
    "de": "Avatar ändern"
  },
  "Changer le Space": {
    "fr": "Changer le Space",
    "en": "Change the Space",
    "es": "cambiar el espacio",
    "de": "Ändern Sie den Raum"
  },
  "Changer le thème": {
    "fr": "Changer le thème",
    "en": "Change the theme",
    "es": "cambiar el tema",
    "de": "Ändern Sie das Thema"
  },
  "Chaque profil restaure instantanément son Space, son Flow et son rythme.": {
    "fr": "Chaque profil restaure instantanément son Space, son Flow et son rythme.",
    "en": "Each profile instantly restores its Space, Flow and rhythm.",
    "es": "Cada perfil restaura al instante su Space, su Flow y su ritmo.",
    "de": "Jedes Profil stellt sofort seinen Space, seinen Flow und seinen Rhythmus wieder her."
  },
  "Chercher une page ou lancer une action…": {
    "fr": "Chercher une page ou lancer une action…",
    "en": "Search for a page or launch an action…",
    "es": "Busque una página o inicie una acción...",
    "de": "Suchen Sie nach einer Seite oder starten Sie eine Aktion ..."
  },
  "Choisir un profil": {
    "fr": "Choisir un profil",
    "en": "Choose a profile",
    "es": "Elige un perfil",
    "de": "Wählen Sie ein Profil"
  },
  "CHOOSE YOUR SIGNAL": {
    "fr": "CHOISISSEZ VOTRE SIGNAL",
    "en": "CHOOSE YOUR SIGNAL",
    "es": "ELIGE TU SEÑAL",
    "de": "WÄHLE DEIN SIGNAL"
  },
  "Command Center": {
    "fr": "Centre de commandes",
    "en": "Command Center",
    "es": "Centro de comandos",
    "de": "Befehlszentrale"
  },
  "Commandes": {
    "fr": "Commandes",
    "en": "Commands",
    "es": "Comandos",
    "de": "Befehle"
  },
  "Commencez par une note": {
    "fr": "Commencez par une note",
    "en": "Start with a note",
    "es": "Comience con una nota",
    "de": "Beginnen Sie mit einer Notiz"
  },
  "Contenu de la note": {
    "fr": "Contenu de la note",
    "en": "Content of the note",
    "es": "contenido de la nota",
    "de": "Inhalt der Notiz"
  },
  "Contexte actuel": {
    "fr": "Contexte actuel",
    "en": "Current context",
    "es": "Contexto actual",
    "de": "Aktueller Kontext"
  },
  "Continuer": {
    "fr": "Continuer",
    "en": "Continue",
    "es": "Continuar",
    "de": "Weitermachen"
  },
  "Continuité": {
    "fr": "Continuité",
    "en": "Continuity",
    "es": "Continuidad",
    "de": "Kontinuität"
  },
  "Créer": {
    "fr": "Créer",
    "en": "Create",
    "es": "Crear",
    "de": "Erstellen"
  },
  "Créer un profil": {
    "fr": "Créer un profil",
    "en": "Create a profile",
    "es": "Crear un perfil",
    "de": "Profil erstellen"
  },
  "Créer une ressource dans Fichiers": {
    "fr": "Créer une ressource dans Fichiers",
    "en": "Create a resource in Files",
    "es": "Crear un recurso en Archivos",
    "de": "Erstellen Sie eine Ressource in Dateien"
  },
  "Créez votre premier univers": {
    "fr": "Créez votre premier univers",
    "en": "Create your first universe",
    "es": "Crea tu primer universo",
    "de": "Erschaffe dein erstes Universum"
  },
  "Date de l'événement": {
    "fr": "Date de l'événement",
    "en": "Event Date",
    "es": "Fecha del evento",
    "de": "Veranstaltungsdatum"
  },
  "Date invalide": {
    "fr": "Date invalide",
    "en": "Invalid date",
    "es": "Fecha no válida",
    "de": "Ungültiges Datum"
  },
  "Décrivez cet environnement": {
    "fr": "Décrivez cet environnement",
    "en": "Describe this environment",
    "es": "Describe este entorno",
    "de": "Beschreiben Sie diese Umgebung"
  },
  "Dernière note": {
    "fr": "Dernière note",
    "en": "Last note",
    "es": "Última nota",
    "de": "Letzte Notiz"
  },
  "Description": {
    "fr": "Description",
    "en": "Description",
    "es": "Descripción",
    "de": "Beschreibung"
  },
  "Dim": {
    "fr": "Dim",
    "en": "Sun",
    "es": "sol",
    "de": "Sonne"
  },
  "Disponible": {
    "fr": "Disponible",
    "en": "Available",
    "es": "Disponible",
    "de": "Verfügbar"
  },
  "Coming Soon dans ETHONE": {
    "fr": "Coming Soon dans ETHONE",
    "en": "Coming soon in ETHONE",
    "es": "Próximamente en ETHONE",
    "de": "Demnächst in ETHONE"
  },
  "Documents et récents": {
    "fr": "Documents et récents",
    "en": "Documents and recent",
    "es": "Documentos y recientes",
    "de": "Dokumente und aktuell"
  },
  "Données": {
    "fr": "Données",
    "en": "Data",
    "es": "Datos",
    "de": "Daten"
  },
  "Dossier": {
    "fr": "Dossier",
    "en": "File",
    "es": "Archivo",
    "de": "Datei"
  },
  "Dossiers": {
    "fr": "Dossiers",
    "en": "Files",
    "es": "Archivos",
    "de": "Dateien"
  },
  "Dupliquer": {
    "fr": "Dupliquer",
    "en": "Duplicate",
    "es": "Duplicado",
    "de": "Duplikat"
  },
  "Échéance": {
    "fr": "Échéance",
    "en": "Due date",
    "es": "Fecha de vencimiento",
    "de": "Fälligkeitsdatum"
  },
  "Écrire et retrouver vos idées": {
    "fr": "Écrire et retrouver vos idées",
    "en": "Write and find your ideas",
    "es": "Escribe y encuentra tus ideas.",
    "de": "Schreiben Sie und finden Sie Ihre Ideen"
  },
  "Écrivez quelque chose…": {
    "fr": "Écrivez quelque chose…",
    "en": "Write something…",
    "es": "Escribe algo...",
    "de": "Schreiben Sie etwas ..."
  },
  "Éditeur de note": {
    "fr": "Éditeur de note",
    "en": "Note editor",
    "es": "editor de notas",
    "de": "Notizeditor"
  },
  "Élément supprimé.": {
    "fr": "Élément supprimé.",
    "en": "Item deleted.",
    "es": "Artículo eliminado.",
    "de": "Artikel gelöscht."
  },
  "En ligne": {
    "fr": "En ligne",
    "en": "Online",
    "es": "En línea",
    "de": "Online"
  },
  "En retard": {
    "fr": "En retard",
    "en": "Overdue",
    "es": "Atrasado",
    "de": "Überfällig"
  },
  "Enregistrer": {
    "fr": "Enregistrer",
    "en": "Save",
    "es": "Guardar",
    "de": "Speichern"
  },
  "Entrez dans votre environnement.": {
    "fr": "Entrez dans votre environnement.",
    "en": "Enter your environment.",
    "es": "Entra en tu entorno.",
    "de": "Öffne deine Umgebung."
  },
  "ENVIRONMENTS": {
    "fr": "ENVIRONNEMENTS",
    "en": "ENVIRONMENTS",
    "es": "ENTORNOS",
    "de": "UMGEBUNGEN"
  },
  "ENVIRONNEMENT ACTIF": {
    "fr": "ENVIRONNEMENT ACTIF",
    "en": "ACTIVE ENVIRONMENT",
    "es": "AMBIENTE ACTIVO",
    "de": "AKTIVE UMGEBUNG"
  },
  "ENVIRONNEMENT ETHONE": {
    "fr": "ENVIRONNEMENT ETHONE",
    "en": "ETHONE ENVIRONMENT",
    "es": "ENTORNO ETONO",
    "de": "ETHONE-UMGEBUNG"
  },
  "Environnement ouvert.": {
    "fr": "Environnement ouvert.",
    "en": "Open environment.",
    "es": "Entorno abierto.",
    "de": "Offene Umgebung."
  },
  "Espace d'écriture": {
    "fr": "Espace d'écriture",
    "en": "Writing space",
    "es": "Espacio de escritura",
    "de": "Platz zum Schreiben"
  },
  "Essayez une page, une action ou un réglage.": {
    "fr": "Essayez une page, une action ou un réglage.",
    "en": "Try a page, action, or setting.",
    "es": "Pruebe una página, acción o configuración.",
    "de": "Probieren Sie eine Seite, Aktion oder Einstellung aus."
  },
  "Essentiel": {
    "fr": "Essentiel",
    "en": "Essential",
    "es": "Esencial",
    "de": "Essentiell"
  },
  "État": {
    "fr": "État",
    "en": "Status",
    "es": "Estado",
    "de": "Status"
  },
  "ETHONE / HOME": {
    "fr": "ETHONE / ACCUEIL",
    "en": "ETHONE / HOME",
    "es": "ETHONE / INICIO",
    "de": "ETHONE / START"
  },
  "ETHONE Command Center": {
    "fr": "Centre de commandes ETHONE",
    "en": "ETHONE Command Center",
    "es": "Centro de comandos ETHONE",
    "de": "ETHONE Befehlszentrale"
  },
  "ETHONE est arrêté.": {
    "fr": "ETHONE est arrêté.",
    "en": "ETHONE is arrested.",
    "es": "ETHONE es arrestado.",
    "de": "ETHONE wird verhaftet."
  },
  "ETHONE garde le contexte à portée de main, sans charger le reste du système.": {
    "fr": "ETHONE garde le contexte à portée de main, sans charger le reste du système.",
    "en": "ETHONE keeps context at hand, without loading the rest of the system.",
    "es": "ETHONE mantiene el contexto a mano, sin cargar el resto del sistema.",
    "de": "ETHONE hält den Kontext griffbereit, ohne den Rest des Systems zu laden."
  },
  "ETHONE Home": {
    "fr": "Accueil ETHONE",
    "en": "ETHONE Home",
    "es": "Inicio de ETHONE",
    "de": "ETHONE Start"
  },
  "ETHONE reste discret pendant que vous avancez.": {
    "fr": "ETHONE reste discret pendant que vous avancez.",
    "en": "ETHONE remains discreet as you move forward.",
    "es": "ETHONE se mantiene discreto mientras avanzas.",
    "de": "ETHONE bleibt im Hintergrund, während du weiterarbeitest."
  },
  "Événement ajouté.": {
    "fr": "Événement ajouté.",
    "en": "Event added.",
    "es": "Evento agregado.",
    "de": "Veranstaltung hinzugefügt."
  },
  "Événement introuvable": {
    "fr": "Événement introuvable",
    "en": "Event not found",
    "es": "Evento no encontrado",
    "de": "Veranstaltung nicht gefunden"
  },
  "Événement supprimé.": {
    "fr": "Événement supprimé.",
    "en": "Event deleted.",
    "es": "Evento eliminado.",
    "de": "Veranstaltung gelöscht."
  },
  "Export du profil prêt.": {
    "fr": "Export du profil prêt.",
    "en": "Profile export ready.",
    "es": "Exportación de perfil lista.",
    "de": "Profilexport bereit."
  },
  "Exporter": {
    "fr": "Exporter",
    "en": "Export",
    "es": "Exportar",
    "de": "Export"
  },
  "Favori": {
    "fr": "Favori",
    "en": "Favorite",
    "es": "Favorito",
    "de": "Favorit"
  },
  "Favoris": {
    "fr": "Favoris",
    "en": "Favorites",
    "es": "Favoritos",
    "de": "Favoriten"
  },
  "Fermer": {
    "fr": "Fermer",
    "en": "Close",
    "es": "Cerca",
    "de": "Schließen"
  },
  "Fermer la notification": {
    "fr": "Fermer la notification",
    "en": "Close notification",
    "es": "Cerrar notificación",
    "de": "Benachrichtigung schließen"
  },
  "Fermer le panneau": {
    "fr": "Fermer le panneau",
    "en": "Close panel",
    "es": "Cerrar panel",
    "de": "Panel schließen"
  },
  "Fichier": {
    "fr": "Fichier",
    "en": "File",
    "es": "Archivo",
    "de": "Datei"
  },
  "Fichier introuvable": {
    "fr": "Fichier introuvable",
    "en": "File not found",
    "es": "Archivo no encontrado",
    "de": "Datei nicht gefunden"
  },
  "Fichiers": {
    "fr": "Fichiers",
    "en": "Files",
    "es": "Archivos",
    "de": "Dateien"
  },
  "Fil de la journée": {
    "fr": "Fil de la journée",
    "en": "Day timeline",
    "es": "Cronología del día",
    "de": "Tagesverlauf"
  },
  "Filtrer les tâches": {
    "fr": "Filtrer les tâches",
    "en": "Filter tasks",
    "es": "Filtrar tareas",
    "de": "Aufgaben filtern"
  },
  "Flèches pour parcourir · Entrée pour ouvrir · Menu pour gérer": {
    "fr": "Flèches pour parcourir · Entrée pour ouvrir · Menu pour gérer",
    "en": "Arrows to navigate · Enter to open · Menu to manage",
    "es": "Flechas para navegar · Enter para abrir · Menú para administrar",
    "de": "Pfeile zum Navigieren · Eingabetaste zum Öffnen · Menü zum Verwalten"
  },
  "Flow": {
    "fr": "Flow",
    "en": "Flow",
    "es": "Flow",
    "de": "Flow"
  },
  "Flow principal": {
    "fr": "Flow principal",
    "en": "Main flow",
    "es": "Flujo principal",
    "de": "Haupt-Flow"
  },
  "Gardez le cap sur ce qui compte.": {
    "fr": "Gardez le cap sur ce qui compte.",
    "en": "Stay focused on what matters.",
    "es": "Manténgase enfocado en lo que importa.",
    "de": "Konzentrieren Sie sich auf das Wesentliche."
  },
  "Import de fichiers": {
    "fr": "Import de fichiers",
    "en": "Importing files",
    "es": "Importando archivos",
    "de": "Dateien importieren"
  },
  "Initialisation d'ETHONE": {
    "fr": "Initialisation d'ETHONE",
    "en": "Initializing ETHONE",
    "es": "Inicializando ETHONE",
    "de": "ETHONE wird initialisiert"
  },
  "Intelligence contextuelle": {
    "fr": "Intelligence contextuelle",
    "en": "Contextual intelligence",
    "es": "Inteligencia contextual",
    "de": "Kontextuelle Intelligenz"
  },
  "Interface": {
    "fr": "Interface",
    "en": "Interface",
    "es": "Interfaz",
    "de": "Schnittstelle"
  },
  "Jeu": {
    "fr": "Jeu",
    "en": "Game",
    "es": "juego",
    "de": "Spiel"
  },
  "Journée disponible": {
    "fr": "Journée disponible",
    "en": "Day available",
    "es": "Día disponible",
    "de": "Tag verfügbar"
  },
  "L'éditeur ETHONE arrive dans la prochaine phase.": {
    "fr": "L'éditeur ETHONE arrive dans la prochaine phase.",
    "en": "The ETHONE editor is coming in the next phase.",
    "es": "El editor de ETHONE llegará en la siguiente fase.",
    "de": "Der ETHONE-Editor kommt in der nächsten Phase."
  },
  "L'environnement n'a pas pu être ouvert.": {
    "fr": "L'environnement n'a pas pu être ouvert.",
    "en": "The environment could not be opened.",
    "es": "El entorno no se pudo abrir.",
    "de": "Die Umgebung konnte nicht geöffnet werden."
  },
  "La création ETHONE arrive dans la prochaine phase.": {
    "fr": "La création ETHONE arrive dans la prochaine phase.",
    "en": "ETHONE creation is coming in the next phase.",
    "es": "La creación ETHONE llegará en la próxima fase.",
    "de": "Die ETHONE-Erstellung kommt in der nächsten Phase."
  },
  "Langue": {
    "fr": "Langue",
    "en": "Language",
    "es": "Idioma",
    "de": "Sprache"
  },
  "Langue de l'interface": {
    "fr": "Langue de l'interface",
    "en": "Interface language",
    "es": "Idioma de la interfaz",
    "de": "Schnittstellensprache"
  },
  "Le bon moment pour conclure sans se presser.": {
    "fr": "Le bon moment pour conclure sans se presser.",
    "en": "The right time to conclude without rushing.",
    "es": "El momento adecuado para concluir sin prisas.",
    "de": "Der richtige Zeitpunkt, um ohne Eile abzuschließen."
  },
  "Le client Supabase est indisponible.": {
    "fr": "Le client Supabase est indisponible.",
    "en": "The Supabase client is unavailable.",
    "es": "El cliente Supabase no está disponible.",
    "de": "Der Supabase-Client ist nicht verfügbar."
  },
  "Le client Supabase n'est pas chargé.": {
    "fr": "Le client Supabase n'est pas chargé.",
    "en": "The Supabase client is not loaded.",
    "es": "El cliente Supabase no está cargado.",
    "de": "Der Supabase-Client ist nicht geladen."
  },
  "Le mois complet, puis seulement ce qui compte pour la journée choisie.": {
    "fr": "Le mois complet, puis seulement ce qui compte pour la journée choisie.",
    "en": "The entire month, then only what matters for the chosen day.",
    "es": "Todo el mes, luego sólo lo importante para el día elegido.",
    "de": "Den ganzen Monat, dann nur das, was für den gewählten Tag wichtig ist."
  },
  "Le service a dépassé le temps d'attente.": {
    "fr": "Le service a dépassé le temps d'attente.",
    "en": "The service exceeded the waiting time.",
    "es": "El servicio superó el tiempo de espera.",
    "de": "Der Service hat die Wartezeit überschritten."
  },
  "Le service d'authentification est incomplet.": {
    "fr": "Le service d'authentification est incomplet.",
    "en": "The authentication service is incomplete.",
    "es": "El servicio de autenticación está incompleto.",
    "de": "Der Authentifizierungsdienst ist unvollständig."
  },
  "Le service d'authentification n'est pas disponible.": {
    "fr": "Le service d'authentification n'est pas disponible.",
    "en": "The authentication service is not available.",
    "es": "El servicio de autenticación no está disponible.",
    "de": "Der Authentifizierungsdienst ist nicht verfügbar."
  },
  "Le système principal n'est pas ouvert.": {
    "fr": "Le système principal n'est pas ouvert.",
    "en": "The main system is not open.",
    "es": "El sistema principal no está abierto.",
    "de": "Das Hauptsystem ist nicht geöffnet."
  },
  "Les anciennes applications sont retirées du runtime. Les capacités utiles reviendront comme modules natifs ETHONE.": {
    "fr": "Les anciennes applications sont retirées du runtime. Les capacités utiles reviendront comme modules natifs ETHONE.",
    "en": "Old applications are removed from the runtime. Useful capabilities will return as native ETHONE modules.",
    "es": "Las aplicaciones heredadas se eliminaron del runtime. Las capacidades útiles volverán como módulos nativos de ETHONE.",
    "de": "Alte Anwendungen wurden aus der Runtime entfernt. Nützliche Funktionen kehren als native ETHONE-Module zurück."
  },
  "Les préférences seront migrées uniquement lorsqu'elles ont un effet immédiat et persistant.": {
    "fr": "Les préférences seront migrées uniquement lorsqu'elles ont un effet immédiat et persistant.",
    "en": "Preferences will only be migrated when they have an immediate and persistent effect.",
    "es": "Las preferencias sólo se migrarán cuando tengan un efecto inmediato y persistente.",
    "de": "Präferenzen werden nur dann migriert, wenn sie eine unmittelbare und dauerhafte Wirkung haben."
  },
  "Les widgets ETHONE seront remontés ici sans alourdir le démarrage. Vos widgets actuels restent disponibles pendant la migration.": {
    "fr": "Les widgets ETHONE seront remontés ici sans alourdir le démarrage. Vos widgets actuels restent disponibles pendant la migration.",
    "en": "ETHONE widgets will be reassembled here without burdening startup. Your current widgets remain available during migration.",
    "es": "Los widgets de ETHONE se volverán a ensamblar aquí sin sobrecargar el inicio. Sus widgets actuales permanecen disponibles durante la migración.",
    "de": "ETHONE-Widgets werden hier wieder zusammengefügt, ohne den Start zu belasten. Ihre aktuellen Widgets bleiben während der Migration verfügbar."
  },
  "Lien": {
    "fr": "Lien",
    "en": "Link",
    "es": "Enlace",
    "de": "Link"
  },
  "Lien invalide": {
    "fr": "Lien invalide",
    "en": "Invalid link",
    "es": "Enlace no válido",
    "de": "Ungültiger Link"
  },
  "Liens": {
    "fr": "Liens",
    "en": "Links",
    "es": "Enlaces",
    "de": "Links"
  },
  "Local": {
    "fr": "Local",
    "en": "Local",
    "es": "Local",
    "de": "Lokal"
  },
  "Lun": {
    "fr": "Lun",
    "en": "Mon",
    "es": "lun",
    "de": "Mo"
  },
  "Maintenant": {
    "fr": "Maintenant",
    "en": "Now",
    "es": "Ahora",
    "de": "Jetzt"
  },
  "Mar": {
    "fr": "Mar",
    "en": "Tue",
    "es": "mar",
    "de": "Di"
  },
  "Menthe, ciel ou ambre": {
    "fr": "Menthe, ciel ou ambre",
    "en": "Mint, sky or amber",
    "es": "Menta, cielo o ámbar",
    "de": "Mint, Himmelblau oder Bernstein"
  },
  "Mer": {
    "fr": "Mer",
    "en": "Sea",
    "es": "Mar",
    "de": "Meer"
  },
  "Migration en cours": {
    "fr": "Migration en cours",
    "en": "Migration in progress",
    "es": "Migración en curso",
    "de": "Migration läuft"
  },
  "Modifier le profil": {
    "fr": "Modifier le profil",
    "en": "Edit profile",
    "es": "Editar perfil",
    "de": "Profil bearbeiten"
  },
  "Mois précédent": {
    "fr": "Mois précédent",
    "en": "Previous month",
    "es": "Mes anterior",
    "de": "Vorheriger Monat"
  },
  "Mois suivant": {
    "fr": "Mois suivant",
    "en": "Next month",
    "es": "El próximo mes",
    "de": "Nächsten Monat"
  },
  "Navigation": {
    "fr": "Navigation",
    "en": "Navigation",
    "es": "Navegación",
    "de": "Navigation"
  },
  "Navigation principale": {
    "fr": "Navigation principale",
    "en": "Main navigation",
    "es": "Navegación principal",
    "de": "Hauptnavigation"
  },
  "Naviguer": {
    "fr": "Naviguer",
    "en": "Navigate",
    "es": "Navegar",
    "de": "Navigieren"
  },
  "Nom": {
    "fr": "Nom",
    "en": "Name",
    "es": "Nombre",
    "de": "Name"
  },
  "Nom de l'élément": {
    "fr": "Nom de l'élément",
    "en": "Item Name",
    "es": "Nombre del artículo",
    "de": "Artikelname"
  },
  "Nom du profil": {
    "fr": "Nom du profil",
    "en": "Profile name",
    "es": "Nombre del perfil",
    "de": "Profilname"
  },
  "Nom requis": {
    "fr": "Nom requis",
    "en": "Name required",
    "es": "Nombre requerido",
    "de": "Name erforderlich"
  },
  "Note enregistrée localement.": {
    "fr": "Note enregistrée localement.",
    "en": "Note saved locally.",
    "es": "Nota guardada localmente.",
    "de": "Notiz lokal gespeichert."
  },
  "Note introuvable": {
    "fr": "Note introuvable",
    "en": "Note not found",
    "es": "Nota no encontrada",
    "de": "Notiz nicht gefunden"
  },
  "Note locale": {
    "fr": "Note locale",
    "en": "Local note",
    "es": "nota local",
    "de": "Lokaler Hinweis"
  },
  "Note sans titre": {
    "fr": "Note sans titre",
    "en": "Untitled note",
    "es": "Nota sin título",
    "de": "Unbenannte Notiz"
  },
  "Note supprimée.": {
    "fr": "Note supprimée.",
    "en": "Note deleted.",
    "es": "Nota eliminada.",
    "de": "Notiz gelöscht."
  },
  "notes": {
    "fr": "notes",
    "en": "notes",
    "es": "notas",
    "de": "Notizen"
  },
  "Nouvel événement": {
    "fr": "Nouvel événement",
    "en": "New event",
    "es": "Nuevo evento",
    "de": "Neuer Termin"
  },
  "Nouvelle note": {
    "fr": "Nouvelle note",
    "en": "New note",
    "es": "Nueva nota",
    "de": "Neue Notiz"
  },
  "Nouvelle note créée.": {
    "fr": "Nouvelle note créée.",
    "en": "New note created.",
    "es": "Nueva nota creada.",
    "de": "Neue Notiz erstellt."
  },
  "Nouvelle tâche": {
    "fr": "Nouvelle tâche",
    "en": "New task",
    "es": "Nueva tarea",
    "de": "Neue Aufgabe"
  },
  "Ouvrir": {
    "fr": "Ouvrir",
    "en": "Open",
    "es": "Abrir",
    "de": "Öffnen"
  },
  "Ouvrir Brain": {
    "fr": "Ouvrir Brain",
    "en": "Open Brain",
    "es": "Abrir Brain",
    "de": "Brain öffnen"
  },
  "Ouvrir Calendrier": {
    "fr": "Ouvrir Calendrier",
    "en": "Open Calendar",
    "es": "Abrir Calendario",
    "de": "Kalender öffnen"
  },
  "Ouvrir Fichiers": {
    "fr": "Ouvrir Fichiers",
    "en": "Open Files",
    "es": "Abrir Archivos",
    "de": "Dateien öffnen"
  },
  "Ouvrir l'accueil": {
    "fr": "Ouvrir l'accueil",
    "en": "Open Home",
    "es": "Abrir Inicio",
    "de": "Start öffnen"
  },
  "Runtime unifié": {
    "fr": "Runtime unifié",
    "en": "Unified runtime",
    "es": "Runtime unificado",
    "de": "Einheitliche Runtime"
  },
  "Ouvrir le calendrier": {
    "fr": "Ouvrir le calendrier",
    "en": "Open calendar",
    "es": "calendario abierto",
    "de": "Kalender öffnen"
  },
  "Ouvrir le Command Center": {
    "fr": "Ouvrir le Command Center",
    "en": "Open Command Center",
    "es": "Centro de comando abierto",
    "de": "Öffnen Sie das Command Center"
  },
  "Ouvrir le profil": {
    "fr": "Ouvrir le profil",
    "en": "Open profile",
    "es": "Abrir perfil",
    "de": "Profil öffnen"
  },
  "Ouvrir les modules ETHONE": {
    "fr": "Ouvrir les modules ETHONE",
    "en": "Open ETHONE modules",
    "es": "Abrir módulos de ETHONE",
    "de": "ETHONE-Module öffnen"
  },
  "Ouvrir les notifications": {
    "fr": "Ouvrir les notifications",
    "en": "Open notifications",
    "es": "Notificaciones abiertas",
    "de": "Benachrichtigungen öffnen"
  },
  "Ouvrir les widgets": {
    "fr": "Ouvrir les widgets",
    "en": "Open widgets",
    "es": "Abrir widgets",
    "de": "Widgets öffnen"
  },
  "Ouvrir Notes": {
    "fr": "Ouvrir Notes",
    "en": "Open Notes",
    "es": "Abrir Notas",
    "de": "Notizen öffnen"
  },
  "Ouvrir Réglages": {
    "fr": "Ouvrir Réglages",
    "en": "Open Settings",
    "es": "Abrir configuración",
    "de": "Einstellungen öffnen"
  },
  "Ouvrir Tâches": {
    "fr": "Ouvrir Tâches",
    "en": "Open Tasks",
    "es": "Abrir Tareas",
    "de": "Aufgaben öffnen"
  },
  "Ouvrir Widgets": {
    "fr": "Ouvrir Widgets",
    "en": "Open Widgets",
    "es": "Abrir Widgets",
    "de": "Widgets öffnen"
  },
  "Panneau contextuel": {
    "fr": "Panneau contextuel",
    "en": "Pop-up panel",
    "es": "Panel emergente",
    "de": "Popup-Panel"
  },
  "Personnel": {
    "fr": "Personnel",
    "en": "Personal",
    "es": "Personal",
    "de": "Persönlich"
  },
  "Planning et événements": {
    "fr": "Planning et événements",
    "en": "Planning and events",
    "es": "Planificación y eventos",
    "de": "Planung und Veranstaltungen"
  },
  "Préchargés": {
    "fr": "Préchargés",
    "en": "Preloaded",
    "es": "Precargado",
    "de": "Vorinstalliert"
  },
  "Prêt": {
    "fr": "Prêt",
    "en": "Ready",
    "es": "Listo",
    "de": "Bereit"
  },
  "Priorité": {
    "fr": "Priorité",
    "en": "Priority",
    "es": "Prioridad",
    "de": "Priorität"
  },
  "Priorité basse": {
    "fr": "Priorité basse",
    "en": "Low priority",
    "es": "Prioridad baja",
    "de": "Niedrige Priorität"
  },
  "Priorité haute": {
    "fr": "Priorité haute",
    "en": "High priority",
    "es": "Alta prioridad",
    "de": "Hohe Priorität"
  },
  "Priorité normale": {
    "fr": "Priorité normale",
    "en": "Normal priority",
    "es": "Prioridad normal",
    "de": "Normale Priorität"
  },
  "Priorités": {
    "fr": "Priorités",
    "en": "Priorities",
    "es": "Prioridades",
    "de": "Prioritäten"
  },
  "Priorités et progression": {
    "fr": "Priorités et progression",
    "en": "Priorities and progress",
    "es": "Prioridades y avances",
    "de": "Prioritäten und Fortschritte"
  },
  "Profil": {
    "fr": "Profil",
    "en": "Profile",
    "es": "Perfil",
    "de": "Profil"
  },
  "Profils ETHONE": {
    "fr": "Profils ETHONE",
    "en": "ETHONE profiles",
    "es": "Perfiles de ETHONE",
    "de": "ETHONE-Profile"
  },
  "Que faut-il accomplir ?": {
    "fr": "Que faut-il accomplir ?",
    "en": "What needs to be accomplished?",
    "es": "¿Qué hay que lograr?",
    "de": "Was muss erreicht werden?"
  },
  "Récemment": {
    "fr": "Récemment",
    "en": "Recently",
    "es": "Recientemente",
    "de": "Kürzlich"
  },
  "Récents": {
    "fr": "Récents",
    "en": "Recent",
    "es": "Reciente",
    "de": "Jüngste"
  },
  "Rechercher dans Fichiers": {
    "fr": "Rechercher dans Fichiers",
    "en": "Search in Files",
    "es": "Buscar en archivos",
    "de": "In Dateien suchen"
  },
  "Rechercher dans les notes": {
    "fr": "Rechercher dans les notes",
    "en": "Search in notes",
    "es": "buscar en notas",
    "de": "In Notizen suchen"
  },
  "Rechercher ou lancer une action": {
    "fr": "Rechercher ou lancer une action",
    "en": "Search or launch an action",
    "es": "Buscar o lanzar una acción",
    "de": "Suchen oder starten Sie eine Aktion"
  },
  "Rechercher une tâche": {
    "fr": "Rechercher une tâche",
    "en": "Find a task",
    "es": "encontrar una tarea",
    "de": "Finden Sie eine Aufgabe"
  },
  "Réglages": {
    "fr": "Réglages",
    "en": "Settings",
    "es": "Configuración",
    "de": "Einstellungen"
  },
  "Réglages rejoint ETHONE.": { "fr": "Réglages rejoint ETHONE.", "en": "Settings is joining ETHONE.", "es": "Configuración se incorpora a ETHONE.", "de": "Die Einstellungen kommen zu ETHONE." },
  "Renommer": {
    "fr": "Renommer",
    "en": "Rename",
    "es": "Rebautizar",
    "de": "Umbenennen"
  },
  "Reprendre": {
    "fr": "Reprendre",
    "en": "Resume",
    "es": "Retomar",
    "de": "Fortsetzen"
  },
  "Résultats": { "fr": "Résultats", "en": "Results", "es": "Resultados", "de": "Ergebnisse" },
  "Réseau": {
    "fr": "Réseau",
    "en": "Network",
    "es": "Red",
    "de": "Netzwerk"
  },
  "Ressource locale": {
    "fr": "Ressource locale",
    "en": "Local resource",
    "es": "recurso local",
    "de": "Lokale Ressource"
  },
  "Retrouvez vos ressources, puis agissez depuis un aperçu unique.": {
    "fr": "Retrouvez vos ressources, puis agissez depuis un aperçu unique.",
    "en": "Find your resources, then take action from a single view.",
    "es": "Encuentra tus recursos y actúa desde una única vista.",
    "de": "Finde deine Ressourcen und verwalte sie aus einer einzigen Ansicht."
  },
  "Sam": {
    "fr": "Sam",
    "en": "Sam",
    "es": "Sam",
    "de": "Sam"
  },
  "Sans échéance": {
    "fr": "Sans échéance",
    "en": "No due date",
    "es": "Sin fecha límite",
    "de": "Kein Fälligkeitsdatum"
  },
  "Se déconnecter": {
    "fr": "Se déconnecter",
    "en": "Log out",
    "es": "Cerrar sesión",
    "de": "Abmelden"
  },
  "Sélecteur de profils": {
    "fr": "Sélecteur de profils",
    "en": "Profile selector",
    "es": "Selector de perfil",
    "de": "Profilauswahl"
  },
  "Sélection du profil": {
    "fr": "Sélection du profil",
    "en": "Profile selection",
    "es": "Selección de perfil",
    "de": "Profilauswahl"
  },
  "Sélectionnez un élément": {
    "fr": "Sélectionnez un élément",
    "en": "Select an item",
    "es": "Seleccione un elemento",
    "de": "Wählen Sie einen Artikel aus"
  },
  "Session locale": {
    "fr": "Session locale",
    "en": "Local session",
    "es": "sesión local",
    "de": "Lokale Sitzung"
  },
  "Signal": {
    "fr": "Signal",
    "en": "Signal",
    "es": "Señal",
    "de": "Signal"
  },
  "Signal système": {
    "fr": "Signal système",
    "en": "System signal",
    "es": "Señal del sistema",
    "de": "Systemsignal"
  },
  "Sources": {
    "fr": "Sources",
    "en": "Sources",
    "es": "Fuentes",
    "de": "Quellen"
  },
  "Space": {
    "fr": "Space",
    "en": "Space",
    "es": "Espacio",
    "de": "Space"
  },
  "Space principal": {
    "fr": "Space principal",
    "en": "Main Space",
    "es": "Space principal",
    "de": "Haupt-Space"
  },
  "Stable": {
    "fr": "Stable",
    "en": "Stable",
    "es": "Estable",
    "de": "Stabil"
  },
  "Suggestions": {
    "fr": "Suggestions",
    "en": "Suggestions",
    "es": "Sugerencias",
    "de": "Vorschläge"
  },
  "Supprimer": {
    "fr": "Supprimer",
    "en": "Delete",
    "es": "Eliminar",
    "de": "Löschen"
  },
  "Supprimer cette note ?": {
    "fr": "Supprimer cette note ?",
    "en": "Delete this note?",
    "es": "¿Eliminar esta nota?",
    "de": "Diese Notiz löschen?"
  },
  "Supprimer définitivement": {
    "fr": "Supprimer définitivement",
    "en": "Permanently delete",
    "es": "Eliminar permanentemente",
    "de": "Endgültig löschen"
  },
  "Supprimer la note": {
    "fr": "Supprimer la note",
    "en": "Delete rating",
    "es": "Eliminar calificación",
    "de": "Bewertung löschen"
  },
  "Sûr": {
    "fr": "Sûr",
    "en": "Safe",
    "es": "Seguro",
    "de": "Sicher"
  },
  "Survolez pour prévisualiser · Double-cliquez pour ouvrir": {
    "fr": "Survolez pour prévisualiser · Double-cliquez pour ouvrir",
    "en": "Hover to preview · Double-click to open",
    "es": "Coloca el cursor para obtener una vista previa · Haz doble clic para abrir",
    "de": "Bewegen Sie den Mauszeiger zur Vorschau · Doppelklicken Sie zum Öffnen"
  },
  "Système": {
    "fr": "Système",
    "en": "System",
    "es": "Sistema",
    "de": "System"
  },
  "Tâche ajoutée.": {
    "fr": "Tâche ajoutée.",
    "en": "Task added.",
    "es": "Tarea agregada.",
    "de": "Aufgabe hinzugefügt."
  },
  "Tâche introuvable": {
    "fr": "Tâche introuvable",
    "en": "Task not found",
    "es": "Tarea no encontrada",
    "de": "Aufgabe nicht gefunden"
  },
  "Tâche supprimée.": {
    "fr": "Tâche supprimée.",
    "en": "Task deleted.",
    "es": "Tarea eliminada.",
    "de": "Aufgabe gelöscht."
  },
  "Tâches": {
    "fr": "Tâches",
    "en": "Tasks",
    "es": "Tareas",
    "de": "Aufgaben"
  },
  "Tag": {
    "fr": "Tag",
    "en": "Tag",
    "es": "Etiqueta",
    "de": "Etikett"
  },
  "Tag du fichier": {
    "fr": "Tag du fichier",
    "en": "File tag",
    "es": "Etiqueta de archivo",
    "de": "Datei-Tag"
  },
  "Temps": {
    "fr": "Temps",
    "en": "Time",
    "es": "tiempo",
    "de": "Zeit"
  },
  "Terminées": {
    "fr": "Terminées",
    "en": "Completed",
    "es": "Completado",
    "de": "Abgeschlossen"
  },
  "Thème": {
    "fr": "Thème",
    "en": "Theme",
    "es": "Tema",
    "de": "Thema"
  },
  "Titre de l'événement": {
    "fr": "Titre de l'événement",
    "en": "Event title",
    "es": "Título del evento",
    "de": "Veranstaltungstitel"
  },
  "Titre de la note": {
    "fr": "Titre de la note",
    "en": "Note title",
    "es": "Título de la nota",
    "de": "Titel der Notiz"
  },
  "Titre de la tâche": {
    "fr": "Titre de la tâche",
    "en": "Task title",
    "es": "Título de la tarea",
    "de": "Aufgabentitel"
  },
  "Titre requis": {
    "fr": "Titre requis",
    "en": "Title required",
    "es": "Título requerido",
    "de": "Titel erforderlich"
  },
  "Tous les fichiers": {
    "fr": "Tous les fichiers",
    "en": "All files",
    "es": "Todos los archivos",
    "de": "Alle Dateien"
  },
  "Tout est clair": {
    "fr": "Tout est clair",
    "en": "Everything is clear",
    "es": "todo esta claro",
    "de": "Alles ist klar"
  },
  "Toute la journée": {
    "fr": "Toute la journée",
    "en": "All day",
    "es": "Todo el día",
    "de": "Den ganzen Tag"
  },
  "Toutes": {
    "fr": "Toutes",
    "en": "All",
    "es": "Todos",
    "de": "Alle"
  },
  "Travail récent": {
    "fr": "Travail récent",
    "en": "Recent work",
    "es": "Trabajo reciente",
    "de": "Aktuelle Arbeiten"
  },
  "Trier les fichiers": {
    "fr": "Trier les fichiers",
    "en": "Sort files",
    "es": "ordenar archivos",
    "de": "Dateien sortieren"
  },
  "Un départ calme, puis l'essentiel.": {
    "fr": "Un départ calme, puis l'essentiel.",
    "en": "A calm start, then the main thing.",
    "es": "Un comienzo tranquilo, luego lo principal.",
    "de": "Ein ruhiger Anfang, dann kommt es auf die Hauptsache an."
  },
  "Un espace calme s'ouvrira ici pour écrire.": {
    "fr": "Un espace calme s'ouvrira ici pour écrire.",
    "en": "A quiet space will open up here for writing.",
    "es": "Aquí se abrirá un espacio tranquilo para escribir.",
    "de": "Hier öffnet sich ein ruhiger Raum zum Schreiben."
  },
  "Un profil réunit votre Space, votre thème et votre contexte local.": {
    "fr": "Un profil réunit votre Space, votre thème et votre contexte local.",
    "en": "A profile brings together your Space, your theme and your local context.",
    "es": "Un perfil reúne su Espacio, su temática y su contexto local.",
    "de": "Ein Profil vereint Ihren Raum, Ihr Thema und Ihren lokalen Kontext."
  },
  "Un seul moteur de widgets remplacera les anciens panneaux. Les widgets cachés ne seront plus montés.": {
    "fr": "Un seul moteur de widgets remplacera les anciens panneaux. Les widgets cachés ne seront plus montés.",
    "en": "A single widget engine will replace the old panels. Hidden widgets will no longer be mounted.",
    "es": "Un único motor de widgets reemplazará los paneles antiguos. Los widgets ocultos ya no se montarán.",
    "de": "Eine einzige Widget-Engine wird die alten Panels ersetzen. Versteckte Widgets werden nicht mehr gemountet."
  },
  "Une seule liste, assez claire pour décider quoi faire ensuite.": {
    "fr": "Une seule liste, assez claire pour décider quoi faire ensuite.",
    "en": "Just one list, clear enough to decide what to do next.",
    "es": "Sólo una lista, lo suficientemente clara como para decidir qué hacer a continuación.",
    "de": "Nur eine Liste, klar genug, um zu entscheiden, was als nächstes zu tun ist."
  },
  "Une surface dédiée, sans chrome inutile.": {
    "fr": "Une surface dédiée, sans chrome inutile.",
    "en": "A dedicated surface, without unnecessary chrome.",
    "es": "Una superficie dedicada, sin elementos innecesarios.",
    "de": "Eine eigene Oberfläche ohne unnötige Bedienelemente."
  },
  "Ven": {
    "fr": "Ven",
    "en": "Fri",
    "es": "viernes",
    "de": "Fr"
  },
  "Vérification du profil requise.": {
    "fr": "Vérification du profil requise.",
    "en": "Profile verification required.",
    "es": "Se requiere verificación de perfil.",
    "de": "Profilverifizierung erforderlich."
  },
  "Version interne": {
    "fr": "Version interne",
    "en": "Internal version",
    "es": "Versión interna",
    "de": "Interne Version"
  },
  "Violet": {
    "fr": "Violet",
    "en": "Purple",
    "es": "Púrpura",
    "de": "Lila"
  },
  "Voir toutes les notes": {
    "fr": "Voir toutes les notes",
    "en": "View all notes",
    "es": "Ver todas las notas",
    "de": "Alle Notizen anzeigen"
  },
  "VOS ENVIRONNEMENTS": {
    "fr": "VOS ENVIRONNEMENTS",
    "en": "YOUR ENVIRONMENTS",
    "es": "TUS ENTORNOS",
    "de": "DEINE UMGEBUNGEN"
  },
  "Votre environnement actif conserve ses données, ses préférences et son contexte local.": {
    "fr": "Votre environnement actif conserve ses données, ses préférences et son contexte local.",
    "en": "Your active environment maintains its data, preferences, and local context.",
    "es": "Su entorno activo mantiene sus datos, preferencias y contexto local.",
    "de": "Ihre aktive Umgebung behält ihre Daten, Präferenzen und den lokalen Kontext bei."
  },
  "Votre environnement quotidien.": {
    "fr": "Votre environnement quotidien.",
    "en": "Your daily environment.",
    "es": "Tu entorno diario.",
    "de": "Ihre tägliche Umgebung."
  },
  "Votre journée est libre pour le moment.": {
    "fr": "Votre journée est libre pour le moment.",
    "en": "Your day is free for now.",
    "es": "Tu día es libre por ahora.",
    "de": "Ihr Tag ist vorerst frei."
  },
  "Votre journée peut commencer ici.": {
    "fr": "Votre journée peut commencer ici.",
    "en": "Your day can start here.",
    "es": "Tu día puede comenzar aquí.",
    "de": "Hier kann Ihr Tag beginnen."
  },
  "Vue d'ensemble ETHONE": {
    "fr": "Vue d'ensemble ETHONE",
    "en": "ETHONE Overview",
    "es": "Descripción general de ETHONE",
    "de": "ETHONE-Übersicht"
  },
  "Vue grille": {
    "fr": "Vue grille",
    "en": "Grid view",
    "es": "Vista de cuadrícula",
    "de": "Rasteransicht"
  },
  "Vue liste": {
    "fr": "Vue liste",
    "en": "List view",
    "es": "Vista de lista",
    "de": "Listenansicht"
  },
  "En pause": {
    "fr": "En pause",
    "en": "Paused",
    "es": "En pausa",
    "de": "Pausiert"
  },
  "Lecture en cours": {
    "fr": "Lecture en cours",
    "en": "Now playing",
    "es": "Reproduciendo",
    "de": "Wird abgespielt"
  },
  "Lecture externe": {
    "fr": "Lecture externe",
    "en": "External playback",
    "es": "Reproduccion externa",
    "de": "Externe Wiedergabe"
  },
  "Lecture Spotify": {
    "fr": "Lecture Spotify",
    "en": "Spotify playback",
    "es": "Reproduccion de Spotify",
    "de": "Spotify-Wiedergabe"
  },
  "Lecture Spotify en cours": {
    "fr": "Lecture Spotify en cours",
    "en": "Spotify is playing",
    "es": "Spotify esta reproduciendo",
    "de": "Spotify wird abgespielt"
  },
  "Mettre Spotify en pause": {
    "fr": "Mettre Spotify en pause",
    "en": "Pause Spotify",
    "es": "Pausar Spotify",
    "de": "Spotify pausieren"
  },
  "Progression Spotify": {
    "fr": "Progression Spotify",
    "en": "Spotify progress",
    "es": "Progreso de Spotify",
    "de": "Spotify-Fortschritt"
  },
  "Reprendre Spotify": {
    "fr": "Reprendre Spotify",
    "en": "Resume Spotify",
    "es": "Reanudar Spotify",
    "de": "Spotify fortsetzen"
  },
  "Spotify en pause": {
    "fr": "Spotify en pause",
    "en": "Spotify is paused",
    "es": "Spotify esta en pausa",
    "de": "Spotify ist pausiert"
  },
  "Densite automatique": { "fr": "Densité automatique", "en": "Automatic density", "es": "Densidad automática", "de": "Automatische Dichte" },
  "Densite confortable": { "fr": "Densité confortable", "en": "Comfortable density", "es": "Densidad cómoda", "de": "Komfortable Dichte" },
  "Densite compacte": { "fr": "Densité compacte", "en": "Compact density", "es": "Densidad compacta", "de": "Kompakte Dichte" },
  "Selectionner": { "fr": "Sélectionner", "en": "Select", "es": "Seleccionar", "de": "Auswählen" },
  "Densite d'affichage": { "fr": "Densité d'affichage", "en": "Display density", "es": "Densidad de visualización", "de": "Anzeigedichte" },
  "Actions groupees": { "fr": "Actions groupées", "en": "Bulk actions", "es": "Acciones en lote", "de": "Sammelaktionen" },
  "Deselectionner les elements visibles": { "fr": "Désélectionner les éléments visibles", "en": "Deselect visible items", "es": "Deseleccionar elementos visibles", "de": "Sichtbare Elemente abwählen" },
  "Selectionner les elements visibles": { "fr": "Sélectionner les éléments visibles", "en": "Select visible items", "es": "Seleccionar elementos visibles", "de": "Sichtbare Elemente auswählen" },
  "Effacer la selection": { "fr": "Effacer la sélection", "en": "Clear selection", "es": "Borrar selección", "de": "Auswahl aufheben" },
  "Actions de l'element": { "fr": "Actions de l'élément", "en": "Item actions", "es": "Acciones del elemento", "de": "Elementaktionen" },
  "Action": { "fr": "Action", "en": "Action", "es": "Acción", "de": "Aktion" },
  "Trier les tâches": { "fr": "Trier les tâches", "en": "Sort tasks", "es": "Ordenar tareas", "de": "Aufgaben sortieren" },
  "Récentes": { "fr": "Récentes", "en": "Recent", "es": "Recientes", "de": "Neueste" },
  "Terminer": { "fr": "Terminer", "en": "Complete", "es": "Completar", "de": "Abschließen" },
  "Rouvrir": { "fr": "Rouvrir", "en": "Reopen", "es": "Reabrir", "de": "Erneut öffnen" },
  "Confirmer": { "fr": "Confirmer", "en": "Confirm", "es": "Confirmar", "de": "Bestätigen" },
  "Retirer de la sélection": { "fr": "Retirer de la sélection", "en": "Remove from selection", "es": "Quitar de la selección", "de": "Aus Auswahl entfernen" },
  "Ajouter à la sélection": { "fr": "Ajouter à la sélection", "en": "Add to selection", "es": "A la selección añadir", "de": "Zur Auswahl hinzufügen" },
  "Terminer la tâche": { "fr": "Terminer la tâche", "en": "Complete task", "es": "Completar tarea", "de": "Aufgabe abschließen" },
  "Rouvrir la tâche": { "fr": "Rouvrir la tâche", "en": "Reopen task", "es": "Reabrir tarea", "de": "Aufgabe erneut öffnen" },
  "Type": { "fr": "Type", "en": "Type", "es": "Tipo", "de": "Typ" },
  "Retirer": { "fr": "Retirer", "en": "Remove", "es": "Quitar", "de": "Entfernen" },
  "Trier les notes": { "fr": "Trier les notes", "en": "Sort notes", "es": "Ordenar notas", "de": "Notizen sortieren" },
  "Plus anciennes": { "fr": "Plus anciennes", "en": "Oldest", "es": "Más antiguas", "de": "Älteste" },
  "Rechercher dans l'activité": { "fr": "Rechercher dans l'activité", "en": "Search activity", "es": "Buscar en la actividad", "de": "Aktivitäten durchsuchen" },
  "Trier l'activité": { "fr": "Trier l'activité", "en": "Sort activity", "es": "Ordenar actividad", "de": "Aktivitäten sortieren" },
  "Plus récent": { "fr": "Plus récent", "en": "Newest", "es": "Más reciente", "de": "Neueste" },
  "Plus ancien": { "fr": "Plus ancien", "en": "Oldest", "es": "Más antiguo", "de": "Älteste" },
  "Source": { "fr": "Source", "en": "Source", "es": "Fuente", "de": "Quelle" },
  "Trier les intégrations": { "fr": "Trier les intégrations", "en": "Sort integrations", "es": "Ordenar integraciones", "de": "Integrationen sortieren" },
  "Recommandées": { "fr": "Recommandées", "en": "Recommended", "es": "Recomendadas", "de": "Empfohlen" },
  "Catégorie": { "fr": "Catégorie", "en": "Category", "es": "Categoría", "de": "Kategorie" },
  "Rechercher dans les notifications": { "fr": "Rechercher dans les notifications", "en": "Search notifications", "es": "Buscar notificaciones", "de": "Benachrichtigungen durchsuchen" },
  "Filtrer les notifications": { "fr": "Filtrer les notifications", "en": "Filter notifications", "es": "Filtrar notificaciones", "de": "Benachrichtigungen filtern" },
  "Non lues": { "fr": "Non lues", "en": "Unread", "es": "No leídas", "de": "Ungelesen" },
  "Mises à jour": { "fr": "Mises à jour", "en": "Updates", "es": "Actualizaciones", "de": "Updates" },
  "Tout marquer comme lu": { "fr": "Tout marquer comme lu", "en": "Mark all as read", "es": "Marcar todo como leído", "de": "Alle als gelesen markieren" },
  "Marquer comme non lue": { "fr": "Marquer comme non lue", "en": "Mark as unread", "es": "Marcar como no leída", "de": "Als ungelesen markieren" },
  "Marquer comme lue": { "fr": "Marquer comme lue", "en": "Mark as read", "es": "Marcar como leída", "de": "Als gelesen markieren" },
  "Archiver": { "fr": "Archiver", "en": "Archive", "es": "Archivar", "de": "Archivieren" },
  "Marquer lues": { "fr": "Marquer lues", "en": "Mark read", "es": "Marcar como leídas", "de": "Als gelesen markieren" },
  "Non lue": { "fr": "Non lue", "en": "Unread", "es": "No leída", "de": "Ungelesen" },
  "Tout est traité": { "fr": "Tout est traité", "en": "All caught up", "es": "Todo al día", "de": "Alles erledigt" },
  "Aucune notification ne correspond à cette vue.": { "fr": "Aucune notification ne correspond à cette vue.", "en": "No notifications match this view.", "es": "Ninguna notificación coincide con esta vista.", "de": "Keine Benachrichtigung entspricht dieser Ansicht." },
  "Les nouveaux signaux apparaîtront ici sans masquer votre travail.": { "fr": "Les nouveaux signaux apparaîtront ici sans masquer votre travail.", "en": "New signals will appear here without covering your work.", "es": "Las nuevas señales aparecerán aquí sin ocultar tu trabajo.", "de": "Neue Signale erscheinen hier, ohne Ihre Arbeit zu verdecken." },
  "Afficher plus": { "fr": "Afficher plus", "en": "Show more", "es": "Mostrar más", "de": "Mehr anzeigen" },
  "Rechercher dans l'historique": { "fr": "Rechercher dans l'historique", "en": "Search history", "es": "Buscar en el historial", "de": "Verlauf durchsuchen" },
  "Historique Brain": { "fr": "Historique Brain", "en": "Brain history", "es": "Historial de Brain", "de": "Brain-Verlauf" },
  "Modifiez votre recherche pour retrouver un échange.": { "fr": "Modifiez votre recherche pour retrouver un échange.", "en": "Adjust your search to find a conversation.", "es": "Ajusta la búsqueda para encontrar una conversación.", "de": "Passen Sie die Suche an, um einen Austausch zu finden." },
  "Widgets": {
    "fr": "Widgets",
    "en": "Widgets",
    "es": "Widgets",
    "de": "Widgets"
  },
  "Widgets favoris": {
    "fr": "Widgets favoris",
    "en": "Favorite widgets",
    "es": "Widgets favoritos",
    "de": "Lieblings-Widgets"
  },
  "Reglages": { "fr": "Réglages", "en": "Settings", "es": "Ajustes", "de": "Einstellungen" },
  "Une seule source de verite pour l'apparence et le comportement d'ETHONE.": { "fr": "Une seule source de vérité pour l'apparence et le comportement d'ETHONE.", "en": "One source of truth for ETHONE's appearance and behaviour.", "es": "Una única fuente de verdad para la apariencia y el comportamiento de ETHONE.", "de": "Eine zentrale Quelle für das Erscheinungsbild und Verhalten von ETHONE." },
  "Des reglages sobres, coherents et persistants.": { "fr": "Des réglages sobres, cohérents et persistants.", "en": "Quiet, consistent settings that persist.", "es": "Ajustes discretos, coherentes y persistentes.", "de": "Dezente, konsistente und dauerhafte Einstellungen." },
  "Une densite coherente pour chaque page, panneau, widget et resolution.": { "fr": "Une densité cohérente pour chaque page, panneau, widget et résolution.", "en": "Consistent density across every page, panel, widget and resolution.", "es": "Una densidad coherente en cada página, panel, widget y resolución.", "de": "Konsistente Dichte auf jeder Seite, jedem Panel, Widget und jeder Auflösung." },
  "S'adapte a l'ecran, au zoom et au contexte.": { "fr": "S'adapte à l'écran, au zoom et au contexte.", "en": "Adapts to the screen, zoom and context.", "es": "Se adapta a la pantalla, al zoom y al contexto.", "de": "Passt sich Bildschirm, Zoom und Kontext an." },
  "Assistant, memoire et confidentialite": { "fr": "Assistant, mémoire et confidentialité", "en": "Assistant, memory and privacy", "es": "Asistente, memoria y privacidad", "de": "Assistent, Speicher und Datenschutz" },
  "Choisir le nom et le style de reponse.": { "fr": "Choisir le nom et le style de réponse.", "en": "Choose the name and response style.", "es": "Elige el nombre y el estilo de respuesta.", "de": "Name und Antwortstil auswählen." },
  "Voir les memoires": { "fr": "Voir les mémoires", "en": "View memories", "es": "Ver recuerdos", "de": "Erinnerungen anzeigen" },
  "Evenements, priorites et signaux utiles, en format concis.": { "fr": "Événements, priorités et signaux utiles, dans un format concis.", "en": "Events, priorities and useful signals in a concise format.", "es": "Eventos, prioridades y señales útiles en un formato conciso.", "de": "Termine, Prioritäten und nützliche Signale in kompakter Form." },
  "Les memoires sont chargees uniquement a la demande.": { "fr": "Les mémoires sont chargées uniquement à la demande.", "en": "Memories are loaded only when requested.", "es": "Los recuerdos solo se cargan cuando se solicitan.", "de": "Erinnerungen werden nur bei Bedarf geladen." },
  "Etat": { "fr": "État", "en": "Status", "es": "Estado", "de": "Status" },
  "Systeme cloud": { "fr": "Système cloud", "en": "Cloud system", "es": "Sistema cloud", "de": "Cloud-System" },
  "Etat Supabase en temps reel": { "fr": "État Supabase en temps réel", "en": "Real-time Supabase status", "es": "Estado de Supabase en tiempo real", "de": "Supabase-Status in Echtzeit" },
  "Continuite numerique": { "fr": "Continuité numérique", "en": "Digital continuity", "es": "Continuidad digital", "de": "Digitale Kontinuität" },
  "Tout ce qui compte dans votre ecosysteme, regroupe sans bruit.": { "fr": "Tout ce qui compte dans votre écosystème, regroupé sans bruit.", "en": "Everything that matters in your ecosystem, gathered without noise.", "es": "Todo lo importante de tu ecosistema, reunido sin ruido.", "de": "Alles Wichtige aus Ihrem Ökosystem, ruhig zusammengeführt." },
  "Configurez un service pour enrichir le Live Feed sans donnees fictives.": { "fr": "Configurez un service pour enrichir le Live Feed sans données fictives.", "en": "Configure a service to enrich the Live Feed without fabricated data.", "es": "Configura un servicio para enriquecer el Live Feed sin datos ficticios.", "de": "Konfigurieren Sie einen Dienst, um den Live Feed ohne erfundene Daten zu erweitern." },
  "Taches ouvertes": { "fr": "Tâches ouvertes", "en": "Open tasks", "es": "Tareas abiertas", "de": "Offene Aufgaben" },
  "Votre liste de priorites est au premier plan.": { "fr": "Votre liste de priorités est au premier plan.", "en": "Your priority list is in the foreground.", "es": "Tu lista de prioridades está en primer plano.", "de": "Ihre Prioritätenliste steht im Vordergrund." },
  "Votre environnement personnel est pret.": { "fr": "Votre environnement personnel est prêt.", "en": "Your personal environment is ready.", "es": "Tu entorno personal está listo.", "de": "Ihre persönliche Umgebung ist bereit." },
  "Reglages ouverts": { "fr": "Réglages ouverts", "en": "Settings opened", "es": "Ajustes abiertos", "de": "Einstellungen geöffnet" },
  "Les preferences du systeme sont au premier plan.": { "fr": "Les préférences du système sont au premier plan.", "en": "System preferences are in the foreground.", "es": "Las preferencias del sistema están en primer plano.", "de": "Die Systemeinstellungen stehen im Vordergrund." },
  "Connectees": { "fr": "Connectées", "en": "Connected", "es": "Conectadas", "de": "Verbunden" },
  "Aucun secret d'integration n'est conserve dans le navigateur.": { "fr": "Aucun secret d'intégration n'est conservé dans le navigateur.", "en": "No integration secret is stored in the browser.", "es": "No se guarda ningún secreto de integración en el navegador.", "de": "Keine Integrationsgeheimnisse werden im Browser gespeichert." },
  "Un catalogue guide, des permissions lisibles et aucun faux etat de connexion.": { "fr": "Un catalogue guidé, des permissions lisibles et aucun faux état de connexion.", "en": "A guided catalogue, readable permissions and no false connection states.", "es": "Un catálogo guiado, permisos legibles y ningún estado de conexión falso.", "de": "Ein geführter Katalog, verständliche Berechtigungen und keine falschen Verbindungszustände." },
  "Diagnostic securise": { "fr": "Diagnostic sécurisé", "en": "Secure diagnostic", "es": "Diagnóstico seguro", "de": "Sichere Diagnose" },
  "Diagnostic pret": { "fr": "Diagnostic prêt", "en": "Diagnostic ready", "es": "Diagnóstico listo", "de": "Diagnose bereit" },
  "Modeles et executions via un relais securise": { "fr": "Modèles et exécutions via un relais sécurisé", "en": "Models and runs through a secure relay", "es": "Modelos y ejecuciones mediante un relay seguro", "de": "Modelle und Ausführungen über einen sicheren Relay" },
  "OAuth securise": { "fr": "OAuth sécurisé", "en": "Secure OAuth", "es": "OAuth seguro", "de": "Sicheres OAuth" },
  "Un environnement calme pour avancer sur une priorite.": { "fr": "Un environnement calme pour avancer sur une priorité.", "en": "A quiet environment for moving one priority forward.", "es": "Un entorno tranquilo para avanzar en una prioridad.", "de": "Eine ruhige Umgebung, um eine Priorität voranzubringen." },
  "Des reponses fondees sur le contexte autorise.": { "fr": "Des réponses fondées sur le contexte autorisé.", "en": "Responses grounded in the authorised context.", "es": "Respuestas basadas en el contexto autorizado.", "de": "Antworten auf Grundlage des freigegebenen Kontexts." },
  "Creer une priorite": { "fr": "Créer une priorité", "en": "Create a priority", "es": "Crear una prioridad", "de": "Priorität erstellen" },
  "Nouvelle tache": { "fr": "Nouvelle tâche", "en": "New task", "es": "Nueva tarea", "de": "Neue Aufgabe" },
  "Ajouter a votre liste": { "fr": "Ajouter à votre liste", "en": "Add to your list", "es": "Añadir a tu lista", "de": "Zur Liste hinzufügen" },
  "Capturer une idee": { "fr": "Capturer une idée", "en": "Capture an idea", "es": "Capturar una idea", "de": "Idee festhalten" },
  "Integrations et synchronisation": { "fr": "Intégrations et synchronisation", "en": "Integrations and sync", "es": "Integraciones y sincronización", "de": "Integrationen und Synchronisierung" },
  "Concis": { "fr": "Concis", "en": "Concise", "es": "Conciso", "de": "Prägnant" },
  "Equilibre": { "fr": "Équilibré", "en": "Balanced", "es": "Equilibrado", "de": "Ausgewogen" },
  "Expert": { "fr": "Expert", "en": "Expert", "es": "Experto", "de": "Experte" },
  "Coach": { "fr": "Coach", "en": "Coach", "es": "Coach", "de": "Coach" },
  "Creatif": { "fr": "Créatif", "en": "Creative", "es": "Creativo", "de": "Kreativ" },
  "Developpeur": { "fr": "Développeur", "en": "Developer", "es": "Desarrollador", "de": "Entwickler" },
  "Personnalise": { "fr": "Personnalisé", "en": "Custom", "es": "Personalizado", "de": "Benutzerdefiniert" },
  "concises": { "fr": "concises", "en": "concise", "es": "concisas", "de": "prägnant" },
  "equilibrees": { "fr": "équilibrées", "en": "balanced", "es": "equilibradas", "de": "ausgewogen" },
  "detaillees": { "fr": "détaillées", "en": "detailed", "es": "detalladas", "de": "detailliert" },
  "manuelle": { "fr": "manuelle", "en": "manual", "es": "manual", "de": "manuell" },
  "sur suggestion": { "fr": "sur suggestion", "en": "suggestion only", "es": "solo por sugerencia", "de": "nur auf Vorschlag" },
  "avec confirmation": { "fr": "avec confirmation", "en": "with confirmation", "es": "con confirmación", "de": "mit Bestätigung" },
  "de confiance": { "fr": "de confiance", "en": "trusted", "es": "de confianza", "de": "vertrauenswürdig" },
  "Detaille": { "fr": "Détaillé", "en": "Detailed", "es": "Detallado", "de": "Detailliert" },
  "Manuel": { "fr": "Manuel", "en": "Manual", "es": "Manual", "de": "Manuell" },
  "Suggestions uniquement": { "fr": "Suggestions uniquement", "en": "Suggestions only", "es": "Solo sugerencias", "de": "Nur Vorschläge" },
  "Confirmation requise": { "fr": "Confirmation requise", "en": "Confirmation required", "es": "Confirmación necesaria", "de": "Bestätigung erforderlich" },
  "Actions de confiance": { "fr": "Actions de confiance", "en": "Trusted actions", "es": "Acciones de confianza", "de": "Vertrauenswürdige Aktionen" },
  "Notes": { "fr": "Notes", "en": "Notes", "es": "Notas", "de": "Notizen" },
  "Taches": { "fr": "Tâches", "en": "Tasks", "es": "Tareas", "de": "Aufgaben" },
  "Connexions": { "fr": "Connexions", "en": "Connections", "es": "Conexiones", "de": "Verbindungen" },
  "Activite": { "fr": "Activité", "en": "Activity", "es": "Actividad", "de": "Aktivität" },
  "Habitudes": { "fr": "Habitudes", "en": "Habits", "es": "Hábitos", "de": "Gewohnheiten" },
  "Plannings": { "fr": "Plannings", "en": "Schedules", "es": "Planificaciones", "de": "Zeitpläne" },
  "Types de taches": { "fr": "Types de tâches", "en": "Task types", "es": "Tipos de tareas", "de": "Aufgabentypen" },
  "Style de reponse": { "fr": "Style de réponse", "en": "Response style", "es": "Estilo de respuesta", "de": "Antwortstil" },
  "Objectifs": { "fr": "Objectifs", "en": "Goals", "es": "Objetivos", "de": "Ziele" },
  "Personnalite Brain": { "fr": "Personnalité Brain", "en": "Brain personality", "es": "Personalidad de Brain", "de": "Brain-Persönlichkeit" },
  "Niveau de detail": { "fr": "Niveau de détail", "en": "Detail level", "es": "Nivel de detalle", "de": "Detailgrad" },
  "Lecture et cibles tactiles genereuses.": { "fr": "Lecture et cibles tactiles généreuses.", "en": "Generous reading space and touch targets.", "es": "Lectura y objetivos táctiles amplios.", "de": "Großzügige Lesefläche und Touch-Ziele." },
  "Equilibre par defaut pour le quotidien.": { "fr": "Équilibre par défaut pour le quotidien.", "en": "Balanced by default for everyday use.", "es": "Equilibrado por defecto para el día a día.", "de": "Standardmäßig ausgewogen für den Alltag." },
  "Davantage d'information sans sacrifier la lecture.": { "fr": "Davantage d’informations sans sacrifier la lisibilité.", "en": "More information without sacrificing readability.", "es": "Más información sin sacrificar la legibilidad.", "de": "Mehr Informationen ohne Abstriche bei der Lesbarkeit." },
  "Densite maximale avec focus et cibles conserves.": { "fr": "Densité maximale, lisibilité et cibles préservées.", "en": "Maximum density with readability and targets preserved.", "es": "Densidad máxima con legibilidad y objetivos preservados.", "de": "Maximale Dichte bei erhaltener Lesbarkeit und Bedienbarkeit." },
  "Personnalisee": { "fr": "Personnalisée", "en": "Custom", "es": "Personalizada", "de": "Benutzerdefiniert" },
  "Reglez chaque dimension de l'interface.": { "fr": "Réglez chaque dimension de l’interface.", "en": "Adjust every interface dimension.", "es": "Ajusta cada dimensión de la interfaz.", "de": "Jede Dimension der Oberfläche anpassen." },
  "Apercu": { "fr": "Aperçu", "en": "Preview", "es": "Vista previa", "de": "Vorschau" },
  "Cartes, listes et commandes utilisent les memes tokens.": { "fr": "Cartes, listes et commandes utilisent les mêmes tokens.", "en": "Cards, lists and commands use the same tokens.", "es": "Tarjetas, listas y comandos usan los mismos tokens.", "de": "Karten, Listen und Befehle verwenden dieselben Tokens." },
  "Priorite principale": { "fr": "Priorité principale", "en": "Main priority", "es": "Prioridad principal", "de": "Hauptpriorität" },
  "Langue de reponse": { "fr": "Langue de réponse", "en": "Response language", "es": "Idioma de respuesta", "de": "Antwortsprache" },
  "Francais": { "fr": "Français", "en": "French", "es": "Francés", "de": "Französisch" },
  "Espanol": { "fr": "Espagnol", "en": "Spanish", "es": "Español", "de": "Spanisch" },
  "Frequence des suggestions": { "fr": "Fréquence des suggestions", "en": "Suggestion frequency", "es": "Frecuencia de sugerencias", "de": "Vorschlagshäufigkeit" },
  "Desactivees": { "fr": "Désactivées", "en": "Disabled", "es": "Desactivadas", "de": "Deaktiviert" },
  "Equilibree": { "fr": "Équilibrée", "en": "Balanced", "es": "Equilibrada", "de": "Ausgewogen" },
  "Elevee": { "fr": "Élevée", "en": "High", "es": "Alta", "de": "Hoch" },
  "Les providers cloud exigent le backend ETHONE securise.": { "fr": "Les fournisseurs cloud exigent le backend ETHONE sécurisé.", "en": "Cloud providers require the secure ETHONE backend.", "es": "Los proveedores cloud requieren el backend seguro de ETHONE.", "de": "Cloud-Anbieter benötigen das sichere ETHONE-Backend." },
  "Modele Brain": { "fr": "Modèle Brain", "en": "Brain model", "es": "Modelo de Brain", "de": "Brain-Modell" },
  "Niveau de confidentialite": { "fr": "Niveau de confidentialité", "en": "Privacy level", "es": "Nivel de privacidad", "de": "Datenschutzniveau" },
  "Retention de la memoire": { "fr": "Rétention de la mémoire", "en": "Memory retention", "es": "Retención de memoria", "de": "Speicherdauer" },
  "Preferences utiles uniquement, avec retention et RLS.": { "fr": "Préférences utiles uniquement, avec rétention et RLS.", "en": "Useful preferences only, with retention and RLS.", "es": "Solo preferencias útiles, con retención y RLS.", "de": "Nur nützliche Einstellungen, mit Aufbewahrung und RLS." },
  "Activer la memoire Brain": { "fr": "Activer la mémoire Brain", "en": "Enable Brain memory", "es": "Activar la memoria de Brain", "de": "Brain-Speicher aktivieren" },
  "Un contexte minimal, des permissions explicites et aucune cle privee dans le navigateur.": { "fr": "Un contexte minimal, des permissions explicites et aucune clé privée dans le navigateur.", "en": "Minimal context, explicit permissions and no private key in the browser.", "es": "Contexto mínimo, permisos explícitos y ninguna clave privada en el navegador.", "de": "Minimaler Kontext, explizite Berechtigungen und keine privaten Schlüssel im Browser." },
  "Identite": { "fr": "Identité", "en": "Identity", "es": "Identidad", "de": "Identität" },
  "Chaque categorie peut etre desactivee independamment.": { "fr": "Chaque catégorie peut être désactivée indépendamment.", "en": "Each category can be disabled independently.", "es": "Cada categoría puede desactivarse de forma independiente.", "de": "Jede Kategorie kann unabhängig deaktiviert werden." },
  "Memoire personnelle": { "fr": "Mémoire personnelle", "en": "Personal memory", "es": "Memoria personal", "de": "Persönlicher Speicher" },
  "Donnees": { "fr": "Données", "en": "Data", "es": "Datos", "de": "Daten" },
  "Diagnostic explicite, sans surveillance ni requete en arriere-plan.": { "fr": "Diagnostic explicite, sans surveillance ni requête en arrière-plan.", "en": "Explicit diagnostics, without monitoring or background requests.", "es": "Diagnóstico explícito, sin supervisión ni solicitudes en segundo plano.", "de": "Explizite Diagnose ohne Überwachung oder Hintergrundanfragen." },

  "Densite spacieuse": { "fr": "Densité spacieuse", "en": "Spacious density", "es": "Densidad espaciosa", "de": "Geräumige Dichte" },
  "Densite ultra compacte": { "fr": "Densité ultra compacte", "en": "Ultra compact density", "es": "Densidad ultra compacta", "de": "Ultra kompakte Dichte" },
  "Nouvel evenement": { "fr": "Nouvel événement", "en": "New event", "es": "Nuevo evento", "de": "Neuer Termin" },
  "Synchroniser maintenant": { "fr": "Synchroniser maintenant", "en": "Sync now", "es": "Sincronizar ahora", "de": "Jetzt synchronisieren" },

  "Authentification": { "fr": "Authentification", "en": "Authentication", "es": "Autenticación", "de": "Authentifizierung" },
  "Connexion à ETHONE": { "fr": "Connexion à ETHONE", "en": "Sign in to ETHONE", "es": "Iniciar sesión en ETHONE", "de": "Bei ETHONE anmelden" },
  "Continuer avec GitHub": { "fr": "Continuer avec GitHub", "en": "Continue with GitHub", "es": "Continuar con GitHub", "de": "Mit GitHub fortfahren" },
  "Continuer avec Google": { "fr": "Continuer avec Google", "en": "Continue with Google", "es": "Continuar con Google", "de": "Mit Google fortfahren" },
  "Google": { "fr": "Google", "en": "Google", "es": "Google", "de": "Google" },
  "Robustesse du mot de passe": { "fr": "Robustesse du mot de passe", "en": "Password strength", "es": "Seguridad de la contraseña", "de": "Passwortstärke" },

  "12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.": { "fr": "12 caractères minimum, avec majuscule, minuscule, chiffre et symbole.", "en": "At least 12 characters, with uppercase, lowercase, a digit and a symbol.", "es": "Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.", "de": "Mindestens 12 Zeichen, mit Groß-, Kleinbuchstaben, Ziffer und Symbol." },
  "Annuler et se déconnecter": { "fr": "Annuler et se déconnecter", "en": "Cancel and sign out", "es": "Cancelar y cerrar sesión", "de": "Abbrechen und abmelden" },
  "Cette session a été validée par le lien de récupération Supabase.": { "fr": "Cette session a été validée par le lien de récupération Supabase.", "en": "This session was validated by the Supabase recovery link.", "es": "Esta sesión fue validada por el enlace de recuperación de Supabase.", "de": "Diese Sitzung wurde über den Supabase-Wiederherstellungslink bestätigt." },
  "Choisissez un nouveau mot de passe": { "fr": "Choisissez un nouveau mot de passe", "en": "Choose a new password", "es": "Elige una nueva contraseña", "de": "Wählen Sie ein neues Passwort" },
  "ETHONE ne conserve jamais votre mot de passe.": { "fr": "ETHONE ne conserve jamais votre mot de passe.", "en": "ETHONE never stores your password.", "es": "ETHONE nunca almacena tu contraseña.", "de": "ETHONE speichert Ihr Passwort niemals." },
  "Lien vérifié": { "fr": "Lien vérifié", "en": "Link verified", "es": "Enlace verificado", "de": "Link verifiziert" },
  "PROTECTION DU COMPTE": { "fr": "PROTECTION DU COMPTE", "en": "ACCOUNT PROTECTION", "es": "PROTECCIÓN DE LA CUENTA", "de": "KONTOSCHUTZ" },
  "Récupération du compte ETHONE": { "fr": "Récupération du compte ETHONE", "en": "ETHONE account recovery", "es": "Recuperación de la cuenta ETHONE", "de": "ETHONE-Kontowiederherstellung" },
  "Sécuriser mon compte": { "fr": "Sécuriser mon compte", "en": "Secure my account", "es": "Proteger mi cuenta", "de": "Mein Konto sichern" },
  "Session de récupération sécurisée": { "fr": "Session de récupération sécurisée", "en": "Secure recovery session", "es": "Sesión de recuperación segura", "de": "Sichere Wiederherstellungssitzung" },

  "01 / IDENTITE": { "fr": "01 / IDENTITÉ", "en": "01 / IDENTITY", "es": "01 / IDENTIDAD", "de": "01 / IDENTITÄT" },
  "02 / UNIVERS": { "fr": "02 / UNIVERS", "en": "02 / WORLD", "es": "02 / UNIVERSO", "de": "02 / WELT" },
  "03 / MODULES": { "fr": "03 / MODULES", "en": "03 / MODULES", "es": "03 / MÓDULOS", "de": "03 / MODULE" },
  "A faire": { "fr": "À faire", "en": "To do", "es": "Por hacer", "de": "Zu erledigen" },
  "Ambiance": { "fr": "Ambiance", "en": "Ambiance", "es": "Ambiente", "de": "Ambiente" },
  "Apercu vivant de l'environnement": { "fr": "Aperçu vivant de l'environnement", "en": "Live preview of the environment", "es": "Vista previa en vivo del entorno", "de": "Live-Vorschau der Umgebung" },
  "Avatar": { "fr": "Avatar", "en": "Avatar", "es": "Avatar", "de": "Avatar" },
  "Brain pret": { "fr": "Brain prêt", "en": "Brain ready", "es": "Brain listo", "de": "Brain bereit" },
  "Ces modules seront prepares sans connecter de service a votre place.": { "fr": "Ces modules seront préparés sans connecter de service à votre place.", "en": "These modules will be prepared without connecting any service on your behalf.", "es": "Estos módulos se prepararán sin conectar ningún servicio en tu lugar.", "de": "Diese Module werden vorbereitet, ohne in Ihrem Namen einen Dienst zu verbinden." },
  "Changer le theme": { "fr": "Changer le thème", "en": "Change theme", "es": "Cambiar el tema", "de": "Theme ändern" },
  "Chaque environnement restaure son Space, son Flow, ses signaux et son rythme.": { "fr": "Chaque environnement restaure son Space, son Flow, ses signaux et son rythme.", "en": "Each environment restores its Space, its Flow, its signals and its rhythm.", "es": "Cada entorno restaura su Space, su Flow, sus señales y su ritmo.", "de": "Jede Umgebung stellt ihren Space, ihren Flow, ihre Signale und ihren Rhythmus wieder her." },
  "Charges a l'ouverture": { "fr": "Chargés à l'ouverture", "en": "Loaded on open", "es": "Cargados al abrir", "de": "Beim Öffnen geladen" },
  "Choisissez ce qui vous attend": { "fr": "Choisissez ce qui vous attend", "en": "Choose what awaits you", "es": "Elige lo que te espera", "de": "Wählen Sie, was Sie erwartet" },
  "Couleur dominante": { "fr": "Couleur dominante", "en": "Dominant color", "es": "Color dominante", "de": "Vorherrschende Farbe" },
  "Creer un environnement": { "fr": "Créer un environnement", "en": "Create an environment", "es": "Crear un entorno", "de": "Eine Umgebung erstellen" },
  "Decrivez cet environnement": { "fr": "Décrivez cet environnement", "en": "Describe this environment", "es": "Describe este entorno", "de": "Beschreiben Sie diese Umgebung" },
  "Donnez un visage a cet univers": { "fr": "Donnez un visage à cet univers", "en": "Give this world a face", "es": "Dale una cara a este universo", "de": "Geben Sie dieser Welt ein Gesicht" },
  "ENVIRONNEMENT EN DIRECT": { "fr": "ENVIRONNEMENT EN DIRECT", "en": "LIVE ENVIRONMENT", "es": "ENTORNO EN VIVO", "de": "LIVE-UMGEBUNG" },
  "Environnements ETHONE": { "fr": "Environnements ETHONE", "en": "ETHONE environments", "es": "Entornos ETHONE", "de": "ETHONE-Umgebungen" },
  "Etapes de configuration": { "fr": "Étapes de configuration", "en": "Setup steps", "es": "Pasos de configuración", "de": "Einrichtungsschritte" },
  "ETHONE ENVIRONMENTS": { "fr": "ETHONE ENVIRONMENTS", "en": "ETHONE ENVIRONMENTS", "es": "ETHONE ENVIRONMENTS", "de": "ETHONE ENVIRONMENTS" },
  "Fleches pour parcourir / Entree pour ouvrir / Menu pour gerer": { "fr": "Flèches pour parcourir / Entrée pour ouvrir / Menu pour gérer", "en": "Arrows to browse / Enter to open / Menu to manage", "es": "Flechas para navegar / Intro para abrir / Menú para gestionar", "de": "Pfeiltasten zum Blättern / Eingabe zum Öffnen / Menü zum Verwalten" },
  "Fond": { "fr": "Fond", "en": "Background", "es": "Fondo", "de": "Hintergrund" },
  "Integrations": { "fr": "Intégrations", "en": "Integrations", "es": "Integraciones", "de": "Integrationen" },
  "Integrations a preparer": { "fr": "Intégrations à préparer", "en": "Integrations to prepare", "es": "Integraciones por preparar", "de": "Vorzubereitende Integrationen" },
  "Modules": { "fr": "Modules", "en": "Modules", "es": "Módulos", "de": "Module" },
  "Modules prets": { "fr": "Modules prêts", "en": "Modules ready", "es": "Módulos listos", "de": "Module bereit" },
  "Nouvel environnement": { "fr": "Nouvel environnement", "en": "New environment", "es": "Nuevo entorno", "de": "Neue Umgebung" },
  "Quel univers ouvrez-vous ?": { "fr": "Quel univers ouvrez-vous ?", "en": "Which world are you opening?", "es": "¿Qué universo vas a abrir?", "de": "Welche Welt öffnen Sie?" },
  "Reglez son rythme": { "fr": "Réglez son rythme", "en": "Set its rhythm", "es": "Ajusta su ritmo", "de": "Rhythmus einstellen" },
  "Retour": { "fr": "Retour", "en": "Back", "es": "Volver", "de": "Zurück" },
  "Selecteur d'environnements": { "fr": "Sélecteur d'environnements", "en": "Environment selector", "es": "Selector de entornos", "de": "Umgebungsauswahl" },
  "Selection de l'environnement": { "fr": "Sélection de l'environnement", "en": "Environment selection", "es": "Selección de entorno", "de": "Umgebungsauswahl" },
  "Signaux en direct": { "fr": "Signaux en direct", "en": "Live signals", "es": "Señales en vivo", "de": "Live-Signale" },
  "Space, Flow et ambiance composent la premiere impression.": { "fr": "Space, Flow et ambiance composent la première impression.", "en": "Space, Flow and ambiance shape the first impression.", "es": "Space, Flow y ambiente forman la primera impresión.", "de": "Space, Flow und Ambiente prägen den ersten Eindruck." },
  "Survolez pour explorer, double-cliquez pour entrer": { "fr": "Survolez pour explorer, double-cliquez pour entrer", "en": "Hover to explore, double-click to enter", "es": "Pasa el cursor para explorar, doble clic para entrar", "de": "Zum Erkunden hovern, zum Betreten doppelklicken" },
  "Un nom, une intention et un repere visuel immediat.": { "fr": "Un nom, une intention et un repère visuel immédiat.", "en": "A name, an intention and an immediate visual marker.", "es": "Un nombre, una intención y una referencia visual inmediata.", "de": "Ein Name, eine Absicht und eine sofortige visuelle Orientierung." },
  "Univers": { "fr": "Univers", "en": "World", "es": "Universo", "de": "Welt" },
  "VOS UNIVERS": { "fr": "VOS UNIVERS", "en": "YOUR WORLDS", "es": "TUS UNIVERSOS", "de": "IHRE WELTEN" },

  "Actif maintenant": { "fr": "Actif maintenant", "en": "Active now", "es": "Activo ahora", "de": "Jetzt aktiv" },
  "Activity Hub": { "fr": "Activity Hub", "en": "Activity Hub", "es": "Activity Hub", "de": "Activity Hub" },
  "Actualiser": { "fr": "Actualiser", "en": "Refresh", "es": "Actualizar", "de": "Aktualisieren" },
  "Ajouter une source": { "fr": "Ajouter une source", "en": "Add a source", "es": "Añadir una fuente", "de": "Quelle hinzufügen" },
  "Cette semaine": { "fr": "Cette semaine", "en": "This week", "es": "Esta semana", "de": "Diese Woche" },
  "Chronologie": { "fr": "Chronologie", "en": "Timeline", "es": "Cronología", "de": "Zeitleiste" },
  "Connections": { "fr": "Connections", "en": "Connections", "es": "Connections", "de": "Connections" },
  "Developpement": { "fr": "Développement", "en": "Development", "es": "Desarrollo", "de": "Entwicklung" },
  "Donnees maitrisees": { "fr": "Données maîtrisées", "en": "Data under control", "es": "Datos bajo control", "de": "Kontrollierte Daten" },
  "En direct": { "fr": "En direct", "en": "Live", "es": "En directo", "de": "Live" },
  "ETHONE pense que...": { "fr": "ETHONE pense que...", "en": "ETHONE thinks that...", "es": "ETHONE piensa que...", "de": "ETHONE denkt, dass..." },
  "Etudes": { "fr": "Études", "en": "Studies", "es": "Estudios", "de": "Studium" },
  "Filtrer l'activite": { "fr": "Filtrer l'activité", "en": "Filter activity", "es": "Filtrar actividad", "de": "Aktivität filtern" },
  "Flux actif": { "fr": "Flux actif", "en": "Active feed", "es": "Flujo activo", "de": "Aktiver Feed" },
  "Flux d'activite": { "fr": "Flux d'activité", "en": "Activity feed", "es": "Flujo de actividad", "de": "Aktivitäts-Feed" },
  "Gerer les connexions": { "fr": "Gérer les connexions", "en": "Manage connections", "es": "Gestionar conexiones", "de": "Verbindungen verwalten" },
  "Google Calendar": { "fr": "Google Calendar", "en": "Google Calendar", "es": "Google Calendar", "de": "Google Calendar" },
  "Google Drive": { "fr": "Google Drive", "en": "Google Drive", "es": "Google Drive", "de": "Google Drive" },
  "Last.fm": { "fr": "Last.fm", "en": "Last.fm", "es": "Last.fm", "de": "Last.fm" },
  "Le journal local reagit aux actions utiles sans tracker global.": { "fr": "Le journal local réagit aux actions utiles sans tracker global.", "en": "The local journal reacts to useful actions without a global tracker.", "es": "El registro local reacciona a las acciones útiles sin un rastreador global.", "de": "Das lokale Journal reagiert auf nützliche Aktionen ohne globalen Tracker." },
  "League of Legends": { "fr": "League of Legends", "en": "League of Legends", "es": "League of Legends", "de": "League of Legends" },
  "Live now": { "fr": "Live now", "en": "Live now", "es": "Live now", "de": "Live now" },
  "Medias": { "fr": "Médias", "en": "Media", "es": "Medios", "de": "Medien" },
  "Minecraft": { "fr": "Minecraft", "en": "Minecraft", "es": "Minecraft", "de": "Minecraft" },
  "Notion": { "fr": "Notion", "en": "Notion", "es": "Notion", "de": "Notion" },
  "Personnaliser": { "fr": "Personnaliser", "en": "Customize", "es": "Personalizar", "de": "Anpassen" },
  "Productivite": { "fr": "Productivité", "en": "Productivity", "es": "Productividad", "de": "Produktivität" },
  "Reddit": { "fr": "Reddit", "en": "Reddit", "es": "Reddit", "de": "Reddit" },
  "Signaux": { "fr": "Signaux", "en": "Signals", "es": "Señales", "de": "Signale" },
  "Social": { "fr": "Social", "en": "Social", "es": "Social", "de": "Soziales" },
  "Steam": { "fr": "Steam", "en": "Steam", "es": "Steam", "de": "Steam" },
  "Systeme ETHONE": { "fr": "Système ETHONE", "en": "ETHONE system", "es": "Sistema ETHONE", "de": "ETHONE-System" },
  "Todoist": { "fr": "Todoist", "en": "Todoist", "es": "Todoist", "de": "Todoist" },
  "Tout": { "fr": "Tout", "en": "All", "es": "Todo", "de": "Alle" },
  "Tracker.gg": { "fr": "Tracker.gg", "en": "Tracker.gg", "es": "Tracker.gg", "de": "Tracker.gg" },
  "Twitch": { "fr": "Twitch", "en": "Twitch", "es": "Twitch", "de": "Twitch" },
  "Valorant": { "fr": "Valorant", "en": "Valorant", "es": "Valorant", "de": "Valorant" },
  "Voir toute l'activité": { "fr": "Voir toute l'activité", "en": "View all activity", "es": "Ver toda la actividad", "de": "Alle Aktivitäten anzeigen" },
  "Votre contexte est lisible": { "fr": "Votre contexte est lisible", "en": "Your context is readable", "es": "Tu contexto es legible", "de": "Ihr Kontext ist lesbar" },
  "Votre journee": { "fr": "Votre journée", "en": "Your day", "es": "Tu día", "de": "Ihr Tag" },
  "Vue d'ensemble": { "fr": "Vue d'ensemble", "en": "Overview", "es": "Resumen", "de": "Überblick" },
  "YouTube": { "fr": "YouTube", "en": "YouTube", "es": "YouTube", "de": "YouTube" },

  "Action a executer": { "fr": "Action à exécuter", "en": "Action to run", "es": "Acción a ejecutar", "de": "Auszuführende Aktion" },
  "Aucun mot de passe, token, secret ou contenu complet n'est inclus.": { "fr": "Aucun mot de passe, token, secret ou contenu complet n'est inclus.", "en": "No password, token, secret or full content is ever included.", "es": "Nunca se incluye ninguna contraseña, token, secreto o contenido completo.", "de": "Es werden niemals Passwörter, Token, Geheimnisse oder vollständige Inhalte einbezogen." },
  "Automations": { "fr": "Automations", "en": "Automations", "es": "Automations", "de": "Automations" },
  "Categorie de memoire": { "fr": "Catégorie de mémoire", "en": "Memory category", "es": "Categoría de memoria", "de": "Speicherkategorie" },
  "Charger": { "fr": "Charger", "en": "Load", "es": "Cargar", "de": "Laden" },
  "Chat": { "fr": "Chat", "en": "Chat", "es": "Chat", "de": "Chat" },
  "Command HUD": { "fr": "Command HUD", "en": "Command HUD", "es": "Command HUD", "de": "Command HUD" },
  "Confidentialite": { "fr": "Confidentialité", "en": "Privacy", "es": "Privacidad", "de": "Datenschutz" },
  "Contexte": { "fr": "Contexte", "en": "Context", "es": "Contexto", "de": "Kontext" },
  "Contexte courant": { "fr": "Contexte courant", "en": "Current context", "es": "Contexto actual", "de": "Aktueller Kontext" },
  "Contexte minimal actif": { "fr": "Contexte minimal actif", "en": "Minimal context active", "es": "Contexto mínimo activo", "de": "Minimaler Kontext aktiv" },
  "Conversation Brain": { "fr": "Conversation Brain", "en": "Brain conversation", "es": "Conversación de Brain", "de": "Brain-Unterhaltung" },
  "Demander a Brain": { "fr": "Demander à Brain", "en": "Ask Brain", "es": "Preguntar a Brain", "de": "Brain fragen" },
  "Demandez une synthese, une priorite ou une action...": { "fr": "Demandez une synthèse, une priorité ou une action...", "en": "Ask for a summary, a priority or an action...", "es": "Pide un resumen, una prioridad o una acción...", "de": "Fragen Sie nach einer Zusammenfassung, einer Priorität oder einer Aktion..." },
  "Diagnostics": { "fr": "Diagnostics", "en": "Diagnostics", "es": "Diagnósticos", "de": "Diagnosen" },
  "Effacer": { "fr": "Effacer", "en": "Clear", "es": "Borrar", "de": "Löschen" },
  "Envoyer": { "fr": "Envoyer", "en": "Send", "es": "Enviar", "de": "Senden" },
  "Historique": { "fr": "Historique", "en": "History", "es": "Historial", "de": "Verlauf" },
  "Information": { "fr": "Information", "en": "Information", "es": "Información", "de": "Information" },
  "Information utile, jamais un secret": { "fr": "Information utile, jamais un secret", "en": "Useful information, never a secret", "es": "Información útil, nunca un secreto", "de": "Nützliche Information, niemals ein Geheimnis" },
  "Intelligence personnelle": { "fr": "Intelligence personnelle", "en": "Personal intelligence", "es": "Inteligencia personal", "de": "Persönliche Intelligenz" },
  "Jamais transmis": { "fr": "Jamais transmis", "en": "Never transmitted", "es": "Nunca transmitido", "de": "Niemals übertragen" },
  "La memoire n'est chargee qu'a votre demande.": { "fr": "La mémoire n'est chargée qu'à votre demande.", "en": "Memory is only loaded on your request.", "es": "La memoria solo se carga cuando lo solicitas.", "de": "Der Speicher wird nur auf Ihre Anfrage geladen." },
  "Memoire": { "fr": "Mémoire", "en": "Memory", "es": "Memoria", "de": "Speicher" },
  "Message": { "fr": "Message", "en": "Message", "es": "Mensaje", "de": "Nachricht" },
  "Modifier": { "fr": "Modifier", "en": "Edit", "es": "Modificar", "de": "Bearbeiten" },
  "Mots de passe, tokens, cles API, cookies, sessions et identifiants de connexion prives.": { "fr": "Mots de passe, tokens, clés API, cookies, sessions et identifiants de connexion privés.", "en": "Passwords, tokens, API keys, cookies, sessions and private login credentials.", "es": "Contraseñas, tokens, claves API, cookies, sesiones y credenciales de acceso privadas.", "de": "Passwörter, Token, API-Schlüssel, Cookies, Sitzungen und private Anmeldedaten." },
  "Nom de la memoire": { "fr": "Nom de la mémoire", "en": "Memory name", "es": "Nombre de la memoria", "de": "Speichername" },
  "Nom de la preference": { "fr": "Nom de la préférence", "en": "Preference name", "es": "Nombre de la preferencia", "de": "Name der Einstellung" },
  "Préférence": { "fr": "Préférence", "en": "Preference", "es": "Preferencia", "de": "Einstellung" },
  "Providers": { "fr": "Providers", "en": "Providers", "es": "Providers", "de": "Providers" },
  "Reessayer": { "fr": "Réessayer", "en": "Retry", "es": "Reintentar", "de": "Erneut versuchen" },
  "Sections Brain": { "fr": "Sections Brain", "en": "Brain sections", "es": "Secciones de Brain", "de": "Brain-Bereiche" },
  "Tester": { "fr": "Tester", "en": "Test", "es": "Probar", "de": "Testen" },
  "Tests reseau a la demande.": { "fr": "Tests réseau à la demande.", "en": "Network tests on demand.", "es": "Pruebas de red bajo demanda.", "de": "Netzwerktests auf Anfrage." },
  "Tout effacer": { "fr": "Tout effacer", "en": "Clear all", "es": "Borrar todo", "de": "Alles löschen" },
  "Type de declencheur": { "fr": "Type de déclencheur", "en": "Trigger type", "es": "Tipo de disparador", "de": "Auslösertyp" },
  "Un contexte utile, protege et sous votre controle.": { "fr": "Un contexte utile, protégé et sous votre contrôle.", "en": "A useful context, protected and under your control.", "es": "Un contexto útil, protegido y bajo tu control.", "de": "Ein nützlicher Kontext, geschützt und unter Ihrer Kontrolle." },
  "Valeur de la memoire": { "fr": "Valeur de la mémoire", "en": "Memory value", "es": "Valor de la memoria", "de": "Speicherwert" },

  "Date": { "fr": "Date", "en": "Date", "es": "Fecha", "de": "Datum" },
  "Événement": { "fr": "Événement", "en": "Event", "es": "Evento", "de": "Termin" },
  "Planifier un événement": { "fr": "Planifier un événement", "en": "Schedule an event", "es": "Programar un evento", "de": "Termin planen" },

  "Acces limite": { "fr": "Accès limité", "en": "Limited access", "es": "Acceso limitado", "de": "Eingeschränkter Zugriff" },
  "Bientot disponible": { "fr": "Bientôt disponible", "en": "Coming soon", "es": "Próximamente", "de": "Demnächst verfügbar" },
  "ETHONE Worker": { "fr": "ETHONE Worker", "en": "ETHONE Worker", "es": "ETHONE Worker", "de": "ETHONE Worker" },
  "Fraicheur": { "fr": "Fraîcheur", "en": "Freshness", "es": "Actualidad", "de": "Aktualität" },
  "Indisponible": { "fr": "Indisponible", "en": "Unavailable", "es": "No disponible", "de": "Nicht verfügbar" },
  "Methode": { "fr": "Méthode", "en": "Method", "es": "Método", "de": "Methode" },
  "Navigateur": { "fr": "Navigateur", "en": "Browser", "es": "Navegador", "de": "Browser" },
  "Preparation locale": { "fr": "Préparation locale", "en": "Local preparation", "es": "Preparación local", "de": "Lokale Vorbereitung" },
  "Prerequis": { "fr": "Prérequis", "en": "Requirements", "es": "Requisitos", "de": "Voraussetzungen" },
  "Session distante": { "fr": "Session distante", "en": "Remote session", "es": "Sesión remota", "de": "Remote-Sitzung" },
  "Stockage frontend": { "fr": "Stockage frontend", "en": "Frontend storage", "es": "Almacenamiento frontend", "de": "Frontend-Speicher" },

  "A verifier": { "fr": "À vérifier", "en": "To verify", "es": "Por verificar", "de": "Zu prüfen" },
  "Architecture zero secret dans l'interface": { "fr": "Architecture zéro secret dans l'interface", "en": "Zero-secret architecture in the interface", "es": "Arquitectura sin secretos en la interfaz", "de": "Geheimnisfreie Architektur in der Oberfläche" },
  "Assistant": { "fr": "Assistant", "en": "Wizard", "es": "Asistente", "de": "Assistent" },
  "Attention": { "fr": "Attention", "en": "Warning", "es": "Atención", "de": "Achtung" },
  "Bloque": { "fr": "Bloqué", "en": "Blocked", "es": "Bloqueado", "de": "Blockiert" },
  "Catalogue des integrations": { "fr": "Catalogue des intégrations", "en": "Integration catalog", "es": "Catálogo de integraciones", "de": "Integrationskatalog" },
  "Categories d'integrations": { "fr": "Catégories d'intégrations", "en": "Integration categories", "es": "Categorías de integraciones", "de": "Integrationskategorien" },
  "Ce que la methode apporte": { "fr": "Ce que la méthode apporte", "en": "What this method provides", "es": "Lo que aporta este método", "de": "Was diese Methode bietet" },
  "Changer de methode": { "fr": "Changer de méthode", "en": "Change method", "es": "Cambiar de método", "de": "Methode ändern" },
  "Choisissez le niveau d'integration": { "fr": "Choisissez le niveau d'intégration", "en": "Choose the integration level", "es": "Elige el nivel de integración", "de": "Wählen Sie die Integrationsstufe" },
  "Connecte": { "fr": "Connecté", "en": "Connected", "es": "Conectado", "de": "Verbunden" },
  "Connectes": { "fr": "Connectés", "en": "Connected", "es": "Conectados", "de": "Verbunden" },
  "Connections Hub": { "fr": "Connections Hub", "en": "Connections Hub", "es": "Connections Hub", "de": "Connections Hub" },
  "Connexions detectees": { "fr": "Connexions détectées", "en": "Detected connections", "es": "Conexiones detectadas", "de": "Erkannte Verbindungen" },
  "Copier": { "fr": "Copier", "en": "Copy", "es": "Copiar", "de": "Kopieren" },
  "Copier la valeur": { "fr": "Copier la valeur", "en": "Copy the value", "es": "Copiar el valor", "de": "Wert kopieren" },
  "Copier le rapport": { "fr": "Copier le rapport", "en": "Copy the report", "es": "Copiar el informe", "de": "Bericht kopieren" },
  "Dans les secrets Cloudflare uniquement. Le navigateur ne recoit ni cle fournisseur, ni secret Supabase serveur.": { "fr": "Dans les secrets Cloudflare uniquement. Le navigateur ne reçoit ni clé fournisseur, ni secret Supabase serveur.", "en": "In Cloudflare secrets only. The browser never receives a provider key or a server-side Supabase secret.", "es": "Únicamente en los secretos de Cloudflare. El navegador nunca recibe una clave de proveedor ni un secreto de Supabase del servidor.", "de": "Ausschließlich in Cloudflare-Geheimnissen. Der Browser erhält weder einen Anbieterschlüssel noch ein serverseitiges Supabase-Geheimnis." },
  "Derniere sync": { "fr": "Dernière sync", "en": "Last sync", "es": "Última sincronización", "de": "Letzte Synchronisierung" },
  "Diagnostic": { "fr": "Diagnostic", "en": "Diagnostic", "es": "Diagnóstico", "de": "Diagnose" },
  "Diagnostic transparent": { "fr": "Diagnostic transparent", "en": "Transparent diagnostic", "es": "Diagnóstico transparente", "de": "Transparente Diagnose" },
  "Disponibles": { "fr": "Disponibles", "en": "Available", "es": "Disponibles", "de": "Verfügbar" },
  "Etat des connexions": { "fr": "État des connexions", "en": "Connection status", "es": "Estado de las conexiones", "de": "Verbindungsstatus" },
  "Filtrer par statut": { "fr": "Filtrer par statut", "en": "Filter by status", "es": "Filtrar por estado", "de": "Nach Status filtern" },
  "Inspecteur de connexion": { "fr": "Inspecteur de connexion", "en": "Connection inspector", "es": "Inspector de conexión", "de": "Verbindungsinspektor" },
  "Integration workspace": { "fr": "Integration workspace", "en": "Integration workspace", "es": "Integration workspace", "de": "Integration workspace" },
  "La methode recommandee privilegie la fiabilite, les permissions minimales et la reversibilite.": { "fr": "La méthode recommandée privilégie la fiabilité, les permissions minimales et la réversibilité.", "en": "The recommended method favors reliability, minimal permissions and reversibility.", "es": "El método recomendado prioriza la fiabilidad, los permisos mínimos y la reversibilidad.", "de": "Die empfohlene Methode legt Wert auf Zuverlässigkeit, minimale Berechtigungen und Reversibilität." },
  "Le test combine les controles locaux avec une route Worker authentifiee lorsqu'elle existe.": { "fr": "Le test combine les contrôles locaux avec une route Worker authentifiée lorsqu'elle existe.", "en": "The test combines local checks with an authenticated Worker route when one exists.", "es": "La prueba combina los controles locales con una ruta de Worker autenticada cuando existe.", "de": "Der Test kombiniert lokale Prüfungen mit einer authentifizierten Worker-Route, sofern vorhanden." },
  "Les routes migrees passent par ETHONE Worker avec votre session Supabase. Les secrets fournisseur restent exclusivement cote serveur.": { "fr": "Les routes migrées passent par ETHONE Worker avec votre session Supabase. Les secrets fournisseur restent exclusivement côté serveur.", "en": "Migrated routes go through ETHONE Worker with your Supabase session. Provider secrets stay exclusively server-side.", "es": "Las rutas migradas pasan por ETHONE Worker con tu sesión de Supabase. Los secretos del proveedor permanecen exclusivamente en el servidor.", "de": "Migrierte Routen laufen über den ETHONE Worker mit Ihrer Supabase-Sitzung. Anbietergeheimnisse verbleiben ausschließlich serverseitig." },
  "Methodes": { "fr": "Méthodes", "en": "Methods", "es": "Métodos", "de": "Methoden" },
  "Non teste": { "fr": "Non testé", "en": "Not tested", "es": "No probado", "de": "Nicht getestet" },
  "OK": { "fr": "OK", "en": "OK", "es": "OK", "de": "OK" },
  "Ou sont stockees les donnees sensibles ?": { "fr": "Où sont stockées les données sensibles ?", "en": "Where is sensitive data stored?", "es": "¿Dónde se almacenan los datos sensibles?", "de": "Wo werden sensible Daten gespeichert?" },
  "Permissions lisibles": { "fr": "Permissions lisibles", "en": "Readable permissions", "es": "Permisos legibles", "de": "Lesbare Berechtigungen" },
  "Pourquoi la connexion reste preparee ?": { "fr": "Pourquoi la connexion reste préparée ?", "en": "Why does the connection stay in \"prepared\"?", "es": "¿Por qué la conexión permanece \"preparada\"?", "de": "Warum bleibt die Verbindung \"vorbereitet\"?" },
  "Prepare": { "fr": "Préparé", "en": "Prepared", "es": "Preparado", "de": "Vorbereitet" },
  "Prepares": { "fr": "Préparés", "en": "Prepared", "es": "Preparados", "de": "Vorbereitet" },
  "Problemes frequents": { "fr": "Problèmes fréquents", "en": "Common issues", "es": "Problemas frecuentes", "de": "Häufige Probleme" },
  "Que faire apres une expiration ?": { "fr": "Que faire après une expiration ?", "en": "What to do after an expiration?", "es": "¿Qué hacer tras una expiración?", "de": "Was tun nach einem Ablauf?" },
  "Rechercher une integration": { "fr": "Rechercher une intégration", "en": "Search an integration", "es": "Buscar una integración", "de": "Integration suchen" },
  "Reinitialiser les filtres": { "fr": "Réinitialiser les filtres", "en": "Reset filters", "es": "Restablecer filtros", "de": "Filter zurücksetzen" },
  "Relancez le consentement depuis votre backend puis verifiez les permissions minimales.": { "fr": "Relancez le consentement depuis votre backend puis vérifiez les permissions minimales.", "en": "Restart consent from your backend, then verify the minimal permissions.", "es": "Reinicia el consentimiento desde tu backend y luego verifica los permisos mínimos.", "de": "Starten Sie die Zustimmung erneut über Ihr Backend und prüfen Sie dann die minimalen Berechtigungen." },
  "Reponse": { "fr": "Réponse", "en": "Response", "es": "Respuesta", "de": "Antwort" },
  "Ressources officielles": { "fr": "Ressources officielles", "en": "Official resources", "es": "Recursos oficiales", "de": "Offizielle Ressourcen" },
  "Se connecter avec GitHub": { "fr": "Se connecter avec GitHub", "en": "Connect with GitHub", "es": "Conectar con GitHub", "de": "Mit GitHub verbinden" },
  "Se connecter avec Google": { "fr": "Se connecter avec Google", "en": "Connect with Google", "es": "Conectar con Google", "de": "Mit Google verbinden" },
  "Se connecter avec Google Drive": { "fr": "Se connecter avec Google Drive", "en": "Connect with Google Drive", "es": "Conectar con Google Drive", "de": "Mit Google Drive verbinden" },
  "Se connecter avec Notion": { "fr": "Se connecter avec Notion", "en": "Connect with Notion", "es": "Conectar con Notion", "de": "Mit Notion verbinden" },
  "Se connecter avec Reddit": { "fr": "Se connecter avec Reddit", "en": "Connect with Reddit", "es": "Conectar con Reddit", "de": "Mit Reddit verbinden" },
  "Se connecter avec Spotify": { "fr": "Se connecter avec Spotify", "en": "Connect with Spotify", "es": "Conectar con Spotify", "de": "Mit Spotify verbinden" },
  "Se connecter avec Todoist": { "fr": "Se connecter avec Todoist", "en": "Connect with Todoist", "es": "Conectar con Todoist", "de": "Mit Todoist verbinden" },
  "Se connecter avec YouTube": { "fr": "Se connecter avec YouTube", "en": "Connect with YouTube", "es": "Conectar con YouTube", "de": "Mit YouTube verbinden" },
  "Spotify, GitHub, Calendar...": { "fr": "Spotify, GitHub, Calendar...", "en": "Spotify, GitHub, Calendar...", "es": "Spotify, GitHub, Calendar...", "de": "Spotify, GitHub, Calendar..." },
  "Tous les statuts": { "fr": "Tous les statuts", "en": "All statuses", "es": "Todos los estados", "de": "Alle Status" },
  "Une route Worker disponible confirme le backend, pas une autorisation fournisseur ni une session distante.": { "fr": "Une route Worker disponible confirme le backend, pas une autorisation fournisseur ni une session distante.", "en": "An available Worker route confirms the backend, not a provider authorization nor a remote session.", "es": "Una ruta de Worker disponible confirma el backend, no una autorización del proveedor ni una sesión remota.", "de": "Eine verfügbare Worker-Route bestätigt das Backend, nicht eine Anbieterautorisierung oder eine Remote-Sitzung." },
  "Version": { "fr": "Version", "en": "Version", "es": "Versión", "de": "Version" },
  "Votre propre cle": { "fr": "Votre propre clé", "en": "Your own key", "es": "Tu propia clave", "de": "Ihr eigener Schlüssel" },

  "Apercu du panneau": { "fr": "Aperçu du panneau", "en": "Panel preview", "es": "Vista previa del panel", "de": "Panelvorschau" },
  "Une surface dediee, sans chrome inutile.": { "fr": "Une surface dédiée, sans chrome inutile.", "en": "A dedicated surface, without unnecessary chrome.", "es": "Una superficie dedicada, sin adornos innecesarios.", "de": "Eine eigene Fläche, ohne unnötigen Rahmen." },

  "Adresse": { "fr": "Adresse", "en": "Address", "es": "Dirección", "de": "Adresse" },
  "Bibliothèque synchronisée": { "fr": "Bibliothèque synchronisée", "en": "Synced library", "es": "Biblioteca sincronizada", "de": "Synchronisierte Bibliothek" },
  "Créer un dossier": { "fr": "Créer un dossier", "en": "Create a folder", "es": "Crear una carpeta", "de": "Ordner erstellen" },
  "Demander à Brain": { "fr": "Demander à Brain", "en": "Ask Brain", "es": "Preguntar a Brain", "de": "Brain fragen" },
  "Voir toute la bibliothèque": { "fr": "Voir toute la bibliothèque", "en": "View the whole library", "es": "Ver toda la biblioteca", "de": "Gesamte Bibliothek anzeigen" },

  "Connexion Supabase": { "fr": "Connexion Supabase", "en": "Supabase connection", "es": "Conexión Supabase", "de": "Supabase-Verbindung" },
  "Créer une note": { "fr": "Créer une note", "en": "Create a note", "es": "Crear una nota", "de": "Notiz erstellen" },
  "Mémoire synchronisée": { "fr": "Mémoire synchronisée", "en": "Synced memory", "es": "Memoria sincronizada", "de": "Synchronisierter Speicher" },
  "Presence Discord": { "fr": "Présence Discord", "en": "Discord presence", "es": "Presencia en Discord", "de": "Discord-Präsenz" },
  "Presence Steam": { "fr": "Présence Steam", "en": "Steam presence", "es": "Presencia en Steam", "de": "Steam-Präsenz" },
  "Profil GitHub": { "fr": "Profil GitHub", "en": "GitHub profile", "es": "Perfil de GitHub", "de": "GitHub-Profil" },
  "Profil Minecraft": { "fr": "Profil Minecraft", "en": "Minecraft profile", "es": "Perfil de Minecraft", "de": "Minecraft-Profil" },
  "Spotify Live": { "fr": "Spotify Live", "en": "Spotify Live", "es": "Spotify Live", "de": "Spotify Live" },

  "Effacer la recherche": { "fr": "Effacer la recherche", "en": "Clear search", "es": "Borrar búsqueda", "de": "Suche löschen" },
  "Synchronisation en attente": { "fr": "Synchronisation en attente", "en": "Sync pending", "es": "Sincronización pendiente", "de": "Synchronisierung ausstehend" },

  "1 an": { "fr": "1 an", "en": "1 year", "es": "1 año", "de": "1 Jahr" },
  "30 jours": { "fr": "30 jours", "en": "30 days", "es": "30 días", "de": "30 Tage" },
  "90 jours": { "fr": "90 jours", "en": "90 days", "es": "90 días", "de": "90 Tage" },
  "Anthropic": { "fr": "Anthropic", "en": "Anthropic", "es": "Anthropic", "de": "Anthropic" },
  "Anthropic via backend": { "fr": "Anthropic via backend", "en": "Anthropic via backend", "es": "Anthropic vía backend", "de": "Anthropic über Backend" },
  "Apercu interactif de la densite": { "fr": "Aperçu interactif de la densité", "en": "Interactive density preview", "es": "Vista previa interactiva de la densidad", "de": "Interaktive Dichtevorschau" },
  "Banniere": { "fr": "Bannière", "en": "Banner", "es": "Banner", "de": "Banner" },
  "Calme": { "fr": "Calme", "en": "Calm", "es": "Calma", "de": "Ruhig" },
  "Chaleureux": { "fr": "Chaleureux", "en": "Warm", "es": "Cálido", "de": "Warm" },
  "Chaque Space applique son Flow et son ambiance.": { "fr": "Chaque Space applique son Flow et son ambiance.", "en": "Each Space applies its own Flow and ambiance.", "es": "Cada Space aplica su propio Flow y ambiente.", "de": "Jeder Space wendet seinen eigenen Flow und sein Ambiente an." },
  "Choisir une banniere": { "fr": "Choisir une bannière", "en": "Choose a banner", "es": "Elegir un banner", "de": "Banner auswählen" },
  "Choisir une photo de profil": { "fr": "Choisir une photo de profil", "en": "Choose a profile photo", "es": "Elegir una foto de perfil", "de": "Profilbild auswählen" },
  "Compacter automatiquement le Space Focus.": { "fr": "Compacter automatiquement le Space Focus.", "en": "Automatically compact the Focus Space.", "es": "Compactar automáticamente el Space Focus.", "de": "Den Focus-Space automatisch kompakt darstellen." },
  "Contexte autorise complet": { "fr": "Contexte autorisé complet", "en": "Full authorized context", "es": "Contexto autorizado completo", "de": "Vollständiger autorisierter Kontext" },
  "Contexte minimal": { "fr": "Contexte minimal", "en": "Minimal context", "es": "Contexto mínimo", "de": "Minimaler Kontext" },
  "Couleur d'accent": { "fr": "Couleur d'accent", "en": "Accent color", "es": "Color de acento", "de": "Akzentfarbe" },
  "Dashboard": { "fr": "Dashboard", "en": "Dashboard", "es": "Dashboard", "de": "Dashboard" },
  "Density Engine": { "fr": "Density Engine", "en": "Density Engine", "es": "Density Engine", "de": "Density Engine" },
  "Design System": { "fr": "Design System", "en": "Design System", "es": "Design System", "de": "Design System" },
  "Developer": { "fr": "Développeur", "en": "Developer", "es": "Desarrollador", "de": "Entwickler" },
  "Enregistre": { "fr": "Enregistré", "en": "Saved", "es": "Guardado", "de": "Gespeichert" },
  "Environnements": { "fr": "Environnements", "en": "Environments", "es": "Entornos", "de": "Umgebungen" },
  "ETHONE Context": { "fr": "ETHONE Context", "en": "ETHONE Context", "es": "ETHONE Context", "de": "ETHONE Context" },
  "Faible": { "fr": "Faible", "en": "Low", "es": "Baja", "de": "Niedrig" },
  "Focus actif": { "fr": "Focus actif", "en": "Focus active", "es": "Focus activo", "de": "Focus aktiv" },
  "Focus Density": { "fr": "Focus Density", "en": "Focus Density", "es": "Focus Density", "de": "Focus Density" },
  "Gemini": { "fr": "Gemini", "en": "Gemini", "es": "Gemini", "de": "Gemini" },
  "Gemini via backend": { "fr": "Gemini via backend", "en": "Gemini via backend", "es": "Gemini vía backend", "de": "Gemini über Backend" },
  "Groq": { "fr": "Groq", "en": "Groq", "es": "Groq", "de": "Groq" },
  "Groq via backend": { "fr": "Groq via backend", "en": "Groq via backend", "es": "Groq vía backend", "de": "Groq über Backend" },
  "Inspector": { "fr": "Inspector", "en": "Inspector", "es": "Inspector", "de": "Inspector" },
  "Langue suivante": { "fr": "Langue suivante", "en": "Next language", "es": "Siguiente idioma", "de": "Nächste Sprache" },
  "LM Studio": { "fr": "LM Studio", "en": "LM Studio", "es": "LM Studio", "de": "LM Studio" },
  "LM Studio via pont local": { "fr": "LM Studio via pont local", "en": "LM Studio via local bridge", "es": "LM Studio vía puente local", "de": "LM Studio über lokale Brücke" },
  "Mode de densite": { "fr": "Mode de densité", "en": "Density mode", "es": "Modo de densidad", "de": "Dichtemodus" },
  "Nom de l'assistant": { "fr": "Nom de l'assistant", "en": "Assistant name", "es": "Nombre del asistente", "de": "Name des Assistenten" },
  "Ollama": { "fr": "Ollama", "en": "Ollama", "es": "Ollama", "de": "Ollama" },
  "Ollama via pont local": { "fr": "Ollama via pont local", "en": "Ollama via local bridge", "es": "Ollama vía puente local", "de": "Ollama über lokale Brücke" },
  "OpenAI": { "fr": "OpenAI", "en": "OpenAI", "es": "OpenAI", "de": "OpenAI" },
  "OpenAI via backend": { "fr": "OpenAI via backend", "en": "OpenAI via backend", "es": "OpenAI vía backend", "de": "OpenAI über Backend" },
  "Performance": { "fr": "Performance", "en": "Performance", "es": "Rendimiento", "de": "Leistung" },
  "Personal Brain": { "fr": "Personal Brain", "en": "Personal Brain", "es": "Personal Brain", "de": "Personal Brain" },
  "Personnel confortable, Focus compact, Studio confortable.": { "fr": "Personnel confortable, Focus compact, Studio confortable.", "en": "Personal comfortable, Focus compact, Studio comfortable.", "es": "Personal cómodo, Focus compacto, Studio cómodo.", "de": "Personal komfortabel, Focus kompakt, Studio komfortabel." },
  "Photo de profil": { "fr": "Photo de profil", "en": "Profile photo", "es": "Foto de perfil", "de": "Profilbild" },
  "Presets par Space": { "fr": "Presets par Space", "en": "Presets per Space", "es": "Preajustes por Space", "de": "Voreinstellungen pro Space" },
  "Privacy Center": { "fr": "Privacy Center", "en": "Privacy Center", "es": "Privacy Center", "de": "Privacy Center" },
  "Reduire les effets visuels pour gagner en fluidite sur les appareils moins puissants.": { "fr": "Réduire les effets visuels pour gagner en fluidité sur les appareils moins puissants.", "en": "Reduce visual effects for smoother performance on less powerful devices.", "es": "Reducir los efectos visuales para mayor fluidez en dispositivos menos potentes.", "de": "Visuelle Effekte reduzieren für flüssigere Leistung auf weniger leistungsstarken Geräten." },
  "RLS actif": { "fr": "RLS actif", "en": "RLS active", "es": "RLS activo", "de": "RLS aktiv" },
  "Sections des reglages": { "fr": "Sections des réglages", "en": "Settings sections", "es": "Secciones de ajustes", "de": "Einstellungsbereiche" },
  "Services externes": { "fr": "Services externes", "en": "External services", "es": "Servicios externos", "de": "Externe Dienste" },
  "Supabase": { "fr": "Supabase", "en": "Supabase", "es": "Supabase", "de": "Supabase" },
  "Technique": { "fr": "Technique", "en": "Technical", "es": "Técnico", "de": "Technisch" },
  "Theme": { "fr": "Thème", "en": "Theme", "es": "Tema", "de": "Theme" },
  "Votre espace en un regard": { "fr": "Votre espace en un regard", "en": "Your space at a glance", "es": "Tu espacio de un vistazo", "de": "Ihr Bereich auf einen Blick" },
  "Votre nom, votre photo et votre banniere, visibles dans tout ETHONE.": { "fr": "Votre nom, votre photo et votre bannière, visibles dans tout ETHONE.", "en": "Your name, photo and banner, visible throughout ETHONE.", "es": "Tu nombre, foto y banner, visibles en todo ETHONE.", "de": "Ihr Name, Foto und Banner, sichtbar in ganz ETHONE." },
  "Widget": { "fr": "Widget", "en": "Widget", "es": "Widget", "de": "Widget" },

  "Lancer une action": { "fr": "Lancer une action", "en": "Run an action", "es": "Ejecutar una acción", "de": "Aktion ausführen" },

  "Tâche": { "fr": "Tâche", "en": "Task", "es": "Tarea", "de": "Aufgabe" },
  "Voir toutes les tâches": { "fr": "Voir toutes les tâches", "en": "View all tasks", "es": "Ver todas las tareas", "de": "Alle Aufgaben anzeigen" },

  "Actions rapides": { "fr": "Actions rapides", "en": "Quick actions", "es": "Acciones rápidas", "de": "Schnellaktionen" },

  "Prochain evenement Google Calendar": { "fr": "Prochain événement Google Calendar", "en": "Next Google Calendar event", "es": "Próximo evento de Google Calendar", "de": "Nächster Google Calendar-Termin" },

  "Dernier fichier Google Drive": { "fr": "Dernier fichier Google Drive", "en": "Latest Google Drive file", "es": "Último archivo de Google Drive", "de": "Neueste Google Drive-Datei" },

  "Statistiques League of Legends": { "fr": "Statistiques League of Legends", "en": "League of Legends stats", "es": "Estadísticas de League of Legends", "de": "League of Legends-Statistiken" },

  "Changer de Space": { "fr": "Changer de Space", "en": "Change Space", "es": "Cambiar de Space", "de": "Space wechseln" },

  "Derniere page Notion modifiee": { "fr": "Dernière page Notion modifiée", "en": "Latest edited Notion page", "es": "Última página de Notion editada", "de": "Zuletzt bearbeitete Notion-Seite" },

  "Evenement": { "fr": "Événement", "en": "Event", "es": "Evento", "de": "Termin" },
  "Note": { "fr": "Note", "en": "Note", "es": "Nota", "de": "Notiz" },
  "Notifications": { "fr": "Notifications", "en": "Notifications", "es": "Notificaciones", "de": "Benachrichtigungen" },
  "Se deconnecter": { "fr": "Se déconnecter", "en": "Sign out", "es": "Cerrar sesión", "de": "Abmelden" },
  "Verifier la synchronisation": { "fr": "Vérifier la synchronisation", "en": "Check synchronization", "es": "Verificar sincronización", "de": "Synchronisierung prüfen" },

  "Activite Reddit": { "fr": "Activité Reddit", "en": "Reddit activity", "es": "Actividad en Reddit", "de": "Reddit-Aktivität" },

  "Action Bar globale": { "fr": "Action Bar globale", "en": "Global Action Bar", "es": "Action Bar global", "de": "Globale Action Bar" },
  "Barre d'etat ETHONE": { "fr": "Barre d'état ETHONE", "en": "ETHONE status bar", "es": "Barra de estado de ETHONE", "de": "ETHONE-Statusleiste" },
  "Brain Status": { "fr": "Brain Status", "en": "Brain Status", "es": "Brain Status", "de": "Brain Status" },
  "Changements en attente": { "fr": "Changements en attente", "en": "Pending changes", "es": "Cambios pendientes", "de": "Ausstehende Änderungen" },
  "Changer de langue": { "fr": "Changer de langue", "en": "Change language", "es": "Cambiar idioma", "de": "Sprache ändern" },
  "Cloud Sync": { "fr": "Cloud Sync", "en": "Cloud Sync", "es": "Cloud Sync", "de": "Cloud Sync" },
  "Contexte actif": { "fr": "Contexte actif", "en": "Active context", "es": "Contexto activo", "de": "Aktiver Kontext" },
  "Enregistrement en cours": { "fr": "Enregistrement en cours", "en": "Saving", "es": "Guardando", "de": "Wird gespeichert" },
  "Erreur de sauvegarde": { "fr": "Erreur de sauvegarde", "en": "Save error", "es": "Error al guardar", "de": "Speicherfehler" },
  "Erreur de synchronisation": { "fr": "Erreur de synchronisation", "en": "Sync error", "es": "Error de sincronización", "de": "Synchronisierungsfehler" },
  "ETHONE OS": { "fr": "ETHONE OS", "en": "ETHONE OS", "es": "ETHONE OS", "de": "ETHONE OS" },
  "Fil d'Ariane": { "fr": "Fil d'Ariane", "en": "Breadcrumbs", "es": "Migas de pan", "de": "Breadcrumb-Navigation" },
  "Hors ligne - changements en attente": { "fr": "Hors ligne - changements en attente", "en": "Offline - changes pending", "es": "Sin conexión - cambios pendientes", "de": "Offline - Änderungen ausstehend" },
  "Nouvelle tentative": { "fr": "Nouvelle tentative", "en": "Retrying", "es": "Reintentando", "de": "Erneuter Versuch" },
  "Sauvegarde prete": { "fr": "Sauvegarde prête", "en": "Save ready", "es": "Guardado listo", "de": "Speichern bereit" },
  "Session Supabase expiree": { "fr": "Session Supabase expirée", "en": "Supabase session expired", "es": "Sesión de Supabase caducada", "de": "Supabase-Sitzung abgelaufen" },
  "Synchronisation en cours": { "fr": "Synchronisation en cours", "en": "Syncing", "es": "Sincronizando", "de": "Wird synchronisiert" },
  "Synchronise avec Supabase": { "fr": "Synchronisé avec Supabase", "en": "Synced with Supabase", "es": "Sincronizado con Supabase", "de": "Mit Supabase synchronisiert" },
  "Synchroniser": { "fr": "Synchroniser", "en": "Sync", "es": "Sincronizar", "de": "Synchronisieren" },

  "Morceau precedent": { "fr": "Morceau précédent", "en": "Previous track", "es": "Pista anterior", "de": "Vorheriger Titel" },
  "Morceau suivant": { "fr": "Morceau suivant", "en": "Next track", "es": "Pista siguiente", "de": "Nächster Titel" },

  "Prochaine tache Todoist": { "fr": "Prochaine tâche Todoist", "en": "Next Todoist task", "es": "Próxima tarea de Todoist", "de": "Nächste Todoist-Aufgabe" },

  "Statistiques Tracker.gg": { "fr": "Statistiques Tracker.gg", "en": "Tracker.gg stats", "es": "Estadísticas de Tracker.gg", "de": "Tracker.gg-Statistiken" },

  "Chaine Twitch": { "fr": "Chaîne Twitch", "en": "Twitch channel", "es": "Canal de Twitch", "de": "Twitch-Kanal" },

  "Statistiques Valorant": { "fr": "Statistiques Valorant", "en": "Valorant stats", "es": "Estadísticas de Valorant", "de": "Valorant-Statistiken" },

  "Voir le detail meteo": { "fr": "Voir le détail météo", "en": "View weather detail", "es": "Ver detalle meteorológico", "de": "Wetterdetail anzeigen" },

  "Activite YouTube": { "fr": "Activité YouTube", "en": "YouTube activity", "es": "Actividad en YouTube", "de": "YouTube-Aktivität" },
  "SECURITY": { "fr": "SECURITY", "en": "SECURITY", "es": "SECURITY", "de": "SECURITY" },
  "Deutsch": { "fr": "Allemand", "en": "German", "es": "Alemán", "de": "Deutsch" },
  "English": { "fr": "Anglais", "en": "English", "es": "Inglés", "de": "Englisch" },
  "Tache": { "fr": "Tâche", "en": "Task", "es": "Tarea", "de": "Aufgabe" },
  "Changer de theme": { "fr": "Changer de thème", "en": "Change theme", "es": "Cambiar el tema", "de": "Theme ändern" },

  "Nuit": { "fr": "Nuit", "en": "Night", "es": "Noche", "de": "Nacht" },
  "Graphite": { "fr": "Graphite", "en": "Graphite", "es": "Grafito", "de": "Graphit" },
  "Jour": { "fr": "Jour", "en": "Day", "es": "Día", "de": "Tag" },
  "Sombre et profond, le mode par defaut.": { "fr": "Sombre et profond, le mode par défaut.", "en": "Dark and deep, the default mode.", "es": "Oscuro y profundo, el modo predeterminado.", "de": "Dunkel und tief, der Standardmodus." },
  "Sombre, un ton plus clair et neutre.": { "fr": "Sombre, un ton plus clair et neutre.", "en": "Dark, a lighter and more neutral tone.", "es": "Oscuro, un tono más claro y neutro.", "de": "Dunkel, ein hellerer und neutralerer Ton." },
  "Clair, pour la lumiere du jour.": { "fr": "Clair, pour la lumière du jour.", "en": "Light, for daytime brightness.", "es": "Claro, para la luz del día.", "de": "Hell, für Tageslicht." },
  "Suit les preferences de votre systeme.": { "fr": "Suit les préférences de votre système.", "en": "Follows your system preferences.", "es": "Sigue las preferencias de tu sistema.", "de": "Folgt Ihren Systemeinstellungen." },
  "Mode Jour applique": { "fr": "Mode Jour appliqué", "en": "Day mode applied", "es": "Modo Día aplicado", "de": "Tagmodus angewendet" },
  "Mode Nuit applique": { "fr": "Mode Nuit appliqué", "en": "Night mode applied", "es": "Modo Noche aplicado", "de": "Nachtmodus angewendet" },
  "Mode Graphite applique": { "fr": "Mode Graphite appliqué", "en": "Graphite mode applied", "es": "Modo Grafito aplicado", "de": "Graphitmodus angewendet" },
  "Mode Automatique applique": { "fr": "Mode Automatique appliqué", "en": "Automatic mode applied", "es": "Modo Automático aplicado", "de": "Automatikmodus angewendet" },
  "Theme modifie": { "fr": "Thème modifié", "en": "Theme changed", "es": "Tema modificado", "de": "Theme geändert" },
  "Activer le theme Nuit": { "fr": "Activer le thème Nuit", "en": "Switch to Night theme", "es": "Activar el tema Noche", "de": "Nacht-Theme aktivieren" },
  "Activer le theme Jour": { "fr": "Activer le thème Jour", "en": "Switch to Day theme", "es": "Activar el tema Día", "de": "Tag-Theme aktivieren" },
  "Adapter les surfaces et le contraste.": { "fr": "Adapter les surfaces et le contraste.", "en": "Adjust surfaces and contrast.", "es": "Ajustar las superficies y el contraste.", "de": "Oberflächen und Kontrast anpassen." },

  "Spacieuse": { "fr": "Spacieuse", "en": "Spacious", "es": "Espaciosa", "de": "Geräumig" },
  "Confortable": { "fr": "Confortable", "en": "Comfortable", "es": "Cómoda", "de": "Komfortabel" },
  "Compacte": { "fr": "Compacte", "en": "Compact", "es": "Compacta", "de": "Kompakt" },
  "Ultra compacte": { "fr": "Ultra compacte", "en": "Ultra compact", "es": "Ultra compacta", "de": "Ultra kompakt" },
  "Personnalisee": { "fr": "Personnalisée", "en": "Custom", "es": "Personalizada", "de": "Benutzerdefiniert" },
  "Lecture et cibles tactiles genereuses.": { "fr": "Lecture et cibles tactiles généreuses.", "en": "Generous reading room and touch targets.", "es": "Lectura y áreas táctiles generosas.", "de": "Großzügiger Lesefluss und Touch-Ziele." },
  "Equilibre par defaut pour le quotidien.": { "fr": "Équilibre par défaut pour le quotidien.", "en": "Balanced default for everyday use.", "es": "Equilibrio predeterminado para el día a día.", "de": "Ausgewogener Standard für den Alltag." },
  "Davantage d'information sans sacrifier la lecture.": { "fr": "Davantage d'information sans sacrifier la lecture.", "en": "More information without sacrificing readability.", "es": "Más información sin sacrificar la lectura.", "de": "Mehr Informationen ohne Lesbarkeit zu opfern." },
  "Densite maximale avec focus et cibles conserves.": { "fr": "Densité maximale avec focus et cibles conservés.", "en": "Maximum density while keeping focus and touch targets.", "es": "Densidad máxima conservando el foco y las áreas táctiles.", "de": "Maximale Dichte bei erhaltenem Fokus und Touch-Zielen." },
  "S'adapte a l'ecran, au zoom et au contexte.": { "fr": "S'adapte à l'écran, au zoom et au contexte.", "en": "Adapts to screen, zoom and context.", "es": "Se adapta a la pantalla, el zoom y el contexto.", "de": "Passt sich an Bildschirm, Zoom und Kontext an." },
  "Reglez chaque dimension de l'interface.": { "fr": "Réglez chaque dimension de l'interface.", "en": "Fine-tune every dimension of the interface.", "es": "Ajusta cada dimensión de la interfaz.", "de": "Passen Sie jede Dimension der Oberfläche an." },

  "Detail meteo": { "fr": "Détail météo", "en": "Weather detail", "es": "Detalle meteorológico", "de": "Wetterdetail" },
  "Vent": { "fr": "Vent", "en": "Wind", "es": "Viento", "de": "Wind" },
  "Humidite": { "fr": "Humidité", "en": "Humidity", "es": "Humedad", "de": "Luftfeuchtigkeit" },

  "A l'ouverture d'une page": { "fr": "À l'ouverture d'une page", "en": "When opening a page", "es": "Al abrir una página", "de": "Beim Öffnen einer Seite" },
  "Au passage vers un Space": { "fr": "Au passage vers un Space", "en": "When switching to a Space", "es": "Al pasar a un Space", "de": "Beim Wechsel zu einem Space" },
  "A une heure precise": { "fr": "À une heure précise", "en": "At a specific time", "es": "A una hora concreta", "de": "Zu einer bestimmten Uhrzeit" },
  "Creer": { "fr": "Créer", "en": "Create", "es": "Crear", "de": "Erstellen" },
  "Les automatisations s'executent selon votre niveau d'automatisation.": { "fr": "Les automatisations s'exécutent selon votre niveau d'automatisation.", "en": "Automations run according to your automation level.", "es": "Las automatizaciones se ejecutan según tu nivel de automatización.", "de": "Automatisierungen laufen entsprechend Ihrer Automatisierungsstufe." },
  "Regles": { "fr": "Règles", "en": "Rules", "es": "Reglas", "de": "Regeln" },
  "Vos automatisations": { "fr": "Vos automatisations", "en": "Your automations", "es": "Tus automatizaciones", "de": "Ihre Automatisierungen" },
  "Declenchez un changement de Space, de densite ou de theme automatiquement.": { "fr": "Déclenchez un changement de Space, de densité ou de thème automatiquement.", "en": "Trigger a Space, density or theme change automatically.", "es": "Activa automáticamente un cambio de Space, densidad o tema.", "de": "Lösen Sie automatisch einen Space-, Dichte- oder Theme-Wechsel aus." },
  "Declencheur": { "fr": "Déclencheur", "en": "Trigger", "es": "Disparador", "de": "Auslöser" },
  "Page": { "fr": "Page", "en": "Page", "es": "Página", "de": "Seite" },
  "Heure": { "fr": "Heure", "en": "Time", "es": "Hora", "de": "Uhrzeit" },
  "Action": { "fr": "Action", "en": "Action", "es": "Acción", "de": "Aktion" },
  "Aucune automatisation": { "fr": "Aucune automatisation", "en": "No automations", "es": "Sin automatizaciones", "de": "Keine Automatisierungen" },
  "Creez une regle pour declencher un changement de Space, de densite ou de theme.": { "fr": "Créez une règle pour déclencher un changement de Space, de densité ou de thème.", "en": "Create a rule to trigger a Space, density or theme change.", "es": "Crea una regla para activar un cambio de Space, densidad o tema.", "de": "Erstellen Sie eine Regel für einen Space-, Dichte- oder Theme-Wechsel." },
  "Automatisation creee": { "fr": "Automatisation créée", "en": "Automation created", "es": "Automatización creada", "de": "Automatisierung erstellt" },
  "Automatisation mise a jour": { "fr": "Automatisation mise à jour", "en": "Automation updated", "es": "Automatización actualizada", "de": "Automatisierung aktualisiert" },
  "Automatisation supprimee": { "fr": "Automatisation supprimée", "en": "Automation deleted", "es": "Automatización eliminada", "de": "Automatisierung gelöscht" },
  "Suggestions avant automatisation": { "fr": "Suggestions avant automatisation", "en": "Suggestions before automation", "es": "Sugerencias antes de automatizar", "de": "Vorschläge vor der Automatisierung" },
  "Brain peut proposer un Flow, un widget ou une densite, mais ne modifie jamais un reglage important seul.": { "fr": "Brain peut proposer un Flow, un widget ou une densité, mais ne modifie jamais un réglage important seul.", "en": "Brain can suggest a Flow, a widget or a density, but never changes an important setting on its own.", "es": "Brain puede sugerir un Flow, un widget o una densidad, pero nunca modifica un ajuste importante por sí solo.", "de": "Brain kann einen Flow, ein Widget oder eine Dichte vorschlagen, ändert aber nie allein eine wichtige Einstellung." },
  "Les automatisations s'executent automatiquement.": { "fr": "Les automatisations s'exécutent automatiquement.", "en": "Automations run automatically.", "es": "Las automatizaciones se ejecutan automáticamente.", "de": "Automatisierungen laufen automatisch." },
  "Chaque automatisation demande une confirmation avant de s'executer.": { "fr": "Chaque automatisation demande une confirmation avant de s'exécuter.", "en": "Every automation asks for confirmation before running.", "es": "Cada automatización pide confirmación antes de ejecutarse.", "de": "Jede Automatisierung fragt vor der Ausführung um Bestätigung." },
  "Space": { "fr": "Space", "en": "Space", "es": "Space", "de": "Space" },
  "Densite": { "fr": "Densité", "en": "Density", "es": "Densidad", "de": "Dichte" },
  "Automatique": { "fr": "Automatique", "en": "Automatic", "es": "Automático", "de": "Automatisch" },
  "Automatisation introuvable.": { "fr": "Automatisation introuvable.", "en": "Automation not found.", "es": "Automatización no encontrada.", "de": "Automatisierung nicht gefunden." },
  "Notes de version": { "fr": "Notes de version", "en": "Release notes", "es": "Notas de la versión", "de": "Versionshinweise" },
  "Historique ETHONE": { "fr": "Historique ETHONE", "en": "ETHONE history", "es": "Historial de ETHONE", "de": "ETHONE-Verlauf" },
  "Ce qui a change recemment dans ETHONE, du plus recent au plus ancien.": { "fr": "Ce qui a changé récemment dans ETHONE, du plus récent au plus ancien.", "en": "What's changed recently in ETHONE, newest first.", "es": "Lo que ha cambiado recientemente en ETHONE, de lo más reciente a lo más antiguo.", "de": "Was sich in ETHONE zuletzt geändert hat, neueste zuerst." },
  "Nouveau": { "fr": "Nouveau", "en": "New", "es": "Nuevo", "de": "Neu" },
  "Corrige": { "fr": "Corrigé", "en": "Fixed", "es": "Corregido", "de": "Behoben" },
  "Ameliore": { "fr": "Amélioré", "en": "Improved", "es": "Mejorado", "de": "Verbessert" },
  "Nettoyage": { "fr": "Nettoyage", "en": "Cleanup", "es": "Limpieza", "de": "Aufräumen" },
  "Traduction": { "fr": "Traduction", "en": "Translation", "es": "Traducción", "de": "Übersetzung" },

  "Space Personnel": { "fr": "Space Personnel", "en": "Personal Space", "es": "Space Personal", "de": "Space Persönlich" },
  "Space Focus": { "fr": "Space Focus", "en": "Focus Space", "es": "Space Focus", "de": "Space Focus" },
  "Space Studio": { "fr": "Space Studio", "en": "Studio Space", "es": "Space Studio", "de": "Space Studio" },
  "Densite Spacieuse": { "fr": "Densité Spacieuse", "en": "Spacious density", "es": "Densidad Espaciosa", "de": "Dichte Geräumig" },
  "Densite Confortable": { "fr": "Densité Confortable", "en": "Comfortable density", "es": "Densidad Cómoda", "de": "Dichte Komfortabel" },
  "Densite Compacte": { "fr": "Densité Compacte", "en": "Compact density", "es": "Densidad Compacta", "de": "Dichte Kompakt" },
  "Densite Ultra compacte": { "fr": "Densité Ultra compacte", "en": "Ultra compact density", "es": "Densidad Ultra compacta", "de": "Dichte Ultra kompakt" },
  "Densite Automatique": { "fr": "Densité Automatique", "en": "Automatic density", "es": "Densidad Automática", "de": "Dichte Automatisch" },
  "Theme Nuit": { "fr": "Thème Nuit", "en": "Night theme", "es": "Tema Noche", "de": "Theme Nacht" },
  "Theme Graphite": { "fr": "Thème Graphite", "en": "Graphite theme", "es": "Tema Grafito", "de": "Theme Graphit" },
  "Theme Jour": { "fr": "Thème Jour", "en": "Day theme", "es": "Tema Día", "de": "Theme Tag" },
  "Theme Automatique": { "fr": "Thème Automatique", "en": "Automatic theme", "es": "Tema Automático", "de": "Theme Automatisch" },

  "Chemin du dossier": { "fr": "Chemin du dossier", "en": "Folder path", "es": "Ruta de la carpeta", "de": "Ordnerpfad" },
  "Déplacer vers...": { "fr": "Déplacer vers...", "en": "Move to...", "es": "Mover a...", "de": "Verschieben nach..." },
  "Ce dossier est vide": { "fr": "Ce dossier est vide", "en": "This folder is empty", "es": "Esta carpeta está vacía", "de": "Dieser Ordner ist leer" },
  "Ajoutez un lien ou un sous-dossier ici.": { "fr": "Ajoutez un lien ou un sous-dossier ici.", "en": "Add a link or a subfolder here.", "es": "Añade un enlace o una subcarpeta aquí.", "de": "Fügen Sie hier einen Link oder einen Unterordner hinzu." },
  "Dossier vide": { "fr": "Dossier vide", "en": "Empty folder", "es": "Carpeta vacía", "de": "Leerer Ordner" },
  "Élément déplacé.": { "fr": "Élément déplacé.", "en": "Item moved.", "es": "Elemento movido.", "de": "Element verschoben." },
  "Dossier introuvable": { "fr": "Dossier introuvable", "en": "Folder not found", "es": "Carpeta no encontrada", "de": "Ordner nicht gefunden" },
  "Un dossier ne peut pas se contenir lui-même": { "fr": "Un dossier ne peut pas se contenir lui-même", "en": "A folder cannot contain itself", "es": "Una carpeta no puede contenerse a sí misma", "de": "Ein Ordner kann sich nicht selbst enthalten" },
  "Impossible de déplacer un dossier dans lui-même": { "fr": "Impossible de déplacer un dossier dans lui-même", "en": "Cannot move a folder into itself", "es": "No se puede mover una carpeta dentro de sí misma", "de": "Ein Ordner kann nicht in sich selbst verschoben werden" }
};
Object.keys(ENTRIES).forEach((key) => Object.freeze(ENTRIES[key]));
Object.freeze(ENTRIES);

const LOCALE_TAGS = Object.freeze({ fr: "fr-FR", en: "en-GB", es: "es-ES", de: "de-DE" });

export function normalizeLocale(value) {
  const locale = String(value || "").toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(locale) ? locale : "fr";
}

export function currentLocale(storage = globalThis.localStorage) {
  try {
    return normalizeLocale(storage?.getItem("nexus_lang") || storage?.getItem("ethone_lang") || globalThis.document?.documentElement?.lang || "fr");
  } catch {
    return "fr";
  }
}

export function localeTag(locale = currentLocale()) {
  return LOCALE_TAGS[normalizeLocale(locale)];
}

export function sourceEntry(source) {
  return ENTRIES[String(source || "").replace(/\s+/g, " ").trim()] || null;
}

export function translateSource(source, locale = currentLocale()) {
  const original = String(source == null ? "" : source);
  const clean = original.replace(/\s+/g, " ").trim();
  if (!clean) return original;
  const local = sourceEntry(clean);
  if (local) return original.replace(clean, local[normalizeLocale(locale)]);
  const shared = globalThis.ETHONEPhraseCatalog?.translate?.(original, normalizeLocale(locale));
  return shared || original;
}

export const V8_SOURCE_KEYS = Object.freeze(Object.keys(ENTRIES));
