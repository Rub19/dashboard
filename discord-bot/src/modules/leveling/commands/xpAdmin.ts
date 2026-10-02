import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { xpWriteBuffer } from '../storage/xpWriteBuffer.js';
import { LevelCalculator } from '../services/levelCalculator.js';
import { logService } from '../../logs/services/logService.js';
import { formatString, getTranslation } from '../../../utils/i18n.js';
import { AttachmentBuilder } from 'discord.js';
import { levelingStorage } from '../storage/levelingStorage.js';
import { RankCardStyleSchema } from '../types/levelingConfig.js';
import { renderRankCardFor } from '../services/rankCardService.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';
import { CARD_AVATAR_SHAPES, CARD_FONTS, CARD_FONT_LABEL, CARD_SHAPE_LABEL, parseHexColor } from '../../welcome/types/welcomeConfig.js';

/** /xp carte : applique les options données, enregistre, puis montre la carte de l'auteur avec le nouveau style. */
async function editRankCard(ctx: CommandContext, interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = ctx.guild!;
  const o = interaction.options;
  const errors: string[] = [];
  const config = levelingStorage.getConfig(guild.id);
  const style: Record<string, unknown> = o.getBoolean('reinitialiser') ? {} : { ...config.rankCard };
  let accent = config.accentColor;
  const color = (opt: string, apply: (v: string) => void) => {
    const raw = o.getString(opt);
    if (raw === null) return;
    const v = parseHexColor(raw);
    if (v) apply(v);
    else errors.push(`\`${opt}\` : « ${raw} » n'est pas une couleur (format #RRGGBB).`);
  };
  color('couleur', (v) => (accent = v));
  color('fond_couleur', (v) => (style.backgroundColor = v));
  color('texte_couleur', (v) => (style.textColor = v));
  const fond = o.getString('fond');
  if (fond !== null) {
    if (/^(aucun|non|none|-)$/i.test(fond.trim())) style.backgroundUrl = null;
    else if (/^https:\/\/\S+$/i.test(fond.trim())) style.backgroundUrl = fond.trim();
    else errors.push('`fond` : il faut un lien qui commence par https:// (ou « aucun »).');
  }
  const voile = o.getInteger('voile');
  if (voile !== null) style.overlayOpacity = voile;
  const police = o.getString('police');
  if (police !== null) style.font = police;
  const avatar = o.getString('avatar');
  if (avatar !== null) style.avatarShape = avatar;

  await ctx.deferReply({ ephemeral: true });
  const rankCard = RankCardStyleSchema.parse(style);
  const changed = JSON.stringify(rankCard) !== JSON.stringify(config.rankCard) || accent !== config.accentColor;
  if (changed) {
    const updated = levelingStorage.updateConfig(guild.id, { rankCard, accentColor: accent });
    emitConfigUpdated('leveling', guild.id, updated, 'DISCORD_COMMAND', ctx.author.id);
  }
  const png = await renderRankCardFor(guild, ctx.author);
  await ctx.editReply({
    content: [
      changed ? '✅ Carte de rang mise à jour.' : 'Aperçu de la carte de rang actuelle :',
      `Police **${CARD_FONT_LABEL[rankCard.font]}** · avatar **${CARD_SHAPE_LABEL[rankCard.avatarShape]}** · accent \`${accent}\` · fond \`${rankCard.backgroundColor}\`${rankCard.backgroundUrl ? ' + image' : ''}`,
      ...errors.map((e) => `⚠️ ${e}`),
      '-# Aussi réglable dans le dashboard : ethone.dev → Bot Discord → Niveaux → Personnalisation.',
    ].join('\n'),
    files: [new AttachmentBuilder(png, { name: 'apercu-rang.png' })],
  });
}

