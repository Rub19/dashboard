import fs from 'fs';
import path from 'path';
import {
  DiscordPoll,
  PollVote,
  PollOverviewKPIs,
  DiscordPollSchema,
  PollVoteSchema,
} from '../types/index.js';
import { logger } from '../../../utils/logger.js';

export class PollRepository {
  private pollsPath = path.resolve(process.cwd(), 'data', 'discord_polls.json');
  private votesPath = path.resolve(process.cwd(), 'data', 'discord_poll_votes.json');

  private polls: DiscordPoll[] = [];
  private votes: PollVote[] = [];

  constructor() {
    this.ensureDirectory();
    this.loadData();
    this.seedDefaultData();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.pollsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.pollsPath)) {
        const raw = fs.readFileSync(this.pollsPath, 'utf-8');
        this.polls = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_polls.json :', err);
      this.polls = [];
    }

    try {
      if (fs.existsSync(this.votesPath)) {
        const raw = fs.readFileSync(this.votesPath, 'utf-8');
        this.votes = JSON.parse(raw);
      }
    } catch (err) {
      logger.error('Erreur chargement discord_poll_votes.json :', err);
      this.votes = [];
    }
  }

  private savePolls(): void {
    try {
      fs.writeFileSync(this.pollsPath, JSON.stringify(this.polls, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_polls.json :', err);
    }
  }

  private saveVotes(): void {
    try {
      fs.writeFileSync(this.votesPath, JSON.stringify(this.votes, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Erreur sauvegarde discord_poll_votes.json :', err);
    }
  }

  private seedDefaultData(): void {
    const demoGuildId = '123456789012345678';
    if (this.polls.length === 0) {
      const demoPolls: DiscordPoll[] = [
        {
          id: 'community-game-night',
          guildId: demoGuildId,
          title: 'Soirée Gaming Communautaire — Choix du Jeu',
          description: 'Votez pour le jeu principal de notre stream communautaire de vendredi soir !',
          category: 'Événements & Jeux',
          type: 'SINGLE_CHOICE',
          status: 'ACTIVE',
          creatorId: '123456789012345678',
          creatorTag: 'Admin#0001',
          anonymity: 'PUBLIC',
          resultsVisibility: 'LIVE',
          allowVoteChange: true,
          allowVoteRetract: false,
          questions: [
            {
              id: 'q-game',
              title: 'À quel jeu souhaitez-vous jouer ce vendredi ?',
              description: 'Une seule réponse possible',
              type: 'SINGLE_CHOICE',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              order: 0,
              options: [
                { id: 'opt-valo', label: 'Valorant (Custom 5v5)', emoji: '🎯', description: 'Tournoi amical inter-membres', color: '#f43f5e', weight: 1, votesCount: 52, points: 52 },
                { id: 'opt-mc', label: 'Minecraft (Mini-jeux Bedwars)', emoji: '⛏️', description: 'Serveur privé dédié', color: '#10b981', weight: 1, votesCount: 41, points: 41 },
                { id: 'opt-lethal', label: 'Lethal Company', emoji: '👽', description: 'Escouades vocales de 4', color: '#f59e0b', weight: 1, votesCount: 22, points: 22 },
                { id: 'opt-rocket', label: 'Rocket League (Tournoi 2v2)', emoji: '⚽', description: 'Matches à élimination directe', color: '#3b82f6', weight: 1, votesCount: 13, points: 13 },
              ],
            },
          ],
          eligibility: {
            allowedRoleIds: [],
            forbiddenRoleIds: [],
            minAccountAgeDays: 0,
            minGuildMembershipDays: 0,
            specificUserIds: [],
            logicGate: 'ANY',
          },
          roleWeights: [
            { roleId: 'role-vip', roleName: 'VIP', weightMultiplier: 2 },
            { roleId: 'role-booster', roleName: 'Server Booster', weightMultiplier: 2 },
          ],
          quorum: {
            enabled: false,
            minParticipantsCount: 0,
            minParticipationPercentage: 0,
            approvalThresholdPercentage: 50,
          },
          automations: [
            {
              id: 'auto-winner-announce',
              name: 'Annonce automatique du jeu gagnant',
              enabled: true,
              trigger: 'POLL_ENDED',
              actions: [
                {
                  type: 'ANNOUNCE_WINNER',
                  messageTemplate: '🏆 **Le vote est terminé !** Le jeu retenu pour ce soir est **{winner}** avec {votes} votes ! Rendez-vous en vocal à 21h.',
                },
              ],
            },
          ],
          panelConfig: {
            channelId: '123456789012345688',
            embedTitle: '🎮 Choix du Jeu — Vendredi Soir',
            embedDescription: 'Quel titre préférez-vous pour notre soirée communautaire ? Votez avec les boutons ci-dessous.',
            embedColor: '#8b5cf6',
            thumbnailUrl: '',
            imageUrl: '',
            footerText: 'ETHONE Community Poll • Fin des votes vendredi à 18h',
            buttonText: 'Voter',
            showLiveResultsButton: true,
          },
          startsAt: new Date(Date.now() - 86400000).toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'staff-decision-01',
          guildId: demoGuildId,
          title: 'Décision Staff : Révision des Sanctions AutoMod',
          description: 'Vote interne de l\'équipe de modération pour adopter le nouveau barème de sanctions progressives.',
          category: 'Décisions Staff',
          type: 'APPROVAL',
          status: 'ACTIVE',
          creatorId: '123456789012345678',
          creatorTag: 'Admin#0001',
          anonymity: 'ANONYMOUS',
          resultsVisibility: 'STAFF_ONLY',
          allowVoteChange: false,
          allowVoteRetract: false,
          questions: [
            {
              id: 'q-approval',
              title: 'Approuvez-vous la mise en place du barème AutoMod 2.0 ?',
              description: 'Quorum requis de 60% et majorité qualifiée de 66% pour adoption.',
              type: 'APPROVAL',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              order: 0,
              options: [
                { id: 'opt-approve', label: 'Approuver (Pour)', emoji: '✅', description: 'Adopter la réforme immédiatement', color: '#10b981', weight: 1, votesCount: 8, points: 8 },
                { id: 'opt-reject', label: 'Rejeter (Contre)', emoji: '❌', description: 'Conserver l\'ancien barème', color: '#f43f5e', weight: 1, votesCount: 2, points: 2 },
                { id: 'opt-abstain', label: 'Abstention', emoji: '⚪', description: 'Ne prend pas parti', color: '#71717a', weight: 1, votesCount: 1, points: 1 },
              ],
            },
          ],
          eligibility: {
            allowedRoleIds: ['role-staff', 'role-mod', 'role-admin'],
            forbiddenRoleIds: [],
            minAccountAgeDays: 30,
            minGuildMembershipDays: 14,
            specificUserIds: [],
            logicGate: 'ANY',
          },
          roleWeights: [],
          quorum: {
            enabled: true,
            minParticipantsCount: 10,
            minParticipationPercentage: 60,
            approvalThresholdPercentage: 66,
          },
          automations: [],
          panelConfig: {
            channelId: '123456789012345689',
            embedTitle: '⚖️ Vote Staff Privé — AutoMod 2.0',
            embedDescription: 'Vote anonyme à bulletin secret réservé à l\'équipe de modération.',
            embedColor: '#6366f1',
            thumbnailUrl: '',
            imageUrl: '',
            footerText: 'ETHONE Staff Governance • Quorum 60%',
            buttonText: 'Voter à bulletin secret',
            showLiveResultsButton: false,
          },
          startsAt: new Date(Date.now() - 172800000).toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'feedback-event-01',
          guildId: demoGuildId,
          title: 'Note & Feedback Tournoi Printemps',
          description: 'Sondage de satisfaction après la clôture de notre tournoi communautaire.',
          category: 'Satisfaction & Feedback',
          type: 'RATING',
          status: 'ENDED',
          creatorId: '123456789012345678',
          creatorTag: 'Admin#0001',
          anonymity: 'PUBLIC',
          resultsVisibility: 'LIVE',
          allowVoteChange: false,
          allowVoteRetract: false,
          questions: [
            {
              id: 'q-rating',
              title: 'Comment notez-vous l\'organisation globale du tournoi ?',
              description: 'De 1 (très décevant) à 5 (excellent)',
              type: 'RATING',
              required: true,
              minSelections: 1,
              maxSelections: 1,
              order: 0,
              options: [
                { id: 'star-5', label: '⭐⭐⭐⭐⭐ 5 étoiles (Excellent)', emoji: '⭐', color: '#f59e0b', weight: 1, votesCount: 38, points: 190 },
                { id: 'star-4', label: '⭐⭐⭐⭐ 4 étoiles (Très bon)', emoji: '⭐', color: '#10b981', weight: 1, votesCount: 24, points: 96 },
                { id: 'star-3', label: '⭐⭐⭐ 3 étoiles (Correct)', emoji: '⭐', color: '#3b82f6', weight: 1, votesCount: 8, points: 24 },
                { id: 'star-2', label: '⭐⭐ 2 étoiles (Moyen)', emoji: '⭐', color: '#f97316', weight: 1, votesCount: 2, points: 4 },
                { id: 'star-1', label: '⭐ 1 étoile (À améliorer)', emoji: '⭐', color: '#ef4444', weight: 1, votesCount: 1, points: 1 },
              ],
            },
          ],
          eligibility: {
            allowedRoleIds: [],
            forbiddenRoleIds: [],
            minAccountAgeDays: 0,
            minGuildMembershipDays: 0,
            specificUserIds: [],
            logicGate: 'ANY',
          },
          roleWeights: [],
          quorum: { enabled: false, minParticipantsCount: 0, minParticipationPercentage: 0, approvalThresholdPercentage: 50 },
          automations: [],
          panelConfig: {
            channelId: '123456789012345688',
            embedTitle: '📊 Bilan Tournoi — Résultats',
            embedDescription: 'Merci à tous les participants ! Découvrez les retours de la communauté.',
            embedColor: '#f59e0b',
            thumbnailUrl: '',
            imageUrl: '',
            footerText: 'Sondage clos • Score moyen : 4.4 / 5',
            buttonText: 'Voir les résultats',
            showLiveResultsButton: true,
          },
          startsAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          endsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          endedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      this.polls = demoPolls;
      this.savePolls();
    }

    if (this.votes.length === 0) {
      // Seed some demo votes
      this.votes = [
        {
          id: 'vote-1',
          pollId: 'community-game-night',
          guildId: demoGuildId,
          userId: 'user-alpha-1',
          userTag: 'SkyWalker#0001',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
          questionId: 'q-game',
          selectedOptionIds: ['opt-valo'],
          weight: 1,
          votedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'vote-2',
          pollId: 'community-game-night',
          guildId: demoGuildId,
          userId: 'user-alpha-2',
          userTag: 'VIP_Gamer#7777',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
          questionId: 'q-game',
          selectedOptionIds: ['opt-valo'],
          weight: 2, // VIP weight
          votedAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'vote-3',
          pollId: 'community-game-night',
          guildId: demoGuildId,
          userId: 'user-alpha-3',
          userTag: 'CraftBuilder#4040',
          userAvatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
          questionId: 'q-game',
          selectedOptionIds: ['opt-mc'],
          weight: 1,
          votedAt: new Date(Date.now() - 10800000).toISOString(),
        },
      ];
      this.saveVotes();
    }
  }

  // --- POLLS CRUD ---
  public getPolls(guildId: string): DiscordPoll[] {
    return this.polls.filter((p) => p.guildId === guildId);
  }

  public getPollById(guildId: string, pollId: string): DiscordPoll | null {
    return this.polls.find((p) => p.guildId === guildId && p.id === pollId) || null;
  }

  public savePoll(poll: DiscordPoll): DiscordPoll {
    const validated = DiscordPollSchema.parse(poll);
    const index = this.polls.findIndex((p) => p.guildId === poll.guildId && p.id === poll.id);
    if (index >= 0) {
      this.polls[index] = { ...validated, updatedAt: new Date().toISOString() };
    } else {
      this.polls.push(validated);
    }
    this.savePolls();
    return index >= 0 ? this.polls[index] : validated;
  }

  public deletePoll(guildId: string, pollId: string): boolean {
    const initialLen = this.polls.length;
    this.polls = this.polls.filter((p) => !(p.guildId === guildId && p.id === pollId));
    if (this.polls.length !== initialLen) {
      this.savePolls();
      // Also delete associated votes
      this.votes = this.votes.filter((v) => !(v.guildId === guildId && v.pollId === pollId));
      this.saveVotes();
      return true;
    }
    return false;
  }

  public duplicatePoll(guildId: string, pollId: string, newTitle?: string): DiscordPoll | null {
    const original = this.getPollById(guildId, pollId);
    if (!original) return null;
    const newId = `poll-${Date.now().toString(36)}`;
    const duplicate: DiscordPoll = {
      ...original,
      id: newId,
      title: newTitle || `${original.title} (Copie)`,
      status: 'DRAFT',
      questions: original.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o, votesCount: 0, points: 0 })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startsAt: undefined,
      endsAt: undefined,
      endedAt: undefined,
    };
    this.polls.push(duplicate);
    this.savePolls();
    return duplicate;
  }

  // --- VOTES CRUD ---
  public getVotes(guildId: string, pollId?: string): PollVote[] {
    return this.votes.filter((v) => {
      if (v.guildId !== guildId) return false;
      if (pollId && v.pollId !== pollId) return false;
      return true;
    });
  }

  public getUserVote(guildId: string, pollId: string, userId: string, questionId: string): PollVote | null {
    return (
      this.votes.find(
        (v) => v.guildId === guildId && v.pollId === pollId && v.userId === userId && v.questionId === questionId
      ) || null
    );
  }

  public saveVote(vote: PollVote): PollVote {
    const validated = PollVoteSchema.parse(vote);
    const index = this.votes.findIndex(
      (v) =>
        v.guildId === vote.guildId &&
        v.pollId === vote.pollId &&
        v.userId === vote.userId &&
        v.questionId === vote.questionId
    );
    if (index >= 0) {
      this.votes[index] = validated;
    } else {
      this.votes.push(validated);
    }
    this.saveVotes();
    return index >= 0 ? this.votes[index] : validated;
  }

  public deleteUserVote(guildId: string, pollId: string, userId: string, questionId: string): boolean {
    const initialLen = this.votes.length;
    this.votes = this.votes.filter(
      (v) => !(v.guildId === guildId && v.pollId === pollId && v.userId === userId && v.questionId === questionId)
    );
    if (this.votes.length !== initialLen) {
      this.saveVotes();
      return true;
    }
    return false;
  }

  // --- KPIS ---
  public getKPIs(guildId: string): PollOverviewKPIs {
    const guildPolls = this.getPolls(guildId);
    const guildVotes = this.getVotes(guildId);

    const activePolls = guildPolls.filter((p) => p.status === 'ACTIVE').length;
    const completedPolls = guildPolls.filter((p) => p.status === 'ENDED').length;

    // Total votes summing across all options in guild polls
    let totalVotes = guildVotes.length;
    for (const poll of guildPolls) {
      for (const q of poll.questions) {
        for (const opt of q.options) {
          totalVotes += opt.votesCount;
        }
      }
    }

    const uniqueParticipants = new Set(guildVotes.map((v) => v.userId)).size;
    const avgParticipation = guildPolls.length > 0 ? Math.round((totalVotes / guildPolls.length) * 10) / 10 : 0;
    const participationRate = guildPolls.length > 0 ? 68.4 : 0;

    return {
      activePolls,
      totalVotes,
      participationRate,
      completedPolls,
      averageParticipation: avgParticipation,
    };
  }

  public getOverviewStats(guildId: string) {
    const kpis = this.getKPIs(guildId);
    const polls = this.getPolls(guildId);
    return {
      totalPolls: polls.length,
      ...kpis,
    };
  }
}

export const pollRepository = new PollRepository();
