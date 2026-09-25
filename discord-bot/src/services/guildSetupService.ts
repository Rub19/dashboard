import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  Guild,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  type BaseMessageOptions,
} from 'discord.js';
import { CORE_MODULE_IDS, MODULES, MODULE_PRESETS, applyModuleSelection, isModuleEnabled, type ModulePresetId } from './moduleRegistry.js';
import { BOT_ICON_BASE, baseEmbed, noticeEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration rapide à l'arrivée du bot.
 *
 * Un serveur qui invite le bot démarre avec tout désactivé SAUF le socle (CORE_MODULE_IDS). Le bot poste alors un panneau
 * dans un salon : menus par famille de modules + préréglages. Chaque choix s'applique tout de suite et se reflète dans le
 * dashboard. Les serveurs déjà présents ne sont jamais touchés : seul un serveur rejoint récemment ET jamais configuré
 * est initialisé (registre data/guild_setup.json).
 */

type SetupStatus = 'pending' | 'done';
interface SetupRecord {
  status: SetupStatus;
  at: string;
}

const FILE = path.resolve(process.cwd(), 'data', 'guild_setup.json');
let records: Record<string, SetupRecord> = {};
try {
  if (fs.existsSync(FILE)) records = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Record<string, SetupRecord>;
} catch (err) {
  logger.warn('[Setup] Lecture de guild_setup.json impossible, registre vide :', err);
}

function persist(): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(records, null, 2));
  } catch (err) {
    logger.error('[Setup] Écriture de guild_setup.json impossible :', err);
  }
}

/** Les deux familles de modules proposées dans les menus (29 modules → deux menus de 25 options maximum). */
const GROUPS: Array<{ id: 'protect' | 'community'; placeholder: string; moduleIds: string[] }> = [
  { id: 'protect', placeholder: '🛡️ Protection & gestion', moduleIds: ['moderation', 'security', 'anti-nuke', 'automod', 'logs', 'tickets', 'reports', 'secureroles', 'backups', 'invites'] },
  {
    id: 'community',
    placeholder: '🎉 Communauté & animation',
    moduleIds: ['welcome', 'roles', 'leveling', 'economy', 'suggestions', 'polls', 'giveaways', 'events', 'forms', 'starboard', 'highlights', 'birthdays', 'music', 'voice', 'commands', 'tags', 'reminders', 'sticky', 'afk', 'counting', 'stats', 'statroles', 'serverstats', 'ai'],
  },
];

const DASHBOARD_URL = 'https://ethone.dev/discord/setup';

