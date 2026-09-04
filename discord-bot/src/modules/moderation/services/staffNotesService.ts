import { StaffNote } from '../types/case.js';
import { moderationRepository } from '../storage/moderationRepository.js';

export class StaffNotesService {
  public static getUserNotes(guildId: string, userId: string): StaffNote[] {
    return moderationRepository.getUserNotes(guildId, userId);
  }

  public static getCaseNotes(guildId: string, caseId: string): StaffNote[] {
    return moderationRepository.getCaseNotes(guildId, caseId);
  }

  public static addNote(params: {
    guildId: string;
    userId: string;
    caseId?: string;
    authorId: string;
    authorTag: string;
    content: string;
  }): StaffNote {
    const note: StaffNote = {
      id: `NOTE-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      guildId: params.guildId,
      userId: params.userId,
      caseId: params.caseId,
      authorId: params.authorId,
      authorTag: params.authorTag,
      content: params.content,
      createdAt: new Date().toISOString(),
    };

    moderationRepository.addNote(note);

    moderationRepository.addAuditLog({
      id: `AUDIT-${Date.now()}`,
      guildId: params.guildId,
      actorId: params.authorId,
      actorTag: params.authorTag,
      action: 'NOTE_ADD',
      targetType: 'NOTE',
      targetId: note.id,
      details: `Ajout d'une note privée pour ${params.userId}`,
      timestamp: new Date().toISOString(),
    });

    return note;
  }

  public static deleteNote(guildId: string, noteId: string, actorId: string, actorTag: string): boolean {
    const ok = moderationRepository.deleteNote(guildId, noteId);
    if (ok) {
      moderationRepository.addAuditLog({
        id: `AUDIT-${Date.now()}`,
        guildId,
        actorId,
        actorTag,
        action: 'NOTE_DELETE',
        targetType: 'NOTE',
        targetId: noteId,
        details: `Suppression d'une note privée`,
        timestamp: new Date().toISOString(),
      });
    }
    return ok;
  }
}
