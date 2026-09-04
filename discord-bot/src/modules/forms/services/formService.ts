import {
  DiscordForm,
  FormResponse,
  FormAnswer,
  FormResponseStatus,
  FormInternalNote,
} from '../types/index.js';
import { formRepository } from '../storage/formRepository.js';
import { formConditionService } from './formConditionService.js';
import { formScoringService } from './formScoringService.js';
import { formAutomationService } from './formAutomationService.js';

export interface SubmitResponseParams {
  guildId: string;
  formId: string;
  userId: string;
  userTag: string;
  userAvatar?: string;
  answers: FormAnswer[];
  metadata?: {
    accountAgeDays?: number;
    guildMemberDays?: number;
    userRoleIds?: string[];
    ip?: string;
    userAgent?: string;
  };
}

export class FormService {
  /**
   * Submit an answer to a form with anti-spam checks, validation, scoring and automations.
   */
  public async submitResponse(params: SubmitResponseParams): Promise<{
    success: boolean;
    response?: FormResponse;
    error?: string;
  }> {
    const form = formRepository.getFormById(params.guildId, params.formId);
    if (!form) {
      return { success: false, error: 'Formulaire introuvable.' };
    }

    if (form.status !== 'PUBLISHED') {
      return { success: false, error: 'Ce formulaire n\'est pas actuellement ouvert aux réponses.' };
    }

    // --- Anti-Spam & Anti-Abuse Checks ---
    const antiSpam = form.antiSpam;
    if (antiSpam) {
      if (antiSpam.blacklistUserIds?.includes(params.userId)) {
        return { success: false, error: 'Vous n\'êtes pas autorisé à soumettre ce formulaire.' };
      }

      if (params.metadata) {
        if (
          antiSpam.minAccountAgeDays &&
          (params.metadata.accountAgeDays || 0) < antiSpam.minAccountAgeDays
        ) {
          return {
            success: false,
            error: `Votre compte Discord doit avoir au moins ${antiSpam.minAccountAgeDays} jours d'ancienneté.`,
          };
        }

        if (
          antiSpam.minGuildMembershipDays &&
          (params.metadata.guildMemberDays || 0) < antiSpam.minGuildMembershipDays
        ) {
          return {
            success: false,
            error: `Vous devez être membre du serveur depuis au moins ${antiSpam.minGuildMembershipDays} jours.`,
          };
        }

        if (antiSpam.requiredRoleIds && antiSpam.requiredRoleIds.length > 0) {
          const userRoles = params.metadata.userRoleIds || [];
          const hasRequired = antiSpam.requiredRoleIds.some((r) => userRoles.includes(r));
          if (!hasRequired) {
            return { success: false, error: 'Vous ne possédez pas le rôle requis pour soumettre ce formulaire.' };
          }
        }

        if (antiSpam.forbiddenRoleIds && antiSpam.forbiddenRoleIds.length > 0) {
          const userRoles = params.metadata.userRoleIds || [];
          const hasForbidden = antiSpam.forbiddenRoleIds.some((r) => userRoles.includes(r));
          if (hasForbidden) {
            return { success: false, error: 'L\'un de vos rôles vous interdit de soumettre ce formulaire.' };
          }
        }
      }

      // Max submissions check & cooldown
      const existingUserResponses = formRepository
        .getResponses(params.guildId, params.formId)
        .filter((r) => r.userId === params.userId);

      if (
        antiSpam.maxSubmissionsPerUser &&
        existingUserResponses.length >= antiSpam.maxSubmissionsPerUser
      ) {
        return {
          success: false,
          error: `Vous avez atteint la limite maximale de soumissions (${antiSpam.maxSubmissionsPerUser}) pour ce formulaire.`,
        };
      }

      if (antiSpam.cooldownMinutes && existingUserResponses.length > 0) {
        const lastSubmission = existingUserResponses.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )[0];
        const elapsedMinutes = (Date.now() - new Date(lastSubmission.submittedAt).getTime()) / 60000;
        if (elapsedMinutes < antiSpam.cooldownMinutes) {
          const remaining = Math.ceil(antiSpam.cooldownMinutes - elapsedMinutes);
          return {
            success: false,
            error: `Veuillez patienter encore ${remaining} minute(s) avant de soumettre à nouveau.`,
          };
        }
      }
    }

    // --- Validate Required Fields (Respecting Conditional Logic) ---
    const answersMap: Record<string, any> = {};
    for (const a of params.answers) {
      answersMap[a.fieldId] = a.value;
    }

    for (const field of form.fields) {
      const isVisible = formConditionService.isFieldVisible(field.id, form.conditions, answersMap);
      if (!isVisible) {
        // Clear value if not visible to prevent junk data
        delete answersMap[field.id];
        continue;
      }

      const isRequired = formConditionService.isFieldRequired(field, form.conditions, answersMap);
      const val = answersMap[field.id];
      if (isRequired && (val === undefined || val === null || val === '')) {
        return {
          success: false,
          error: `Le champ obligatoire "${field.label}" doit être renseigné.`,
        };
      }
    }

    // Filter valid answers
    const finalAnswers: FormAnswer[] = params.answers
      .filter((a) => formConditionService.isFieldVisible(a.fieldId, form.conditions, answersMap))
      .map((a) => ({
        ...a,
        value: answersMap[a.fieldId] ?? a.value,
      }));

    // --- Calculate Scoring ---
    const scoringResult = formScoringService.calculateScore(form, finalAnswers);

