import {
  AttachmentBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command, CommandContext } from '../../../types/command.js';
import { welcomeService } from '../services/welcomeService.js';
import { WelcomeCardGenerator } from '../images/welcomeCardGenerator.js';
import { CARD_TEMPLATES, WelcomeImageConfigSchema } from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { emitConfigUpdated } from '../../../services/syncConfigEmitter.js';

const TEMPLATE_LABEL: Record<(typeof CARD_TEMPLATES)[number], string> = {
  default: 'Classique',
  modern: 'Centré',
  minimal: 'Minimal',
  gaming: 'Gaming',
};
const FONT_LABEL = { poppins: 'Poppins', bebas: 'Bebas (condensée)', serif: 'Serif', mono: 'Mono' } as const;
const SHAPE_LABEL = { circle: 'Rond', rounded: 'Arrondi', square: 'Carré' } as const;

const hex = (v: string | null) => (v && /^#?[0-9a-fA-F]{6}$/.test(v.trim()) ? `#${v.trim().replace('#', '').toUpperCase()}` : null);

function previewContext(member: GuildMember): VariableContext {
  return {
    userId: member.id,
    username: member.user.username,
    displayName: member.displayName,
    userTag: member.user.tag,
    mentionUser: false,
    userCreatedAt: member.user.createdAt,
    guildId: member.guild.id,
    guildName: member.guild.name,
    memberCount: member.guild.memberCount,
  };
}

async function cardFor(member: GuildMember): Promise<AttachmentBuilder> {
  const cfg = welcomeService.getConfig(member.guild.id).welcome.image;
  const buf = await WelcomeCardGenerator.generateCard(
    { ...cfg, enabled: true },
    member.displayAvatarURL({ size: 256, extension: 'png' }),
    previewContext(member)
  );
  return new AttachmentBuilder(buf, { name: 'apercu-bienvenue.png' });
}

export const welcomeCommand: Command = {
  name: 'bienvenue',
  description: 'Message et carte de bienvenue : personnalisation, aperçu, test',
  category: 'Configuration',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  slashData: new SlashCommandBuilder()
    .setName('bienvenue')
    .setDescription('Message et carte de bienvenue')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('carte')
        .setDescription('Personnalise la carte image envoyée à chaque arrivée (affiche un aperçu)')
        .addStringOption((o) =>
          o.setName('modele').setDescription('Mise en page').addChoices(...CARD_TEMPLATES.map((t) => ({ name: TEMPLATE_LABEL[t], value: t })))
        )
        .addStringOption((o) => o.setName('couleur').setDescription("Couleur d'accent, ex. #C1234F"))
        .addStringOption((o) =>
          o.setName('police').setDescription('Police').addChoices(...Object.entries(FONT_LABEL).map(([value, name]) => ({ name, value })))
        )
        .addStringOption((o) =>
          o.setName('avatar').setDescription("Forme de l'avatar").addChoices(...Object.entries(SHAPE_LABEL).map(([value, name]) => ({ name, value })))
        )
        .addStringOption((o) => o.setName('titre').setDescription('Ligne du haut, ex. BIENVENUE').setMaxLength(60))
        .addStringOption((o) => o.setName('nom').setDescription('Ligne principale, ex. {displayname}').setMaxLength(80))
        .addStringOption((o) => o.setName('ligne').setDescription('Ligne secondaire, ex. Membre #{membercount}').setMaxLength(120))
        .addStringOption((o) => o.setName('fond').setDescription('Image de fond (lien https) ou « aucun »').setMaxLength(500))
        .addIntegerOption((o) => o.setName('voile').setDescription("Assombrissement de l'image de fond (0 à 90 %)").setMinValue(0).setMaxValue(90))
        .addStringOption((o) => o.setName('fond_couleur').setDescription('Couleur de fond, ex. #0B0C10'))
        .addStringOption((o) => o.setName('texte_couleur').setDescription('Couleur du texte, ex. #FFFFFF'))
        .addBooleanOption((o) => o.setName('nom_serveur').setDescription('Afficher le nom du serveur sur la carte'))
        .addBooleanOption((o) => o.setName('active').setDescription('Envoyer la carte avec le message de bienvenue'))
    )
    .addSubcommand((sub) => sub.setName('apercu').setDescription('Montre ta carte de bienvenue telle qu’elle sera envoyée'))
    .addSubcommand((sub) => sub.setName('test').setDescription('Envoie un vrai message de bienvenue de test dans le salon configuré'))
    .addSubcommand((sub) =>
      sub
        .setName('salon')
        .setDescription('Choisit le salon de bienvenue et active / désactive le message')
        .addChannelOption((o) =>
          o.setName('salon').setDescription('Salon où envoyer la bienvenue').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)
        )
        .addBooleanOption((o) => o.setName('actif').setDescription('Activer le message de bienvenue (oui par défaut)'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription("Titre et texte de l'embed de bienvenue (variables : {user} {server} {membercount}…)")
        .addStringOption((o) => o.setName('titre').setDescription("Titre de l'embed").setMaxLength(256))
        .addStringOption((o) => o.setName('texte').setDescription("Texte de l'embed (\\n pour aller à la ligne)").setMaxLength(2000))
        .addStringOption((o) => o.setName('couleur').setDescription("Couleur de la barre de l'embed, ex. #10B981"))
    ),

  async execute(ctx: CommandContext): Promise<void> {
    if (!ctx.guild || !ctx.isSlash) {
      await ctx.reply({ embeds: [ctx.createEmbed('error').setDescription('Utilise la commande slash `/bienvenue` sur un serveur.')], ephemeral: true });
      return;
    }
    const interaction = ctx.interaction as ChatInputCommandInteraction;
    const guildId = ctx.guild.id;
    const member = interaction.member as GuildMember;
    const sub = interaction.options.getSubcommand();
    const save = (update: Parameters<typeof welcomeService.updateConfig>[1]) => {
      const updated = welcomeService.updateConfig(guildId, update);
      emitConfigUpdated('welcome', guildId, updated, 'DISCORD_COMMAND', ctx.author.id);
      return updated;
    };

    if (sub === 'carte') {
      const o = interaction.options;
      const errors: string[] = [];
      const patch: Record<string, unknown> = {};
      const setHex = (opt: string, key: string) => {
        const raw = o.getString(opt);
        if (raw === null) return;
        const v = hex(raw);
        if (v) patch[key] = v;
        else errors.push(`\`${opt}\` : « ${raw} » n'est pas une couleur (format #RRGGBB).`);
      };
      for (const [opt, key] of [['modele', 'template'], ['police', 'font'], ['avatar', 'avatarShape'], ['titre', 'titleText'], ['nom', 'subtitleText'], ['ligne', 'tagText']] as const) {
        const v = o.getString(opt);
        if (v !== null) patch[key] = v;
      }
      setHex('couleur', 'accentColor');
      setHex('fond_couleur', 'backgroundColor');
      setHex('texte_couleur', 'textColor');
      const fond = o.getString('fond');
      if (fond !== null) {
        if (/^(aucun|non|none|-)$/i.test(fond.trim())) patch.customBackgroundUrl = null;
        else if (/^https:\/\/\S+$/i.test(fond.trim())) patch.customBackgroundUrl = fond.trim();
        else errors.push('`fond` : il faut un lien qui commence par https:// (ou « aucun »).');
      }
      const voile = o.getInteger('voile');
      if (voile !== null) patch.overlayOpacity = voile;
      const showServer = o.getBoolean('nom_serveur');
      if (showServer !== null) patch.showServerName = showServer;
      const active = o.getBoolean('active');
      if (active !== null) patch.enabled = active;

      await ctx.deferReply({ ephemeral: true });
      const current = welcomeService.getConfig(guildId).welcome.image;
      const image = WelcomeImageConfigSchema.parse({ ...current, ...patch });
      if (Object.keys(patch).length) save({ welcome: { image } } as never);
      const file = await cardFor(member);
      const changed = Object.keys(patch).length;
      await ctx.editReply({
        content: [
          changed ? `✅ Carte mise à jour (${changed} réglage${changed > 1 ? 's' : ''}).` : 'Aperçu de la carte actuelle :',
          `Modèle **${TEMPLATE_LABEL[image.template]}** · police **${FONT_LABEL[image.font]}** · avatar **${SHAPE_LABEL[image.avatarShape]}** · accent \`${image.accentColor}\`${image.enabled ? '' : ' · ⚠️ carte désactivée'}`,
          ...errors.map((e) => `⚠️ ${e}`),
          '-# Tous les réglages sont aussi dans le dashboard : ethone.dev → Bot Discord → Bienvenue.',
        ].join('\n'),
        files: [file],
      });
      return;
    }

    if (sub === 'apercu') {
      await ctx.deferReply({ ephemeral: true });
      await ctx.editReply({ content: 'Ta carte de bienvenue telle qu’elle sera envoyée :', files: [await cardFor(member)] });
      return;
    }

    if (sub === 'test') {
      await ctx.deferReply({ ephemeral: true });
      try {
        const res = await welcomeService.sendTest(ctx.guild, 'welcome', 'channel', ctx.author);
        await ctx.editReply({ content: `✅ Message de test envoyé dans <#${welcomeService.getConfig(guildId).welcome.channelId}>${res.channelName ? ` (#${res.channelName})` : ''}.` });
      } catch (err: any) {
        await ctx.editReply({ content: `❌ ${err?.message || 'Envoi impossible.'} Choisis d'abord un salon avec \`/bienvenue salon\`.` });
      }
      return;
    }

    if (sub === 'salon') {
      const channel = interaction.options.getChannel('salon', true);
      const enabled = interaction.options.getBoolean('actif') ?? true;
      save({ welcome: { channelId: channel.id, enabled } } as never);
      await ctx.reply({
        embeds: [
          ctx
            .createEmbed(enabled ? 'success' : 'neutral')
            .setDescription(enabled ? `✅ Les nouveaux membres seront accueillis dans <#${channel.id}>.` : `⚪ Bienvenue désactivée (salon gardé : <#${channel.id}>).`),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === 'message') {
      const o = interaction.options;
      const embed: Record<string, unknown> = {};
      const title = o.getString('titre');
      const text = o.getString('texte');
      const color = o.getString('couleur');
      if (title !== null) embed.title = title;
      if (text !== null) embed.description = text.replace(/\\n/g, '\n');
      if (color !== null) {
        const v = hex(color);
        if (!v) {
          await ctx.reply({ content: `❌ « ${color} » n'est pas une couleur (format #RRGGBB).`, ephemeral: true });
          return;
        }
        embed.color = v;
      }
      if (!Object.keys(embed).length) {
        await ctx.reply({ content: 'Indique au moins `titre`, `texte` ou `couleur`.', ephemeral: true });
        return;
      }
      save({ welcome: { embed: { ...embed, enabled: true } } } as never);
      await ctx.reply({ content: '✅ Embed de bienvenue mis à jour. Vérifie le rendu avec `/bienvenue test`.', ephemeral: true });
    }
  },
};
