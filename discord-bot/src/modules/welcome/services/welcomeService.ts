import { isModuleEnabled } from '../../../services/moduleRegistry.js';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  EmbedBuilder,
  Guild,
  GuildBasedChannel,
  GuildMember,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  Message,
  MessageFlags,
  PartialGuildMember,
  PermissionFlagsBits,
  SectionBuilder,
  SeparatorBuilder,
  TextChannel,
  TextDisplayBuilder,
  ThumbnailBuilder,
  User,
  type MessageMentionOptions,
} from 'discord.js';
import {
  FullWelcomeConfig,
  FullWelcomeConfigSchema,
  FullWelcomeInput,
  IconSource,
  WelcomeButtonConfig,
  WelcomeEmbedConfig,
  WelcomeImageConfig,
} from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { VariableParser } from '../variables/variableParser.js';
import { WelcomeCardGenerator } from '../images/welcomeCardGenerator.js';
import { welcomeRepository } from '../storage/welcomeRepository.js';
import { AutoRoleService } from './autoRoleService.js';
import { OnboardingService } from './onboardingService.js';
import { logger } from '../../../utils/logger.js';
import { canBotSendTo, isForumLike, isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';
import { cardFileName } from '../images/animatedCard.js';
import { readLocalAsset } from '../storage/welcomeAssets.js';

type Format = 'embed' | 'container' | 'text';

export interface MessageSpec {
  format?: Format;
  contentAbove?: string;
  messageContent: string;
  mentionUser?: boolean;
  notifyRoles?: boolean;
  embed: WelcomeEmbedConfig;
  buttons?: WelcomeButtonConfig[];
}

type Card = { buffer: Buffer; name: string } | null;

const SETTLE_MS = 2500;
const QUICK_LEAVE_MS = 10 * 60 * 1000;
const WAVE_LIMIT = 10;
const WAVE_WINDOW_MS = 60_000;

export const formatOf = (spec: { format?: Format; embed: { enabled: boolean } }): Format => spec.format ?? (spec.embed.enabled ? 'embed' : 'text');

export function iconSources(e: WelcomeEmbedConfig, dm = false) {
  return {
    author: e.authorIcon ?? (e.authorIconUrl ? 'custom' : dm ? 'server' : 'member'),
    thumbnail: e.thumbnail ?? (!e.showThumbnail ? 'none' : e.thumbnailUrl ? 'custom' : dm ? 'server' : 'member'),
    image: e.imageSource ?? (e.imageUrl ? 'custom' : 'none'),
    footer: e.footerIcon ?? (e.footerIconUrl ? 'custom' : dm ? 'none' : 'server'),
  } satisfies Record<string, IconSource>;
}

/** URL publique d'une image envoyée depuis le dashboard : chemin relatif du bot → URL absolue de l'API publique. */
function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/public/')) return `${process.env.BOT_PUBLIC_URL || 'https://bot.ethone.dev'}${url}`;
  return /^https:\/\//i.test(url) ? url : null;
}

class WelcomeService {
  private recentWelcomes = new Map<string, { message: Message; at: number }>();
  private waves = new Map<string, number[]>();

  public getConfig(guildId: string): FullWelcomeConfig {
    return welcomeRepository.getConfig(guildId);
  }

  public updateConfig(guildId: string, update: Partial<FullWelcomeInput>): FullWelcomeConfig {
    const c = this.getConfig(guildId);
    const u = (update ?? {}) as Partial<FullWelcomeInput>;
    const merged = FullWelcomeConfigSchema.parse({
      welcome: {
        ...c.welcome,
        ...(u.welcome || {}),
        embed: { ...c.welcome.embed, ...(u.welcome?.embed || {}) },
        image: { ...c.welcome.image, ...(u.welcome?.image || {}) },
        buttons: u.welcome?.buttons ?? c.welcome.buttons,
        dm: {
          ...c.welcome.dm,
          ...(u.welcome?.dm || {}),
          embed: { ...c.welcome.dm.embed, ...(u.welcome?.dm?.embed || {}) },
          buttons: u.welcome?.dm?.buttons ?? c.welcome.dm.buttons,
        },
        conditions: { ...c.welcome.conditions, ...(u.welcome?.conditions || {}) },
      },
      goodbye: {
        ...c.goodbye,
        ...(u.goodbye || {}),
        embed: { ...c.goodbye.embed, ...(u.goodbye?.embed || {}) },
        image: { ...c.goodbye.image, ...(u.goodbye?.image || {}) },
        buttons: u.goodbye?.buttons ?? c.goodbye.buttons,
      },
      ghostPing: { ...c.ghostPing, ...(u.ghostPing || {}) },
      options: { ...c.options, ...(u.options || {}) },
    });
    welcomeRepository.saveConfig(guildId, merged);
    return merged;
  }

