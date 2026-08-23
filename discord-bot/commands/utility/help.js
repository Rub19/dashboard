import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const CATEGORIES = {
  '🛡️ Modération': [
    { name: '/kick', desc: 'Expulser un membre' },
    { name: '/ban', desc: 'Bannir un membre' },
    { name: '/timeout', desc: 'Mettre en timeout' },
    { name: '/warn', desc: 'Gérer les avertissements' },
    { name: '/clear', desc: 'Supprimer des messages en masse' },
  ],
  '🎮 Fun': [
    { name: '/8ball', desc: 'La boule magique' },
    { name: '/coinflip', desc: 'Pile ou face' },
    { name: '/dice', desc: 'Lancer des dés' },
    { name: '/joke', desc: 'Une blague' },
    { name: '/rps', desc: 'Pierre-Papier-Ciseaux' },
    { name: '/trivia', desc: 'Question de culture générale' },
  ],
  'ℹ️ Informations': [
    { name: '/ping', desc: 'Latence du bot' },
    { name: '/userinfo', desc: 'Infos d\'un utilisateur' },
    { name: '/serverinfo', desc: 'Infos du serveur' },
    { name: '/avatar', desc: 'Avatar d\'un utilisateur' },
  ],
  '🔧 Utilitaires': [
    { name: '/poll', desc: 'Créer un sondage' },
    { name: '/reminder', desc: 'Créer un rappel' },
  ],
  '💰 Économie': [
    { name: '/balance', desc: 'Voir ton solde et niveau' },
    { name: '/daily', desc: 'Réclamer ta récompense quotidienne' },
    { name: '/leaderboard', desc: 'Classement du serveur' },
    { name: '/give', desc: 'Donner des coins à quelqu\'un' },
  ],
};

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher toutes les commandes disponibles 📖'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Aide — Commandes disponibles')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: `Demandé par ${interaction.user.username}` })
      .setTimestamp();

    for (const [category, cmds] of Object.entries(CATEGORIES)) {
      embed.addFields({
        name: category,
        value: cmds.map(c => `\`${c.name}\` — ${c.desc}`).join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
