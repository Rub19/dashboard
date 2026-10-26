import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { logger } from '../../utils/logger.js';

export interface RecapPlayer {
  name: string;
  tag: string;
  agent: string;
  ally: boolean;
  me: boolean;
  acs: number;
  kills: number;
  deaths: number;
  assists: number;
  hs: number;
  adr: number;
  rank: string;
}

export interface RecapRecord {
  title: string;
  won: boolean;
  players: RecapPlayer[];
  rounds: string;
  createdAt: number;
}

const MAX_RECORDS = 300;
const text = (value: unknown, max: number): string => String(value ?? '').slice(0, max);
const int = (value: unknown): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(99999, n)) : 0;
};

class ValorantRecapStore {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.resolve(this.dataDir, 'valorant-recaps.json');
  private records = new Map<string, RecapRecord>();

  constructor() {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    try {
      if (fs.existsSync(this.filePath)) {
        for (const [key, value] of Object.entries(JSON.parse(fs.readFileSync(this.filePath, 'utf8')))) {
          this.records.set(key, value as RecapRecord);
        }
      }
    } catch (error) {
      logger.error('Récaps Valorant illisibles :', error);
    }
  }

  add(record: RecapRecord): string {
    const key = randomBytes(6).toString('hex');
    this.records.set(key, record);
    while (this.records.size > MAX_RECORDS) this.records.delete(this.records.keys().next().value as string);
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.records)), 'utf8');
    } catch (error) {
      logger.error('Récaps Valorant non enregistrés :', error);
    }
    return key;
  }

  get(key: string): RecapRecord | undefined {
    return this.records.get(key);
  }
}

export const valorantRecapStore = new ValorantRecapStore();

export function parsePlayers(raw: unknown): RecapPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((p: any) => ({
    name: text(p?.name, 32),
    tag: text(p?.tag, 10),
    agent: text(p?.agent, 24),
    ally: p?.ally === true,
    me: p?.me === true,
    acs: int(p?.acs),
    kills: int(p?.kills),
    deaths: int(p?.deaths),
    assists: int(p?.assists),
    hs: int(p?.hs),
    adr: int(p?.adr),
    rank: text(p?.rank, 24),
  }));
}

export function parseRounds(raw: unknown): string {
  return text(raw, 40).replace(/[^WL]/g, '');
}

export function recapButtons(key: string, record: RecapRecord, links: Array<{ label: string; url: string }>) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (record.players.length) {
    row.addComponents(new ButtonBuilder().setCustomId(`evr:sb:${key}`).setLabel('Tableau des scores').setEmoji('📊').setStyle(ButtonStyle.Primary));
  }
  if (record.rounds.length) {
    row.addComponents(new ButtonBuilder().setCustomId(`evr:rd:${key}`).setLabel('Manches').setEmoji('🎯').setStyle(ButtonStyle.Secondary));
  }
  for (const link of links.slice(0, 3)) {
    row.addComponents(new ButtonBuilder().setLabel(link.label).setURL(link.url).setStyle(ButtonStyle.Link));
  }
  return row.components.length ? [row] : [];
}

function pad(value: string, width: number): string {
  const chars = [...value];
  return chars.length >= width ? chars.slice(0, width).join('') : value + ' '.repeat(width - chars.length);
}

function teamBlock(players: RecapPlayer[]): string {
  const lines = players
    .sort((a, b) => b.acs - a.acs)
    .map((p) => `${p.me ? '▶' : ' '} ${pad(p.name, 14)} ${pad(p.agent, 9)} ${String(p.acs).padStart(3)}  ${`${p.kills}/${p.deaths}/${p.assists}`.padEnd(8)} ${String(p.hs).padStart(2)}%`);
  return '```\n  Joueur         Agent     ACS  K/D/A    HS\n' + lines.join('\n') + '\n```';
}

export async function handleRecapButton(interaction: ButtonInteraction): Promise<void> {
  const [, kind, key] = interaction.customId.split(':');
  const record = key ? valorantRecapStore.get(key) : undefined;
  if (!record) {
    await interaction.reply({ content: 'Ce récap a expiré.', flags: MessageFlags.Ephemeral });
    return;
  }
  const embed = new EmbedBuilder().setColor(record.won ? 0x35b86b : 0xe5484d).setTitle(record.title);
  if (kind === 'sb') {
    const allies = record.players.filter((p) => p.ally);
    const enemies = record.players.filter((p) => !p.ally);
    embed.addFields(
      { name: '🟢 Alliés', value: teamBlock(allies).slice(0, 1024) },
      { name: '🔴 Ennemis', value: teamBlock(enemies).slice(0, 1024) },
    );
  } else {
    const rounds = [...record.rounds];
    const won = rounds.filter((r) => r === 'W').length;
    const line = rounds.map((r, i) => (r === 'W' ? '🟩' : '🟥') + ((i + 1) % 12 === 0 && i + 1 < rounds.length ? '\n' : '')).join('');
    let streak = 0;
    let best = 0;
    for (const r of rounds) {
      streak = r === 'W' ? streak + 1 : 0;
      best = Math.max(best, streak);
    }
    embed.setDescription(line || '—').addFields(
      { name: 'Manches gagnées', value: `${won} / ${rounds.length}`, inline: true },
      { name: 'Meilleure série', value: `${best}`, inline: true },
    );
  }
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
