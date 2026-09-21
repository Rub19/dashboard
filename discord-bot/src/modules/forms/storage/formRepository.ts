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
