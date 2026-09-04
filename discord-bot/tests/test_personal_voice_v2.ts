import { voiceRepository } from '../src/modules/voice/storage/voiceRepository.js';
import { DiscordVoicePanel } from '../src/modules/voice/ui/discordVoicePanel.js';
import { TemporaryVoiceRoom } from '../src/modules/voice/types/index.js';

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
  console.log('🧪 Starting Personal Voice Rooms 2.0 Test Suite...\n');
  const demoGuild = 'test_guild_voice_v2';
  const demoUser = 'test_user_owner_1';

  // 1. Voice Settings
  const settings = voiceRepository.getSettings(demoGuild);
  assert(settings.enabled === true, 'Default voice settings are enabled');
  assert(typeof settings.emptyDeletionDelaySeconds === 'number', 'Grace period delay is configured');

  const updatedSettings = voiceRepository.updateSettings(demoGuild, {
    creationTextChannelId: 'text_chan_123',
    emptyDeletionDelaySeconds: 45,
    defaultRoomNameTemplate: '🎮 Repaire de {username}',
  });
  assert(updatedSettings.creationTextChannelId === 'text_chan_123', 'Settings: creationTextChannelId updated');
  assert(updatedSettings.emptyDeletionDelaySeconds === 45, 'Settings: emptyDeletionDelaySeconds updated to 45s');

  // 2. User Preferences
  const savedPrefs = voiceRepository.saveUserPreferences({
    userId: demoUser,
    defaultName: '⚡ Salon VIP de {username}',
    defaultLimit: 8,
    defaultLocked: true,
    defaultHidden: false,
    defaultBitrate: 96000,
    updatedAt: new Date().toISOString(),
  });
  assert(savedPrefs.userId === demoUser, 'User preferences saved successfully');
  const fetchedPrefs = voiceRepository.getUserPreferences(demoUser);
  assert(fetchedPrefs?.defaultName === '⚡ Salon VIP de {username}', 'User preferences fetched accurately');
  assert(fetchedPrefs?.defaultLimit === 8, 'User preferences limit is 8');
  assert(fetchedPrefs?.defaultLocked === true, 'User preferences locked by default');

  // 3. Room Creation Entity & Whitelist
  const testRoom: TemporaryVoiceRoom = {
    id: 'room_test_v2_1',
    guildId: demoGuild,
    hubId: 'personal_voice_2',
    hubName: 'Personal Voice Rooms 2.0',
    name: '⚡ Salon VIP de John',
    ownerId: demoUser,
    ownerTag: 'John#1234',
    userLimit: 8,
    bitrate: 96000,
    isLocked: true,
    isHidden: false,
    allowedUserIds: [],
    blockedUserIds: [],
    whitelist: [],
    banlist: [],
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
    currentUsers: [
      {
        id: demoUser,
        tag: 'John#1234',
        joinedAt: new Date().toISOString(),
      },
    ],
    peakUsers: 1,
    totalSecondsActive: 0,
  };
  voiceRepository.saveRoom(testRoom);

  const room = voiceRepository.getRoomById('room_test_v2_1');
  assert(room !== undefined, 'Room saved and retrieved by ID');
  assert(room?.ownerId === demoUser, 'Room owner matches');

  // 4. Whitelist Management
  voiceRepository.addToWhitelist(testRoom.id, 'friend_user_1', demoUser, 'John#1234');
  const roomWithWhitelist = voiceRepository.getRoomById(testRoom.id);
  assert(
    (roomWithWhitelist?.allowedUserIds || []).includes('friend_user_1'),
    'User added to room whitelist'
  );

  // 5. Banlist Management & Mutual Exclusion
  voiceRepository.addToBanlist(testRoom.id, 'friend_user_1', demoUser, 'John#1234');
  const roomWithBan = voiceRepository.getRoomById(testRoom.id);
  assert(
    (roomWithBan?.blockedUserIds || []).includes('friend_user_1'),
    'User added to room banlist'
  );
  assert(
    !(roomWithBan?.allowedUserIds || []).includes('friend_user_1'),
    'User removed from whitelist upon being banned'
  );

  // 6. Whitelist restores from Banlist
  voiceRepository.addToWhitelist(testRoom.id, 'friend_user_1', demoUser, 'John#1234');
  const roomRestored = voiceRepository.getRoomById(testRoom.id);
  assert(
    (roomRestored?.allowedUserIds || []).includes('friend_user_1') &&
    !(roomRestored?.blockedUserIds || []).includes('friend_user_1'),
    'User whitelisted and removed from banlist'
  );

  // 7. Timeline events logging
  const timeline = voiceRepository.getRoomTimeline(testRoom.id);
  assert(timeline.length >= 3, 'Timeline events recorded for whitelist/banlist operations');

  // 8. Discord UI Creation Panel Builder
  const createPanelPayload = DiscordVoicePanel.buildCreatePanel(updatedSettings);
  assert(createPanelPayload.embeds.length === 1, 'Creation panel contains 1 embed');
  assert(createPanelPayload.components.length === 1, 'Creation panel contains 1 action row');
  const createButtons = (createPanelPayload.components[0] as any).components;
  assert(createButtons.length === 3, 'Creation panel contains 3 buttons (Create, Prefs, Help)');

  // 9. Discord UI Room Control Panel Builder
  const controlPanelPayload = DiscordVoicePanel.buildControlPanel(roomRestored!);
  assert(controlPanelPayload.embeds.length === 1, 'Control panel contains 1 embed');
  assert(controlPanelPayload.components.length === 2, 'Control panel contains 2 action rows (Quick Controls & Moderation)');
  const row1Buttons = (controlPanelPayload.components[0] as any).components;
  const row2Buttons = (controlPanelPayload.components[1] as any).components;
  assert(row1Buttons.length === 5, 'Control panel Row 1 contains 5 buttons (Lock, Hide, Rename, Limit, Delete)');
  assert(row2Buttons.length === 5, 'Control panel Row 2 contains 5 buttons (Whitelist, Banlist, Mute, Kick, Transfer)');

  // 10. Room Deletion & Cleanup
  voiceRepository.deleteRoom(testRoom.id);
  const deletedRoom = voiceRepository.getRoomById(testRoom.id);
  assert(deletedRoom?.status === 'DELETED', 'Room marked as DELETED in repository');
  const activeRooms = voiceRepository.getRooms(demoGuild);
  assert(!activeRooms.some((r) => r.id === testRoom.id), 'Deleted room excluded from active rooms query');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
