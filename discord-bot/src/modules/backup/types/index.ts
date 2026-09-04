export type BackupType = 'FULL' | 'PARTIAL' | 'PRE_CHANGE' | 'ROLLBACK';
export type BackupStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'CORRUPTED';
export type RestoreSafetyLevel = 'SAFE' | 'STANDARD' | 'DESTRUCTIVE';
export type RestoreMode = 'FULL' | 'SELECTIVE' | 'RESTORE_MISSING' | 'SYNC_WITH_BACKUP';
export type RestoreJobStatus =
  | 'QUEUED'
  | 'SCANNING'
  | 'PREPARING'
  | 'APPLYING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'ROLLED_BACK';

export type BackupComponent =
  | 'ROLES'
  | 'CATEGORIES'
  | 'CHANNELS'
  | 'PERMISSIONS'
  | 'SERVER_CONFIG'
  | 'EMOJIS'
  | 'ETHONE_CONFIG';

export interface BackupPermissionOverwrite {
  id: string;
  targetName?: string;
  type: 'role' | 'member';
  allow: string;
  deny: string;
}

export interface BackupRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  managed: boolean;
  isEveryone?: boolean;
}

export interface BackupCategory {
  id: string;
  name: string;
  position: number;
  permissionOverwrites: BackupPermissionOverwrite[];
}

export interface BackupChannel {
  id: string;
  name: string;
  type: number; // Discord ChannelType (0: text, 2: voice, 4: category, etc.)
  typeName?: string;
  topic?: string | null;
  nsfw?: boolean;
  parentId?: string | null;
  parentName?: string | null;
  position: number;
  rateLimitPerUser?: number;
  bitrate?: number;
  userLimit?: number;
  permissionOverwrites: BackupPermissionOverwrite[];
}

export interface BackupGuildSettings {
  name: string;
  icon?: string | null;
  description?: string | null;
  afkChannelId?: string | null;
  afkTimeout?: number;
  systemChannelId?: string | null;
  defaultMessageNotifications?: number;
  explicitContentFilter?: number;
  verificationLevel?: number;
}

export interface BackupEmoji {
  id: string;
  name: string;
  url?: string;
  roles?: string[];
}

export type EthoneModuleConfigs = Record<string, any>;

export interface BackupSnapshot {
  backupId: string;
  guildId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: {
    id: string;
    tag: string;
    avatar?: string;
  };
  type: BackupType;
  status: BackupStatus;
  isProtected: boolean;
  sizeBytes: number;
  checksum: string;
  schemaVersion: number;
  includedComponents: BackupComponent[];
  objectCounts: {
    categories: number;
    channels: number;
    roles: number;
    permissions: number;
    emojis: number;
    ethoneModules: number;
  };
  data: {
    guild: BackupGuildSettings;
    roles: BackupRole[];
    categories: BackupCategory[];
    channels: BackupChannel[];
    emojis?: BackupEmoji[];
    ethoneConfig?: EthoneModuleConfigs;
  };
}

export type DiffItemStatus = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED';

export interface DiffChange {
  field: string;
  before: any;
  after: any;
}

export interface DiffItem {
  id: string;
  name: string;
  type: string;
  status: DiffItemStatus;
  changes?: DiffChange[];
  details?: string;
}

export interface BackupDiffResult {
  backupAId: string;
  backupAName: string;
  backupBId: string;
  backupBName: string;
  summary: {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
  roles: DiffItem[];
  channels: DiffItem[];
  categories: DiffItem[];
  permissions: DiffItem[];
  ethone: DiffItem[];
}

export interface RestorePlanAction {
  action: 'CREATE' | 'MODIFY' | 'DELETE' | 'SKIP';
  type: 'ROLE' | 'CATEGORY' | 'CHANNEL' | 'PERMISSION' | 'ETHONE' | 'SERVER';
  name: string;
  targetId?: string;
  reason?: string;
  details?: string;
}

export interface RestorePlan {
  backupId: string;
  safetyLevel: RestoreSafetyLevel;
  mode: RestoreMode;
  selectedComponents: BackupComponent[];
  counts: {
    willCreate: number;
    willModify: number;
    willDelete: number;
    willSkip: number;
  };
  actions: RestorePlanAction[];
}

export interface RestoreJob {
  jobId: string;
  guildId: string;
  backupId: string;
  rollbackBackupId?: string;
  status: RestoreJobStatus;
  safetyLevel: RestoreSafetyLevel;
  mode: RestoreMode;
  selectedComponents: BackupComponent[];
  currentStep: string;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  logs: string[];
  errors: string[];
}

export interface BackupScheduleSettings {
  guildId: string;
  enabled: boolean;
  frequency: '6h' | '12h' | 'daily' | 'weekly';
  preferredTime: string; // e.g. '03:00'
  timezone: string; // e.g. 'Europe/Paris'
  retentionCount: number; // e.g. 7
  retentionDays: number; // e.g. 30
  maxStorageMb: number; // e.g. 50
  autoBackupBeforeMajorChanges: boolean;
  defaultSafetyLevel: RestoreSafetyLevel;
  notifyChannelId?: string;
}

export interface BackupOverviewKpis {
  totalBackups: number;
  lastBackupAt: string | null;
  storageUsedBytes: number;
  scheduledEnabled: boolean;
  frequency: string;
  protectedCount: number;
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  nextScheduledAt: string | null;
  verifiedCount: number;
}
