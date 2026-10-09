/**
 * Catalogue des protections (modèle Keeper) : une seule source de vérité, lue par le moteur et envoyée telle quelle au
 * tableau de bord. Toutes les protections sont gratuites sur Etho.
 */

export type Punish = 'none' | 'timeout' | 'derank' | 'kick' | 'ban';

export type ProtectionKind =
  | 'quota' // « Si un même membre fait N actions en moins de X » (N = 1 : « Dès qu'un membre… »)
  | 'watched' // permissions / rôles surveillés (ajout ou retrait)
  | 'link'
  | 'words'
  | 'toxicity'
  | 'scam'
  | 'alt'
  | 'rollback'
  | 'reorder';

/** Réglage propre à une protection, affiché dans « Détection ». */
export type SpecificKind =
  | 'webhookAction'
  | 'maxPerMessage'
  | 'ghostPing'
  | 'textWall'
  | 'duplicate'
  | 'emojiAbuse';

export interface ProtectionDef {
  key: string;
  label: string;
  category: string;
  description: string;
  kind: ProtectionKind;
  specific?: SpecificKind;
  /** Verbe et nom pour la phrase « Si un même membre {verb} {N} {noun} en moins de {X} ». */
  verb?: string;
  noun?: [string, string];
  /** Ce qu'Etho répare après coup (ligne verte de la carte). */
  aftermath?: string;
  /** Le message en cause est supprimé (protections de messages). */
  deletesMessage?: boolean;
  /** Verrouiller le serveur est conseillé ici (badge). */
  lockdownAdvised?: boolean;
  /** Exceptions par salon / catégorie en plus des membres et rôles. */
  channelExempt?: boolean;
  /** Pas de « Limite de la whitelist » (protections sans seuil). */
  noWhitelistLimit?: boolean;
  defaults: Record<string, unknown>;
}

const M = 60;

export const PROTECTION_CATEGORIES = [
  'Sanctions en série',
  'Salons',
  'Rôles et permissions',
  'Bots et intégrations',
  'Vocal',
  'Serveur',
  'Messages',
  'Arrivées',
  'Sauvegarde',
  'Modules supplémentaires',
] as const;

const nuke = (quotaMax: number, quotaSeconds: number) => ({ quotaMax, quotaSeconds, punish: 'derank' as Punish });
const msg = (quotaMax: number, quotaSeconds: number) => ({ quotaMax, quotaSeconds, punish: 'timeout' as Punish, timeoutSeconds: 10 * M });

