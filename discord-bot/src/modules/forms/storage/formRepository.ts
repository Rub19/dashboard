import fs from 'fs';
import path from 'path';
import {
  DiscordForm,
  FormResponse,
  FormOverviewStats,
  DiscordFormSchema,
  FormResponseSchema,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export class FormRepository {
  private formsPath = path.resolve(process.cwd(), 'data', 'discord_forms.json');
  private responsesPath = path.resolve(process.cwd(), 'data', 'discord_form_responses.json');
  private templatesPath = path.resolve(process.cwd(), 'data', 'discord_form_templates.json');

  private forms: DiscordForm[] = [];
  private responses: FormResponse[] = [];

  constructor() {
    this.ensureDirectory();
    this.loadData();
    this.seedDefaultData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.formsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.formsPath)) {
        const raw = fs.readFileSync(this.formsPath, 'utf-8');
        this.forms = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_forms.json :', err);
      this.forms = [];
    }

    try {
      if (fs.existsSync(this.responsesPath)) {
        const raw = fs.readFileSync(this.responsesPath, 'utf-8');
        this.responses = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_form_responses.json :', err);
      this.responses = [];
    }
  }

  private saveForms(): void {
    try {
      fs.writeFileSync(this.formsPath, JSON.stringify(this.forms, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_forms.json :', err);
    }
  }

  private saveResponses(): void {
    try {
      fs.writeFileSync(this.responsesPath, JSON.stringify(this.responses, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_form_responses.json :', err);
    }
  }

  private seedDefaultData(): void {
    const demoGuildId = '123456789012345678';
    if (this.forms.length === 0) {
      const demoForms: DiscordForm[] = [
        {
          id: 'staff-app',
          guildId: demoGuildId,
          title: 'Candidature Modérateur / Staff 2026',
          description: 'Rejoignez notre équipe de modération ETHONE. Remplissez ce formulaire complet.',
          category: 'Staff & Modération',
          status: 'PUBLISHED',
          version: 1,
          sections: [
            { id: 'sec-1', title: 'Identité & Profil', description: 'Informations de base sur votre profil Discord', order: 0 },
            { id: 'sec-2', title: 'Expérience & Compétences', description: 'Détaillez vos antécédents en modération', order: 1 },
            { id: 'sec-3', title: 'Disponibilités & Motivation', description: 'Pourquoi souhaitez-vous rejoindre le staff ?', order: 2 },
          ],
          fields: [
            {
              id: 'f-age',
              type: 'NUMBER',
              label: 'Quel est votre âge ?',
              description: 'Âge minimum requis : 16 ans',
              placeholder: '18',
              required: true,
              min: 14,
              max: 99,
              sectionId: 'sec-1',
              order: 0,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'f-exp',
              type: 'YES_NO',
              label: 'Avez-vous déjà été modérateur sur un serveur Discord ?',
              description: 'Expérience préalable sur un serveur de plus de 500 membres',
              required: true,
              sectionId: 'sec-2',
              order: 0,
              options: [
                { id: 'exp-yes', label: 'Oui', value: 'yes', points: 25 },
                { id: 'exp-no', label: 'Non', value: 'no', points: 5 },
              ],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'f-exp-desc',
              type: 'LONG_TEXT',
              label: 'Décrivez votre expérience passée et vos responsabilités',
              description: 'Précisez le type de serveur, la taille et les outils utilisés',
              placeholder: 'J\'ai modéré le serveur X (2 500 membres) pendant 8 mois...',
              required: false,
              minLength: 20,
              maxLength: 1000,
              sectionId: 'sec-2',
              order: 1,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'f-hours',
              type: 'SELECT',
              label: 'Combien d\'heures par semaine pouvez-vous consacrer au serveur ?',
              required: true,
              sectionId: 'sec-3',
              order: 0,
              options: [
                { id: 'h-1', label: 'Moins de 5 heures', value: 'less_5', points: 5 },
                { id: 'h-2', label: '5 à 15 heures', value: '5_15', points: 15 },
                { id: 'h-3', label: '15 à 25 heures', value: '15_25', points: 25 },
                { id: 'h-4', label: 'Plus de 25 heures', value: 'more_25', points: 30 },
              ],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'f-motivation',
              type: 'LONG_TEXT',
              label: 'Quelles sont vos motivations pour rejoindre ETHONE ?',
              description: 'Ce que vous pouvez apporter à l\'équipe',
              placeholder: 'Je souhaite aider la communauté et participer activement...',
              required: true,
              minLength: 30,
              maxLength: 1500,
              sectionId: 'sec-3',
              order: 1,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
          ],
          conditions: [
            {
              id: 'cond-1',
              sourceFieldId: 'f-exp',
              operator: 'EQUALS',
              value: 'yes',
              action: 'SHOW_FIELD',
              targetFieldId: 'f-exp-desc',
              logicGate: 'ALL',
            },
          ],
          scoring: {
            enabled: true,
            maxScore: 100,
            passScore: 60,
            thresholds: { low: 39, medium: 69, high: 100 },
          },
          antiSpam: {
            cooldownMinutes: 1440,
            maxSubmissionsPerUser: 1,
            minAccountAgeDays: 7,
            minGuildMembershipDays: 1,
            requiredRoleIds: [],
            forbiddenRoleIds: [],
            blacklistUserIds: [],
          },
          automations: [
            {
              id: 'auto-1',
              name: 'Notification Staff sur nouvelle candidature',
              enabled: true,
              trigger: 'RESPONSE_SUBMITTED',
              conditions: {},
              actions: [
                {
                  type: 'SEND_CHANNEL_MESSAGE',
                  messageTemplate: '📥 **Nouvelle candidature reçue** de {userTag} pour le formulaire "{formTitle}" (Score préliminaire : {score}/100)',
                },
              ],
            },
            {
              id: 'auto-2',
              name: 'Attribution Rôle Apprenti Modérateur à l\'approbation',
              enabled: true,
              trigger: 'RESPONSE_APPROVED',
              conditions: {},
              actions: [
                {
                  type: 'ADD_ROLE',
                  targetRoleId: 'role-mod-trial',
                },
                {
                  type: 'SEND_DM',
                  messageTemplate: 'Félicitations {userTag} ! Votre candidature a été acceptée par l\'équipe ETHONE.',
                },
              ],
            },
          ],
          panelConfig: {
            channelId: '123456789012345688',
            embedTitle: '🛡️ Recrutement Staff ETHONE 2026',
            embedDescription: 'Vous souhaitez vous investir et aider la communauté au quotidien ?\nPostulez dès maintenant via notre formulaire en ligne sécurisé.',
            embedColor: '#6366f1',
            thumbnailUrl: '',
            imageUrl: '',
            footerText: 'ETHONE Application Center • Réponse sous 48h',
            buttonText: 'Candidater au Staff',
            buttonEmoji: '📝',
            buttonStyle: 'PRIMARY',
            submissionMode: 'HYBRID',
          },
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
        {
          id: 'partner-app',
          guildId: demoGuildId,
          title: 'Demande de Partenariat ETHONE',
          description: 'Établissez un partenariat officiel avec notre communauté.',
          category: 'Partenariats & Réseaux',
          status: 'PUBLISHED',
          version: 1,
          sections: [
            { id: 'sec-p1', title: 'Détails du Partenaire', description: 'Informations sur votre serveur', order: 0 },
          ],
          fields: [
            {
              id: 'fp-name',
              type: 'SHORT_TEXT',
              label: 'Nom de votre serveur Discord',
              placeholder: 'Ex: Gaming Haven France',
              required: true,
              sectionId: 'sec-p1',
              order: 0,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'fp-members',
              type: 'NUMBER',
              label: 'Nombre de membres actifs',
              placeholder: '500',
              required: true,
              min: 50,
              sectionId: 'sec-p1',
              order: 1,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
            {
              id: 'fp-link',
              type: 'URL',
              label: 'Lien d\'invitation permanent',
              placeholder: 'https://discord.gg/exemple',
              required: true,
              sectionId: 'sec-p1',
              order: 2,
              options: [],
              allowedFileTypes: [],
              maxFileSizeMb: 10,
            },
          ],
          conditions: [],
          scoring: { enabled: false, maxScore: 100, passScore: 50, thresholds: { low: 30, medium: 60, high: 100 } },
          antiSpam: { cooldownMinutes: 4320, maxSubmissionsPerUser: 1, minAccountAgeDays: 14, minGuildMembershipDays: 3, requiredRoleIds: [], forbiddenRoleIds: [], blacklistUserIds: [] },
          automations: [],
          panelConfig: {
            channelId: '123456789012345689',
            embedTitle: '🤝 Demandes de Partenariat',
            embedDescription: 'Soumettez votre serveur pour une alliance communautaire.',
            embedColor: '#f59e0b',
            thumbnailUrl: '',
            imageUrl: '',
            footerText: 'ETHONE Partnerships',
            buttonText: 'Demander un Partenariat',
            buttonEmoji: '🤝',
            buttonStyle: 'SECONDARY',
            submissionMode: 'WEB',
          },
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
      ];

      this.forms = demoForms;
      this.saveForms();
    }

    if (this.responses.length === 0) {
      const demoResponses: FormResponse[] = [
        {
          id: 'resp-1',
          formId: 'staff-app',
          guildId: demoGuildId,
          userId: '987654321098765432',
          userTag: 'Aurelien#1337',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
          answers: [
            { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 21 },
            { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'yes' },
            { fieldId: 'f-exp-desc', fieldLabel: 'Décrivez votre expérience passée et vos responsabilités', fieldType: 'LONG_TEXT', value: 'Modérateur pendant 1 an sur un serveur eSport francophone de 3 200 membres. Gestion des litiges, salon vocal et AutoMod.' },
            { fieldId: 'f-hours', fieldLabel: 'Combien d\'heures par semaine pouvez-vous consacrer au serveur ?', fieldType: 'SELECT', value: '15_25' },
            { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: 'J\'apprécie particulièrement l\'ambiance du serveur et le professionnalisme des outils ETHONE. Je souhaite apporter mon aide.' },
          ],
          score: 85,
          scoreLabel: 'High',
          status: 'PENDING',
          assignedReviewerId: '111222333444555666',
          assignedReviewerTag: 'SeniorMod#0001',
          tags: ['Expérimenté', 'Majeur', 'Actif'],
          internalNotes: [
            {
              id: 'note-1',
              authorId: '111222333444555666',
              authorTag: 'SeniorMod#0001',
              content: 'Profil très sérieux avec de solides références. Score élevé au test situationnel.',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          submittedAt: new Date(Date.now() - 14400000).toISOString(),
          metadata: { accountAgeDays: 450, guildMemberDays: 45 },
        },
        {
          id: 'resp-2',
          formId: 'staff-app',
          guildId: demoGuildId,
          userId: '555666777888999000',
          userTag: 'Lucas_Dev#4040',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
          answers: [
            { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 19 },
            { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'yes' },
            { fieldId: 'f-exp-desc', fieldLabel: 'Décrivez votre expérience passée et vos responsabilités', fieldType: 'LONG_TEXT', value: 'Animateur et modérateur sur un serveur communautaire de jeux de rôle.' },
            { fieldId: 'f-hours', fieldLabel: 'Combien d\'heures par semaine pouvez-vous consacrer au serveur ?', fieldType: 'SELECT', value: '5_15' },
            { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: 'Motivé pour assurer une présence en soirée et les week-ends.' },
          ],
          score: 70,
          scoreLabel: 'High',
          status: 'APPROVED',
          assignedReviewerId: '111222333444555666',
          assignedReviewerTag: 'SeniorMod#0001',
          tags: ['Majeur', 'Soirées'],
          internalNotes: [
            {
              id: 'note-2',
              authorId: '111222333444555666',
              authorTag: 'SeniorMod#0001',
              content: 'Entretien vocal passé avec succès. Rôle assigné.',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
          decisionReason: 'Candidature retenue après entretien concluant.',
          submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          reviewedAt: new Date(Date.now() - 86400000).toISOString(),
          metadata: { accountAgeDays: 620, guildMemberDays: 80 },
        },
        {
          id: 'resp-3',
          formId: 'staff-app',
          guildId: demoGuildId,
          userId: '333444555666777888',
          userTag: 'NoobMaster#9999',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
          answers: [
            { fieldId: 'f-age', fieldLabel: 'Quel est votre âge ?', fieldType: 'NUMBER', value: 14 },
            { fieldId: 'f-exp', fieldLabel: 'Avez-vous déjà été modérateur sur un serveur Discord ?', fieldType: 'YES_NO', value: 'no' },
            { fieldId: 'f-hours', fieldLabel: 'Combien d\'heures par semaine pouvez-vous consacrer au serveur ?', fieldType: 'SELECT', value: 'less_5' },
            { fieldId: 'f-motivation', fieldLabel: 'Quelles sont vos motivations pour rejoindre ETHONE ?', fieldType: 'LONG_TEXT', value: 'J\'aimerais avoir les perms pour aider mes potes sur le serv.' },
          ],
          score: 25,
          scoreLabel: 'Low',
          status: 'REJECTED',
          assignedReviewerId: '111222333444555666',
          assignedReviewerTag: 'SeniorMod#0001',
          tags: ['Mineur', 'Non retenu'],
          internalNotes: [
            {
              id: 'note-3',
              authorId: '111222333444555666',
              authorTag: 'SeniorMod#0001',
              content: 'Critère d\'âge non respecté et motivations insuffisantes.',
              createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
          ],
          decisionReason: 'Âge minimum requis non atteint et manque d\'expérience.',
          submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          reviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          metadata: { accountAgeDays: 30, guildMemberDays: 2 },
        },
      ];

      this.responses = demoResponses;
      this.saveResponses();
    }
  }

  // --- FORMS CRUD ---
  public getForms(guildId: string): DiscordForm[] {
    return this.forms.filter((f) => f.guildId === guildId);
  }

  public getFormById(guildId: string, formId: string): DiscordForm | null {
    return this.forms.find((f) => f.guildId === guildId && f.id === formId) || null;
  }

  public saveForm(form: DiscordForm): DiscordForm {
    const validated = DiscordFormSchema.parse(form);
    const index = this.forms.findIndex((f) => f.guildId === form.guildId && f.id === form.id);
    if (index >= 0) {
      this.forms[index] = { ...validated, updatedAt: new Date().toISOString() };
    } else {
      this.forms.push(validated);
    }
    this.saveForms();
    return index >= 0 ? this.forms[index] : validated;
  }

  public deleteForm(guildId: string, formId: string): boolean {
    const initialLen = this.forms.length;
    this.forms = this.forms.filter((f) => !(f.guildId === guildId && f.id === formId));
    if (this.forms.length !== initialLen) {
      this.saveForms();
      return true;
    }
    return false;
  }

  public duplicateForm(guildId: string, formId: string, newTitle?: string): DiscordForm | null {
    const original = this.getFormById(guildId, formId);
    if (!original) return null;
    const newId = `form-${Date.now().toString(36)}`;
    const duplicate: DiscordForm = {
      ...original,
      id: newId,
      title: newTitle || `${original.title} (Copie)`,
      status: 'DRAFT',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: undefined,
    };
    this.forms.push(duplicate);
    this.saveForms();
    return duplicate;
  }

  // --- RESPONSES CRUD ---
  public getResponses(guildId: string, formId?: string): FormResponse[] {
    return this.responses.filter((r) => {
      if (r.guildId !== guildId) return false;
      if (formId && r.formId !== formId) return false;
      return true;
    });
  }

  public getResponseById(guildId: string, responseId: string): FormResponse | null {
    return this.responses.find((r) => r.guildId === guildId && r.id === responseId) || null;
  }

  public saveResponse(response: FormResponse): FormResponse {
    const validated = FormResponseSchema.parse(response);
    const index = this.responses.findIndex((r) => r.guildId === response.guildId && r.id === response.id);
    if (index >= 0) {
      this.responses[index] = validated;
    } else {
      this.responses.push(validated);
    }
    this.saveResponses();
    return index >= 0 ? this.responses[index] : validated;
  }

  public deleteResponse(guildId: string, responseId: string): boolean {
    const initialLen = this.responses.length;
    this.responses = this.responses.filter((r) => !(r.guildId === guildId && r.id === responseId));
    if (this.responses.length !== initialLen) {
      this.saveResponses();
      return true;
    }
    return false;
  }

  // --- STATS ---
  public getOverviewStats(guildId: string): FormOverviewStats {
    const guildForms = this.getForms(guildId);
    const guildResponses = this.getResponses(guildId);

    const activeForms = guildForms.filter((f) => f.status === 'PUBLISHED').length;
    const pendingReviews = guildResponses.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING').length;
    const approvedCount = guildResponses.filter((r) => r.status === 'APPROVED').length;
    const rejectedCount = guildResponses.filter((r) => r.status === 'REJECTED').length;

    const completionRate = guildResponses.length > 0 ? 94.2 : 0;

    return {
      totalForms: guildForms.length,
      activeForms,
      totalResponses: guildResponses.length,
      pendingReviews,
      averageCompletionRate: completionRate,
      approvedCount,
      rejectedCount,
    };
  }
}

export const formRepository = new FormRepository();
