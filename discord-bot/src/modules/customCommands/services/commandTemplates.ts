import { CustomCommand } from '../types/customCommand.js';

export const CUSTOM_COMMAND_TEMPLATES: Partial<CustomCommand>[] = [
  {
    name: 'rules',
    description: 'Affiche les règles du serveur',
    category: 'Serveur',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '📜 Règlement de {server}',
            description:
              '**1.** Respectez tous les membres.\n**2.** Pas de spam ou de flood.\n**3.** Pas de contenu NSFW.\n**4.** Suivez les directives de Discord.\n**5.** Écoutez les décisions du staff.',
            color: '#6366F1',
            footerText: 'Serveur {server} • {member_count} membres',
            fields: [],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'socials',
    description: 'Affiche les réseaux sociaux du serveur',
    category: 'Serveur',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '🌐 Réseaux Sociaux de {server}',
            description: 'Rejoignez-nous sur nos plateformes sociales pour rester informé !',
            color: '#10B981',
            fields: [
              { name: '🎮 Discord', value: 'Vous y êtes déjà !', inline: true },
              { name: '🐦 Twitter', value: 'À configurer', inline: true },
              { name: '📺 YouTube', value: 'À configurer', inline: true },
            ],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'support',
    description: 'Guide pour contacter le support',
    category: 'Support',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '🎫 Support & Aide',
            description:
              'Besoin d\'aide ? Voici comment nous contacter :\n\n• Ouvrez un ticket avec `/ticket`\n• Mentionnez un membre du staff\n• Consultez notre FAQ en épinglé',
            color: '#3B82F6',
            footerText: 'Équipe {server} — Toujours disponible',
            fields: [],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'serverinfo',
    description: 'Affiche les informations du serveur',
    category: 'Serveur',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '🏠 {server}',
            description: 'Informations générales sur le serveur.',
            color: '#8B5CF6',
            fields: [
              { name: '👥 Membres', value: '{member_count}', inline: true },
              { name: '🆔 ID Serveur', value: '{server_id}', inline: true },
              { name: '📅 Date', value: '{date}', inline: true },
            ],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'userinfo',
    description: 'Affiche les informations d\'un utilisateur',
    category: 'Membres',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '👤 Informations Utilisateur',
            description: 'Voici les informations pour {user} :',
            color: '#F59E0B',
            fields: [
              { name: '🏷️ Username', value: '{username}', inline: true },
              { name: '🆔 ID', value: '{user_id}', inline: true },
              { name: '📅 Exécuté le', value: '{date} à {time}', inline: false },
            ],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'welcome',
    description: 'Envoie un message de bienvenue',
    category: 'Communauté',
    triggerType: 'both',
    arguments: [],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          content: '👋 Bienvenue sur **{server}**, {user} ! Nous sommes maintenant **{member_count}** membres !',
          embed: {
            title: '🎉 Bienvenue !',
            description: 'Nous sommes ravis de vous accueillir. N\'oubliez pas de lire les règles.',
            color: '#10B981',
            fields: [],
          },
          buttons: [],
        },
      },
    ],
  },
  {
    name: 'announce',
    description: 'Envoie une annonce au serveur',
    category: 'Staff',
    triggerType: 'both',
    requiredPermission: 'ManageGuild',
    arguments: [
      { name: 'message', description: 'Le texte de l\'annonce', type: 'string', required: true },
    ],
    conditions: [],
    defaultActions: [
      {
        type: 'send_response',
        response: {
          embed: {
            title: '📢 Annonce',
            description: '{args.message}',
            color: '#EF4444',
            footerText: 'Annonce par {display_name} • {date}',
            fields: [],
          },
          buttons: [],
        },
      },
    ],
  },
];
