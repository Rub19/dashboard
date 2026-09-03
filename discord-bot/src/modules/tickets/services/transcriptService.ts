import fs from 'fs';
import path from 'path';
import { Collection, Message, TextChannel } from 'discord.js';
import { Ticket } from '../types/ticket.js';
import { logger } from '../../../utils/logger.js';

export class TranscriptService {
  private static transcriptDir = path.resolve(process.cwd(), 'data', 'transcripts');

  public static ensureDir() {
    if (!fs.existsSync(this.transcriptDir)) {
      fs.mkdirSync(this.transcriptDir, { recursive: true });
    }
  }

  public static async generateTranscript(
    channel: TextChannel,
    ticket: Ticket
  ): Promise<{ filePath: string; html: string }> {
    this.ensureDir();

    let fetchedMessages: Message[] = [];
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      fetchedMessages = Array.from(messages.values()).reverse();
    } catch (err) {
      logger.error('Erreur lors de la récupération des messages pour le transcript :', err);
    }

    const messagesHtml = fetchedMessages
      .map((msg) => {
        const time = msg.createdAt.toLocaleString('fr-FR');
        const author = msg.author.tag;
        const avatar = msg.author.displayAvatarURL({ size: 64 });
        const isBot = msg.author.bot;

        let content = msg.cleanContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');

        // Pièces jointes
        const attachmentsHtml = Array.from(msg.attachments.values())
          .map((att) => {
            const isImg = att.contentType?.startsWith('image/');
            if (isImg) {
              return `<div class="attachment"><img src="${att.url}" alt="Attachment" style="max-width:300px; border-radius:6px; margin-top:6px;"/></div>`;
            }
            return `<div class="attachment"><a href="${att.url}" target="_blank" style="color:#5865f2;">📎 ${att.name}</a></div>`;
          })
          .join('');

        return `
        <div class="message">
          <img class="avatar" src="${avatar}" alt="${author}" />
          <div class="content-box">
            <div class="header">
              <span class="author">${author}</span>
              ${isBot ? '<span class="bot-tag">BOT</span>' : ''}
              <span class="time">${time}</span>
            </div>
            <div class="text">${content}</div>
            ${attachmentsHtml}
          </div>
        </div>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Transcript #${ticket.id} • ${channel.name}</title>
  <style>
    body {
      background-color: #313338;
      color: #DBDEE1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
    }
    .header-card {
      background-color: #2B2D31;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .header-card h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #fff;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 13px;
      color: #949BA4;
    }
    .meta-grid strong {
      color: #fff;
    }
    .messages-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .message {
      display: flex;
      gap: 14px;
      padding: 6px 0;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1e1f22;
      flex-shrink: 0;
    }
    .content-box {
      flex: 1;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .author {
      font-weight: 600;
      color: #fff;
      font-size: 14px;
    }
    .bot-tag {
      background: #5865f2;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
    }
    .time {
      font-size: 11px;
      color: #949BA4;
    }
    .text {
      font-size: 14px;
      line-height: 1.4;
      color: #DBDEE1;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="header-card">
    <h1>🎫 Transcript • #${ticket.id}</h1>
    <div class="meta-grid">
      <div>Salon : <strong>#${channel.name}</strong></div>
      <div>Catégorie : <strong>${ticket.categoryName}</strong></div>
      <div>Créateur : <strong>${ticket.userTag} (${ticket.userId})</strong></div>
      <div>Créé le : <strong>${new Date(ticket.createdAt).toLocaleString('fr-FR')}</strong></div>
      <div>Traité par : <strong>${ticket.claimedBy ? ticket.claimedBy.tag : 'Non assigné'}</strong></div>
    </div>
  </div>

  <div class="messages-container">
    ${messagesHtml}
  </div>
</body>
</html>`;

    const fileName = `transcript-${ticket.id}.html`;
    const filePath = path.join(this.transcriptDir, fileName);

    fs.writeFileSync(filePath, html, 'utf-8');
    return { filePath, html };
  }
}
