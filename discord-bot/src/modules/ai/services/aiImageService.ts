import { EmbedBuilder } from 'discord.js';
import { logger } from '../../../utils/logger.js';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

export class AIImageService {
  // Mots et concepts strictement prohibés (Discord ToS & Community Guidelines)
  private static readonly PROHIBITED_PROMPT_PATTERNS = [
    /\b(nsfw|nude|naked|porn|hentai|sex|erotic|gore|blood|kill|suicide|torture)\b/i,
    /\b(child|minor|underage)\b.*\b(explicit|nude|sexual)\b/i,
    /\b(hate|nazi|racist|terrorist)\b/i,
  ];

  /**
   * Vérifie la conformité du prompt vis-à-vis des règles ToS Discord
   */
  public static validatePrompt(prompt: string): { valid: boolean; reason?: string } {
    if (!prompt || prompt.trim().length < 3) {
      return { valid: false, reason: 'La description de l\'image doit comporter au moins 3 caractères.' };
    }

    if (prompt.length > 500) {
      return { valid: false, reason: 'La description de l\'image ne peut pas dépasser 500 caractères.' };
    }

    for (const pattern of this.PROHIBITED_PROMPT_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          valid: false,
          reason: 'Ce prompt enfreint les règles de sécurité et les Community Guidelines de Discord.',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Génère une image via le moteur Flux / Pollinations AI haute qualité
   */
  public static async generateImage(params: {
    prompt: string;
    width?: number;
    height?: number;
    seed?: number;
  }): Promise<ImageGenerationResult> {
    const { prompt, width = 1024, height = 1024 } = params;

    const validation = this.validatePrompt(prompt);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    try {
      const cleanPrompt = prompt.trim();
      const seed = params.seed || Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(cleanPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;

      logger.info(`[AIImageService] Génération d'image demandée : "${cleanPrompt.slice(0, 50)}..."`);

      return {
        success: true,
        imageUrl,
        revisedPrompt: cleanPrompt,
      };
    } catch (err: any) {
      logger.error('[AIImageService] Erreur lors de la génération d\'image :', err);
      return {
        success: false,
        error: 'Impossible de générer l\'image pour le moment. Veuillez réessayer plus tard.',
      };
    }
  }

  /**
   * Crée un embed d'image Discord sécurisé et élégant
   */
  public static buildImageEmbed(params: {
    prompt: string;
    imageUrl: string;
    authorTag: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x8b5cf6) // Violet vibrant IA
      .setTitle('🎨 Image Générée par ETHONE AI')
      .setDescription(`**Prompt :** *« ${params.prompt} »*`)
      .setImage(params.imageUrl)
      .setFooter({
        text: `Demandé par ${params.authorTag} • Modèle Flux • Conforme ToS Discord`,
      })
      .setTimestamp();
  }
}