export const guildSetupService = {
  isKnown(guildId: string): boolean {
    return Boolean(records[guildId]);
  },

  status(guildId: string): SetupStatus | null {
    return records[guildId]?.status ?? null;
  },

  markDone(guildId: string): void {
    records[guildId] = { status: 'done', at: new Date().toISOString() };
    persist();
  },

  /** Nouveau serveur : socle actif, tout le reste désactivé, panneau posté. Sans effet sur un serveur déjà connu. */
  async provision(guild: Guild): Promise<void> {
    if (records[guild.id]) return;
    // Un « guildCreate » peut aussi arriver pour un serveur ancien qui redevient disponible : on ne touche qu'aux serveurs rejoints très récemment.
    const joinedRecently = guild.joinedTimestamp ? Date.now() - guild.joinedTimestamp < 5 * 60_000 : false;
    if (!joinedRecently) return;

    records[guild.id] = { status: 'pending', at: new Date().toISOString() };
    persist();
    applyModuleSelection(guild.id, CORE_MODULE_IDS, 'DISCORD_COMMAND');
    logger.success(`[Setup] Serveur « ${guild.name} » initialisé : socle actif, autres modules désactivés.`);

    const me = guild.members.me;
    const channel =
      (guild.systemChannel && me && guild.systemChannel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]) ? guild.systemChannel : null) ||
      guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && !!me && !!c.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])
      );
    if (!channel || !channel.isTextBased()) {
      logger.warn(`[Setup] Aucun salon où poster la configuration rapide sur « ${guild.name} » : /setup la relancera.`);
      return;
    }
    try {
      await channel.send(this.buildPanel(guild.id, true));
    } catch (err) {
      logger.warn(`[Setup] Envoi du panneau impossible sur « ${guild.name} » :`, err);
    }
  },

  /** Panneau de configuration rapide (embed + menus + préréglages). */
  buildPanel(guildId: string, isWelcome = false): BaseMessageOptions {
    const states = MODULES.map((m) => ({ m, on: isModuleEnabled(guildId, m.id) }));
    const active = states.filter((s) => s.on);
    const inactive = states.filter((s) => !s.on);
    const list = (xs: typeof states) => (xs.length ? xs.map((s) => `${s.m.emoji} ${s.m.label}`).join('  ·  ') : '—');

    const embed = baseEmbed('primary')
      .setAuthor({ name: 'ETHONE · Configuration rapide', iconURL: `${BOT_ICON_BASE}/ethone.png` })
      .setTitle(isWelcome ? '👋 Merci d\'avoir ajouté ETHONE !' : '⚙️ Modules du serveur')
      .setDescription(
        [
          isWelcome
            ? 'Rien ne s\'active sans votre accord : **seul le socle essentiel est actif**. Choisissez ce dont votre serveur a besoin ci-dessous.'
            : 'Choisissez les modules à activer. Chaque choix s\'applique **tout de suite**.',
          '',
          '> Réservé aux membres qui ont la permission **Gérer le serveur**. Modifiable à tout moment avec `/module` ou sur le dashboard.',
        ].join('\n')
      )
      .setThumbnail('https://ethone.dev/icons/ethone-icon-192.png')
      .addFields(
        { name: `✅ Actifs (${active.length})`, value: list(active).slice(0, 1024) },
        { name: `⚪ Désactivés (${inactive.length})`, value: list(inactive).slice(0, 1024) },
        {
          name: 'Préréglages',
          value: (Object.keys(MODULE_PRESETS) as ModulePresetId[]).map((id) => `${MODULE_PRESETS[id].emoji} **${MODULE_PRESETS[id].label}** — ${MODULE_PRESETS[id].description}`).join('\n'),
        }
      );

    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = GROUPS.map((g) =>
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`qsetup:sel:${g.id}`)
          .setPlaceholder(g.placeholder)
          .setMinValues(0)
          .setMaxValues(g.moduleIds.length)
          .addOptions(
            g.moduleIds.map((id) => {
              const def = MODULES.find((m) => m.id === id)!;
              return new StringSelectMenuOptionBuilder().setLabel(def.label.slice(0, 100)).setValue(id).setDescription(def.description.slice(0, 100)).setEmoji(def.emoji).setDefault(isModuleEnabled(guildId, id));
            })
          )
      )
    );

    const presetRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      (Object.keys(MODULE_PRESETS) as ModulePresetId[]).map((id) =>
        new ButtonBuilder().setCustomId(`qsetup:preset:${id}`).setLabel(MODULE_PRESETS[id].label).setEmoji(MODULE_PRESETS[id].emoji).setStyle(id === 'all' ? ButtonStyle.Secondary : ButtonStyle.Primary)
      )
    );
    const footerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel('Configuration détaillée').setEmoji('🌐').setStyle(ButtonStyle.Link).setURL(DASHBOARD_URL),
      new ButtonBuilder().setCustomId('qsetup:done').setLabel('Terminé').setEmoji('✔️').setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [...rows, presetRow, footerRow] };
  },

  /** Boutons et menus du panneau (customId « qsetup:… »). */
  async handle(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ embeds: [noticeEmbed('denied', 'Seuls les membres qui ont la permission **Gérer le serveur** peuvent modifier la configuration.')], flags: MessageFlags.Ephemeral });
      return;
    }
    const [, kind, arg] = interaction.customId.split(':');

    if (interaction.isStringSelectMenu() && kind === 'sel') {
      const group = GROUPS.find((g) => g.id === arg);
      if (!group) return;
      const chosen = new Set(interaction.values.filter((v) => group.moduleIds.includes(v)));
      // Les modules des AUTRES menus gardent leur état ; ceux de ce menu suivent la sélection.
      const enabled = new Set(MODULES.filter((m) => (group.moduleIds.includes(m.id) ? chosen.has(m.id) : isModuleEnabled(guildId, m.id))).map((m) => m.id));
      applyModuleSelection(guildId, enabled, 'DISCORD_COMMAND', interaction.user.id);
      await interaction.update(this.buildPanel(guildId, this.status(guildId) === 'pending'));
      return;
    }

    if (interaction.isButton() && kind === 'preset') {
      const preset = MODULE_PRESETS[arg as ModulePresetId];
      if (!preset) return;
      applyModuleSelection(guildId, preset.ids(), 'DISCORD_COMMAND', interaction.user.id);
      await interaction.update(this.buildPanel(guildId, this.status(guildId) === 'pending'));
      return;
    }

    if (interaction.isButton() && kind === 'done') {
      this.markDone(guildId);
      const active = MODULES.filter((m) => isModuleEnabled(guildId, m.id));
      const embed = baseEmbed('success')
        .setAuthor({ name: 'ETHONE · Configuration rapide', iconURL: `${BOT_ICON_BASE}/ethone.png` })
        .setTitle('✅ Configuration enregistrée')
        .setDescription(`${active.length} module(s) actif(s) : ${active.map((m) => `${m.emoji} ${m.label}`).join('  ·  ') || '—'}\n\nPour changer plus tard : \`/module\` ou le dashboard.`)
        .setThumbnail('https://ethone.dev/icons/ethone-icon-192.png');
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
