import { PermissionsBitField, ChannelType, Collection } from 'discord.js';
import { ServerOverviewService } from '../src/modules/server/services/serverOverviewService.js';
import { ServerMemberService } from '../src/modules/server/services/serverMemberService.js';
import { ServerChannelService } from '../src/modules/server/services/serverChannelService.js';
import { ServerRoleService } from '../src/modules/server/services/serverRoleService.js';
import { ServerPermissionDebugger } from '../src/modules/server/services/serverPermissionDebugger.js';
import { ServerEmojiService } from '../src/modules/server/services/serverEmojiService.js';
import { ServerWebhookService } from '../src/modules/server/services/serverWebhookService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting Server Management Center 2.0 Test Suite...\n');

  // ========================================================
  // 1. Mock Guild & Client Creation
  // ========================================================
  const mockMembers = new Collection<string, any>();
  const mockRoles = new Collection<string, any>();
  const mockChannels = new Collection<string, any>();
  const mockEmojis = new Collection<string, any>();
  const mockStickers = new Collection<string, any>();

  // Mock Roles
  const adminRole = {
    id: 'role_admin',
    name: 'Admin',
    color: 0xff0000,
    hexColor: '#ff0000',
    position: 10,
    permissions: new PermissionsBitField([PermissionsBitField.Flags.Administrator]),
    managed: false,
    mentionable: true,
    members: new Map(),
  };
  const modRole = {
    id: 'role_mod',
    name: 'Modérateur',
    color: 0x00ff00,
    hexColor: '#00ff00',
    position: 5,
    permissions: new PermissionsBitField([PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.ManageMessages]),
    managed: false,
    mentionable: true,
    members: new Map(),
  };
  const botRole = {
    id: 'role_bot',
    name: 'ETHONE Bot',
    color: 0x5865f2,
    hexColor: '#5865f2',
    position: 8,
    permissions: new PermissionsBitField([PermissionsBitField.Flags.Administrator]),
    managed: true,
    mentionable: false,
    members: new Map(),
  };
  const everyoneRole = {
    id: 'guild_123',
    name: '@everyone',
    color: 0x000000,
    hexColor: '#000000',
    position: 0,
    permissions: new PermissionsBitField([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]),
    managed: false,
    mentionable: false,
    members: new Map(),
  };

  mockRoles.set(adminRole.id, adminRole);
  mockRoles.set(modRole.id, modRole);
  mockRoles.set(botRole.id, botRole);
  mockRoles.set(everyoneRole.id, everyoneRole);

  // Mock Members
  const ownerMember = {
    id: 'user_owner',
    displayName: 'GuildOwner',
    user: { id: 'user_owner', username: 'owner_user', tag: 'owner_user#0001', bot: false, createdAt: new Date(Date.now() - 365 * 86400000), displayAvatarURL: () => 'https://avatar/owner.png', avatar: 'hash_owner' },
    joinedAt: new Date(Date.now() - 300 * 86400000),
    roles: { cache: new Collection([[adminRole.id, adminRole]]) },
    permissions: new PermissionsBitField([PermissionsBitField.Flags.Administrator]),
    isCommunicationDisabled: () => false,
    voice: { channelId: null, serverMute: false, serverDeaf: false },
  };

  const suspiciousMember = {
    id: 'user_suspicious',
    displayName: 'NewSpammer',
    user: { id: 'user_suspicious', username: 'new_spammer', tag: 'new_spammer#9999', bot: false, createdAt: new Date(Date.now() - 3600000), displayAvatarURL: () => '', avatar: null },
    joinedAt: new Date(Date.now() - 1800000), // joined 30 mins ago
    roles: { cache: new Collection([[everyoneRole.id, everyoneRole]]) },
    permissions: new PermissionsBitField([PermissionsBitField.Flags.SendMessages]),
    isCommunicationDisabled: () => false,
    voice: { channelId: null, serverMute: false, serverDeaf: false },
  };

  const botMember = {
    id: 'bot_ethone',
    displayName: 'ETHONE',
    user: { id: 'bot_ethone', username: 'ethone_bot', tag: 'ethone#0000', bot: true, createdAt: new Date(Date.now() - 200 * 86400000), displayAvatarURL: () => '', avatar: 'bot_avatar' },
    joinedAt: new Date(Date.now() - 200 * 86400000),
    roles: { cache: new Collection([[botRole.id, botRole]]), highest: { position: 8 } },
    permissions: new PermissionsBitField([PermissionsBitField.Flags.Administrator]),
    isCommunicationDisabled: () => false,
    voice: { channelId: null, serverMute: false, serverDeaf: false },
  };

  mockMembers.set(ownerMember.id, ownerMember);
  mockMembers.set(suspiciousMember.id, suspiciousMember);
  mockMembers.set(botMember.id, botMember);

  // Mock Channels
  const catGeneral = {
    id: 'cat_general',
    name: 'COMMUNAUTÉ',
    type: ChannelType.GuildCategory,
    position: 0,
    rawPosition: 0,
    parentId: null,
  };

  const textGeneral = {
    id: 'chan_general',
    name: 'général',
    type: ChannelType.GuildText,
    position: 1,
    rawPosition: 1,
    parentId: 'cat_general',
    topic: 'Salon de discussion principal',
    nsfw: false,
    rateLimitPerUser: 5,
    permissionOverwrites: {
      cache: new Collection([
        ['guild_123', { id: 'guild_123', type: 0, allow: new PermissionsBitField([PermissionsBitField.Flags.ViewChannel]), deny: new PermissionsBitField() }],
      ]),
    },
  };

  const textVip = {
    id: 'chan_vip',
    name: 'vip-secret',
    type: ChannelType.GuildText,
    position: 2,
    rawPosition: 2,
    parentId: 'cat_general',
    permissionOverwrites: {
      cache: new Collection([
        ['guild_123', { id: 'guild_123', type: 0, allow: new PermissionsBitField(), deny: new PermissionsBitField([PermissionsBitField.Flags.ViewChannel]) }],
        ['role_mod', { id: 'role_mod', type: 0, allow: new PermissionsBitField([PermissionsBitField.Flags.ViewChannel]), deny: new PermissionsBitField() }],
      ]),
    },
  };

  const voiceLounge = {
    id: 'chan_voice',
    name: 'Salon Vocal 1',
    type: ChannelType.GuildVoice,
    position: 3,
    rawPosition: 3,
    parentId: 'cat_general',
    bitrate: 64000,
    userLimit: 10,
    permissionOverwrites: { cache: new Collection() },
  };

  mockChannels.set(catGeneral.id, catGeneral);
  mockChannels.set(textGeneral.id, textGeneral);
  mockChannels.set(textVip.id, textVip);
  mockChannels.set(voiceLounge.id, voiceLounge);

  // Guild Mock
  const mockGuild: any = {
    id: 'guild_123',
    name: 'ETHONE Realm',
    iconURL: () => 'https://cdn.discord/guild.png',
    bannerURL: () => null,
    description: 'Communauté officielle',
    ownerId: 'user_owner',
    createdAt: new Date(Date.now() - 400 * 86400000),
    preferredLocale: 'fr',
    verificationLevel: 2,
    explicitContentFilter: 2,
    defaultMessageNotifications: 1,
    afkTimeout: 300,
    afkChannelId: null,
    systemChannelId: 'chan_general',
    rulesChannelId: null,
    publicUpdatesChannelId: null,
    premiumTier: 1, // Tier 1 boost
    premiumSubscriptionCount: 3,
    vanityURLCode: null,
    memberCount: 3,
    members: {
      cache: mockMembers,
      me: botMember,
      fetch: async (id?: string) => (id ? mockMembers.get(id) : mockMembers),
    },
    roles: {
      cache: mockRoles,
      everyone: everyoneRole,
      fetch: async (id?: string) => (id ? mockRoles.get(id) : mockRoles),
    },
    channels: {
      cache: mockChannels,
      fetch: async (id?: string) => (id ? mockChannels.get(id) : mockChannels),
    },
    emojis: {
      cache: mockEmojis,
      fetch: async () => mockEmojis,
    },
    stickers: {
      cache: mockStickers,
      fetch: async () => mockStickers,
    },
    voiceStates: {
      cache: new Collection(),
    },
    invites: {
      fetch: async () => new Collection(),
    },
    fetchWebhooks: async () => new Collection(),
  };

  const mockClient: any = {
    guilds: {
      cache: new Collection([[mockGuild.id, mockGuild]]),
    },
    user: { id: 'bot_ethone' },
    isReady: () => true,
    ws: { ping: 42, status: 0 },
    uptime: 120000,
  };

  // ========================================================
  // Test 1: Security Score Calculation
  // ========================================================
  const security = ServerOverviewService.calculateSecurityScore(mockGuild);
  assert(security.score >= 0 && security.score <= 100, `Security score (${security.score}) is between 0 and 100`);
  assert(security.factors.length >= 4, 'Security factors are transparently explained');
  assert(typeof security.status === 'string', `Security status is categorized (${security.status})`);

  // ========================================================
  // Test 2: Health Score Calculation
  // ========================================================
  const health = ServerOverviewService.calculateHealthScore(mockClient);
  assert(health.score >= 0 && health.score <= 100, `Health score (${health.score}) is valid`);
  assert(health.components.discordGateway.status === 'HEALTHY', 'Gateway status is HEALTHY with 42ms ping');
  assert(health.components.memory.heapUsedMb > 0, 'Memory subsystem captures real Node heap stats');

  // ========================================================
  // Test 3: Channel Tree Builder
  // ========================================================
  const tree = ServerChannelService.getChannelTree(mockClient, 'guild_123');
  assert(tree.categories.length === 1, 'Channel Tree found 1 category');
  assert(tree.categories[0].channels.length === 3, 'Category has 3 child channels');
  assert(tree.categories[0].channels[0].name === 'général', 'General channel is correctly placed in category');

  // ========================================================
  // Test 4: Role Hierarchy & Bot Boundary
  // ========================================================
  // Bot role position is 8.
  // Admin role position is 10 (ABOVE bot). Bot CANNOT modify admin role!
  // Mod role position is 5 (BELOW bot). Bot CAN modify mod role!
  const roles = ServerRoleService.getRoles(mockClient, 'guild_123');
  const adminItem = roles.find((r) => r.id === 'role_admin');
  const modItem = roles.find((r) => r.id === 'role_mod');
  assert(adminItem?.isEditableByBot === false, 'Bot ceiling: Admin role (pos 10 > bot pos 8) is NOT editable by bot');
  assert(modItem?.isEditableByBot === true, 'Bot ceiling: Mod role (pos 5 < bot pos 8) IS editable by bot');

  // ========================================================
  // Test 5: Permission Debugger Resolution Chain
  // ========================================================
  // Case A: Owner has unconditional Administrator access
  const ownerDebug = await ServerPermissionDebugger.debugPermission(
    mockClient,
    'guild_123',
    'user_owner',
    'chan_general',
    'ManageChannels'
  );
  assert(ownerDebug?.isAllowed === true, 'Permission Debugger: Server Owner always granted permission');
  assert(ownerDebug?.steps.some((s) => s.level === 'SERVER_OWNER' && s.effect === 'ALLOW') === true, 'Owner step executed with ALLOW effect');

  // Case B: Suspicious member in VIP channel (denied by @everyone overwrite)
  const vipDebug = await ServerPermissionDebugger.debugPermission(
    mockClient,
    'guild_123',
    'user_suspicious',
    'chan_vip',
    'ViewChannel'
  );
  assert(vipDebug?.isAllowed === false, 'Permission Debugger: Member denied ViewChannel by channel overwrite');
  assert(vipDebug?.steps.some((s) => s.level === 'EVERYONE_OVERWRITE' && s.effect === 'DENY') === true, 'Everyone overwrite step executed with DENY');

  // ========================================================
  // Test 6: Emoji & Sticker Quotas (Boost Tier 1)
  // ========================================================
  const emojiData = await ServerEmojiService.getEmojisAndStickers(mockClient, 'guild_123');
  assert(emojiData !== null, 'Emoji data retrieved');
  assert(emojiData?.quota.maxStatic === 100, 'Boost Tier 1 provides 100 emoji slots');
  assert(emojiData?.quota.maxStickers === 15, 'Boost Tier 1 provides 15 sticker slots');

  // ========================================================
  // Test 7: Webhook Token Redaction
  // ========================================================
  mockGuild.fetchWebhooks = async () => {
    const map = new Collection();
    map.set('hook_1', {
      id: 'hook_1',
      name: 'GitHub Notifier',
      channelId: 'chan_general',
      avatarURL: () => null,
      owner: { tag: 'Dev#0001' },
      createdAt: new Date(),
      token: 'CRITICAL_SECRET_TOKEN_DO_NOT_LEAK', // sensitive secret
    });
    return map;
  };

  const webhooks = await ServerWebhookService.getWebhooks(mockClient, 'guild_123');
  assert(webhooks.length === 1, 'Webhook fetched');
  assert(!('token' in (webhooks[0] as any)), 'SECURITY: Webhook token is strictly redacted and absent from item');

  // ========================================================
  // Test 8: Global Server Search
  // ========================================================
  const searchResults = await ServerOverviewService.searchGlobal(mockClient, 'guild_123', 'général');
  assert(searchResults.channels.length > 0, 'Global search found channel "général"');
  assert(searchResults.channels[0].name === 'général', 'Matched correct channel entity');

  const memberSearch = await ServerOverviewService.searchGlobal(mockClient, 'guild_123', 'spammer');
  assert(memberSearch.members.length > 0, 'Global search found member "new_spammer"');

  // ========================================================
  // Test Summary
  // ========================================================
  console.log('\n======================================');
  console.log(`Server Management Center 2.0 Tests: ${passed} passed, ${failed} failed`);
  console.log('======================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
