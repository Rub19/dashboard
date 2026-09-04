import { CaseEvidence } from '../types/case.js';
import { moderationRepository } from '../storage/moderationRepository.js';

export class EvidenceService {
  public static getEvidence(caseId: string): CaseEvidence[] {
    return moderationRepository.getCaseEvidence(caseId);
  }

  public static addEvidence(params: {
    caseId: string;
    type: 'MESSAGE_LINK' | 'SCREENSHOT_URL' | 'LOG_SNIPPET' | 'NOTE';
    url?: string;
    content?: string;
    messageId?: string;
    channelId?: string;
    addedBy: string;
  }): CaseEvidence {
    const item: CaseEvidence = {
      id: `EV-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      caseId: params.caseId,
      type: params.type,
      url: params.url,
      content: params.content,
      messageId: params.messageId,
      channelId: params.channelId,
      addedBy: params.addedBy,
      createdAt: new Date().toISOString(),
    };

    moderationRepository.addCaseEvidence(item);
    return item;
  }

  public static deleteEvidence(caseId: string, evidenceId: string): boolean {
    return moderationRepository.deleteEvidence(caseId, evidenceId);
  }
}