    const responseId = `resp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newResponse: FormResponse = {
      id: responseId,
      formId: form.id,
      guildId: form.guildId,
      userId: params.userId,
      userTag: params.userTag,
      userAvatar: params.userAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
      answers: finalAnswers,
      score: scoringResult.score,
      scoreLabel: scoringResult.scoreLabel,
      status: 'PENDING',
      tags: [],
      internalNotes: [],
      submittedAt: new Date().toISOString(),
      metadata: {
        accountAgeDays: params.metadata?.accountAgeDays || 0,
        guildMemberDays: params.metadata?.guildMemberDays || 0,
        ip: params.metadata?.ip,
        userAgent: params.metadata?.userAgent,
      },
    };

    formRepository.saveResponse(newResponse);

    // Trigger Automations
    await formAutomationService.executeTrigger('RESPONSE_SUBMITTED', form, newResponse);
    if (form.scoring.enabled && newResponse.score >= (form.scoring.passScore || 60)) {
      await formAutomationService.executeTrigger('SCORE_THRESHOLD_MET', form, newResponse);
    }

    return { success: true, response: newResponse };
  }

  /**
   * Review a response (Approve, Reject, Request Changes, Archive, Spam).
   */
  public async reviewResponse(params: {
    guildId: string;
    responseId: string;
    reviewerId: string;
    reviewerTag: string;
    status: FormResponseStatus;
    decisionReason?: string;
    noteContent?: string;
  }): Promise<{ success: boolean; response?: FormResponse; error?: string }> {
    const response = formRepository.getResponseById(params.guildId, params.responseId);
    if (!response) {
      return { success: false, error: 'Réponse introuvable.' };
    }

    const form = formRepository.getFormById(params.guildId, response.formId);
    if (!form) {
      return { success: false, error: 'Formulaire lié introuvable.' };
    }

    response.status = params.status;
    response.assignedReviewerId = params.reviewerId;
    response.assignedReviewerTag = params.reviewerTag;
    response.reviewedAt = new Date().toISOString();
    if (params.decisionReason) {
      response.decisionReason = params.decisionReason;
    }

    if (params.noteContent && params.noteContent.trim()) {
      const note: FormInternalNote = {
        id: `note-${Date.now().toString(36)}`,
        authorId: params.reviewerId,
        authorTag: params.reviewerTag,
        content: params.noteContent.trim(),
        createdAt: new Date().toISOString(),
      };
      response.internalNotes.push(note);
    }

    formRepository.saveResponse(response);

    // Trigger Automations
    if (params.status === 'APPROVED') {
      await formAutomationService.executeTrigger('RESPONSE_APPROVED', form, response);
    } else if (params.status === 'REJECTED') {
      await formAutomationService.executeTrigger('RESPONSE_REJECTED', form, response);
    }
    await formAutomationService.executeTrigger('RESPONSE_STATUS_CHANGED', form, response);

    return { success: true, response };
  }

  /**
   * Add internal staff note to a response.
   */
  public addNote(params: {
    guildId: string;
    responseId: string;
    authorId: string;
    authorTag: string;
    content: string;
  }): FormResponse | null {
    const response = formRepository.getResponseById(params.guildId, params.responseId);
    if (!response) return null;

    const note: FormInternalNote = {
      id: `note-${Date.now().toString(36)}`,
      authorId: params.authorId,
      authorTag: params.authorTag,
      content: params.content.trim(),
      createdAt: new Date().toISOString(),
    };
    response.internalNotes.push(note);
    formRepository.saveResponse(response);
    return response;
  }

  /**
   * Assign or unassign reviewer.
   */
  public assignReviewer(params: {
    guildId: string;
    responseId: string;
    reviewerId?: string;
    reviewerTag?: string;
  }): FormResponse | null {
    const response = formRepository.getResponseById(params.guildId, params.responseId);
    if (!response) return null;

    response.assignedReviewerId = params.reviewerId;
    response.assignedReviewerTag = params.reviewerTag;
    if (params.reviewerId && response.status === 'PENDING') {
      response.status = 'REVIEWING';
    }
    formRepository.saveResponse(response);
    return response;
  }

  /**
   * Publish a form draft to live status.
   */
  public publishForm(guildId: string, formId: string): DiscordForm | null {
    const form = formRepository.getFormById(guildId, formId);
    if (!form) return null;

    form.status = 'PUBLISHED';
    form.publishedAt = new Date().toISOString();
    form.version += 1;
    form.updatedAt = new Date().toISOString();

    formRepository.saveForm(form);
    return form;
  }

  /**
   * Export responses as CSV or JSON.
   */
  public exportResponses(guildId: string, formId: string, format: 'csv' | 'json'): string {
    const responses = formRepository.getResponses(guildId, formId);
    const form = formRepository.getFormById(guildId, formId);

    if (format === 'json') {
      return JSON.stringify(responses, null, 2);
    }

    // CSV format
    const fieldHeaders = form ? form.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`) : [];
    const headers = [
      'Response ID',
      'User ID',
      'User Tag',
      'Status',
      'Score',
      'Score Label',
      'Reviewer',
      'Submitted At',
      ...fieldHeaders,
    ];

    const rows = responses.map((r) => {
      const answersByField: Record<string, string> = {};
      for (const a of r.answers) {
        answersByField[a.fieldId] = String(a.value ?? '');
      }

      const answerValues = form
        ? form.fields.map((f) => `"${(answersByField[f.id] || '').replace(/"/g, '""')}"`)
        : [];

      return [
        `"${r.id}"`,
        `"${r.userId}"`,
        `"${r.userTag}"`,
        `"${r.status}"`,
        r.score,
        `"${r.scoreLabel}"`,
        `"${r.assignedReviewerTag || 'None'}"`,
        `"${r.submittedAt}"`,
        ...answerValues,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const formService = new FormService();