export const PROTECTIONS: ProtectionDef[] = [
  // Sanctions en série
  { key: 'antiBan', label: 'Anti-ban', category: 'Sanctions en série', description: 'Détecte les bans en cascade par un même modérateur.', kind: 'quota', verb: 'bannit', noun: ['membre', 'membres'], aftermath: 'Toutes les personnes bannies pendant la rafale sont débannies.', defaults: nuke(5, 10 * M) },
  { key: 'antiKick', label: 'Anti-kick', category: 'Sanctions en série', description: 'Détecte les kicks en cascade par un même modérateur.', kind: 'quota', verb: 'expulse', noun: ['membre', 'membres'], aftermath: 'Les membres expulsés reçoivent une invitation de retour en message privé.', defaults: nuke(5, 10 * M) },
  { key: 'antiTimeout', label: 'Anti-timeout', category: 'Sanctions en série', description: 'Détecte les timeouts en cascade par un même modérateur.', kind: 'quota', verb: 'met en timeout', noun: ['membre', 'membres'], aftermath: 'Les timeouts de la rafale sont levés.', defaults: nuke(5, 10 * M) },

  // Salons
  { key: 'antiChannelCreate', label: 'Anti-création de salon', category: 'Salons', description: 'Détecte la création abusive de salons.', kind: 'quota', verb: 'crée', noun: ['salon', 'salons'], aftermath: "Les salons créés pendant l'attaque sont supprimés.", channelExempt: true, defaults: nuke(1, 5 * M) },
  { key: 'antiChannelDelete', label: 'Anti-suppression de salon', category: 'Salons', description: 'Détecte la suppression abusive de salons.', kind: 'quota', verb: 'supprime', noun: ['salon', 'salons'], aftermath: 'Les salons supprimés sont recréés avec leurs permissions.', lockdownAdvised: true, channelExempt: true, defaults: nuke(1, 5 * M) },
  { key: 'antiChannelUpdate', label: 'Anti-modification de salon', category: 'Salons', description: 'Détecte les modifications massives de salons.', kind: 'quota', verb: 'modifie', noun: ['salon', 'salons'], aftermath: 'Les salons retrouvent leur nom, description et permissions.', channelExempt: true, defaults: nuke(1, 10 * M) },

  // Rôles et permissions
  { key: 'antiRoleCreate', label: 'Anti-création de rôle', category: 'Rôles et permissions', description: 'Détecte la création abusive de rôles.', kind: 'quota', verb: 'crée', noun: ['rôle', 'rôles'], aftermath: 'Les rôles créés sont supprimés.', defaults: nuke(1, 5 * M) },
  { key: 'antiRoleDelete', label: 'Anti-suppression de rôle', category: 'Rôles et permissions', description: 'Détecte la suppression abusive de rôles.', kind: 'quota', verb: 'supprime', noun: ['rôle', 'rôles'], aftermath: 'Les rôles supprimés sont recréés avec les mêmes réglages et rendus à leurs membres.', lockdownAdvised: true, defaults: nuke(1, 5 * M) },
  { key: 'antiRoleUpdate', label: 'Anti-modification de rôle', category: 'Rôles et permissions', description: 'Détecte les modifications massives de rôles.', kind: 'quota', verb: 'modifie', noun: ['rôle', 'rôles'], aftermath: 'Les rôles retrouvent leur nom, couleur et permissions.', defaults: nuke(1, 10 * M) },
  { key: 'antiRoleAdd', label: 'Anti-ajout de rôle', category: 'Rôles et permissions', description: 'Surveille les rôles sensibles et les permissions critiques ajoutées.', kind: 'watched', verb: 'donne un rôle à permission sensible', aftermath: 'Le rôle donné est retiré immédiatement.', noWhitelistLimit: true, defaults: { punish: 'derank', watchedPerms: [], watchedRoles: [] } },
  { key: 'antiRoleRemove', label: 'Anti-retrait de rôle', category: 'Rôles et permissions', description: 'Détecte le retrait de rôles protégés ou à permissions sensibles.', kind: 'watched', verb: 'retire un rôle à permission sensible', aftermath: 'Le rôle retiré est rendu à la victime.', noWhitelistLimit: true, defaults: { punish: 'derank', watchedPerms: [], watchedRoles: [] } },
  { key: 'antiRoleMass', label: 'Anti-rôle de masse', category: 'Rôles et permissions', description: "Détecte les attributions massives d'un même rôle.", kind: 'quota', verb: 'donne le même rôle à', noun: ['membre', 'membres'], aftermath: 'Le rôle est retiré aux membres de la rafale.', defaults: nuke(20, 10 * M) },
  { key: 'antiReorganisation', label: 'Anti-réorganisation de rôle', category: 'Rôles et permissions', description: "Bloque les changements de position des rôles. Discord n'indique pas qui déplace un rôle : il est remis en place sans sanction.", kind: 'reorder', noWhitelistLimit: true, defaults: { punish: 'none' } },

  // Bots et intégrations
  { key: 'antiBot', label: 'Anti-bot', category: 'Bots et intégrations', description: "Détecte l'ajout de bots non autorisés.", kind: 'quota', verb: 'ajoute', noun: ['bot', 'bots'], aftermath: 'Le bot ajouté est banni.', defaults: nuke(1, 10 * M) },
  { key: 'antiWebhook', label: 'Anti-webhook', category: 'Bots et intégrations', description: 'Détecte la création abusive de webhooks.', kind: 'quota', specific: 'webhookAction', verb: 'crée', noun: ['webhook', 'webhooks'], channelExempt: true, defaults: { ...nuke(1, 10 * M), webhookAction: 'delete' } },
  { key: 'antiWebhookUpdate', label: 'Anti-modification de webhook', category: 'Bots et intégrations', description: "Remet le nom, l'avatar et le salon d'un webhook modifié et sanctionne l'auteur.", kind: 'quota', verb: 'modifie', noun: ['webhook', 'webhooks'], aftermath: 'Les webhooks modifiés retrouvent leur nom, leur avatar et leur salon.', channelExempt: true, defaults: nuke(3, 10 * M) },
  { key: 'antiThreadCreate', label: 'Anti-thread', category: 'Bots et intégrations', description: 'Détecte la création abusive de fils.', kind: 'quota', verb: 'crée', noun: ['fil', 'fils'], aftermath: "Les fils créés pendant l'attaque sont supprimés.", channelExempt: true, defaults: nuke(1, 1 * M) },

  // Vocal
  { key: 'antiMuteVoc', label: 'Anti-mute vocal', category: 'Vocal', description: 'Détecte les mutes vocaux en masse.', kind: 'quota', verb: 'mute en vocal', noun: ['membre', 'membres'], aftermath: 'Les membres mutés retrouvent la parole.', defaults: msg(5, 1 * M) },
  { key: 'antiSourdineVoc', label: 'Anti-sourdine vocal', category: 'Vocal', description: 'Détecte les mises en sourdine vocale en masse.', kind: 'quota', verb: 'met en sourdine', noun: ['membre', 'membres'], aftermath: 'Les membres retrouvent le son.', defaults: msg(5, 1 * M) },
  { key: 'antiDecoUser', label: 'Anti-déconnexion vocale', category: 'Vocal', description: 'Détecte les déconnexions vocales en masse.', kind: 'quota', verb: 'déconnecte du vocal', noun: ['membre', 'membres'], defaults: msg(5, 1 * M) },
  { key: 'antiDeplUser', label: 'Anti-déplacement vocal', category: 'Vocal', description: 'Détecte les déplacements vocaux en masse.', kind: 'quota', verb: 'déplace en vocal', noun: ['membre', 'membres'], defaults: msg(5, 1 * M) },

  // Serveur
  { key: 'antiUpdateGuild', label: 'Anti-modification du serveur', category: 'Serveur', description: 'Détecte la modification du serveur, de son nom ou de son icône.', kind: 'quota', verb: 'modifie les réglages du serveur', noun: ['fois', 'fois'], aftermath: 'Etho remet les anciens réglages du serveur quand c’est possible.', lockdownAdvised: true, defaults: nuke(1, 10 * M) },
  { key: 'antiExpression', label: 'Anti-expression', category: 'Serveur', description: "Détecte la suppression d'emojis et de stickers.", kind: 'quota', verb: 'supprime', noun: ['emoji ou sticker', 'emojis ou stickers'], aftermath: 'Etho remet en ligne ce qui a été supprimé.', defaults: nuke(5, 10 * M) },

  // Messages
  { key: 'antiLink', label: 'Anti-lien', category: 'Messages', description: 'Bloque les liens publiés sans whitelist.', kind: 'link', verb: 'publie un lien', aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, noWhitelistLimit: true, defaults: { punish: 'none', timeoutSeconds: 10 * M, linkTypes: ['general', 'discord'], allowedDomains: [], enforcement: 'bot' } },
  { key: 'antiSpam', label: 'Anti-spam', category: 'Messages', description: 'Détecte le flood de messages et bloque le spam.', kind: 'quota', verb: 'envoie', noun: ['message', 'messages'], aftermath: 'Les messages de la rafale sont supprimés.', deletesMessage: true, channelExempt: true, defaults: msg(5, 8) },
  { key: 'antiBadWord', label: 'Anti-BadWord', category: 'Messages', description: 'Bloque les messages contenant des mots interdits configurables.', kind: 'words', verb: 'écrit un mot interdit', aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, noWhitelistLimit: true, defaults: { punish: 'none', timeoutSeconds: 10 * M, bannedWords: [], enforcement: 'bot' } },
  { key: 'antiMentionUsers', label: 'Anti-mention membres', category: 'Messages', description: 'Bloque les messages mentionnant trop de membres.', kind: 'quota', specific: 'maxPerMessage', verb: 'envoie', noun: ['message', 'messages'], aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, defaults: { ...msg(5, 10), maxPerMessage: 5 } },
  { key: 'antiMentionRoles', label: 'Anti-mention rôles', category: 'Messages', description: 'Bloque les messages mentionnant trop de rôles.', kind: 'quota', specific: 'maxPerMessage', verb: 'envoie', noun: ['message', 'messages'], aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, defaults: { ...msg(3, 10), maxPerMessage: 3 } },
  { key: 'antiMentionEveryone', label: 'Anti-mention @everyone', category: 'Messages', description: 'Bloque les mentions globales non autorisées.', kind: 'quota', verb: 'mentionne @everyone ou @here', noun: ['fois', 'fois'], aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, defaults: msg(1, 10) },
  { key: 'antiGhostPing', label: 'Anti-ghost ping', category: 'Messages', description: "Repère les mentions supprimées juste après l'envoi, prévient les personnes visées et sanctionne l'auteur.", kind: 'quota', specific: 'ghostPing', verb: 'fait', noun: ['ghost ping', 'ghost pings'], aftermath: 'Etho indique dans le salon qui a mentionné qui.', channelExempt: true, defaults: { ...msg(3, 10 * M), ghostMaxAgeSeconds: 60, ghostNotify: true } },
  { key: 'antiTextWall', label: 'Anti-TextWall', category: 'Messages', description: 'Supprime les messages trop longs ou avec trop de lignes, et sanctionne les pavés répétés.', kind: 'quota', specific: 'textWall', verb: 'envoie', noun: ['pavé', 'pavés'], aftermath: "Chaque pavé est supprimé dès l'envoi, même avant la sanction.", deletesMessage: true, channelExempt: true, defaults: { ...msg(3, 1 * M), maxChars: 1500, maxLines: 20, ignoreCodeBlocks: false } },
  { key: 'antiDuplicateMessage', label: 'Anti-DuplicateMessage', category: 'Messages', description: "Repère le même message envoyé en boucle, efface les copies et sanctionne l'auteur.", kind: 'quota', specific: 'duplicate', verb: 'envoie', noun: ['fois le même message', 'fois le même message'], aftermath: 'Toutes les copies sont supprimées, dans tous les salons.', deletesMessage: true, channelExempt: true, defaults: { ...msg(3, 30), matchMode: 'similar', minLength: 2 } },
  { key: 'antiEmojiAbuse', label: 'Anti-EmojiAbuse', category: 'Messages', description: "Supprime les messages avec trop d'emojis et sanctionne les abus répétés.", kind: 'quota', specific: 'emojiAbuse', verb: 'envoie', noun: ["message avec trop d'emojis", "messages avec trop d'emojis"], aftermath: "Chaque message avec trop d'emojis est supprimé dès l'envoi.", deletesMessage: true, channelExempt: true, defaults: { ...msg(3, 1 * M), maxEmojis: 10, countCustom: true, countUnicode: true } },
  { key: 'antiScam', label: 'Anti-token grab', category: 'Messages', description: "Détecte et supprime les messages d'arnaque : faux Nitro, faux Steam, vol de compte.", kind: 'scam', verb: "publie une arnaque", aftermath: "Le message est supprimé. L'auteur n'est pas sanctionné, sauf si tu choisis une punition.", deletesMessage: true, channelExempt: true, noWhitelistLimit: true, defaults: { punish: 'none', timeoutSeconds: 10 * M } },
  { key: 'antiToxicity', label: 'Anti-toxicité', category: 'Messages', description: 'Analyse chaque message et sanctionne ceux dont le taux de toxicité dépasse ta limite, en français comme en anglais.', kind: 'toxicity', verb: 'atteint le taux de toxicité', aftermath: 'Le message est supprimé.', deletesMessage: true, channelExempt: true, noWhitelistLimit: true, defaults: { punish: 'timeout', timeoutSeconds: 10 * M, toxicityThreshold: 90, ignoreUntargeted: true } },
  { key: 'antiStickerAbuse', label: 'Anti-StickerAbuse', category: 'Messages', description: "Sanctionne l'envoi de stickers en rafale, même tous différents, et efface la rafale.", kind: 'quota', verb: 'envoie', noun: ['sticker', 'stickers'], aftermath: 'La rafale de stickers est supprimée.', deletesMessage: true, channelExempt: true, defaults: msg(4, 15) },

  // Arrivées
  { key: 'antiAlt', label: 'Anti-alt', category: 'Arrivées', description: 'Refuse les comptes Discord trop récents.', kind: 'alt', noWhitelistLimit: true, defaults: { punish: 'kick', minAccountAgeDays: 7, dmMessage: '' } },

  // Sauvegarde
  { key: 'rollback', label: 'Rollback & Backups', category: 'Sauvegarde', description: 'Capture le serveur régulièrement pour tout restaurer après un incident.', kind: 'rollback', noWhitelistLimit: true, defaults: { punish: 'none', backupIntervalHours: 24 } },

  // Modules supplémentaires
  { key: 'antiServerRename', label: 'Anti-renommage du serveur', category: 'Modules supplémentaires', description: "Remet l'ancien nom du serveur et sanctionne l'auteur d'un renommage.", kind: 'quota', verb: 'renomme le serveur', noun: ['fois', 'fois'], aftermath: "L'ancien nom du serveur est remis.", defaults: nuke(1, 10 * M) },
  { key: 'antiIconUpdate', label: "Anti-changement d'icône", category: 'Modules supplémentaires', description: "Remet l'ancienne icône du serveur et sanctionne l'auteur du changement.", kind: 'quota', verb: "change l'icône du serveur", noun: ['fois', 'fois'], aftermath: "L'ancienne icône est remise.", defaults: nuke(1, 10 * M) },
  { key: 'antiRoleRename', label: 'Anti-renommage de rôle', category: 'Modules supplémentaires', description: "Remet l'ancien nom d'un rôle renommé et sanctionne l'auteur.", kind: 'quota', verb: 'renomme', noun: ['rôle', 'rôles'], aftermath: 'Chaque rôle renommé retrouve son ancien nom.', defaults: nuke(1, 10 * M) },
  { key: 'antiChannelRename', label: 'Anti-renommage de salon', category: 'Modules supplémentaires', description: "Remet l'ancien nom d'un salon renommé et sanctionne l'auteur.", kind: 'quota', verb: 'renomme', noun: ['salon', 'salons'], aftermath: 'Chaque salon renommé retrouve son ancien nom.', channelExempt: true, defaults: nuke(1, 10 * M) },
  { key: 'antiEmojiDelete', label: "Anti-suppression d'emoji", category: 'Modules supplémentaires', description: "Recrée l'emoji supprimé et sanctionne l'auteur.", kind: 'quota', verb: 'supprime', noun: ['emoji', 'emojis'], aftermath: 'Chaque emoji supprimé est recréé avec le même nom.', defaults: nuke(1, 10 * M) },
  { key: 'antiEmojiRename', label: "Anti-renommage d'emoji", category: 'Modules supplémentaires', description: "Remet l'ancien nom d'un emoji renommé et sanctionne l'auteur.", kind: 'quota', verb: 'renomme', noun: ['emoji', 'emojis'], aftermath: 'Chaque emoji renommé retrouve son ancien nom.', defaults: nuke(1, 10 * M) },
  { key: 'antiInviteDelete', label: "Anti-suppression d'invitation", category: 'Modules supplémentaires', description: "Recrée l'invitation supprimée dans le même salon et sanctionne l'auteur.", kind: 'quota', verb: 'supprime', noun: ['invitation', 'invitations'], aftermath: 'Une nouvelle invitation est créée dans le même salon. Son lien est dans le log.', channelExempt: true, defaults: nuke(1, 10 * M) },
];

