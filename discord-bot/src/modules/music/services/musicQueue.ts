import { RepeatMode, Track } from '../types/music.js';

export class MusicQueue {
  private queue: Track[] = [];
  private history: Track[] = [];
  private currentTrack: Track | null = null;
  private repeatMode: RepeatMode = 'OFF';
  private shuffleEnabled: boolean = false;

  constructor(public readonly guildId: string) {}

  public getTracks(): Track[] {
    return [...this.queue];
  }

  public getHistory(): Track[] {
    return [...this.history];
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public setCurrentTrack(track: Track | null): void {
    if (this.currentTrack && track && this.currentTrack.id !== track.id) {
      this.history.unshift(this.currentTrack);
      if (this.history.length > 50) this.history.pop();
    }
    this.currentTrack = track;
  }

  public getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  public isShuffle(): boolean {
    return this.shuffleEnabled;
  }

  public setShuffle(enabled: boolean): void {
    this.shuffleEnabled = enabled;
  }

  public size(): number {
    return this.queue.length;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public add(track: Track, maxQueueSize: number = 100, allowDuplicates: boolean = true): { success: boolean; error?: string } {
    if (this.queue.length >= maxQueueSize) {
      return { success: false, error: `La file d'attente a atteint sa limite maximale (${maxQueueSize} titres).` };
    }

    if (!allowDuplicates) {
      const exists = this.queue.some((t) => t.id === track.id || t.url === track.url);
      if (exists) {
        return { success: false, error: 'Les doublons ne sont pas autorisés dans la file.' };
      }
    }

    this.queue.push(track);
    return { success: true };
  }

  public addNext(track: Track): void {
    this.queue.unshift(track);
  }

  public next(): Track | null {
    // 1. REPEAT SONG : Rejoue le même titre
    if (this.repeatMode === 'SONG' && this.currentTrack) {
      return this.currentTrack;
    }

    // 2. REPEAT QUEUE : Remet le titre terminé à la fin de la file
    if (this.repeatMode === 'QUEUE' && this.currentTrack) {
      this.queue.push(this.currentTrack);
    }

    if (this.queue.length === 0) {
      this.currentTrack = null;
      return null;
    }

    const nextTrack = this.queue.shift() || null;
    this.setCurrentTrack(nextTrack);
    return nextTrack;
  }

  public previous(): Track | null {
    if (this.history.length === 0) return null;
    const prev = this.history.shift()!;
    if (this.currentTrack) {
      this.queue.unshift(this.currentTrack);
    }
    this.currentTrack = prev;
    return prev;
  }

  public remove(index: number): Track | null {
    if (index < 0 || index >= this.queue.length) return null;
    const [removed] = this.queue.splice(index, 1);
    return removed || null;
  }

  public reorder(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.queue.length || toIndex < 0 || toIndex >= this.queue.length) {
      return false;
    }
    const [moved] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, moved);
    return true;
  }

  public moveToTop(index: number): boolean {
    return this.reorder(index, 0);
  }

  public moveUp(index: number): boolean {
    return this.reorder(index, index - 1);
  }

  public moveDown(index: number): boolean {
    return this.reorder(index, index + 1);
  }

  public shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.shuffleEnabled = true;
  }

  public clear(): void {
    this.queue = [];
  }

  public reset(): void {
    this.queue = [];
    this.history = [];
    this.currentTrack = null;
    this.repeatMode = 'OFF';
    this.shuffleEnabled = false;
  }
}
