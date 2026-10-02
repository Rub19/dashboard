import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalFonts } from '@napi-rs/canvas';
import { logger } from './logger.js';

/**
 * Polices embarquées (OFL, assets/fonts) pour les images générées. Sans elles, le VPS n'a que DejaVu/Nimbus et
 * `sans-serif` retombait sur une police à chasse fixe (cartes de bienvenue à l'aspect « terminal »).
 */
export type CardFont = 'poppins' | 'bebas' | 'serif' | 'mono';

const FILES: [string, string][] = [
  ['Poppins-Regular.ttf', 'EthoPoppins'],
  ['Poppins-SemiBold.ttf', 'EthoPoppins'],
  ['Poppins-Bold.ttf', 'EthoPoppins'],
  ['BebasNeue-Regular.ttf', 'EthoBebas'],
  ['DMSerifDisplay-Regular.ttf', 'EthoSerif'],
  ['SpaceMono-Regular.ttf', 'EthoMono'],
  ['SpaceMono-Bold.ttf', 'EthoMono'],
];

const FALLBACK = '"DejaVu Sans", "Segoe UI", Arial, sans-serif';

/** Pile CSS de police pour un style donné (avec repli si le fichier manque). */
export const FONT_STACK: Record<CardFont, string> = {
  poppins: `EthoPoppins, ${FALLBACK}`,
  bebas: `EthoBebas, EthoPoppins, ${FALLBACK}`,
  serif: `EthoSerif, "DejaVu Serif", Georgia, serif`,
  mono: `EthoMono, "DejaVu Sans Mono", monospace`,
};

let registered = false;

export function registerCardFonts(): void {
  if (registered) return;
  registered = true;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = [
    path.resolve(process.cwd(), 'assets', 'fonts'),
    path.resolve(process.cwd(), 'discord-bot', 'assets', 'fonts'),
    path.resolve(here, '..', '..', 'assets', 'fonts'),
  ].find((d) => fs.existsSync(d));
  if (!dir) {
    logger.warn('[cardFonts] Dossier assets/fonts introuvable : polices système utilisées.');
    return;
  }
  for (const [file, family] of FILES) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family);
  }
}
