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

  // Moderation log channel embeds (ModLogger)
  modlog_type_default: string;
  modlog_type_warn: string;
  modlog_type_timeout: string;
  modlog_type_untimeout: string;
  modlog_type_kick: string;
  modlog_type_ban: string;
  modlog_type_unban: string;
  modlog_field_member: string;
  modlog_field_moderator: string;
  modlog_field_reason: string;
  modlog_reason_none: string;
  modlog_field_duration: string;
  modlog_duration_value: string;
  modlog_footer: string;
  modlog_automod_title: string;
  modlog_automod_field_member: string;
  modlog_automod_field_action: string;
  modlog_automod_field_excerpt: string;
  modlog_automod_footer: string;
  sanction_dm_footer: string;
  sanction_dm_warn_title: string;
  sanction_dm_warn_desc: string;
  sanction_dm_kick_title: string;
  sanction_dm_kick_desc: string;
  sanction_dm_ban_title: string;
  sanction_dm_ban_desc: string;

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
  music_panel_queue_value: string;
  music_panel_label_artist: string;
  music_panel_label_source: string;

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

  // Automod
  automod_status_title: string;
  automod_status_field_protection: string;
  automod_status_active: string;
  automod_status_inactive: string;
  automod_status_field_smartmode: string;
  automod_smartmode_on: string;
  automod_smartmode_standard: string;
  automod_status_field_risk: string;
  automod_status_field_rules: string;
  automod_status_rules_value: string;
  automod_status_field_detectors: string;
  automod_detector_spam: string;
  automod_detector_flood: string;
  automod_detector_links: string;
  automod_detector_invites: string;
  automod_detector_mentions: string;
  automod_detector_ghostping: string;
  automod_detector_caps: string;
  automod_detector_keywords: string;
  automod_detector_regex: string;
  automod_detector_profiles: string;
  automod_status_field_strikes: string;
  automod_status_strikes_value: string;
  automod_status_disabled_notice: string;
  automod_status_footer: string;
  automod_alert_title: string;
  automod_alert_field_user: string;
  automod_alert_field_channel: string;
  automod_alert_field_risk: string;
  automod_alert_field_actions: string;
  automod_alert_field_strikes: string;
  automod_alert_field_preview: string;
  automod_alert_action_none: string;
  automod_alert_footer: string;
  automod_test_missing_message: string;
  automod_test_title: string;
  automod_test_field_message: string;
  automod_test_field_score: string;
  automod_test_score_value: string;
  automod_test_field_actions: string;
  automod_test_no_action: string;
  automod_test_field_strikes_added: string;
  automod_test_field_detectors_triggered: string;
  automod_test_detectors_none: string;
  automod_test_rules_none: string;
  automod_test_footer: string;
  automod_smartmode_toggle_on: string;
  automod_smartmode_toggle_off: string;
  automod_toggle_label_all: string;
  automod_toggle_label_spam: string;
  automod_toggle_label_flood: string;
  automod_toggle_label_links: string;
  automod_toggle_label_invites: string;
  automod_toggle_label_mentions: string;
  automod_toggle_label_ghostping: string;
  automod_toggle_label_caps: string;
  automod_toggle_label_keywords: string;
  automod_toggle_label_regex: string;
  automod_toggle_label_profiles: string;
  automod_toggle_label_strikes: string;
  automod_toggle_unknown_module: string;
  automod_toggle_state_on: string;
  automod_toggle_state_off: string;
  automod_toggle_success: string;
  automod_toggle_disabled_note: string;
  automod_usage_fallback: string;

  // Events
  events_list_empty_title: string;
  events_list_empty_desc: string;
  events_list_title: string;
  events_list_desc: string;
  events_list_field_value: string;
  events_participants_suffix: string;
  events_missing_id: string;
  events_not_found: string;
  events_rsvp_usage: string;
  events_generic_error_prefix: string;
  events_rsvp_error_fallback: string;
  events_rsvp_success_title: string;
  events_rsvp_success_desc: string;
  events_checkin_usage: string;
  events_checkin_success_title: string;
  events_checkin_success_desc: string;
  events_post_permission_denied: string;
  events_channel_not_found: string;
  events_post_success: string;
  events_unknown_subcommand: string;
  events_rsvp_status_going: string;
  events_rsvp_status_maybe: string;
  events_rsvp_status_notgoing: string;
  events_rsvp_status_waitlist: string;
  events_rsvp_button_success: string;
  events_checkin_button_success: string;
  events_status_scheduled: string;
  events_status_live: string;
  events_status_completed: string;
  events_status_cancelled: string;
  events_location_unspecified: string;
  events_location_voice_default: string;
  events_location_stage_default: string;
  events_location_text_default: string;
  events_location_external_default: string;
  events_capacity_full_suffix: string;
  events_panel_field_datetime: string;
  events_panel_field_location: string;
  events_panel_field_status: string;
  events_panel_datetime_value: string;
  events_panel_status_value: string;
  events_panel_waitlist_line: string;
  events_panel_footer: string;
  events_panel_no_description: string;
  events_btn_waitlist_label: string;
  events_btn_going_label: string;
  events_btn_maybe_label: string;
  events_btn_not_going_label: string;
  events_btn_checkin_label: string;
  events_btn_details_label: string;

  // Giveaways
  giveaway_slash_only: string;
  giveaway_invalid_channel: string;
  giveaway_start_success: string;
  giveaway_not_found: string;
  giveaway_end_success: string;
  giveaway_no_eligible_participant: string;
  giveaway_reroll_success: string;
  giveaway_no_other_participant: string;
  giveaway_cancel_success: string;
  giveaway_list_empty: string;
  giveaway_list_title: string;
  giveaway_list_item: string;
  giveaway_list_footer: string;
  giveaway_claim_not_eligible: string;
  giveaway_claim_not_winner: string;
  giveaway_claim_already_done: string;
  giveaway_claim_success: string;
  giveaway_default_description: string;
  giveaway_embed_ended_title: string;
  giveaway_embed_ended_desc: string;
  giveaway_embed_cancelled_title: string;
  giveaway_embed_cancelled_desc: string;
  giveaway_embed_active_title: string;
  giveaway_embed_active_desc: string;
  giveaway_req_roles_required: string;
  giveaway_req_roles_excluded: string;
  giveaway_req_min_age: string;
  giveaway_req_min_level: string;
  giveaway_req_prefix: string;
  giveaway_btn_enter: string;
  giveaway_btn_claim: string;
  giveaway_elig_excluded_role: string;
  giveaway_elig_missing_all_roles: string;
  giveaway_elig_missing_any_role: string;
  giveaway_elig_min_age: string;
  giveaway_elig_min_level: string;
  giveaway_not_active: string;
  giveaway_left: string;
  giveaway_participation_denied: string;
  giveaway_join_success: string;
  giveaway_announce_winners: string;
  giveaway_announce_no_winner: string;
  giveaway_dm_winner: string;

  // Suggestions
  suggest_slash_only: string;
  suggest_module_disabled: string;
  suggest_no_channel_configured: string;
  suggest_published_success: string;
  suggest_generic_error: string;
  suggest_modal_title: string;
  suggest_modal_title_label: string;
  suggest_modal_title_placeholder: string;
  suggest_modal_desc_label: string;
  suggest_modal_desc_placeholder: string;
  suggest_modal_category_label: string;
  suggest_modal_category_placeholder: string;
  suggest_not_found: string;
  suggest_upvote_removed: string;
  suggest_upvote_added: string;
  suggest_downvote_removed: string;
  suggest_downvote_added: string;
  suggest_follow_on: string;
  suggest_follow_off: string;
  suggest_comment_modal_title: string;
  suggest_comment_input_label: string;
  suggest_comment_input_placeholder: string;
  suggest_comment_added: string;
  suggest_submitted_success: string;
  suggest_default_category: string;
  suggest_status_pending: string;
  suggest_status_under_review: string;
  suggest_status_planned: string;
  suggest_status_accepted: string;
  suggest_status_in_progress: string;
  suggest_status_completed: string;
  suggest_status_rejected: string;
  suggest_status_duplicate: string;
  suggest_status_on_hold: string;
  suggest_embed_author: string;
  suggest_field_status: string;
  suggest_field_category: string;
  suggest_field_score: string;
  suggest_score_value: string;
  suggest_staff_response_field: string;
  suggest_default_moderator: string;
  suggest_duplicate_field_value: string;
  suggest_embed_footer: string;
  suggest_btn_comment: string;
  suggest_btn_follow: string;
  suggest_no_channel_error: string;
  suggest_thread_name: string;
  suggest_dm_update: string;
  suggest_dm_response_line: string;

  // Leveling
  leveling_module_disabled: string;
  leveling_rank_author: string;
  leveling_field_rank: string;
  leveling_field_level: string;
  leveling_field_messages: string;
  leveling_field_progress: string;
  leveling_progress_value: string;
  leveling_rank_footer: string;
  leveling_leaderboard_empty: string;
  leveling_leaderboard_title: string;
  leveling_leaderboard_line: string;
  leveling_leaderboard_footer: string;
  leveling_levelup_title: string;
  leveling_levelup_roles_unlocked: string;
  leveling_xp_add_success: string;
  leveling_xp_remove_success: string;
  leveling_xp_set_success: string;
  leveling_xp_reset_success: string;

  // Anti-Raid
  antiraid_status_title: string;
  antiraid_field_risk_score: string;
  antiraid_field_raidmode: string;
  antiraid_raidmode_active: string;
  antiraid_raidmode_normal: string;
  antiraid_field_lockdown: string;
  antiraid_lockdown_active: string;
  antiraid_lockdown_inactive: string;
  antiraid_field_joins: string;
  antiraid_joins_value: string;
  antiraid_field_messages: string;
  antiraid_messages_value: string;
  antiraid_field_mentions: string;
  antiraid_mentions_value: string;
  antiraid_status_footer: string;
  antiraid_alert_desc: string;
  antiraid_alert_field_reason: string;
  antiraid_alert_field_signals: string;
  antiraid_alert_field_actions: string;
  antiraid_alert_signals_none: string;
  antiraid_alert_actions_none: string;
  antiraid_alert_footer: string;
  antiraid_alert_ping: string;
  antiraid_raidmode_reason: string;
  antiraid_lockdown_reason: string;
  antiraid_raidmode_on_success: string;
  antiraid_raidmode_off_success: string;
  antiraid_lockdown_on_success: string;
  antiraid_lockdown_off_success: string;
  antiraid_usage_fallback: string;
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

    // Moderation log channel embeds (ModLogger)
    modlog_type_default: 'Sanction appliquée',
    modlog_type_warn: 'Avertissement',
    modlog_type_timeout: 'Mise en sourdine (Timeout)',
    modlog_type_untimeout: 'Fin de sourdine (Untimeout)',
    modlog_type_kick: 'Expulsion (Kick)',
    modlog_type_ban: 'Bannissement (Ban)',
    modlog_type_unban: 'Débannissement (Unban)',
    modlog_field_member: '👤 Membre',
    modlog_field_moderator: '🛡️ Modérateur',
    modlog_field_reason: '📝 Raison',
    modlog_reason_none: 'Aucune raison spécifiée',
    modlog_field_duration: '⏱️ Durée',
    modlog_duration_value: '{minutes} minute(s)',
    modlog_footer: '{botName} • Modération',
    modlog_automod_title: '🤖 AutoMod • Règle déclenchée : {ruleName}',
    modlog_automod_field_member: '👤 Membre',
    modlog_automod_field_action: '⚡ Action effectuée',
    modlog_automod_field_excerpt: '💬 Extrait du message',
    modlog_automod_footer: '{botName} • AutoMod Protection',
    sanction_dm_footer: 'ETHONE Moderation Center 2.0',
    sanction_dm_warn_title: '⚠️ Avertissement — {guildName}',
    sanction_dm_warn_desc: 'Vous avez reçu un avertissement sur le serveur **{guildName}**.',
    sanction_dm_kick_title: '👢 Expulsion — {guildName}',
    sanction_dm_kick_desc: 'Vous avez été expulsé du serveur **{guildName}**.',
    sanction_dm_ban_title: '🔨 Bannissement — {guildName}',
    sanction_dm_ban_desc: 'Vous avez été banni du serveur **{guildName}**.',

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
    music_panel_queue_value: '{count} titre(s) en attente',
    music_panel_label_artist: 'Artiste',
    music_panel_label_source: 'Source',

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

    automod_status_title: '🤖 AutoMod 2.0 — {guildName}',
    automod_status_field_protection: '🛡️ Protection',
    automod_status_active: '🟢 **ACTIVE**',
    automod_status_inactive: '⚪ Désactivée',
    automod_status_field_smartmode: '🧠 Smart Mode',
    automod_smartmode_on: '✨ **Activé**',
    automod_smartmode_standard: '⚪ Standard',
    automod_status_field_risk: '📊 Niveau de Risque',
    automod_status_field_rules: '📋 Règles Personnalisées',
    automod_status_rules_value: '**{count}** règle(s)',
    automod_status_field_detectors: '⚡ Détecteurs',
    automod_detector_spam: '💬 Anti-Spam',
    automod_detector_flood: '🌊 Anti-Flood',
    automod_detector_links: '🔗 Liens',
    automod_detector_invites: '✉️ Invitations',
    automod_detector_mentions: '📢 Mentions',
    automod_detector_ghostping: '👻 Ghost Ping',
    automod_detector_caps: '🔠 CAPS',
    automod_detector_keywords: '🚫 Mots Interdits',
    automod_detector_regex: '🧩 Regex',
    automod_detector_profiles: '👤 Profils',
    automod_status_field_strikes: '⚠️ Échelle de Strikes',
    automod_status_strikes_value: '{count} paliers configurés',
    automod_status_disabled_notice: '⚫ La protection est **désactivée** : les détecteurs listés ci-dessous sont configurés mais **aucun n\'est actuellement appliqué**. Activez la protection avec `/automod toggle module:all activer:true`.',
    automod_status_footer: 'ETHONE Smart Moderation • Dashboard disponible sur /discord/moderation/automod',
    automod_alert_title: '🤖 Détection AutoMod 2.0 — {rule}',
    automod_alert_field_user: '👤 Utilisateur',
    automod_alert_field_channel: '💬 Salon',
    automod_alert_field_risk: '📊 Risk Score',
    automod_alert_field_actions: '⚡ Actions Appliquées',
    automod_alert_field_strikes: '⚠️ Strikes Actifs',
    automod_alert_field_preview: '📝 Aperçu du message',
    automod_alert_action_none: '`LOG`',
    automod_alert_footer: 'ETHONE Smart Moderation Engine',
    automod_test_missing_message: '❌ Veuillez préciser le message de test.',
    automod_test_title: '🧪 AutoMod Sandbox — Test de Règle',
    automod_test_field_message: '📝 Message Testé',
    automod_test_field_score: '📊 Risk Score Simulé',
    automod_test_score_value: '**{score}/100** (`{level}`)',
    automod_test_field_actions: '⚡ Actions Simulées',
    automod_test_no_action: 'Aucune action',
    automod_test_field_strikes_added: '⚠️ Strikes Ajoutés',
    automod_test_field_detectors_triggered: '🔍 Détecteurs Déclenchés',
    automod_test_detectors_none: 'Aucun',
    automod_test_rules_none: 'Aucune',
    automod_test_footer: 'Simulation bac à sable : Aucune sanction n\'a été appliquée',
    automod_smartmode_toggle_on: '🧠 **Smart Mode ACTIVÉ !** Les seuils s\'ajusteront automatiquement en cas d\'attaque et selon le flux d\'événements.',
    automod_smartmode_toggle_off: '🧠 **Smart Mode DÉSACTIVÉ !** Seuils statiques normaux appliqués.',
    automod_toggle_label_all: 'AutoMod (moteur entier)',
    automod_toggle_label_spam: 'Anti-Spam',
    automod_toggle_label_flood: 'Anti-Flood',
    automod_toggle_label_links: 'Filtre de Liens',
    automod_toggle_label_invites: 'Filtre d\'Invitations',
    automod_toggle_label_mentions: 'Anti-Mention Spam',
    automod_toggle_label_ghostping: 'Anti-Ghost Ping',
    automod_toggle_label_caps: 'Anti-CAPS LOCK',
    automod_toggle_label_keywords: 'Mots Interdits',
    automod_toggle_label_regex: 'Règles Regex',
    automod_toggle_label_profiles: 'Filtre de Profils',
    automod_toggle_label_strikes: 'Strikes & Sanctions Progressives',
    automod_toggle_unknown_module: '❌ Module inconnu : `{module}`.',
    automod_toggle_state_on: 'activé',
    automod_toggle_state_off: 'désactivé',
    automod_toggle_success: '{emoji} **{label}** {state}.',
    automod_toggle_disabled_note: '\n⚠️ Note : le moteur AutoMod global est actuellement désactivé (`/automod toggle module:all activer:True` pour le réactiver) — ce réglage ne prendra effet qu\'une fois AutoMod réactivé.',
    automod_usage_fallback: 'Usage : `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`, `/automod toggle <module> <activer>`',

    events_list_empty_title: '🗓️ Aucun événement prévu',
    events_list_empty_desc: 'Il n\'y a aucun événement planifié pour le moment.\nUtilisez le dashboard ETHONE pour en programmer un !',
    events_list_title: '🗓️ Événements à venir • {guildName}',
    events_list_desc: 'Voici les **{count}** prochains événements :',
    events_list_field_value: '📅 <t:{start}:F> (<t:{start}:R>)\n👥 **{capStr}** • 📍 {locationStr}\nStatut : `{status}`',
    events_participants_suffix: '{count} participant(s)',
    events_missing_id: '❌ Veuillez fournir un identifiant d\'événement valide.',
    events_not_found: '❌ Événement `{id}` introuvable.',
    events_rsvp_usage: '❌ Utilisation : `/event rsvp event_id:<id> status:<GOING|MAYBE|NOT_GOING>`',
    events_generic_error_prefix: '❌ {error}',
    events_rsvp_error_fallback: 'Erreur lors du RSVP.',
    events_rsvp_success_title: '✅ Inscription mise à jour !',
    events_rsvp_success_desc: 'Votre statut pour l\'événement **{eventId}** est maintenant : **{status}**.\n{message}',
    events_checkin_usage: '❌ Utilisation : `/event checkin event_id:<id>`',
    events_checkin_success_title: '🎟️ Présence validée !',
    events_checkin_success_desc: 'Votre présence à l\'événement a bien été confirmée.\nMerci de participer !',
    events_post_permission_denied: '❌ Vous devez avoir la permission `Gérer les événements` pour publier ce panneau.',
    events_channel_not_found: '❌ Salon textuel introuvable.',
    events_post_success: '✅ Panneau de l\'événement publié dans <#{channelId}> !',
    events_unknown_subcommand: '❌ Sous-commande inconnue. Utilisez `/event list` ou `/event info`.',
    events_rsvp_status_going: '✅ Confirmé (Going)',
    events_rsvp_status_maybe: '🤔 Peut-être (Maybe)',
    events_rsvp_status_notgoing: '❌ Non participant',
    events_rsvp_status_waitlist: '⏳ En liste d\'attente',
    events_rsvp_button_success: '🎉 {message}\nVotre statut actuel : **{statusLabel}**.',
    events_checkin_button_success: '🎟️ **Pointage confirmé !**\n{message}',
    events_status_scheduled: '🗓️ Planifié',
    events_status_live: '🔴 EN DIRECT',
    events_status_completed: '✅ Terminé',
    events_status_cancelled: '❌ Annulé',
    events_location_unspecified: 'Non spécifié',
    events_location_voice_default: 'Canal Vocal',
    events_location_stage_default: 'Conférence Scène',
    events_location_text_default: 'Salon Textuel',
    events_location_external_default: 'Lien Externe',
    events_capacity_full_suffix: '🔴 (Complet)',
    events_panel_field_datetime: '📅 Date & Heure',
    events_panel_field_location: '📍 Lieu',
    events_panel_field_status: '👥 Statut & Inscriptions',
    events_panel_datetime_value: '<t:{start}:F>\n<t:{start}:R>\nFin : <t:{end}:t>',
    events_panel_status_value: '**Statut :** {statusText}\n**Confirmés :** {capacityStr}\n**Peut-être :** {maybeCount}',
    events_panel_waitlist_line: '\n**File d\'attente :** {count}',
    events_panel_footer: 'ETHONE Events 2.0 • ID: {id}',
    events_panel_no_description: '*Aucune description fournie.*',
    events_btn_waitlist_label: 'File d\'attente ({count})',
    events_btn_going_label: 'Participer ({count})',
    events_btn_maybe_label: 'Peut-être ({count})',
    events_btn_not_going_label: 'Ne participe pas',
    events_btn_checkin_label: 'Pointage / Check-in',
    events_btn_details_label: 'Détails & Calendrier',

    giveaway_slash_only: 'Cette commande doit être exécutée via Slash Command.',
    giveaway_invalid_channel: '❌ Veuillez spécifier un salon textuel valide.',
    giveaway_start_success: '✅ Giveaway pour **{prize}** lancé avec succès dans <#{channelId}> ! (ID: `{id}`)',
    giveaway_not_found: '❌ Giveaway introuvable sur ce serveur.',
    giveaway_end_success: '🎉 Giveaway terminé avec succès ! Gagnant(s) : {winners}',
    giveaway_no_eligible_participant: 'Aucun participant éligible.',
    giveaway_reroll_success: '🎲 Reroll effectué ! Nouveau(x) gagnant(s) : {winners}',
    giveaway_no_other_participant: 'Aucun autre participant disponible.',
    giveaway_cancel_success: '❌ Le giveaway a été annulé avec succès.',
    giveaway_list_empty: 'ℹ️ Aucun giveaway n\'est actuellement actif sur ce serveur.',
    giveaway_list_title: '🎁 Giveaways Actifs • {guildName}',
    giveaway_list_item: '• **{prize}** (<#{channelId}>) — `{count}` participants — Fin : <t:{end}:R>\n  ID: `{id}`',
    giveaway_list_footer: 'Pour terminer un giveaway : /giveaway end <id>',
    giveaway_claim_not_eligible: '❌ Ce tirage au sort n\'est pas éligible à une réclamation.',
    giveaway_claim_not_winner: '⛔ Vous ne faites pas partie des gagnants sélectionnés pour ce lot.',
    giveaway_claim_already_done: '✅ Vous avez déjà confirmé la réclamation de votre récompense.',
    giveaway_claim_success: '🎉 **Réclamation confirmée !** Les organisateurs ont été notifiés de votre confirmation.',
    giveaway_default_description: 'Cliquez sur le bouton ci-dessous pour participer au tirage au sort !',
    giveaway_embed_ended_title: '🎉 GIVEAWAY TERMINÉ : {prize}',
    giveaway_embed_ended_desc: 'Ce tirage au sort est désormais clôturé.\n\n🏆 **Gagnant(s) :** {winners}\n\n🎁 **Lot remporté :** {prize}\n👥 **Participants au total :** `{count}`\n👤 **Organisé par :** <@{hostId}>',
    giveaway_embed_cancelled_title: '❌ GIVEAWAY ANNULÉ : {prize}',
    giveaway_embed_cancelled_desc: 'Ce giveaway a été annulé par un administrateur.',
    giveaway_embed_active_title: '🎁 GIVEAWAY : {prize}',
    giveaway_embed_active_desc: '{description}\n\n🏆 **Gagnants :** `{winnerCount}`\n⏰ **Fin :** <t:{endTimestamp}:R> (<t:{endTimestamp}:f>)\n👤 **Organisé par :** <@{hostId}>\n👥 **Participants :** `{participantsCount}`',
    giveaway_req_roles_required: '\n• Rôle(s) requis : {roles}',
    giveaway_req_roles_excluded: '\n• Rôle(s) interdit(s) : {roles}',
    giveaway_req_min_age: '\n• Âge de compte minimum : `{days} jour(s)`',
    giveaway_req_min_level: '\n• Niveau XP minimum : `Niveau {level}`',
    giveaway_req_prefix: '\n\n🛡️ **Conditions d\'accès :**',
    giveaway_btn_enter: '🎉 Participer ({count})',
    giveaway_btn_claim: '🎁 Réclamer mon lot',
    giveaway_elig_excluded_role: 'Vous possédez un rôle exclu du tirage au sort.',
    giveaway_elig_missing_all_roles: 'Vous ne possédez pas tous les rôles obligatoires pour participer.',
    giveaway_elig_missing_any_role: 'Vous ne possédez aucun des rôles requis pour participer.',
    giveaway_elig_min_age: 'Votre compte Discord doit avoir au moins {days} jour(s) d\'ancienneté.',
    giveaway_elig_min_level: 'Vous devez avoir atteint au minimum le **Niveau {level}** (Niveau actuel : {userLevel}).',
    giveaway_not_active: '❌ Ce giveaway n\'est plus actif.',
    giveaway_left: '👋 Vous ne participez plus à ce giveaway.',
    giveaway_participation_denied: '⛔ **Participation refusée :**\n{reason}',
    giveaway_join_success: '🎉 **Félicitations !** Votre participation au tirage au sort a bien été enregistrée.',
    giveaway_announce_winners: '🎉 Félicitations {mentions} ! Vous avez remporté le giveaway pour **{prize}** ! 🎁',
    giveaway_announce_no_winner: '⚠️ Aucun gagnant n\'a pu être sélectionné pour le giveaway **{prize}** (aucun participant éligible).',
    giveaway_dm_winner: '🎉 **Félicitations !** Vous avez remporté le giveaway **{prize}** sur le serveur **{guildName}** !',

    suggest_slash_only: 'Veuillez utiliser la commande Slash `/suggest` pour proposer une idée.',
    suggest_module_disabled: '❌ Le système de suggestions est actuellement désactivé sur ce serveur.',
    suggest_no_channel_configured: '❌ Aucun salon de suggestions n\'a été configuré par les administrateurs.',
    suggest_published_success: '✅ Votre suggestion **#{numericId}** a bien été publiée dans <#{channelId}> !',
    suggest_generic_error: '❌ Erreur : {error}',
    suggest_modal_title: 'Proposer une Suggestion',
    suggest_modal_title_label: 'Titre de votre idée',
    suggest_modal_title_placeholder: 'Ex: Ajouter un salon dédié au gaming...',
    suggest_modal_desc_label: 'Description détaillée',
    suggest_modal_desc_placeholder: 'Expliquez pourquoi cette idée serait utile et comment elle fonctionnerait...',
    suggest_modal_category_label: 'Catégorie (optionnel)',
    suggest_modal_category_placeholder: 'Ex: Général, Serveur, Bot, Événements...',
    suggest_not_found: '❌ Suggestion introuvable.',
    suggest_upvote_removed: '↩️ Votre vote positif a été retiré.',
    suggest_upvote_added: '👍 Votre vote positif a été pris en compte !',
    suggest_downvote_removed: '↩️ Votre vote négatif a été retiré.',
    suggest_downvote_added: '👎 Votre vote négatif a été pris en compte !',
    suggest_follow_on: '🔔 Vous suivez maintenant cette suggestion. Vous recevrez une notification lors de chaque mise à jour !',
    suggest_follow_off: '🔕 Vous ne suivez plus cette suggestion.',
    suggest_comment_modal_title: 'Ajouter un commentaire',
    suggest_comment_input_label: 'Votre commentaire / retour constructif',
    suggest_comment_input_placeholder: 'Partagez votre avis sur cette idée...',
    suggest_comment_added: '💬 Votre commentaire a bien été ajouté !',
    suggest_submitted_success: '✅ Votre suggestion **#{numericId}** a bien été soumise et publiée dans le salon dédié !',
    suggest_default_category: 'Général',
    suggest_status_pending: 'En attente',
    suggest_status_under_review: 'En cours d\'étude',
    suggest_status_planned: 'Planifiée',
    suggest_status_accepted: 'Acceptée',
    suggest_status_in_progress: 'En développement',
    suggest_status_completed: 'Réalisée',
    suggest_status_rejected: 'Refusée',
    suggest_status_duplicate: 'Doublon',
    suggest_status_on_hold: 'En pause',
    suggest_embed_author: 'Suggestion #{numericId} • Par {authorTag}',
    suggest_field_status: 'Statut',
    suggest_field_category: 'Catégorie',
    suggest_field_score: 'Score',
    suggest_score_value: '👍 {up}  •  👎 {down}  (Score: **{score}**)',
    suggest_staff_response_field: '💬 Réponse du Staff ({responderTag})',
    suggest_default_moderator: 'Modérateur',
    suggest_duplicate_field_value: 'Cette suggestion a été marquée comme doublon de la suggestion #{dupId}.',
    suggest_embed_footer: 'ID: {id} • {count} commentaire(s)',
    suggest_btn_comment: '💬 Commenter ({count})',
    suggest_btn_follow: '🔔 Suivre ({count})',
    suggest_no_channel_error: 'Aucun salon de suggestions n\'est configuré sur ce serveur.',
    suggest_thread_name: 'Discussion #{numericId} : {title}',
    suggest_dm_update: '🔔 **Mise à jour de la suggestion #{numericId}**\nTitre : **{title}**\nNouveau statut : {emoji} **{label}**\n{responseLine}',
    suggest_dm_response_line: 'Réponse officielle : *"{response}"*\n',

    leveling_module_disabled: '⚠️ Le système de niveaux est actuellement désactivé sur ce serveur.',
    leveling_rank_author: 'Progression de {username}',
    leveling_field_rank: '🏆 Rang',
    leveling_field_level: '⭐ Niveau',
    leveling_field_messages: '💬 Messages',
    leveling_field_progress: '📊 Progression vers le Niveau Suivant',
    leveling_progress_value: '`{bar}` **{percent}%**\n`{cur} / {next} XP` (Total : {total} XP)',
    leveling_rank_footer: '{guildName} • Système de Progression',
    leveling_leaderboard_empty: '📜 Aucun membre n\'a encore acquis d\'expérience sur ce serveur.',
    leveling_leaderboard_title: '🏆 Classement d\'Activité • {guildName}',
    leveling_leaderboard_line: '{medal} <@{userId}> — **Niveau {level}** (`{xp} XP`)',
    leveling_leaderboard_footer: 'Consultez le classement complet sur le Dashboard Web',
    leveling_levelup_title: '⭐ Progression de Niveau !',
    leveling_levelup_roles_unlocked: '🎁 **Rôle(s) débloqué(s) :** {roles}',
    leveling_xp_add_success: '✅ **+{amount} XP** ajoutés à <@{userId}>. Nouveau total : **{total} XP** (Niveau {level}).',
    leveling_xp_remove_success: '✅ **-{amount} XP** retirés à <@{userId}>. Nouveau total : **{total} XP** (Niveau {level}).',
    leveling_xp_set_success: '✅ XP de <@{userId}> défini à **{total} XP** (Niveau {level}).',
    leveling_xp_reset_success: '🗑️ L\'expérience et les niveaux de <@{userId}> ont été réinitialisés avec succès.',

    antiraid_status_title: '🛡️ Centre Anti-Raid 2.0 — {guildName}',
    antiraid_field_risk_score: '📊 Risk Score',
    antiraid_field_raidmode: '🚨 Raid Mode',
    antiraid_raidmode_active: '🔥 **ACTIVÉ**',
    antiraid_raidmode_normal: '🟢 Normal',
    antiraid_field_lockdown: '🔒 Verrouillage (Lockdown)',
    antiraid_lockdown_active: '🔴 Actif ({count} salons)',
    antiraid_lockdown_inactive: '🟢 Inactif',
    antiraid_field_joins: '📥 Arrivées (60s)',
    antiraid_joins_value: '{count} joins',
    antiraid_field_messages: '💬 Messages (60s)',
    antiraid_messages_value: '{count} msgs',
    antiraid_field_mentions: '🔔 Mentions (60s)',
    antiraid_mentions_value: '{count} mentions',
    antiraid_status_footer: 'ETHONE Anti-Raid Engine 2.0 • Dashboard Web disponible',
    antiraid_alert_desc: '**Niveau de menace :** `{threatLevel}`\n**Risk Score :** `{riskScore}/100`',
    antiraid_alert_field_reason: '🚨 Cause du déclenchement',
    antiraid_alert_field_signals: '📊 Signaux suspects détectés',
    antiraid_alert_field_actions: '⚡ Actions de protection exécutées',
    antiraid_alert_signals_none: '• Aucune anomalie additionnelle',
    antiraid_alert_actions_none: '✓ `LOG_EVENT`',
    antiraid_alert_footer: 'Incident ID : {incidentId} • ETHONE Anti-Raid 2.0',
    antiraid_alert_ping: '🚨 **Alerte Sécurité Anti-Raid**',
    antiraid_raidmode_reason: 'Déclenché par {tag}',
    antiraid_lockdown_reason: 'Lockdown d\'urgence par {tag}',
    antiraid_raidmode_on_success: '🚨 **Raid Mode ACTIVÉ !** Les protections d\'urgence sont en place.',
    antiraid_raidmode_off_success: '🔓 **Raid Mode DÉSACTIVÉ.** Retour à la configuration standard.',
    antiraid_lockdown_on_success: '🔒 **Lockdown ACTIVÉ !** {count} salon(s) textuel(s) verrouillé(s).',
    antiraid_lockdown_off_success: '🔓 **Lockdown LEVÉ !** {count} salon(s) déverrouillé(s).',
    antiraid_usage_fallback: 'Usage : `/antiraid status`, `/antiraid raidmode <activer>`, `/antiraid lockdown <activer>`',
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

    // Moderation log channel embeds (ModLogger)
    modlog_type_default: 'Sanction applied',
    modlog_type_warn: 'Warning',
    modlog_type_timeout: 'Timeout',
    modlog_type_untimeout: 'Timeout Removed',
    modlog_type_kick: 'Kick',
    modlog_type_ban: 'Ban',
    modlog_type_unban: 'Unban',
    modlog_field_member: '👤 Member',
    modlog_field_moderator: '🛡️ Moderator',
    modlog_field_reason: '📝 Reason',
    modlog_reason_none: 'No reason specified',
    modlog_field_duration: '⏱️ Duration',
    modlog_duration_value: '{minutes} minute(s)',
    modlog_footer: '{botName} • Moderation',
    modlog_automod_title: '🤖 AutoMod • Rule triggered: {ruleName}',
    modlog_automod_field_member: '👤 Member',
    modlog_automod_field_action: '⚡ Action taken',
    modlog_automod_field_excerpt: '💬 Message excerpt',
    modlog_automod_footer: '{botName} • AutoMod Protection',
    sanction_dm_footer: 'ETHONE Moderation Center 2.0',
    sanction_dm_warn_title: '⚠️ Warning — {guildName}',
    sanction_dm_warn_desc: 'You received a warning on the server **{guildName}**.',
    sanction_dm_kick_title: '👢 Kick — {guildName}',
    sanction_dm_kick_desc: 'You have been kicked from the server **{guildName}**.',
    sanction_dm_ban_title: '🔨 Ban — {guildName}',
    sanction_dm_ban_desc: 'You have been banned from the server **{guildName}**.',

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
    music_panel_queue_value: '{count} track(s) queued',
    music_panel_label_artist: 'Artist',
    music_panel_label_source: 'Source',

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

    automod_status_title: '🤖 AutoMod 2.0 — {guildName}',
    automod_status_field_protection: '🛡️ Protection',
    automod_status_active: '🟢 **ACTIVE**',
    automod_status_inactive: '⚪ Disabled',
    automod_status_field_smartmode: '🧠 Smart Mode',
    automod_smartmode_on: '✨ **Enabled**',
    automod_smartmode_standard: '⚪ Standard',
    automod_status_field_risk: '📊 Risk Level',
    automod_status_field_rules: '📋 Custom Rules',
    automod_status_rules_value: '**{count}** rule(s)',
    automod_status_field_detectors: '⚡ Detectors',
    automod_detector_spam: '💬 Anti-Spam',
    automod_detector_flood: '🌊 Anti-Flood',
    automod_detector_links: '🔗 Links',
    automod_detector_invites: '✉️ Invites',
    automod_detector_mentions: '📢 Mentions',
    automod_detector_ghostping: '👻 Ghost Ping',
    automod_detector_caps: '🔠 CAPS',
    automod_detector_keywords: '🚫 Banned Words',
    automod_detector_regex: '🧩 Regex',
    automod_detector_profiles: '👤 Profiles',
    automod_status_field_strikes: '⚠️ Strike Scale',
    automod_status_strikes_value: '{count} tier(s) configured',
    automod_status_disabled_notice: '⚫ Protection is **disabled**: the detectors listed below are configured but **none are currently being enforced**. Enable protection with `/automod toggle module:all activer:true`.',
    automod_status_footer: 'ETHONE Smart Moderation • Dashboard available at /discord/moderation/automod',
    automod_alert_title: '🤖 AutoMod 2.0 Detection — {rule}',
    automod_alert_field_user: '👤 User',
    automod_alert_field_channel: '💬 Channel',
    automod_alert_field_risk: '📊 Risk Score',
    automod_alert_field_actions: '⚡ Actions Applied',
    automod_alert_field_strikes: '⚠️ Active Strikes',
    automod_alert_field_preview: '📝 Message Preview',
    automod_alert_action_none: '`LOG`',
    automod_alert_footer: 'ETHONE Smart Moderation Engine',
    automod_test_missing_message: '❌ Please provide the test message.',
    automod_test_title: '🧪 AutoMod Sandbox — Rule Test',
    automod_test_field_message: '📝 Tested Message',
    automod_test_field_score: '📊 Simulated Risk Score',
    automod_test_score_value: '**{score}/100** (`{level}`)',
    automod_test_field_actions: '⚡ Simulated Actions',
    automod_test_no_action: 'No action',
    automod_test_field_strikes_added: '⚠️ Strikes Added',
    automod_test_field_detectors_triggered: '🔍 Triggered Detectors',
    automod_test_detectors_none: 'None',
    automod_test_rules_none: 'None',
    automod_test_footer: 'Sandbox simulation: No sanction was applied',
    automod_smartmode_toggle_on: '🧠 **Smart Mode ENABLED!** Thresholds will now adjust automatically during attacks based on the event flow.',
    automod_smartmode_toggle_off: '🧠 **Smart Mode DISABLED!** Standard static thresholds applied.',
    automod_toggle_label_all: 'AutoMod (entire engine)',
    automod_toggle_label_spam: 'Anti-Spam',
    automod_toggle_label_flood: 'Anti-Flood',
    automod_toggle_label_links: 'Link Filter',
    automod_toggle_label_invites: 'Invite Filter',
    automod_toggle_label_mentions: 'Anti-Mention Spam',
    automod_toggle_label_ghostping: 'Anti-Ghost Ping',
    automod_toggle_label_caps: 'Anti-CAPS LOCK',
    automod_toggle_label_keywords: 'Banned Words',
    automod_toggle_label_regex: 'Regex Rules',
    automod_toggle_label_profiles: 'Profile Filter',
    automod_toggle_label_strikes: 'Strikes & Progressive Sanctions',
    automod_toggle_unknown_module: '❌ Unknown module: `{module}`.',
    automod_toggle_state_on: 'enabled',
    automod_toggle_state_off: 'disabled',
    automod_toggle_success: '{emoji} **{label}** {state}.',
    automod_toggle_disabled_note: '\n⚠️ Note: the global AutoMod engine is currently disabled (`/automod toggle module:all activer:True` to re-enable it) — this setting will only take effect once AutoMod is back on.',
    automod_usage_fallback: 'Usage: `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`, `/automod toggle <module> <activer>`',

    events_list_empty_title: '🗓️ No Upcoming Events',
    events_list_empty_desc: 'There are no events scheduled right now.\nUse the ETHONE dashboard to plan one!',
    events_list_title: '🗓️ Upcoming Events • {guildName}',
    events_list_desc: 'Here are the next **{count}** events:',
    events_list_field_value: '📅 <t:{start}:F> (<t:{start}:R>)\n👥 **{capStr}** • 📍 {locationStr}\nStatus: `{status}`',
    events_participants_suffix: '{count} participant(s)',
    events_missing_id: '❌ Please provide a valid event ID.',
    events_not_found: '❌ Event `{id}` not found.',
    events_rsvp_usage: '❌ Usage: `/event rsvp event_id:<id> status:<GOING|MAYBE|NOT_GOING>`',
    events_generic_error_prefix: '❌ {error}',
    events_rsvp_error_fallback: 'RSVP error.',
    events_rsvp_success_title: '✅ RSVP Updated!',
    events_rsvp_success_desc: 'Your status for event **{eventId}** is now: **{status}**.\n{message}',
    events_checkin_usage: '❌ Usage: `/event checkin event_id:<id>`',
    events_checkin_success_title: '🎟️ Attendance Confirmed!',
    events_checkin_success_desc: 'Your attendance for the event has been confirmed.\nThanks for joining!',
    events_post_permission_denied: '❌ You need the `Manage Events` permission to publish this panel.',
    events_channel_not_found: '❌ Text channel not found.',
    events_post_success: '✅ Event panel published in <#{channelId}>!',
    events_unknown_subcommand: '❌ Unknown subcommand. Use `/event list` or `/event info`.',
    events_rsvp_status_going: '✅ Confirmed (Going)',
    events_rsvp_status_maybe: '🤔 Maybe',
    events_rsvp_status_notgoing: '❌ Not Going',
    events_rsvp_status_waitlist: '⏳ Waitlisted',
    events_rsvp_button_success: '🎉 {message}\nYour current status: **{statusLabel}**.',
    events_checkin_button_success: '🎟️ **Check-in Confirmed!**\n{message}',
    events_status_scheduled: '🗓️ Scheduled',
    events_status_live: '🔴 LIVE',
    events_status_completed: '✅ Completed',
    events_status_cancelled: '❌ Cancelled',
    events_location_unspecified: 'Not specified',
    events_location_voice_default: 'Voice Channel',
    events_location_stage_default: 'Stage Channel',
    events_location_text_default: 'Text Channel',
    events_location_external_default: 'External Link',
    events_capacity_full_suffix: '🔴 (Full)',
    events_panel_field_datetime: '📅 Date & Time',
    events_panel_field_location: '📍 Location',
    events_panel_field_status: '👥 Status & Signups',
    events_panel_datetime_value: '<t:{start}:F>\n<t:{start}:R>\nEnds: <t:{end}:t>',
    events_panel_status_value: '**Status:** {statusText}\n**Confirmed:** {capacityStr}\n**Maybe:** {maybeCount}',
    events_panel_waitlist_line: '\n**Waitlist:** {count}',
    events_panel_footer: 'ETHONE Events 2.0 • ID: {id}',
    events_panel_no_description: '*No description provided.*',
    events_btn_waitlist_label: 'Waitlist ({count})',
    events_btn_going_label: 'Going ({count})',
    events_btn_maybe_label: 'Maybe ({count})',
    events_btn_not_going_label: 'Not Going',
    events_btn_checkin_label: 'Check-in',
    events_btn_details_label: 'Details & Calendar',

    giveaway_slash_only: 'This command must be run as a Slash Command.',
    giveaway_invalid_channel: '❌ Please specify a valid text channel.',
    giveaway_start_success: '✅ Giveaway for **{prize}** successfully started in <#{channelId}>! (ID: `{id}`)',
    giveaway_not_found: '❌ Giveaway not found on this server.',
    giveaway_end_success: '🎉 Giveaway ended successfully! Winner(s): {winners}',
    giveaway_no_eligible_participant: 'No eligible participants.',
    giveaway_reroll_success: '🎲 Reroll complete! New winner(s): {winners}',
    giveaway_no_other_participant: 'No other participants available.',
    giveaway_cancel_success: '❌ The giveaway was successfully cancelled.',
    giveaway_list_empty: 'ℹ️ No giveaway is currently active on this server.',
    giveaway_list_title: '🎁 Active Giveaways • {guildName}',
    giveaway_list_item: '• **{prize}** (<#{channelId}>) — `{count}` entries — Ends: <t:{end}:R>\n  ID: `{id}`',
    giveaway_list_footer: 'To end a giveaway: /giveaway end <id>',
    giveaway_claim_not_eligible: '❌ This giveaway is not eligible for a claim.',
    giveaway_claim_not_winner: '⛔ You are not among the selected winners for this prize.',
    giveaway_claim_already_done: '✅ You have already confirmed your prize claim.',
    giveaway_claim_success: '🎉 **Claim confirmed!** The hosts have been notified of your confirmation.',
    giveaway_default_description: 'Click the button below to enter the giveaway!',
    giveaway_embed_ended_title: '🎉 GIVEAWAY ENDED: {prize}',
    giveaway_embed_ended_desc: 'This giveaway is now closed.\n\n🏆 **Winner(s):** {winners}\n\n🎁 **Prize won:** {prize}\n👥 **Total participants:** `{count}`\n👤 **Hosted by:** <@{hostId}>',
    giveaway_embed_cancelled_title: '❌ GIVEAWAY CANCELLED: {prize}',
    giveaway_embed_cancelled_desc: 'This giveaway was cancelled by an administrator.',
    giveaway_embed_active_title: '🎁 GIVEAWAY: {prize}',
    giveaway_embed_active_desc: '{description}\n\n🏆 **Winners:** `{winnerCount}`\n⏰ **Ends:** <t:{endTimestamp}:R> (<t:{endTimestamp}:f>)\n👤 **Hosted by:** <@{hostId}>\n👥 **Participants:** `{participantsCount}`',
    giveaway_req_roles_required: '\n• Required role(s): {roles}',
    giveaway_req_roles_excluded: '\n• Excluded role(s): {roles}',
    giveaway_req_min_age: '\n• Minimum account age: `{days} day(s)`',
    giveaway_req_min_level: '\n• Minimum XP level: `Level {level}`',
    giveaway_req_prefix: '\n\n🛡️ **Entry Requirements:**',
    giveaway_btn_enter: '🎉 Enter ({count})',
    giveaway_btn_claim: '🎁 Claim My Prize',
    giveaway_elig_excluded_role: 'You have a role excluded from this giveaway.',
    giveaway_elig_missing_all_roles: 'You do not have all the required roles to enter.',
    giveaway_elig_missing_any_role: 'You do not have any of the required roles to enter.',
    giveaway_elig_min_age: 'Your Discord account must be at least {days} day(s) old.',
    giveaway_elig_min_level: 'You must have reached at least **Level {level}** (current level: {userLevel}).',
    giveaway_not_active: '❌ This giveaway is no longer active.',
    giveaway_left: '👋 You are no longer entered in this giveaway.',
    giveaway_participation_denied: '⛔ **Entry denied:**\n{reason}',
    giveaway_join_success: '🎉 **Congratulations!** Your entry into the giveaway has been recorded.',
    giveaway_announce_winners: '🎉 Congratulations {mentions}! You won the giveaway for **{prize}**! 🎁',
    giveaway_announce_no_winner: '⚠️ No winner could be selected for the **{prize}** giveaway (no eligible participants).',
    giveaway_dm_winner: '🎉 **Congratulations!** You won the **{prize}** giveaway on **{guildName}**!',

    suggest_slash_only: 'Please use the `/suggest` Slash Command to submit an idea.',
    suggest_module_disabled: '❌ The suggestions system is currently disabled on this server.',
    suggest_no_channel_configured: '❌ No suggestions channel has been configured by the administrators.',
    suggest_published_success: '✅ Your suggestion **#{numericId}** was published in <#{channelId}>!',
    suggest_generic_error: '❌ Error: {error}',
    suggest_modal_title: 'Submit a Suggestion',
    suggest_modal_title_label: 'Title of your idea',
    suggest_modal_title_placeholder: 'E.g.: Add a dedicated gaming channel...',
    suggest_modal_desc_label: 'Detailed description',
    suggest_modal_desc_placeholder: 'Explain why this idea would be useful and how it would work...',
    suggest_modal_category_label: 'Category (optional)',
    suggest_modal_category_placeholder: 'E.g.: General, Server, Bot, Events...',
    suggest_not_found: '❌ Suggestion not found.',
    suggest_upvote_removed: '↩️ Your upvote has been removed.',
    suggest_upvote_added: '👍 Your upvote has been counted!',
    suggest_downvote_removed: '↩️ Your downvote has been removed.',
    suggest_downvote_added: '👎 Your downvote has been counted!',
    suggest_follow_on: '🔔 You are now following this suggestion. You will get notified on every update!',
    suggest_follow_off: '🔕 You are no longer following this suggestion.',
    suggest_comment_modal_title: 'Add a Comment',
    suggest_comment_input_label: 'Your comment / constructive feedback',
    suggest_comment_input_placeholder: 'Share your thoughts on this idea...',
    suggest_comment_added: '💬 Your comment has been added!',
    suggest_submitted_success: '✅ Your suggestion **#{numericId}** was submitted and published in the dedicated channel!',
    suggest_default_category: 'General',
    suggest_status_pending: 'Pending',
    suggest_status_under_review: 'Under Review',
    suggest_status_planned: 'Planned',
    suggest_status_accepted: 'Accepted',
    suggest_status_in_progress: 'In Progress',
    suggest_status_completed: 'Completed',
    suggest_status_rejected: 'Rejected',
    suggest_status_duplicate: 'Duplicate',
    suggest_status_on_hold: 'On Hold',
    suggest_embed_author: 'Suggestion #{numericId} • By {authorTag}',
    suggest_field_status: 'Status',
    suggest_field_category: 'Category',
    suggest_field_score: 'Score',
    suggest_score_value: '👍 {up}  •  👎 {down}  (Score: **{score}**)',
    suggest_staff_response_field: '💬 Staff Response ({responderTag})',
    suggest_default_moderator: 'Moderator',
    suggest_duplicate_field_value: 'This suggestion was marked as a duplicate of suggestion #{dupId}.',
    suggest_embed_footer: 'ID: {id} • {count} comment(s)',
    suggest_btn_comment: '💬 Comment ({count})',
    suggest_btn_follow: '🔔 Follow ({count})',
    suggest_no_channel_error: 'No suggestions channel is configured on this server.',
    suggest_thread_name: 'Discussion #{numericId}: {title}',
    suggest_dm_update: '🔔 **Suggestion #{numericId} Update**\nTitle: **{title}**\nNew status: {emoji} **{label}**\n{responseLine}',
    suggest_dm_response_line: 'Official response: *"{response}"*\n',

    leveling_module_disabled: '⚠️ The leveling system is currently disabled on this server.',
    leveling_rank_author: '{username}\'s Progress',
    leveling_field_rank: '🏆 Rank',
    leveling_field_level: '⭐ Level',
    leveling_field_messages: '💬 Messages',
    leveling_field_progress: '📊 Progress to Next Level',
    leveling_progress_value: '`{bar}` **{percent}%**\n`{cur} / {next} XP` (Total: {total} XP)',
    leveling_rank_footer: '{guildName} • Leveling System',
    leveling_leaderboard_empty: '📜 No member has earned any experience on this server yet.',
    leveling_leaderboard_title: '🏆 Activity Leaderboard • {guildName}',
    leveling_leaderboard_line: '{medal} <@{userId}> — **Level {level}** (`{xp} XP`)',
    leveling_leaderboard_footer: 'View the full leaderboard on the Web Dashboard',
    leveling_levelup_title: '⭐ Level Up!',
    leveling_levelup_roles_unlocked: '🎁 **Role(s) unlocked:** {roles}',
    leveling_xp_add_success: '✅ **+{amount} XP** added to <@{userId}>. New total: **{total} XP** (Level {level}).',
    leveling_xp_remove_success: '✅ **-{amount} XP** removed from <@{userId}>. New total: **{total} XP** (Level {level}).',
    leveling_xp_set_success: '✅ XP for <@{userId}> set to **{total} XP** (Level {level}).',
    leveling_xp_reset_success: '🗑️ The experience and levels of <@{userId}> have been successfully reset.',

    antiraid_status_title: '🛡️ Anti-Raid Center 2.0 — {guildName}',
    antiraid_field_risk_score: '📊 Risk Score',
    antiraid_field_raidmode: '🚨 Raid Mode',
    antiraid_raidmode_active: '🔥 **ACTIVE**',
    antiraid_raidmode_normal: '🟢 Normal',
    antiraid_field_lockdown: '🔒 Lockdown',
    antiraid_lockdown_active: '🔴 Active ({count} channels)',
    antiraid_lockdown_inactive: '🟢 Inactive',
    antiraid_field_joins: '📥 Joins (60s)',
    antiraid_joins_value: '{count} joins',
    antiraid_field_messages: '💬 Messages (60s)',
    antiraid_messages_value: '{count} msgs',
    antiraid_field_mentions: '🔔 Mentions (60s)',
    antiraid_mentions_value: '{count} mentions',
    antiraid_status_footer: 'ETHONE Anti-Raid Engine 2.0 • Web Dashboard available',
    antiraid_alert_desc: '**Threat level:** `{threatLevel}`\n**Risk Score:** `{riskScore}/100`',
    antiraid_alert_field_reason: '🚨 Trigger cause',
    antiraid_alert_field_signals: '📊 Suspicious signals detected',
    antiraid_alert_field_actions: '⚡ Protection actions executed',
    antiraid_alert_signals_none: '• No additional anomaly',
    antiraid_alert_actions_none: '✓ `LOG_EVENT`',
    antiraid_alert_footer: 'Incident ID: {incidentId} • ETHONE Anti-Raid 2.0',
    antiraid_alert_ping: '🚨 **Anti-Raid Security Alert**',
    antiraid_raidmode_reason: 'Triggered by {tag}',
    antiraid_lockdown_reason: 'Emergency lockdown by {tag}',
    antiraid_raidmode_on_success: '🚨 **Raid Mode ACTIVATED!** Emergency protections are now in place.',
    antiraid_raidmode_off_success: '🔓 **Raid Mode DEACTIVATED.** Back to standard configuration.',
    antiraid_lockdown_on_success: '🔒 **Lockdown ACTIVATED!** {count} text channel(s) locked.',
    antiraid_lockdown_off_success: '🔓 **Lockdown LIFTED!** {count} channel(s) unlocked.',
    antiraid_usage_fallback: 'Usage: `/antiraid status`, `/antiraid raidmode <activer>`, `/antiraid lockdown <activer>`',
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

    // Moderation log channel embeds (ModLogger)
    modlog_type_default: 'Sanción aplicada',
    modlog_type_warn: 'Advertencia',
    modlog_type_timeout: 'Silencio Temporal (Timeout)',
    modlog_type_untimeout: 'Silencio Retirado (Untimeout)',
    modlog_type_kick: 'Expulsión (Kick)',
    modlog_type_ban: 'Baneo (Ban)',
    modlog_type_unban: 'Desbaneo (Unban)',
    modlog_field_member: '👤 Miembro',
    modlog_field_moderator: '🛡️ Moderador',
    modlog_field_reason: '📝 Razón',
    modlog_reason_none: 'Ninguna razón especificada',
    modlog_field_duration: '⏱️ Duración',
    modlog_duration_value: '{minutes} minuto(s)',
    modlog_footer: '{botName} • Moderación',
    modlog_automod_title: '🤖 AutoMod • Regla activada: {ruleName}',
    modlog_automod_field_member: '👤 Miembro',
    modlog_automod_field_action: '⚡ Acción realizada',
    modlog_automod_field_excerpt: '💬 Extracto del mensaje',
    modlog_automod_footer: '{botName} • Protección AutoMod',
    sanction_dm_footer: 'ETHONE Moderation Center 2.0',
    sanction_dm_warn_title: '⚠️ Advertencia — {guildName}',
    sanction_dm_warn_desc: 'Has recibido una advertencia en el servidor **{guildName}**.',
    sanction_dm_kick_title: '👢 Expulsión — {guildName}',
    sanction_dm_kick_desc: 'Has sido expulsado del servidor **{guildName}**.',
    sanction_dm_ban_title: '🔨 Baneo — {guildName}',
    sanction_dm_ban_desc: 'Has sido baneado del servidor **{guildName}**.',

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
    music_panel_queue_value: '{count} canción(es) en cola',
    music_panel_label_artist: 'Artista',
    music_panel_label_source: 'Fuente',

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

    automod_status_title: '🤖 AutoMod 2.0 — {guildName}',
    automod_status_field_protection: '🛡️ Protección',
    automod_status_active: '🟢 **ACTIVA**',
    automod_status_inactive: '⚪ Desactivada',
    automod_status_field_smartmode: '🧠 Modo Inteligente',
    automod_smartmode_on: '✨ **Activado**',
    automod_smartmode_standard: '⚪ Estándar',
    automod_status_field_risk: '📊 Nivel de Riesgo',
    automod_status_field_rules: '📋 Reglas Personalizadas',
    automod_status_rules_value: '**{count}** regla(s)',
    automod_status_field_detectors: '⚡ Detectores',
    automod_detector_spam: '💬 Anti-Spam',
    automod_detector_flood: '🌊 Anti-Flood',
    automod_detector_links: '🔗 Enlaces',
    automod_detector_invites: '✉️ Invitaciones',
    automod_detector_mentions: '📢 Menciones',
    automod_detector_ghostping: '👻 Ghost Ping',
    automod_detector_caps: '🔠 MAYÚSCULAS',
    automod_detector_keywords: '🚫 Palabras Prohibidas',
    automod_detector_regex: '🧩 Regex',
    automod_detector_profiles: '👤 Perfiles',
    automod_status_field_strikes: '⚠️ Escala de Strikes',
    automod_status_strikes_value: '{count} nivel(es) configurado(s)',
    automod_status_disabled_notice: '⚫ La protección está **desactivada**: los detectores listados abajo están configurados pero **ninguno se aplica actualmente**. Activa la protección con `/automod toggle module:all activer:true`.',
    automod_status_footer: 'ETHONE Smart Moderation • Panel disponible en /discord/moderation/automod',
    automod_alert_title: '🤖 Detección AutoMod 2.0 — {rule}',
    automod_alert_field_user: '👤 Usuario',
    automod_alert_field_channel: '💬 Canal',
    automod_alert_field_risk: '📊 Risk Score',
    automod_alert_field_actions: '⚡ Acciones Aplicadas',
    automod_alert_field_strikes: '⚠️ Strikes Activos',
    automod_alert_field_preview: '📝 Vista previa del mensaje',
    automod_alert_action_none: '`LOG`',
    automod_alert_footer: 'ETHONE Smart Moderation Engine',
    automod_test_missing_message: '❌ Por favor indica el mensaje de prueba.',
    automod_test_title: '🧪 AutoMod Sandbox — Prueba de Regla',
    automod_test_field_message: '📝 Mensaje Probado',
    automod_test_field_score: '📊 Puntuación de Riesgo Simulada',
    automod_test_score_value: '**{score}/100** (`{level}`)',
    automod_test_field_actions: '⚡ Acciones Simuladas',
    automod_test_no_action: 'Ninguna acción',
    automod_test_field_strikes_added: '⚠️ Strikes Añadidos',
    automod_test_field_detectors_triggered: '🔍 Detectores Activados',
    automod_test_detectors_none: 'Ninguno',
    automod_test_rules_none: 'Ninguna',
    automod_test_footer: 'Simulación en sandbox: No se aplicó ninguna sanción',
    automod_smartmode_toggle_on: '🧠 **¡Modo Inteligente ACTIVADO!** Los umbrales se ajustarán automáticamente durante un ataque según el flujo de eventos.',
    automod_smartmode_toggle_off: '🧠 **¡Modo Inteligente DESACTIVADO!** Se aplican los umbrales estáticos normales.',
    automod_toggle_label_all: 'AutoMod (motor completo)',
    automod_toggle_label_spam: 'Anti-Spam',
    automod_toggle_label_flood: 'Anti-Flood',
    automod_toggle_label_links: 'Filtro de Enlaces',
    automod_toggle_label_invites: 'Filtro de Invitaciones',
    automod_toggle_label_mentions: 'Anti-Spam de Menciones',
    automod_toggle_label_ghostping: 'Anti-Ghost Ping',
    automod_toggle_label_caps: 'Anti-MAYÚSCULAS',
    automod_toggle_label_keywords: 'Palabras Prohibidas',
    automod_toggle_label_regex: 'Reglas Regex',
    automod_toggle_label_profiles: 'Filtro de Perfiles',
    automod_toggle_label_strikes: 'Strikes y Sanciones Progresivas',
    automod_toggle_unknown_module: '❌ Módulo desconocido: `{module}`.',
    automod_toggle_state_on: 'activado',
    automod_toggle_state_off: 'desactivado',
    automod_toggle_success: '{emoji} **{label}** {state}.',
    automod_toggle_disabled_note: '\n⚠️ Nota: el motor global de AutoMod está actualmente desactivado (`/automod toggle module:all activer:True` para reactivarlo) — este ajuste solo tendrá efecto cuando AutoMod vuelva a estar activo.',
    automod_usage_fallback: 'Uso: `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`, `/automod toggle <module> <activer>`',

    events_list_empty_title: '🗓️ Sin Eventos Próximos',
    events_list_empty_desc: 'No hay eventos programados por el momento.\n¡Usa el panel ETHONE para crear uno!',
    events_list_title: '🗓️ Próximos Eventos • {guildName}',
    events_list_desc: 'Aquí tienes los próximos **{count}** eventos:',
    events_list_field_value: '📅 <t:{start}:F> (<t:{start}:R>)\n👥 **{capStr}** • 📍 {locationStr}\nEstado: `{status}`',
    events_participants_suffix: '{count} participante(s)',
    events_missing_id: '❌ Proporciona un identificador de evento válido.',
    events_not_found: '❌ Evento `{id}` no encontrado.',
    events_rsvp_usage: '❌ Uso: `/event rsvp event_id:<id> status:<GOING|MAYBE|NOT_GOING>`',
    events_generic_error_prefix: '❌ {error}',
    events_rsvp_error_fallback: 'Error al procesar el RSVP.',
    events_rsvp_success_title: '✅ ¡Inscripción actualizada!',
    events_rsvp_success_desc: 'Tu estado para el evento **{eventId}** ahora es: **{status}**.\n{message}',
    events_checkin_usage: '❌ Uso: `/event checkin event_id:<id>`',
    events_checkin_success_title: '🎟️ ¡Asistencia confirmada!',
    events_checkin_success_desc: 'Tu asistencia al evento ha sido confirmada.\n¡Gracias por participar!',
    events_post_permission_denied: '❌ Necesitas el permiso `Gestionar Eventos` para publicar este panel.',
    events_channel_not_found: '❌ Canal de texto no encontrado.',
    events_post_success: '✅ ¡Panel del evento publicado en <#{channelId}>!',
    events_unknown_subcommand: '❌ Subcomando desconocido. Usa `/event list` o `/event info`.',
    events_rsvp_status_going: '✅ Confirmado (Going)',
    events_rsvp_status_maybe: '🤔 Tal vez (Maybe)',
    events_rsvp_status_notgoing: '❌ No participa',
    events_rsvp_status_waitlist: '⏳ En lista de espera',
    events_rsvp_button_success: '🎉 {message}\nTu estado actual: **{statusLabel}**.',
    events_checkin_button_success: '🎟️ **¡Check-in confirmado!**\n{message}',
    events_status_scheduled: '🗓️ Programado',
    events_status_live: '🔴 EN DIRECTO',
    events_status_completed: '✅ Finalizado',
    events_status_cancelled: '❌ Cancelado',
    events_location_unspecified: 'No especificado',
    events_location_voice_default: 'Canal de Voz',
    events_location_stage_default: 'Canal de Escenario',
    events_location_text_default: 'Canal de Texto',
    events_location_external_default: 'Enlace Externo',
    events_capacity_full_suffix: '🔴 (Completo)',
    events_panel_field_datetime: '📅 Fecha y Hora',
    events_panel_field_location: '📍 Lugar',
    events_panel_field_status: '👥 Estado e Inscripciones',
    events_panel_datetime_value: '<t:{start}:F>\n<t:{start}:R>\nFinaliza: <t:{end}:t>',
    events_panel_status_value: '**Estado:** {statusText}\n**Confirmados:** {capacityStr}\n**Tal vez:** {maybeCount}',
    events_panel_waitlist_line: '\n**Lista de espera:** {count}',
    events_panel_footer: 'ETHONE Events 2.0 • ID: {id}',
    events_panel_no_description: '*Sin descripción proporcionada.*',
    events_btn_waitlist_label: 'Lista de espera ({count})',
    events_btn_going_label: 'Participar ({count})',
    events_btn_maybe_label: 'Tal vez ({count})',
    events_btn_not_going_label: 'No participa',
    events_btn_checkin_label: 'Check-in',
    events_btn_details_label: 'Detalles y Calendario',

    giveaway_slash_only: 'Este comando debe ejecutarse como Slash Command.',
    giveaway_invalid_channel: '❌ Por favor especifica un canal de texto válido.',
    giveaway_start_success: '✅ ¡Sorteo para **{prize}** iniciado con éxito en <#{channelId}>! (ID: `{id}`)',
    giveaway_not_found: '❌ Sorteo no encontrado en este servidor.',
    giveaway_end_success: '🎉 ¡Sorteo finalizado con éxito! Ganador(es): {winners}',
    giveaway_no_eligible_participant: 'Ningún participante elegible.',
    giveaway_reroll_success: '🎲 ¡Reroll completado! Nuevo(s) ganador(es): {winners}',
    giveaway_no_other_participant: 'No hay más participantes disponibles.',
    giveaway_cancel_success: '❌ El sorteo ha sido cancelado con éxito.',
    giveaway_list_empty: 'ℹ️ No hay ningún sorteo activo actualmente en este servidor.',
    giveaway_list_title: '🎁 Sorteos Activos • {guildName}',
    giveaway_list_item: '• **{prize}** (<#{channelId}>) — `{count}` participantes — Fin: <t:{end}:R>\n  ID: `{id}`',
    giveaway_list_footer: 'Para finalizar un sorteo: /giveaway end <id>',
    giveaway_claim_not_eligible: '❌ Este sorteo no es elegible para reclamar el premio.',
    giveaway_claim_not_winner: '⛔ No estás entre los ganadores seleccionados para este premio.',
    giveaway_claim_already_done: '✅ Ya has confirmado la reclamación de tu premio.',
    giveaway_claim_success: '🎉 **¡Reclamación confirmada!** Los organizadores han sido notificados de tu confirmación.',
    giveaway_default_description: '¡Haz clic en el botón de abajo para participar en el sorteo!',
    giveaway_embed_ended_title: '🎉 SORTEO FINALIZADO: {prize}',
    giveaway_embed_ended_desc: 'Este sorteo ya está cerrado.\n\n🏆 **Ganador(es):** {winners}\n\n🎁 **Premio ganado:** {prize}\n👥 **Total de participantes:** `{count}`\n👤 **Organizado por:** <@{hostId}>',
    giveaway_embed_cancelled_title: '❌ SORTEO CANCELADO: {prize}',
    giveaway_embed_cancelled_desc: 'Este sorteo fue cancelado por un administrador.',
    giveaway_embed_active_title: '🎁 SORTEO: {prize}',
    giveaway_embed_active_desc: '{description}\n\n🏆 **Ganadores:** `{winnerCount}`\n⏰ **Finaliza:** <t:{endTimestamp}:R> (<t:{endTimestamp}:f>)\n👤 **Organizado por:** <@{hostId}>\n👥 **Participantes:** `{participantsCount}`',
    giveaway_req_roles_required: '\n• Rol(es) requerido(s): {roles}',
    giveaway_req_roles_excluded: '\n• Rol(es) excluido(s): {roles}',
    giveaway_req_min_age: '\n• Antigüedad mínima de la cuenta: `{days} día(s)`',
    giveaway_req_min_level: '\n• Nivel XP mínimo: `Nivel {level}`',
    giveaway_req_prefix: '\n\n🛡️ **Condiciones de participación:**',
    giveaway_btn_enter: '🎉 Participar ({count})',
    giveaway_btn_claim: '🎁 Reclamar mi Premio',
    giveaway_elig_excluded_role: 'Tienes un rol excluido de este sorteo.',
    giveaway_elig_missing_all_roles: 'No tienes todos los roles obligatorios para participar.',
    giveaway_elig_missing_any_role: 'No tienes ninguno de los roles requeridos para participar.',
    giveaway_elig_min_age: 'Tu cuenta de Discord debe tener al menos {days} día(s) de antigüedad.',
    giveaway_elig_min_level: 'Debes haber alcanzado al menos el **Nivel {level}** (nivel actual: {userLevel}).',
    giveaway_not_active: '❌ Este sorteo ya no está activo.',
    giveaway_left: '👋 Ya no participas en este sorteo.',
    giveaway_participation_denied: '⛔ **Participación rechazada:**\n{reason}',
    giveaway_join_success: '🎉 **¡Felicidades!** Tu participación en el sorteo ha sido registrada.',
    giveaway_announce_winners: '🎉 ¡Felicidades {mentions}! ¡Has ganado el sorteo de **{prize}**! 🎁',
    giveaway_announce_no_winner: '⚠️ No se pudo seleccionar ningún ganador para el sorteo **{prize}** (ningún participante elegible).',
    giveaway_dm_winner: '🎉 **¡Felicidades!** ¡Has ganado el sorteo **{prize}** en **{guildName}**!',

    suggest_slash_only: 'Usa el comando Slash `/suggest` para proponer una idea.',
    suggest_module_disabled: '❌ El sistema de sugerencias está actualmente desactivado en este servidor.',
    suggest_no_channel_configured: '❌ Los administradores no han configurado ningún canal de sugerencias.',
    suggest_published_success: '✅ ¡Tu sugerencia **#{numericId}** se publicó en <#{channelId}>!',
    suggest_generic_error: '❌ Error: {error}',
    suggest_modal_title: 'Proponer una Sugerencia',
    suggest_modal_title_label: 'Título de tu idea',
    suggest_modal_title_placeholder: 'Ej: Añadir un canal dedicado al gaming...',
    suggest_modal_desc_label: 'Descripción detallada',
    suggest_modal_desc_placeholder: 'Explica por qué esta idea sería útil y cómo funcionaría...',
    suggest_modal_category_label: 'Categoría (opcional)',
    suggest_modal_category_placeholder: 'Ej: General, Servidor, Bot, Eventos...',
    suggest_not_found: '❌ Sugerencia no encontrada.',
    suggest_upvote_removed: '↩️ Tu voto positivo ha sido retirado.',
    suggest_upvote_added: '👍 ¡Tu voto positivo ha sido registrado!',
    suggest_downvote_removed: '↩️ Tu voto negativo ha sido retirado.',
    suggest_downvote_added: '👎 ¡Tu voto negativo ha sido registrado!',
    suggest_follow_on: '🔔 Ahora sigues esta sugerencia. ¡Recibirás una notificación con cada actualización!',
    suggest_follow_off: '🔕 Ya no sigues esta sugerencia.',
    suggest_comment_modal_title: 'Añadir un comentario',
    suggest_comment_input_label: 'Tu comentario / feedback constructivo',
    suggest_comment_input_placeholder: 'Comparte tu opinión sobre esta idea...',
    suggest_comment_added: '💬 ¡Tu comentario ha sido añadido!',
    suggest_submitted_success: '✅ ¡Tu sugerencia **#{numericId}** fue enviada y publicada en el canal correspondiente!',
    suggest_default_category: 'General',
    suggest_status_pending: 'Pendiente',
    suggest_status_under_review: 'En revisión',
    suggest_status_planned: 'Planificada',
    suggest_status_accepted: 'Aceptada',
    suggest_status_in_progress: 'En desarrollo',
    suggest_status_completed: 'Realizada',
    suggest_status_rejected: 'Rechazada',
    suggest_status_duplicate: 'Duplicado',
    suggest_status_on_hold: 'En pausa',
    suggest_embed_author: 'Sugerencia #{numericId} • Por {authorTag}',
    suggest_field_status: 'Estado',
    suggest_field_category: 'Categoría',
    suggest_field_score: 'Puntuación',
    suggest_score_value: '👍 {up}  •  👎 {down}  (Puntuación: **{score}**)',
    suggest_staff_response_field: '💬 Respuesta del Staff ({responderTag})',
    suggest_default_moderator: 'Moderador',
    suggest_duplicate_field_value: 'Esta sugerencia fue marcada como duplicado de la sugerencia #{dupId}.',
    suggest_embed_footer: 'ID: {id} • {count} comentario(s)',
    suggest_btn_comment: '💬 Comentar ({count})',
    suggest_btn_follow: '🔔 Seguir ({count})',
    suggest_no_channel_error: 'No hay ningún canal de sugerencias configurado en este servidor.',
    suggest_thread_name: 'Debate #{numericId}: {title}',
    suggest_dm_update: '🔔 **Actualización de la sugerencia #{numericId}**\nTítulo: **{title}**\nNuevo estado: {emoji} **{label}**\n{responseLine}',
    suggest_dm_response_line: 'Respuesta oficial: *"{response}"*\n',

    leveling_module_disabled: '⚠️ El sistema de niveles está actualmente desactivado en este servidor.',
    leveling_rank_author: 'Progreso de {username}',
    leveling_field_rank: '🏆 Rango',
    leveling_field_level: '⭐ Nivel',
    leveling_field_messages: '💬 Mensajes',
    leveling_field_progress: '📊 Progreso hacia el Siguiente Nivel',
    leveling_progress_value: '`{bar}` **{percent}%**\n`{cur} / {next} XP` (Total: {total} XP)',
    leveling_rank_footer: '{guildName} • Sistema de Progresión',
    leveling_leaderboard_empty: '📜 Ningún miembro ha ganado experiencia todavía en este servidor.',
    leveling_leaderboard_title: '🏆 Clasificación de Actividad • {guildName}',
    leveling_leaderboard_line: '{medal} <@{userId}> — **Nivel {level}** (`{xp} XP`)',
    leveling_leaderboard_footer: 'Consulta la clasificación completa en el Panel Web',
    leveling_levelup_title: '⭐ ¡Subida de Nivel!',
    leveling_levelup_roles_unlocked: '🎁 **Rol(es) desbloqueado(s):** {roles}',
    leveling_xp_add_success: '✅ **+{amount} XP** añadidos a <@{userId}>. Nuevo total: **{total} XP** (Nivel {level}).',
    leveling_xp_remove_success: '✅ **-{amount} XP** retirados a <@{userId}>. Nuevo total: **{total} XP** (Nivel {level}).',
    leveling_xp_set_success: '✅ XP de <@{userId}> establecido en **{total} XP** (Nivel {level}).',
    leveling_xp_reset_success: '🗑️ La experiencia y los niveles de <@{userId}> se han reiniciado con éxito.',

    antiraid_status_title: '🛡️ Centro Anti-Raid 2.0 — {guildName}',
    antiraid_field_risk_score: '📊 Risk Score',
    antiraid_field_raidmode: '🚨 Raid Mode',
    antiraid_raidmode_active: '🔥 **ACTIVADO**',
    antiraid_raidmode_normal: '🟢 Normal',
    antiraid_field_lockdown: '🔒 Bloqueo (Lockdown)',
    antiraid_lockdown_active: '🔴 Activo ({count} canales)',
    antiraid_lockdown_inactive: '🟢 Inactivo',
    antiraid_field_joins: '📥 Entradas (60s)',
    antiraid_joins_value: '{count} entradas',
    antiraid_field_messages: '💬 Mensajes (60s)',
    antiraid_messages_value: '{count} msgs',
    antiraid_field_mentions: '🔔 Menciones (60s)',
    antiraid_mentions_value: '{count} menciones',
    antiraid_status_footer: 'ETHONE Anti-Raid Engine 2.0 • Panel Web disponible',
    antiraid_alert_desc: '**Nivel de amenaza:** `{threatLevel}`\n**Risk Score:** `{riskScore}/100`',
    antiraid_alert_field_reason: '🚨 Causa de activación',
    antiraid_alert_field_signals: '📊 Señales sospechosas detectadas',
    antiraid_alert_field_actions: '⚡ Acciones de protección ejecutadas',
    antiraid_alert_signals_none: '• Ninguna anomalía adicional',
    antiraid_alert_actions_none: '✓ `LOG_EVENT`',
    antiraid_alert_footer: 'ID de Incidente: {incidentId} • ETHONE Anti-Raid 2.0',
    antiraid_alert_ping: '🚨 **Alerta de Seguridad Anti-Raid**',
    antiraid_raidmode_reason: 'Activado por {tag}',
    antiraid_lockdown_reason: 'Bloqueo de emergencia por {tag}',
    antiraid_raidmode_on_success: '🚨 **¡Raid Mode ACTIVADO!** Las protecciones de emergencia ya están en marcha.',
    antiraid_raidmode_off_success: '🔓 **Raid Mode DESACTIVADO.** Vuelta a la configuración estándar.',
    antiraid_lockdown_on_success: '🔒 **¡Bloqueo ACTIVADO!** {count} canal(es) de texto bloqueado(s).',
    antiraid_lockdown_off_success: '🔓 **¡Bloqueo LEVANTADO!** {count} canal(es) desbloqueado(s).',
    antiraid_usage_fallback: 'Uso: `/antiraid status`, `/antiraid raidmode <activer>`, `/antiraid lockdown <activer>`',
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

    // Moderation log channel embeds (ModLogger)
    modlog_type_default: 'Sanktion verhängt',
    modlog_type_warn: 'Verwarnung',
    modlog_type_timeout: 'Auszeit (Timeout)',
    modlog_type_untimeout: 'Auszeit Aufgehoben (Untimeout)',
    modlog_type_kick: 'Kick',
    modlog_type_ban: 'Bann',
    modlog_type_unban: 'Entbannung (Unban)',
    modlog_field_member: '👤 Mitglied',
    modlog_field_moderator: '🛡️ Moderator',
    modlog_field_reason: '📝 Grund',
    modlog_reason_none: 'Kein Grund angegeben',
    modlog_field_duration: '⏱️ Dauer',
    modlog_duration_value: '{minutes} Minute(n)',
    modlog_footer: '{botName} • Moderation',
    modlog_automod_title: '🤖 AutoMod • Regel ausgelöst: {ruleName}',
    modlog_automod_field_member: '👤 Mitglied',
    modlog_automod_field_action: '⚡ Ausgeführte Aktion',
    modlog_automod_field_excerpt: '💬 Nachrichtenausschnitt',
    modlog_automod_footer: '{botName} • AutoMod-Schutz',
    sanction_dm_footer: 'ETHONE Moderation Center 2.0',
    sanction_dm_warn_title: '⚠️ Verwarnung — {guildName}',
    sanction_dm_warn_desc: 'Du hast eine Verwarnung auf dem Server **{guildName}** erhalten.',
    sanction_dm_kick_title: '👢 Kick — {guildName}',
    sanction_dm_kick_desc: 'Du wurdest vom Server **{guildName}** gekickt.',
    sanction_dm_ban_title: '🔨 Bann — {guildName}',
    sanction_dm_ban_desc: 'Du wurdest vom Server **{guildName}** gebannt.',

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
    music_panel_queue_value: '{count} Titel in der Warteschlange',
    music_panel_label_artist: 'Künstler',
    music_panel_label_source: 'Quelle',

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

    automod_status_title: '🤖 AutoMod 2.0 — {guildName}',
    automod_status_field_protection: '🛡️ Schutz',
    automod_status_active: '🟢 **AKTIV**',
    automod_status_inactive: '⚪ Deaktiviert',
    automod_status_field_smartmode: '🧠 Smart-Modus',
    automod_smartmode_on: '✨ **Aktiviert**',
    automod_smartmode_standard: '⚪ Standard',
    automod_status_field_risk: '📊 Risikostufe',
    automod_status_field_rules: '📋 Eigene Regeln',
    automod_status_rules_value: '**{count}** Regel(n)',
    automod_status_field_detectors: '⚡ Detektoren',
    automod_detector_spam: '💬 Anti-Spam',
    automod_detector_flood: '🌊 Anti-Flood',
    automod_detector_links: '🔗 Links',
    automod_detector_invites: '✉️ Einladungen',
    automod_detector_mentions: '📢 Erwähnungen',
    automod_detector_ghostping: '👻 Ghost Ping',
    automod_detector_caps: '🔠 GROSSSCHREIBUNG',
    automod_detector_keywords: '🚫 Verbotene Wörter',
    automod_detector_regex: '🧩 Regex',
    automod_detector_profiles: '👤 Profile',
    automod_status_field_strikes: '⚠️ Strike-Skala',
    automod_status_strikes_value: '{count} konfigurierte Stufe(n)',
    automod_status_disabled_notice: '⚫ Der Schutz ist **deaktiviert**: Die unten aufgeführten Detektoren sind konfiguriert, werden aber **derzeit nicht angewendet**. Aktiviere den Schutz mit `/automod toggle module:all activer:true`.',
    automod_status_footer: 'ETHONE Smart Moderation • Dashboard verfügbar unter /discord/moderation/automod',
    automod_alert_title: '🤖 AutoMod 2.0 Erkennung — {rule}',
    automod_alert_field_user: '👤 Nutzer',
    automod_alert_field_channel: '💬 Kanal',
    automod_alert_field_risk: '📊 Risk Score',
    automod_alert_field_actions: '⚡ Angewendete Aktionen',
    automod_alert_field_strikes: '⚠️ Aktive Strikes',
    automod_alert_field_preview: '📝 Nachrichtenvorschau',
    automod_alert_action_none: '`LOG`',
    automod_alert_footer: 'ETHONE Smart Moderation Engine',
    automod_test_missing_message: '❌ Bitte gib die Testnachricht an.',
    automod_test_title: '🧪 AutoMod Sandbox — Regeltest',
    automod_test_field_message: '📝 Getestete Nachricht',
    automod_test_field_score: '📊 Simulierter Risk Score',
    automod_test_score_value: '**{score}/100** (`{level}`)',
    automod_test_field_actions: '⚡ Simulierte Aktionen',
    automod_test_no_action: 'Keine Aktion',
    automod_test_field_strikes_added: '⚠️ Hinzugefügte Strikes',
    automod_test_field_detectors_triggered: '🔍 Ausgelöste Detektoren',
    automod_test_detectors_none: 'Keine',
    automod_test_rules_none: 'Keine',
    automod_test_footer: 'Sandbox-Simulation: Es wurde keine Sanktion angewendet',
    automod_smartmode_toggle_on: '🧠 **Smart-Modus AKTIVIERT!** Die Schwellenwerte passen sich bei Angriffen automatisch an den Ereignisfluss an.',
    automod_smartmode_toggle_off: '🧠 **Smart-Modus DEAKTIVIERT!** Es gelten die normalen statischen Schwellenwerte.',
    automod_toggle_label_all: 'AutoMod (gesamte Engine)',
    automod_toggle_label_spam: 'Anti-Spam',
    automod_toggle_label_flood: 'Anti-Flood',
    automod_toggle_label_links: 'Link-Filter',
    automod_toggle_label_invites: 'Einladungs-Filter',
    automod_toggle_label_mentions: 'Anti-Erwähnungs-Spam',
    automod_toggle_label_ghostping: 'Anti-Ghost-Ping',
    automod_toggle_label_caps: 'Anti-GROSSSCHREIBUNG',
    automod_toggle_label_keywords: 'Verbotene Wörter',
    automod_toggle_label_regex: 'Regex-Regeln',
    automod_toggle_label_profiles: 'Profil-Filter',
    automod_toggle_label_strikes: 'Strikes & progressive Sanktionen',
    automod_toggle_unknown_module: '❌ Unbekanntes Modul: `{module}`.',
    automod_toggle_state_on: 'aktiviert',
    automod_toggle_state_off: 'deaktiviert',
    automod_toggle_success: '{emoji} **{label}** {state}.',
    automod_toggle_disabled_note: '\n⚠️ Hinweis: Die globale AutoMod-Engine ist derzeit deaktiviert (`/automod toggle module:all activer:True` zum Reaktivieren) — diese Einstellung wirkt sich erst aus, sobald AutoMod wieder aktiv ist.',
    automod_usage_fallback: 'Verwendung: `/automod status`, `/automod test <message>`, `/automod smartmode <activer>`, `/automod toggle <module> <activer>`',

    events_list_empty_title: '🗓️ Keine anstehenden Events',
    events_list_empty_desc: 'Derzeit sind keine Events geplant.\nNutze das ETHONE-Dashboard, um eines zu planen!',
    events_list_title: '🗓️ Anstehende Events • {guildName}',
    events_list_desc: 'Hier sind die nächsten **{count}** Events:',
    events_list_field_value: '📅 <t:{start}:F> (<t:{start}:R>)\n👥 **{capStr}** • 📍 {locationStr}\nStatus: `{status}`',
    events_participants_suffix: '{count} Teilnehmer',
    events_missing_id: '❌ Bitte gib eine gültige Event-ID an.',
    events_not_found: '❌ Event `{id}` nicht gefunden.',
    events_rsvp_usage: '❌ Verwendung: `/event rsvp event_id:<id> status:<GOING|MAYBE|NOT_GOING>`',
    events_generic_error_prefix: '❌ {error}',
    events_rsvp_error_fallback: 'Fehler bei der RSVP-Verarbeitung.',
    events_rsvp_success_title: '✅ Anmeldung aktualisiert!',
    events_rsvp_success_desc: 'Dein Status für das Event **{eventId}** ist jetzt: **{status}**.\n{message}',
    events_checkin_usage: '❌ Verwendung: `/event checkin event_id:<id>`',
    events_checkin_success_title: '🎟️ Anwesenheit bestätigt!',
    events_checkin_success_desc: 'Deine Anwesenheit beim Event wurde bestätigt.\nDanke fürs Mitmachen!',
    events_post_permission_denied: '❌ Du benötigst die Berechtigung `Events verwalten`, um dieses Panel zu veröffentlichen.',
    events_channel_not_found: '❌ Textkanal nicht gefunden.',
    events_post_success: '✅ Event-Panel in <#{channelId}> veröffentlicht!',
    events_unknown_subcommand: '❌ Unbekannter Unterbefehl. Verwende `/event list` oder `/event info`.',
    events_rsvp_status_going: '✅ Bestätigt (Going)',
    events_rsvp_status_maybe: '🤔 Vielleicht (Maybe)',
    events_rsvp_status_notgoing: '❌ Nimmt nicht teil',
    events_rsvp_status_waitlist: '⏳ Auf der Warteliste',
    events_rsvp_button_success: '🎉 {message}\nDein aktueller Status: **{statusLabel}**.',
    events_checkin_button_success: '🎟️ **Check-in bestätigt!**\n{message}',
    events_status_scheduled: '🗓️ Geplant',
    events_status_live: '🔴 LIVE',
    events_status_completed: '✅ Beendet',
    events_status_cancelled: '❌ Abgesagt',
    events_location_unspecified: 'Nicht angegeben',
    events_location_voice_default: 'Sprachkanal',
    events_location_stage_default: 'Bühnenkanal',
    events_location_text_default: 'Textkanal',
    events_location_external_default: 'Externer Link',
    events_capacity_full_suffix: '🔴 (Voll)',
    events_panel_field_datetime: '📅 Datum & Uhrzeit',
    events_panel_field_location: '📍 Ort',
    events_panel_field_status: '👥 Status & Anmeldungen',
    events_panel_datetime_value: '<t:{start}:F>\n<t:{start}:R>\nEnde: <t:{end}:t>',
    events_panel_status_value: '**Status:** {statusText}\n**Bestätigt:** {capacityStr}\n**Vielleicht:** {maybeCount}',
    events_panel_waitlist_line: '\n**Warteliste:** {count}',
    events_panel_footer: 'ETHONE Events 2.0 • ID: {id}',
    events_panel_no_description: '*Keine Beschreibung angegeben.*',
    events_btn_waitlist_label: 'Warteliste ({count})',
    events_btn_going_label: 'Teilnehmen ({count})',
    events_btn_maybe_label: 'Vielleicht ({count})',
    events_btn_not_going_label: 'Nimmt nicht teil',
    events_btn_checkin_label: 'Check-in',
    events_btn_details_label: 'Details & Kalender',

    giveaway_slash_only: 'Dieser Befehl muss als Slash Command ausgeführt werden.',
    giveaway_invalid_channel: '❌ Bitte gib einen gültigen Textkanal an.',
    giveaway_start_success: '✅ Gewinnspiel für **{prize}** erfolgreich gestartet in <#{channelId}>! (ID: `{id}`)',
    giveaway_not_found: '❌ Gewinnspiel auf diesem Server nicht gefunden.',
    giveaway_end_success: '🎉 Gewinnspiel erfolgreich beendet! Gewinner: {winners}',
    giveaway_no_eligible_participant: 'Keine berechtigten Teilnehmer.',
    giveaway_reroll_success: '🎲 Reroll abgeschlossen! Neue(r) Gewinner: {winners}',
    giveaway_no_other_participant: 'Keine weiteren Teilnehmer verfügbar.',
    giveaway_cancel_success: '❌ Das Gewinnspiel wurde erfolgreich abgebrochen.',
    giveaway_list_empty: 'ℹ️ Auf diesem Server ist derzeit kein Gewinnspiel aktiv.',
    giveaway_list_title: '🎁 Aktive Gewinnspiele • {guildName}',
    giveaway_list_item: '• **{prize}** (<#{channelId}>) — `{count}` Teilnehmer — Ende: <t:{end}:R>\n  ID: `{id}`',
    giveaway_list_footer: 'Um ein Gewinnspiel zu beenden: /giveaway end <id>',
    giveaway_claim_not_eligible: '❌ Dieses Gewinnspiel ist nicht zur Abholung berechtigt.',
    giveaway_claim_not_winner: '⛔ Du gehörst nicht zu den ausgewählten Gewinnern für diesen Preis.',
    giveaway_claim_already_done: '✅ Du hast deinen Gewinn bereits bestätigt.',
    giveaway_claim_success: '🎉 **Abholung bestätigt!** Die Organisatoren wurden über deine Bestätigung informiert.',
    giveaway_default_description: 'Klicke auf den Button unten, um am Gewinnspiel teilzunehmen!',
    giveaway_embed_ended_title: '🎉 GEWINNSPIEL BEENDET: {prize}',
    giveaway_embed_ended_desc: 'Dieses Gewinnspiel ist jetzt beendet.\n\n🏆 **Gewinner:** {winners}\n\n🎁 **Gewonnener Preis:** {prize}\n👥 **Teilnehmer insgesamt:** `{count}`\n👤 **Veranstaltet von:** <@{hostId}>',
    giveaway_embed_cancelled_title: '❌ GEWINNSPIEL ABGEBROCHEN: {prize}',
    giveaway_embed_cancelled_desc: 'Dieses Gewinnspiel wurde von einem Administrator abgebrochen.',
    giveaway_embed_active_title: '🎁 GEWINNSPIEL: {prize}',
    giveaway_embed_active_desc: '{description}\n\n🏆 **Gewinner:** `{winnerCount}`\n⏰ **Ende:** <t:{endTimestamp}:R> (<t:{endTimestamp}:f>)\n👤 **Veranstaltet von:** <@{hostId}>\n👥 **Teilnehmer:** `{participantsCount}`',
    giveaway_req_roles_required: '\n• Erforderliche Rolle(n): {roles}',
    giveaway_req_roles_excluded: '\n• Ausgeschlossene Rolle(n): {roles}',
    giveaway_req_min_age: '\n• Mindest-Kontoalter: `{days} Tag(e)`',
    giveaway_req_min_level: '\n• Mindest-XP-Level: `Level {level}`',
    giveaway_req_prefix: '\n\n🛡️ **Teilnahmebedingungen:**',
    giveaway_btn_enter: '🎉 Teilnehmen ({count})',
    giveaway_btn_claim: '🎁 Meinen Preis abholen',
    giveaway_elig_excluded_role: 'Du hast eine vom Gewinnspiel ausgeschlossene Rolle.',
    giveaway_elig_missing_all_roles: 'Du hast nicht alle erforderlichen Rollen, um teilzunehmen.',
    giveaway_elig_missing_any_role: 'Du hast keine der erforderlichen Rollen, um teilzunehmen.',
    giveaway_elig_min_age: 'Dein Discord-Konto muss mindestens {days} Tag(e) alt sein.',
    giveaway_elig_min_level: 'Du musst mindestens **Level {level}** erreicht haben (aktuelles Level: {userLevel}).',
    giveaway_not_active: '❌ Dieses Gewinnspiel ist nicht mehr aktiv.',
    giveaway_left: '👋 Du nimmst nicht mehr an diesem Gewinnspiel teil.',
    giveaway_participation_denied: '⛔ **Teilnahme abgelehnt:**\n{reason}',
    giveaway_join_success: '🎉 **Glückwunsch!** Deine Teilnahme am Gewinnspiel wurde registriert.',
    giveaway_announce_winners: '🎉 Glückwunsch {mentions}! Du hast das Gewinnspiel für **{prize}** gewonnen! 🎁',
    giveaway_announce_no_winner: '⚠️ Für das Gewinnspiel **{prize}** konnte kein Gewinner ausgewählt werden (keine berechtigten Teilnehmer).',
    giveaway_dm_winner: '🎉 **Glückwunsch!** Du hast das Gewinnspiel **{prize}** auf **{guildName}** gewonnen!',

    suggest_slash_only: 'Bitte nutze den Slash-Befehl `/suggest`, um eine Idee einzureichen.',
    suggest_module_disabled: '❌ Das Vorschlagssystem ist auf diesem Server derzeit deaktiviert.',
    suggest_no_channel_configured: '❌ Es wurde kein Vorschlagskanal von den Administratoren eingerichtet.',
    suggest_published_success: '✅ Dein Vorschlag **#{numericId}** wurde erfolgreich in <#{channelId}> veröffentlicht!',
    suggest_generic_error: '❌ Fehler: {error}',
    suggest_modal_title: 'Einen Vorschlag einreichen',
    suggest_modal_title_label: 'Titel deiner Idee',
    suggest_modal_title_placeholder: 'Z. B.: Einen eigenen Gaming-Kanal hinzufügen...',
    suggest_modal_desc_label: 'Ausführliche Beschreibung',
    suggest_modal_desc_placeholder: 'Erkläre, warum diese Idee nützlich wäre und wie sie funktionieren würde...',
    suggest_modal_category_label: 'Kategorie (optional)',
    suggest_modal_category_placeholder: 'Z. B.: Allgemein, Server, Bot, Events...',
    suggest_not_found: '❌ Vorschlag nicht gefunden.',
    suggest_upvote_removed: '↩️ Dein Upvote wurde entfernt.',
    suggest_upvote_added: '👍 Dein Upvote wurde gezählt!',
    suggest_downvote_removed: '↩️ Dein Downvote wurde entfernt.',
    suggest_downvote_added: '👎 Dein Downvote wurde gezählt!',
    suggest_follow_on: '🔔 Du folgst diesem Vorschlag jetzt. Du wirst bei jedem Update benachrichtigt!',
    suggest_follow_off: '🔕 Du folgst diesem Vorschlag nicht mehr.',
    suggest_comment_modal_title: 'Kommentar hinzufügen',
    suggest_comment_input_label: 'Dein Kommentar / konstruktives Feedback',
    suggest_comment_input_placeholder: 'Teile deine Meinung zu dieser Idee...',
    suggest_comment_added: '💬 Dein Kommentar wurde hinzugefügt!',
    suggest_submitted_success: '✅ Dein Vorschlag **#{numericId}** wurde eingereicht und im dafür vorgesehenen Kanal veröffentlicht!',
    suggest_default_category: 'Allgemein',
    suggest_status_pending: 'Ausstehend',
    suggest_status_under_review: 'In Prüfung',
    suggest_status_planned: 'Geplant',
    suggest_status_accepted: 'Angenommen',
    suggest_status_in_progress: 'In Bearbeitung',
    suggest_status_completed: 'Umgesetzt',
    suggest_status_rejected: 'Abgelehnt',
    suggest_status_duplicate: 'Duplikat',
    suggest_status_on_hold: 'Pausiert',
    suggest_embed_author: 'Vorschlag #{numericId} • Von {authorTag}',
    suggest_field_status: 'Status',
    suggest_field_category: 'Kategorie',
    suggest_field_score: 'Punktzahl',
    suggest_score_value: '👍 {up}  •  👎 {down}  (Punktzahl: **{score}**)',
    suggest_staff_response_field: '💬 Antwort des Teams ({responderTag})',
    suggest_default_moderator: 'Moderator',
    suggest_duplicate_field_value: 'Dieser Vorschlag wurde als Duplikat von Vorschlag #{dupId} markiert.',
    suggest_embed_footer: 'ID: {id} • {count} Kommentar(e)',
    suggest_btn_comment: '💬 Kommentieren ({count})',
    suggest_btn_follow: '🔔 Folgen ({count})',
    suggest_no_channel_error: 'Auf diesem Server ist kein Vorschlagskanal konfiguriert.',
    suggest_thread_name: 'Diskussion #{numericId}: {title}',
    suggest_dm_update: '🔔 **Update zu Vorschlag #{numericId}**\nTitel: **{title}**\nNeuer Status: {emoji} **{label}**\n{responseLine}',
    suggest_dm_response_line: 'Offizielle Antwort: *"{response}"*\n',

    leveling_module_disabled: '⚠️ Das Levelsystem ist auf diesem Server derzeit deaktiviert.',
    leveling_rank_author: 'Fortschritt von {username}',
    leveling_field_rank: '🏆 Rang',
    leveling_field_level: '⭐ Level',
    leveling_field_messages: '💬 Nachrichten',
    leveling_field_progress: '📊 Fortschritt zum nächsten Level',
    leveling_progress_value: '`{bar}` **{percent}%**\n`{cur} / {next} XP` (Gesamt: {total} XP)',
    leveling_rank_footer: '{guildName} • Levelsystem',
    leveling_leaderboard_empty: '📜 Auf diesem Server hat noch niemand Erfahrung gesammelt.',
    leveling_leaderboard_title: '🏆 Aktivitäts-Bestenliste • {guildName}',
    leveling_leaderboard_line: '{medal} <@{userId}> — **Level {level}** (`{xp} XP`)',
    leveling_leaderboard_footer: 'Die vollständige Bestenliste findest du im Web-Dashboard',
    leveling_levelup_title: '⭐ Levelaufstieg!',
    leveling_levelup_roles_unlocked: '🎁 **Freigeschaltete Rolle(n):** {roles}',
    leveling_xp_add_success: '✅ **+{amount} XP** zu <@{userId}> hinzugefügt. Neuer Gesamtwert: **{total} XP** (Level {level}).',
    leveling_xp_remove_success: '✅ **-{amount} XP** von <@{userId}> entfernt. Neuer Gesamtwert: **{total} XP** (Level {level}).',
    leveling_xp_set_success: '✅ XP von <@{userId}> auf **{total} XP** gesetzt (Level {level}).',
    leveling_xp_reset_success: '🗑️ Erfahrung und Level von <@{userId}> wurden erfolgreich zurückgesetzt.',

    antiraid_status_title: '🛡️ Anti-Raid-Zentrale 2.0 — {guildName}',
    antiraid_field_risk_score: '📊 Risk Score',
    antiraid_field_raidmode: '🚨 Raid Mode',
    antiraid_raidmode_active: '🔥 **AKTIVIERT**',
    antiraid_raidmode_normal: '🟢 Normal',
    antiraid_field_lockdown: '🔒 Sperrung (Lockdown)',
    antiraid_lockdown_active: '🔴 Aktiv ({count} Kanäle)',
    antiraid_lockdown_inactive: '🟢 Inaktiv',
    antiraid_field_joins: '📥 Beitritte (60s)',
    antiraid_joins_value: '{count} Beitritte',
    antiraid_field_messages: '💬 Nachrichten (60s)',
    antiraid_messages_value: '{count} Nachrichten',
    antiraid_field_mentions: '🔔 Erwähnungen (60s)',
    antiraid_mentions_value: '{count} Erwähnungen',
    antiraid_status_footer: 'ETHONE Anti-Raid Engine 2.0 • Web-Dashboard verfügbar',
    antiraid_alert_desc: '**Bedrohungsstufe:** `{threatLevel}`\n**Risk Score:** `{riskScore}/100`',
    antiraid_alert_field_reason: '🚨 Auslösegrund',
    antiraid_alert_field_signals: '📊 Erkannte verdächtige Signale',
    antiraid_alert_field_actions: '⚡ Ausgeführte Schutzmaßnahmen',
    antiraid_alert_signals_none: '• Keine zusätzliche Anomalie',
    antiraid_alert_actions_none: '✓ `LOG_EVENT`',
    antiraid_alert_footer: 'Vorfall-ID: {incidentId} • ETHONE Anti-Raid 2.0',
    antiraid_alert_ping: '🚨 **Anti-Raid-Sicherheitswarnung**',
    antiraid_raidmode_reason: 'Ausgelöst von {tag}',
    antiraid_lockdown_reason: 'Notfall-Lockdown von {tag}',
    antiraid_raidmode_on_success: '🚨 **Raid Mode AKTIVIERT!** Notfallschutzmaßnahmen sind jetzt aktiv.',
    antiraid_raidmode_off_success: '🔓 **Raid Mode DEAKTIVIERT.** Zurück zur Standardkonfiguration.',
    antiraid_lockdown_on_success: '🔒 **Lockdown AKTIVIERT!** {count} Textkanal/Textkanäle gesperrt.',
    antiraid_lockdown_off_success: '🔓 **Lockdown AUFGEHOBEN!** {count} Kanal/Kanäle entsperrt.',
    antiraid_usage_fallback: 'Verwendung: `/antiraid status`, `/antiraid raidmode <activer>`, `/antiraid lockdown <activer>`',
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
