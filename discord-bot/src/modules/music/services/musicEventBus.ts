import { EventEmitter } from 'events';
import { GuildMusicState } from '../types/music.js';

class MusicEventBus extends EventEmitter {
  public emitStateUpdate(state: GuildMusicState): void {
    this.emit('stateUpdate', state);
    this.emit(`guild:${state.guildId}:state`, state);
  }

  public onGuildState(guildId: string, listener: (state: GuildMusicState) => void): () => void {
    const event = `guild:${guildId}:state`;
    this.on(event, listener);
    return () => this.off(event, listener);
  }
}

export const musicEventBus = new MusicEventBus();
