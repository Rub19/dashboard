import fs from 'fs';
import path from 'path';
import { Message, TextChannel } from 'discord.js';
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
  ): Promise<{ filePath: string; html: string; txt: string; json: string }> {
    this.ensureDir();

    let fetchedMessages: Message[] = [];
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      fetchedMessages = Array.from(messages.values()).reverse();
    } catch (err) {
      logger.error('Erreur lors de la récupération des messages pour le transcript :', err);
    }

    // 1. Version HTML
    const messagesHtml = fetchedMessages
      .map((msg) => {
        const time = msg.createdAt.toLocaleString('fr-FR');
        const author = msg.author.tag;
        const avatar = msg.author.displayAvatarURL({ size: 64 });
        const isBot = msg.author.bot;

        const content = msg.cleanContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');

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
            <div class="text">${content || '<i>Message sans texte</i>'}</div>
            ${attachmentsHtml}
          </div>
        </div>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Transcript • ${ticket.id} • ${ticket.categoryName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; background-color: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header-bar { background: linear-gradient(135deg, #4f46e5, #3b82f6); padding: 24px; color: #ffffff; }
    .header-bar h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .header-bar p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 16px 24px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; }
    .meta-item strong { color: #a1a1aa; display: block; font-size: 10px; text-transform: uppercase; }
    .messages-list { padding: 20px; }
    .message { display: flex; gap: 12px; margin-bottom: 16px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .content-box { flex: 1; }
    .header { margin-bottom: 4px; }
    .author { font-weight: 700; color: #ffffff; font-size: 13px; }
    .bot-tag { background-color: #5865F2; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 4px; border-radius: 4px; margin-left: 6px; }
    .time { font-size: 11px; color: #71717a; margin-left: 8px; }
    .text { font-size: 13px; line-height: 1.5; color: #e4e4e7; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <h1>🎫 Transcript • ${ticket.id}</h1>
      <p>Catégorie : ${ticket.categoryName} • Demandeur : ${ticket.userTag} (${ticket.userId})</p>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><strong>Statut</strong>${ticket.status}</div>
      <div class="meta-item"><strong>Priorité</strong>${ticket.priority}</div>
      <div class="meta-item"><strong>Pris en charge par</strong>${ticket.claimedBy?.tag || 'Aucun'}</div>
      <div class="meta-item"><strong>Date de création</strong>${new Date(ticket.createdAt).toLocaleString('fr-FR')}</div>
    </div>
    <div class="messages-list">
      ${messagesHtml || '<p style="text-align:center; color:#71717a;">Aucun message échangé.</p>'}
    </div>
    <div class="footer">Généré par ETHONE Tickets Center 2.0 • ${new Date().toLocaleString('fr-FR')}</div>
  </div>
</body>
</html>`;

    // 2. Version Texte brut TXT
    const txt = [
      `============================================================`,
      `TRANSCRIPT TICKET : ${ticket.id}`,
      `Guilde : ${ticket.guildId}`,
      `Catégorie : ${ticket.categoryName}`,
      `Demandeur : ${ticket.userTag} (${ticket.userId})`,
      `Statut : ${ticket.status} | Priorité : ${ticket.priority}`,
      `Date : ${ticket.createdAt}`,
      `============================================================\n`,
      ...fetchedMessages.map((m) => {
        const time = m.createdAt.toISOString();
        const author = m.author.tag;
        const content = m.cleanContent || '(Fichier/Média)';
        return `[${time}] ${author}: ${content}`;
      }),
    ].join('\n');

    // 3. Version JSON
    const json = JSON.stringify(
      {
        ticket,
        messages: fetchedMessages.map((m) => ({
          id: m.id,
          author: { id: m.author.id, tag: m.author.tag, bot: m.author.bot },
          content: m.content,
          cleanContent: m.cleanContent,
          attachments: Array.from(m.attachments.values()).map((a) => ({ name: a.name, url: a.url })),
          timestamp: m.createdAt.toISOString(),
        })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    );

    // Sauvegarde physique HTML
    const fileName = `transcript-${ticket.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}.html`;
    const filePath = path.join(this.transcriptDir, fileName);
    fs.writeFileSync(filePath, html, 'utf-8');

    return { filePath, html, txt, json };
  }
}
