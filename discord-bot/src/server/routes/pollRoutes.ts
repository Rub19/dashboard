import { Router, Request, Response } from 'express';
import { Client, ChannelType } from 'discord.js';
import { pollRepository } from '../../modules/polls/storage/pollRepository.js';
import { pollService } from '../../modules/polls/services/pollService.js';
import { pollVotingService } from '../../modules/polls/services/pollVotingService.js';
import { pollResultService } from '../../modules/polls/services/pollResultService.js';
import { discordPollPanel } from '../../modules/polls/ui/discordPollPanel.js';
import { DiscordPoll } from '../../modules/polls/types/index.js';
import { requireStringParam } from '../utils/params.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';

export function createPollRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  discordPollPanel.initialize(client);

  // GET /api/guilds/:guildId/polls/channels — Salons texte pour le dashboard
  router.get('/channels', (req: Request, res: Response): void => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.json({ success: true, channels: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, channels });
  });

  // GET /api/guilds/:guildId/polls/overview
  router.get('/overview', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const stats = pollRepository.getOverviewStats(guildId);
    const polls = pollRepository.getPolls(guildId);
    const recentVotes = pollRepository.getVotes(guildId).slice(0, 8);

    res.json({
      success: true,
      stats,
      polls,
      recentVotes,
    });
  });

  // GET /api/guilds/:guildId/polls
  router.get('/', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const { status, type, search } = req.query;

    let polls = pollRepository.getPolls(guildId);
    if (status && status !== 'ALL') {
      polls = polls.filter((p) => p.status === status);
    }
    if (type && type !== 'ALL') {
      polls = polls.filter((p) => p.type === type);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      polls = polls.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, polls });
  });

  // POST /api/guilds/:guildId/polls
  router.post('/', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const body = req.body || {};
    const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

    const newPoll: DiscordPoll = {
      id: body.id || `poll-${Date.now().toString(36)}`,
      guildId,
      title: body.title || 'Nouveau Sondage',
      description: body.description || '',
      category: body.category || 'Communauté',
      type: body.type || 'SINGLE_CHOICE',
      status: 'DRAFT',
      creatorId: body.creatorId || user.id,
      creatorTag: body.creatorTag || user.username,
      resultsVisibility: body.resultsVisibility || 'LIVE',
      anonymity: body.anonymity || 'PUBLIC',
      allowVoteChange: body.allowVoteModification ?? true,
      allowVoteRetract: body.allowVoteRetract ?? false,
      questions: body.questions || [
        {
          id: 'q1',
          title: 'Quelle est votre option préférée ?',
          description: '',
          type: body.type || 'SINGLE_CHOICE',
          required: true,
          minSelections: 1,
          maxSelections: 1,
          order: 0,
          options: [
            { id: 'opt-1', label: 'Option A', description: '', emoji: '🟢', imageUrl: '', color: '#10b981', weight: 1, votesCount: 0, points: 0 },
            { id: 'opt-2', label: 'Option B', description: '', emoji: '🔵', imageUrl: '', color: '#3b82f6', weight: 1, votesCount: 0, points: 0 },
          ],
        },
      ],
      eligibility: body.eligibility || {
        allowedRoleIds: [],
        forbiddenRoleIds: [],
        minAccountAgeDays: 0,
        minGuildMembershipDays: 0,
        specificUserIds: [],
        logicGate: 'ANY',
      },
      roleWeights: body.roleWeights || [],
      quorum: body.quorum || {
        enabled: false,
        minParticipantsCount: 0,
        minParticipationPercentage: 0,
        approvalThresholdPercentage: 50,
      },
      panelConfig: body.panelConfig || {
        channelId: '',
        embedTitle: `📊 ${body.title || 'Sondage Officiel'}`,
        embedDescription: 'Participez au vote ci-dessous en cliquant sur les options proposées.',
        embedColor: '#6366f1',
        thumbnailUrl: '',
        imageUrl: '',
        footerText: 'ETHONE Polls & Decisions 2.0',
        buttonText: 'Voter',
        showLiveResultsButton: true,
      },
      automations: body.automations || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = pollRepository.savePoll(newPoll);
      emitConfigUpdated('polls', guildId, saved, 'DASHBOARD', req.user?.id);
      res.json({ success: true, poll: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/polls/:pollId
  router.get('/:pollId', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const poll = pollRepository.getPollById(guildId, pollId);

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    res.json({ success: true, poll });
  });

  // PUT /api/guilds/:guildId/polls/:pollId
  router.put('/:pollId', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const existing = pollRepository.getPollById(guildId, pollId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    const updated: DiscordPoll = {
      ...existing,
      ...req.body,
      id: existing.id,
      guildId: existing.guildId,
      updatedAt: new Date().toISOString(),
    };

    const saved = pollRepository.savePoll(updated);
    emitConfigUpdated('polls', guildId, saved, 'DASHBOARD', req.user?.id);
    res.json({ success: true, poll: saved });
  });

  // DELETE /api/guilds/:guildId/polls/:pollId
  router.delete('/:pollId', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const deleted = pollRepository.deletePoll(guildId, pollId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    res.json({ success: true, message: 'Sondage supprimé.' });
  });

  // POST /api/guilds/:guildId/polls/:pollId/reset-votes : remet le scrutin à zéro (le sondage est conservé)
  router.post('/:pollId/reset-votes', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const poll = pollRepository.getPollById(guildId, pollId);

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    const removed = pollRepository.clearPollVotes(guildId, pollId);
    emitConfigUpdated('polls', guildId, poll, 'DASHBOARD', req.user?.id);
    res.json({ success: true, removed });
  });

  // POST /api/guilds/:guildId/polls/:pollId/publish
  router.post('/:pollId/publish', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const result = pollService.publishPoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/pause
  router.post('/:pollId/pause', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const result = pollService.pausePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/resume
  router.post('/:pollId/resume', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const result = pollService.resumePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/end
  router.post('/:pollId/end', async (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const result = await pollService.endPoll(guildId, pollId, client);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/extend
  router.post('/:pollId/extend', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const { additionalHours } = req.body;
    const result = pollService.extendPoll(guildId, pollId, Number(additionalHours || 24));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/duplicate
  router.post('/:pollId/duplicate', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const result = pollService.duplicatePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // GET /api/guilds/:guildId/polls/:pollId/results
  router.get('/:pollId/results', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const memberCount = client.guilds.cache.get(guildId)?.memberCount;
    const results = pollResultService.calculateResults(guildId, pollId, memberCount && memberCount > 0 ? memberCount : undefined);
    if (!results) {
      return res.status(404).json({ success: false, error: 'Résultats non disponibles.' });
    }
    res.json({ success: true, results });
  });

  // GET /api/guilds/:guildId/polls/:pollId/votes
  router.get('/:pollId/votes', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    let votes = pollRepository.getVotes(guildId, pollId);

    // Apply Anonymity Masking if required
    if (poll.anonymity === 'FULLY_ANONYMOUS') {
      votes = votes.map((v, i) => ({
        ...v,
        userId: `anon-${i + 1}`,
        userTag: `Participant #${i + 1}`,
        userAvatar: '',
      }));
    } else if (poll.anonymity === 'ANONYMOUS') {
      votes = votes.map((v) => ({
        ...v,
        userTag: 'Votant Anonyme',
        userAvatar: '',
      }));
    }

    res.json({ success: true, votes });
  });

  // POST /api/guilds/:guildId/polls/:pollId/vote (Web Submission)
  router.post('/:pollId/vote', async (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const { selections, satisfactionScore, rankingOrder } = req.body;
    // Identité tirée de la session : un identifiant envoyé dans le corps est ignoré (sinon on pourrait voter au nom d'un autre).
    const sessionUser = (req as any).user as { id?: string; username?: string; avatar?: string } | undefined;
    const userId = sessionUser?.id;
    const userTag = sessionUser?.username;
    const userAvatar = sessionUser?.avatar;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Utilisateur non identifié.' });
    }

    // Rôles, ancienneté du compte et du membre : lus sur Discord, jamais dans le corps de la requête (sinon on pourrait
    // s'attribuer un rôle à poids de vote élevé, ou contourner une restriction par rôle / ancienneté).
    const guildForVote = client.guilds.cache.get(guildId);
    const voterMember = guildForVote ? await guildForVote.members.fetch(userId).catch(() => null) : null;
    if (!voterMember) {
      return res.status(403).json({ success: false, error: 'Vous devez être membre de ce serveur pour voter.' });
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const voterRoleIds = [...voterMember.roles.cache.keys()];
    const voterAccountAgeDays = Math.floor((Date.now() - voterMember.user.createdTimestamp) / dayMs);
    const voterMemberDays = voterMember.joinedTimestamp ? Math.floor((Date.now() - voterMember.joinedTimestamp) / dayMs) : 0;

    const voteResult = pollVotingService.castVote(
      guildId,
      pollId,
      userId,
      userTag || 'Web Voter',
      userAvatar,
      voterRoleIds,
      voterAccountAgeDays,
      voterMemberDays,
      selections || {},
      satisfactionScore,
      rankingOrder
    );

    if (!voteResult.success) {
      return res.status(400).json(voteResult);
    }

    res.json(voteResult);
  });

  // GET /api/guilds/:guildId/polls/:pollId/export/csv
  router.get('/:pollId/export/csv', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const csv = pollService.exportVotesToCsv(guildId, pollId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=poll-${pollId}-votes.csv`);
    res.send(csv);
  });

  // GET /api/guilds/:guildId/polls/:pollId/export/json
  router.get('/:pollId/export/json', (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const json = pollService.exportVotesToJson(guildId, pollId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=poll-${pollId}-votes.json`);
    res.send(json);
  });

  // POST /api/guilds/:guildId/polls/:pollId/panel/deploy
  router.post('/:pollId/panel/deploy', async (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const pollId = requireStringParam(req.params.pollId, 'pollId');
    const { channelId } = req.body;

    const poll = pollRepository.getPollById(guildId, pollId);
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    const targetChannelId = channelId || poll.panelConfig.channelId;
    if (!targetChannelId) {
      return res.status(400).json({ success: false, error: 'Aucun salon spécifié pour déployer le panneau.' });
    }

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        return res.status(400).json({ success: false, error: 'Salon Discord textuel invalide ou inaccessible.' });
      }

      const embed = discordPollPanel.buildPanelEmbed(poll);
      const rows = discordPollPanel.buildPanelActionRows(poll);

      const msg = await (channel as any).send({ embeds: [embed], components: rows });

      // Update poll panel config messageId
      poll.panelConfig.channelId = targetChannelId;
      poll.panelConfig.messageId = msg.id;
      pollRepository.savePoll(poll);

      res.json({
        success: true,
        message: 'Panneau de sondage déployé avec succès sur Discord.',
        messageId: msg.id,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
