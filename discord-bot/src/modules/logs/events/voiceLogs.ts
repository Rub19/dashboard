import { VoiceState } from 'discord.js';
import { logService } from '../services/logService.js';

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;
  if (!guild || !member || member.user.bot) return;

  // 1. Connexion vocale
  if (!oldState.channelId && newState.channelId) {
    logService.emit({
      guildId: guild.id,
      module: 'VOICE',
      type: 'VOICE_JOIN',
      actor: {
        id: member.id,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
      },
      channel: {
        id: newState.channelId,
        name: newState.channel?.name || 'Vocal',
      },
      reason: `Connexion au salon vocal #${newState.channel?.name || newState.channelId}`,
    });
    return;
  }

  // 2. Déconnexion vocale
  if (oldState.channelId && !newState.channelId) {
    logService.emit({
      guildId: guild.id,
      module: 'VOICE',
      type: 'VOICE_LEAVE',
      actor: {
        id: member.id,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
      },
      channel: {
        id: oldState.channelId,
        name: oldState.channel?.name || 'Vocal',
      },
      reason: `Déconnexion du salon vocal #${oldState.channel?.name || oldState.channelId}`,
    });
    return;
  }

  // 3. Changement de salon vocal
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    logService.emit({
      guildId: guild.id,
      module: 'VOICE',
      type: 'VOICE_SWITCH',
      actor: {
        id: member.id,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
      },
      channel: {
        id: newState.channelId,
        name: newState.channel?.name || 'Vocal',
      },
      reason: `Déplacement de #${oldState.channel?.name || 'Vocal'} vers #${newState.channel?.name || 'Vocal'}`,
      before: { channelId: oldState.channelId, channelName: oldState.channel?.name },
      after: { channelId: newState.channelId, channelName: newState.channel?.name },
    });
    return;
  }

  // 4. Mute serveur
  if (oldState.serverMute !== newState.serverMute) {
    logService.emit({
      guildId: guild.id,
      module: 'VOICE',
      type: newState.serverMute ? 'VOICE_MUTE' : 'VOICE_UNMUTE',
      actor: {
        id: member.id,
        tag: member.user.tag,
      },
      target: {
        id: member.id,
        type: 'USER',
        name: member.user.tag,
      },
      reason: newState.serverMute ? 'Mute vocal appliqué' : 'Mute vocal levé',
    });
  }
}
