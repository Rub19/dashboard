export type SubsystemStatus = 'operational' | 'degraded' | 'critical' | 'offline';

export interface BotSubsystemHealth {
  gateway: SubsystemStatus;
  restApi: SubsystemStatus;
  database: SubsystemStatus;
  cache: SubsystemStatus;
  eventBus: SubsystemStatus;
  jobScheduler: SubsystemStatus;
  aiProvider: SubsystemStatus;
  storage: SubsystemStatus;
  voiceEngine: SubsystemStatus;
}

export interface BotGlobalStatus {
  status: 'operational' | 'degraded' | 'critical';
  subsystems: BotSubsystemHealth;
  statusMessage: string;
  uptimeSeconds: number;
  lastHeartbeat: string;
  activeIncidentsCount: number;
  activeModulesCount: number;
  totalModulesCount: number;
  version: string;
}

export interface BotMemoryTelemetry {
  heapUsedMb: number;
  heapTotalMb: number;
  heapPercent: number;
  rssMb: number;
  externalMb: number;
}

export interface BotLatencyTelemetry {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  currentPingMs: number;
  avgPingMs: number;
}

export interface BotThroughputTelemetry {
  eventsPerMinute: number;
  commandsPerMinute: number;
  dbQueriesPerMinute: number;
  aiTokensPerMinute: number;
}

export interface BotTelemetrySnapshot {
  timestamp: string;
  memory: BotMemoryTelemetry;
  cpuPercent: number;
  eventLoopDelayMs: number;
  latency: BotLatencyTelemetry;
  throughput: BotThroughputTelemetry;
  guildsCount: number;
  cachedUsersCount: number;
  shardsCount: number;
}

export interface BotModuleInfo {
  id: string;
  name: string;
  category: string;
  version: string;
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'disabled' | 'error';
  description: string;
  dependencies: string[];
  commandCount: number;
  eventCount: number;
  uptimeSeconds: number;
  errorCount24h: number;
  memoryWeightMb: number;
  lastError?: string;
}

export interface BotCommandStat {
  name: string;
  category: string;
  description: string;
  totalExecutions: number;
  executions24h: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  lastExecutedAt?: string;
  lastError?: string;
}

export interface BotEventTypeStat {
  eventType: string;
  totalHandled: number;
  perMinute: number;
  avgProcessTimeMs: number;
  errorsCount: number;
  lastSeenAt: string;
}

export interface BotEventBusStats {
  totalProcessed: number;
  eventsPerSec: number;
  queueDepth: number;
  failedEventsCount: number;
  topEvents: BotEventTypeStat[];
}

export interface BotJobInfo {
  id: string;
  name: string;
  type: 'cron' | 'buffer_flush' | 'cleanup' | 'sync' | 'backup';
  intervalDescription: string;
  lastRunAt?: string;
  nextRunAt?: string;
  status: 'idle' | 'running' | 'failed' | 'disabled';
  durationMs: number;
  totalRuns: number;
  failureCount: number;
  isIdempotent: boolean;
  description: string;
}

export interface BotErrorFingerprint {
  fingerprint: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  module: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
  resolved: boolean;
  resolvedAt?: string;
  stackPreview?: string;
}

export interface BotIncident {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  rootCause: string;
  affectedSubsystems: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface BotDiagnosticResult {
  id: string;
  name: string;
  category: 'core' | 'network' | 'database' | 'ai' | 'security' | 'storage';
  status: 'pass' | 'warn' | 'critical';
  latencyMs: number;
  message: string;
  details?: string;
}

export interface BotAiStats {
  provider: string;
  activeModel: string;
  fallbackModel: string;
  fallbackActive: boolean;
  promptTokens24h: number;
  completionTokens24h: number;
  totalTokens24h: number;
  estimatedCostTodayUsd: number;
  dailyBudgetUsd: number;
  budgetUsedPercent: number;
  avgInferenceLatencyMs: number;
  requests24h: number;
  successRate: number;
}

export interface BotIntegrationInfo {
  id: string;
  name: string;
  type: 'discord_api' | 'supabase' | 'ai_gateway' | 'storage' | 'webhooks';
  status: 'healthy' | 'degraded' | 'offline';
  latencyMs: number;
  lastCheckedAt: string;
  endpointMasked: string;
  details: string;
}

export interface BotSecurityAuditReport {
  timestamp: string;
  intents: {
    guildMembers: boolean;
    messageContent: boolean;
    guildPresences: boolean;
  };
  scopes: string[];
  tokenLeakedInLogs: boolean;
  suspiciousRoleCreations24h: number;
  unauthorizedAttempts24h: number;
  adminGuildsCount: number;
  score: number;
}

export interface BotGlobalSettings {
  maintenanceMode: boolean;
  maintenanceReason: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  telemetrySampleRatePercent: number;
  retentionDays: number;
  slowQueryThresholdMs: number;
  alertWebhookUrlMasked: string;
  aiDailySpendLimitUsd: number;
}
