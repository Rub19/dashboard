import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  AutoModConfig,
  ChannelDetailItem,
  ChannelItem,
  GuildMemberItem,
  ModerationConfig,
  ModerationOverview,
  RoleItem,
  Sanction,
  SanctionType,
} from '../types';
import { ApplySanctionModal } from '../components/ApplySanctionModal';
import { Skeleton } from '../components/Skeleton';
import {
  AlertTriangle,
  Ban,
  Clock,
  Edit2,
  Filter,
  Hash,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  UserCheck,
  UserX,
  Users,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

interface ModerationPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ModerationPage: React.FC<ModerationPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'channels' | 'sanctions' | 'automod' | 'config'
  >('overview');
  const [loading, setLoading] = useState(true);

  // Données
  const [overview, setOverview] = useState<ModerationOverview | null>(null);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [members, setMembers] = useState<GuildMemberItem[]>([]);
  const [channelsDetail, setChannelsDetail] = useState<ChannelDetailItem[]>([]);
  const [modConfig, setModConfig] = useState<ModerationConfig | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  // Filtres
  const [sanctionFilterType, setSanctionFilterType] = useState<string>('all');
  const [searchUserId, setSearchUserId] = useState('');
  const [searchMemberText, setSearchMemberText] = useState('');

  // AutoMod
  const [autoModState, setAutoModState] = useState<AutoModConfig | null>(null);
  const [newWordInput, setNewWordInput] = useState('');

  // Config générale
  const [selectedLogChannel, setSelectedLogChannel] = useState<string>('');
  const [selectedModRole, setSelectedModRole] = useState<string>('');
  const [escalationThreshold, setEscalationThreshold] = useState<number>(3);
  const [escalationAction, setEscalationAction] = useState<'timeout' | 'kick' | 'ban'>('timeout');

  // Modal Sanction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledUserId, setPrefilledUserId] = useState<string>('');
  const [prefilledType, setPrefilledType] = useState<SanctionType>('warn');

  // Modal Nickname
  const [nicknameModalMember, setNicknameModalMember] = useState<GuildMemberItem | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');

  // Modal Clear Salons
  const [clearChannelModal, setClearChannelModal] = useState<ChannelDetailItem | null>(null);
  const [clearAmount, setClearAmount] = useState(20);

  const [savingConfig, setSavingConfig] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovData, sancData, cfgData, chanData, roleData, memData, chanDetData] =
        await Promise.all([
          api.getModerationOverview(guildId),
          api.getSanctions(guildId),
          api.getModerationConfig(guildId),
          api.getChannels(guildId),
          api.getRoles(guildId),
          api.getMembers(guildId).catch(() => ({ members: [] })),
          api.getChannelsDetail(guildId).catch(() => ({ channels: [] })),
        ]);

      setOverview(ovData);
      setSanctions(sancData.sanctions);
      setModConfig(cfgData.config);
      setAutoModState(cfgData.config.autoMod);
      setSelectedLogChannel(cfgData.config.modLogChannelId || '');
      setSelectedModRole(cfgData.config.modRoleId || '');
      setEscalationThreshold(cfgData.config.warningEscalation.threshold || 3);
      setEscalationAction(cfgData.config.warningEscalation.action || 'timeout');
      setChannels(chanData.channels);
      setRoles(roleData.roles);
      setMembers(memData.members);
      setChannelsDetail(chanDetData.channels);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // Appliquer une sanction
  const handleApplySanction = async (data: {
    userId: string;
    type: SanctionType;
    reason: string;
    durationSeconds?: number;
  }) => {
    try {
      const res = await api.createSanction(guildId, data);
      onShowToast(`Sanction #${res.sanction.id} appliquée avec succès.`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Échec de la sanction', 'error');
      throw err;
    }
  };

  // Révoquer une sanction
  const handleRevoke = async (sanctionId: string) => {
    try {
      await api.revokeSanction(guildId, sanctionId);
      onShowToast('Sanction révoquée avec succès.', 'success');
      setSanctions((prev) =>
        prev.map((s) => (s.id === sanctionId ? { ...s, active: false } : s))
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la révocation', 'error');
    }
  };

  // Modifier le surnom d'un membre
  const handleSaveNickname = async () => {
    if (!nicknameModalMember) return;
    try {
      await api.updateMemberNickname(
        guildId,
        nicknameModalMember.id,
        nicknameInput.trim() || null
      );
      onShowToast(`Surnom de ${nicknameModalMember.username} mis à jour.`, 'success');
      setNicknameModalMember(null);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === nicknameModalMember.id
            ? { ...m, nickname: nicknameInput.trim() || null }
            : m
        )
      );
    } catch (err: any) {
      onShowToast(err.message || 'Échec du renommage', 'error');
    }
  };

  // Modifier le slowmode d'un salon
  const handleSlowmodeChange = async (channelId: string, seconds: number) => {
    try {
      await api.updateChannelSlowmode(guildId, channelId, seconds);
      onShowToast(`Mode lent réglé à ${seconds}s.`, 'success');
      setChannelsDetail((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, slowmode: seconds } : c))
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de modification du slowmode', 'error');
    }
  };

  // Verrouiller / Déverrouiller un salon
  const handleToggleLock = async (channel: ChannelDetailItem) => {
    const willLock = !channel.isLocked;
    try {
      await api.updateChannelLock(guildId, channel.id, willLock);
      onShowToast(willLock ? `Salon #${channel.name} verrouillé.` : `Salon #${channel.name} déverrouillé.`, 'success');
      setChannelsDetail((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, isLocked: willLock } : c))
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de verrouillage', 'error');
    }
  };

  // Purger les messages d'un salon
  const handleClearMessages = async () => {
    if (!clearChannelModal) return;
    try {
      const res = await api.clearChannelMessages(guildId, clearChannelModal.id, clearAmount);
      onShowToast(`${res.deletedCount} message(s) supprimé(s) dans #${clearChannelModal.name}.`, 'success');
      setClearChannelModal(null);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la purge', 'error');
    }
  };

  // Sauvegarder AutoMod
  const handleSaveAutoMod = async () => {
    if (!autoModState) return;
    setSavingConfig(true);
    try {
      await api.updateModerationConfig(guildId, { autoMod: autoModState });
      onShowToast('AutoMod mis à jour avec succès.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de sauvegarde', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Sauvegarder Paramètres généraux
  const handleSaveGeneralConfig = async () => {
    setSavingConfig(true);
    try {
      await api.updateModerationConfig(guildId, {
        modLogChannelId: selectedLogChannel || null,
        modRoleId: selectedModRole || null,
        warningEscalation: {
          enabled: true,
          threshold: escalationThreshold,
          action: escalationAction,
          durationSeconds: 3600,
        },
      });
      onShowToast('Paramètres de modération enregistrés.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur de sauvegarde', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddWord = () => {
    const word = newWordInput.trim().toLowerCase();
    if (!word || !autoModState) return;
    if (autoModState.wordFilter.words.includes(word)) return;

    setAutoModState({
      ...autoModState,
      wordFilter: {
        ...autoModState.wordFilter,
        words: [...autoModState.wordFilter.words, word],
      },
    });
    setNewWordInput('');
  };

  const handleRemoveWord = (word: string) => {
    if (!autoModState) return;
    setAutoModState({
      ...autoModState,
      wordFilter: {
        ...autoModState.wordFilter,
        words: autoModState.wordFilter.words.filter((w) => w !== word),
      },
    });
  };

  const openSanctionForUser = (userId: string, type: SanctionType) => {
    setPrefilledUserId(userId);
    setPrefilledType(type);
    setIsModalOpen(true);
  };

  if (loading || !overview || !autoModState) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Filtres
  const filteredSanctions = sanctions.filter((s) => {
    const matchesType = sanctionFilterType === 'all' || s.type === sanctionFilterType;
    const matchesSearch =
      !searchUserId ||
      s.userId.includes(searchUserId) ||
      s.userTag.toLowerCase().includes(searchUserId.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredMembers = members.filter((m) => {
    const query = searchMemberText.toLowerCase();
    return (
      m.userTag.toLowerCase().includes(query) ||
      (m.nickname && m.nickname.toLowerCase().includes(query)) ||
      m.id.includes(query)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Modération</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Modération & Protection
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestion complète des membres, salons, sanctions et règles AutoMod en temps réel.
          </p>
        </div>

        <button
          onClick={() => {
            setPrefilledUserId('');
            setPrefilledType('warn');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Sanction</span>
        </button>
      </div>

      {/* Barre d'onglets complète */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Gestion Membres</span>
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'channels'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Gestion Salons</span>
        </button>
        <button
          onClick={() => setActiveTab('sanctions')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'sanctions'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sanctions & Historique
        </button>
        <button
          onClick={() => setActiveTab('automod')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'automod'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          AutoMod
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'config'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Paramètres & Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : VUE D'ENSEMBLE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Avertissements</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{overview.counts.warnings}</div>
              <div className="text-[10px] text-slate-400 mt-1">Total enregistrés</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Sourdines</span>
                <VolumeX className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{overview.counts.timeouts}</div>
              <div className="text-[10px] text-slate-400 mt-1">Timeouts appliqués</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Expulsions</span>
                <UserX className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{overview.counts.kicks}</div>
              <div className="text-[10px] text-slate-400 mt-1">Kicks effectués</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Bannissements</span>
                <Ban className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">{overview.counts.bans}</div>
              <div className="text-[10px] text-slate-400 mt-1">Bans définitifs</div>
            </div>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Dernières Sanctions Appliquées
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Total : {overview.counts.total}</span>
            </div>

            {overview.recentSanctions.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Aucune sanction enregistrée sur ce serveur.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] text-xs">
                {overview.recentSanctions.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                        #{s.id}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          s.type === 'ban'
                            ? 'bg-rose-500/15 text-rose-400'
                            : s.type === 'kick'
                            ? 'bg-orange-500/15 text-orange-400'
                            : s.type === 'timeout'
                            ? 'bg-indigo-500/15 text-indigo-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {s.type}
                      </span>
                      <span className="font-medium text-white truncate">{s.userTag}</span>
                      <span className="text-slate-400 truncate max-w-xs">{s.reason}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(s.timestamp).toLocaleDateString()}
                      </span>
                      {s.active ? (
                        <button
                          onClick={() => handleRevoke(s.id)}
                          className="text-[11px] text-slate-400 hover:text-rose-400 font-medium transition-colors"
                        >
                          Révoquer
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Révoqué</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : GESTION DES MEMBRES (USER MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#101217] border border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchMemberText}
                onChange={(e) => setSearchMemberText(e.target.value)}
                placeholder="Rechercher un membre par pseudo, surnom ou ID..."
                className="bg-transparent border-0 text-xs text-white placeholder:text-slate-400 focus:outline-none w-full"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredMembers.length} membre(s) listé(s)
            </span>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Membre</th>
                    <th className="px-4 py-3">Statut & Rôles</th>
                    <th className="px-4 py-3 text-right">Actions Rapides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full border border-white/10"
                          />
                          <div>
                            <div className="font-medium text-white flex items-center gap-1.5">
                              <span>{m.nickname || m.username}</span>
                              {m.nickname && (
                                <span className="text-[10px] text-slate-400">({m.userTag})</span>
                              )}
                              {m.isOwner && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded font-mono font-semibold">
                                  OWNER
                                </span>
                              )}
                              {m.isBot && (
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded font-mono font-semibold">
                                  BOT
                                </span>
                              )}
                              {m.isTimedOut && (
                                <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded font-mono font-semibold">
                                  MUTED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {m.roles.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">Aucun rôle</span>
                          ) : (
                            m.roles.map((r) => (
                              <span
                                key={r.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                                style={{ color: r.color !== '#000000' ? r.color : '#e2e8f0' }}
                              >
                                {r.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modifier Pseudo */}
                          <button
                            onClick={() => {
                              setNicknameModalMember(m);
                              setNicknameInput(m.nickname || '');
                            }}
                            title="Modifier le pseudo"
                            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Avertir */}
                          <button
                            onClick={() => openSanctionForUser(m.id, 'warn')}
                            title="Avertir (Warn)"
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium text-[11px] transition-colors"
                          >
                            Warn
                          </button>

                          {/* Timeout */}
                          <button
                            onClick={() => openSanctionForUser(m.id, 'timeout')}
                            title="Mute / Timeout"
                            className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium text-[11px] transition-colors"
                          >
                            Timeout
                          </button>

                          {/* Kick */}
                          <button
                            onClick={() => openSanctionForUser(m.id, 'kick')}
                            title="Expulser (Kick)"
                            className="px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-medium text-[11px] transition-colors"
                          >
                            Kick
                          </button>

                          {/* Ban */}
                          <button
                            onClick={() => openSanctionForUser(m.id, 'ban')}
                            title="Bannir (Ban)"
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-[11px] transition-colors"
                          >
                            Ban
                          </button>

                          {/* Historique */}
                          <button
                            onClick={() => {
                              setSearchUserId(m.id);
                              setActiveTab('sanctions');
                            }}
                            title="Voir l'historique"
                            className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] transition-colors"
                          >
                            Cas
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : GESTION DES SALONS (CHANNELS) */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono mb-1">
              Contrôle Rapide des Salons
            </h3>
            <p className="text-xs text-slate-400">
              Modifiez le mode lent (Slowmode), verrouillez en cas de raid ou purgez les messages directement depuis l'interface web.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channelsDetail.map((ch) => (
              <div
                key={ch.id}
                className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-white text-sm">#{ch.name}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      ch.isLocked
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {ch.isLocked ? 'VERROUILLÉ' : 'OUVERT'}
                  </span>
                </div>

                {/* Slowmode Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Mode Lent (Slowmode) :
                    </span>
                    <span className="font-mono text-white">
                      {ch.slowmode === 0 ? 'Désactivé' : `${ch.slowmode}s`}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1 text-[11px] font-mono">
                    {[0, 5, 10, 30, 60, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => handleSlowmodeChange(ch.id, sec)}
                        className={`py-1 rounded transition-colors ${
                          ch.slowmode === sec
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec === 0 ? 'OFF' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Boutons d'action : Lock & Purge */}
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleLock(ch)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                      ch.isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600/80 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {ch.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{ch.isLocked ? 'Déverrouiller' : 'Verrouiller'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setClearChannelModal(ch);
                      setClearAmount(20);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Purger messages</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 4 : SANCTIONS & HISTORIQUE */}
      {/* ========================================================================= */}
      {activeTab === 'sanctions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#101217] border border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="Rechercher par pseudo ou ID..."
                className="bg-transparent border-0 text-xs text-white placeholder:text-slate-400 focus:outline-none w-full sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] text-slate-400 font-mono mr-1">Type :</span>
              {['all', 'warn', 'timeout', 'kick', 'ban'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSanctionFilterType(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors ${
                    sanctionFilterType === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            {filteredSanctions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Aucune sanction ne correspond aux critères.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Cas</th>
                      <th className="px-4 py-3">Membre</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Raison</th>
                      <th className="px-4 py-3">Modérateur</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSanctions.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400">#{s.id}</td>
                        <td className="px-4 py-3 font-medium text-white">
                          <div>{s.userTag}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.userId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                              s.type === 'ban'
                                ? 'bg-rose-500/15 text-rose-400'
                                : s.type === 'kick'
                                ? 'bg-orange-500/15 text-orange-400'
                                : s.type === 'timeout'
                                ? 'bg-indigo-500/15 text-indigo-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {s.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{s.reason}</td>
                        <td className="px-4 py-3 text-slate-400">{s.moderatorTag}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(s.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.active ? (
                            <button
                              onClick={() => handleRevoke(s.id)}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium transition-colors"
                            >
                              Révoquer
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Révoqué</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 5 : AUTOMOD */}
      {/* ========================================================================= */}
      {activeTab === 'automod' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Règles de Protection Automatique
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Le bot intercepte et sanctionne automatiquement les comportements toxiques ou intrusifs.
              </p>
            </div>

            <button
              onClick={handleSaveAutoMod}
              disabled={savingConfig}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Sauvegarde...' : 'Sauvegarder AutoMod'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Anti-Spam */}
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-semibold text-white">Anti-Spam / Anti-Flood</h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAutoModState({
                      ...autoModState,
                      antiSpam: { ...autoModState.antiSpam, enabled: !autoModState.antiSpam.enabled },
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoModState.antiSpam.enabled ? 'bg-indigo-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoModState.antiSpam.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Détecte les envois compulsifs de messages (seuil : 5 messages en 3 secondes).
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Sanction :</span>
                <select
                  value={autoModState.antiSpam.action}
                  onChange={(e) =>
                    setAutoModState({
                      ...autoModState,
                      antiSpam: { ...autoModState.antiSpam, action: e.target.value as any },
                    })
                  }
                  className="bg-[#141620] border border-white/[0.08] text-white rounded px-2 py-1 text-xs"
                >
                  <option value="timeout">Timeout (Sourdine)</option>
                  <option value="warn">Avertissement</option>
                  <option value="delete">Suppression seule</option>
                </select>
              </div>
            </div>

            {/* Anti-Invites */}
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-semibold text-white">Anti-Invites Discord</h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAutoModState({
                      ...autoModState,
                      antiInvites: { ...autoModState.antiInvites, enabled: !autoModState.antiInvites.enabled },
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoModState.antiInvites.enabled ? 'bg-indigo-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoModState.antiInvites.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Bloque les liens d'invitation vers d'autres serveurs Discord (discord.gg/...).
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Sanction :</span>
                <select
                  value={autoModState.antiInvites.action}
                  onChange={(e) =>
                    setAutoModState({
                      ...autoModState,
                      antiInvites: { ...autoModState.antiInvites, action: e.target.value as any },
                    })
                  }
                  className="bg-[#141620] border border-white/[0.08] text-white rounded px-2 py-1 text-xs"
                >
                  <option value="delete">Suppression du lien</option>
                  <option value="warn">Avertissement + Suppression</option>
                  <option value="timeout">Timeout + Suppression</option>
                </select>
              </div>
            </div>

            {/* Anti-Liens */}
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-white">Anti-Liens Web Génériques</h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAutoModState({
                      ...autoModState,
                      antiLinks: { ...autoModState.antiLinks, enabled: !autoModState.antiLinks.enabled },
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoModState.antiLinks.enabled ? 'bg-indigo-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoModState.antiLinks.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Bloque tout lien web externe (http:// ou https://) posté par des non-modérateurs.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Sanction :</span>
                <select
                  value={autoModState.antiLinks.action}
                  onChange={(e) =>
                    setAutoModState({
                      ...autoModState,
                      antiLinks: { ...autoModState.antiLinks, action: e.target.value as any },
                    })
                  }
                  className="bg-[#141620] border border-white/[0.08] text-white rounded px-2 py-1 text-xs"
                >
                  <option value="delete">Suppression</option>
                  <option value="warn">Avertissement</option>
                </select>
              </div>
            </div>

            {/* Anti-Mentions */}
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-semibold text-white">Anti-Mentions Massives</h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAutoModState({
                      ...autoModState,
                      antiMassMentions: { ...autoModState.antiMassMentions, enabled: !autoModState.antiMassMentions.enabled },
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoModState.antiMassMentions.enabled ? 'bg-indigo-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoModState.antiMassMentions.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Intercepte les messages comportant plus de 4 mentions d'utilisateurs ou de rôles.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Sanction :</span>
                <select
                  value={autoModState.antiMassMentions.action}
                  onChange={(e) =>
                    setAutoModState({
                      ...autoModState,
                      antiMassMentions: { ...autoModState.antiMassMentions, action: e.target.value as any },
                    })
                  }
                  className="bg-[#141620] border border-white/[0.08] text-white rounded px-2 py-1 text-xs"
                >
                  <option value="warn">Avertissement</option>
                  <option value="timeout">Timeout (Sourdine)</option>
                  <option value="delete">Suppression</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filtre de mots (Blacklist) */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Liste Noire de Mots & Termes Interdits
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tout message contenant l'un de ces mots sera automatiquement supprimé.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAutoModState({
                    ...autoModState,
                    wordFilter: { ...autoModState.wordFilter, enabled: !autoModState.wordFilter.enabled },
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoModState.wordFilter.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoModState.wordFilter.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWord();
                  }
                }}
                placeholder="Ajouter un mot ou expression interdite..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddWord}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
              >
                Ajouter
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {autoModState.wordFilter.words.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Aucun mot configuré dans la liste noire.</span>
              ) : (
                autoModState.wordFilter.words.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 font-mono"
                  >
                    <span>{w}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(w)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 6 : CONFIGURATION & LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Paramètres de Modération & Logs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sélectionnez le salon d'audit Discord et paramétrez l'escalade des sanctions.
              </p>
            </div>

            <button
              onClick={handleSaveGeneralConfig}
              disabled={savingConfig}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Salon des Logs de Modération</label>
              <select
                value={selectedLogChannel}
                onChange={(e) => setSelectedLogChannel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Aucun salon (Recherche automatique #logs) --</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
              <label className="text-xs font-medium text-slate-300">Rôle Modérateur Autorisé</label>
              <select
                value={selectedModRole}
                onChange={(e) => setSelectedModRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Par défaut (Permissions Discord standard) --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.04]">
              <div>
                <h4 className="text-xs font-medium text-slate-200">Escalade Automatique des Warnings</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Applique automatiquement une sanction lorsqu'un membre cumule plusieurs avertissements.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Nombre d'avertissements</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={escalationThreshold}
                    onChange={(e) => setEscalationThreshold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Sanction automatique</label>
                  <select
                    value={escalationAction}
                    onChange={(e) => setEscalationAction(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                  >
                    <option value="timeout">Timeout (1 heure)</option>
                    <option value="kick">Expulsion (Kick)</option>
                    <option value="ban">Bannissement (Ban)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'application de sanction */}
      <ApplySanctionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApplySanction}
      />

      {/* Modal Changement de Pseudo */}
      {nicknameModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#101217] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Modifier le pseudo • {nicknameModalMember.username}
              </h3>
              <button
                onClick={() => setNicknameModalMember(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Nouveau Surnom</label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Laisser vide pour réinitialiser..."
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setNicknameModalMember(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveNickname}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Purge de Messages */}
      {clearChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#101217] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Purger #{clearChannelModal.name}
              </h3>
              <button
                onClick={() => setClearChannelModal(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Nombre de messages à supprimer (1-100)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={clearAmount}
                onChange={(e) => setClearAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400">
                Seuls les messages récents (moins de 14 jours) peuvent être purgés en masse.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setClearChannelModal(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleClearMessages}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
              >
                Supprimer les messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
