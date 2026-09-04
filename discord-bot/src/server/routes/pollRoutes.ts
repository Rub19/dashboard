import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { pollRepository } from '../../modules/polls/storage/pollRepository.js';
import { pollService } from '../../modules/polls/services/pollService.js';
import { pollVotingService } from '../../modules/polls/services/pollVotingService.js';
import { pollResultService } from '../../modules/polls/services/pollResultService.js';
import { discordPollPanel } from '../../modules/polls/ui/discordPollPanel.js';
import { DiscordPoll } from '../../modules/polls/types/index.js';

export function createPollRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  discordPollPanel.initialize(client);

  // GET /api/guilds/:guildId/polls/overview
  router.get('/overview', (req: Request, res: Response) => {
    const { guildId } = req.params;
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
    const { guildId } = req.params;
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
    const { guildId } = req.params;
    const body = req.body || {};

    const newPoll: DiscordPoll = {
      id: body.id || `poll-${Date.now().toString(36)}`,
      guildId,
      title: body.title || 'Nouveau Sondage',
      description: body.description || '',
      type: body.type || 'SINGLE_CHOICE',
      status: 'DRAFT',
      visibility: body.visibility || 'ALWAYS_VISIBLE',
      anonymity: body.anonymity || 'PUBLIC',
      allowVoteModification: body.allowVoteModification ?? true,
      questions: body.questions || [
        {
          id: 'q1',
          title: 'Quelle est votre option préférée ?',
          required: true,
          minChoices: 1,
          maxChoices: 1,
          options: [
            { id: 'opt-1', text: 'Option A', emoji: '🟢', pointsWeight: 1, color: '#10b981' },
            { id: 'opt-2', text: 'Option B', emoji: '🔵', pointsWeight: 1, color: '#3b82f6' },
          ],
        },
      ],
      eligibility: body.eligibility || {
        roleCondition: 'ANY',
        requiredRoleIds: [],
        forbiddenRoleIds: [],
        minAccountAgeDays: 0,
        minGuildMembershipDays: 0,
        whitelistUserIds: [],
        roleWeights: [],
      },
      quorum: body.quorum || {
        enabled: false,
        minVoters: 0,
        percentageMajorityNeeded: 50,
      },
      panelConfig: body.panelConfig || {
        channelId: '',
        embedTitle: `📊 ${body.title || 'Sondage Officiel'}`,
        embedDescription: 'Participez au vote ci-dessous en cliquant sur les options proposées.',
        embedColor: '#6366f1',
        showLiveResults: true,
        buttonStyle: 'PRIMARY',
      },
      automations: body.automations || [],
      stats: {
        totalVotes: 0,
        uniqueVoters: 0,
        lastVoteAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = pollRepository.savePoll(newPoll);
      res.json({ success: true, poll: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/guilds/:guildId/polls/:pollId
  router.get('/:pollId', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const poll = pollRepository.getPollById(guildId, pollId);

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    res.json({ success: true, poll });
  });

  // PUT /api/guilds/:guildId/polls/:pollId
  router.put('/:pollId', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
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
    res.json({ success: true, poll: saved });
  });

  // DELETE /api/guilds/:guildId/polls/:pollId
  router.delete('/:pollId', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const deleted = pollRepository.deletePoll(guildId, pollId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Sondage introuvable.' });
    }

    res.json({ success: true, message: 'Sondage supprimé.' });
  });

  // POST /api/guilds/:guildId/polls/:pollId/publish
  router.post('/:pollId/publish', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const result = pollService.publishPoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/pause
  router.post('/:pollId/pause', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const result = pollService.pausePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/resume
  router.post('/:pollId/resume', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const result = pollService.resumePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/end
  router.post('/:pollId/end', async (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const result = await pollService.endPoll(guildId, pollId, client);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/extend
  router.post('/:pollId/extend', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const { additionalHours } = req.body;
    const result = pollService.extendPoll(guildId, pollId, Number(additionalHours || 24));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/guilds/:guildId/polls/:pollId/duplicate
  router.post('/:pollId/duplicate', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const result = pollService.duplicatePoll(guildId, pollId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // GET /api/guilds/:guildId/polls/:pollId/results
  router.get('/:pollId/results', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const results = pollResultService.calculateResults(guildId, pollId);
    if (!results) {
      return res.status(404).json({ success: false, error: 'Résultats non disponibles.' });
    }
    res.json({ success: true, results });
  });

  // GET /api/guilds/:guildId/polls/:pollId/votes
  router.get('/:pollId/votes', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
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
        userAvatar: undefined,
      }));
    } else if (poll.anonymity === 'ANONYMOUS') {
      votes = votes.map((v) => ({
        ...v,
        userTag: 'Votant Anonyme',
        userAvatar: undefined,
      }));
    }

    res.json({ success: true, votes });
  });

  // POST /api/guilds/:guildId/polls/:pollId/vote (Web Submission)
  router.post('/:pollId/vote', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const { userId, userTag, userAvatar, userRoles, selections, satisfactionScore, rankingOrder } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Utilisateur non identifié.' });
    }

    const voteResult = pollVotingService.castVote(
      guildId,
      pollId,
      userId,
      userTag || 'Web Voter',
      userAvatar,
      userRoles || [],
      0, // account age checked on Discord side or passed in body
      0,
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
    const { guildId, pollId } = req.params;
    const csv = pollService.exportVotesToCsv(guildId, pollId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=poll-${pollId}-votes.csv`);
    res.send(csv);
  });

  // GET /api/guilds/:guildId/polls/:pollId/export/json
  router.get('/:pollId/export/json', (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
    const json = pollService.exportVotesToJson(guildId, pollId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=poll-${pollId}-votes.json`);
    res.send(json);
  });

  // POST /api/guilds/:guildId/polls/:pollId/panel/deploy
  router.post('/:pollId/panel/deploy', async (req: Request, res: Response) => {
    const { guildId, pollId } = req.params;
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
