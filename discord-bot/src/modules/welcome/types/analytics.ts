export interface WelcomeFunnelStage {
  stage: 'JOINED' | 'STARTED_ONBOARDING' | 'ACCEPTED_RULES' | 'VERIFIED' | 'COMPLETED';
  label: string;
  count: number;
  percentage: number;
}

export interface WelcomeEventLog {
  id: string;
  type:
    | 'MEMBER_JOIN'
    | 'WELCOME_SENT'
    | 'DM_SENT'
    | 'DM_FAILED'
    | 'ONBOARDING_START'
    | 'RULES_ACCEPTED'
    | 'VERIFICATION_PASS'
    | 'ROLE_ASSIGNED'
    | 'ONBOARDING_COMPLETE'
    | 'MEMBER_LEAVE'
    | 'GOODBYE_SENT';
  userId: string;
  userTag: string;
  timestamp: string;
  detail?: string;
}

export interface WelcomeAnalyticsOverview {
  guildId: string;
  welcomeEnabled: boolean;
  goodbyeEnabled: boolean;
  verificationEnabled: boolean;
  onboardingEnabled: boolean;
  welcomeMessagesToday: number;
  newMembersToday: number;
  verificationsToday: number;
  onboardingCompletedToday: number;
  rolesDistributedToday: number;
  onboardingDropoffsToday: number;
  dmDeliveryRate: string;
  verificationRate: string;
  onboardingCompletionRate: string;
  funnel: WelcomeFunnelStage[];
  recentEvents: WelcomeEventLog[];
}
