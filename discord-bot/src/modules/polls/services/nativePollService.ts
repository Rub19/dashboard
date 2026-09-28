import type { Client } from 'discord.js';
import { DiscordPoll } from '../types/index.js';
import { pollRepository } from '../storage/pollRepository.js';
import { isSendableTarget, sendToConfiguredChannel } from '../../../utils/channelSend.js';
import { logger } from '../../../utils/logger.js';

/**
 * Sondages natifs Discord (champ `poll` d'un message). Discord gère le vote, l'affichage et la clôture ;
 * le bot garde un enregistrement (`native: true`) pour l'afficher dans le dashboard, avec le décompte
 * rafraîchi toutes les minutes et figé à la fin.
 */

export const NATIVE_MAX_HOURS = 768; // 32 jours
export const NATIVE_MAX_ANSWERS = 10;
export const NATIVE_POLL_LOCKED_ERROR = 'Cette action ne concerne pas les sondages natifs Discord (vote, durée et clôture sont gérés par Discord).';

export interface NativePollInput {
  guildId: string;
  channelId: string;
  question: string;
  answers: Array<{ text: string; emoji?: string }>;
  durationHours?: number;
  multiselect?: boolean;
  creatorId: string;
  creatorTag: string;
}

/** Options du moteur maison qu'un sondage natif ne sait pas faire (libellés français, vides si aucune). */
export interface NativeIncompatibilities {
  quorum?: boolean;
  secret?: boolean;
  weights?: boolean;
  eligibility?: boolean;
  automations?: boolean;
  resultsVisibility?: boolean;
  multipleQuestions?: boolean;
  type?: string;
}

const SUPPORTED_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO'];

export function nativeIncompatibilityError(o: NativeIncompatibilities): string | null {
  const bad: string[] = [];
  if (o.quorum) bad.push('le quorum');
  if (o.secret) bad.push('le vote secret / anonyme');
  if (o.weights) bad.push('la pondération des voix');
  if (o.eligibility) bad.push("les conditions d'éligibilité");
  if (o.automations) bad.push('les décisions automatiques');
  if (o.resultsVisibility) bad.push("la visibilité personnalisée des résultats");
  if (o.multipleQuestions) bad.push('plusieurs questions');
  if (o.type && !SUPPORTED_TYPES.includes(o.type)) bad.push(`le mode de scrutin ${o.type}`);
  if (!bad.length) return null;
  return `Un sondage natif Discord ne gère pas : ${bad.join(', ')}. Désactive « natif » pour utiliser ces options, ou retire-les.`;
}

/** Emoji Unicode ou personnalisé `<:nom:id>` → format accepté par discord.js ; sinon ignoré. */
export function toPollEmoji(raw?: string): string | { id: string; name: string; animated: boolean } | undefined {
  const s = (raw || '').trim();
  if (!s) return undefined;
  const custom = s.match(/^<(a?):(\w+):(\d+)>$/);
  if (custom) return { id: custom[3]!, name: custom[2]!, animated: custom[1] === 'a' };
  return /[\p{Extended_Pictographic}\p{Regional_Indicator}⃣]/u.test(s) ? s : undefined;
}

/** Erreur de validation en français, ou null si les paramètres sont acceptables par Discord. */
export function validateNativeInput(i: Pick<NativePollInput, 'question' | 'answers' | 'durationHours'>): string | null {
  const q = i.question.trim();
  if (!q) return 'La question du sondage est vide.';
  if (q.length > 300) return 'La question d’un sondage natif est limitée à 300 caractères.';
  if (i.answers.length < 2 || i.answers.length > NATIVE_MAX_ANSWERS) return `Un sondage natif accepte de 2 à ${NATIVE_MAX_ANSWERS} réponses.`;
  for (const a of i.answers) {
    const t = a.text.trim();
    if (!t) return 'Une réponse est vide.';
    if (t.length > 55) return `La réponse « ${t.slice(0, 20)}… » dépasse 55 caractères (limite Discord).`;
  }
  const d = i.durationHours ?? 24;
  if (!Number.isFinite(d) || d < 1 || d > NATIVE_MAX_HOURS) return `La durée d’un sondage natif doit être comprise entre 1 et ${NATIVE_MAX_HOURS} heures.`;
  return null;
}

