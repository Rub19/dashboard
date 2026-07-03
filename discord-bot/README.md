# 🤖 Bot Discord Multi-Fonctionnalités

Bot Discord complet construit avec [discord.js v14](https://discord.js.org/), avec système d'économie, modération, commandes fun, et plus encore.

## ✨ Fonctionnalités

### 🛡️ Modération
| Commande | Description |
|----------|-------------|
| `/kick` | Expulser un membre |
| `/ban` | Bannir un membre (avec suppression de messages) |
| `/timeout` | Mettre un membre en sourdine temporairement |
| `/warn add/list/clear` | Gérer les avertissements |
| `/clear` | Supprimer des messages en masse (jusqu'à 100) |

### 🎮 Fun
| Commande | Description |
|----------|-------------|
| `/8ball` | La boule magique |
| `/coinflip` | Pile ou face |
| `/dice` | Lancer des dés personnalisables (XdY) |
| `/joke` | Une blague aléatoire |
| `/rps` | Pierre-Papier-Ciseaux contre le bot |
| `/trivia` | Question de culture générale interactive |

### ℹ️ Informations
| Commande | Description |
|----------|-------------|
| `/ping` | Latence du bot et de l'API |
| `/userinfo` | Infos complètes d'un utilisateur |
| `/serverinfo` | Infos du serveur |
| `/avatar` | Afficher l'avatar d'un membre |

### 🔧 Utilitaires
| Commande | Description |
|----------|-------------|
| `/poll` | Créer un sondage avec jusqu'à 5 choix |
| `/reminder` | Créer un rappel (10m, 2h, 1j...) |
| `/help` | Afficher toutes les commandes |

### 💰 Économie & Niveaux
| Commande | Description |
|----------|-------------|
| `/balance` | Voir ton solde et niveau avec barre de progression |
| `/daily` | Récompense quotidienne (100 🪙 + streak bonus) |
| `/leaderboard` | Classement XP ou Coins du serveur |
| `/give` | Donner des coins à un membre |

### 🎉 Automatique
- **Gain d'XP** : Les membres gagnent de l'XP en écrivant des messages (cooldown 1 min)
- **Level up** : Annonce automatique dans le salon lors du passage de niveau
- **Message de bienvenue** : Accueil des nouveaux membres dans le salon système
- **Cooldown** : Système anti-spam sur toutes les commandes

## 🚀 Installation

### 1. Prérequis
- Node.js 18+
- Un bot Discord ([Discord Developer Portal](https://discord.com/developers/applications))

### 2. Configuration
```bash
cd discord-bot
npm install
cp .env.example .env
# Remplis .env avec tes tokens
```

### 3. Fichier `.env`
```env
DISCORD_TOKEN=ton_token_bot
CLIENT_ID=ton_application_id
GUILD_ID=ton_serveur_id_test  # optionnel, pour déploiement rapide
```

### 4. Déployer les commandes slash
```bash
npm run deploy
```

### 5. Lancer le bot
```bash
npm start
```

## 📁 Structure
```
discord-bot/
├── index.js              # Point d'entrée
├── deploy-commands.js    # Script de déploiement slash
├── commands/
│   ├── moderation/       # kick, ban, timeout, warn, clear
│   ├── fun/              # 8ball, coinflip, dice, joke, rps, trivia
│   ├── info/             # ping, userinfo, serverinfo, avatar
│   ├── utility/          # poll, reminder, help
│   └── economy/          # balance, daily, leaderboard, give
├── events/
│   ├── ready.js          # Connexion + statuts rotatifs
│   ├── interactionCreate.js  # Dispatch commandes + cooldowns
│   ├── guildMemberAdd.js # Message de bienvenue
│   └── messageCreate.js  # Gain d'XP automatique
└── utils/
    ├── database.js        # SQLite (better-sqlite3)
    └── embeds.js          # Helpers d'embeds colorés
```

## 🔧 Permissions requises
Le bot a besoin des permissions suivantes :
- `Send Messages`, `Embed Links`, `Add Reactions`
- `Manage Messages` (pour /clear)
- `Kick Members`, `Ban Members`, `Moderate Members` (pour la modération)
- `Read Message History`
