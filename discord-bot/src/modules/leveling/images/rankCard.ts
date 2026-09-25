import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { safeText } from '../../../utils/canvasText.js';

const FONT = '"DejaVu Sans", "Segoe UI", Arial, sans-serif';

export interface RankCardData {
  username: string;
  avatarUrl: string | null;
  rank: number;
  totalMembers: number;
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
  messages: number;
  /** Couleur d'accent du module Niveaux (#RRGGBB). */
  accent: string;
  /** Rôle-récompense suivant (nom déjà lisible) et niveau requis, s'il en existe un. */
  nextReward?: { name: string; level: number } | null;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

function roundRect(c: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fit(c: SKRSContext2D, text: string, maxWidth: number): string {
  if (c.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && c.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Carte de rang : avatar, pseudo, rang, niveau, barre de progression aux couleurs du serveur, messages et prochaine récompense. */
export async function renderRankCard(d: RankCardData): Promise<Buffer> {
  const W = 934;
  const H = 300;
  const canvas = createCanvas(W, H);
  const c = canvas.getContext('2d');
  const accent = /^#[0-9a-fA-F]{6}$/.test(d.accent) ? d.accent : '#f59e0b';

  // Fond : dégradé sombre + halo d'accent
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#10131a');
  bg.addColorStop(1, '#171b26');
  roundRect(c, 0, 0, W, H, 26);
  c.fillStyle = bg;
  c.fill();
  c.save();
  roundRect(c, 0, 0, W, H, 26);
  c.clip();
  const glow = c.createRadialGradient(W - 80, 30, 10, W - 80, 30, 380);
  glow.addColorStop(0, `${accent}44`);
  glow.addColorStop(1, `${accent}00`);
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  c.restore();
  roundRect(c, 1, 1, W - 2, H - 2, 25);
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 2;
  c.stroke();

  // Avatar rond avec anneau d'accent
  const ax = 40;
  const ay = 46;
  const ar = 100;
  c.beginPath();
  c.arc(ax + ar, ay + ar, ar + 6, 0, Math.PI * 2);
  c.fillStyle = accent;
  c.fill();
  c.save();
  c.beginPath();
  c.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2);
  c.clip();
  let drawn = false;
  if (d.avatarUrl) {
    try {
      const img = await loadImage(d.avatarUrl);
      c.drawImage(img, ax, ay, ar * 2, ar * 2);
      drawn = true;
    } catch {
      /* avatar indisponible : pastille de repli */
    }
  }
  if (!drawn) {
    c.fillStyle = '#242a38';
    c.fillRect(ax, ay, ar * 2, ar * 2);
    c.fillStyle = accent;
    c.font = `bold 84px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(safeText(d.username, '?').slice(0, 1).toUpperCase(), ax + ar, ay + ar + 4);
  }
  c.restore();

  const left = 280;
  const right = W - 44;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  // Pseudo
  c.fillStyle = '#f2f4f8';
  c.font = `bold 40px ${FONT}`;
  c.fillText(fit(c, safeText(d.username, 'Membre'), right - left - 260), left, 92);

  // Rang et niveau à droite
  c.textAlign = 'right';
  c.fillStyle = '#8b93a7';
  c.font = `bold 18px ${FONT}`;
  c.fillText('RANG', right - 190, 70);
  c.fillText('NIVEAU', right, 70);
  c.fillStyle = '#f2f4f8';
  c.font = `bold 46px ${FONT}`;
  c.fillText(`#${d.rank}`, right - 190, 116);
  c.fillStyle = accent;
  c.fillText(String(d.level), right, 116);

  // Sous-titre : messages
  c.textAlign = 'left';
  c.fillStyle = '#8b93a7';
  c.font = `16px ${FONT}`;
  c.fillText(fit(c, `${fmt(d.messages)} message${d.messages > 1 ? 's' : ''}  ·  ${fmt(d.totalXp)} XP au total`, right - 300 - left), left, 132);

  // Barre de progression
  const barX = left;
  const barY = 172;
  const barW = right - left;
  const barH = 34;
  roundRect(c, barX, barY, barW, barH, barH / 2);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fill();
  const pct = Math.min(100, Math.max(0, d.progressPercentage));
  if (pct > 0) {
    const w = Math.max(barH, (barW * pct) / 100);
    const grad = c.createLinearGradient(barX, 0, barX + w, 0);
    grad.addColorStop(0, `${accent}cc`);
    grad.addColorStop(1, accent);
    roundRect(c, barX, barY, w, barH, barH / 2);
    c.fillStyle = grad;
    c.fill();
  }
  c.fillStyle = '#ffffff';
  c.font = `bold 16px ${FONT}`;
  c.textAlign = 'center';
  c.fillText(`${pct}%`, barX + barW / 2, barY + 23);

  c.textAlign = 'left';
  c.fillStyle = '#c9cfdd';
  c.font = `15px ${FONT}`;
  c.fillText(`${fmt(d.currentLevelXp)} / ${fmt(d.nextLevelXp)} XP`, barX, barY + barH + 30);
  c.textAlign = 'right';
  c.fillStyle = '#8b93a7';
  c.fillText(`Niveau ${d.level + 1} dans ${fmt(Math.max(0, d.nextLevelXp - d.currentLevelXp))} XP`, right, barY + barH + 30);

  // Prochaine récompense
  c.textAlign = 'left';
  if (d.nextReward) {
    c.fillStyle = '#8b93a7';
    c.font = `15px ${FONT}`;
    c.fillText(fit(c, `Prochaine récompense : ${safeText(d.nextReward.name, 'rôle')} au niveau ${d.nextReward.level}`, right - left), left, H - 34);
  }
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.font = `12px ${FONT}`;
  c.textAlign = 'right';
  c.fillText('ETHONE', right, H - 20);

  return canvas.toBuffer('image/png');
}
