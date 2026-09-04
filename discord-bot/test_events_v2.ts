import { eventRepository } from './src/modules/events/eventsRepository.js';
import { EventService } from './src/modules/events/eventsService.js';
import { EventRSVPService } from './src/modules/events/eventsRsvpService.js';
import { EventsCheckinService } from './src/modules/events/eventsCheckinService.js';
import { buildEventDiscordPanel } from './src/modules/events/eventsUiPanel.js';
import { eventCommand } from './src/modules/events/eventsCommand.js';
import assert from 'assert';

async function runTests() {
  console.log('🧪 Starting Events & Calendar 2.0 Test Suite...\n');

  const testGuildId = 'test-guild-777';

  // 1. Initial seeded events
  const initialEvents = eventRepository.getEventsByGuild(testGuildId);
  assert(initialEvents.length >= 4, 'Should have seeded events for test guild');
  console.log(`✅ Seeded events loaded: ${initialEvents.length} events found.`);

  // 2. Create Event
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 7200 * 1000).toISOString();

  const newEvent = EventService.createEvent({
    guildId: testGuildId,
    title: 'Test Cyber Championship',
    description: 'Autonomous competitive session test',
    startDate: startTime,
    endDate: endTime,
    category: 'TOURNAMENT',
    location: {
      type: 'VOICE',
      channelId: 'vc-test-1',
      channelName: 'Tournament Arena',
    },
    capacity: {
      unlimited: false,
      maxParticipants: 2,
      waitlistEnabled: true,
    },
  });

  assert(newEvent.id, 'New event should have an ID');
  assert.strictEqual(newEvent.status, 'SCHEDULED');
  console.log(`✅ Event creation passed: ${newEvent.id}`);

  // 3. RSVP - User 1 GOING
  const rsvp1 = EventRSVPService.handleRSVP(
    testGuildId,
    newEvent.id,
    { id: 'user-001', username: 'Neo' },
    'GOING'
  );
  assert(rsvp1.success, 'RSVP 1 should succeed');
  assert.strictEqual(rsvp1.status, 'GOING');

  // 4. RSVP - User 2 GOING (Max cap = 2 reached)
  const rsvp2 = EventRSVPService.handleRSVP(
    testGuildId,
    newEvent.id,
    { id: 'user-002', username: 'Trinity' },
    'GOING'
  );
  assert(rsvp2.success, 'RSVP 2 should succeed');
  assert.strictEqual(rsvp2.status, 'GOING');

  // 5. RSVP - User 3 GOING -> WAITLIST
  const rsvp3 = EventRSVPService.handleRSVP(
    testGuildId,
    newEvent.id,
    { id: 'user-003', username: 'Morpheus' },
    'GOING'
  );
  assert(rsvp3.success, 'RSVP 3 should succeed into waitlist');
  assert.strictEqual(rsvp3.status, 'WAITLIST');
  assert.strictEqual(rsvp3.waitlistPosition, 1);
  console.log('✅ Capacity limit & automatic waitlist queueing verified.');

  // 6. User 1 cancels -> User 3 promoted
  const rsvpCancel = EventRSVPService.handleRSVP(
    testGuildId,
    newEvent.id,
    { id: 'user-001', username: 'Neo' },
    'NOT_GOING'
  );
  assert(rsvpCancel.success, 'Cancel should succeed');
  assert(rsvpCancel.promotedParticipant, 'Waitlist participant should be promoted');
  assert.strictEqual(rsvpCancel.promotedParticipant.userId, 'user-003');
  assert.strictEqual(rsvpCancel.promotedParticipant.rsvp, 'GOING');
  console.log('✅ Automatic waitlist promotion verified.');

  // 7. Check-in validation
  const checkinRes = EventsCheckinService.checkInUser({
    guildId: testGuildId,
    eventId: newEvent.id,
    userId: 'user-003',
    username: 'Morpheus',
    method: 'DISCORD_BUTTON',
  });
  assert(checkinRes.success, 'Check-in should succeed');
  assert.strictEqual(checkinRes.participant?.attendance, 'ATTENDED');
  console.log('✅ Check-in validation verified.');

  // 8. Reschedule & Duplicate
  const futureStart = new Date(Date.now() + 86400 * 1000 * 3).toISOString();
  const futureEnd = new Date(Date.now() + 86400 * 1000 * 3 + 3600 * 1000).toISOString();
  const rescheduleRes = EventService.rescheduleEvent(testGuildId, newEvent.id, futureStart, futureEnd);
  assert(rescheduleRes.success);
  assert.strictEqual(rescheduleRes.event?.startDate, futureStart);

  const duplicated = EventService.duplicateEvent(testGuildId, newEvent.id);
  assert(duplicated && duplicated.id !== newEvent.id);
  console.log('✅ Reschedule and duplicate verified.');

  // 9. UI Embed Panel Builder
  const panel = buildEventDiscordPanel(newEvent);
  assert(panel.embeds && panel.embeds.length > 0);
  assert(panel.components && panel.components.length > 0);
  console.log('✅ Discord UI Embed & Action Rows built successfully.');

  // 10. Slash Command definition
  assert.strictEqual(eventCommand.name, 'event');
  assert(eventCommand.slashData);
  console.log('✅ Slash command metadata verified.');

  console.log('\n🎉 ALL 10/10 EVENTS & CALENDAR 2.0 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