/** Le `poll` à passer à `channel.send()` / au message de départ d'un post de forum. */
export function buildNativePollPayload(i: Pick<NativePollInput, 'question' | 'answers' | 'durationHours' | 'multiselect'>) {
  return {
    poll: {
      question: { text: i.question.trim() },
      answers: i.answers.map((a) => {
        const emoji = toPollEmoji(a.emoji);
        return emoji ? { text: a.text.trim(), emoji } : { text: a.text.trim() };
      }),
      duration: Math.round(i.durationHours ?? 24),
      allowMultiselect: !!i.multiselect,
    },
  };
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export class NativePollService {
  private timer?: NodeJS.Timeout;

  /** Envoie le sondage natif et enregistre l'enregistrement associé (statut ACTIVE). */
  public async create(client: Client, input: NativePollInput): Promise<{ success: boolean; poll?: DiscordPoll; error?: string }> {
    const invalid = validateNativeInput(input);
    if (invalid) return { success: false, error: invalid };

    const channel = await client.channels.fetch(input.channelId).catch(() => null);
    if (!channel || !isSendableTarget(channel)) return { success: false, error: 'Salon Discord invalide ou inaccessible.' };

    const payload = buildNativePollPayload(input);
    let msg;
    try {
      msg = await sendToConfiguredChannel(channel, payload, { postTitle: input.question.trim() });
    } catch (err: any) {
      logger.warn('[NativePoll] envoi impossible :', err);
      return { success: false, error: `Envoi du sondage impossible : ${err?.message || 'erreur Discord'}` };
    }

    const now = new Date();
    const hours = payload.poll.duration;
    const expires = (msg as any).poll?.expiresTimestamp;
    const endsAt = new Date(typeof expires === 'number' ? expires : now.getTime() + hours * 3600_000).toISOString();
    const poll: DiscordPoll = {
      id: uid('poll'),
      guildId: input.guildId,
      title: input.question.trim().slice(0, 200),
      description: '',
      category: 'Communauté',
      type: input.multiselect ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
      status: 'ACTIVE',
      creatorId: input.creatorId,
      creatorTag: input.creatorTag,
      anonymity: 'PUBLIC',
      resultsVisibility: 'LIVE',
      allowVoteChange: true,
      allowVoteRetract: false,
      questions: [
        {
          id: uid('q'),
          title: input.question.trim(),
          description: '',
          type: input.multiselect ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          required: true,
          minSelections: 1,
          maxSelections: input.multiselect ? input.answers.length : 1,
          order: 0,
          options: input.answers.map((a) => ({
            id: uid('opt'),
            label: a.text.trim(),
            description: '',
            emoji: toPollEmoji(a.emoji) ? (a.emoji || '').trim() : '',
            imageUrl: '',
            color: '#6366f1',
            weight: 1,
            votesCount: 0,
            points: 0,
          })),
        },
      ],
      eligibility: { allowedRoleIds: [], forbiddenRoleIds: [], minAccountAgeDays: 0, minGuildMembershipDays: 0, specificUserIds: [], logicGate: 'ANY' },
      roleWeights: [],
      quorum: { enabled: false, minParticipantsCount: 0, minParticipationPercentage: 0, approvalThresholdPercentage: 50 },
      automations: [],
      panelConfig: {
        channelId: msg.channelId || input.channelId,
        embedTitle: `📊 ${input.question.trim()}`.slice(0, 256),
        embedDescription: '',
        embedColor: '#6366f1',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'Sondage natif Discord',
        buttonText: 'Voter',
        showLiveResultsButton: false,
      },
      native: true,
      messageId: msg.id,
      channelId: msg.channelId || input.channelId,
      allowMultiselect: !!input.multiselect,
      startsAt: now.toISOString(),
      endsAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    return { success: true, poll: pollRepository.savePoll(poll) };
  }

  /** Recopie le décompte Discord dans l'enregistrement ; le passe en ENDED si le sondage est terminé. */
  public async sync(client: Client, poll: DiscordPoll, now = Date.now(), fetched?: any): Promise<DiscordPoll> {
    if (!poll.native || !poll.messageId || !poll.channelId) return poll;

    let msg = fetched;
    if (!msg) {
      try {
        const channel: any = await client.channels.fetch(poll.channelId);
        msg = await channel?.messages?.fetch(poll.messageId);
      } catch (err: any) {
        // Message ou salon supprimé côté Discord : plus rien à suivre, on fige le sondage.
        if (err?.code === 10008 || err?.code === 10003) return this.finish(poll, now);
        logger.warn(`[NativePoll] lecture du sondage ${poll.id} impossible :`, err?.message ?? err);
        return poll;
      }
    }
    const dp = msg?.poll;
    if (!dp) return this.finish(poll, now); // le message n'a plus de sondage

    const answers = [...dp.answers.entries()].sort(([a]: any, [b]: any) => a - b).map(([, v]: any) => v);
    const question = poll.questions[0];
    if (question) {
      question.options = question.options.map((o, i) => {
        const count = Number(answers[i]?.voteCount ?? o.votesCount ?? 0) || 0;
        return { ...o, votesCount: count, points: count };
      });
    }

    const expires: number | null = typeof dp.expiresTimestamp === 'number' ? dp.expiresTimestamp : null;
    const ended = !!dp.resultsFinalized || (expires !== null ? expires <= now : !!poll.endsAt && new Date(poll.endsAt).getTime() <= now);
    if (ended) return this.finish(poll, now);
    return pollRepository.savePoll(poll);
  }

  private finish(poll: DiscordPoll, now: number): DiscordPoll {
    poll.status = 'ENDED';
    poll.endedAt = new Date(now).toISOString();
    return pollRepository.savePoll(poll);
  }

  /** Termine un sondage natif avant l'heure (`message.poll.end()`) et fige le décompte. */
  public async end(client: Client | undefined, guildId: string, pollId: string): Promise<{ success: boolean; poll?: DiscordPoll; error?: string }> {
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll || !poll.native) return { success: false, error: 'Sondage natif introuvable.' };
    if (poll.status === 'ENDED') return { success: true, poll };
    if (!client) return { success: false, error: 'Bot indisponible.' };

    try {
      const channel: any = await client.channels.fetch(poll.channelId!);
      const msg = await channel.messages.fetch(poll.messageId!);
      let latest = msg;
      try {
        latest = (await msg.poll.end()) ?? msg;
      } catch (err: any) {
        // Déjà expiré côté Discord : on se contente de figer le décompte.
        if (!/expired/i.test(String(err?.message))) throw err;
      }
      const synced = await this.sync(client, poll, Date.now(), latest);
      return { success: true, poll: synced.status === 'ENDED' ? synced : this.finish(synced, Date.now()) };
    } catch (err: any) {
      if (err?.code === 10008 || err?.code === 10003) return { success: true, poll: this.finish(poll, Date.now()) };
      return { success: false, error: `Clôture impossible : ${err?.message || 'erreur Discord'}` };
    }
  }

  /** Un passage : rafraîchit les sondages natifs actifs (décompte en direct) et clôture ceux dont l'heure est passée. */
  public async tick(client: Client, now = Date.now()): Promise<number> {
    let ended = 0;
    for (const poll of pollRepository.getAllPolls().filter((p) => p.native && p.status === 'ACTIVE')) {
      try {
        const next = await this.sync(client, poll, now);
        if (next.status === 'ENDED') ended++;
      } catch (err) {
        logger.warn(`[NativePoll] tick ${poll.id} :`, err);
      }
    }
    return ended;
  }

  /** Vérification toutes les 60 s (idempotent). */
  public start(client: Client): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(client), 60_000);
    this.timer.unref?.();
  }
}

export const nativePollService = new NativePollService();
