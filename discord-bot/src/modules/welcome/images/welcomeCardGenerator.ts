import { createCanvas, loadImage } from '@napi-rs/canvas';
import { WelcomeImageConfig } from '../types/welcomeConfig.js';
import { VariableContext } from '../types/variables.js';
import { VariableParser } from '../variables/variableParser.js';
import { logger } from '../../../utils/logger.js';

export class WelcomeCardGenerator {
  public static async generateCard(
    imageConfig: WelcomeImageConfig,
    avatarUrl: string,
    ctx: VariableContext
  ): Promise<Buffer> {
    const width = 800;
    const height = 300;

    const canvas = createCanvas(width, height);
    const c = canvas.getContext('2d');

    const accent = imageConfig.accentColor || '#8B5CF6';

    // 1. Fond sombre moderne
    const bgGradient = c.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#08080C');
    bgGradient.addColorStop(0.5, '#0E1017');
    bgGradient.addColorStop(1, '#08080A');
    c.fillStyle = bgGradient;
    c.fillRect(0, 0, width, height);

    // 2. Halo lumineux diffus (Glow d'accent)
    const glowGradient = c.createRadialGradient(200, 150, 10, 200, 150, 240);
    glowGradient.addColorStop(0, `${accent}33`); // 20% d'opacité
    glowGradient.addColorStop(1, 'transparent');
    c.fillStyle = glowGradient;
    c.fillRect(0, 0, width, height);

    // 3. Bordure subtile de carte
    c.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    c.lineWidth = 2;
    c.strokeRect(10, 10, width - 20, height - 20);

    // 4. Dessin de l'avatar circulaire
    const avatarX = 140;
    const avatarY = 150;
    const avatarRadius = 65;

    // Anneau lumineux autour de l'avatar
    c.save();
    c.beginPath();
    c.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
    c.strokeStyle = accent;
    c.lineWidth = 4;
    c.shadowColor = accent;
    c.shadowBlur = 15;
    c.stroke();
    c.restore();

    // Clip & image de l'avatar
    try {
      const response = await fetch(avatarUrl);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const avatarImage = await loadImage(Buffer.from(arrayBuf));

        c.save();
        c.beginPath();
        c.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        c.closePath();
        c.clip();
        c.drawImage(
          avatarImage,
          avatarX - avatarRadius,
          avatarY - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        );
        c.restore();
      }
    } catch (err) {
      logger.error('Erreur lors du chargement de l’avatar pour la carte welcome :', err);
      // Fallback cercle plein si avatar non joignable
      c.save();
      c.beginPath();
      c.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      c.fillStyle = '#1E202E';
      c.fill();
      c.restore();
    }

    // 5. Typographie et textes
    const textStartX = 250;

    // Titre (ex: "BIENVENUE")
    const titleText = VariableParser.parse(imageConfig.titleText, ctx).toUpperCase();
    c.font = 'bold 22px sans-serif';
    c.fillStyle = accent;
    c.fillText(titleText, textStartX, 115);

    // Nom du membre (ex: "Rub")
    let usernameText = VariableParser.parse(imageConfig.subtitleText, ctx);
    if (usernameText.length > 20) {
      usernameText = usernameText.slice(0, 18) + '...';
    }
    c.font = 'bold 36px sans-serif';
    c.fillStyle = '#FFFFFF';
    c.fillText(usernameText, textStartX, 160);

    // Tag / Compteur (ex: "Membre #1 245 • Mon Serveur")
    const tagText = VariableParser.parse(imageConfig.tagText, ctx);
    c.font = '16px sans-serif';
    c.fillStyle = '#94A3B8';
    c.fillText(tagText, textStartX, 195);

    // 6. Signature de marque subtile
    c.font = '12px sans-serif';
    c.fillStyle = 'rgba(255, 255, 255, 0.25)';
    c.fillText(ctx.guildName, textStartX, 225);

    return canvas.toBuffer('image/png');
  }
}
