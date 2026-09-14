import { MusicQueue } from './src/modules/music/services/musicQueue.js';
import { musicPersistence } from './src/modules/music/storage/musicPersistence.js';
import { Track } from './src/modules/music/types/music.js';
import { PREFETCH_LEAD_MS, prefetchDelayMs, shouldPrefetch } from './src/modules/music/services/guildMusicPlayer.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

function track(overrides: Partial<Track> & { id: string }): Track {
  return {
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 180,
    thumbnail: 'https://example.test/thumb.png',
    url: 'https://example.test/audio.mp3',
    source: 'DIRECT',
    requestedBy: { id: 'user-1', tag: 'User#0001', avatar: null },
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

async function runTests() {
  console.log('🧪 Starting ETHONE Music Test Suite...\n');

  // 1. MusicQueue basic operations
  console.log('📦 1. MusicQueue Operations:');
  const queue = new MusicQueue('guild-music-test-000000');
  const t1 = track({ id: 't1' });
  const t2 = track({ id: 't2' });
  const t3 = track({ id: 't3' });

  assert(queue.isEmpty(), 'A fresh queue starts empty');
  queue.add(t1);
  queue.add(t2);
  assert(queue.size() === 2, `Queue holds added tracks (size=${queue.size()})`);

  const next = queue.next();
  assert(next?.id === 't1', 'next() advances to the first queued track (FIFO)');
  assert(queue.getCurrentTrack()?.id === 't1', 'getCurrentTrack() reflects the advanced track');

  queue.setCurrentTrack(t2);
  assert(queue.getHistory()[0]?.id === 't1', 'setCurrentTrack() pushes the previous track into history');

  // 2. Snapshot round-trip — the core of restart survival
  console.log('\n💾 2. Queue Snapshot Round-Trip (restart survival):');
  // Note: setCurrentTrack() (called directly above) only tracks "what's
  // playing now" for history purposes — it does NOT dequeue; only next()/
  // previous() remove from the array. So the queue still holds t2 (never
  // shifted off) plus the newly-added t3.
  queue.add(t3);
  queue.setRepeatMode('QUEUE');
  const snapshot = queue.toSnapshot();
  assert(snapshot.queue.length === 2, `Snapshot captures the remaining queue (${snapshot.queue.length} track(s))`);
  assert(snapshot.currentTrack?.id === 't2', 'Snapshot captures the current track');
  assert(snapshot.history.length === 1, 'Snapshot captures history');
  assert(snapshot.repeatMode === 'QUEUE', 'Snapshot captures repeat mode');

  const restored = new MusicQueue('guild-music-test-000000');
  restored.restoreFromSnapshot(snapshot);
  assert(restored.size() === snapshot.queue.length, 'restoreFromSnapshot() rebuilds the queue length');
  assert(restored.getCurrentTrack()?.id === 't2', 'restoreFromSnapshot() rebuilds the current track');
  assert(restored.getHistory().length === 1, 'restoreFromSnapshot() rebuilds history');
  assert(restored.getRepeatMode() === 'QUEUE', 'restoreFromSnapshot() rebuilds repeat mode');
  assert(restored.getTracks()[0]?.id === 't2' && restored.getTracks()[1]?.id === 't3', 'restoreFromSnapshot() preserves track order');

  // 3. musicPersistence queue-state CRUD + multi-guild isolation
  console.log('\n🗄️  3. Queue State Persistence:');
  const GUILD_A = 'music-persist-guild-a-000000';
  const GUILD_B = 'music-persist-guild-b-000000';

  musicPersistence.saveQueueState(GUILD_A, snapshot, 'channel-a', 'PLAYING');
  const stateA = musicPersistence.getQueueState(GUILD_A);
  assert(stateA?.guildId === GUILD_A, 'saveQueueState()/getQueueState() round-trips for guild A');
  assert(stateA?.voiceChannelId === 'channel-a', 'Voice channel id is persisted');
  assert(stateA?.status === 'PLAYING', 'Player status is persisted');
  assert(stateA?.snapshot.currentTrack?.id === 't2', 'The queue snapshot itself round-trips through persistence');

  const stateB = musicPersistence.getQueueState(GUILD_B);
  assert(stateB === null, 'Multi-guild isolation verified (guild B has no saved state)');

  musicPersistence.saveQueueState(GUILD_B, queue.toSnapshot(), 'channel-b', 'PAUSED');
  const allStates = musicPersistence.getAllQueueStates();
  assert(allStates.some((s) => s.guildId === GUILD_A) && allStates.some((s) => s.guildId === GUILD_B), 'getAllQueueStates() returns every saved guild');

  musicPersistence.clearQueueState(GUILD_A);
  assert(musicPersistence.getQueueState(GUILD_A) === null, 'clearQueueState() removes a guild\'s saved state');
  assert(musicPersistence.getQueueState(GUILD_B) !== null, 'clearQueueState() does not affect other guilds');

  // 4. Next-track prefetch scheduling (pure logic only — the actual
  // createAudioResource()/yt-dlp stream behavior can't be exercised without
  // a live bot, see the plan notes for this pass).
  console.log('\n⏱️  4. Prefetch Scheduling:');
  assert(shouldPrefetch(track({ id: 'long', duration: 180 }), 'OFF') === true, 'A normal-length track with repeat OFF is prefetch-eligible');
  assert(shouldPrefetch(track({ id: 'short', duration: 10 }), 'OFF') === false, 'A track shorter than the minimum is skipped (no meaningful gap to hide)');
  assert(shouldPrefetch(track({ id: 'song-repeat', duration: 180 }), 'SONG') === false, 'Repeat SONG mode is skipped (peeking the queue can\'t replicate its compound next() logic)');
  assert(shouldPrefetch(track({ id: 'queue-repeat', duration: 180 }), 'QUEUE') === false, 'Repeat QUEUE mode is skipped for the same reason');
  assert(shouldPrefetch(null, 'OFF') === false, 'No current track means nothing to schedule against');
  assert(shouldPrefetch(track({ id: 'live', duration: 0 }), 'OFF') === false, 'Unknown duration (e.g. a live/radio stream) is skipped — there is no "about to end" to time against');

  const delay = prefetchDelayMs(track({ id: 'delay-test', duration: 180 }));
  assert(delay === 180_000 - PREFETCH_LEAD_MS, `prefetchDelayMs() fires ${PREFETCH_LEAD_MS}ms before the track ends (got ${delay}ms for a 180s track)`);
  assert(prefetchDelayMs(track({ id: 'edge', duration: 5 })) === 0, 'prefetchDelayMs() never returns a negative delay for a track shorter than the lead time');

  // Cleanup — keep this suite idempotent across repeated runs.
  console.log('\n🧹 Cleanup:');
  musicPersistence.clearQueueState(GUILD_B);
  assert(musicPersistence.getQueueState(GUILD_B) === null, 'Test guilds have no leftover queue state after cleanup');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Passed: ${passed}  ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
