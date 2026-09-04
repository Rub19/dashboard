import { z } from 'zod';

export const FormFieldTypeSchema = z.enum([
  'SHORT_TEXT',
  'LONG_TEXT',
  'SELECT',
  'MULTI_SELECT',
  'RADIO',
  'CHECKBOX',
  'NUMBER',
  'SLIDER',
  'RATING',
  'DISCORD_USER',
  'DISCORD_ROLE',
  'DISCORD_CHANNEL',
  'EMAIL',
  'URL',
  'DATE',
  'DATE_TIME',
  'FILE_UPLOAD',
  'IMAGE_UPLOAD',
  'SIGNATURE',
  'YES_NO',
]);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);
export type FormStatus = z.infer<typeof FormStatusSchema>;

export const FormResponseStatusSchema = z.enum([
  'PENDING',
  'REVIEWING',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'ARCHIVED',
  'SPAM',
]);
export type FormResponseStatus = z.infer<typeof FormResponseStatusSchema>;

export const FormSubmissionModeSchema = z.enum(['MODAL', 'WEB', 'HYBRID']);
export type FormSubmissionMode = z.infer<typeof FormSubmissionModeSchema>;

export const FormFieldOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  points: z.number().default(0),
});
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

export const FormFieldSchema = z.object({
  id: z.string(),
  type: FormFieldTypeSchema,
  label: z.string(),
  description: z.string().default(''),
  placeholder: z.string().default(''),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  regex: z.string().optional(),
  options: z.array(FormFieldOptionSchema).default([]),
  allowedFileTypes: z.array(z.string()).default([]),
  maxFileSizeMb: z.number().default(10),
  sectionId: z.string().default('section-1'),
  order: z.number().default(0),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  order: z.number().default(0),
});
export type FormSection = z.infer<typeof FormSectionSchema>;

export const ConditionOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'NOT_CONTAINS',
  'GREATER_THAN',
  'LESS_THAN',
  'IS_EMPTY',
  'IS_NOT_EMPTY',
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const ConditionActionSchema = z.enum([
  'SHOW_FIELD',
  'HIDE_FIELD',
  'REQUIRE_FIELD',
  'UNREQUIRE_FIELD',
  'SHOW_SECTION',
  'HIDE_SECTION',
]);
export type ConditionAction = z.infer<typeof ConditionActionSchema>;

export const FormConditionSchema = z.object({
  id: z.string(),
  sourceFieldId: z.string(),
  operator: ConditionOperatorSchema,
  value: z.any(),
  action: ConditionActionSchema,
  targetFieldId: z.string().optional(),
  targetSectionId: z.string().optional(),
  logicGate: z.enum(['ALL', 'ANY']).default('ALL'),
});
export type FormCondition = z.infer<typeof FormConditionSchema>;

export const FormScoringConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxScore: z.number().default(100),
  passScore: z.number().default(60),
  thresholds: z.object({
    low: z.number().default(39),
    medium: z.number().default(69),
    high: z.number().default(100),
  }).default({
    low: 39,
    medium: 69,
    high: 100,
  }),
});
export type FormScoringConfig = z.infer<typeof FormScoringConfigSchema>;

export const FormAntiSpamConfigSchema = z.object({
  cooldownMinutes: z.number().default(1440), // 24 hours
  maxSubmissionsPerUser: z.number().default(1),
  minAccountAgeDays: z.number().default(7),
  minGuildMembershipDays: z.number().default(1),
  requiredRoleIds: z.array(z.string()).default([]),
  forbiddenRoleIds: z.array(z.string()).default([]),
  blacklistUserIds: z.array(z.string()).default([]),
});
export type FormAntiSpamConfig = z.infer<typeof FormAntiSpamConfigSchema>;

export const AutomationTriggerSchema = z.enum([
  'RESPONSE_SUBMITTED',
  'RESPONSE_APPROVED',
  'RESPONSE_REJECTED',
  'RESPONSE_STATUS_CHANGED',
  'SCORE_THRESHOLD_MET',
]);
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;

export const AutomationActionTypeSchema = z.enum([
  'ADD_ROLE',
  'REMOVE_ROLE',
  'SEND_DM',
  'SEND_CHANNEL_MESSAGE',
  'CREATE_THREAD',
  'CREATE_TICKET',
  'NOTIFY_STAFF',
  'ADD_TAG',
  'UPDATE_STATUS',
]);
export type AutomationActionType = z.infer<typeof AutomationActionTypeSchema>;

