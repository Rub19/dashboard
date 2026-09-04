import { voiceRepository } from '../storage/voiceRepository.js';

export class VoiceNumberPool {
  public static getNextAvailableNumber(guildId: string, hubId: string): number {
    const activeRooms = voiceRepository.getRooms(guildId).filter((r) => r.hubId === hubId);
    const usedNumbers = new Set<number>();
    const regex = /#(\d+)/;
    for (const room of activeRooms) {
      const match = room.name.match(regex);
      if (match && match[1]) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    }
    let candidate = 1;
    while (usedNumbers.has(candidate)) {
      candidate++;
    }
    return candidate;
  }
}