  public async handleMemberAdd(member: GuildMember): Promise<void> {
    const conf = this.getConfig(member.guild.id);
    const welcomeConfig = conf.welcome;

    welcomeRepository.recordEvent({
      guildId: member.guild.id,
      type: 'MEMBER_JOIN',
      userId: member.id,
      userTag: member.user.tag,
      detail: `Arrivée du membre (Compte créé il y a ${this.getAccountAgeDays(member.user.createdAt)}j).`,
    });

    if (welcomeConfig.autoRoleIds?.length) await AutoRoleService.assignRoles(member, welcomeConfig.autoRoleIds);

    if (welcomeConfig.conditions?.enabled && welcomeConfig.conditions.minAccountAgeDays) {
      const age = this.getAccountAgeDays(member.user.createdAt);
      if (age < welcomeConfig.conditions.minAccountAgeDays) {
        logger.info(`[Welcome] Accueil ignoré pour ${member.user.tag} (compte de ${age}j < ${welcomeConfig.conditions.minAccountAgeDays}j).`);
        return;
      }
    }

    await OnboardingService.startOnboarding(member);

    if (!isModuleEnabled(member.guild.id, 'welcome')) return;
    if (member.user.bot && conf.options.ignoreBots) return;
    if (conf.options.waitVerification && member.pending) return;

    await this.deliverWelcome(member);
  }

  /** « Attendre la vérification » : l'accueil part quand le membre accepte les règles du serveur. */
  public async handleScreeningPassed(member: GuildMember): Promise<void> {
    const conf = this.getConfig(member.guild.id);
    if (!isModuleEnabled(member.guild.id, 'welcome') || !conf.options.waitVerification) return;
    if (member.user.bot && conf.options.ignoreBots) return;
    await this.deliverWelcome(member);
  }

  private async deliverWelcome(joined: GuildMember): Promise<void> {
    const guild = joined.guild;
    // Laisse passer les protections (blacklist, anti-alt, raidmode) : un compte retiré entre-temps n'est jamais accueilli.
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const member = await guild.members.fetch({ user: joined.id, force: true }).catch(() => null);
    if (!member) return;

    const conf = this.getConfig(guild.id);
    const ctx = this.buildVariableContext(member, null);
    const avatarUrl = member.user.displayAvatarURL({ size: 256, extension: 'png' });

    if (conf.welcome.dm.enabled) await this.sendDm(member, conf, ctx, avatarUrl);

    if (conf.welcome.enabled && this.takeWaveSlot(guild.id)) {
      const channel = this.resolveChannel(guild, conf.welcome.channelId);
      if (channel && canBotSendTo(channel, guild.members.me)) {
        ctx.channelId = channel.id;
        const card = conf.welcome.image.enabled ? await this.renderCard(conf.welcome.image, avatarUrl, ctx) : null;
        const sent = await this.post(channel, conf.welcome, ctx, avatarUrl, card, `Bienvenue ${ctx.displayName}`).catch((err) => {
          logger.warn(`[Welcome] Envoi impossible sur ${guild.name} :`, err?.message);
          return null;
        });
        if (sent) {
          this.recentWelcomes.set(`${guild.id}:${member.id}`, { message: sent, at: Date.now() });
          welcomeRepository.recordEvent({ guildId: guild.id, type: 'WELCOME_SENT', userId: member.id, userTag: member.user.tag, detail: `Message de bienvenue envoyé dans #${channel.name}.` });
        }
      }
    }

    if (conf.ghostPing.enabled) await this.ghostPing(member, conf);
  }

