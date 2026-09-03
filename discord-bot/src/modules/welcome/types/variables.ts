export interface VariableContext {
  userId: string;
  username: string;
  displayName: string;
  userTag: string;
  mentionUser: boolean;
  userCreatedAt?: Date;
  guildId: string;
  guildName: string;
  memberCount: number;
  channelId?: string;
}

export interface AvailableVariable {
  key: string;
  description: string;
  example: string;
}

export const AVAILABLE_VARIABLES: AvailableVariable[] = [
  { key: '{user}', description: 'Mentionne le membre ou affiche son nom', example: '@Rub' },
  { key: '{username}', description: 'Nom d’utilisateur Discord', example: 'rub19' },
  { key: '{displayname}', description: 'Pseudo d’affichage ou surnom', example: 'Rub' },
  { key: '{userid}', description: 'Identifiant unique Discord du membre', example: '1128633164290596884' },
  { key: '{server}', description: 'Nom du serveur Discord', example: 'Mon Serveur' },
  { key: '{serverid}', description: 'Identifiant Discord du serveur', example: '1128633164290596884' },
  { key: '{membercount}', description: 'Nombre total de membres sur le serveur', example: '1 245' },
  { key: '{channel}', description: 'Mention du salon de bienvenue', example: '#bienvenue' },
  { key: '{createdat}', description: 'Date de création du compte Discord', example: '03/09/2024' },
];
