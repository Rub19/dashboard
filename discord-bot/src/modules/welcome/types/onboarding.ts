import { z } from 'zod';

export const OnboardingStepTypeSchema = z.enum([
  'WELCOME',
  'RULES',
  'ROLE_SELECTION',
  'QUESTION',
  'VERIFICATION',
  'CHANNEL_SELECTION',
  'COMPLETION',
]);

export type OnboardingStepType = z.infer<typeof OnboardingStepTypeSchema>;

export const OnboardingRoleChoiceSchema = z.object({
  roleId: z.string(),
  label: z.string(),
  emoji: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

export type OnboardingRoleChoice = z.infer<typeof OnboardingRoleChoiceSchema>;

export const OnboardingStepSchema = z.object({
  id: z.string().default(() => `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  type: OnboardingStepTypeSchema.default('WELCOME'),
  title: z.string().default('Titre de l’étape'),
  description: z.string().default('Description explicative pour le membre.'),
  required: z.boolean().default(true),
  order: z.number().default(0),
  roleChoices: z.array(OnboardingRoleChoiceSchema).default([]),
  maxRoleSelections: z.number().default(1),
  rulesList: z.array(z.string()).default([
    '1. Respecter tous les membres de la communauté.',
    '2. Aucun spam, flood ou publicité non sollicitée.',
    '3. Garder les échanges dans les salons appropriés.',
  ]),
  questionText: z.string().nullable().default(null),
  questionPlaceholder: z.string().nullable().default(null),
});

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OnboardingFlowSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  completionRoleId: z.string().nullable().default(null),
  sendDmOnCompletion: z.boolean().default(true),
  completionDmMessage: z
    .string()
    .default('🎉 Félicitations {user} ! Tu as complété l’onboarding sur **{server}** avec succès !'),
  steps: z.array(OnboardingStepSchema).default([
    {
      id: 'step-1-welcome',
      type: 'WELCOME',
      title: '👋 Bienvenue dans la communauté !',
      description: 'Découvre notre serveur et configure ton profil en quelques étapes simples.',
      required: true,
      order: 0,
      roleChoices: [],
      maxRoleSelections: 1,
      rulesList: [],
      questionText: null,
      questionPlaceholder: null,
    },
    {
      id: 'step-2-rules',
      type: 'RULES',
      title: '📜 Règlement du serveur',
      description: 'Prends connaissance des règles essentielles pour participer sereinement.',
      required: true,
      order: 1,
      roleChoices: [],
      maxRoleSelections: 1,
      rulesList: [
        '1. Respecter tous les membres et le staff.',
        '2. Aucun propos haineux, diffamatoire ou illicite.',
        '3. Pas de spam, mention abusive ou autopromotion non autorisée.',
      ],
      questionText: null,
      questionPlaceholder: null,
    },
    {
      id: 'step-3-roles',
      type: 'ROLE_SELECTION',
      title: '🎭 Choisis tes centres d’intérêt',
      description: 'Sélectionne les sujets qui t’intéressent pour débloquer les salons correspondants.',
      required: false,
      order: 2,
      roleChoices: [],
      maxRoleSelections: 3,
      rulesList: [],
      questionText: null,
      questionPlaceholder: null,
    },
  ]),
});

export type OnboardingFlow = z.infer<typeof OnboardingFlowSchema>;

export const VerificationConfigSchema = z.object({
  guildId: z.string(),
  enabled: z.boolean().default(false),
  channelId: z.string().nullable().default(null),
  verifiedRoleId: z.string().nullable().default(null),
  unverifiedRoleId: z.string().nullable().default(null),
  buttonLabel: z.string().default('Valider mon entrée'),
  buttonEmoji: z.string().default('✅'),
  verificationPrompt: z
    .string()
    .default('Cliquez sur le bouton ci-dessous pour accepter le règlement et débloquer les salons.'),
});

export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;
