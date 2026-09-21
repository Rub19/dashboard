import fs from 'fs';
import path from 'path';
import {
  FullWelcomeConfig,
  FullWelcomeConfigSchema,
} from '../types/welcomeConfig.js';
import {
  OnboardingFlow,
  OnboardingFlowSchema,
  VerificationConfig,
  VerificationConfigSchema,
} from '../types/onboarding.js';
import {
  WelcomeAnalyticsOverview,
  WelcomeEventLog,
  WelcomeFunnelStage,
} from '../types/analytics.js';
import { logger } from '../../../utils/logger.js';

export class WelcomeRepository {
  private configPath = path.resolve(process.cwd(), 'data', 'welcome_configs.json');
  private onboardingPath = path.resolve(process.cwd(), 'data', 'onboarding_flows.json');
  private verificationPath = path.resolve(process.cwd(), 'data', 'verification_configs.json');
  private analyticsPath = path.resolve(process.cwd(), 'data', 'welcome_analytics.json');

  private configs = new Map<string, FullWelcomeConfig>();
  private onboardingFlows = new Map<string, OnboardingFlow>();
  private verificationConfigs = new Map<string, VerificationConfig>();
  private events: WelcomeEventLog[] = [];

  constructor() {
    this.ensureDirectory();
    this.loadData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    // 1. Welcome configs
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, val] of Object.entries(parsed)) {
          const res = FullWelcomeConfigSchema.safeParse(val);
          if (res.success) {
            this.configs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement welcome_configs.json :', err);
    }

    // 2. Onboarding flows
    try {
      if (fs.existsSync(this.onboardingPath)) {
        const raw = fs.readFileSync(this.onboardingPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, val] of Object.entries(parsed)) {
          const res = OnboardingFlowSchema.safeParse(val);
          if (res.success) {
            this.onboardingFlows.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement onboarding_flows.json :', err);
    }

    // 3. Verification configs
    try {
      if (fs.existsSync(this.verificationPath)) {
        const raw = fs.readFileSync(this.verificationPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [gid, val] of Object.entries(parsed)) {
          const res = VerificationConfigSchema.safeParse(val);
          if (res.success) {
            this.verificationConfigs.set(gid, res.data);
          }
        }
      }
    } catch (err) {
      logger.error('Erreur chargement verification_configs.json :', err);
    }

    // 4. Analytics & Event logs
    try {
      if (fs.existsSync(this.analyticsPath)) {
        const raw = fs.readFileSync(this.analyticsPath, 'utf-8');
        this.events = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement welcome_analytics.json :', err);
      this.events = [];
    }
  }

  public saveConfigs(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.configs.entries());
      fs.writeFileSync(this.configPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde welcome_configs.json :', err);
    }
  }

  public saveOnboardingFlows(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.onboardingFlows.entries());
      fs.writeFileSync(this.onboardingPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde onboarding_flows.json :', err);
    }
  }

  public saveVerificationConfigs(): void {
    try {
      this.ensureDirectory();
      const obj = Object.fromEntries(this.verificationConfigs.entries());
      fs.writeFileSync(this.verificationPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde verification_configs.json :', err);
    }
  }

  public saveEvents(): void {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.analyticsPath, JSON.stringify(this.events.slice(0, 500), null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde welcome_analytics.json :', err);
    }
  }

  // --- Welcome Config ---

  public getConfig(guildId: string): FullWelcomeConfig {
    let conf = this.configs.get(guildId);
    if (!conf) {
      conf = FullWelcomeConfigSchema.parse({});
      this.configs.set(guildId, conf);
      this.saveConfigs();
    }
    return conf;
  }

  public saveConfig(guildId: string, cfg: FullWelcomeConfig): void {
    this.configs.set(guildId, cfg);
    this.saveConfigs();
  }

  // --- Onboarding Flow ---

  public getOnboardingFlow(guildId: string): OnboardingFlow {
    let flow = this.onboardingFlows.get(guildId);
    if (!flow) {
      flow = OnboardingFlowSchema.parse({ guildId });
      this.onboardingFlows.set(guildId, flow);
      this.saveOnboardingFlows();
    }
    return flow;
  }

  public saveOnboardingFlow(guildId: string, flow: OnboardingFlow): void {
    this.onboardingFlows.set(guildId, flow);
    this.saveOnboardingFlows();
  }

  // --- Verification Config ---

  public getVerificationConfig(guildId: string): VerificationConfig {
    let verif = this.verificationConfigs.get(guildId);
    if (!verif) {
      verif = VerificationConfigSchema.parse({ guildId });
      this.verificationConfigs.set(guildId, verif);
      this.saveVerificationConfigs();
    }
    return verif;
  }

  public saveVerificationConfig(guildId: string, cfg: VerificationConfig): void {
    this.verificationConfigs.set(guildId, cfg);
    this.saveVerificationConfigs();
  }

  // --- Event Recording & Funnel ---

  public recordEvent(event: Omit<WelcomeEventLog, 'id' | 'timestamp'>): void {
    const entry: WelcomeEventLog = {
      ...event,
      id: `wlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(entry);
    if (this.events.length > 500) {
      this.events = this.events.slice(0, 500);
    }
    this.saveEvents();
  }

  public getOverview(guildId: string): WelcomeAnalyticsOverview {
    const welcomeCfg = this.getConfig(guildId);
    const onboardingFlow = this.getOnboardingFlow(guildId);
    const verificationCfg = this.getVerificationConfig(guildId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTodayMs = startOfToday.getTime();

    // Uniquement les événements de CE serveur (le journal est commun à tous les serveurs du bot).
    const guildEvents = this.events.filter((e) => e.guildId === guildId);
    const todayEvents = guildEvents.filter((e) => new Date(e.timestamp).getTime() >= startTodayMs);

    // Membres distincts par type d'événement : un membre qui clique deux fois ne compte qu'une fois.
    const uniqueToday = (type: WelcomeEventLog['type']): number =>
      new Set(todayEvents.filter((e) => e.type === type).map((e) => e.userId)).size;

    const newMembersToday = uniqueToday('MEMBER_JOIN');
    const welcomeMessagesToday = todayEvents.filter((e) => e.type === 'WELCOME_SENT').length;
    const dmSentToday = todayEvents.filter((e) => e.type === 'DM_SENT').length;
    const dmFailedToday = todayEvents.filter((e) => e.type === 'DM_FAILED').length;
    const verificationsToday = uniqueToday('VERIFICATION_PASS');
    const onboardingStartedToday = uniqueToday('ONBOARDING_START');
    const rulesAcceptedToday = uniqueToday('RULES_ACCEPTED');
    const onboardingCompletedToday = uniqueToday('ONBOARDING_COMPLETE');
    const rolesDistributedToday = todayEvents.filter((e) => e.type === 'ROLE_ASSIGNED').length;

    // Entonnoir : comptes RÉELS, en pourcentage des arrivées du jour (0 % quand personne n'est arrivé).
    const pct = (n: number): number => (newMembersToday > 0 ? Math.min(100, Math.round((n / newMembersToday) * 100)) : 0);
    const funnel: WelcomeFunnelStage[] = [
      { stage: 'JOINED', label: 'Membres arrivés', count: newMembersToday, percentage: newMembersToday > 0 ? 100 : 0 },
      { stage: 'STARTED_ONBOARDING', label: 'Début onboarding', count: onboardingStartedToday, percentage: pct(onboardingStartedToday) },
      { stage: 'ACCEPTED_RULES', label: 'Règles acceptées', count: rulesAcceptedToday, percentage: pct(rulesAcceptedToday) },
      { stage: 'VERIFIED', label: 'Vérifiés', count: verificationsToday, percentage: pct(verificationsToday) },
      { stage: 'COMPLETED', label: 'Onboarding terminé', count: onboardingCompletedToday, percentage: pct(onboardingCompletedToday) },
    ];

    const dmTotal = dmSentToday + dmFailedToday;
    const rate = (n: number, of: number): string => (of > 0 ? `${Math.min(100, Math.round((n / of) * 100))}%` : '—');

    return {
      guildId,
      welcomeEnabled: welcomeCfg.welcome.enabled,
      goodbyeEnabled: welcomeCfg.goodbye.enabled,
      verificationEnabled: verificationCfg.enabled,
      onboardingEnabled: onboardingFlow.enabled,
      welcomeMessagesToday,
      newMembersToday,
      verificationsToday,
      onboardingCompletedToday,
      rolesDistributedToday,
      onboardingDropoffsToday: Math.max(0, onboardingStartedToday - onboardingCompletedToday),
      dmDeliveryRate: rate(dmSentToday, dmTotal),
      verificationRate: rate(verificationsToday, newMembersToday),
      onboardingCompletionRate: rate(onboardingCompletedToday, onboardingStartedToday || newMembersToday),
      funnel,
      recentEvents: guildEvents.slice(0, 15),
    };
  }
}

export const welcomeRepository = new WelcomeRepository();
