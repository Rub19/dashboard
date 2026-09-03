import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  Giveaway,
  GiveawayOverview,
  GiveawayParticipant,
  RoleItem,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  History,
  Image,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface GiveawaysPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GiveawaysPage: React.FC<GiveawaysPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'history'>('overview');
  const [loading, setLoading] = useState(true);

  // Données
  const [overview, setOverview] = useState<GiveawayOverview | null>(null);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // Formulaire de création
  const [formPrize, setFormPrize] = useState('1× Discord Nitro');
  const [formDescription, setFormDescription] = useState('Cliquez sur le bouton ci-dessous pour tenter de remporter 1 mois de Discord Nitro !');
  const [formChannelId, setFormChannelId] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState(1440); // 24h
  const [formWinnerCount, setFormWinnerCount] = useState(1);
  const [formRewardRoleId, setFormRewardRoleId] = useState<string>('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formMinAccountAge, setFormMinAccountAge] = useState(0);
  const [formMinLevel, setFormMinLevel] = useState(0);
  const [formRequiredRoleIds, setFormRequiredRoleIds] = useState<string[]>([]);
  const [formExcludedRoleIds, setFormExcludedRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Participants
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);
  const [participantsList, setParticipantsList] = useState<GiveawayParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, listRes, rolesRes, chansRes] = await Promise.all([
        api.getGiveawaysOverview(guildId),
        api.getGiveawaysList(guildId),
        api.getRoles(guildId),
        api.getChannels(guildId),
      ]);

      setOverview(ovRes);
      setGiveaways(listRes.giveaways);
      setRoles(rolesRes.roles);
      setChannels(chansRes.channels);

      if (chansRes.channels.length > 0 && !formChannelId) {
        setFormChannelId(chansRes.channels[0].id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur chargement des giveaways', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleCreateGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrize || !formChannelId) {
      onShowToast('Veuillez renseigner le lot et choisir un salon textuel.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createGiveaway(guildId, {
        prize: formPrize,
        description: formDescription,
        channelId: formChannelId,
        durationMinutes: formDurationMinutes,
        winnerCount: formWinnerCount,
        rewardRoleId: formRewardRoleId || null,
        bannerUrl: formBannerUrl || null,
        requirements: {
          requiredRoleIds: formRequiredRoleIds,
          excludedRoleIds: formExcludedRoleIds,
          minAccountAgeDays: formMinAccountAge,
          minLevel: formMinLevel,
        },
      });

      onShowToast(`Giveaway pour "${formPrize}" lancé avec succès sur Discord !`, 'success');
      setActiveTab('overview');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Échec de la création du giveaway', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndNow = async (id: string) => {
    try {
      const res = await api.endGiveaway(guildId, id);
      onShowToast(
        res.winners.length > 0
          ? `Tirage effectué ! ${res.winners.length} gagnant(s) sélectionné(s).`
          : 'Giveaway clôturé sans participant éligible.',
        'success'
      );
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur clôture giveaway', 'error');
    }
  };

  const handleReroll = async (id: string) => {
    try {
      const res = await api.rerollGiveaway(guildId, id, 1);
      onShowToast(
        res.winners.length > 0
          ? `Reroll effectué ! Nouveau(x) gagnant(s) : ${res.winners.length}`
          : 'Aucun autre participant disponible pour le reroll.',
        'info'
      );
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur reroll', 'error');
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await api.extendGiveaway(guildId, id, 1440); // +24h
      onShowToast('Giveaway prolongé de 24 heures avec succès !', 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur prolongation', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce giveaway ?')) return;
    try {
      await api.cancelGiveaway(guildId, id);
      onShowToast('Giveaway annulé.', 'info');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur annulation', 'error');
    }
  };

  const openParticipantsModal = async (gw: Giveaway) => {
    setSelectedGiveaway(gw);
    setLoadingParticipants(true);
    try {
      const res = await api.getGiveawayParticipants(guildId, gw.id);
      setParticipantsList(res.participants);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur chargement participants', 'error');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleRemoveParticipant = async (gwId: string, userId: string) => {
    try {
      await api.removeGiveawayParticipant(guildId, gwId, userId);
      setParticipantsList((prev) => prev.filter((p) => p.userId !== userId));
      onShowToast('Participant retiré du tirage.', 'info');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur retrait participant', 'error');
    }
  };

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeGiveaways = giveaways.filter((g) => g.status === 'active');
  const pastGiveaways = giveaways.filter((g) => g.status !== 'active');

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Giveaways & Events</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Giveaways & Tirages au Sort
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organisation de tirages au sort avec conditions d'accès, rôles récompenses et reroll en 1 clic.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Lancer un Giveaway</span>
        </button>
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
          <span>En Cours ({activeGiveaways.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Créer un Giveaway (Wizard)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historique & Clôturés ({pastGiveaways.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET VUE D'ENSEMBLE (GIVEAWAYS ACTIFS) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes Métriques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Giveaways Actifs</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.activeCount}</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Tirages Terminés</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{overview.endedCount}</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Total Participants</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {overview.totalParticipants.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Lots Distribués</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{overview.totalWinners}</div>
            </div>
          </div>

          {/* Liste des Giveaways Actifs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              Giveaways en cours sur le serveur ({activeGiveaways.length})
            </h3>

            {activeGiveaways.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono bg-[#101217] border border-white/[0.06] rounded-xl">
                Aucun giveaway en cours actuellement. Cliquez sur "Lancer un Giveaway" pour organiser un tirage !
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGiveaways.map((gw) => {
                  const channel = channels.find((c) => c.id === gw.channelId);
                  const endTimestamp = Math.floor(new Date(gw.endsAt).getTime() / 1000);

                  return (
                    <div
                      key={gw.id}
                      className="bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase">
                              #{channel ? channel.name : gw.channelId}
                            </span>
                            <h4 className="text-base font-bold text-white mt-1.5">{gw.prize}</h4>
                          </div>
                          <span className="text-[11px] font-mono text-amber-400 font-bold shrink-0">
                            {gw.winnerCount} gagnant(s)
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">{gw.description}</p>

                        <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                          <div>Fin : <span className="text-slate-200">{new Date(gw.endsAt).toLocaleDateString('fr-FR')}</span></div>
                          <div
                            onClick={() => openParticipantsModal(gw)}
                            className="text-indigo-400 hover:text-indigo-300 cursor-pointer text-right"
                          >
                            👥 {gw.participants.length} participant(s) ➔
                          </div>
                        </div>
                      </div>

                      {/* Actions Rapides */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04] overflow-x-auto">
                        <button
                          onClick={() => handleEndNow(gw.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-medium border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap"
                        >
                          <Trophy className="w-3 h-3" />
                          <span>Tirer les Gagnants</span>
                        </button>

                        <button
                          onClick={() => handleExtend(gw.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap"
                        >
                          <Clock className="w-3 h-3" />
                          <span>+24h</span>
                        </button>

                        <button
                          onClick={() => handleCancel(gw.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-medium border border-rose-500/20 flex items-center gap-1 whitespace-nowrap ml-auto"
                        >
                          <X className="w-3 h-3" />
                          <span>Annuler</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET CRÉER UN GIVEAWAY (WIZARD AVEC LIVE PREVIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulaire de configuration */}
          <form onSubmit={handleCreateGiveaway} className="lg:col-span-7 space-y-4">
            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-white">Étape 1 : Lot & Présentation</h3>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Lot à Gagner *</label>
                  <input
                    type="text"
                    required
                    value={formPrize}
                    onChange={(e) => setFormPrize(e.target.value)}
                    placeholder="Ex: 1× Discord Nitro, Clé de jeu, Compte VIP..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Description / Instructions</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">URL de l'image de bannière (optionnel)</label>
                  <input
                    type="url"
                    value={formBannerUrl}
                    onChange={(e) => setFormBannerUrl(e.target.value)}
                    placeholder="https://i.imgur.com/...png"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-white">Étape 2 : Salon & Durée</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Salon de Publication *</label>
                  <select
                    value={formChannelId}
                    onChange={(e) => setFormChannelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Durée du Tirage</label>
                  <select
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white font-mono"
                  >
                    <option value={60}>1 heure</option>
                    <option value={720}>12 heures</option>
                    <option value={1440}>24 heures (1 jour)</option>
                    <option value={4320}>3 jours</option>
                    <option value={10080}>7 jours (1 semaine)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Nombre de Gagnants</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formWinnerCount}
                    onChange={(e) => setFormWinnerCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Rôle Attribué au Gagnant (optionnel)</label>
                  <select
                    value={formRewardRoleId}
                    onChange={(e) => setFormRewardRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white"
                  >
                    <option value="">-- Aucun rôle automatique --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-white">Étape 3 : Conditions d'accès</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Âge Min. du Compte (jours)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={formMinAccountAge}
                    onChange={(e) => setFormMinAccountAge(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Niveau XP Minimum (Module Leveling)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formMinLevel}
                    onChange={(e) => setFormMinLevel(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              {submitting ? 'Publication en cours...' : '🎉 Publier le Giveaway sur Discord'}
            </button>
          </form>

          {/* Live Preview Discord fidèlement reproduit */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Aperçu Discord en Direct
            </h3>

            <div className="bg-[#2B2D31] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-xl">
              <div className="border-l-4 border-indigo-500 pl-3.5 space-y-2 py-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-indigo-400" />
                  <span>GIVEAWAY : {formPrize || 'Titre du Lot'}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {formDescription || 'Description du tirage au sort...'}
                </p>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1 font-mono">
                  <div>🏆 Gagnants : <strong className="text-white">{formWinnerCount}</strong></div>
                  <div>⏰ Fin : <span className="text-indigo-300">dans {Math.round(formDurationMinutes / 60)} heure(s)</span></div>
                  <div>👥 Participants : <strong className="text-white">0</strong></div>
                  {(formMinAccountAge > 0 || formMinLevel > 0) && (
                    <div className="pt-1 text-slate-300">
                      🛡️ Conditions :
                      {formMinAccountAge > 0 && ` • Compte +${formMinAccountAge}j`}
                      {formMinLevel > 0 && ` • Niveau ${formMinLevel}+`}
                    </div>
                  )}
                </div>

                {formBannerUrl && (
                  <div className="pt-2">
                    <img
                      src={formBannerUrl}
                      alt="Banner Preview"
                      className="w-full max-h-48 object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Bouton Interactif */}
              <div className="pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-not-allowed opacity-90"
                >
                  <span>🎉 Participer (0)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET HISTORIQUE & CLÔTURÉS */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
          {pastGiveaways.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-mono">
              Aucun giveaway terminé dans l'historique.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {pastGiveaways.map((gw) => (
                <div
                  key={gw.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        gw.status === 'ended' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span className="truncate">{gw.prize}</span>
                        <span
                          className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${
                            gw.status === 'ended'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {gw.status === 'ended' ? 'Terminé' : 'Annulé'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Gagnant(s) :{' '}
                        <strong className="text-white">
                          {gw.winnerIds.length > 0
                            ? `${gw.winnerIds.length} membre(s)`
                            : 'Aucun gagnant'}
                        </strong>{' '}
                        • {gw.participants.length} participant(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {gw.status === 'ended' && (
                      <button
                        onClick={() => handleReroll(gw.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium border border-indigo-500/30 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reroll</span>
                      </button>
                    )}
                    <button
                      onClick={() => openParticipantsModal(gw)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium"
                    >
                      Participants
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARTICIPANTS */}
      {/* ========================================================================= */}
      {selectedGiveaway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Participants au Tirage</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedGiveaway.prize} ({participantsList.length} inscrits)
                </p>
              </div>
              <button onClick={() => setSelectedGiveaway(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
              {loadingParticipants ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Chargement des participants...
                </div>
              ) : participantsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Aucun participant inscrit pour le moment.
                </div>
              ) : (
                participantsList.map((p) => (
                  <div key={p.userId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.username} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{p.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.userId}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveParticipant(selectedGiveaway.id, p.userId)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                      title="Retirer le participant"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedGiveaway(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-white text-xs font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