  private takeWaveSlot(guildId: string): boolean {
    const now = Date.now();
    const list = (this.waves.get(guildId) ?? []).filter((t) => now - t < WAVE_WINDOW_MS);
    if (list.length >= WAVE_LIMIT) {
      this.waves.set(guildId, list);
      return false;
    }
    list.push(now);
    this.waves.set(guildId, list);
    return true;
  }

  private async ghostPing(member: GuildMember, conf: FullWelcomeConfig): Promise<void> {
    const ctx = { ...this.buildVariableContext(member, null), mentionUser: true };
    for (const id of conf.ghostPing.channelIds) {
      const channel = member.guild.channels.cache.get(id);
      if (!channel || !channel.isTextBased() || !canBotSendTo(channel, member.guild.members.me)) continue;
      const msg = await channel
        .send({ content: VariableParser.parse(conf.ghostPing.text, { ...ctx, channelId: id }).slice(0, 2000), allowedMentions: { users: [member.id], roles: [], parse: [] } })
        .catch(() => null);
      if (msg) setTimeout(() => void msg.delete().catch(() => null), conf.ghostPing.deleteAfterSeconds * 1000).unref();
    }
  }

  public async handleMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
    const guild = member.guild;
    const conf = this.getConfig(guild.id);
    const goodbyeConfig = conf.goodbye;

    welcomeRepository.recordEvent({ guildId: guild.id, type: 'MEMBER_LEAVE', userId: member.id, userTag: member.user?.tag || member.id, detail: 'Départ du membre du serveur.' });

    const key = `${guild.id}:${member.id}`;
    const recent = this.recentWelcomes.get(key);
    this.recentWelcomes.delete(key);
    if (recent && Date.now() - recent.at < QUICK_LEAVE_MS && conf.options.quickLeave !== 'keep') {
      await recent.message.delete().catch(() => null);
      if (conf.options.quickLeave === 'deleteSilent') return;
    }

    if (!isModuleEnabled(guild.id, 'welcome') || !goodbyeConfig.enabled) return;
    if (member.user?.bot && conf.options.ignoreBots) return;

    const channel = this.resolveChannel(guild, goodbyeConfig.channelId);
    if (!channel || !canBotSendTo(channel, guild.members.me)) return;

