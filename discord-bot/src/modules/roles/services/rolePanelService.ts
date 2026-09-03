import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from 'discord.js';
import { RoleItemStyle, RolePanel, RolePanelSchema } from '../types/rolePanel.js';
import { logService } from '../../logs/services/logService.js';
import { logger } from '../../../utils/logger.js';

class RolePanelService {
  private panelsPath = path.resolve(process.cwd(), 'data', 'role_panels.json');
  private panels = new Map<string, RolePanel[]>(); // guildId -> panels

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.panelsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(this.panelsPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.panelsPath, 'utf-8'));
        for (const [gid, list] of Object.entries(parsed)) {
          this.panels.set(gid, list as RolePanel[]);
        }
      }
    } catch (err) {
      logger.error('Erreur chargement role_panels.json :', err);
    }
  }

  private saveData() {
    try {
      const obj = Object.fromEntries(this.panels.entries());
      fs.writeFileSync(this.panelsPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde role_panels.json :', err);
    }
  }

  public getPanels(guildId: string): RolePanel[] {
    let list = this.panels.get(guildId);
    if (!list) {
      list = [];
      this.panels.set(guildId, list);
    }
    return list;
  }

  public getPanel(guildId: string, panelId: string): RolePanel | null {
    const list = this.getPanels(guildId);
    return list.find((p) => p.id === panelId) || null;
  }

  public savePanel(guildId: string, panelData: Partial<RolePanel>): RolePanel {
    const list = this.getPanels(guildId);
    const now = new Date().toISOString();
    const id = panelData.id || `panel_${Date.now()}`;

    const valid = RolePanelSchema.parse({
      ...panelData,
      id,
      guildId,
      createdAt: panelData.createdAt || now,
      updatedAt: now,
    });

    const index = list.findIndex((p) => p.id === id);
    if (index >= 0) {
      list[index] = valid;
    } else {
      list.push(valid);
    }

    this.panels.set(guildId, list);
    this.saveData();
    return valid;
  }

  public async deletePanel(
    guildId: string,
    panelId: string,
    deleteDiscordMessage: boolean,
    client: Client
  ): Promise<boolean> {
    const list = this.getPanels(guildId);
    const panel = list.find((p) => p.id === panelId);
    if (!panel) return false;

    // Suppression du message Discord si demandé
    if (deleteDiscordMessage && panel.channelId && panel.messageId) {
      try {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(panel.channelId) as TextChannel | undefined;
        if (channel) {
          const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      } catch (err) {
        logger.error('Erreur lors de la suppression du message de panel :', err);
      }
    }

    const filtered = list.filter((p) => p.id !== panelId);
    this.panels.set(guildId, filtered);
    this.saveData();
    return true;
  }

  public duplicatePanel(guildId: string, panelId: string): RolePanel | null {
    const original = this.getPanel(guildId, panelId);
    if (!original) return null;

    const copy: Partial<RolePanel> = {
      ...original,
      id: `panel_${Date.now()}`,
      name: `${original.name} (Copie)`,
      messageId: null,
      status: 'draft',
      lastSyncAt: null,
    };

    return this.savePanel(guildId, copy);
  }

  // ==========================================
  // Synchronisation & Diagnostic (Sync Panel)
  // ==========================================
  public async syncPanel(
    guild: Guild,
    panelId: string
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const panel = this.getPanel(guild.id, panelId);
    if (!panel) throw new Error('Panel introuvable.');

    const errors: string[] = [];
    const warnings: string[] = [];
    const botMember = guild.members.me;

    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      errors.push('Le bot ne possède pas la permission ManageRoles.');
    }

    const botHighest = botMember ? botMember.roles.highest.position : 0;

    // Vérifier le salon
    if (panel.channelId) {
      const channel = guild.channels.cache.get(panel.channelId);
      if (!channel) {
        errors.push(`Le salon textuel ${panel.channelId} a été supprimé de Discord.`);
      }
    } else {
      warnings.push('Aucun salon textuel n’est encore associé à ce panel.');
    }

    // Vérifier le message
    if (panel.channelId && panel.messageId) {
      const channel = guild.channels.cache.get(panel.channelId) as TextChannel | undefined;
      if (channel) {
        const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
        if (!msg) {
          warnings.push('Le message Discord n’a pas été trouvé (il a peut-être été supprimé).');
        }
      }
    }

    // Vérifier chaque rôle du panel
    for (const item of panel.items) {
      const role = guild.roles.cache.get(item.roleId);
      if (!role) {
        errors.push(`Le rôle "${item.label}" (${item.roleId}) n'existe plus sur Discord.`);
      } else if (role.position >= botHighest) {
        errors.push(
          `Le rôle "${role.name}" est supérieur ou égal au rôle du bot dans la hiérarchie.`
        );
      }
    }

    panel.status = errors.length > 0 ? 'error' : panel.messageId ? 'active' : 'draft';
    panel.lastSyncAt = new Date().toISOString();
    this.savePanel(guild.id, panel);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================
  // Publication sur Discord
  // ==========================================
  public async publishPanel(
    guild: Guild,
    panelId: string,
    channelId: string
  ): Promise<{ success: boolean; messageId: string; channelName: string }> {
    const panel = this.getPanel(guild.id, panelId);
    if (!panel) throw new Error('Panel introuvable.');

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error('Salon textuel introuvable ou invalide.');
    }

    // Construction de l'embed
    const embed = new EmbedBuilder()
      .setColor((panel.color || '#5865F2') as `#${string}`)
      .setTitle(panel.title)
      .setDescription(panel.description || null)
      .setFooter({ text: panel.footer || `${guild.name} • Système de Rôles` });

    if (panel.thumbnail) embed.setThumbnail(panel.thumbnail);
    if (panel.image) embed.setImage(panel.image);

    // Construction des composants
    const components: any[] = [];

    if (panel.componentType === 'buttons') {
      // Jusqu'à 5 lignes de 5 boutons (max 25 boutons)
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      let currentRow = new ActionRowBuilder<ButtonBuilder>();

      for (let i = 0; i < panel.items.length && i < 25; i++) {
        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder<ButtonBuilder>();
        }

        const item = panel.items[i];
        let btnStyle = ButtonStyle.Secondary;
        if (item.style === 'Primary') btnStyle = ButtonStyle.Primary;
        if (item.style === 'Success') btnStyle = ButtonStyle.Success;
        if (item.style === 'Danger') btnStyle = ButtonStyle.Danger;

        const btn = new ButtonBuilder()
          .setCustomId(`role_btn:${panel.id}:${item.id}`)
          .setLabel(item.label)
          .setStyle(btnStyle);

        if (item.emoji) btn.setEmoji(item.emoji);
        currentRow.addComponents(btn);
      }

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      components.push(...rows);
    } else {
      // Select Menu
      const options = panel.items.slice(0, 25).map((item) => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(item.label)
          .setValue(item.id);

        if (item.description) opt.setDescription(item.description.slice(0, 100));
        if (item.emoji) opt.setEmoji(item.emoji);
        return opt;
      });

      if (options.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`role_select:${panel.id}`)
          .setPlaceholder(panel.placeholder || 'Sélectionnez vos rôles...')
          .setMinValues(0)
          .setMaxValues(options.length)
          .addOptions(options);

        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
      }
    }

    let sentMessage;
    // Si un messageId existe déjà dans ce même salon, tenter une mise à jour directe
    if (panel.messageId && panel.channelId === channel.id) {
      const existing = await channel.messages.fetch(panel.messageId).catch(() => null);
      if (existing) {
        sentMessage = await existing.edit({ embeds: [embed], components });
      }
    }

    if (!sentMessage) {
      sentMessage = await channel.send({ embeds: [embed], components });
    }

    // Mettre à jour les métadonnées du panel
    this.savePanel(guild.id, {
      ...panel,
      channelId: channel.id,
      messageId: sentMessage.id,
      status: 'active',
      lastSyncAt: new Date().toISOString(),
    });

    await logService.log(guild, {
      category: 'roles',
      type: 'ROLE_UPDATE',
      title: '📢 Panel de Rôles Déployé',
      description: `Le panel **${panel.name}** a été publié avec succès dans <#${channel.id}>.`,
      color: '#10B981',
      channelId: channel.id,
      channelName: channel.name,
      fields: [
        { name: 'Panel', value: panel.name, inline: true },
        { name: 'Salon', value: `<#${channel.id}>`, inline: true },
        { name: 'Composant', value: panel.componentType, inline: true },
        { name: 'Nombre de rôles', value: `${panel.items.length}`, inline: true },
      ],
    });

    return {
      success: true,
      messageId: sentMessage.id,
      channelName: channel.name,
    };
  }

  // ==========================================
  // Traitement d'un clic / sélection de rôle
  // ==========================================
  public async handleRoleAction(
    member: GuildMember,
    panelId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string; action: 'added' | 'removed' | 'denied' }> {
    const guild = member.guild;
    const panel = this.getPanel(guild.id, panelId);
    if (!panel) {
      return { success: false, message: 'Ce panneau de rôles n’est plus disponible.', action: 'denied' };
    }

    const item = panel.items.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, message: 'Ce rôle n’est plus configuré.', action: 'denied' };
    }

    const role = guild.roles.cache.get(item.roleId);
    if (!role) {
      return { success: false, message: 'Ce rôle a été supprimé du serveur.', action: 'denied' };
    }

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return {
        success: false,
        message: 'Le bot ne dispose pas de la permission de gérer les rôles.',
        action: 'denied',
      };
    }

    if (role.position >= botMember.roles.highest.position) {
      return {
        success: false,
        message: 'Le bot ne peut pas attribuer ce rôle car il est supérieur à son propre rôle.',
        action: 'denied',
      };
    }

    // 1. Vérification des prérequis
    if (item.prerequisiteRoleId) {
      const hasPrereq = member.roles.cache.has(item.prerequisiteRoleId);
      if (!hasPrereq) {
        const prereqRole = guild.roles.cache.get(item.prerequisiteRoleId);
        return {
          success: false,
          message: `🔒 Vous devez posséder le rôle **@${prereqRole?.name || 'Requis'}** pour obtenir ce rôle.`,
          action: 'denied',
        };
      }
    }

    // 2. Gestion de l'exclusivité (Groupe Single Exclusive ou Rôles Incompatibles)
    const removedOpposingRoleNames: string[] = [];

    // a) Recherche si l'élément fait partie d'un groupe 'single_exclusive'
    const exclusiveGroup = panel.groups.find(
      (g) => g.mode === 'single_exclusive' && g.itemIds.includes(item.id)
    );

    if (exclusiveGroup) {
      for (const otherItemId of exclusiveGroup.itemIds) {
        if (otherItemId === item.id) continue;
        const otherItem = panel.items.find((i) => i.id === otherItemId);
        if (otherItem && member.roles.cache.has(otherItem.roleId)) {
          const otherRole = guild.roles.cache.get(otherItem.roleId);
          if (otherRole) {
            await member.roles.remove(otherRole, 'Remplacement rôle exclusif (Role Panel)').catch(() => {});
            removedOpposingRoleNames.push(otherRole.name);
          }
        }
      }
    }

    // b) Rôles mutuellement exclusifs déclarés
    if (item.mutuallyExclusiveRoleIds && item.mutuallyExclusiveRoleIds.length > 0) {
      for (const conflictRoleId of item.mutuallyExclusiveRoleIds) {
        if (member.roles.cache.has(conflictRoleId)) {
          const conflictRole = guild.roles.cache.get(conflictRoleId);
          if (conflictRole) {
            await member.roles.remove(conflictRole, 'Remplacement rôle conflictuel (Role Panel)').catch(() => {});
            removedOpposingRoleNames.push(conflictRole.name);
          }
        }
      }
    }

    // 3. Bascule du rôle cible (Toggle)
    const hasRole = member.roles.cache.has(role.id);

    if (hasRole) {
      await member.roles.remove(role, 'Retrait par utilisateur (Role Panel)');

      await logService.log(guild, {
        category: 'roles',
        type: 'ROLE_UPDATE',
        title: '🎭 Rôle Retiré',
        description: `**${member.user.tag}** a retiré le rôle **@${role.name}** via le panel **${panel.name}**.`,
        color: '#EF4444',
        userId: member.id,
        userTag: member.user.tag,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
          { name: 'Rôle retiré', value: `@${role.name}`, inline: true },
          { name: 'Panel', value: panel.name, inline: true },
        ],
      });

      return {
        success: true,
        message: `🗑️ Le rôle **@${role.name}** vous a été retiré.`,
        action: 'removed',
      };
    } else {
      await member.roles.add(role, 'Attribution par utilisateur (Role Panel)');

      let extraText = '';
      if (removedOpposingRoleNames.length > 0) {
        extraText = ` *(Rôles exclusifs retirés : ${removedOpposingRoleNames.map((n) => `@${n}`).join(', ')})*`;
      }

      await logService.log(guild, {
        category: 'roles',
        type: 'ROLE_UPDATE',
        title: '🎭 Rôle Attribué',
        description: `**${member.user.tag}** a obtenu le rôle **@${role.name}** via le panel **${panel.name}**.`,
        color: '#10B981',
        userId: member.id,
        userTag: member.user.tag,
        fields: [
          { name: 'Membre', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
          { name: 'Rôle attribué', value: `@${role.name}`, inline: true },
          { name: 'Panel', value: panel.name, inline: true },
        ],
      });

      return {
        success: true,
        message: `✅ Le rôle **@${role.name}** vous a été attribué !${extraText}`,
        action: 'added',
      };
    }
  }
}

export const rolePanelService = new RolePanelService();