export const xpCommand: Command = {
  name: 'xp',
  description: 'Gère l’XP et les niveaux d’un membre (Admin).',
  category: 'Administration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Gère l’XP et les niveaux d’un membre (Admin).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Ajoute de l’XP à un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Montant d’XP à ajouter').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Retire de l’XP à un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Montant d’XP à retirer').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Définit l’XP total d’un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('montant').setDescription('Nouveau total d’XP').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Réinitialise l’XP et le niveau d’un membre')
        .addUserOption((opt) =>
          opt.setName('membre').setDescription('Le membre cible').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('carte')
        .setDescription('Personnalise la carte /rank du serveur (affiche un aperçu)')
        .addStringOption((o) => o.setName('couleur').setDescription("Couleur d'accent (barre, niveau), ex. #F59E0B"))
        .addStringOption((o) => o.setName('fond_couleur').setDescription('Couleur de fond, ex. #10131A'))
        .addStringOption((o) => o.setName('texte_couleur').setDescription('Couleur du texte, ex. #F2F4F8'))
        .addStringOption((o) => o.setName('fond').setDescription('Image de fond (lien https) ou « aucun »').setMaxLength(500))
        .addIntegerOption((o) => o.setName('voile').setDescription("Assombrissement de l'image de fond (0 à 90 %)").setMinValue(0).setMaxValue(90))
        .addStringOption((o) => o.setName('police').setDescription('Police').addChoices(...CARD_FONTS.map((v) => ({ name: CARD_FONT_LABEL[v], value: v }))))
        .addStringOption((o) => o.setName('avatar').setDescription("Forme de l'avatar").addChoices(...CARD_AVATAR_SHAPES.map((v) => ({ name: CARD_SHAPE_LABEL[v], value: v }))))
        .addBooleanOption((o) => o.setName('reinitialiser').setDescription('Revenir à l’apparence par défaut'))
    ),

  async execute(ctx: CommandContext): Promise<void> {
    const t = getTranslation(ctx.guildConfig.language);

    if (!ctx.isSlash) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription(t.giveaway_slash_only)], ephemeral: true });
      return;
    }

    const guild = ctx.guild;
    if (!guild) return;

    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const sub = interaction.options.getSubcommand();
    if (sub === 'carte') {
      await editRankCard(ctx, interaction);
      return;
    }
    const targetUser = interaction.options.getUser('membre', true);
    const amount = interaction.options.getInteger('montant') || 0;

    const user = xpWriteBuffer.getUser(guild.id, targetUser.id);
    const oldLevel = user.level;

    if (sub === 'add') {
      user.totalXp += amount;
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_add_success, { amount: amount.toLocaleString(), userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'remove') {
      user.totalXp = Math.max(0, user.totalXp - amount);
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_remove_success, { amount: amount.toLocaleString(), userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'set') {
      user.totalXp = Math.max(0, amount);
      user.level = LevelCalculator.calculateLevel(user.totalXp);
      xpWriteBuffer.updateUser(user);
      xpWriteBuffer.flushNow();

      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_set_success, { userId: targetUser.id, total: user.totalXp.toLocaleString(), level: user.level }))],
      });
    } else if (sub === 'reset') {
      xpWriteBuffer.resetUser(guild.id, targetUser.id);
      await ctx.reply({
        embeds: [ctx.createEmbed('success').setDescription(formatString(t.leveling_xp_reset_success, { userId: targetUser.id }))],
      });
    }

    await logService.log(guild, {
      category: 'moderation',
      type: 'MOD_SANCTION',
      title: '⭐ Modification Administrative d’XP',
      description: `L'XP de **${targetUser.tag}** a été modifié par **${ctx.author.tag}** (Action: \`${sub}\`).`,
      color: '#6366F1',
      moderatorId: ctx.author.id,
      moderatorTag: ctx.author.tag,
      userId: targetUser.id,
      userTag: targetUser.tag,
      fields: [
        { name: 'Membre', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
        { name: 'Action', value: sub, inline: true },
        { name: 'Niveau', value: `${user.level} (Ancien: ${oldLevel})`, inline: true },
      ],
    });
  },
};
