import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];

const commandFolders = readdirSync(join(__dirname, 'commands'));
for (const folder of commandFolders) {
  const commandFiles = readdirSync(join(__dirname, 'commands', folder)).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const { default: command } = await import(join(__dirname, 'commands', folder, file));
    if (command?.data) commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log(`Déploiement de ${commands.length} commandes slash...`);
  // Pour un déploiement global, retirez le GUILD_ID
  const data = process.env.GUILD_ID
    ? await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
    : await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log(`✅ ${data.length} commandes déployées avec succès.`);
} catch (error) {
  console.error(error);
}
