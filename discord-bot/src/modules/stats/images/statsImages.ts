import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';

/**
 * Images des statistiques (graphiques et fiche membre), dessinées avec @napi-rs/canvas : aucune dépendance externe, aucun
 * service en ligne (les données du serveur ne quittent jamais le bot). Pas d'émoji dans les textes : ils ne s'affichent
 * pas sans police dédiée sur un serveur Linux.
 */

import { safeText } from '../../../utils/canvasText.js';

const FONT = '"DejaVu Sans", "Segoe UI", Arial, sans-serif';
const COLORS = {
  bg: '#0d0f14',
  panel: '#151821',
  panelBorder: 'rgba(255,255,255,0.07)',
  text: '#f2f4f8',
  muted: '#8b93a7',
  grid: 'rgba(255,255,255,0.07)',
  blue: '#5aa9f6',
  green: '#3fd28a',
  pink: '#f0559a',
  amber: '#f5b74a',
};

export interface ChartPoint {
  label: string;
  value: number;
}

function roundRect(c: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function panel(c: SKRSContext2D, x: number, y: number, w: number, h: number) {
  roundRect(c, x, y, w, h, 14);
  c.fillStyle = COLORS.panel;
  c.fill();
  c.strokeStyle = COLORS.panelBorder;
  c.lineWidth = 1;
  c.stroke();
}

/** Graduation « ronde » de l'axe vertical : au plus `steps` traits, valeurs en 1 / 2 / 5 × 10^n. */
export function niceScale(max: number, steps = 4): { top: number; step: number } {
  if (max <= 0) return { top: steps, step: 1 };
  const raw = max / steps;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  return { top: Math.ceil(max / step) * step, step };
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fit(c: SKRSContext2D, rawText: string, maxWidth: number, fallback = ''): string {
  const text = safeText(rawText, fallback);
  if (c.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && c.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export interface BarChartOptions {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  color?: string;
  unit?: string;
  /** Mode courbe (aire) au lieu de barres, pour les évolutions (ex. nombre de membres). */
  kind?: 'bars' | 'line';
  width?: number;
  height?: number;
}

/** Graphique d'une série journalière : barres (activité) ou courbe (évolution), axe vertical gradué, étiquettes espacées. */
export async function renderBarChart(opts: BarChartOptions): Promise<Buffer> {
  const width = opts.width ?? 900;
  const height = opts.height ?? 380;
  const canvas = createCanvas(width, height);
  const c = canvas.getContext('2d');
  const color = opts.color ?? COLORS.blue;

  c.fillStyle = COLORS.bg;
  c.fillRect(0, 0, width, height);
  panel(c, 10, 10, width - 20, height - 20);

  c.fillStyle = COLORS.text;
  c.font = `bold 20px ${FONT}`;
  c.textBaseline = 'alphabetic';
  c.fillText(fit(c, opts.title, width - 260, 'Statistiques'), 34, 46);
  if (opts.subtitle) {
    c.fillStyle = COLORS.muted;
    c.font = `13px ${FONT}`;
    c.fillText(fit(c, opts.subtitle, width - 260, ''), 34, 68);
  }

  const left = 64;
  const right = width - 36;
  const top = 92;
  const bottom = height - 54;
  const plotW = right - left;
  const plotH = bottom - top;
  const values = opts.data.map((p) => p.value);
  const { top: axisMax, step } = niceScale(Math.max(0, ...values));

  // Grille et graduations
  c.font = `12px ${FONT}`;
  c.textAlign = 'right';
  for (let v = 0; v <= axisMax + 1e-9; v += step) {
    const y = bottom - (v / axisMax) * plotH;
    c.strokeStyle = COLORS.grid;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(left, y);
    c.lineTo(right, y);
    c.stroke();
    c.fillStyle = COLORS.muted;
    c.fillText(formatCompact(v), left - 10, y + 4);
  }
  c.textAlign = 'left';

  const n = opts.data.length;
  if (n === 0) return canvas.encode('png');
  const slot = plotW / n;

  if (opts.kind === 'line') {
    const xy = (i: number, v: number): [number, number] => [left + slot * (i + 0.5), bottom - (v / axisMax) * plotH];
    const grad = c.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, `${color}55`);
    grad.addColorStop(1, `${color}00`);
    c.beginPath();
    opts.data.forEach((p, i) => {
      const [x, y] = xy(i, p.value);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    const [lastX] = xy(n - 1, 0);
    const [firstX] = xy(0, 0);
    c.lineTo(lastX, bottom);
    c.lineTo(firstX, bottom);
    c.closePath();
    c.fillStyle = grad;
    c.fill();
    c.beginPath();
    opts.data.forEach((p, i) => {
      const [x, y] = xy(i, p.value);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.strokeStyle = color;
    c.lineWidth = 2.5;
    c.lineJoin = 'round';
    c.stroke();
  } else {
    const barW = Math.max(1.5, Math.min(26, slot * 0.68));
    c.fillStyle = color;
    opts.data.forEach((p, i) => {
      if (p.value <= 0) return;
      const h = Math.max(2, (p.value / axisMax) * plotH);
      const x = left + slot * i + (slot - barW) / 2;
      roundRect(c, x, bottom - h, barW, h, Math.min(3, barW / 2));
      c.fill();
    });
  }

  // Étiquettes de l'axe horizontal : une sur `every`, la dernière toujours incluse
  c.fillStyle = COLORS.muted;
  c.font = `12px ${FONT}`;
  c.textAlign = 'center';
  const maxLabels = Math.max(2, Math.floor(plotW / 78));
  const every = Math.max(1, Math.ceil(n / maxLabels));
  for (let i = n - 1; i >= 0; i -= every) c.fillText(opts.data[i].label, left + slot * (i + 0.5), bottom + 22);
  c.textAlign = 'left';

  // Total / valeur actuelle en haut à droite (pas de collision avec les étiquettes de l'axe)
  const total = values.reduce((a, b) => a + b, 0);
  c.fillStyle = COLORS.text;
  c.font = `bold 16px ${FONT}`;
  c.textAlign = 'right';
  c.fillText(opts.kind === 'line' ? `${formatCompact(values[n - 1])}${opts.unit ? ` ${opts.unit}` : ''}` : `${formatCompact(total)}${opts.unit ? ` ${opts.unit}` : ''}`, width - 34, 46);
  c.fillStyle = COLORS.muted;
  c.font = `12px ${FONT}`;
  c.fillText(opts.kind === 'line' ? 'actuel' : 'total sur la période', width - 34, 66);
  c.textAlign = 'left';
  c.fillText('ETHONE', 34, height - 22);

  return canvas.encode('png');
}

export interface MemberCardData {
  name: string;
  avatarUrl: string | null;
  createdOn: string | null;
  joinedOn: string | null;
  rankMessages: number | null;
  rankVoice: number | null;
  windows: Record<'1' | '7' | '60', { messages: number; voiceHours: number }>;
  topChannels: Array<{ label: string; value: string }>;
  series: Array<{ messages: number; voiceHours: number }>;
}

function drawChip(c: SKRSContext2D, label: string, value: string, xRight: number, y: number) {
  c.font = `11px ${FONT}`;
  const w = Math.max(c.measureText(label).width, c.measureText(value).width) + 26;
  const x = xRight - w;
  roundRect(c, x, y, w, 46, 10);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  c.fill();
  c.strokeStyle = COLORS.panelBorder;
  c.stroke();
  c.fillStyle = COLORS.muted;
  c.fillText(label, x + 13, y + 18);
  c.fillStyle = COLORS.text;
  c.font = `bold 13px ${FONT}`;
  c.fillText(value, x + 13, y + 36);
  return x;
}

function miniLine(c: SKRSContext2D, x: number, y: number, w: number, h: number, values: number[], color: string) {
  const max = Math.max(1, ...values);
  c.beginPath();
  values.forEach((v, i) => {
    const px = x + (values.length <= 1 ? 0 : (i / (values.length - 1)) * w);
    const py = y + h - (v / max) * h;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  });
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  c.stroke();
}

/** Fiche membre façon Statbot : rangs, messages et vocal sur 1 / 7 / 60 jours, salons préférés, courbes. */
export async function renderMemberCard(data: MemberCardData): Promise<Buffer> {
  const width = 900;
  const height = 520;
  const canvas = createCanvas(width, height);
  const c = canvas.getContext('2d');
  c.fillStyle = COLORS.bg;
  c.fillRect(0, 0, width, height);
  panel(c, 10, 10, width - 20, height - 20);

  // En-tête : avatar, nom, dates
  const cx = 78;
  const cy = 82;
  c.save();
  c.beginPath();
  c.arc(cx, cy, 38, 0, Math.PI * 2);
  c.closePath();
  c.clip();
  c.fillStyle = '#23283a';
  c.fillRect(cx - 38, cy - 38, 76, 76);
  if (data.avatarUrl) {
    try {
      const res = await fetch(data.avatarUrl);
      if (res.ok) c.drawImage(await loadImage(Buffer.from(await res.arrayBuffer())), cx - 38, cy - 38, 76, 76);
    } catch {
      /* avatar indisponible : on garde le disque uni */
    }
  }
  c.restore();
  c.strokeStyle = COLORS.blue;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy, 40, 0, Math.PI * 2);
  c.stroke();

  c.fillStyle = COLORS.text;
  c.font = `bold 28px ${FONT}`;
  c.textBaseline = 'alphabetic';
  c.fillText(fit(c, data.name, 380, 'Membre'), 134, 92);

  let chipRight = width - 34;
  if (data.joinedOn) chipRight = drawChip(c, 'Arrivé le', data.joinedOn, chipRight, 52) - 10;
  if (data.createdOn) drawChip(c, 'Compte créé le', data.createdOn, chipRight, 52);

  // Trois blocs : rangs / messages / vocal
  const rowY = 138;
  const boxH = 150;
  const cols = [
    { x: 34, w: 250, title: 'Rangs sur le serveur' },
    { x: 298, w: 280, title: 'Messages' },
    { x: 592, w: 274, title: 'Activité vocale' },
  ];
  for (const col of cols) {
    panel(c, col.x, rowY, col.w, boxH);
    c.fillStyle = COLORS.text;
    c.font = `bold 15px ${FONT}`;
    c.fillText(col.title, col.x + 16, rowY + 28);
  }

  const rankLine = (label: string, rank: number | null, y: number) => {
    c.fillStyle = COLORS.muted;
    c.font = `14px ${FONT}`;
    c.fillText(label, 50, y);
    c.fillStyle = rank ? COLORS.amber : COLORS.muted;
    c.font = `bold 22px ${FONT}`;
    c.textAlign = 'right';
    c.fillText(rank ? `#${rank}` : '—', 268, y + 2);
    c.textAlign = 'left';
  };
  rankLine('Messages', data.rankMessages, rowY + 70);
  rankLine('Vocal', data.rankVoice, rowY + 118);

  const windows: Array<['1' | '7' | '60', string]> = [['1', '1 j'], ['7', '7 j'], ['60', '60 j']];
  windows.forEach(([key, label], i) => {
    const y = rowY + 62 + i * 30;
    const w = data.windows[key];
    c.fillStyle = COLORS.muted;
    c.font = `14px ${FONT}`;
    c.fillText(label, 314, y);
    c.fillStyle = COLORS.text;
    c.font = `bold 16px ${FONT}`;
    c.textAlign = 'right';
    c.fillText(`${formatCompact(w.messages)} message${w.messages > 1 ? 's' : ''}`, 562, y);
    c.fillStyle = COLORS.muted;
    c.font = `14px ${FONT}`;
    c.textAlign = 'left';
    c.fillText(label, 608, y);
    c.fillStyle = COLORS.text;
    c.font = `bold 16px ${FONT}`;
    c.textAlign = 'right';
    c.fillText(`${formatCompact(w.voiceHours)} h`, 850, y);
    c.textAlign = 'left';
  });

  // Salons préférés et courbes
  const lowY = 304;
  const lowH = 176;
  panel(c, 34, lowY, 380, lowH);
  panel(c, 428, lowY, 438, lowH);
  c.fillStyle = COLORS.text;
  c.font = `bold 15px ${FONT}`;
  c.fillText('Salons les plus actifs', 50, lowY + 28);
  c.fillText('Courbes sur 60 jours', 444, lowY + 28);
  if (data.topChannels.length === 0) {
    c.fillStyle = COLORS.muted;
    c.font = `14px ${FONT}`;
    c.fillText('Aucune activité sur la période.', 50, lowY + 68);
  }
  data.topChannels.slice(0, 4).forEach((ch, i) => {
    const y = lowY + 62 + i * 32;
    c.fillStyle = COLORS.text;
    c.font = `14px ${FONT}`;
    c.fillText(fit(c, ch.label, 230, 'salon'), 50, y);
    c.fillStyle = COLORS.muted;
    c.textAlign = 'right';
    c.fillText(ch.value, 398, y);
    c.textAlign = 'left';
  });

  const chartX = 448;
  const chartY = lowY + 48;
  const chartW = 398;
  const chartH = 92;
  c.strokeStyle = COLORS.grid;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(chartX, chartY + chartH);
  c.lineTo(chartX + chartW, chartY + chartH);
  c.stroke();
  miniLine(c, chartX, chartY, chartW, chartH, data.series.map((s) => s.messages), COLORS.green);
  miniLine(c, chartX, chartY, chartW, chartH, data.series.map((s) => s.voiceHours), COLORS.pink);
  c.font = `12px ${FONT}`;
  const legendY = lowY + chartH + 70;
  c.fillStyle = COLORS.green;
  c.beginPath();
  c.arc(454, legendY - 4, 4, 0, Math.PI * 2);
  c.fill();
  c.fillText('Messages', 464, legendY);
  c.fillStyle = COLORS.pink;
  c.beginPath();
  c.arc(548, legendY - 4, 4, 0, Math.PI * 2);
  c.fill();
  c.fillText('Vocal', 558, legendY);

  c.fillStyle = COLORS.muted;
  c.font = `12px ${FONT}`;
  c.fillText('Période : 60 derniers jours — fuseau : UTC', 34, height - 22);
  c.textAlign = 'right';
  c.fillText('Propulsé par ETHONE', width - 34, height - 22);
  c.textAlign = 'left';

  return canvas.encode('png');
}
