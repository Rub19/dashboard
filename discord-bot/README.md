# ⚡ Bot Discord TypeScript avec Bun

Bot Discord moderne, ultra-rapide et sécurisé développé en **TypeScript** avec **Discord.js v14** et propulsé par **Bun**.

Il gère un système unifié de commandes : **Slash Commands** (`/`) et **Commandes Préfixes** (`!`, modifiable par serveur).

---

## 🚀 Pourquoi Bun ?

- **Démarrage instantané** (< 10ms) et empreinte mémoire minuscule (~30-50 Mo de RAM sur votre VPS).
- **TypeScript natif** : aucun besoin d'étape de compilation intermédiaire (`tsc`), Bun exécute directement vos fichiers `.ts`.
- **Gestionnaire de paquets ultra-rapide** : `bun install` est jusqu'à 25x plus rapide que npm.

---

## ⚡ Fonctionnalités

- **Command Handler Unifié** : Une commande = un seul code (`execute(ctx)`), exécutable en `/commande` ou `!commande`.
- **Préfixe Dynamique & Persistant** : Préfixe par défaut (`!`) configurable dans `.env`, modifiable à chaud par les admins avec `/prefix` ou `!prefix` (sauvegarde dans `data/prefixes.json`).
- **Validation Zod** : Empêche le bot de démarrer si une variable essentielle (`DISCORD_TOKEN`, `CLIENT_ID`) est manquante.
- **Résilience VPS** : Capture des exceptions et promesses rejetées pour éviter que le bot ne coupe inopinément.
- **Image Docker Bun officielle** : `oven/bun:1-alpine` sous utilisateur non-root `USER bun` pour une isolation parfaite.

---

## 🔑 Étape 1 : Configuration sur le Discord Developer Portal

1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications) > **New Application**.
2. **General Information** : Copiez votre **Application ID** (il servira pour `CLIENT_ID`).
3. Onglet **Bot** :
   - Cliquez sur **Reset Token** et copiez le token (il servira pour `DISCORD_TOKEN`).
   - Activez les **Privileged Gateway Intents** :
     - ✅ **Message Content Intent** *(Indispensable pour lire le préfixe `!`)*
     - ✅ **Server Members Intent**
4. Inviter le bot :
   - Onglet **OAuth2** > **URL Generator**.
   - Cochez les scopes `bot` et `applications.commands`.
   - Cochez les permissions : `Send Messages`, `Embed Links`, `Manage Guild`, `Read Message History`, `Use Slash Commands`.
   - Ouvrez le lien généré pour ajouter le bot sur votre serveur de test.

---

## 💻 Étape 2 : Lancement en local (Développement)

### Option A : Avec Bun (Recommandé)
1. Si vous n'avez pas encore Bun sur Windows, installez-le en ouvrant PowerShell :
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
2. Configurez le fichier `.env` :
   ```bash
   cp .env.example .env
   ```
3. Installez les dépendances et lancez le bot :
   ```bash
   bun install
   bun run dev
   ```

### Option B : Avec Node.js (Fallback)
Si vous préférez tester avec Node.js :
```bash
npm install
npm run node:dev
```

---

## 🐧 Étape 3 : Déploiement sur votre VPS Ubuntu 24.04

### Méthode 1 : Avec Docker (Le plus simple et le plus sécurisé)
Docker isole le bot et inclut déjà Bun :

1. Sur votre VPS Ubuntu 24.04 en SSH :
   ```bash
   # Mettre à jour et sécuriser le pare-feu
   sudo apt update && sudo apt upgrade -y
   sudo ufw allow ssh
   sudo ufw enable

   # Installer Docker
   sudo apt install -y docker.io docker-compose-v2
   sudo systemctl enable --now docker
   ```

2. Transférez le dossier `discord-bot` sur le VPS, créez votre fichier `.env` (`nano .env`), puis lancez :
   ```bash
   docker compose up -d --build
   ```

3. Commandes utiles :
   ```bash
   docker compose logs -f      # Voir les logs en direct
   docker compose restart      # Redémarrer
   docker compose down         # Arrêter
   ```

### Méthode 2 : Directement avec Bun sur le VPS (Sans Docker)
Si vous préférez faire tourner Bun directement sur l'OS :
```bash
# Installer Bun sur Ubuntu
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Entrer dans le projet
cd discord-bot
bun install

# Installer PM2 pour garder le bot allumé en arrière-plan
sudo apt install -y npm
sudo npm install -g pm2
pm2 start "bun run src/index.ts" --name "discord-bot"
pm2 save
pm2 startup
```

---

## 🧩 Ajouter une nouvelle commande

Créez un fichier dans `src/commands/<categorie>/<nom>.ts` :

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext } from '../../types/command.js';

export const helloCommand: Command = {
  name: 'hello',
  description: 'Dit bonjour',
  category: 'Général',
  aliases: ['hi', 'salut'],
  slashData: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Dit bonjour'),
  execute: async (ctx: CommandContext) => {
    await ctx.reply(`Salut ${ctx.author.username} !`);
  },
};
```
Et référencez-la dans `src/handlers/commandHandler.ts` avec `this.register(helloCommand);`.
