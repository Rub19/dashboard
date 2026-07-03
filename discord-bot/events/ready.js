import { ActivityType } from 'discord.js';
import { setClient } from '../utils/database.js';

export default {
  name: 'ready',
  once: true,
  execute(client) {
    setClient(client);
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    const activities = [
      { name: '/help pour les commandes', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} serveurs`, type: ActivityType.Watching },
      { name: 'vos commandes', type: ActivityType.Listening },
    ];
    let i = 0;
    client.user.setActivity(activities[0].name, { type: activities[0].type });
    setInterval(() => {
      i = (i + 1) % activities.length;
      client.user.setActivity(activities[i].name, { type: activities[i].type });
    }, 15000);
  },
};
