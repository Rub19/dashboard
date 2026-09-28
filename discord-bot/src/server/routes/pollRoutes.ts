import { Router, Request, Response } from 'express';
import { Client, ChannelType } from 'discord.js';
import { pollRepository } from '../../modules/polls/storage/pollRepository.js';
import { pollService } from '../../modules/polls/services/pollService.js';
import { pollVotingService } from '../../modules/polls/services/pollVotingService.js';
import { pollResultService } from '../../modules/polls/services/pollResultService.js';
import { discordPollPanel } from '../../modules/polls/ui/discordPollPanel.js';
import { DiscordPoll, DiscordPollSchema } from '../../modules/polls/types/index.js';
import { requireStringParam } from '../utils/params.js';
import { emitConfigUpdated } from '../../services/syncConfigEmitter.js';
import { handleRouteError } from '../utils/routeError.js';
import { nativePollService, nativeIncompatibilityError, NATIVE_POLL_LOCKED_ERROR } from '../../modules/polls/services/nativePollService.js';
import { DESTINATION_CHANNEL_TYPES, isSendableTarget, sendToConfiguredChannel } from '../../utils/channelSend.js';

export function createPollRouter(client: Client): Router {
  const router = Router({ mergeParams: true });
  discordPollPanel.initialize(client);
  nativePollService.start(client); // suivi (décompte + fin) des sondages natifs Discord

  // GET /api/guilds/:guildId/polls/channels — Salons texte pour le dashboard
  router.get('/channels', (req: Request, res: Response): void => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      res.json({ success: true, channels: [] });
      return;
    }
    const channels = guild.channels.cache
      .filter((c) => DESTINATION_CHANNEL_TYPES.includes(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))
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
  router.post('/', async (req: Request, res: Response) => {
    const guildId = requireStringParam(req.params.guildId, 'guildId');
    const body = req.body || {};
    const user = (req as any).user || { id: 'admin', username: 'DashboardAdmin' };

    // Sondage natif Discord : publié tout de suite via le champ `poll` du message (pas de brouillon).
    if (body.native === true) {
      const q = Array.isArray(body.questions) ? body.questions : [];
      const opts: any[] = Array.isArray(q[0]?.options) ? q[0].options : [];
      const answers = opts.map((o) => ({ text: String(o?.label ?? ''), emoji: o?.emoji }));
      const el = body.eligibility || {};
      const incompatible = nativeIncompatibilityError({
        quorum: !!body.quorum?.enabled,
        secret: !!body.anonymity && body.anonymity !== 'PUBLIC',
        weights: (Array.isArray(body.roleWeights) && body.roleWeights.length > 0) || body.type === 'WEIGHTED_VOTE' || opts.some((o) => o?.weight !== undefined && Number(o.weight) !== 1),
        eligibility: Number(el.minAccountAgeDays) > 0 || Number(el.minGuildMembershipDays) > 0 || ['allowedRoleIds', 'forbiddenRoleIds', 'specificUserIds'].some((k) => Array.isArray(el[k]) && el[k].length > 0),
        automations: Array.isArray(body.automations) && body.automations.length > 0,
        resultsVisibility: !!body.resultsVisibility && body.resultsVisibility !== 'LIVE',
        multipleQuestions: q.length > 1,
        type: body.type,
      });
      if (incompatible) {
        res.status(400).json({ success: false, error: incompatible });
        return;
      }
      const hours = body.durationHours ?? (body.endsAt ? Math.ceil((new Date(body.endsAt).getTime() - Date.now()) / 3600_000) : 24);
      try {
        const created = await nativePollService.create(client, {
          guildId,
          channelId: String(body.channelId || body.panelConfig?.channelId || ''),
          question: String(q[0]?.title ?? body.title ?? ''),
          answers,
          durationHours: Number(hours),
          multiselect: body.allowMultiselect === true || body.type === 'MULTIPLE_CHOICE',
          creatorId: body.creatorId || user.id,
          creatorTag: body.creatorTag || user.username,
        });
        if (!created.success) {
          res.status(400).json({ success: false, error: created.error });
          return;
        }
        emitConfigUpdated('polls', guildId, created.poll, 'DASHBOARD', req.user?.id);
        res.json({ success: true, poll: created.poll });
      } catch (err: any) {
        handleRouteError(err, res, 'Erreur serveur', { success: false });
      }
      return;
    }

    const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const type = body.type || 'SINGLE_CHOICE';
    const rawQuestions: any[] = Array.isArray(body.questions) && body.questions.length > 0
      ? body.questions
      : [
          {
            title: 'Quelle est votre option préférée ?',
            options: [
              { label: 'Option A', emoji: '🟢', color: '#10b981' },
              { label: 'Option B', emoji: '🔵', color: '#3b82f6' },
            ],
          },
        ];
    const questions = rawQuestions.map((q: any, i: number) => ({
      ...q,
      id: q?.id || uid('q'),
      order: q?.order ?? i,
      type: q?.type ?? type,
      options: (Array.isArray(q?.options) ? q.options : []).map((o: any) => ({ ...o, id: o?.id || uid('opt') })),
    }));

    const candidate = {
      id: body.id || uid('poll'),
      guildId,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Nouveau Sondage',
      description: body.description || '',
      category: body.category || 'Communauté',
      type,
      status: 'DRAFT',
      creatorId: body.creatorId || user.id,
      creatorTag: body.creatorTag || user.username,
      resultsVisibility: body.resultsVisibility || 'LIVE',
      anonymity: body.anonymity || 'PUBLIC',
      allowVoteChange: body.allowVoteChange ?? body.allowVoteModification ?? true,
      allowVoteRetract: body.allowVoteRetract ?? false,
      questions,
      eligibility: body.eligibility || {},
      roleWeights: body.roleWeights || [],
      quorum: body.quorum || {},
      panelConfig: {
        embedTitle: `📊 ${typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Sondage Officiel'}`,
        embedColor: '#6366f1',
        ...(body.panelConfig || {}),
      },
      automations: body.automations || [],
      endsAt: body.endsAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = DiscordPollSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      res.status(400).json({ success: false, error: `Sondage invalide (${issue.path.join('.') || 'corps'}) : ${issue.message}` });
      return;
    }
    const newPoll: DiscordPoll = parsed.data;
    if (newPoll.questions.some((q) => q.options.length < 2)) {
      res.status(400).json({ success: false, error: 'Chaque question doit avoir au moins 2 options.' });
      return;
    }

    try {
      const saved = pollRepository.savePoll(newPoll);
      emitConfigUpdated('polls', guildId, saved, 'DASHBOARD', req.user?.id);
      res.json({ success: true, poll: saved });
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur serveur', { success: false });
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

    const parsed = DiscordPollSchema.safeParse({
      ...existing,
      ...req.body,
      id: existing.id,
      guildId: existing.guildId,
      creatorId: existing.creatorId,
      creatorTag: existing.creatorTag,
      native: existing.native,
      messageId: existing.messageId,
      channelId: existing.channelId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ success: false, error: `Modification invalide (${issue.path.join('.') || 'corps'}) : ${issue.message}` });
    }

    const saved = pollRepository.savePoll(parsed.data);
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
    emitConfigUpdated('polls', guildId, result.poll, 'DASHBOARD', req.user?.id);
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
    emitConfigUpdated('polls', guildId, result.poll, 'DASHBOARD', req.user?.id);
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
    emitConfigUpdated('polls', guildId, result.poll, 'DASHBOARD', req.user?.id);
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
    if (poll.native) {
      return res.status(400).json({ success: false, error: NATIVE_POLL_LOCKED_ERROR });
    }

    const targetChannelId = channelId || poll.panelConfig.channelId;
    if (!targetChannelId) {
      return res.status(400).json({ success: false, error: 'Aucun salon spécifié pour déployer le panneau.' });
    }

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || !isSendableTarget(channel)) {
        return res.status(400).json({ success: false, error: 'Salon Discord invalide ou inaccessible.' });
      }

      const embed = discordPollPanel.buildPanelEmbed(poll);
      const rows = discordPollPanel.buildPanelActionRows(poll);

      const msg = await sendToConfiguredChannel(
        channel,
        { embeds: [embed], components: rows },
        { postTitle: poll.title }
      );

      // Update poll panel config messageId (forum/média : le message vit dans le post créé)
      poll.panelConfig.channelId = msg.channelId || targetChannelId;
      poll.panelConfig.messageId = msg.id;
      pollRepository.savePoll(poll);

      res.json({
        success: true,
        message: 'Panneau de sondage déployé avec succès sur Discord.',
        messageId: msg.id,
      });
    } catch (err: any) {
      handleRouteError(err, res, 'Erreur serveur', { success: false });
    }
  });

  return router;
}
