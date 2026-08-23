import { addXp, getUser } from '../utils/database.js';
import { EmbedBuilder } from 'discord.js';

const XP_COOLDOWN = 60000; // 1 minute entre chaque gain d'XP

export default {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const user = getUser(message.author.id, message.guild.id);
    const now = Date.now();
    const lastXp = user.last_xp ? new Date(user.last_xp).getTime() : 0;

    if (now - lastXp < XP_COOLDOWN) return;

    const xpGain = Math.floor(Math.random() * 15) + 10;
    const { leveled, newLevel } = addXp(message.author.id, message.guild.id, xpGain);

    // Update last_xp timestamp
    const { getDb } = await import('../utils/database.js');
    getDb().prepare('UPDATE users SET last_xp = ? WHERE user_id = ? AND guild_id = ?')
      .run(new Date().toISOString(), message.author.id, message.guild.id);

    if (leveled) {
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('🎉 Niveau supérieur !')
        .setDescription(`Félicitations ${message.author} ! Tu as atteint le **niveau ${newLevel}** !`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
      message.channel.send({ embeds: [embed] });
    }
  },
};
