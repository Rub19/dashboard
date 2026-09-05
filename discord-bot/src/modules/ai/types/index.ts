export type AIResponseMode =
  | 'AUTOMATIC'
  | 'MENTION_ONLY'
  | 'COMMAND_ONLY'
  | 'REPLY'
  | 'HYBRID'
  | 'DISABLED';

export type AITone =
  | 'FRIENDLY'
  | 'PROFESSIONAL'
  | 'CASUAL'
  | 'FUNNY'
  | 'CONCISE'
  | 'DETAILED'
  | 'TECHNICAL'
  | 'CUSTOM';

export type AIHallucinationMode = 'STRICT' | 'BALANCED' | 'CREATIVE';

export type KnowledgeType = 'TEXT' | 'FAQ' | 'DOC' | 'URL' | 'DISCORD';

export type KnowledgeScope = 'GLOBAL' | 'CHANNEL' | 'ROLE' | 'ASSISTANT';

export interface AIPersonalitySliders {
  friendly: number; // 0 -> 100
  humor: number; // 0 -> 100
  formality: number; // 0 -> 100
  verbosity: number; // 0 -> 100
  creativity: number; // 0 -> 100
}

export interface AIPersonality {
  name: string;
  description: string;
  avatarUrl?: string;
  tone: AITone;
  sliders: AIPersonalitySliders;
  systemInstructions: string;
  language: 'auto' | 'fr' | 'en' | 'de' | 'es' | 'it' | 'custom';
  replyInUserLanguage: boolean;
}

export interface AIChannelRule {
  channelId: string;
  channelName: string;
  isCategory: boolean;
  mode: AIResponseMode;
  knowledgeSourceIds: string[];
  threadModeEnabled: boolean;
  maxHistoryMessages: number;
}

export interface AIKnowledgeSource {
  id: string;
  guildId: string;
  title: string;
  type: KnowledgeType;
  content: string;
  scope: KnowledgeScope;
  allowedChannelIds?: string[];
  allowedRoleIds?: string[];
  tokenCount: number;
  status: 'READY' | 'INDEXING' | 'ERROR';
  updatedAt: string;
}

export interface AIToolPermissions {
  readKnowledge: boolean;
  readAllowedChannels: boolean;
  createThreads: boolean;
  sendMessages: boolean;
  ticketHandoff: boolean;
  summarizeChannels: boolean;
  moderationAssist: boolean;
}

export interface AIMemorySettings {
  enabled: boolean;
  contextLength: number; // e.g. 20 messages
  retentionHours: number; // e.g. 24
  userCanForget: boolean;
}

export interface AISettings {
  guildId: string;
  enabled: boolean;
  defaultMode: AIResponseMode;
  personality: AIPersonality;
  hallucinationMode: AIHallucinationMode;
  showSources: 'ALWAYS' | 'WHEN_USED' | 'NEVER';
  tools: AIToolPermissions;
  memory: AIMemorySettings;
  allowedRoleIds: string[];
  blockedRoleIds: string[];
  allowedChannelIds: string[];
  blockedChannelIds: string[];
  channelRules: Record<string, AIChannelRule>;
  provider: 'OPENROUTER' | 'OPENAI' | 'GROQ' | 'CLOUDFLARE' | 'BUILTIN';
  model: string;
  dailyBudgetTokens: number;
  dedicatedChannelId?: string;
  allowImageGeneration?: boolean;
  bannedWords?: string[];
  thonMood?: 'SAGE' | 'GAMER_SARCASTIQUE' | 'PROTECTEUR' | 'CYBERPUNK' | 'CUSTOM';
  publishedVersion: number;
  lastPublishedAt: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface AIConversation {
  id: string;
  guildId: string;
  channelId: string;
  threadId?: string;
  userId: string;
  userTag: string;
  messages: AIMessage[];
  startedAt: string;
  lastActiveAt: string;
}

export interface AIFeedback {
  id: string;
  guildId: string;
  userId: string;
  messageId: string;
  isHelpful: boolean;
  reason?: string;
  createdAt: string;
}

export interface AIAnalytics {
  requestsToday: number;
  activeConversations: number;
  tokensConsumed: number;
  helpfulCount: number;
  unhelpfulCount: number;
  handoffCount: number;
  avgResponseTimeMs: number;
}