export const FormAutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  trigger: AutomationTriggerSchema,
  conditions: z.object({
    minScore: z.number().optional(),
    maxScore: z.number().optional(),
    fieldId: z.string().optional(),
    fieldValue: z.any().optional(),
    targetStatus: FormResponseStatusSchema.optional(),
  }).default({}),
  actions: z.array(
    z.object({
      type: AutomationActionTypeSchema,
      targetRoleId: z.string().optional(),
      targetChannelId: z.string().optional(),
      messageTemplate: z.string().optional(),
      ticketCategoryId: z.string().optional(),
      tagToAdd: z.string().optional(),
      statusToSet: FormResponseStatusSchema.optional(),
    })
  ).default([]),
});
export type FormAutomationRule = z.infer<typeof FormAutomationRuleSchema>;

export const DiscordPanelConfigSchema = z.object({
  channelId: z.string().default(''),
  messageId: z.string().optional(),
  embedTitle: z.string().default('📝 Formulaire de Candidature'),
  embedDescription: z.string().default('Cliquez sur le bouton ci-dessous pour postuler.'),
  embedColor: z.string().default('#6366f1'),
  thumbnailUrl: z.string().default(''),
  imageUrl: z.string().default(''),
  footerText: z.string().default('ETHONE Forms & Applications 2.0'),
  buttonText: z.string().default('Postuler maintenant'),
  buttonEmoji: z.string().default('📝'),
  buttonStyle: z.enum(['PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER']).default('PRIMARY'),
  submissionMode: FormSubmissionModeSchema.default('HYBRID'),
});
export type DiscordPanelConfig = z.infer<typeof DiscordPanelConfigSchema>;

export const DiscordFormSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default('Staff & Modération'),
  status: FormStatusSchema.default('DRAFT'),
  version: z.number().default(1),
  sections: z.array(FormSectionSchema).default([
    { id: 'section-1', title: 'Informations Générales', description: 'Renseignez vos coordonnées', order: 0 },
  ]),
  fields: z.array(FormFieldSchema).default([]),
  conditions: z.array(FormConditionSchema).default([]),
  scoring: FormScoringConfigSchema.default({
    enabled: false,
    maxScore: 100,
    passScore: 60,
    thresholds: { low: 39, medium: 69, high: 100 },
  }),
  antiSpam: FormAntiSpamConfigSchema.default({
    cooldownMinutes: 1440,
    maxSubmissionsPerUser: 1,
    minAccountAgeDays: 7,
    minGuildMembershipDays: 1,
    requiredRoleIds: [],
    forbiddenRoleIds: [],
    blacklistUserIds: [],
  }),
  automations: z.array(FormAutomationRuleSchema).default([]),
  panelConfig: DiscordPanelConfigSchema.default({
    channelId: '',
    embedTitle: '📝 Formulaire de Candidature',
    embedDescription: 'Cliquez sur le bouton ci-dessous pour postuler.',
    embedColor: '#6366f1',
    thumbnailUrl: '',
    imageUrl: '',
    footerText: 'ETHONE Forms & Applications 2.0',
    buttonText: 'Postuler maintenant',
    buttonEmoji: '📝',
    buttonStyle: 'PRIMARY',
    submissionMode: 'HYBRID',
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type DiscordForm = z.infer<typeof DiscordFormSchema>;

export const FormAnswerSchema = z.object({
  fieldId: z.string(),
  fieldLabel: z.string(),
  fieldType: FormFieldTypeSchema,
  value: z.any(),
});
export type FormAnswer = z.infer<typeof FormAnswerSchema>;

export const FormInternalNoteSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorTag: z.string(),
  authorAvatar: z.string().optional(),
  content: z.string(),
  createdAt: z.string(),
});
export type FormInternalNote = z.infer<typeof FormInternalNoteSchema>;

export const FormResponseSchema = z.object({
  id: z.string(),
  formId: z.string(),
  guildId: z.string(),
  userId: z.string(),
  userTag: z.string(),
  userAvatar: z.string().default(''),
  answers: z.array(FormAnswerSchema).default([]),
  score: z.number().default(0),
  scoreLabel: z.enum(['Low', 'Medium', 'High', 'Recommended', 'None']).default('None'),
  status: FormResponseStatusSchema.default('PENDING'),
  assignedReviewerId: z.string().optional(),
  assignedReviewerTag: z.string().optional(),
  tags: z.array(z.string()).default([]),
  internalNotes: z.array(FormInternalNoteSchema).default([]),
  decisionReason: z.string().optional(),
  submittedAt: z.string(),
  reviewedAt: z.string().optional(),
  metadata: z.object({
    accountAgeDays: z.number().default(0),
    guildMemberDays: z.number().default(0),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
  }).default({
    accountAgeDays: 0,
    guildMemberDays: 0,
  }),
});
export type FormResponse = z.infer<typeof FormResponseSchema>;

export interface FormOverviewStats {
  totalForms: number;
  activeForms: number;
  totalResponses: number;
  pendingReviews: number;
  averageCompletionRate: number;
  approvedCount: number;
  rejectedCount: number;
}
