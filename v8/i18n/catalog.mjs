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
  "Source non connectee": { "fr": "Source non connect\u00e9e", "en": "Source not connected", "es": "Fuente no conectada", "de": "Quelle nicht verbunden" },
  "Aucune donnee recente": { "fr": "Aucune donn\u00e9e r\u00e9cente", "en": "No recent data", "es": "Sin datos recientes", "de": "Keine aktuellen Daten" },
  "Aucun evenement aujourd'hui": { "fr": "Aucun \u00e9v\u00e9nement aujourd'hui", "en": "No events today", "es": "Sin eventos hoy", "de": "Heute keine Termine" },
  "Aucune tache prioritaire": { "fr": "Aucune t\u00e2che prioritaire", "en": "No priority tasks", "es": "Sin tareas prioritarias", "de": "Keine vorrangigen Aufgaben" },
  "Aucune ecoute recente": { "fr": "Aucune \u00e9coute r\u00e9cente", "en": "No recent listening", "es": "Sin reproducciones recientes", "de": "Keine k\u00fcrzliche Wiedergabe" },
  "Connecter dans Connections": { "fr": "Connecter dans Connections", "en": "Connect in Connections", "es": "Conectar en Connections", "de": "Unter Connections verbinden" },
  "Activite synchronisee": { "fr": "Activit\u00e9 synchronis\u00e9e", "en": "Activity synced", "es": "Actividad sincronizada", "de": "Aktivit\u00e4t synchronisiert" },
  "Historique synchronise": { "fr": "Historique synchronis\u00e9", "en": "History synced", "es": "Historial sincronizado", "de": "Verlauf synchronisiert" },
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
  }
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
