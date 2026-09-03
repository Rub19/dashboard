import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  LeaderboardEntry,
  LevelReward,
  LevelingConfig,
  LevelingOverview,
  RoleItem,
  XpBoost,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Hash,
  Layers,
  MessageSquare,
  Plus,
  Radio,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface LevelingPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LevelingPage: React.FC<LevelingPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'rewards' | 'boosts' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Données
  const [overview, setOverview] = useState<LevelingOverview | null>(null);
  const [config, setConfig] = useState<LevelingConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [boosts, setBoosts] = useState<XpBoost[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // Recherche Leaderboard & Profil
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);

  // Modales
  const [saving, setSaving] = useState(false);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [newRewardLevel, setNewRewardLevel] = useState(5);
  const [newRewardRoleId, setNewRewardRoleId] = useState('');

  const [showAddBoostModal, setShowAddBoostModal] = useState(false);
  const [newBoostName, setNewBoostName] = useState('Boost VIP');
  const [newBoostMultiplier, setNewBoostMultiplier] = useState(1.5);
  const [newBoostType, setNewBoostType] = useState<'server' | 'role' | 'channel' | 'event'>('server');
  const [newBoostTargetId, setNewBoostTargetId] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, cfgRes, lbRes, rewRes, bstRes, roleRes, chanRes] = await Promise.all([
        api.getLevelingOverview(guildId),
        api.getLevelingConfig(guildId),
        api.getLeaderboard(guildId),
        api.getLevelRewards(guildId),
        api.getXpBoosts(guildId),
        api.getRoles(guildId),
        api.getChannels(guildId),
      ]);

      setOverview(ovRes);
      setConfig(cfgRes.config);
      setLeaderboard(lbRes.leaderboard);
      setRewards(rewRes.rewards);
      setBoosts(bstRes.boosts);
      setRoles(roleRes.roles);
      setChannels(chanRes.channels);

      if (roleRes.roles.length > 0) {
        setNewRewardRoleId(roleRes.roles[0].id);
        setNewBoostTargetId(roleRes.roles[0].id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des données de Leveling', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.getLeaderboard(guildId, searchQuery);
      setLeaderboard(res.leaderboard);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur recherche', 'error');
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await api.updateLevelingConfig(guildId, config);
      setConfig(res.config);
      const ovRes = await api.getLevelingOverview(guildId);
      setOverview(ovRes);
      onShowToast('Configuration enregistrée avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReward = async () => {
    if (!newRewardRoleId) return;
    try {
      const res = await api.saveLevelReward(guildId, {
        level: newRewardLevel,
        roleId: newRewardRoleId,
        enabled: true,
      });
      setRewards((prev) => [...prev, res.reward].sort((a, b) => a.level - b.level));
      setShowAddRewardModal(false);
      onShowToast(`Palier Niveau ${newRewardLevel} configuré avec succès !`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur ajout palier', 'error');
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      await api.deleteLevelReward(guildId, id);
      setRewards((prev) => prev.filter((r) => r.id !== id));
      onShowToast('Récompense de niveau supprimée.', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur suppression', 'error');
    }
  };

  const handleAddBoost = async () => {
    try {
      const res = await api.saveXpBoost(guildId, {
        name: newBoostName,
        multiplier: newBoostMultiplier,
        targetType: newBoostType,
        targetId: newBoostType === 'server' || newBoostType === 'event' ? null : newBoostTargetId,
        enabled: true,
      });
      setBoosts((prev) => [...prev, res.boost]);
      setShowAddBoostModal(false);
      onShowToast(`Boost "${newBoostName}" activé !`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur ajout boost', 'error');
    }
  };

  const handleDeleteBoost = async (id: string) => {
    try {
      await api.deleteXpBoost(guildId, id);
      setBoosts((prev) => prev.filter((b) => b.id !== id));
      onShowToast('Boost supprimé.', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur suppression boost', 'error');
    }
  };

  const handleResetServerXp = async () => {
    try {
      await api.resetXp(guildId);
      setShowResetModal(false);
      onShowToast('Tous les niveaux et XP du serveur ont été réinitialisés.', 'info');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur réinitialisation', 'error');
    }
  };

  if (loading || !overview || !config) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Leveling & XP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Niveaux & Progression Communautaire
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gains d'XP par message, paliers de rôles, multiplicateurs de boost et classement en direct.
          </p>
        </div>

        {activeTab === 'settings' && (
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors w-fit"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        )}
      </div>

      {/* Navigation sous-onglets */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Classement ({leaderboard.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'rewards'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Paliers de Rôles ({rewards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('boosts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'boosts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Multiplicateurs & Boosts ({boosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Paramètres & Exclusions</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET VUE D'ENSEMBLE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes Métriques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Membres Actifs (XP)</div>
              <div className="text-2xl font-bold text-white mt-1">
                {overview.activeMembersCount.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">XP Totale Distribuée</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {overview.totalXpDistributed.toLocaleString()} XP
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Niveaux Cumulés</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {overview.totalLevels.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Top Membre (#1)</div>
              <div className="text-base font-bold text-emerald-400 mt-1 truncate">
                {overview.topUser ? `${overview.topUser.username} (Lvl ${overview.topUser.level})` : 'Aucun'}
              </div>
            </div>
          </div>

          {/* Aperçu Top 5 */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Top 5 des Membres les Plus Actifs
              </h3>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
              >
                Voir tout le classement ➔
              </button>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucun membre n'a encore acquis d'expérience. Envoyez des messages sur Discord pour commencer !
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {leaderboard.slice(0, 5).map((user) => (
                  <div
                    key={user.userId}
                    onClick={() => setSelectedUser(user)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-amber-400 w-6 text-center">
                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                      </span>

                      <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <Star className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>

                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{user.username}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {user.messagesCount} message(s)
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs font-bold font-mono text-indigo-300">
                        Niveau {user.level}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {user.totalXp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET CLASSEMENT (LEADERBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un membre par pseudo ou identifiant..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors shrink-0"
            >
              Rechercher
            </button>
          </form>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucun membre trouvé dans le classement.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {leaderboard.map((user) => (
                  <div
                    key={user.userId}
                    onClick={() => setSelectedUser(user)}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-sm font-bold text-amber-400 w-7 text-center shrink-0">
                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                      </span>

                      <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                        ) : (
                          <Star className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{user.username}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{user.messagesCount} messages</span>
                          <span>•</span>
                          <span>{user.totalXp.toLocaleString()} XP total</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-48 hidden sm:block shrink-0 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Niveau {user.level}</span>
                        <span>{user.progressPercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${user.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET PALIERS DE RÔLES (REWARDS) */}
      {/* ========================================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Récompenses de Niveaux</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Attribuez automatiquement des rôles lorsque les membres franchissent des paliers d'expérience.
              </p>
            </div>

            <button
              onClick={() => setShowAddRewardModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Palier</span>
            </button>
          </div>

          {/* Mode de distribution */}
          <div className="p-4 rounded-xl bg-[#101217] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Mode de Récompenses</span>
              <p className="text-[11px] text-slate-400">
                {config.rewardType === 'cumulative'
                  ? 'Cumulatif : les membres conservent tous les rôles débloqués au fil de leur progression.'
                  : 'Progressif : le rôle supérieur remplace automatiquement le rôle du palier précédent.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const updated = config.rewardType === 'cumulative' ? 'progressive' : 'cumulative';
                setConfig({ ...config, rewardType: updated });
                api.updateLevelingConfig(guildId, { rewardType: updated });
                onShowToast(`Mode changé en : ${updated}`, 'info');
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white text-xs font-mono border border-white/[0.08] transition-colors"
            >
              {config.rewardType === 'cumulative' ? 'Mode Cumulatif' : 'Mode Progressif'}
            </button>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            {rewards.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucun palier de rôle configuré. Cliquez sur "Nouveau Palier" pour commencer.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {rewards.map((rew) => {
                  const role = roles.find((r) => r.id === rew.roleId);
                  return (
                    <div
                      key={rew.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {rew.level}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            <span>Palier Niveau {rew.level}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-indigo-300 border border-white/[0.06]">
                              @{role ? role.name : 'Rôle inconnu'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Attribution automatique au passage au niveau {rew.level}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteReward(rew.id)}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET MULTIPLICATEURS & BOOSTS */}
      {/* ========================================================================= */}
      {activeTab === 'boosts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Multiplicateurs & Événements d'XP</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Créez des multiplicateurs d'expérience pour récompenser certains rôles, salons ou organiser des événements.
              </p>
            </div>

            <button
              onClick={() => setShowAddBoostModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Boost</span>
            </button>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            {boosts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucun boost d'XP actif. Cliquez sur "Nouveau Boost" pour créer un bonus serveur, rôle ou événement.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {boosts.map((bst) => (
                  <div
                    key={bst.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        x{bst.multiplier}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{bst.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06] uppercase">
                            {bst.targetType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Multiplicateur d'expérience actif (x{bst.multiplier})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBoost(bst.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ONGLET PARAMÈTRES & EXCLUSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Système de Progression</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active ou désactive globalement le gain d'XP et les niveaux sur ce serveur.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.enabled ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
              {/* Plage d'XP */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Plage d'XP par Message</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {config.minXp} à {config.maxXp} XP
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400">Min XP</label>
                    <input
                      type="number"
                      value={config.minXp}
                      onChange={(e) =>
                        setConfig({ ...config, minXp: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#141620] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Max XP</label>
                    <input
                      type="number"
                      value={config.maxXp}
                      onChange={(e) =>
                        setConfig({ ...config, maxXp: parseInt(e.target.value, 10) || 30 })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#141620] border border-white/[0.08] text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cooldown Anti-Spam */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Cooldown Anti-Spam XP</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {config.cooldownSeconds} secondes
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={180}
                  value={config.cooldownSeconds}
                  onChange={(e) =>
                    setConfig({ ...config, cooldownSeconds: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-slate-400">
                  Délai obligatoire entre deux gains d'XP pour éviter le spam de messages.
                </p>
              </div>

              {/* Notifications de Level Up */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <label className="text-xs font-semibold text-white block">
                  Notification de Level Up
                </label>
                <select
                  value={config.levelUpChannelType}
                  onChange={(e) =>
                    setConfig({ ...config, levelUpChannelType: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                >
                  <option value="same_channel">Même salon que le message</option>
                  <option value="specific_channel">Salon spécifique dédié</option>
                  <option value="dm">Message Privé (DM)</option>
                  <option value="disabled">Désactivé (Silencieux)</option>
                </select>

                {config.levelUpChannelType === 'specific_channel' && (
                  <select
                    value={config.levelUpChannelId || ''}
                    onChange={(e) =>
                      setConfig({ ...config, levelUpChannelId: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs mt-1"
                  >
                    <option value="">-- Sélectionner un salon --</option>
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Longueur Min Message */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Longueur Min. du Message</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {config.minMessageLength} caractères
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={config.minMessageLength}
                  onChange={(e) =>
                    setConfig({ ...config, minMessageLength: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Exclusions Salons et Rôles */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white">Exclusions du Gain d'XP</h3>
            <p className="text-xs text-slate-400">
              Les messages envoyés dans les salons exclus ou par les rôles exclus ne rapportent aucun point d'expérience.
            </p>

            <div className="space-y-3 pt-1 border-t border-white/[0.04]">
              {/* Salons Exclus */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white">Salons Exclus :</label>
                <div className="flex flex-wrap gap-1.5">
                  {channels.map((c) => {
                    const isExcl = config.excludedChannelIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const cur = config.excludedChannelIds;
                          const updated = isExcl
                            ? cur.filter((id) => id !== c.id)
                            : [...cur, c.id];
                          setConfig({ ...config, excludedChannelIds: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          isExcl
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>#{c.name}</span>
                        {isExcl && <Check className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rôles Exclus */}
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <label className="text-xs font-semibold text-white">Rôles Exclus :</label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((r) => {
                    const isExcl = config.excludedRoleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          const cur = config.excludedRoleIds;
                          const updated = isExcl
                            ? cur.filter((id) => id !== r.id)
                            : [...cur, r.id];
                          setConfig({ ...config, excludedRoleIds: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          isExcl
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: r.color !== '#000000' ? r.color : '#818CF8' }}
                        />
                        <span>@{r.name}</span>
                        {isExcl && <Check className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Zone de Danger */}
          <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider">
                Zone de Danger
              </h3>
            </div>
            <p className="text-xs text-rose-300/80">
              Réinitialise tous les niveaux et points d'expérience de l'ensemble des membres du serveur. Cette action est irréversible.
            </p>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm transition-colors w-fit"
            >
              Réinitialiser l'XP du serveur
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PROFIL MEMBRE */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] overflow-hidden">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt={selectedUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <Star className="w-5 h-5 text-indigo-400 m-2.5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedUser.username}</h3>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">
                    Rang #{selectedUser.rank}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 font-mono">Niveau</span>
                  <div className="text-xl font-bold text-white mt-0.5">{selectedUser.level}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 font-mono">Messages</span>
                  <div className="text-xl font-bold text-indigo-400 mt-0.5">
                    {selectedUser.messagesCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>Progression Niveau {selectedUser.level + 1}</span>
                  <span>{selectedUser.progressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${selectedUser.progressPercentage}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  {selectedUser.currentLevelXp.toLocaleString()} / {selectedUser.nextLevelXp.toLocaleString()} XP
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT PALIER */}
      {showAddRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Ajouter un Palier de Rôle</h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Niveau Requis</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newRewardLevel}
                  onChange={(e) => setNewRewardLevel(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Rôle Attribué</label>
                <select
                  value={newRewardRoleId}
                  onChange={(e) => setNewRewardRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowAddRewardModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleAddReward}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT BOOST */}
      {showAddBoostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Créer un Multiplicateur d'XP</h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Nom du Boost</label>
                <input
                  type="text"
                  value={newBoostName}
                  onChange={(e) => setNewBoostName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Multiplicateur (ex: 1.5, 2)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.1"
                  max="10"
                  value={newBoostMultiplier}
                  onChange={(e) => setNewBoostMultiplier(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Type de Cible</label>
                <select
                  value={newBoostType}
                  onChange={(e) => setNewBoostType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                >
                  <option value="server">Tout le Serveur</option>
                  <option value="role">Rôle spécifique</option>
                  <option value="channel">Salon spécifique</option>
                  <option value="event">Événement temporaire</option>
                </select>
              </div>

              {newBoostType === 'role' && (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Rôle concerné</label>
                  <select
                    value={newBoostTargetId}
                    onChange={(e) => setNewBoostTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newBoostType === 'channel' && (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Salon concerné</label>
                  <select
                    value={newBoostTargetId}
                    onChange={(e) => setNewBoostTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowAddBoostModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleAddBoost}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm"
              >
                Activer le Boost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET CONFIRMATION */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Confirmation de Réinitialisation</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer tous les points d'XP et les niveaux acquis sur ce serveur ? Cette action est immédiate et irréversible.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleResetServerXp}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm"
              >
                Confirmer la Réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