    const username = member.user?.username || 'Membre';
    const ctx: VariableContext = {
      userId: member.id,
      username,
      displayName: 'displayName' in member && member.displayName ? member.displayName : username,
      userTag: member.user?.tag || username,
      mentionUser: goodbyeConfig.mentionUser,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channel.id,
      userCreatedAt: member.user?.createdAt,
    };
    const avatarUrl = member.user?.displayAvatarURL({ size: 256, extension: 'png' }) || guild.iconURL() || '';
    const card = goodbyeConfig.image.enabled ? await this.renderCard(goodbyeConfig.image, avatarUrl, ctx) : null;
    const sent = await this.post(channel, goodbyeConfig, ctx, avatarUrl, card, `Au revoir ${ctx.displayName}`).catch(() => null);
    if (sent) welcomeRepository.recordEvent({ guildId: guild.id, type: 'GOODBYE_SENT', userId: member.id, userTag: member.user?.tag || username, detail: `Message de départ envoyé dans #${channel.name}.` });
  }

  /** Test depuis le dashboard ou /bienvenue test : la personne qui teste joue le nouveau membre. */
  public async sendTest(
    guild: Guild,
    type: 'welcome' | 'goodbye' | 'ghostping',
    target: 'channel' | 'dm' = 'channel',
    adminUser?: User
  ): Promise<{ success: boolean; channelId?: string; channelName?: string; note?: string }> {
    const conf = this.getConfig(guild.id);
    const member = (adminUser && (await guild.members.fetch(adminUser.id).catch(() => null))) || guild.members.me!;
    const ctx = this.buildVariableContext(member, null);
    const avatarUrl = member.user.displayAvatarURL({ size: 256, extension: 'png' });

    if (type === 'ghostping') {
      if (!conf.ghostPing.channelIds.length) throw Object.assign(new Error('Ajoute au moins un salon pour le ghost ping.'), { status: 400 });
      await this.ghostPing(member, conf);
      return { success: true, note: 'Ghost ping envoyé puis supprimé.' };
    }

    if (target === 'dm') {
      try {
        await this.sendDm(member, conf, ctx, avatarUrl, true);
      } catch (err: any) {
        if (err?.code === 50007) {
          throw Object.assign(new Error("Discord refuse l'envoi : tes messages privés sont fermés pour ce serveur. Active « Autoriser les messages privés des membres du serveur » dans les réglages de confidentialité du serveur, puis réessaie."), { status: 409 });
        }
        throw new Error(`Impossible d'envoyer le MP de test : ${err?.message ?? err}`);
      }
      return { success: true, note: 'Message privé de test envoyé.' };
    }

    const spec = type === 'welcome' ? conf.welcome : conf.goodbye;
    const channel = this.resolveChannel(guild, spec.channelId);
    if (!channel || !canBotSendTo(channel, guild.members.me)) throw Object.assign(new Error('Salon introuvable ou permissions d’envoi insuffisantes.'), { status: 400 });
    ctx.channelId = channel.id;
    const card = spec.image.enabled ? await this.renderCard(spec.image, avatarUrl, ctx) : null;
    await this.post(channel, spec, ctx, avatarUrl, card, type === 'welcome' ? `Bienvenue ${ctx.displayName}` : `Au revoir ${ctx.displayName}`);
    return { success: true, channelId: channel.id, channelName: channel.name };
  }

  private async renderCard(image: WelcomeImageConfig, avatarUrl: string, ctx: VariableContext): Promise<Card> {
    try {
      const buffer = await WelcomeCardGenerator.generateCard({ ...image, enabled: true }, avatarUrl, ctx);
      return { buffer, name: cardFileName(buffer) };
    } catch (err) {
      logger.error('[Welcome] Échec de la génération de la carte image :', err);
      return null;
    }
  }

  private async sendDm(member: GuildMember, conf: FullWelcomeConfig, ctx: VariableContext, avatarUrl: string, rethrow = false): Promise<void> {
    const dm = conf.welcome.dm;
    const card = dm.attachCard ? await this.renderCard(conf.welcome.image, avatarUrl, ctx) : null;
    const spec: MessageSpec = { format: dm.format, contentAbove: dm.contentAbove, messageContent: dm.messageContent, embed: dm.embed, buttons: dm.buttons };
    try {
      const { payload } = await this.buildPayload(member.guild, spec, { ...ctx, mentionUser: false }, avatarUrl, card, true);
      await member.send(payload);
      welcomeRepository.recordEvent({ guildId: member.guild.id, type: 'DM_SENT', userId: member.id, userTag: member.user.tag, detail: 'Message privé de bienvenue délivré.' });
    } catch (err) {
      welcomeRepository.recordEvent({ guildId: member.guild.id, type: 'DM_FAILED', userId: member.id, userTag: member.user.tag, detail: 'DMs fermés ou bloqués par l’utilisateur.' });
      if (rethrow) throw err;
    }
  }

  /** Message prêt à envoyer : Embed, Container (Components V2) ou texte seul, avec la carte et les boutons liens. */
  private async buildPayload(guild: Guild, spec: MessageSpec, ctx: VariableContext, avatarUrl: string, card: Card, dm: boolean) {
    const format = formatOf(spec);
    const e = spec.embed;
    const src = iconSources(e, dm);
    const files: AttachmentBuilder[] = [];
    const parse = (t: string | undefined | null) => (t ? VariableParser.parse(t, ctx) : '');

    // Avatar joint au message : une URL d'avatar Discord expire dès que le membre change d'avatar.
    const needsAvatar = format !== 'text' && [src.author, src.thumbnail, src.image, src.footer].includes('member');
    const avatarBuffer = needsAvatar ? await WelcomeCardGenerator.loadAvatar(avatarUrl) : null;
    if (avatarBuffer) files.push(new AttachmentBuilder(avatarBuffer, { name: 'avatar.png' }));
    const custom = new Map<string, string>();
    const resolveCustom = (url: string | null) => {
      if (!url) return null;
      const local = readLocalAsset(url);
      if (!local) return absolute(url);
      const name = `asset${custom.size}.${url.split('.').pop()}`;
      if (!custom.has(url)) {
        custom.set(url, name);
        files.push(new AttachmentBuilder(local, { name }));
      }
      return `attachment://${custom.get(url)}`;
    };
    const icon = (source: IconSource, customUrl: string | null) =>
      source === 'member' ? (avatarBuffer ? 'attachment://avatar.png' : avatarUrl) : source === 'server' ? guild.iconURL({ size: 256 }) : source === 'custom' ? resolveCustom(customUrl) : null;

    if (card) files.push(new AttachmentBuilder(card.buffer, { name: card.name }));
    const bigImage = card ? `attachment://${card.name}` : icon(src.image, e.imageUrl);

    const mention = spec.mentionUser && ctx.userId ? `<@${ctx.userId}>` : '';
    const above = format === 'text' ? parse(spec.messageContent) : parse(spec.contentAbove);
    const content = mention && !above.includes(mention) ? [mention, above].filter(Boolean).join(' ') : above;
    const roleIds = spec.notifyRoles ? [...content.matchAll(/<@&(\d+)>/g)].map((m) => m[1]) : [];
    const allowedMentions: MessageMentionOptions = { parse: [], users: spec.mentionUser && ctx.userId ? [ctx.userId] : [], roles: roleIds };

    const linkButtons = (spec.buttons ?? []).filter((b) => b.label && /^https:\/\//i.test(b.target)).slice(0, 5);
    const buttonRow = linkButtons.length
      ? new ActionRowBuilder<ButtonBuilder>().addComponents(linkButtons.map((b) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(b.label.slice(0, 80)).setURL(b.target)))
      : null;

    if (format === 'container') {
      const c = new ContainerBuilder();
      if (/^#[0-9a-f]{6}$/i.test(e.color)) c.setAccentColor(parseInt(e.color.slice(1), 16));
      const author = parse(e.authorName);
      const title = parse(e.title);
      const titleLine = title ? (e.url ? `### [${title}](${e.url})` : `### ${title}`) : '';
      const head = [author ? `-# ${author}` : '', titleLine, parse(e.description)].filter(Boolean).join('\n') || '​';
      const thumb = icon(src.thumbnail, e.thumbnailUrl);
      if (thumb) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(head.slice(0, 4000))).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumb)));
      else c.addTextDisplayComponents(new TextDisplayBuilder().setContent(head.slice(0, 4000)));
      for (const f of e.fields.slice(0, 10)) c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${parse(f.name)}**\n${parse(f.value) || '​'}`.slice(0, 4000)));
      if (bigImage) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bigImage)));
      const footer = [parse(e.footer), e.showTimestamp ? `<t:${Math.floor(Date.now() / 1000)}:f>` : ''].filter(Boolean).join(' · ');
      if (footer) c.addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
      if (buttonRow) c.addActionRowComponents(buttonRow);
      const components: Array<TextDisplayBuilder | ContainerBuilder> = content ? [new TextDisplayBuilder().setContent(content.slice(0, 2000)), c] : [c];
      return { payload: { components, files, flags: MessageFlags.IsComponentsV2 as const, allowedMentions }, format };
    }

    const payload: Record<string, any> = { files, allowedMentions };
    if (content) payload.content = content.slice(0, 2000);
    if (format === 'embed') {
      const embed = new EmbedBuilder().setColor((/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#10B981') as `#${string}`);
      const title = parse(e.title);
      if (title) embed.setTitle(title.slice(0, 256));
      if (title && e.url) embed.setURL(e.url);
      const desc = parse(e.description);
      if (desc) embed.setDescription(desc.slice(0, 4096));
      const author = parse(e.authorName);
      if (author) embed.setAuthor({ name: author.slice(0, 256), iconURL: icon(src.author, e.authorIconUrl) ?? undefined });
      const footer = parse(e.footer);
      if (footer) embed.setFooter({ text: footer.slice(0, 2048), iconURL: icon(src.footer, e.footerIconUrl) ?? undefined });
      const thumb = icon(src.thumbnail, e.thumbnailUrl);
      if (thumb) embed.setThumbnail(thumb);
      if (bigImage) embed.setImage(bigImage);
      if (e.showTimestamp) embed.setTimestamp();
      for (const f of e.fields.slice(0, 10)) embed.addFields({ name: parse(f.name).slice(0, 256) || '​', value: parse(f.value).slice(0, 1024) || '​', inline: f.inline ?? false });
      payload.embeds = [embed];
    }
    if (buttonRow) payload.components = [buttonRow];
    if (!payload.content && !payload.embeds && !files.length) payload.content = '​';
    return { payload, format };
  }

  private async post(
    channel: GuildBasedChannel,
    spec: MessageSpec & { asServer?: boolean; deleteAfterSeconds?: number },
    ctx: VariableContext,
    avatarUrl: string,
    card: Card,
    postTitle: string
  ): Promise<Message | null> {
    const { payload, format } = await this.buildPayload(channel.guild, spec, ctx, avatarUrl, card, false);
    let sent: Message | null = null;
    if (spec.asServer && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
      sent = await this.postAsServer(channel as TextChannel, payload, format).catch((err) => {
        logger.warn('[Welcome] Envoi au nom du serveur impossible, envoi normal :', err?.message);
        return null;
      });
    }
    if (!sent) sent = await sendToConfiguredChannel(channel, payload, { postTitle });
    if (sent && spec.deleteAfterSeconds && !isForumLike(channel)) {
      const msg = sent;
      setTimeout(() => void msg.delete().catch(() => null), spec.deleteAfterSeconds * 1000).unref();
    }
    return sent;
  }

  /** « Auteur du message » : publie avec le nom et l'icône du serveur via un webhook d'Etho. */
  private async postAsServer(channel: TextChannel, payload: Record<string, any>, format: Format): Promise<Message> {
    const me = channel.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has(PermissionFlagsBits.ManageWebhooks)) throw new Error('permission « Gérer les webhooks » manquante');
    const hooks = await channel.fetchWebhooks();
    const hook = hooks.find((h) => h.applicationId === channel.client.user.id) ?? (await channel.createWebhook({ name: 'Etho', reason: 'Bienvenue au nom du serveur' }));
    const sent = await hook.send({
      ...payload,
      username: channel.guild.name.slice(0, 80),
      avatarURL: channel.guild.iconURL({ size: 256 }) ?? undefined,
      ...(format === 'container' ? { withComponents: true } : {}),
    } as any);
    return sent as Message;
  }

  private resolveChannel(guild: Guild, channelId: string | null): GuildBasedChannel | null {
    if (channelId) {
      const found = guild.channels.cache.get(channelId);
      if (found && isSendableTarget(found)) return found;
    }
    if (guild.systemChannel && guild.systemChannel.type === ChannelType.GuildText) return guild.systemChannel;
    const fallback = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && (c.name.includes('bienvenue') || c.name.includes('welcome') || c.name.includes('general') || c.name.includes('général'))
    );
    return (fallback as TextChannel) || null;
  }

  private buildVariableContext(member: GuildMember, channelId: string | null): VariableContext {
    const guild = member.guild;
    const owner = guild.members.cache.get(guild.ownerId);
    return {
      userId: member.id,
      username: member.user.username,
      displayName: member.displayName,
      userTag: member.user.tag,
      mentionUser: true,
      userCreatedAt: member.user.createdAt,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      channelId: channelId || undefined,
      serverOwner: owner?.user.tag || 'Propriétaire',
      accountAge: `${this.getAccountAgeDays(member.user.createdAt)} jours`,
    };
  }

  private getAccountAgeDays(createdAt: Date): number {
    return Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);
  }
}

export const welcomeService = new WelcomeService();
