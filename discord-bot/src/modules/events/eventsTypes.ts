export type EventCategory =
  | 'GAMING'
  | 'TOURNAMENT'
  | 'COMMUNITY'
  | 'STAFF'
  | 'WATCH_PARTY'
  | 'GIVEAWAY'
  | 'MEETING'
  | 'VOICE'
  | 'OTHER';

export type EventStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type EventLocationType =
  | 'VOICE'
  | 'TEXT'
  | 'STAGE'
  | 'EXTERNAL'
  | 'NONE';

export type EventAccessType =
  | 'PUBLIC'
  | 'ROLE_ONLY'
  | 'INVITE_ONLY'
  | 'STAFF_ONLY';

export type RSVPStatus =
  | 'GOING'
  | 'MAYBE'
  | 'NOT_GOING'
  | 'WAITLIST';

export type AttendanceStatus =
  | 'REGISTERED'
  | 'ATTENDED'
  | 'LATE'
  | 'NO_SHOW'
  | 'CANCELLED';

export type RecurrenceFrequency =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'CUSTOM';

export interface EventLocation {
  type: EventLocationType;
  channelId?: string;
  channelName?: string;
  externalUrl?: string;
  details?: string;
}

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday... 5=Friday
  endType: 'NEVER' | 'ON_DATE' | 'AFTER_OCCURRENCES';
  endDate?: string;
  maxOccurrences?: number;
  currentOccurrence?: number;
}

export interface EventReminderRule {
  id: string;
  triggerMinutesBefore: number; // e.g. 1440 (24h), 60 (1h), 15 (15m), 0 (start)
  channel: 'DISCORD_CHANNEL' | 'DISCORD_DM' | 'ETHONE_NOTIFICATION';
  customMessage?: string;
  executed: boolean;
}

export interface EventAutomationRule {
  id: string;
  trigger: 'ON_START' | 'ON_END' | 'ON_RSVP' | 'ON_CHECKIN';
  actions: {
    type: 'CREATE_THREAD' | 'ASSIGN_ROLE' | 'REMOVE_ROLE' | 'SEND_EMBED' | 'NOTIFY_STAFF';
    targetId?: string; // roleId, channelId
    payload?: string;
  }[];
  enabled: boolean;
}

export interface EventParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  rsvp: RSVPStatus;
  joinedAt: string;
  roleId?: string;
  roleName?: string;
  attendance: AttendanceStatus;
  checkedInAt?: string;
  checkinMethod?: 'DISCORD_BUTTON' | 'VOICE_PRESENCE' | 'MANUAL_STAFF' | 'SLASH_COMMAND';
  waitlistPosition?: number;
  ticketNumber?: string; // e.g. #EVT-4821
  notes?: string;
}

export interface DiscordEvent {
  id: string;
  guildId: string;
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  organizer: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  startDate: string; // ISO-8601 UTC
  endDate: string; // ISO-8601 UTC
  timezone: string; // e.g. 'Europe/Paris'
  durationMinutes: number;
  location: EventLocation;
  accessType: EventAccessType;
  allowedRoles?: string[]; // role IDs if accessType === 'ROLE_ONLY'
  imageUrl?: string;
  thumbnailUrl?: string;
  emoji?: string;
  tags: string[];
  capacity: {
    unlimited: boolean;
    maxParticipants: number;
    waitlistEnabled: boolean;
  };
  eventRoleId?: string; // temporary event role
  eventRoleAction?: 'ASSIGN_ON_RSVP' | 'ASSIGN_ON_CHECKIN' | 'NONE';
  removeRoleAfterEvent?: boolean;
  recurrence?: EventRecurrence;
  reminders: EventReminderRule[];
  automations: EventAutomationRule[];
  discordScheduledEventId?: string; // Discord native scheduled event sync
  discordPanelMessageId?: string;
  discordPanelChannelId?: string;
  discordThreadId?: string;
  stats: {
    goingCount: number;
    maybeCount: number;
    notGoingCount: number;
    waitlistCount: number;
    attendedCount: number;
    noShowCount: number;
    peakVoiceAttendance?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  emoji: string;
  defaultDurationMinutes: number;
  locationType: EventLocationType;
  defaultCapacity: number;
  defaultReminders: number[]; // minutes before
  defaultAutomations: string[];
  tags: string[];
}

export interface EventOverviewStats {
  upcomingCount: number;
  activeCount: number;
  totalParticipants: number;
  averageAttendanceRate: number;
  eventsThisMonth: number;
  totalEvents: number;
}
