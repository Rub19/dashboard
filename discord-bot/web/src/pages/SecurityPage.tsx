import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  RoleItem,
  SecurityConfig,
  SecurityIncident,
  SecurityOverview,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Ban,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  MessageSquare,
  Radio,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Trash2,
  Unlock,
  UserCheck,
  UserMinus,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface SecurityPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'antiraid' | 'antinuke' | 'antispam' | 'whitelist' | 'incidents'
  >('overview');
  const [loading, setLoading] = useState(true);

  // Données
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);

  // Actions
  const [saving, setSaving] = useState(false);
  const [lockdownLoading, setLockdownLoading] = useState(false);

  // Modale Lockdown Manuel
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [lockdownDuration, setLockdownDuration] = useState(15);
  const [lockdownReason, setLockdownReason] = useState('Verrouillage manuel d’urgence');

  // Filtre Incidents
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, cfgRes, incRes, roleRes, chanRes] = await Promise.all([
        api.getSecurityOverview(guildId),
        api.getSecurityConfig(guildId),
        api.getSecurityIncidents(guildId),
        api.getRoles(guildId),
        api.getChannels(guildId),
      ]);

      setOverview(ovRes);
      setConfig(cfgRes.config);
      setIncidents(incRes.incidents);
      setRoles(roleRes.roles);
      setChannels(chanRes.channels);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement de la sécurité', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Rafraîchissement automatique léger toutes les 15 secondes pour le monitoring live
    const interval = setInterval(() => {
      api.getSecurityOverview(guildId).then(setOverview).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [guildId]);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await api.updateSecurityConfig(guildId, config);
      setConfig(res.config);
      const ovRes = await api.getSecurityOverview(guildId);
      setOverview(ovRes);
      onShowToast('Configuration de sécurité enregistrée avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerLockdown = async () => {
    setLockdownLoading(true);
    try {
      const res = await api.triggerLockdown(guildId, lockdownDuration, lockdownReason);
      setShowLockdownModal(false);
      onShowToast(`Lockdown activé : ${res.lockedCount} salon(s) verrouillé(s).`, 'error');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Échec de l’activation du lockdown', 'error');
    } finally {
      setLockdownLoading(false);
    }
  };

  const handleReleaseLockdown = async () => {
    setLockdownLoading(true);
    try {
      const res = await api.releaseLockdown(guildId);
      onShowToast(`Lockdown levé : ${res.unlockedCount} salon(s) déverrouillé(s).`, 'success');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Échec de la levée du lockdown', 'error');
    } finally {
      setLockdownLoading(false);
    }
  };

  const handleResolveIncident = async (id: string) => {
    try {
      await api.resolveSecurityIncident(guildId, id);
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, status: 'resolved' } : inc))
      );
      if (selectedIncident?.id === id) {
        setSelectedIncident(null);
      }
      onShowToast('Incident marqué comme résolu.', 'info');
      const ovRes = await api.getSecurityOverview(guildId);
      setOverview(ovRes);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur résolution incident', 'error');
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

  const filteredIncidents = incidents.filter((i) => {
    if (incidentFilter === 'open') return i.status === 'open';
    if (incidentFilter === 'resolved') return i.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Centre de Sécurité</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Sécurité & Défense Anti-Raid
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Protection en temps réel contre les mass joins, attaques nuke, spam et bots malveillants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overview.lockdownActive ? (
            <button
              onClick={handleReleaseLockdown}
              disabled={lockdownLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{lockdownLoading ? 'Déverrouillage...' : 'Lever le Lockdown'}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLockdownModal(true)}
              disabled={lockdownLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lockdown d'Urgence</span>
            </button>
          )}

          {activeTab !== 'overview' && activeTab !== 'incidents' && (
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          )}
        </div>
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
          onClick={() => setActiveTab('antiraid')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'antiraid'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Anti-Raid & Arrivées</span>
        </button>

        <button
          onClick={() => setActiveTab('antinuke')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'antinuke'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Anti-Nuke</span>
        </button>

        <button
          onClick={() => setActiveTab('antispam')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'antispam'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Anti-Spam & Contenu</span>
        </button>

        <button
          onClick={() => setActiveTab('whitelist')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'whitelist'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Whitelists & Confiance</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'incidents'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Incidents ({incidents.filter((i) => i.status === 'open').length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. ONGLET VUE D'ENSEMBLE & MONITEUR LIVE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Bannière de Statut Principal */}
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              overview.status === 'attack'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : overview.status === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  overview.status === 'attack'
                    ? 'bg-rose-500/20 text-rose-400'
                    : overview.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {overview.status === 'attack' ? (
                  <Flame className="w-6 h-6 animate-pulse" />
                ) : overview.status === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-wider font-semibold">
                  {overview.status === 'attack'
                    ? '🔴 ATTAQUE DÉTECTÉE / RAID MODE ACTIF'
                    : overview.status === 'warning'
                    ? '🟡 AVERTISSEMENT DE SÉCURITÉ'
                    : '🟢 SERVEUR PROTÉGÉ & SÉCURISÉ'}
                </div>
                <div className="text-sm font-medium text-white mt-0.5">
                  {overview.status === 'attack'
                    ? 'Le serveur subit une activité anormale. Le Raid Mode ou un Lockdown est actif.'
                    : overview.status === 'warning'
                    ? 'Des incidents suspects ont été détectés récemment.'
                    : 'Toutes les protections automatiques sont en alerte et veillent en temps réel.'}
                </div>
              </div>
            </div>

            {/* Score de Sécurité Visuel */}
            <div className="bg-black/30 px-5 py-3 rounded-xl border border-white/5 flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Score de Sécurité</div>
                <div className="text-xs font-semibold text-slate-200">
                  {overview.score >= 80
                    ? 'Niveau Excellent'
                    : overview.score >= 60
                    ? 'Niveau Bon'
                    : 'Sécurité Faible'}
                </div>
              </div>
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                {overview.score}
                <span className="text-xs text-slate-400 font-normal">/100</span>
              </div>
            </div>
          </div>

          {/* Cartes Métriques Live */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Arrivées (dernière minute)</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.joinsLastMinute}</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Messages (dernière minute)</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.messagesLastMinute}</div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Raids Massifs Déjoués</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {overview.stats.raidsPrevented}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Attaques Nuke Bloquées</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {overview.stats.nukesPrevented}
              </div>
            </div>
          </div>

          {/* Liste des Incidents Récents */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Derniers Incidents & Alertes
              </h3>
              <button
                onClick={() => setActiveTab('incidents')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
              >
                Voir tous les incidents ➔
              </button>
            </div>

            {overview.recentIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucun incident de sécurité enregistré. Le serveur est parfaitement calme.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {overview.recentIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          inc.severity === 'critical'
                            ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                            : inc.severity === 'high'
                            ? 'bg-orange-500'
                            : inc.severity === 'medium'
                            ? 'bg-amber-400'
                            : 'bg-blue-400'
                        }`}
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{inc.title}</span>
                          <span
                            className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                              inc.status === 'open'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{inc.description}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(inc.createdAt).toLocaleTimeString('fr-FR')}
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
      {/* 2. ONGLET ANTI-RAID & ARRIVÉES */}
      {/* ========================================================================= */}
      {activeTab === 'antiraid' && (
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Protection Anti-Raid</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance automatique des arrivées massives de membres et de bots.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  antiRaid: { ...config.antiRaid, enabled: !config.antiRaid.enabled },
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.antiRaid.enabled ? 'bg-indigo-600' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.antiRaid.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
            {/* Seuil Mass Joins */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Seuil de Mass Joins</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {config.antiRaid.maxJoins} arrivées / {config.antiRaid.timeWindowSeconds}s
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                value={config.antiRaid.maxJoins}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiRaid: { ...config.antiRaid, maxJoins: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400">
                Déclenche immédiatement l'alerte ou l'action de sécurité en cas de pic d'arrivées.
              </p>
            </div>

            {/* Action Anti-Raid */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <label className="text-xs font-semibold text-white block">Action Automatique</label>
              <select
                value={config.antiRaid.action}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiRaid: { ...config.antiRaid, action: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
              >
                <option value="lockdown">Verrouillage d'urgence (Lockdown)</option>
                <option value="kick">Expulsion automatique (Kick)</option>
                <option value="ban">Bannissement automatique (Ban)</option>
                <option value="timeout">Sourdine temporaire (Timeout)</option>
                <option value="alert">Alerte modérateurs uniquement</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Action immédiate appliquée dès que le seuil de raid est franchi.
              </p>
            </div>

            {/* Âge minimum du compte */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Âge Minimum du Compte</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {config.antiRaid.minAccountAgeDays === 0
                    ? 'Désactivé'
                    : `${config.antiRaid.minAccountAgeDays} jour(s)`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={config.antiRaid.minAccountAgeDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiRaid: {
                      ...config.antiRaid,
                      minAccountAgeDays: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400">
                Signale les comptes créés très récemment pour prévenir les raids de double-comptes.
              </p>
            </div>

            {/* Bloquer bots non whitelistés */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Bloquer Bots Inconnus</span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        antiRaid: {
                          ...config.antiRaid,
                          blockUnwhitelistedBots: !config.antiRaid.blockUnwhitelistedBots,
                        },
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.antiRaid.blockUnwhitelistedBots ? 'bg-indigo-600' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.antiRaid.blockUnwhitelistedBots ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Expulse immédiatement tout bot tiers invité qui ne figure pas dans la liste des bots de confiance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ONGLET ANTI-NUKE */}
      {/* ========================================================================= */}
      {activeTab === 'antinuke' && (
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Protection Anti-Nuke (Destruction)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance des actions massives de modération et suppression destructive de serveurs.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  antiNuke: { ...config.antiNuke, enabled: !config.antiNuke.enabled },
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.antiNuke.enabled ? 'bg-indigo-600' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.antiNuke.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <label className="text-xs font-semibold text-white block">Action Contre-Mesure</label>
              <select
                value={config.antiNuke.action}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiNuke: { ...config.antiNuke, action: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
              >
                <option value="strip_roles">Retirer immédiatement tous les rôles administratifs</option>
                <option value="ban">Bannir le compte suspect</option>
                <option value="alert">Alerter les propriétaires uniquement</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Sanction appliquée au compte modérateur ou bot compromis dès détection.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Mass Bans Limite</span>
                <span className="font-mono text-rose-400 font-bold">{config.antiNuke.maxBans} bans / 10s</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={config.antiNuke.maxBans}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiNuke: { ...config.antiNuke, maxBans: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full accent-rose-500"
              />
              <p className="text-[11px] text-slate-400">
                Bloque les bannissements en série non autorisés.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Suppression Salons Limite</span>
                <span className="font-mono text-rose-400 font-bold">
                  {config.antiNuke.maxChannelDeletes} salons / 10s
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={config.antiNuke.maxChannelDeletes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiNuke: {
                      ...config.antiNuke,
                      maxChannelDeletes: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-full accent-rose-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Suppression Rôles Limite</span>
                <span className="font-mono text-rose-400 font-bold">
                  {config.antiNuke.maxRoleDeletes} rôles / 10s
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={config.antiNuke.maxRoleDeletes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiNuke: { ...config.antiNuke, maxRoleDeletes: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full accent-rose-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET ANTI-SPAM & CONTENU */}
      {/* ========================================================================= */}
      {activeTab === 'antispam' && (
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Anti-Spam, Flood & Mentions</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Régulation automatique des messages rapides, mentions de masse et liens d'invitations.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  antiSpam: { ...config.antiSpam, enabled: !config.antiSpam.enabled },
                })
              }
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.antiSpam.enabled ? 'bg-indigo-600' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.antiSpam.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
            {/* Limite de mentions */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Mentions Maximum par Message</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {config.antiSpam.maxMentions} mentions
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={config.antiSpam.maxMentions}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    antiSpam: { ...config.antiSpam, maxMentions: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Blocage everyone/here */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Bloquer @everyone & @here</span>
                <p className="text-[11px] text-slate-400">
                  Interdit les mentions globales aux membres sans rôle de confiance.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    antiSpam: {
                      ...config.antiSpam,
                      blockEveryoneHere: !config.antiSpam.blockEveryoneHere,
                    },
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.antiSpam.blockEveryoneHere ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.antiSpam.blockEveryoneHere ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Anti-Invitations */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Anti-Invitations Discord</span>
                <p className="text-[11px] text-slate-400">
                  Supprime automatiquement les liens discord.gg d'autres serveurs.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    antiSpam: { ...config.antiSpam, antiInvite: !config.antiSpam.antiInvite },
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.antiSpam.antiInvite ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.antiSpam.antiInvite ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ONGLET WHITELISTS & CONFIANCE */}
      {/* ========================================================================= */}
      {activeTab === 'whitelist' && (
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Whitelists & Rôles de Confiance</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Les entités de confiance sont automatiquement exemptées des blocages et des sanctions de sécurité.
            </p>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/[0.04]">
            {/* Rôles de Confiance */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white">
                Rôles de Confiance Exemptés ({config.whitelist.trustedRoleIds.length}) :
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {roles.map((r) => {
                  const isTrusted = config.whitelist.trustedRoleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const cur = config.whitelist.trustedRoleIds;
                        const updated = isTrusted
                          ? cur.filter((id) => id !== r.id)
                          : [...cur, r.id];
                        setConfig({
                          ...config,
                          whitelist: { ...config.whitelist, trustedRoleIds: updated },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isTrusted
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: r.color !== '#000000' ? r.color : '#818CF8' }}
                      />
                      <span>@{r.name}</span>
                      {isTrusted && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Salons Exemptés du Lockdown */}
            <div className="space-y-2 pt-3 border-t border-white/[0.04]">
              <label className="text-xs font-semibold text-white">
                Salons Exemptés du Lockdown ({config.whitelist.exemptChannelIds.length}) :
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {channels.map((c) => {
                  const isExempt = config.whitelist.exemptChannelIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const cur = config.whitelist.exemptChannelIds;
                        const updated = isExempt
                          ? cur.filter((id) => id !== c.id)
                          : [...cur, c.id];
                        setConfig({
                          ...config,
                          whitelist: { ...config.whitelist, exemptChannelIds: updated },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isExempt
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>#{c.name}</span>
                      {isExempt && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ONGLET INCIDENTS & HISTORIQUE */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncidentFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  incidentFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                Tous ({incidents.length})
              </button>
              <button
                onClick={() => setIncidentFilter('open')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  incidentFilter === 'open'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                Ouverts ({incidents.filter((i) => i.status === 'open').length})
              </button>
              <button
                onClick={() => setIncidentFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  incidentFilter === 'resolved'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
              >
                Résolus ({incidents.filter((i) => i.status === 'resolved').length})
              </button>
            </div>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            {filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucun incident correspondant aux filtres.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          inc.severity === 'critical'
                            ? 'bg-rose-500'
                            : inc.severity === 'high'
                            ? 'bg-orange-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{inc.title}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-400">
                            {inc.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">{inc.description}</div>
                        <div className="text-[11px] text-slate-500 font-mono pt-1">
                          Action : <strong className="text-slate-400">{inc.actionTaken}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                          inc.status === 'open'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {inc.status}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(inc.createdAt).toLocaleString('fr-FR')}
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
      {/* MODAL LOCKDOWN MANUEL */}
      {/* ========================================================================= */}
      {showLockdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Lock className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Activer le Lockdown d'Urgence</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Cette action verrouillera instantanément tous les salons textuels publics du serveur en empêchant `@everyone` d'envoyer des messages.
            </p>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Durée du verrouillage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLockdownDuration(m)}
                      className={`py-2 rounded-lg text-xs font-mono font-medium transition-colors border ${
                        lockdownDuration === m
                          ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                      }`}
                    >
                      {m} minutes
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Motif</label>
                <input
                  type="text"
                  value={lockdownReason}
                  onChange={(e) => setLockdownReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowLockdownModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleTriggerLockdown}
                disabled={lockdownLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-sm"
              >
                {lockdownLoading ? 'Verrouillage...' : 'Confirmer le Lockdown'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DÉTAILS INCIDENT */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedIncident.severity === 'critical'
                      ? 'bg-rose-500'
                      : selectedIncident.severity === 'high'
                      ? 'bg-orange-500'
                      : 'bg-amber-400'
                  }`}
                />
                <h3 className="text-sm font-semibold text-white">{selectedIncident.title}</h3>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                {selectedIncident.description}
              </div>

              <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                <div>Type : <strong className="text-white">{selectedIncident.type}</strong></div>
                <div>Sévérité : <strong className="text-white uppercase">{selectedIncident.severity}</strong></div>
                <div>Statut : <strong className="text-white uppercase">{selectedIncident.status}</strong></div>
                <div>Action : <span className="text-slate-300">{selectedIncident.actionTaken}</span></div>
                {selectedIncident.perpetratorTag && (
                  <div>Auteur : <span className="text-slate-300">{selectedIncident.perpetratorTag}</span></div>
                )}
                <div>Date : <span className="text-slate-300">{new Date(selectedIncident.createdAt).toLocaleString('fr-FR')}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              {selectedIncident.status === 'open' && (
                <button
                  onClick={() => handleResolveIncident(selectedIncident.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marquer comme Résolu</span>
                </button>
              )}
              <button
                onClick={() => setSelectedIncident(null)}
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