export const PROTECTION_KEYS = PROTECTIONS.map((p) => p.key);
export const getProtection = (key: string) => PROTECTIONS.find((p) => p.key === key);

/** Permissions surveillées par défaut (anti-ajout / anti-retrait de rôle) quand la liste est vide. */
export const DEFAULT_WATCHED_PERMS = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageWebhooks', 'BanMembers', 'KickMembers'];

/** Permissions retirées à tous les rôles par « Verrouiller le serveur ». */
export const LOCKDOWN_PERMS = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageWebhooks',
  'ManageGuildExpressions',
  'ManageEvents',
  'ManageThreads',
  'ManageMessages',
  'ManageNicknames',
  'BanMembers',
  'KickMembers',
  'ModerateMembers',
  'MentionEveryone',
  'MoveMembers',
  'MuteMembers',
  'DeafenMembers',
];


const PUNISH_TEXT: Record<Punish, string> = {
  none: "Etho prévient l'équipe",
  timeout: "Etho met l'auteur en timeout",
  derank: "Etho retire tous les rôles de l'auteur",
  kick: "Etho expulse l'auteur",
  ban: "Etho bannit l'auteur",
};
const dur = (s: number) => (s % 86400 === 0 ? `${s / 86400} j` : s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/** Protections de messages qui suppriment chaque message fautif tout de suite (les rafales attendent le seuil). */
const INSTANT_DELETE = new Set(['antiLink', 'antiBadWord', 'antiMentionUsers', 'antiMentionRoles', 'antiMentionEveryone', 'antiTextWall', 'antiEmojiAbuse', 'antiScam', 'antiToxicity']);
const FEMININE = new Set(['invitation']);

/** Phrase « Ce que fait Etho » (même texte que la console). */
export function describeProtection(
  def: ProtectionDef,
  s: { quotaMax?: number; quotaSeconds?: number; punish: Punish; timeoutSeconds: number; minAccountAgeDays?: number; maxPerMessage?: number; toxicityThreshold?: number }
): string {
  const sanction = PUNISH_TEXT[s.punish].replace('Etho ', '') + (s.punish === 'timeout' ? ` ${dur(s.timeoutSeconds)}` : '');
  const parts = [INSTANT_DELETE.has(def.key) ? 'supprime le message' : '', s.punish === 'none' ? '' : sanction].filter(Boolean);
  const action = parts.length ? `Etho ${parts.join(' et ')}` : "Etho prévient l'équipe";
  if (def.key === 'antiReorganisation') return "Dès qu'un rôle est déplacé dans la liste, Etho le remet à sa place.";
  switch (def.kind) {
    case 'quota': {
      const n = s.quotaMax ?? 1;
      const extra = def.specific === 'maxPerMessage' ? ` mentionnant plus de ${s.maxPerMessage} ${def.key === 'antiMentionRoles' ? 'rôles' : 'membres'}` : '';
      if (n === 1) {
        const one = def.noun && def.noun[0] !== 'fois' ? ` ${FEMININE.has(def.noun[0]) ? 'une' : 'un'} ${def.noun[0]}` : '';
        return `Dès qu'un membre ${def.verb}${one}${extra}, ${action}.`;
      }
      return `Si un même membre ${def.verb} ${n} ${def.noun?.[1] ?? 'fois'}${extra} en moins de ${dur(s.quotaSeconds ?? 60)}, ${action}.`;
    }
    case 'alt':
      return `Dès qu'un compte créé il y a moins de ${s.minAccountAgeDays ?? 7} jours rejoint, Etho lui envoie un message privé${s.punish === 'none' ? " et prévient l'équipe" : ` puis ${sanction.replace("l'auteur", 'le compte')}`}.`;
    case 'toxicity':
      return `Dès qu'un message atteint un taux de toxicité de ${s.toxicityThreshold ?? 90} %, ${action}.`;
    case 'rollback':
      return 'Etho prend régulièrement une photo complète du serveur pour tout restaurer après un incident.';
    default:
      return `Dès qu'un membre ${def.verb}, ${action}.`;
  }
}

/** Base posée quand on allume le module « Protections » sans rien d'actif (sanctions par défaut de chaque protection). */
export const RECOMMENDED_PROTECTIONS = ['antiBan', 'antiKick', 'antiChannelDelete', 'antiRoleDelete', 'antiRoleAdd', 'antiBot', 'antiWebhook', 'antiSpam', 'antiMentionEveryone', 'antiScam'];
