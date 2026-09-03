import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ChannelItem,
  LogCategory,
  LogConfig,
  LogEntry,
  LogOverview,
} from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Filter,
  FolderTree,
  Hash,
  Layers,
  Layout,
  MessageSquare,
  Radio,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react';

interface LogsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORIES_META: { key: LogCategory; label: string; icon: any; color: string }[] = [
  { key: 'members', label: 'Membres', icon: Users, color: '#3B82F6' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, color: '#EF4444' },
  { key: 'roles', label: 'Rôles', icon: Shield, color: '#8B5CF6' },
  { key: 'channels', label: 'Salons', icon: FolderTree, color: '#10B981' },
  { key: 'moderation', label: 'Modération', icon: AlertTriangle, color: '#F59E0B' },
  { key: 'tickets', label: 'Tickets', icon: FileText, color: '#6366F1' },
  { key: 'voice', label: 'Vocal', icon: Volume2, color: '#06B6D4' },
  { key: 'server', label: 'Serveur', icon: Settings, color: '#EC4899' },
];

export const LogsPage: React.FC<LogsPageProps> = ({ guildId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'channels' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Données
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [overview, setOverview] = useState<LogOverview | null>(null);
  const [config, setConfig] = useState<LogConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Explorateur
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<LogEntry | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, cfgRes, chanRes] = await Promise.all([
        api.getLogOverview(guildId),
        api.getLogConfig(guildId),
        api.getChannels(guildId),
      ]);

      setOverview(ovRes);
      setConfig(cfgRes.config);
      setChannels(chanRes.channels);
      await loadEvents();
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.getLogEvents(guildId, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        period: selectedPeriod,
        search: searchQuery || undefined,
        limit: 50,
      });
      setEvents(res.entries);
      setTotalEvents(res.total);
    } catch (err: any) {
      onShowToast(err.message || 'Erreur chargement événements', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  useEffect(() => {
    if (!loading) {
      loadEvents();
    }
  }, [selectedCategory, selectedPeriod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents();
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await api.updateLogConfig(guildId, config);
      setConfig(res.config);
      onShowToast('Configuration des logs enregistrée avec succès !', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
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
            <span className="text-slate-200">Logs & Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Journaux d'Audit & Surveillance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Surveillance en direct des messages, membres, rôles, salons, modération et activité vocale.
          </p>
        </div>

        {(activeTab === 'channels' || activeTab === 'settings') && (
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
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'explorer'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Explorateur d'Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'channels'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Salons de Logs</span>
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
          <span>Paramètres & Rétention</span>
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
              <div className="text-xs text-slate-400 font-mono">Événements (24h)</div>
              <div className="text-2xl font-bold text-white mt-1">{overview.todayTotal}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Messages Supprimés</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">{overview.deletedMessagesToday}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Actions Modération</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{overview.modActionsToday}</div>
            </div>
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Arrivées / Départs</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                +{overview.membersJoinedToday} / -{overview.membersLeftToday}
              </div>
            </div>
          </div>

          {/* Répartition par catégorie */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Répartition par Catégorie (Dernières 24h)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES_META.map((c) => {
                const count = overview.categoryCounts[c.key] || 0;
                const Icon = c.icon;
                return (
                  <div
                    key={c.key}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                        <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                        <span>{c.label}</span>
                      </span>
                      <span className="text-xs font-bold font-mono text-white">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Derniers Événements Détectés
              </h3>
              <button
                onClick={() => setActiveTab('explorer')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
              >
                Voir tout dans l'explorateur ➔
              </button>
            </div>

            {overview.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucun événement enregistré récemment.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {overview.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: evt.color || '#5865F2' }}
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{evt.title}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-400">
                            {evt.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{evt.description}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                      {new Date(evt.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGLET EXPLORATEUR D'AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          {/* Barre de filtres */}
          <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par membre, ID, salon ou mot-clé..."
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.04] text-xs">
              {/* Filtre Catégorie */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white'
                  }`}
                >
                  Tous
                </button>
                {CATEGORIES_META.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedCategory(c.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors whitespace-nowrap ${
                      selectedCategory === c.key
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Filtre Période */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {['24h', '7d', '30d', 'all'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-2 py-0.5 rounded ${
                      selectedPeriod === p
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p === 'all' ? 'Toujours' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Liste des résultats */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Résultats ({totalEvents})</span>
              <span>50 derniers affichés</span>
            </div>

            {events.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                Aucun événement correspondant aux filtres spécifiés.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 shadow-sm"
                        style={{ backgroundColor: evt.color || '#5865F2' }}
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{evt.title}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                            {evt.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed">{evt.description}</div>
                        {evt.fields && evt.fields.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {evt.fields.map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.02] text-slate-400 border border-white/[0.04]"
                              >
                                <strong className="text-slate-300">{f.name}:</strong> {f.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(evt.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.createdAt).toLocaleTimeString('fr-FR')}
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
      {/* 3. ONGLET SALONS DE LOGS (ROUTING) */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Routage des Salons de Logs</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choisissez si vous préférez centraliser tous les logs dans un salon unique ou assigner un salon distinct pour chaque catégorie.
            </p>
          </div>

          {/* Option salon unique */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">
                  Utiliser un salon unique pour tous les logs
                </span>
                <p className="text-[11px] text-slate-400">
                  Tous les événements activés seront regroupés dans un seul salon Discord.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfig({ ...config, useSingleChannel: !config.useSingleChannel })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.useSingleChannel ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.useSingleChannel ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.useSingleChannel && (
              <div className="pt-2 border-t border-white/[0.04] space-y-1">
                <label className="text-[11px] text-slate-400">Salon Unique de Logs</label>
                <select
                  value={config.singleChannelId || ''}
                  onChange={(e) => setConfig({ ...config, singleChannelId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                >
                  <option value="">-- Recherche automatique (#logs, #mod-logs) --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Salons par catégorie */}
          {!config.useSingleChannel && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Salons Dédiés par Catégorie
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES_META.map((cat) => {
                  const Icon = cat.icon;
                  const catConf = config.categories[cat.key];
                  return (
                    <div
                      key={cat.key}
                      className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        <span className="text-xs font-semibold text-white">{cat.label}</span>
                      </div>

                      <select
                        value={catConf?.channelId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          setConfig({
                            ...config,
                            categories: {
                              ...config.categories,
                              [cat.key]: { ...catConf, channelId: val },
                            },
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#141620] border border-white/[0.08] text-white text-xs"
                      >
                        <option value="">-- Fallback (#logs, #mod-logs) --</option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ONGLET PARAMÈTRES & RÉTENTION */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          {/* Activation globale & Catégories */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white">Activation des Catégories de Logs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {CATEGORIES_META.map((cat) => {
                const Icon = cat.icon;
                const isEnabled = config.categories[cat.key]?.enabled;
                return (
                  <div
                    key={cat.key}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      <span className="text-xs font-medium text-white">{cat.label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = config.categories[cat.key];
                        setConfig({
                          ...config,
                          categories: {
                            ...config.categories,
                            [cat.key]: { ...cur, enabled: !cur?.enabled },
                          },
                        });
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-indigo-600' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rétention des données */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-white">Politique de Rétention des Événements</h3>
            <p className="text-xs text-slate-400">
              Définit la durée de conservation des événements dans la base de données du dashboard. Les anciens logs sont automatiquement purgés pour préserver les performances.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {[
                { days: 7, label: '7 jours' },
                { days: 30, label: '30 jours' },
                { days: 90, label: '90 jours' },
                { days: 0, label: 'Illimité (Conserver)' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setConfig({ ...config, retentionDays: opt.days })}
                  className={`p-3 rounded-lg text-xs font-mono font-medium transition-colors border ${
                    config.retentionDays === opt.days
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DÉTAILS D'UN ÉVÉNEMENT */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101217] border border-white/[0.08] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedEvent.color || '#5865F2' }}
                />
                <h3 className="text-sm font-semibold text-white">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                {selectedEvent.description}
              </div>

              {selectedEvent.fields && selectedEvent.fields.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    Détails des modifications :
                  </span>
                  <div className="space-y-1.5">
                    {selectedEvent.fields.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04] space-y-0.5"
                      >
                        <div className="text-[10px] font-mono text-slate-400 font-semibold">{f.name}</div>
                        <div className="text-slate-200 break-words">{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                <div>Catégorie : <strong className="text-white">{selectedEvent.category}</strong></div>
                <div>Type : <strong className="text-white">{selectedEvent.type}</strong></div>
                <div>ID : <span className="text-slate-300">{selectedEvent.id}</span></div>
                <div>Heure : <span className="text-slate-300">{new Date(selectedEvent.createdAt).toLocaleString('fr-FR')}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              {selectedEvent.messageUrl && (
                <a
                  href={selectedEvent.messageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium border border-indigo-500/30 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Voir le message</span>
                </a>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium"
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
