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
  access_denied_admin: string;
  access_denied_mod: string;
  cooldown_wait: string;

  // Generic / shared across commands
  guild_only_command: string;
  mod_module_disabled: string;
  mod_member_not_found: string;
  mod_usage: string;

  // /settings panel
  settings_footer: string;
  settings_description: string;
  settings_admin_only_note: string;
  settings_field_appearance: string;
  settings_label_display_name: string;
  settings_label_theme_preset: string;
  settings_label_primary_color: string;
  settings_label_secondary_color: string;
  settings_label_success_error_color: string;
  settings_label_key_emojis: string;
  settings_field_commands: string;
  settings_label_text_prefix: string;
  settings_label_prefix_commands: string;
  settings_label_slash_commands: string;
  settings_label_cooldown: string;
  settings_label_autodelete: string;
  settings_field_language_audio: string;
  settings_label_language: string;
  settings_label_default_volume: string;
  settings_label_timezone: string;
  settings_field_privacy: string;
  settings_label_response_visibility: string;
  settings_visibility_private: string;
  settings_visibility_public: string;
  settings_label_personality: string;
  settings_state_enabled: string;
  settings_state_disabled: string;
  settings_state_yes: string;
  settings_state_no: string;
  settings_select_placeholder: string;
  settings_opt_language_label: string;
  settings_opt_language_desc: string;
  settings_opt_theme_label: string;
  settings_opt_theme_desc: string;
  settings_opt_privacy_label: string;
  settings_opt_privacy_desc: string;
  settings_opt_personality_label: string;
  settings_opt_personality_desc: string;
  settings_opt_audio_label: string;
  settings_opt_audio_desc: string;
  settings_opt_colors_label: string;
  settings_opt_colors_desc: string;
  settings_opt_name_label: string;
  settings_opt_name_desc: string;
  settings_opt_prefix_label: string;
  settings_opt_prefix_desc: string;
  settings_opt_emojis_label: string;
  settings_opt_emojis_desc: string;
  settings_opt_autodelete_label: string;
  settings_opt_autodelete_desc: string;
  settings_btn_private_replies: string;
  settings_btn_public_replies: string;
  settings_btn_disable_prefix: string;
  settings_btn_enable_prefix: string;
  settings_btn_disable_slash: string;
  settings_btn_enable_slash: string;
  settings_btn_refresh: string;
  settings_btn_reset: string;
  settings_perm_denied: string;
  settings_perm_denied_interact: string;
  settings_perm_denied_modify: string;
  settings_action_unauthorized: string;
  settings_updated_success: string;
  settings_update_error: string;
  settings_invalid_hex: string;
  settings_invalid_name_length: string;
  settings_invalid_prefix: string;
  settings_modal_audio_title: string;
  settings_modal_audio_volume_label: string;
  settings_modal_audio_cooldown_label: string;
  settings_modal_colors_title: string;
  settings_modal_colors_primary_label: string;
  settings_modal_colors_secondary_label: string;
  settings_modal_colors_success_label: string;
  settings_modal_colors_error_label: string;
  settings_modal_name_title: string;
  settings_modal_name_label: string;
  settings_modal_prefix_title: string;
  settings_modal_prefix_label: string;
  settings_modal_emojis_title: string;
  settings_modal_emojis_success_label: string;
  settings_modal_emojis_error_label: string;
  settings_modal_emojis_info_label: string;
  settings_modal_general_title: string;
  settings_modal_general_lang_label: string;
  settings_modal_general_tz_label: string;
  settings_color_name_primary: string;
  settings_color_name_secondary: string;
  settings_color_name_success: string;
  settings_color_name_error: string;
  settings_btn_back: string;
  settings_personality_view_title: string;
  settings_personality_view_footer: string;
  settings_personality_view_desc: string;
  settings_personality_friendly_label: string;
  settings_personality_friendly_desc: string;
  settings_personality_professional_label: string;
  settings_personality_professional_desc: string;
  settings_personality_humorous_label: string;
  settings_personality_humorous_desc: string;
  settings_personality_concise_label: string;
  settings_personality_concise_desc: string;
  settings_personality_cyber_label: string;
  settings_personality_cyber_desc: string;
  settings_theme_view_title: string;
  settings_theme_view_footer: string;
  settings_theme_view_desc: string;
  settings_theme_default_label: string;
  settings_theme_cyberpunk_label: string;
  settings_theme_emerald_label: string;
  settings_theme_sunset_label: string;
  settings_theme_dark_label: string;
  settings_privacy_view_title: string;
  settings_privacy_view_footer: string;
  settings_privacy_view_desc: string;
  settings_privacy_field_public_value: string;
  settings_privacy_field_private_value: string;
  settings_privacy_public_label: string;
  settings_privacy_private_label: string;
  settings_language_view_title: string;
  settings_language_view_footer: string;
  settings_language_view_desc: string;

  // Moderation commands
  warn_title: string;
  warn_desc: string;
  warn_dm: string;
  warn_escalation_field_name: string;
  warn_escalation_field_value: string;
  ban_title: string;
  ban_desc: string;
  ban_dm: string;
  ban_fail: string;
  kick_title: string;
  kick_desc: string;
  kick_dm: string;
  kick_fail: string;
  timeout_title: string;
  timeout_desc: string;
  timeout_invalid_duration: string;
  timeout_fail: string;
  untimeout_title: string;
  untimeout_desc: string;
  untimeout_fail: string;
  lock_title: string;
  lock_desc: string;
  lock_default_reason: string;
  lock_fail: string;
  lock_no_channel: string;
  unlock_title: string;
  unlock_desc: string;
  unlock_fail: string;
  unlock_no_channel: string;
  unban_title: string;
  unban_desc: string;
  unban_invalid_id: string;
  unban_not_banned: string;
  unban_fail: string;
  nickname_changed: string;
  nickname_reset: string;
  nickname_fail: string;
  slowmode_unavailable: string;
  slowmode_invalid: string;
  slowmode_disabled: string;
  slowmode_set: string;
  slowmode_fail: string;
  warnings_empty_title: string;
  warnings_empty_desc: string;
  warnings_title: string;
  warnings_total: string;
  warnings_field_value: string;

  // Music
  music_no_query: string;
  music_play_failed: string;
  music_now_playing_title: string;
  music_now_playing_desc: string;
  music_added_queue_title: string;
  music_added_queue_desc: string;
  music_paused: string;
  music_pause_failed: string;
  music_resumed: string;
  music_resume_failed: string;
  music_skipped: string;
  music_queue_end: string;
  music_skip_failed: string;
  music_previous: string;
  music_no_previous: string;
  music_stopped: string;
  music_stop_failed: string;
  music_current_volume: string;
  music_volume_set: string;
  music_volume_failed: string;
  music_seek_invalid: string;
  music_seek_set: string;
  music_seek_failed: string;
  music_shuffled: string;
  music_shuffle_failed: string;
  music_loop_set: string;
  music_loop_invalid: string;
  music_remove_invalid: string;
  music_removed: string;
  music_remove_invalid_position: string;
  music_queue_cleared: string;
  music_queue_clear_failed: string;
  music_panel_title: string;
  music_panel_idle_desc: string;
  music_panel_field_voice_channel: string;
  music_panel_field_queue: string;
  music_panel_disconnected: string;
  music_panel_footer_idle: string;
  music_panel_footer_active: string;
  music_panel_field_requested_by: string;
  music_panel_field_volume: string;
  music_panel_field_repeat: string;
  music_panel_field_shuffle: string;
  music_panel_field_voice: string;
  music_panel_active: string;
  music_panel_inactive: string;
  music_panel_muted: string;
  music_panel_unknown: string;

  // Tickets
  ticket_module_disabled: string;
  ticket_already_open: string;
  ticket_channel_embed_title: string;
  ticket_subject_label: string;
  ticket_detail_prompt: string;
  ticket_create_failed: string;
  ticket_category_not_found: string;
  ticket_open_failed_default: string;
  ticket_btn_assigned_unclaim: string;
  ticket_btn_close: string;
  ticket_btn_priority: string;
  ticket_btn_transcript: string;
  ticket_btn_claim: string;
  ticket_not_found: string;
  ticket_priority_updated: string;
  ticket_transcript_ready: string;

  // Polls
  poll_list_empty: string;
  poll_list_title: string;
  poll_list_item: string;
  poll_missing_id: string;
  poll_not_found: string;
  poll_invalid_channel: string;
  poll_panel_published: string;
  poll_end_error: string;
  poll_ended_success: string;
  poll_results_calc_failed: string;
  poll_results_title: string;
  poll_results_default_desc: string;
  poll_field_total_voters: string;
  poll_field_total_weight: string;
  poll_field_quorum: string;
  poll_no_votes: string;
  poll_panel_no_end_date: string;
  poll_panel_footer_default: string;
  poll_btn_view_results: string;
  poll_btn_vote_web: string;
  poll_deleted: string;
  poll_live_results_title: string;
  poll_no_votes_recorded: string;
  poll_live_results_footer: string;
  poll_vote_error: string;
  poll_vote_success_title: string;
  poll_vote_success_desc: string;
  poll_visibility_public: string;
  poll_visibility_anonymous: string;
  poll_no_winner: string;
  poll_announce_winner_template: string;

  // Forms
  form_usage: string;
  form_not_found: string;
  form_web_portal_desc: string;
  form_panel_published: string;
  form_stats_title: string;
  form_field_total_responses: string;
  form_field_pending: string;
  form_field_approved: string;
  form_field_rejected: string;
  form_field_avg_score: string;
  form_field_status: string;
  form_panel_default_desc: string;
  form_btn_apply_now: string;
  form_deleted: string;
  form_closed: string;
  form_btn_open_web: string;
  form_web_required_desc: string;
  form_generic_not_found: string;
  form_submit_error: string;
  form_submitted_title: string;
  form_submitted_desc: string;
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
    access_denied_admin: '⛔ **Accès Refusé** : Cette commande d\'administration est réservée aux administrateurs ou rôles autorisés.',
    access_denied_mod: '⛔ **Accès Refusé** : Vous ne disposez pas des permissions nécessaires pour exécuter cette commande de modération (Rôle Modérateur/Staff requis).',
    cooldown_wait: '⏳ **Anti-Spam** : Veuillez patienter encore **{seconds}s** avant de réutiliser la commande `{command}`.',

    guild_only_command: '❌ Cette commande ne peut être exécutée que sur un serveur.',
    mod_module_disabled: '{emoji} Le module Modération est désactivé sur ce serveur.',
    mod_member_not_found: '❌ Membre introuvable sur ce serveur.',
    mod_usage: '{emoji} Utilisation : `{usage}`',

    settings_footer: '{botName} • Utilisez le menu ci-dessous pour modifier',
    settings_description: 'Personnalisez le comportement, les couleurs et les commandes de **{botName}** sur ce serveur.',
    settings_admin_only_note: '*Seuls les administrateurs ou membres ayant `Gérer le serveur` peuvent modifier ces réglages.*',
    settings_field_appearance: '🎨 Apparence & Couleurs',
    settings_label_display_name: 'Nom affiché',
    settings_label_theme_preset: 'Thème Prédéfini',
    settings_label_primary_color: 'Couleur Principale',
    settings_label_secondary_color: 'Couleur Secondaire',
    settings_label_success_error_color: 'Succès / Erreur',
    settings_label_key_emojis: 'Emojis clés',
    settings_field_commands: '⌨️ Commandes & Anti-Spam',
    settings_label_text_prefix: 'Préfixe textuel',
    settings_label_prefix_commands: 'Commandes Préfixes (`{prefix}`)',
    settings_label_slash_commands: 'Slash Commands (`/`)',
    settings_label_cooldown: 'Cooldown Anti-Spam',
    settings_label_autodelete: 'Suppression auto commandes',
    settings_field_language_audio: '🌐 Langue & Audio',
    settings_label_language: 'Langue',
    settings_label_default_volume: 'Volume Musique par Défaut',
    settings_label_timezone: 'Fuseau horaire',
    settings_field_privacy: '🔒 Confidentialité & Personnalité',
    settings_label_response_visibility: 'Visibilité des réponses',
    settings_visibility_private: '🔒 **Privé (Éphémère)** *(visible uniquement par l\'utilisateur)*',
    settings_visibility_public: '👁️ **Public** *(visible par tout le salon)*',
    settings_label_personality: 'Personnalité / Ton',
    settings_state_enabled: '🟢 **Activées**',
    settings_state_disabled: '🔴 **Désactivées**',
    settings_state_yes: '🟢 **Oui**',
    settings_state_no: '🔴 **Non**',
    settings_select_placeholder: 'Sélectionnez une catégorie à modifier...',
    settings_opt_language_label: 'Langue du Bot (FR / EN / ES / DE)',
    settings_opt_language_desc: 'Changer la langue du serveur (Français, English, Español, Deutsch)',
    settings_opt_theme_label: 'Thème Graphique (Presets Couleurs)',
    settings_opt_theme_desc: 'Basculer entre Cyber Neon, Emerald, Crimson, Sunset, Amethyst ou Défaut',
    settings_opt_privacy_label: 'Confidentialité des Réponses (Public / Privé)',
    settings_opt_privacy_desc: 'Choisir si les réponses aux commandes sont visibles par tous ou privées',
    settings_opt_personality_label: 'Personnalité & Style du Bot',
    settings_opt_personality_desc: 'Changer le ton de réponse : Amical, Professionnel, Fun, Concis, Cyber',
    settings_opt_audio_label: 'Options Audio & Cooldown',
    settings_opt_audio_desc: 'Ajuster le volume par défaut de la musique et le délai anti-spam',
    settings_opt_colors_label: 'Personnaliser les Couleurs (HEX)',
    settings_opt_colors_desc: 'Personnaliser manuellement la couleur principale, secondaire, succès et erreur',
    settings_opt_name_label: 'Modifier le Nom du Bot',
    settings_opt_name_desc: 'Changer le nom affiché dans les embeds et messages',
    settings_opt_prefix_label: 'Modifier le Préfixe',
    settings_opt_prefix_desc: 'Changer le préfixe textuel (ex: !, ?, $, >>)',
    settings_opt_emojis_label: 'Modifier les Emojis',
    settings_opt_emojis_desc: 'Personnaliser les emojis de succès, erreur, chargement...',
    settings_opt_autodelete_label: 'Suppression Auto des Commandes',
    settings_opt_autodelete_desc: 'Activer ou désactiver la suppression automatique des commandes invoquées',
    settings_btn_private_replies: 'Réponses Privées',
    settings_btn_public_replies: 'Réponses Publiques',
    settings_btn_disable_prefix: 'Désactiver Préfixe',
    settings_btn_enable_prefix: 'Activer Préfixe',
    settings_btn_disable_slash: 'Désactiver Slash',
    settings_btn_enable_slash: 'Activer Slash',
    settings_btn_refresh: 'Actualiser',
    settings_btn_reset: 'Réinitialiser',
    settings_perm_denied: '❌ Vous devez avoir la permission `Gérer le serveur` pour accéder à ces réglages.',
    settings_perm_denied_interact: '❌ Vous devez avoir la permission `Gérer le serveur` pour interagir avec ces boutons.',
    settings_perm_denied_modify: '❌ Vous devez avoir la permission `Gérer le serveur` pour modifier ces réglages.',
    settings_action_unauthorized: '❌ Action non autorisée.',
    settings_updated_success: '{emoji} Configuration mise à jour avec succès !',
    settings_update_error: '❌ Une erreur est survenue lors de la mise à jour des paramètres.',
    settings_invalid_hex: '❌ Le code couleur HEX pour **{name}** est invalide (`{val}`). Il doit respecter le format `#RRGGBB` (ex: #5865F2).',
    settings_invalid_name_length: '❌ Le nom doit comporter entre 1 et 32 caractères.',
    settings_invalid_prefix: '❌ Le préfixe doit comporter entre 1 et 5 caractères et ne pas contenir d\'espace.',
    settings_modal_audio_title: '🎛️ Audio & Anti-Spam Cooldown',
    settings_modal_audio_volume_label: 'Volume musique par défaut (10 - 100 %)',
    settings_modal_audio_cooldown_label: 'Cooldown anti-spam par commande (0 - 15 s)',
    settings_modal_colors_title: '🎨 Couleurs du Bot (Format HEX)',
    settings_modal_colors_primary_label: 'Couleur Principale (ex: #5865F2)',
    settings_modal_colors_secondary_label: 'Couleur Secondaire (ex: #4752C4)',
    settings_modal_colors_success_label: 'Couleur Succès (ex: #57F287)',
    settings_modal_colors_error_label: 'Couleur Erreur (ex: #ED4245)',
    settings_modal_name_title: '📝 Nom affiché du Bot',
    settings_modal_name_label: 'Nom affiché dans les messages / embeds',
    settings_modal_prefix_title: '⌨️ Préfixe des Commandes',
    settings_modal_prefix_label: 'Nouveau préfixe (ex: !, ?, $, >>)',
    settings_modal_emojis_title: '😀 Personnalisation des Emojis',
    settings_modal_emojis_success_label: 'Emoji Succès',
    settings_modal_emojis_error_label: 'Emoji Erreur',
    settings_modal_emojis_info_label: 'Emoji Info',
    settings_modal_general_title: '🌐 Langue & Fuseau Horaire',
    settings_modal_general_lang_label: 'Langue du bot (fr ou en)',
    settings_modal_general_tz_label: 'Fuseau horaire (ex: Europe/Paris)',
    settings_color_name_primary: 'Principale',
    settings_color_name_secondary: 'Secondaire',
    settings_color_name_success: 'Succès',
    settings_color_name_error: 'Erreur',
    settings_btn_back: 'Retour',
    settings_personality_view_title: '🎭 Personnalité & Style du Bot',
    settings_personality_view_footer: '{botName} • Choisissez un style ci-dessous',
    settings_personality_view_desc: 'Le style choisi détermine le ton des réponses (IA et messages) de **{botName}** sur ce serveur.\n\n**Actuel : {emoji} {label}**\n*{desc}*',
    settings_personality_friendly_label: 'Amical',
    settings_personality_friendly_desc: 'Ton chaleureux et accessible, comme un ami serviable.',
    settings_personality_professional_label: 'Professionnel',
    settings_personality_professional_desc: 'Ton formel et précis, orienté efficacité.',
    settings_personality_humorous_label: 'Fun',
    settings_personality_humorous_desc: 'Ton léger et enjoué, avec quelques touches d\'humour.',
    settings_personality_concise_label: 'Concis',
    settings_personality_concise_desc: 'Réponses courtes et directes, sans fioritures.',
    settings_personality_cyber_label: 'Cyber',
    settings_personality_cyber_desc: 'Ton futuriste et technique, esthétique cyberpunk.',
    settings_theme_view_title: '🎨 Thème Graphique du Bot',
    settings_theme_view_footer: '{botName} • Choisissez un thème ci-dessous',
    settings_theme_view_desc: 'Le thème détermine les couleurs principale/secondaire utilisées par défaut dans les embeds.\n\n**Actuel : {emoji} {label}**\n`{primary}` / `{secondary}`',
    settings_theme_default_label: 'Défaut',
    settings_theme_cyberpunk_label: 'Cyber Neon',
    settings_theme_emerald_label: 'Emerald',
    settings_theme_sunset_label: 'Sunset',
    settings_theme_dark_label: 'Dark',
    settings_privacy_view_title: '🔒 Confidentialité des Réponses',
    settings_privacy_view_footer: '{botName} • Choisissez une visibilité ci-dessous',
    settings_privacy_view_desc: 'Détermine si les réponses aux commandes sont visibles par tout le salon ou uniquement par la personne qui exécute la commande.\n\n**Actuel : {state}**',
    settings_privacy_field_public_value: 'Visible par tout le salon.',
    settings_privacy_field_private_value: 'Visible uniquement par vous.',
    settings_privacy_public_label: 'Public',
    settings_privacy_private_label: 'Privé (Éphémère)',
    settings_language_view_title: '🌐 Langue du Bot',
    settings_language_view_footer: '{botName} • Choisissez une langue ci-dessous',
    settings_language_view_desc: 'Détermine la langue utilisée par {botName} dans ses messages et embeds sur ce serveur.\n\n**Actuelle : {flag} {name}** (`{code}`)',

    warn_title: '⚠️ Avertissement • #{id}',
    warn_desc: 'Le membre {target} a été averti avec succès.\n\n**Raison :** {reason}\n**Modérateur :** {moderator}',
    warn_dm: '⚠️ Vous avez reçu un avertissement sur **{guild}** pour la raison suivante : *{reason}*.',
    warn_escalation_field_name: '🚨 Sanction Automatique Déclenchée',
    warn_escalation_field_value: 'Seuil d\'avertissements atteint : action d\'escalade requise (`{action}`).',
    ban_title: '🔨 Bannissement • #{id}',
    ban_desc: 'L\'utilisateur **{userTag}** a été banni avec succès.\n\n**Raison :** {reason}\n**Modérateur :** {moderator}',
    ban_dm: '🔨 Vous avez été banni du serveur **{guild}**.\n**Raison :** {reason}',
    ban_fail: '❌ Impossible de bannir cet utilisateur.',
    kick_title: '👢 Expulsion • #{id}',
    kick_desc: 'Le membre **{userTag}** a été expulsé avec succès.\n\n**Raison :** {reason}\n**Modérateur :** {moderator}',
    kick_dm: '👢 Vous avez été expulsé du serveur **{guild}**.\n**Raison :** {reason}',
    kick_fail: '❌ Échec de l\'expulsion.',
    timeout_title: '🔇 Mise en Sourdine • #{id}',
    timeout_desc: 'Le membre {target} a été mis en sourdine pour **{duration}**.\n\n**Raison :** {reason}\n**Modérateur :** {moderator}',
    timeout_invalid_duration: '❌ Durée invalide (maximum 28 jours, ex: 10m, 2h, 1d).',
    timeout_fail: '❌ Échec de la mise en sourdine.',
    untimeout_title: '🔊 Sourdine Retirée • #{id}',
    untimeout_desc: 'La sourdine du membre {target} a été levée avec succès.',
    untimeout_fail: '❌ Échec du retrait de la sourdine.',
    lock_title: '🔒 Salon Verrouillé',
    lock_desc: 'Ce salon a été verrouillé par un modérateur.\n**Raison :** {reason}',
    lock_default_reason: 'Salon verrouillé temporairement',
    lock_fail: '❌ Impossible de verrouiller le salon.',
    lock_no_channel: '❌ Impossible de verrouiller ce salon.',
    unlock_title: '🔓 Salon Déverrouillé',
    unlock_desc: 'Ce salon est à nouveau ouvert à la discussion.',
    unlock_fail: '❌ Impossible de déverrouiller le salon.',
    unlock_no_channel: '❌ Impossible de déverrouiller ce salon.',
    unban_title: '🔓 Débannissement • #{id}',
    unban_desc: 'L\'utilisateur **{userTag}** a été débanni avec succès.',
    unban_invalid_id: '❌ Veuillez fournir un identifiant Discord valide (ex: `{example}`).',
    unban_not_banned: '❌ Cet utilisateur n\'est pas banni sur ce serveur.',
    unban_fail: '❌ Échec du débannissement.',
    nickname_changed: '✅ Le surnom de {target} a été modifié en **{nick}**.',
    nickname_reset: '✅ Le surnom de {target} a été réinitialisé.',
    nickname_fail: '❌ Impossible de modifier le surnom de ce membre.',
    slowmode_unavailable: '❌ Le mode lent n\'est pas disponible dans ce salon.',
    slowmode_invalid: '❌ Veuillez spécifier un nombre de secondes entre 0 et 21600.',
    slowmode_disabled: '✅ Le mode lent a été **désactivé** dans ce salon.',
    slowmode_set: '⏱️ Mode lent configuré à **{seconds} seconde(s)** par message dans ce salon.',
    slowmode_fail: '❌ Impossible de modifier le mode lent.',
    warnings_empty_title: '🛡️ Historique • {target}',
    warnings_empty_desc: 'Ce membre ne possède aucun avertissement ou sanction enregistrée.',
    warnings_title: '🛡️ Historique Disciplinaire • {target}',
    warnings_total: 'Total : **{count}** sanction(s) enregistrée(s)\n────────────────────',
    warnings_field_value: '**Raison :** {reason}\n**Par :** {moderator} • *{date}*',

    music_no_query: '❌ Veuillez spécifier un titre ou un lien à jouer.',
    music_play_failed: '❌ Impossible de lancer cette musique.',
    music_now_playing_title: '▶️ Lecture en cours',
    music_now_playing_desc: '**[{title}]({url})**\nArtiste : {artist}\nDurée : {duration}',
    music_added_queue_title: '➕ Ajouté à la file d\'attente',
    music_added_queue_desc: '**[{title}]({url})**\nPosition dans la file : **#{position}**',
    music_paused: '⏸️ La lecture est désormais en pause.',
    music_pause_failed: '❌ Impossible de mettre en pause.',
    music_resumed: '▶️ Lecture reprise.',
    music_resume_failed: '❌ Impossible de reprendre la lecture.',
    music_skipped: '⏭️ Piste suivante : **{title}**.',
    music_queue_end: 'Fin de la file d\'attente. Lecture arrêtée.',
    music_skip_failed: '❌ Impossible de passer à la suivante.',
    music_previous: '⏮️ Retour au titre : **{title}**.',
    music_no_previous: '❌ Aucune musique précédente dans l\'historique.',
    music_stopped: '⏹️ Lecture arrêtée et file d\'attente réinitialisée.',
    music_stop_failed: '❌ Impossible d\'arrêter la lecture.',
    music_current_volume: 'Le volume actuel est de **{volume}%**.',
    music_volume_set: '🔊 Volume réglé sur **{volume}%**.',
    music_volume_failed: '❌ Impossible de modifier le volume.',
    music_seek_invalid: '❌ Veuillez spécifier un temps valide en secondes.',
    music_seek_set: '⏩ Position déplacée à **{time}**.',
    music_seek_failed: '❌ Impossible de déplacer la position.',
    music_shuffled: '🔀 File d\'attente mélangée aléatoirement !',
    music_shuffle_failed: '❌ Impossible de mélanger la file.',
    music_loop_set: '🔁 Mode de répétition défini sur : **{mode}**.',
    music_loop_invalid: '❌ Mode invalide.',
    music_remove_invalid: '❌ Veuillez spécifier la position du titre à retirer (ex: 1).',
    music_removed: '🗑️ Titre retiré : **{title}**.',
    music_remove_invalid_position: '❌ Position invalide dans la file.',
    music_queue_cleared: '🧹 La file d\'attente a été vidée.',
    music_queue_clear_failed: '❌ Impossible de vider la file.',
    music_panel_title: '🎵 ETHONE Music Player',
    music_panel_idle_desc: '**Aucune musique en cours de lecture.**\n\nUtilisez `/music play <titre/lien>` ou le **Music Center ETHONE** pour lancer un morceau.',
    music_panel_field_voice_channel: '🔊 Salon Vocal',
    music_panel_field_queue: '📜 File d\'attente',
    music_panel_disconnected: 'Déconnecté',
    music_panel_footer_idle: 'ETHONE Music Center 2.0 • Audio Engine',
    music_panel_footer_active: 'ETHONE Music Center 2.0 • Contrôlez la musique en direct',
    music_panel_field_requested_by: '👤 Demandé par',
    music_panel_field_volume: '🔊 Volume',
    music_panel_field_repeat: '🔁 Répétition',
    music_panel_field_shuffle: '🔀 Aléatoire',
    music_panel_field_voice: '📍 Salon Vocal',
    music_panel_active: 'Actif',
    music_panel_inactive: 'Désactivé',
    music_panel_muted: 'Muet',
    music_panel_unknown: 'Inconnu',

    ticket_module_disabled: '{emoji} Le module **Tickets** est désactivé sur ce serveur. Activez-le depuis le dashboard web.',
    ticket_already_open: '{emoji} Vous avez déjà un ticket ouvert dans {channel}.',
    ticket_channel_embed_title: '🎫 Ticket Support • {user}',
    ticket_subject_label: '📌 **Motif :** *{subject}*',
    ticket_detail_prompt: 'Veuillez détailler votre situation ou question ci-dessous.',
    ticket_create_failed: '{emoji} Impossible de créer le ticket (vérifiez que le bot a la permission de gérer les salons).',
    ticket_category_not_found: '❌ Catégorie introuvable.',
    ticket_open_failed_default: 'Impossible d\'ouvrir le ticket.',
    ticket_btn_assigned_unclaim: 'Assigné à @{user} (Unclaim)',
    ticket_btn_close: 'Fermer',
    ticket_btn_priority: 'Priorité',
    ticket_btn_transcript: 'Transcript',
    ticket_btn_claim: 'Prendre en charge (Claim)',
    ticket_not_found: '❌ Ticket introuvable.',
    ticket_priority_updated: '📌 **Priorité mise à jour :** `{old}` ➔ `{new}`',
    ticket_transcript_ready: '📄 **Voici la transcription complète de ce ticket :**',

    poll_list_empty: 'ℹ️ Aucun sondage configuré sur ce serveur. Créez-en un depuis le dashboard ETHONE !',
    poll_list_title: '📊 Sondages & Votes ETHONE',
    poll_list_item: '• **{title}** (`{id}`)\n  Statut : `{status}` | Type : `{type}` | Votes : **{count}**',
    poll_missing_id: '❌ ID de sondage manquant. Exemple : `!poll results <id>` ou `!poll panel <id>`',
    poll_not_found: '❌ Sondage avec l\'ID `{id}` introuvable sur ce serveur.',
    poll_invalid_channel: '❌ Salon textuel invalide.',
    poll_panel_published: '✅ Panneau de vote pour **{title}** publié avec succès dans {channel}.',
    poll_end_error: '❌ Erreur : {error}',
    poll_ended_success: '🏁 Le sondage **{title}** a été clôturé avec succès. Les résultats finaux ont été consolidés et les automatisations déclenchées.',
    poll_results_calc_failed: '❌ Impossible de calculer les résultats.',
    poll_results_title: '📊 Résultats : {title}',
    poll_results_default_desc: 'Statistiques de vote en temps réel',
    poll_field_total_voters: '👥 Total Votants',
    poll_field_total_weight: '⚖️ Poids Total',
    poll_field_quorum: '📌 Quorum',
    poll_no_votes: 'Aucun vote',
    poll_panel_no_end_date: 'Non définie',
    poll_panel_footer_default: 'ETHONE Polls • Fin : {date}',
    poll_btn_view_results: 'Voir les Résultats',
    poll_btn_vote_web: 'Voter sur le Web',
    poll_deleted: '❌ Ce sondage n\'existe plus ou a été supprimé.',
    poll_live_results_title: '📊 Résultats en direct — {title}',
    poll_no_votes_recorded: 'Aucun vote enregistré.',
    poll_live_results_footer: 'Total participants : {count} • ETHONE Polls 2.0',
    poll_vote_error: '❌ **Erreur de vote :** {error}',
    poll_vote_success_title: '✅ Vote enregistré avec succès !',
    poll_vote_success_desc: 'Votre vote pour **{label}** a bien été comptabilisé.\n\n⚖️ **Poids du vote :** {weight} point(s)\n🔒 **Confidentialité :** {visibility}\n\n*Merci pour votre participation à la vie du serveur !*',
    poll_visibility_public: 'Public',
    poll_visibility_anonymous: 'Anonyme',
    poll_no_winner: 'Aucun gagnant',
    poll_announce_winner_template: '🏆 **Résultats du sondage "{pollTitle}" !**\nLe choix gagnant est **{winner}** avec {votes} votes ({percent}%).',

    form_usage: '❌ Usage : `!form open <id>`, `!form panel <id>`, ou `!form stats <id>`',
    form_not_found: '❌ Formulaire avec l\'identifiant `{id}` introuvable.',
    form_web_portal_desc: 'Ce formulaire est disponible sur le portail Web ETHONE :\n{url}',
    form_panel_published: '✅ Panneau interactif pour **{title}** publié avec succès dans {channel}.',
    form_stats_title: '📊 Statistiques — {title}',
    form_field_total_responses: 'Total réponses',
    form_field_pending: 'En attente de review',
    form_field_approved: 'Approuvées',
    form_field_rejected: 'Rejetées',
    form_field_avg_score: 'Score moyen',
    form_field_status: 'Statut du formulaire',
    form_panel_default_desc: '📋 **Catégorie :** {category}\n⏱️ **Temps estimé :** ~3 minutes\n🔒 **Statut :** Ouvert',
    form_btn_apply_now: 'Postuler maintenant',
    form_deleted: '❌ Ce formulaire n\'existe plus ou a été désactivé.',
    form_closed: '⚠️ Ce formulaire est actuellement fermé aux nouvelles réponses.',
    form_btn_open_web: 'Ouvrir le Formulaire Web',
    form_web_required_desc: 'Ce formulaire comportant plusieurs étapes et des options avancées, veuillez le remplir directement sur l\'interface sécurisée ETHONE :',
    form_generic_not_found: '❌ Formulaire introuvable.',
    form_submit_error: '❌ **Erreur de soumission :** {error}',
    form_submitted_title: '✅ Candidature envoyée avec succès',
    form_submitted_desc: 'Votre réponse pour **{title}** a bien été enregistrée.\n\n🆔 **Numéro de suivi :** `#{id}`\n📊 **Statut initial :** En attente d\'examen par le staff\n\n*Vous recevrez une notification privée dès qu\'une décision sera prise.*',
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
    access_denied_admin: '⛔ **Access Denied**: This administration command is reserved for administrators or authorized roles.',
    access_denied_mod: '⛔ **Access Denied**: You do not have the required permissions to execute this moderation command (Moderator/Staff role required).',
    cooldown_wait: '⏳ **Anti-Spam**: Please wait **{seconds}s** before reusing the `{command}` command.',

    guild_only_command: '❌ This command can only be used inside a server.',
    mod_module_disabled: '{emoji} The Moderation module is disabled on this server.',
    mod_member_not_found: '❌ Member not found on this server.',
    mod_usage: '{emoji} Usage: `{usage}`',

    settings_footer: '{botName} • Use the menu below to make changes',
    settings_description: 'Customize the behavior, colors, and commands of **{botName}** on this server.',
    settings_admin_only_note: '*Only administrators or members with `Manage Server` can change these settings.*',
    settings_field_appearance: '🎨 Appearance & Colors',
    settings_label_display_name: 'Display name',
    settings_label_theme_preset: 'Theme Preset',
    settings_label_primary_color: 'Primary Color',
    settings_label_secondary_color: 'Secondary Color',
    settings_label_success_error_color: 'Success / Error',
    settings_label_key_emojis: 'Key emojis',
    settings_field_commands: '⌨️ Commands & Anti-Spam',
    settings_label_text_prefix: 'Text prefix',
    settings_label_prefix_commands: 'Prefix Commands (`{prefix}`)',
    settings_label_slash_commands: 'Slash Commands (`/`)',
    settings_label_cooldown: 'Anti-Spam Cooldown',
    settings_label_autodelete: 'Auto-delete commands',
    settings_field_language_audio: '🌐 Language & Audio',
    settings_label_language: 'Language',
    settings_label_default_volume: 'Default Music Volume',
    settings_label_timezone: 'Timezone',
    settings_field_privacy: '🔒 Privacy & Personality',
    settings_label_response_visibility: 'Response visibility',
    settings_visibility_private: '🔒 **Private (Ephemeral)** *(visible only to the user)*',
    settings_visibility_public: '👁️ **Public** *(visible to the whole channel)*',
    settings_label_personality: 'Personality / Tone',
    settings_state_enabled: '🟢 **Enabled**',
    settings_state_disabled: '🔴 **Disabled**',
    settings_state_yes: '🟢 **Yes**',
    settings_state_no: '🔴 **No**',
    settings_select_placeholder: 'Select a category to edit...',
    settings_opt_language_label: 'Bot Language (FR / EN / ES / DE)',
    settings_opt_language_desc: 'Change the server language (Français, English, Español, Deutsch)',
    settings_opt_theme_label: 'Color Theme (Presets)',
    settings_opt_theme_desc: 'Switch between Cyber Neon, Emerald, Crimson, Sunset, Amethyst or Default',
    settings_opt_privacy_label: 'Response Privacy (Public / Private)',
    settings_opt_privacy_desc: 'Choose whether command replies are visible to everyone or just to you',
    settings_opt_personality_label: 'Bot Personality & Style',
    settings_opt_personality_desc: 'Change the reply tone: Friendly, Professional, Fun, Concise, Cyber',
    settings_opt_audio_label: 'Audio & Cooldown Options',
    settings_opt_audio_desc: 'Adjust the default music volume and the anti-spam delay',
    settings_opt_colors_label: 'Customize Colors (HEX)',
    settings_opt_colors_desc: 'Manually set the primary, secondary, success and error colors',
    settings_opt_name_label: 'Edit Bot Name',
    settings_opt_name_desc: 'Change the name shown in embeds and messages',
    settings_opt_prefix_label: 'Edit Prefix',
    settings_opt_prefix_desc: 'Change the text prefix (e.g. !, ?, $, >>)',
    settings_opt_emojis_label: 'Edit Emojis',
    settings_opt_emojis_desc: 'Customize the success, error, loading emojis...',
    settings_opt_autodelete_label: 'Auto-Delete Commands',
    settings_opt_autodelete_desc: 'Enable or disable automatic deletion of invoked commands',
    settings_btn_private_replies: 'Private Replies',
    settings_btn_public_replies: 'Public Replies',
    settings_btn_disable_prefix: 'Disable Prefix',
    settings_btn_enable_prefix: 'Enable Prefix',
    settings_btn_disable_slash: 'Disable Slash',
    settings_btn_enable_slash: 'Enable Slash',
    settings_btn_refresh: 'Refresh',
    settings_btn_reset: 'Reset',
    settings_perm_denied: '❌ You need the `Manage Server` permission to access these settings.',
    settings_perm_denied_interact: '❌ You need the `Manage Server` permission to interact with these buttons.',
    settings_perm_denied_modify: '❌ You need the `Manage Server` permission to change these settings.',
    settings_action_unauthorized: '❌ Unauthorized action.',
    settings_updated_success: '{emoji} Settings updated successfully!',
    settings_update_error: '❌ An error occurred while updating the settings.',
    settings_invalid_hex: '❌ The HEX color code for **{name}** is invalid (`{val}`). It must follow the `#RRGGBB` format (e.g. #5865F2).',
    settings_invalid_name_length: '❌ The name must be between 1 and 32 characters long.',
    settings_invalid_prefix: '❌ The prefix must be between 1 and 5 characters long and contain no spaces.',
    settings_modal_audio_title: '🎛️ Audio & Anti-Spam Cooldown',
    settings_modal_audio_volume_label: 'Default music volume (10 - 100%)',
    settings_modal_audio_cooldown_label: 'Anti-spam cooldown per command (0 - 15s)',
    settings_modal_colors_title: '🎨 Bot Colors (HEX Format)',
    settings_modal_colors_primary_label: 'Primary Color (e.g. #5865F2)',
    settings_modal_colors_secondary_label: 'Secondary Color (e.g. #4752C4)',
    settings_modal_colors_success_label: 'Success Color (e.g. #57F287)',
    settings_modal_colors_error_label: 'Error Color (e.g. #ED4245)',
    settings_modal_name_title: '📝 Bot Display Name',
    settings_modal_name_label: 'Name shown in messages / embeds',
    settings_modal_prefix_title: '⌨️ Command Prefix',
    settings_modal_prefix_label: 'New prefix (e.g. !, ?, $, >>)',
    settings_modal_emojis_title: '😀 Emoji Customization',
    settings_modal_emojis_success_label: 'Success Emoji',
    settings_modal_emojis_error_label: 'Error Emoji',
    settings_modal_emojis_info_label: 'Info Emoji',
    settings_modal_general_title: '🌐 Language & Timezone',
    settings_modal_general_lang_label: 'Bot language (fr or en)',
    settings_modal_general_tz_label: 'Timezone (e.g. Europe/Paris)',
    settings_color_name_primary: 'Primary',
    settings_color_name_secondary: 'Secondary',
    settings_color_name_success: 'Success',
    settings_color_name_error: 'Error',
    settings_btn_back: 'Back',
    settings_personality_view_title: '🎭 Bot Personality & Style',
    settings_personality_view_footer: '{botName} • Choose a style below',
    settings_personality_view_desc: 'The chosen style determines the tone of **{botName}**\'s replies (AI and messages) on this server.\n\n**Current: {emoji} {label}**\n*{desc}*',
    settings_personality_friendly_label: 'Friendly',
    settings_personality_friendly_desc: 'A warm, approachable tone, like a helpful friend.',
    settings_personality_professional_label: 'Professional',
    settings_personality_professional_desc: 'A formal, precise tone geared toward efficiency.',
    settings_personality_humorous_label: 'Fun',
    settings_personality_humorous_desc: 'A light, upbeat tone with a touch of humor.',
    settings_personality_concise_label: 'Concise',
    settings_personality_concise_desc: 'Short, direct replies with no frills.',
    settings_personality_cyber_label: 'Cyber',
    settings_personality_cyber_desc: 'A futuristic, technical tone with a cyberpunk feel.',
    settings_theme_view_title: '🎨 Bot Color Theme',
    settings_theme_view_footer: '{botName} • Choose a theme below',
    settings_theme_view_desc: 'The theme sets the default primary/secondary colors used in embeds.\n\n**Current: {emoji} {label}**\n`{primary}` / `{secondary}`',
    settings_theme_default_label: 'Default',
    settings_theme_cyberpunk_label: 'Cyber Neon',
    settings_theme_emerald_label: 'Emerald',
    settings_theme_sunset_label: 'Sunset',
    settings_theme_dark_label: 'Dark',
    settings_privacy_view_title: '🔒 Response Privacy',
    settings_privacy_view_footer: '{botName} • Choose a visibility below',
    settings_privacy_view_desc: 'Determines whether command replies are visible to the whole channel or only to the person who ran the command.\n\n**Current: {state}**',
    settings_privacy_field_public_value: 'Visible to the whole channel.',
    settings_privacy_field_private_value: 'Visible only to you.',
    settings_privacy_public_label: 'Public',
    settings_privacy_private_label: 'Private (Ephemeral)',
    settings_language_view_title: '🌐 Bot Language',
    settings_language_view_footer: '{botName} • Choose a language below',
    settings_language_view_desc: 'Determines the language {botName} uses in its messages and embeds on this server.\n\n**Current: {flag} {name}** (`{code}`)',

    warn_title: '⚠️ Warning • #{id}',
    warn_desc: 'Member {target} has been warned successfully.\n\n**Reason:** {reason}\n**Moderator:** {moderator}',
    warn_dm: '⚠️ You received a warning on **{guild}** for the following reason: *{reason}*.',
    warn_escalation_field_name: '🚨 Automatic Sanction Triggered',
    warn_escalation_field_value: 'Warning threshold reached: an escalation action is required (`{action}`).',
    ban_title: '🔨 Ban • #{id}',
    ban_desc: 'User **{userTag}** has been banned successfully.\n\n**Reason:** {reason}\n**Moderator:** {moderator}',
    ban_dm: '🔨 You have been banned from server **{guild}**.\n**Reason:** {reason}',
    ban_fail: '❌ Unable to ban this user.',
    kick_title: '👢 Kick • #{id}',
    kick_desc: 'Member **{userTag}** has been kicked successfully.\n\n**Reason:** {reason}\n**Moderator:** {moderator}',
    kick_dm: '👢 You have been kicked from server **{guild}**.\n**Reason:** {reason}',
    kick_fail: '❌ Kick failed.',
    timeout_title: '🔇 Timeout • #{id}',
    timeout_desc: 'Member {target} has been timed out for **{duration}**.\n\n**Reason:** {reason}\n**Moderator:** {moderator}',
    timeout_invalid_duration: '❌ Invalid duration (maximum 28 days, e.g. 10m, 2h, 1d).',
    timeout_fail: '❌ Timeout failed.',
    untimeout_title: '🔊 Timeout Removed • #{id}',
    untimeout_desc: 'The timeout on member {target} has been lifted successfully.',
    untimeout_fail: '❌ Failed to remove the timeout.',
    lock_title: '🔒 Channel Locked',
    lock_desc: 'This channel has been locked by a moderator.\n**Reason:** {reason}',
    lock_default_reason: 'Channel locked temporarily',
    lock_fail: '❌ Unable to lock the channel.',
    lock_no_channel: '❌ Unable to lock this channel.',
    unlock_title: '🔓 Channel Unlocked',
    unlock_desc: 'This channel is now open for discussion again.',
    unlock_fail: '❌ Unable to unlock the channel.',
    unlock_no_channel: '❌ Unable to unlock this channel.',
    unban_title: '🔓 Unban • #{id}',
    unban_desc: 'User **{userTag}** has been unbanned successfully.',
    unban_invalid_id: '❌ Please provide a valid Discord ID (e.g. `{example}`).',
    unban_not_banned: '❌ This user is not banned on this server.',
    unban_fail: '❌ Unban failed.',
    nickname_changed: '✅ {target}\'s nickname has been changed to **{nick}**.',
    nickname_reset: '✅ {target}\'s nickname has been reset.',
    nickname_fail: '❌ Unable to change this member\'s nickname.',
    slowmode_unavailable: '❌ Slowmode is not available in this channel.',
    slowmode_invalid: '❌ Please specify a number of seconds between 0 and 21600.',
    slowmode_disabled: '✅ Slowmode has been **disabled** in this channel.',
    slowmode_set: '⏱️ Slowmode set to **{seconds} second(s)** per message in this channel.',
    slowmode_fail: '❌ Unable to change slowmode.',
    warnings_empty_title: '🛡️ History • {target}',
    warnings_empty_desc: 'This member has no recorded warnings or sanctions.',
    warnings_title: '🛡️ Disciplinary History • {target}',
    warnings_total: 'Total: **{count}** sanction(s) recorded\n────────────────────',
    warnings_field_value: '**Reason:** {reason}\n**By:** {moderator} • *{date}*',

    music_no_query: '❌ Please specify a title or link to play.',
    music_play_failed: '❌ Unable to play this track.',
    music_now_playing_title: '▶️ Now Playing',
    music_now_playing_desc: '**[{title}]({url})**\nArtist: {artist}\nDuration: {duration}',
    music_added_queue_title: '➕ Added to Queue',
    music_added_queue_desc: '**[{title}]({url})**\nQueue position: **#{position}**',
    music_paused: '⏸️ Playback is now paused.',
    music_pause_failed: '❌ Unable to pause.',
    music_resumed: '▶️ Playback resumed.',
    music_resume_failed: '❌ Unable to resume playback.',
    music_skipped: '⏭️ Next track: **{title}**.',
    music_queue_end: 'End of queue. Playback stopped.',
    music_skip_failed: '❌ Unable to skip to the next track.',
    music_previous: '⏮️ Back to track: **{title}**.',
    music_no_previous: '❌ No previous track in history.',
    music_stopped: '⏹️ Playback stopped and queue cleared.',
    music_stop_failed: '❌ Unable to stop playback.',
    music_current_volume: 'The current volume is **{volume}%**.',
    music_volume_set: '🔊 Volume set to **{volume}%**.',
    music_volume_failed: '❌ Unable to change the volume.',
    music_seek_invalid: '❌ Please specify a valid time in seconds.',
    music_seek_set: '⏩ Position moved to **{time}**.',
    music_seek_failed: '❌ Unable to move the playback position.',
    music_shuffled: '🔀 Queue shuffled randomly!',
    music_shuffle_failed: '❌ Unable to shuffle the queue.',
    music_loop_set: '🔁 Repeat mode set to: **{mode}**.',
    music_loop_invalid: '❌ Invalid mode.',
    music_remove_invalid: '❌ Please specify the position of the track to remove (e.g. 1).',
    music_removed: '🗑️ Removed track: **{title}**.',
    music_remove_invalid_position: '❌ Invalid position in the queue.',
    music_queue_cleared: '🧹 The queue has been cleared.',
    music_queue_clear_failed: '❌ Unable to clear the queue.',
    music_panel_title: '🎵 ETHONE Music Player',
    music_panel_idle_desc: '**No music is currently playing.**\n\nUse `/music play <title/link>` or the **ETHONE Music Center** to start a track.',
    music_panel_field_voice_channel: '🔊 Voice Channel',
    music_panel_field_queue: '📜 Queue',
    music_panel_disconnected: 'Disconnected',
    music_panel_footer_idle: 'ETHONE Music Center 2.0 • Audio Engine',
    music_panel_footer_active: 'ETHONE Music Center 2.0 • Control the music live',
    music_panel_field_requested_by: '👤 Requested by',
    music_panel_field_volume: '🔊 Volume',
    music_panel_field_repeat: '🔁 Repeat',
    music_panel_field_shuffle: '🔀 Shuffle',
    music_panel_field_voice: '📍 Voice Channel',
    music_panel_active: 'Active',
    music_panel_inactive: 'Disabled',
    music_panel_muted: 'Muted',
    music_panel_unknown: 'Unknown',

    ticket_module_disabled: '{emoji} The **Tickets** module is disabled on this server. Enable it from the web dashboard.',
    ticket_already_open: '{emoji} You already have an open ticket in {channel}.',
    ticket_channel_embed_title: '🎫 Support Ticket • {user}',
    ticket_subject_label: '📌 **Reason:** *{subject}*',
    ticket_detail_prompt: 'Please describe your situation or question in detail below.',
    ticket_create_failed: '{emoji} Unable to create the ticket (make sure the bot has permission to manage channels).',
    ticket_category_not_found: '❌ Category not found.',
    ticket_open_failed_default: 'Unable to open the ticket.',
    ticket_btn_assigned_unclaim: 'Assigned to @{user} (Unclaim)',
    ticket_btn_close: 'Close',
    ticket_btn_priority: 'Priority',
    ticket_btn_transcript: 'Transcript',
    ticket_btn_claim: 'Claim ticket',
    ticket_not_found: '❌ Ticket not found.',
    ticket_priority_updated: '📌 **Priority updated:** `{old}` ➔ `{new}`',
    ticket_transcript_ready: '📄 **Here is the complete transcript of this ticket:**',

    poll_list_empty: 'ℹ️ No polls configured on this server. Create one from the ETHONE dashboard!',
    poll_list_title: '📊 ETHONE Polls & Votes',
    poll_list_item: '• **{title}** (`{id}`)\n  Status: `{status}` | Type: `{type}` | Votes: **{count}**',
    poll_missing_id: '❌ Missing poll ID. Example: `!poll results <id>` or `!poll panel <id>`',
    poll_not_found: '❌ Poll with ID `{id}` not found on this server.',
    poll_invalid_channel: '❌ Invalid text channel.',
    poll_panel_published: '✅ Voting panel for **{title}** was successfully published in {channel}.',
    poll_end_error: '❌ Error: {error}',
    poll_ended_success: '🏁 The poll **{title}** has been closed successfully. Final results have been tallied and automations triggered.',
    poll_results_calc_failed: '❌ Unable to calculate the results.',
    poll_results_title: '📊 Results: {title}',
    poll_results_default_desc: 'Real-time voting statistics',
    poll_field_total_voters: '👥 Total Voters',
    poll_field_total_weight: '⚖️ Total Weight',
    poll_field_quorum: '📌 Quorum',
    poll_no_votes: 'No votes',
    poll_panel_no_end_date: 'Not set',
    poll_panel_footer_default: 'ETHONE Polls • Ends: {date}',
    poll_btn_view_results: 'View Results',
    poll_btn_vote_web: 'Vote on the Web',
    poll_deleted: '❌ This poll no longer exists or has been deleted.',
    poll_live_results_title: '📊 Live Results — {title}',
    poll_no_votes_recorded: 'No votes recorded.',
    poll_live_results_footer: 'Total participants: {count} • ETHONE Polls 2.0',
    poll_vote_error: '❌ **Voting Error:** {error}',
    poll_vote_success_title: '✅ Vote Recorded Successfully!',
    poll_vote_success_desc: 'Your vote for **{label}** has been recorded.\n\n⚖️ **Vote weight:** {weight} point(s)\n🔒 **Privacy:** {visibility}\n\n*Thank you for taking part in server life!*',
    poll_visibility_public: 'Public',
    poll_visibility_anonymous: 'Anonymous',
    poll_no_winner: 'No winner',
    poll_announce_winner_template: '🏆 **Results for the poll "{pollTitle}"!**\nThe winning choice is **{winner}** with {votes} votes ({percent}%).',

    form_usage: '❌ Usage: `!form open <id>`, `!form panel <id>`, or `!form stats <id>`',
    form_not_found: '❌ Form with ID `{id}` not found.',
    form_web_portal_desc: 'This form is available on the ETHONE Web Portal:\n{url}',
    form_panel_published: '✅ Interactive panel for **{title}** was successfully published in {channel}.',
    form_stats_title: '📊 Statistics — {title}',
    form_field_total_responses: 'Total Responses',
    form_field_pending: 'Pending Review',
    form_field_approved: 'Approved',
    form_field_rejected: 'Rejected',
    form_field_avg_score: 'Average Score',
    form_field_status: 'Form Status',
    form_panel_default_desc: '📋 **Category:** {category}\n⏱️ **Estimated time:** ~3 minutes\n🔒 **Status:** Open',
    form_btn_apply_now: 'Apply Now',
    form_deleted: '❌ This form no longer exists or has been disabled.',
    form_closed: '⚠️ This form is currently closed to new responses.',
    form_btn_open_web: 'Open Web Form',
    form_web_required_desc: 'This form includes multiple steps and advanced options, please fill it out directly on the secure ETHONE interface:',
    form_generic_not_found: '❌ Form not found.',
    form_submit_error: '❌ **Submission Error:** {error}',
    form_submitted_title: '✅ Application Submitted Successfully',
    form_submitted_desc: 'Your response for **{title}** has been recorded.\n\n🆔 **Tracking number:** `#{id}`\n📊 **Initial status:** Awaiting staff review\n\n*You will receive a private notification as soon as a decision is made.*',
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
    access_denied_admin: '⛔ **Acceso Denegado**: Este comando de administración está reservado para administradores o roles autorizados.',
    access_denied_mod: '⛔ **Acceso Denegado**: No tienes los permisos necesarios para ejecutar este comando de moderación (Rol de Moderador/Staff requerido).',
    cooldown_wait: '⏳ **Anti-Spam**: Espera **{seconds}s** antes de volver a usar el comando `{command}`.',

    guild_only_command: '❌ Este comando solo se puede usar dentro de un servidor.',
    mod_module_disabled: '{emoji} El módulo de Moderación está desactivado en este servidor.',
    mod_member_not_found: '❌ Miembro no encontrado en este servidor.',
    mod_usage: '{emoji} Uso: `{usage}`',

    settings_footer: '{botName} • Usa el menú de abajo para modificar',
    settings_description: 'Personaliza el comportamiento, los colores y los comandos de **{botName}** en este servidor.',
    settings_admin_only_note: '*Solo los administradores o miembros con `Gestionar Servidor` pueden modificar estos ajustes.*',
    settings_field_appearance: '🎨 Apariencia y Colores',
    settings_label_display_name: 'Nombre mostrado',
    settings_label_theme_preset: 'Tema Predefinido',
    settings_label_primary_color: 'Color Principal',
    settings_label_secondary_color: 'Color Secundario',
    settings_label_success_error_color: 'Éxito / Error',
    settings_label_key_emojis: 'Emojis clave',
    settings_field_commands: '⌨️ Comandos y Anti-Spam',
    settings_label_text_prefix: 'Prefijo de texto',
    settings_label_prefix_commands: 'Comandos con Prefijo (`{prefix}`)',
    settings_label_slash_commands: 'Comandos Slash (`/`)',
    settings_label_cooldown: 'Cooldown Anti-Spam',
    settings_label_autodelete: 'Auto-eliminación de comandos',
    settings_field_language_audio: '🌐 Idioma y Audio',
    settings_label_language: 'Idioma',
    settings_label_default_volume: 'Volumen de Música por Defecto',
    settings_label_timezone: 'Zona horaria',
    settings_field_privacy: '🔒 Privacidad y Personalidad',
    settings_label_response_visibility: 'Visibilidad de las respuestas',
    settings_visibility_private: '🔒 **Privado (Efímero)** *(visible solo para el usuario)*',
    settings_visibility_public: '👁️ **Público** *(visible para todo el canal)*',
    settings_label_personality: 'Personalidad / Tono',
    settings_state_enabled: '🟢 **Activadas**',
    settings_state_disabled: '🔴 **Desactivadas**',
    settings_state_yes: '🟢 **Sí**',
    settings_state_no: '🔴 **No**',
    settings_select_placeholder: 'Selecciona una categoría para modificar...',
    settings_opt_language_label: 'Idioma del Bot (FR / EN / ES / DE)',
    settings_opt_language_desc: 'Cambiar el idioma del servidor (Français, English, Español, Deutsch)',
    settings_opt_theme_label: 'Tema Gráfico (Presets de Color)',
    settings_opt_theme_desc: 'Alternar entre Cyber Neon, Emerald, Crimson, Sunset, Amethyst o Por defecto',
    settings_opt_privacy_label: 'Privacidad de las Respuestas (Pública / Privada)',
    settings_opt_privacy_desc: 'Elegir si las respuestas a los comandos son visibles para todos o privadas',
    settings_opt_personality_label: 'Personalidad y Estilo del Bot',
    settings_opt_personality_desc: 'Cambiar el tono de respuesta: Amigable, Profesional, Divertido, Conciso, Cyber',
    settings_opt_audio_label: 'Opciones de Audio y Cooldown',
    settings_opt_audio_desc: 'Ajustar el volumen de música por defecto y el retraso anti-spam',
    settings_opt_colors_label: 'Personalizar Colores (HEX)',
    settings_opt_colors_desc: 'Configurar manualmente el color principal, secundario, de éxito y de error',
    settings_opt_name_label: 'Editar Nombre del Bot',
    settings_opt_name_desc: 'Cambiar el nombre mostrado en los embeds y mensajes',
    settings_opt_prefix_label: 'Editar el Prefijo',
    settings_opt_prefix_desc: 'Cambiar el prefijo de texto (ej: !, ?, $, >>)',
    settings_opt_emojis_label: 'Editar los Emojis',
    settings_opt_emojis_desc: 'Personalizar los emojis de éxito, error, carga...',
    settings_opt_autodelete_label: 'Auto-eliminación de Comandos',
    settings_opt_autodelete_desc: 'Activar o desactivar la eliminación automática de los comandos invocados',
    settings_btn_private_replies: 'Respuestas Privadas',
    settings_btn_public_replies: 'Respuestas Públicas',
    settings_btn_disable_prefix: 'Desactivar Prefijo',
    settings_btn_enable_prefix: 'Activar Prefijo',
    settings_btn_disable_slash: 'Desactivar Slash',
    settings_btn_enable_slash: 'Activar Slash',
    settings_btn_refresh: 'Actualizar',
    settings_btn_reset: 'Restablecer',
    settings_perm_denied: '❌ Necesitas el permiso `Gestionar Servidor` para acceder a estos ajustes.',
    settings_perm_denied_interact: '❌ Necesitas el permiso `Gestionar Servidor` para interactuar con estos botones.',
    settings_perm_denied_modify: '❌ Necesitas el permiso `Gestionar Servidor` para modificar estos ajustes.',
    settings_action_unauthorized: '❌ Acción no autorizada.',
    settings_updated_success: '{emoji} ¡Configuración actualizada correctamente!',
    settings_update_error: '❌ Se produjo un error al actualizar los ajustes.',
    settings_invalid_hex: '❌ El código de color HEX para **{name}** no es válido (`{val}`). Debe seguir el formato `#RRGGBB` (ej: #5865F2).',
    settings_invalid_name_length: '❌ El nombre debe tener entre 1 y 32 caracteres.',
    settings_invalid_prefix: '❌ El prefijo debe tener entre 1 y 5 caracteres y no contener espacios.',
    settings_modal_audio_title: '🎛️ Audio y Cooldown Anti-Spam',
    settings_modal_audio_volume_label: 'Volumen de música por defecto (10 - 100%)',
    settings_modal_audio_cooldown_label: 'Cooldown anti-spam por comando (0 - 15s)',
    settings_modal_colors_title: '🎨 Colores del Bot (Formato HEX)',
    settings_modal_colors_primary_label: 'Color Principal (ej: #5865F2)',
    settings_modal_colors_secondary_label: 'Color Secundario (ej: #4752C4)',
    settings_modal_colors_success_label: 'Color de Éxito (ej: #57F287)',
    settings_modal_colors_error_label: 'Color de Error (ej: #ED4245)',
    settings_modal_name_title: '📝 Nombre Mostrado del Bot',
    settings_modal_name_label: 'Nombre mostrado en mensajes / embeds',
    settings_modal_prefix_title: '⌨️ Prefijo de Comandos',
    settings_modal_prefix_label: 'Nuevo prefijo (ej: !, ?, $, >>)',
    settings_modal_emojis_title: '😀 Personalización de Emojis',
    settings_modal_emojis_success_label: 'Emoji de Éxito',
    settings_modal_emojis_error_label: 'Emoji de Error',
    settings_modal_emojis_info_label: 'Emoji de Info',
    settings_modal_general_title: '🌐 Idioma y Zona Horaria',
    settings_modal_general_lang_label: 'Idioma del bot (fr o en)',
    settings_modal_general_tz_label: 'Zona horaria (ej: Europe/Paris)',
    settings_color_name_primary: 'Principal',
    settings_color_name_secondary: 'Secundario',
    settings_color_name_success: 'Éxito',
    settings_color_name_error: 'Error',
    settings_btn_back: 'Volver',
    settings_personality_view_title: '🎭 Personalidad y Estilo del Bot',
    settings_personality_view_footer: '{botName} • Elige un estilo abajo',
    settings_personality_view_desc: 'El estilo elegido determina el tono de las respuestas (IA y mensajes) de **{botName}** en este servidor.\n\n**Actual: {emoji} {label}**\n*{desc}*',
    settings_personality_friendly_label: 'Amigable',
    settings_personality_friendly_desc: 'Tono cálido y cercano, como un amigo servicial.',
    settings_personality_professional_label: 'Profesional',
    settings_personality_professional_desc: 'Tono formal y preciso, orientado a la eficiencia.',
    settings_personality_humorous_label: 'Divertido',
    settings_personality_humorous_desc: 'Tono ligero y desenfadado, con toques de humor.',
    settings_personality_concise_label: 'Conciso',
    settings_personality_concise_desc: 'Respuestas cortas y directas, sin adornos.',
    settings_personality_cyber_label: 'Cyber',
    settings_personality_cyber_desc: 'Tono futurista y técnico, estética cyberpunk.',
    settings_theme_view_title: '🎨 Tema Gráfico del Bot',
    settings_theme_view_footer: '{botName} • Elige un tema abajo',
    settings_theme_view_desc: 'El tema determina los colores principal/secundario usados por defecto en los embeds.\n\n**Actual: {emoji} {label}**\n`{primary}` / `{secondary}`',
    settings_theme_default_label: 'Por defecto',
    settings_theme_cyberpunk_label: 'Cyber Neon',
    settings_theme_emerald_label: 'Esmeralda',
    settings_theme_sunset_label: 'Atardecer',
    settings_theme_dark_label: 'Oscuro',
    settings_privacy_view_title: '🔒 Privacidad de las Respuestas',
    settings_privacy_view_footer: '{botName} • Elige una visibilidad abajo',
    settings_privacy_view_desc: 'Determina si las respuestas a los comandos son visibles para todo el canal o solo para quien ejecuta el comando.\n\n**Actual: {state}**',
    settings_privacy_field_public_value: 'Visible para todo el canal.',
    settings_privacy_field_private_value: 'Visible solo para ti.',
    settings_privacy_public_label: 'Público',
    settings_privacy_private_label: 'Privado (Efímero)',
    settings_language_view_title: '🌐 Idioma del Bot',
    settings_language_view_footer: '{botName} • Elige un idioma abajo',
    settings_language_view_desc: 'Determina el idioma que {botName} usa en sus mensajes y embeds en este servidor.\n\n**Actual: {flag} {name}** (`{code}`)',

    warn_title: '⚠️ Advertencia • #{id}',
    warn_desc: 'El miembro {target} ha sido advertido correctamente.\n\n**Razón:** {reason}\n**Moderador:** {moderator}',
    warn_dm: '⚠️ Has recibido una advertencia en **{guild}** por el siguiente motivo: *{reason}*.',
    warn_escalation_field_name: '🚨 Sanción Automática Activada',
    warn_escalation_field_value: 'Umbral de advertencias alcanzado: se requiere una acción de escalado (`{action}`).',
    ban_title: '🔨 Baneo • #{id}',
    ban_desc: 'El usuario **{userTag}** ha sido baneado correctamente.\n\n**Razón:** {reason}\n**Moderador:** {moderator}',
    ban_dm: '🔨 Has sido baneado del servidor **{guild}**.\n**Razón:** {reason}',
    ban_fail: '❌ No se pudo banear a este usuario.',
    kick_title: '👢 Expulsión • #{id}',
    kick_desc: 'El miembro **{userTag}** ha sido expulsado correctamente.\n\n**Razón:** {reason}\n**Moderador:** {moderator}',
    kick_dm: '👢 Has sido expulsado del servidor **{guild}**.\n**Razón:** {reason}',
    kick_fail: '❌ Error al expulsar al miembro.',
    timeout_title: '🔇 Silencio Temporal • #{id}',
    timeout_desc: 'El miembro {target} ha sido silenciado durante **{duration}**.\n\n**Razón:** {reason}\n**Moderador:** {moderator}',
    timeout_invalid_duration: '❌ Duración inválida (máximo 28 días, ej: 10m, 2h, 1d).',
    timeout_fail: '❌ Error al aplicar el silencio temporal.',
    untimeout_title: '🔊 Silencio Retirado • #{id}',
    untimeout_desc: 'El silencio temporal del miembro {target} ha sido retirado correctamente.',
    untimeout_fail: '❌ Error al retirar el silencio temporal.',
    lock_title: '🔒 Canal Bloqueado',
    lock_desc: 'Este canal ha sido bloqueado por un moderador.\n**Razón:** {reason}',
    lock_default_reason: 'Canal bloqueado temporalmente',
    lock_fail: '❌ No se pudo bloquear el canal.',
    lock_no_channel: '❌ No se pudo bloquear este canal.',
    unlock_title: '🔓 Canal Desbloqueado',
    unlock_desc: 'Este canal vuelve a estar abierto a la conversación.',
    unlock_fail: '❌ No se pudo desbloquear el canal.',
    unlock_no_channel: '❌ No se pudo desbloquear este canal.',
    unban_title: '🔓 Desbaneo • #{id}',
    unban_desc: 'El usuario **{userTag}** ha sido desbaneado correctamente.',
    unban_invalid_id: '❌ Proporciona un ID de Discord válido (ej: `{example}`).',
    unban_not_banned: '❌ Este usuario no está baneado en este servidor.',
    unban_fail: '❌ Error al desbanear.',
    nickname_changed: '✅ El apodo de {target} ha sido cambiado a **{nick}**.',
    nickname_reset: '✅ El apodo de {target} ha sido restablecido.',
    nickname_fail: '❌ No se pudo cambiar el apodo de este miembro.',
    slowmode_unavailable: '❌ El modo lento no está disponible en este canal.',
    slowmode_invalid: '❌ Especifica un número de segundos entre 0 y 21600.',
    slowmode_disabled: '✅ El modo lento ha sido **desactivado** en este canal.',
    slowmode_set: '⏱️ Modo lento configurado a **{seconds} segundo(s)** por mensaje en este canal.',
    slowmode_fail: '❌ No se pudo modificar el modo lento.',
    warnings_empty_title: '🛡️ Historial • {target}',
    warnings_empty_desc: 'Este miembro no tiene advertencias ni sanciones registradas.',
    warnings_title: '🛡️ Historial Disciplinario • {target}',
    warnings_total: 'Total: **{count}** sanción(es) registrada(s)\n────────────────────',
    warnings_field_value: '**Razón:** {reason}\n**Por:** {moderator} • *{date}*',

    music_no_query: '❌ Especifica un título o enlace para reproducir.',
    music_play_failed: '❌ No se pudo reproducir esta música.',
    music_now_playing_title: '▶️ Reproduciendo Ahora',
    music_now_playing_desc: '**[{title}]({url})**\nArtista: {artist}\nDuración: {duration}',
    music_added_queue_title: '➕ Añadido a la Cola',
    music_added_queue_desc: '**[{title}]({url})**\nPosición en la cola: **#{position}**',
    music_paused: '⏸️ La reproducción está ahora en pausa.',
    music_pause_failed: '❌ No se pudo pausar.',
    music_resumed: '▶️ Reproducción reanudada.',
    music_resume_failed: '❌ No se pudo reanudar la reproducción.',
    music_skipped: '⏭️ Siguiente pista: **{title}**.',
    music_queue_end: 'Fin de la cola. Reproducción detenida.',
    music_skip_failed: '❌ No se pudo pasar a la siguiente.',
    music_previous: '⏮️ Volviendo a la pista: **{title}**.',
    music_no_previous: '❌ No hay música anterior en el historial.',
    music_stopped: '⏹️ Reproducción detenida y cola reiniciada.',
    music_stop_failed: '❌ No se pudo detener la reproducción.',
    music_current_volume: 'El volumen actual es **{volume}%**.',
    music_volume_set: '🔊 Volumen ajustado a **{volume}%**.',
    music_volume_failed: '❌ No se pudo modificar el volumen.',
    music_seek_invalid: '❌ Especifica un tiempo válido en segundos.',
    music_seek_set: '⏩ Posición movida a **{time}**.',
    music_seek_failed: '❌ No se pudo mover la posición.',
    music_shuffled: '🔀 ¡Cola mezclada aleatoriamente!',
    music_shuffle_failed: '❌ No se pudo mezclar la cola.',
    music_loop_set: '🔁 Modo de repetición establecido en: **{mode}**.',
    music_loop_invalid: '❌ Modo inválido.',
    music_remove_invalid: '❌ Especifica la posición de la pista a eliminar (ej: 1).',
    music_removed: '🗑️ Pista eliminada: **{title}**.',
    music_remove_invalid_position: '❌ Posición inválida en la cola.',
    music_queue_cleared: '🧹 La cola ha sido vaciada.',
    music_queue_clear_failed: '❌ No se pudo vaciar la cola.',
    music_panel_title: '🎵 ETHONE Music Player',
    music_panel_idle_desc: '**No hay música reproduciéndose actualmente.**\n\nUsa `/music play <título/enlace>` o el **Music Center ETHONE** para poner una canción.',
    music_panel_field_voice_channel: '🔊 Canal de Voz',
    music_panel_field_queue: '📜 Cola',
    music_panel_disconnected: 'Desconectado',
    music_panel_footer_idle: 'ETHONE Music Center 2.0 • Motor de Audio',
    music_panel_footer_active: 'ETHONE Music Center 2.0 • Controla la música en vivo',
    music_panel_field_requested_by: '👤 Solicitado por',
    music_panel_field_volume: '🔊 Volumen',
    music_panel_field_repeat: '🔁 Repetición',
    music_panel_field_shuffle: '🔀 Aleatorio',
    music_panel_field_voice: '📍 Canal de Voz',
    music_panel_active: 'Activo',
    music_panel_inactive: 'Desactivado',
    music_panel_muted: 'Silenciado',
    music_panel_unknown: 'Desconocido',

    ticket_module_disabled: '{emoji} El módulo **Tickets** está desactivado en este servidor. Actívalo desde el panel web.',
    ticket_already_open: '{emoji} Ya tienes un ticket abierto en {channel}.',
    ticket_channel_embed_title: '🎫 Ticket de Soporte • {user}',
    ticket_subject_label: '📌 **Motivo:** *{subject}*',
    ticket_detail_prompt: 'Por favor, detalla tu situación o pregunta a continuación.',
    ticket_create_failed: '{emoji} No se pudo crear el ticket (comprueba que el bot tenga permiso para gestionar canales).',
    ticket_category_not_found: '❌ Categoría no encontrada.',
    ticket_open_failed_default: 'No se pudo abrir el ticket.',
    ticket_btn_assigned_unclaim: 'Asignado a @{user} (Liberar)',
    ticket_btn_close: 'Cerrar',
    ticket_btn_priority: 'Prioridad',
    ticket_btn_transcript: 'Transcripción',
    ticket_btn_claim: 'Asumir ticket (Claim)',
    ticket_not_found: '❌ Ticket no encontrado.',
    ticket_priority_updated: '📌 **Prioridad actualizada:** `{old}` ➔ `{new}`',
    ticket_transcript_ready: '📄 **Aquí tienes la transcripción completa de este ticket:**',

    poll_list_empty: 'ℹ️ No hay sondeos configurados en este servidor. ¡Crea uno desde el panel ETHONE!',
    poll_list_title: '📊 Sondeos y Votaciones ETHONE',
    poll_list_item: '• **{title}** (`{id}`)\n  Estado: `{status}` | Tipo: `{type}` | Votos: **{count}**',
    poll_missing_id: '❌ Falta el ID del sondeo. Ejemplo: `!poll results <id>` o `!poll panel <id>`',
    poll_not_found: '❌ No se encontró ningún sondeo con el ID `{id}` en este servidor.',
    poll_invalid_channel: '❌ Canal de texto no válido.',
    poll_panel_published: '✅ El panel de votación de **{title}** se publicó correctamente en {channel}.',
    poll_end_error: '❌ Error: {error}',
    poll_ended_success: '🏁 El sondeo **{title}** se cerró correctamente. Los resultados finales se consolidaron y se activaron las automatizaciones.',
    poll_results_calc_failed: '❌ No se pudieron calcular los resultados.',
    poll_results_title: '📊 Resultados: {title}',
    poll_results_default_desc: 'Estadísticas de votación en tiempo real',
    poll_field_total_voters: '👥 Total de Votantes',
    poll_field_total_weight: '⚖️ Peso Total',
    poll_field_quorum: '📌 Quórum',
    poll_no_votes: 'Sin votos',
    poll_panel_no_end_date: 'No definida',
    poll_panel_footer_default: 'ETHONE Polls • Fin: {date}',
    poll_btn_view_results: 'Ver Resultados',
    poll_btn_vote_web: 'Votar en la Web',
    poll_deleted: '❌ Este sondeo ya no existe o ha sido eliminado.',
    poll_live_results_title: '📊 Resultados en Directo — {title}',
    poll_no_votes_recorded: 'No hay votos registrados.',
    poll_live_results_footer: 'Total de participantes: {count} • ETHONE Polls 2.0',
    poll_vote_error: '❌ **Error de voto:** {error}',
    poll_vote_success_title: '✅ ¡Voto Registrado con Éxito!',
    poll_vote_success_desc: 'Tu voto por **{label}** ha sido registrado correctamente.\n\n⚖️ **Peso del voto:** {weight} punto(s)\n🔒 **Privacidad:** {visibility}\n\n*¡Gracias por participar en la vida del servidor!*',
    poll_visibility_public: 'Público',
    poll_visibility_anonymous: 'Anónimo',
    poll_no_winner: 'Sin ganador',
    poll_announce_winner_template: '🏆 **¡Resultados del sondeo "{pollTitle}"!**\nLa opción ganadora es **{winner}** con {votes} votos ({percent}%).',

    form_usage: '❌ Uso: `!form open <id>`, `!form panel <id>`, o `!form stats <id>`',
    form_not_found: '❌ No se encontró ningún formulario con el ID `{id}`.',
    form_web_portal_desc: 'Este formulario está disponible en el portal web de ETHONE:\n{url}',
    form_panel_published: '✅ El panel interactivo de **{title}** se publicó correctamente en {channel}.',
    form_stats_title: '📊 Estadísticas — {title}',
    form_field_total_responses: 'Total de Respuestas',
    form_field_pending: 'Pendiente de revisión',
    form_field_approved: 'Aprobadas',
    form_field_rejected: 'Rechazadas',
    form_field_avg_score: 'Puntuación media',
    form_field_status: 'Estado del formulario',
    form_panel_default_desc: '📋 **Categoría:** {category}\n⏱️ **Tiempo estimado:** ~3 minutos\n🔒 **Estado:** Abierto',
    form_btn_apply_now: 'Postular ahora',
    form_deleted: '❌ Este formulario ya no existe o ha sido desactivado.',
    form_closed: '⚠️ Este formulario está actualmente cerrado a nuevas respuestas.',
    form_btn_open_web: 'Abrir Formulario Web',
    form_web_required_desc: 'Este formulario incluye varios pasos y opciones avanzadas; complétalo directamente en la interfaz segura de ETHONE:',
    form_generic_not_found: '❌ Formulario no encontrado.',
    form_submit_error: '❌ **Error de envío:** {error}',
    form_submitted_title: '✅ Solicitud Enviada con Éxito',
    form_submitted_desc: 'Tu respuesta para **{title}** ha sido registrada.\n\n🆔 **Número de seguimiento:** `#{id}`\n📊 **Estado inicial:** Pendiente de revisión por el staff\n\n*Recibirás una notificación privada en cuanto se tome una decisión.*',
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
    access_denied_admin: '⛔ **Zugriff verweigert**: Dieser Administrationsbefehl ist Administratoren oder autorisierten Rollen vorbehalten.',
    access_denied_mod: '⛔ **Zugriff verweigert**: Du besitzt nicht die erforderlichen Berechtigungen, um diesen Moderationsbefehl auszuführen (Moderator-/Staff-Rolle erforderlich).',
    cooldown_wait: '⏳ **Anti-Spam**: Bitte warte noch **{seconds}s**, bevor du den Befehl `{command}` erneut verwendest.',

    guild_only_command: '❌ Dieser Befehl kann nur auf einem Server verwendet werden.',
    mod_module_disabled: '{emoji} Das Moderations-Modul ist auf diesem Server deaktiviert.',
    mod_member_not_found: '❌ Mitglied auf diesem Server nicht gefunden.',
    mod_usage: '{emoji} Verwendung: `{usage}`',

    settings_footer: '{botName} • Nutze das Menü unten zum Anpassen',
    settings_description: 'Passe das Verhalten, die Farben und die Befehle von **{botName}** auf diesem Server an.',
    settings_admin_only_note: '*Nur Administratoren oder Mitglieder mit `Server verwalten` können diese Einstellungen ändern.*',
    settings_field_appearance: '🎨 Erscheinungsbild & Farben',
    settings_label_display_name: 'Anzeigename',
    settings_label_theme_preset: 'Voreingestelltes Theme',
    settings_label_primary_color: 'Primärfarbe',
    settings_label_secondary_color: 'Sekundärfarbe',
    settings_label_success_error_color: 'Erfolg / Fehler',
    settings_label_key_emojis: 'Wichtige Emojis',
    settings_field_commands: '⌨️ Befehle & Anti-Spam',
    settings_label_text_prefix: 'Text-Präfix',
    settings_label_prefix_commands: 'Präfix-Befehle (`{prefix}`)',
    settings_label_slash_commands: 'Slash-Befehle (`/`)',
    settings_label_cooldown: 'Anti-Spam-Cooldown',
    settings_label_autodelete: 'Befehle automatisch löschen',
    settings_field_language_audio: '🌐 Sprache & Audio',
    settings_label_language: 'Sprache',
    settings_label_default_volume: 'Standard-Musiklautstärke',
    settings_label_timezone: 'Zeitzone',
    settings_field_privacy: '🔒 Datenschutz & Persönlichkeit',
    settings_label_response_visibility: 'Sichtbarkeit der Antworten',
    settings_visibility_private: '🔒 **Privat (Ephemeral)** *(nur für den Nutzer sichtbar)*',
    settings_visibility_public: '👁️ **Öffentlich** *(für den gesamten Kanal sichtbar)*',
    settings_label_personality: 'Persönlichkeit / Ton',
    settings_state_enabled: '🟢 **Aktiviert**',
    settings_state_disabled: '🔴 **Deaktiviert**',
    settings_state_yes: '🟢 **Ja**',
    settings_state_no: '🔴 **Nein**',
    settings_select_placeholder: 'Wähle eine Kategorie zum Bearbeiten...',
    settings_opt_language_label: 'Bot-Sprache (FR / EN / ES / DE)',
    settings_opt_language_desc: 'Serversprache ändern (Français, English, Español, Deutsch)',
    settings_opt_theme_label: 'Grafisches Theme (Farbvorgaben)',
    settings_opt_theme_desc: 'Wechsle zwischen Cyber Neon, Emerald, Crimson, Sunset, Amethyst oder Standard',
    settings_opt_privacy_label: 'Antwort-Datenschutz (Öffentlich / Privat)',
    settings_opt_privacy_desc: 'Wähle, ob Befehlsantworten für alle sichtbar oder privat sind',
    settings_opt_personality_label: 'Bot-Persönlichkeit & Stil',
    settings_opt_personality_desc: 'Ändere den Antwortton: Freundlich, Professionell, Lustig, Kurz und bündig, Cyber',
    settings_opt_audio_label: 'Audio- & Cooldown-Optionen',
    settings_opt_audio_desc: 'Passe die Standard-Musiklautstärke und die Anti-Spam-Verzögerung an',
    settings_opt_colors_label: 'Farben anpassen (HEX)',
    settings_opt_colors_desc: 'Primär-, Sekundär-, Erfolgs- und Fehlerfarbe manuell festlegen',
    settings_opt_name_label: 'Bot-Namen bearbeiten',
    settings_opt_name_desc: 'Den in Embeds und Nachrichten angezeigten Namen ändern',
    settings_opt_prefix_label: 'Präfix bearbeiten',
    settings_opt_prefix_desc: 'Das Text-Präfix ändern (z. B. !, ?, $, >>)',
    settings_opt_emojis_label: 'Emojis bearbeiten',
    settings_opt_emojis_desc: 'Die Emojis für Erfolg, Fehler, Laden anpassen...',
    settings_opt_autodelete_label: 'Befehle automatisch löschen',
    settings_opt_autodelete_desc: 'Automatisches Löschen aufgerufener Befehle aktivieren oder deaktivieren',
    settings_btn_private_replies: 'Private Antworten',
    settings_btn_public_replies: 'Öffentliche Antworten',
    settings_btn_disable_prefix: 'Präfix deaktivieren',
    settings_btn_enable_prefix: 'Präfix aktivieren',
    settings_btn_disable_slash: 'Slash deaktivieren',
    settings_btn_enable_slash: 'Slash aktivieren',
    settings_btn_refresh: 'Aktualisieren',
    settings_btn_reset: 'Zurücksetzen',
    settings_perm_denied: '❌ Du benötigst die Berechtigung `Server verwalten`, um auf diese Einstellungen zuzugreifen.',
    settings_perm_denied_interact: '❌ Du benötigst die Berechtigung `Server verwalten`, um mit diesen Schaltflächen zu interagieren.',
    settings_perm_denied_modify: '❌ Du benötigst die Berechtigung `Server verwalten`, um diese Einstellungen zu ändern.',
    settings_action_unauthorized: '❌ Nicht autorisierte Aktion.',
    settings_updated_success: '{emoji} Konfiguration erfolgreich aktualisiert!',
    settings_update_error: '❌ Beim Aktualisieren der Einstellungen ist ein Fehler aufgetreten.',
    settings_invalid_hex: '❌ Der HEX-Farbcode für **{name}** ist ungültig (`{val}`). Er muss dem Format `#RRGGBB` entsprechen (z. B. #5865F2).',
    settings_invalid_name_length: '❌ Der Name muss zwischen 1 und 32 Zeichen lang sein.',
    settings_invalid_prefix: '❌ Das Präfix muss zwischen 1 und 5 Zeichen lang sein und darf keine Leerzeichen enthalten.',
    settings_modal_audio_title: '🎛️ Audio & Anti-Spam-Cooldown',
    settings_modal_audio_volume_label: 'Standard-Musiklautstärke (10 - 100 %)',
    settings_modal_audio_cooldown_label: 'Anti-Spam-Cooldown pro Befehl (0 - 15 s)',
    settings_modal_colors_title: '🎨 Bot-Farben (HEX-Format)',
    settings_modal_colors_primary_label: 'Primärfarbe (z. B. #5865F2)',
    settings_modal_colors_secondary_label: 'Sekundärfarbe (z. B. #4752C4)',
    settings_modal_colors_success_label: 'Erfolgsfarbe (z. B. #57F287)',
    settings_modal_colors_error_label: 'Fehlerfarbe (z. B. #ED4245)',
    settings_modal_name_title: '📝 Angezeigter Bot-Name',
    settings_modal_name_label: 'Name in Nachrichten / Embeds',
    settings_modal_prefix_title: '⌨️ Befehlspräfix',
    settings_modal_prefix_label: 'Neues Präfix (z. B. !, ?, $, >>)',
    settings_modal_emojis_title: '😀 Emoji-Anpassung',
    settings_modal_emojis_success_label: 'Erfolgs-Emoji',
    settings_modal_emojis_error_label: 'Fehler-Emoji',
    settings_modal_emojis_info_label: 'Info-Emoji',
    settings_modal_general_title: '🌐 Sprache & Zeitzone',
    settings_modal_general_lang_label: 'Bot-Sprache (fr oder en)',
    settings_modal_general_tz_label: 'Zeitzone (z. B. Europe/Paris)',
    settings_color_name_primary: 'Primär',
    settings_color_name_secondary: 'Sekundär',
    settings_color_name_success: 'Erfolg',
    settings_color_name_error: 'Fehler',
    settings_btn_back: 'Zurück',
    settings_personality_view_title: '🎭 Bot-Persönlichkeit & Stil',
    settings_personality_view_footer: '{botName} • Wähle unten einen Stil',
    settings_personality_view_desc: 'Der gewählte Stil bestimmt den Ton der Antworten (KI und Nachrichten) von **{botName}** auf diesem Server.\n\n**Aktuell: {emoji} {label}**\n*{desc}*',
    settings_personality_friendly_label: 'Freundlich',
    settings_personality_friendly_desc: 'Warmer, zugänglicher Ton, wie ein hilfsbereiter Freund.',
    settings_personality_professional_label: 'Professionell',
    settings_personality_professional_desc: 'Formeller, präziser Ton mit Fokus auf Effizienz.',
    settings_personality_humorous_label: 'Lustig',
    settings_personality_humorous_desc: 'Lockerer, fröhlicher Ton mit einer Prise Humor.',
    settings_personality_concise_label: 'Kurz und bündig',
    settings_personality_concise_desc: 'Kurze, direkte Antworten ohne Schnickschnack.',
    settings_personality_cyber_label: 'Cyber',
    settings_personality_cyber_desc: 'Futuristischer, technischer Ton im Cyberpunk-Stil.',
    settings_theme_view_title: '🎨 Grafisches Bot-Theme',
    settings_theme_view_footer: '{botName} • Wähle unten ein Theme',
    settings_theme_view_desc: 'Das Theme legt die standardmäßig in Embeds verwendeten Primär-/Sekundärfarben fest.\n\n**Aktuell: {emoji} {label}**\n`{primary}` / `{secondary}`',
    settings_theme_default_label: 'Standard',
    settings_theme_cyberpunk_label: 'Cyber Neon',
    settings_theme_emerald_label: 'Smaragd',
    settings_theme_sunset_label: 'Sonnenuntergang',
    settings_theme_dark_label: 'Dunkel',
    settings_privacy_view_title: '🔒 Datenschutz der Antworten',
    settings_privacy_view_footer: '{botName} • Wähle unten eine Sichtbarkeit',
    settings_privacy_view_desc: 'Legt fest, ob Befehlsantworten für den gesamten Kanal sichtbar sind oder nur für die Person, die den Befehl ausführt.\n\n**Aktuell: {state}**',
    settings_privacy_field_public_value: 'Für den gesamten Kanal sichtbar.',
    settings_privacy_field_private_value: 'Nur für dich sichtbar.',
    settings_privacy_public_label: 'Öffentlich',
    settings_privacy_private_label: 'Privat (Ephemeral)',
    settings_language_view_title: '🌐 Bot-Sprache',
    settings_language_view_footer: '{botName} • Wähle unten eine Sprache',
    settings_language_view_desc: 'Legt fest, welche Sprache {botName} in seinen Nachrichten und Embeds auf diesem Server verwendet.\n\n**Aktuell: {flag} {name}** (`{code}`)',

    warn_title: '⚠️ Verwarnung • #{id}',
    warn_desc: 'Mitglied {target} wurde erfolgreich verwarnt.\n\n**Grund:** {reason}\n**Moderator:** {moderator}',
    warn_dm: '⚠️ Du hast auf **{guild}** eine Verwarnung erhalten, Grund: *{reason}*.',
    warn_escalation_field_name: '🚨 Automatische Sanktion Ausgelöst',
    warn_escalation_field_value: 'Verwarnungsschwelle erreicht: eine Eskalationsmaßnahme ist erforderlich (`{action}`).',
    ban_title: '🔨 Bann • #{id}',
    ban_desc: 'Nutzer **{userTag}** wurde erfolgreich gebannt.\n\n**Grund:** {reason}\n**Moderator:** {moderator}',
    ban_dm: '🔨 Du wurdest vom Server **{guild}** gebannt.\n**Grund:** {reason}',
    ban_fail: '❌ Dieser Nutzer konnte nicht gebannt werden.',
    kick_title: '👢 Kick • #{id}',
    kick_desc: 'Mitglied **{userTag}** wurde erfolgreich gekickt.\n\n**Grund:** {reason}\n**Moderator:** {moderator}',
    kick_dm: '👢 Du wurdest vom Server **{guild}** gekickt.\n**Grund:** {reason}',
    kick_fail: '❌ Kick fehlgeschlagen.',
    timeout_title: '🔇 Auszeit • #{id}',
    timeout_desc: 'Mitglied {target} wurde für **{duration}** stummgeschaltet.\n\n**Grund:** {reason}\n**Moderator:** {moderator}',
    timeout_invalid_duration: '❌ Ungültige Dauer (maximal 28 Tage, z. B. 10m, 2h, 1d).',
    timeout_fail: '❌ Auszeit fehlgeschlagen.',
    untimeout_title: '🔊 Auszeit Aufgehoben • #{id}',
    untimeout_desc: 'Die Auszeit von Mitglied {target} wurde erfolgreich aufgehoben.',
    untimeout_fail: '❌ Aufheben der Auszeit fehlgeschlagen.',
    lock_title: '🔒 Kanal Gesperrt',
    lock_desc: 'Dieser Kanal wurde von einem Moderator gesperrt.\n**Grund:** {reason}',
    lock_default_reason: 'Kanal vorübergehend gesperrt',
    lock_fail: '❌ Der Kanal konnte nicht gesperrt werden.',
    lock_no_channel: '❌ Dieser Kanal kann nicht gesperrt werden.',
    unlock_title: '🔓 Kanal Entsperrt',
    unlock_desc: 'Dieser Kanal ist wieder für Nachrichten geöffnet.',
    unlock_fail: '❌ Der Kanal konnte nicht entsperrt werden.',
    unlock_no_channel: '❌ Dieser Kanal kann nicht entsperrt werden.',
    unban_title: '🔓 Entbannung • #{id}',
    unban_desc: 'Nutzer **{userTag}** wurde erfolgreich entbannt.',
    unban_invalid_id: '❌ Bitte gib eine gültige Discord-ID an (z. B. `{example}`).',
    unban_not_banned: '❌ Dieser Nutzer ist auf diesem Server nicht gebannt.',
    unban_fail: '❌ Entbannung fehlgeschlagen.',
    nickname_changed: '✅ Der Spitzname von {target} wurde zu **{nick}** geändert.',
    nickname_reset: '✅ Der Spitzname von {target} wurde zurückgesetzt.',
    nickname_fail: '❌ Der Spitzname dieses Mitglieds konnte nicht geändert werden.',
    slowmode_unavailable: '❌ Der Slowmode ist in diesem Kanal nicht verfügbar.',
    slowmode_invalid: '❌ Bitte gib eine Sekundenzahl zwischen 0 und 21600 an.',
    slowmode_disabled: '✅ Der Slowmode wurde in diesem Kanal **deaktiviert**.',
    slowmode_set: '⏱️ Slowmode auf **{seconds} Sekunde(n)** pro Nachricht in diesem Kanal eingestellt.',
    slowmode_fail: '❌ Der Slowmode konnte nicht geändert werden.',
    warnings_empty_title: '🛡️ Verlauf • {target}',
    warnings_empty_desc: 'Dieses Mitglied hat keine erfassten Verwarnungen oder Sanktionen.',
    warnings_title: '🛡️ Disziplinarverlauf • {target}',
    warnings_total: 'Gesamt: **{count}** erfasste Sanktion(en)\n────────────────────',
    warnings_field_value: '**Grund:** {reason}\n**Von:** {moderator} • *{date}*',

    music_no_query: '❌ Bitte gib einen Titel oder Link zum Abspielen an.',
    music_play_failed: '❌ Dieser Titel konnte nicht abgespielt werden.',
    music_now_playing_title: '▶️ Läuft Gerade',
    music_now_playing_desc: '**[{title}]({url})**\nKünstler: {artist}\nDauer: {duration}',
    music_added_queue_title: '➕ Zur Warteschlange Hinzugefügt',
    music_added_queue_desc: '**[{title}]({url})**\nPosition in der Warteschlange: **#{position}**',
    music_paused: '⏸️ Die Wiedergabe ist jetzt pausiert.',
    music_pause_failed: '❌ Pausieren nicht möglich.',
    music_resumed: '▶️ Wiedergabe fortgesetzt.',
    music_resume_failed: '❌ Wiedergabe konnte nicht fortgesetzt werden.',
    music_skipped: '⏭️ Nächster Titel: **{title}**.',
    music_queue_end: 'Ende der Warteschlange. Wiedergabe gestoppt.',
    music_skip_failed: '❌ Zum nächsten Titel springen nicht möglich.',
    music_previous: '⏮️ Zurück zu Titel: **{title}**.',
    music_no_previous: '❌ Kein vorheriger Titel im Verlauf.',
    music_stopped: '⏹️ Wiedergabe gestoppt und Warteschlange geleert.',
    music_stop_failed: '❌ Wiedergabe konnte nicht gestoppt werden.',
    music_current_volume: 'Die aktuelle Lautstärke beträgt **{volume}%**.',
    music_volume_set: '🔊 Lautstärke auf **{volume}%** eingestellt.',
    music_volume_failed: '❌ Lautstärke konnte nicht geändert werden.',
    music_seek_invalid: '❌ Bitte gib eine gültige Zeit in Sekunden an.',
    music_seek_set: '⏩ Position zu **{time}** verschoben.',
    music_seek_failed: '❌ Position konnte nicht verschoben werden.',
    music_shuffled: '🔀 Warteschlange zufällig gemischt!',
    music_shuffle_failed: '❌ Warteschlange konnte nicht gemischt werden.',
    music_loop_set: '🔁 Wiederholungsmodus eingestellt auf: **{mode}**.',
    music_loop_invalid: '❌ Ungültiger Modus.',
    music_remove_invalid: '❌ Bitte gib die Position des zu entfernenden Titels an (z. B. 1).',
    music_removed: '🗑️ Titel entfernt: **{title}**.',
    music_remove_invalid_position: '❌ Ungültige Position in der Warteschlange.',
    music_queue_cleared: '🧹 Die Warteschlange wurde geleert.',
    music_queue_clear_failed: '❌ Warteschlange konnte nicht geleert werden.',
    music_panel_title: '🎵 ETHONE Music Player',
    music_panel_idle_desc: '**Aktuell läuft keine Musik.**\n\nNutze `/music play <Titel/Link>` oder das **ETHONE Music Center**, um einen Titel zu starten.',
    music_panel_field_voice_channel: '🔊 Sprachkanal',
    music_panel_field_queue: '📜 Warteschlange',
    music_panel_disconnected: 'Getrennt',
    music_panel_footer_idle: 'ETHONE Music Center 2.0 • Audio-Engine',
    music_panel_footer_active: 'ETHONE Music Center 2.0 • Steuere die Musik live',
    music_panel_field_requested_by: '👤 Angefragt von',
    music_panel_field_volume: '🔊 Lautstärke',
    music_panel_field_repeat: '🔁 Wiederholung',
    music_panel_field_shuffle: '🔀 Zufallswiedergabe',
    music_panel_field_voice: '📍 Sprachkanal',
    music_panel_active: 'Aktiv',
    music_panel_inactive: 'Deaktiviert',
    music_panel_muted: 'Stumm',
    music_panel_unknown: 'Unbekannt',

    ticket_module_disabled: '{emoji} Das Modul **Tickets** ist auf diesem Server deaktiviert. Aktiviere es über das Web-Dashboard.',
    ticket_already_open: '{emoji} Du hast bereits ein offenes Ticket in {channel}.',
    ticket_channel_embed_title: '🎫 Support-Ticket • {user}',
    ticket_subject_label: '📌 **Grund:** *{subject}*',
    ticket_detail_prompt: 'Bitte schildere dein Anliegen oder deine Frage unten im Detail.',
    ticket_create_failed: '{emoji} Ticket konnte nicht erstellt werden (stelle sicher, dass der Bot die Berechtigung zur Kanalverwaltung hat).',
    ticket_category_not_found: '❌ Kategorie nicht gefunden.',
    ticket_open_failed_default: 'Ticket konnte nicht geöffnet werden.',
    ticket_btn_assigned_unclaim: 'Zugewiesen an @{user} (Freigeben)',
    ticket_btn_close: 'Schließen',
    ticket_btn_priority: 'Priorität',
    ticket_btn_transcript: 'Transkript',
    ticket_btn_claim: 'Übernehmen (Claim)',
    ticket_not_found: '❌ Ticket nicht gefunden.',
    ticket_priority_updated: '📌 **Priorität aktualisiert:** `{old}` ➔ `{new}`',
    ticket_transcript_ready: '📄 **Hier ist das vollständige Transkript dieses Tickets:**',

    poll_list_empty: 'ℹ️ Keine Umfragen auf diesem Server konfiguriert. Erstelle eine über das ETHONE-Dashboard!',
    poll_list_title: '📊 ETHONE Umfragen & Abstimmungen',
    poll_list_item: '• **{title}** (`{id}`)\n  Status: `{status}` | Typ: `{type}` | Stimmen: **{count}**',
    poll_missing_id: '❌ Umfrage-ID fehlt. Beispiel: `!poll results <id>` oder `!poll panel <id>`',
    poll_not_found: '❌ Umfrage mit der ID `{id}` wurde auf diesem Server nicht gefunden.',
    poll_invalid_channel: '❌ Ungültiger Textkanal.',
    poll_panel_published: '✅ Das Abstimmungs-Panel für **{title}** wurde erfolgreich in {channel} veröffentlicht.',
    poll_end_error: '❌ Fehler: {error}',
    poll_ended_success: '🏁 Die Umfrage **{title}** wurde erfolgreich beendet. Die Endergebnisse wurden zusammengefasst und die Automatisierungen ausgelöst.',
    poll_results_calc_failed: '❌ Die Ergebnisse konnten nicht berechnet werden.',
    poll_results_title: '📊 Ergebnisse: {title}',
    poll_results_default_desc: 'Live-Abstimmungsstatistiken',
    poll_field_total_voters: '👥 Gesamtzahl Wähler',
    poll_field_total_weight: '⚖️ Gesamtgewicht',
    poll_field_quorum: '📌 Quorum',
    poll_no_votes: 'Keine Stimmen',
    poll_panel_no_end_date: 'Nicht festgelegt',
    poll_panel_footer_default: 'ETHONE Polls • Ende: {date}',
    poll_btn_view_results: 'Ergebnisse ansehen',
    poll_btn_vote_web: 'Im Web abstimmen',
    poll_deleted: '❌ Diese Umfrage existiert nicht mehr oder wurde gelöscht.',
    poll_live_results_title: '📊 Live-Ergebnisse — {title}',
    poll_no_votes_recorded: 'Keine Stimmen erfasst.',
    poll_live_results_footer: 'Teilnehmer gesamt: {count} • ETHONE Polls 2.0',
    poll_vote_error: '❌ **Abstimmungsfehler:** {error}',
    poll_vote_success_title: '✅ Stimme erfolgreich erfasst!',
    poll_vote_success_desc: 'Deine Stimme für **{label}** wurde erfolgreich gezählt.\n\n⚖️ **Stimmgewicht:** {weight} Punkt(e)\n🔒 **Privatsphäre:** {visibility}\n\n*Danke für deine Teilnahme am Serverleben!*',
    poll_visibility_public: 'Öffentlich',
    poll_visibility_anonymous: 'Anonym',
    poll_no_winner: 'Kein Gewinner',
    poll_announce_winner_template: '🏆 **Ergebnisse der Umfrage "{pollTitle}"!**\nDie Gewinner-Option ist **{winner}** mit {votes} Stimmen ({percent}%).',

    form_usage: '❌ Verwendung: `!form open <id>`, `!form panel <id>` oder `!form stats <id>`',
    form_not_found: '❌ Formular mit der ID `{id}` wurde nicht gefunden.',
    form_web_portal_desc: 'Dieses Formular ist im ETHONE-Webportal verfügbar:\n{url}',
    form_panel_published: '✅ Das interaktive Panel für **{title}** wurde erfolgreich in {channel} veröffentlicht.',
    form_stats_title: '📊 Statistiken — {title}',
    form_field_total_responses: 'Antworten gesamt',
    form_field_pending: 'Ausstehende Prüfung',
    form_field_approved: 'Genehmigt',
    form_field_rejected: 'Abgelehnt',
    form_field_avg_score: 'Durchschnittliche Punktzahl',
    form_field_status: 'Formularstatus',
    form_panel_default_desc: '📋 **Kategorie:** {category}\n⏱️ **Geschätzte Zeit:** ~3 Minuten\n🔒 **Status:** Offen',
    form_btn_apply_now: 'Jetzt bewerben',
    form_deleted: '❌ Dieses Formular existiert nicht mehr oder wurde deaktiviert.',
    form_closed: '⚠️ Dieses Formular ist derzeit für neue Antworten geschlossen.',
    form_btn_open_web: 'Web-Formular öffnen',
    form_web_required_desc: 'Dieses Formular umfasst mehrere Schritte und erweiterte Optionen — bitte fülle es direkt in der sicheren ETHONE-Oberfläche aus:',
    form_generic_not_found: '❌ Formular nicht gefunden.',
    form_submit_error: '❌ **Übermittlungsfehler:** {error}',
    form_submitted_title: '✅ Bewerbung erfolgreich eingereicht',
    form_submitted_desc: 'Deine Antwort für **{title}** wurde gespeichert.\n\n🆔 **Vorgangsnummer:** `#{id}`\n📊 **Anfangsstatus:** Wird vom Team geprüft\n\n*Du erhältst eine private Benachrichtigung, sobald eine Entscheidung getroffen wurde.*',
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
