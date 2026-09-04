import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { TemporaryVoiceService } from '../services/temporaryVoiceService.js';
import { voiceRepository } from '../storage/voiceRepository.js';
import { DiscordVoicePanel } from '../ui/discordVoicePanel.js';

export const voiceCommand: Command = {
  name: 'voice',
  description: 'Créer et gérer votre salon vocal personnalisé (Voice 2.0)',
  category: 'voice',
  aliases: ['vocal', 'room', 'salon'],
  slashData: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Créer et gérer votre salon vocal personnalisé (Voice 2.0)')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Créer immédiatement votre salon vocal temporaire')
        .addStringOption((opt) =>
          opt
            .setName('nom')
            .setDescription('Nom personnalisé pour votre salon')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('limite')
            .setDescription('Limite de participants (0 = illimité, max 99)')
            .setMinValue(0)
            .setMaxValue(99)
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('verrouille')
            .setDescription('Verrouiller le salon dès la création ?')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Fermer et supprimer votre salon vocal temporaire actif')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('Afficher les détails et participants de votre salon actif')
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Publier le panneau de création permanent dans ce salon textuel (Admin)')
    ),

  execute: async (ctx: CommandContext) => {
    if (!ctx.guild || !ctx.member) {
      await ctx.reply({ content: '❌ Cette commande doit être exécutée dans un serveur Discord.', ephemeral: true });
      return;
    }

    const guild = ctx.guild;
    const member = ctx.member;

    let subcommand = 'create';
    if (ctx.isSlash && ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand(false) || 'create';
    } else if (ctx.args.length > 0) {
      const firstArg = ctx.args[0].toLowerCase();
      if (['create', 'delete', 'info', 'panel'].includes(firstArg)) {
        subcommand = firstArg;
      }
    }

    // --- 1. SUBCOMMAND: CREATE ---
    if (subcommand === 'create') {
      // Anti-abuse: Check if user already has an active room
      const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
      if (userRooms.length > 0) {
        const existing = userRooms[0];
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`voice_delete:${existing.id}`)
            .setLabel('Supprimer mon salon actif')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
        );

        await ctx.reply({
          content: `⚠️ Vous possédez déjà un salon vocal actif : <#${existing.id}> (**${existing.name}**) !\n` +
            `👉 Vous ne pouvez posséder qu'un seul salon actif à la fois. Supprimez-le ou rejoignez-le directement.`,
          components: [row],
          ephemeral: true,
        });
        return;
      }

      await ctx.deferReply(true);

      let customName: string | undefined = undefined;
      let customLimit: number | undefined = undefined;
      let customLocked: boolean | undefined = undefined;

      if (ctx.isSlash && ctx.interaction) {
        customName = ctx.interaction.options.getString('nom') || undefined;
        const lim = ctx.interaction.options.getInteger('limite');
        if (lim !== null && lim !== undefined) customLimit = lim;
        const lck = ctx.interaction.options.getBoolean('verrouille');
        if (lck !== null && lck !== undefined) customLocked = lck;
      } else {
        if (ctx.args.length > 1 && ctx.args[0].toLowerCase() === 'create') {
          customName = ctx.args.slice(1).join(' ');
        } else if (ctx.args.length > 0 && ctx.args[0].toLowerCase() !== 'create') {
          customName = ctx.args.join(' ');
        }
      }

      const result = await TemporaryVoiceService.createPersonalVoiceRoom(member, {
        name: customName,
        limit: customLimit,
        locked: customLocked,
      });

      if (!result.success || !result.channel) {
        await ctx.reply({
          content: result.message || '❌ Impossible de créer le salon vocal actuellement.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x10b981) // Emerald
        .setTitle('🎉 Votre Salon Vocal est prêt !')
        .setDescription(
          `Votre salon **${result.channel.name}** a été créé avec succès dans <#${result.channel.id}>.\n\n` +
          `**📍 Retrouvez le Panneau de Contrôle :**\n` +
          `Toutes les commandes et options (verrouillage, whitelist, banlist, limite, expulsion) se trouvent **directement dans le chat textuel de votre salon vocal** !\n\n` +
          `*(Le salon sera automatiquement supprimé une fois que tout le monde l'aura quitté).*`
        )
        .setFooter({ text: 'ETHONE Voice Engine 2.0 • 100% interactif' })
        .setTimestamp();

      await ctx.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }

    // --- 2. SUBCOMMAND: DELETE ---
    if (subcommand === 'delete') {
      const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
      if (userRooms.length === 0) {
        await ctx.reply({
          content: '❌ Vous ne possédez aucun salon vocal temporaire actif à supprimer.',
          ephemeral: true,
        });
        return;
      }

      const room = userRooms[0];
      await ctx.deferReply(true);
      await TemporaryVoiceService.deleteRoomChannel(guild, room.id, `Supprimé par ${member.user.tag} via /voice delete`);

      await ctx.reply({
        content: `🗑️ Votre salon vocal **${room.name}** a été fermé et supprimé avec succès.`,
        ephemeral: true,
      });
      return;
    }

    // --- 3. SUBCOMMAND: INFO ---
    if (subcommand === 'info') {
      const userRooms = voiceRepository.getRoomsByOwner(guild.id, member.id);
      if (userRooms.length === 0) {
        await ctx.reply({
          content: 'ℹ️ Vous ne possédez aucun salon vocal temporaire actif actuellement.\nUtilisez `/voice create` pour en ouvrir un en 1 seconde !',
          ephemeral: true,
        });
        return;
      }

      const room = userRooms[0];
      const embed = new EmbedBuilder()
        .setColor(room.isLocked ? 0xef4444 : 0x10b981)
        .setTitle(`🎙️ Statut de votre salon : ${room.name}`)
        .setDescription(`Salon : <#${room.id}>`)
        .addFields(
          { name: '👥 Participants', value: `${room.currentUsers?.length || 0} / ${room.userLimit > 0 ? room.userLimit : 'Illimité'}`, inline: true },
          { name: '🛡️ Verrouillage', value: room.isLocked ? '🔒 Verrouillé' : '🔓 Ouvert', inline: true },
          { name: '📋 Whitelist', value: `${(room.allowedUserIds || room.whitelist || []).length} membres`, inline: true },
          { name: '⛔ Banlist', value: `${(room.blockedUserIds || room.banlist || []).length} membres`, inline: true },
          { name: '🎧 Qualité audio', value: `${Math.round(room.bitrate / 1000)} kbps`, inline: true },
          { name: '⏱️ Statut', value: room.status === 'EMPTY_COUNTDOWN' ? '⏳ Nettoyage en cours' : '🟢 Actif', inline: true }
        )
        .setFooter({ text: 'ETHONE Voice Engine 2.0' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // --- 4. SUBCOMMAND: PANEL (Admin) ---
    if (subcommand === 'panel') {
      if (
        !member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        await ctx.reply({
          content: '🔒 Vous devez posséder la permission **Gérer les salons** pour publier le panneau de création permanent.',
          ephemeral: true,
        });
        return;
      }

      const channel = ctx.channel;
      if (!channel || !channel.isTextBased()) {
        await ctx.reply({ content: '❌ Ce canal n’est pas un salon textuel valide.', ephemeral: true });
        return;
      }

      await ctx.deferReply(true);
      const res = await TemporaryVoiceService.publishCreationPanel(guild, channel.id);

      if (!res.success) {
        await ctx.reply({ content: `❌ Erreur lors de la publication : ${res.error}`, ephemeral: true });
        return;
      }

      await ctx.reply({
        content: `✅ Le **Panneau Permanent de Création Voice 2.0** a été publié avec succès dans <#${channel.id}> !`,
        ephemeral: true,
      });
      return;
    }
  },
};
