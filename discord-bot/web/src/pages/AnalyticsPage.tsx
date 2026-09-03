import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AnalyticsOverview, TimeRangePeriod } from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  HelpCircle,
  Layers,
  MessageSquare,
  Mic,
  Minus,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

interface AnalyticsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ guildId, onShowToast }) => {
  const [period, setPeriod] = useState<TimeRangePeriod>('7d');
  const [activeTab, setActiveTab] = useState<'activity' | 'members' | 'moderation' | 'health'>('activity');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.getAnalyticsOverview(guildId, period);
      setData(res);
      if (isManualRefresh) {
        onShowToast('Données analytiques actualisées.', 'success');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors du chargement des analyses.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId, period]);

  const handleExport = (format: 'json' | 'csv') => {
    const url = api.exportAnalytics(guildId, period, format);
    window.open(url, '_blank');
    onShowToast(`Exportation au format ${format.toUpperCase()} lancée.`, 'info');
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Jours pour la heatmap
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Max value pour la heatmap
  const maxHeatmapVal = Math.max(...data.peakHeatmap.map((c) => c.value), 1);

  // Max value pour le graphique temporel
  const maxMessagesVal = Math.max(...data.timeSeries.map((p) => p.messages), 1);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre ETHONE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Système</span>
            <span>/</span>
            <span className="text-slate-200">Analytics & Server Insights</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Centre d'Analyse du Serveur
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métriques d'activité, santé du serveur, rétention et tendances d'engagement en temps réel.
          </p>
        </div>

        {/* Contrôles de période & Exports */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur de Période */}
          <div className="flex items-center p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-mono">
            {(['24h', '7d', '30d', '90d'] as TimeRangePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === '24h' ? '24 Heures' : p === '7d' ? '7 Jours' : p === '30d' ? '30 Jours' : '90 Jours'}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Boutons d'export */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SCORE DE SANTÉ DU SERVEUR & INSIGHTS AUTOMATIQUES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score de santé du serveur */}
        <div className="lg:col-span-5 bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Server Health Score
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                data.healthScore.status === 'excellent'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : data.healthScore.status === 'good'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {data.healthScore.status}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
              {data.healthScore.score}
            </span>
            <span className="text-sm font-mono text-slate-500">/100</span>
          </div>

          {/* Barre de progression visuelle */}
          <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.healthScore.score >= 80
                  ? 'bg-emerald-500'
                  : data.healthScore.score >= 60
                  ? 'bg-indigo-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${data.healthScore.score}%` }}
            />
          </div>

          {/* Facteurs explicatifs */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.04] text-xs">
            <div className="text-[11px] text-slate-400 font-mono">Facteurs d'évaluation :</div>
            {data.healthScore.factors.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <span className="truncate">{f.label}</span>
                <span
                  className={`text-[11px] font-mono font-bold shrink-0 ${
                    f.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {f.impact > 0 ? `+${f.impact}` : f.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed des Insights Automatiques */}
        <div className="lg:col-span-7 bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Insights Automatiques Détectés
            </h3>
          </div>

          <div className="space-y-2.5">
            {data.insights.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono py-6 text-center">
                Aucune anomalie ou tendance particulière sur cette période.
              </div>
            ) : (
              data.insights.map((ins) => (
                <div
                  key={ins.id}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-start gap-3"
                >
                  <div className="mt-0.5 shrink-0">
                    {ins.trend === 'positive' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : ins.trend === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ins.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Généré à partir des événements enregistrés sur la période {period}.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GRILLE DE KPIS PRINCIPAUX AVEC % ÉVOLUTION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.kpis).map(([key, kpi]) => (
          <div
            key={key}
            className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl space-y-2"
          >
            <div className="text-xs text-slate-400 font-mono truncate">{kpi.label}</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold text-white font-mono">
                {kpi.current.toLocaleString()}
                {kpi.unit ? ` ${kpi.unit}` : ''}
              </span>

              <div
                className={`flex items-center text-xs font-mono font-semibold ${
                  kpi.trend === 'up'
                    ? 'text-emerald-400'
                    : kpi.trend === 'down'
                    ? 'text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {kpi.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {kpi.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                {kpi.trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                <span>
                  {kpi.percentageChange > 0 ? `+${kpi.percentageChange}%` : `${kpi.percentageChange}%`}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Précédent : {kpi.previous.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. NAVIGATION PAR ONGLET D'ANALYSE DÉTAILLÉE */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Activité & Salons</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Membres & Rétention</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'moderation'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Modération & Sécurité</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
            activeTab === 'health'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Commandes & Bot Health</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 1 : ACTIVITÉ & SALONS */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Graphique temporel des messages */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Volume de Messages sur la Période ({period})
              </h3>
              <span className="text-[11px] text-indigo-400 font-mono font-bold">
                {data.kpis.messages.current.toLocaleString()} messages au total
              </span>
            </div>

            {/* Bâtonnets / Area Chart SVG responsive */}
            <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-white/[0.06]">
              {data.timeSeries.map((point, idx) => {
                const heightPct = Math.max(4, Math.round((point.messages / maxMessagesVal) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    <div
                      className="w-full bg-indigo-500/30 group-hover:bg-indigo-500 rounded-t transition-all duration-200"
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Tooltip au survol */}
                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-black/90 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 border border-white/10">
                      <span>{point.timestamp}</span>
                      <span className="text-indigo-300 font-bold">{point.messages} msgs</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>{data.timeSeries[0]?.timestamp || ''}</span>
              <span>Évolution temporelle</span>
              <span>{data.timeSeries[data.timeSeries.length - 1]?.timestamp || ''}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Channels */}
            <div className="lg:col-span-5 bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Salons Textuels les Plus Actifs
              </h3>

              <div className="space-y-3">
                {data.topChannels.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono py-8 text-center">
                    Aucun message enregistré dans les salons textuels.
                  </div>
                ) : (
                  data.topChannels.map((c) => (
                    <div key={c.channelId} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold text-white">#{c.channelName}</span>
                        <span className="font-mono text-slate-400">
                          {c.messageCount} ({c.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${c.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Peak Hours Heatmap */}
            <div className="lg:col-span-7 bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Heatmap d'Activité Horaire (Jours × Heures)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Intensité 0h ➔ 23h</span>
              </div>

              <div className="space-y-1 overflow-x-auto">
                {daysOfWeek.map((dayName, dIdx) => {
                  const dayCells = data.peakHeatmap.filter((c) => c.day === dIdx);
                  return (
                    <div key={dIdx} className="flex items-center gap-1">
                      <span className="w-7 text-[10px] font-mono text-slate-400">{dayName}</span>
                      <div className="flex items-center gap-0.5 flex-1 min-w-[340px]">
                        {dayCells.map((cell) => {
                          const intensity = cell.value / maxHeatmapVal;
                          const bg =
                            cell.value === 0
                              ? 'bg-white/[0.02]'
                              : intensity < 0.25
                              ? 'bg-indigo-950/40 text-indigo-300'
                              : intensity < 0.6
                              ? 'bg-indigo-700/50'
                              : 'bg-indigo-500';

                          return (
                            <div
                              key={cell.hour}
                              className={`flex-1 h-5 rounded-xs transition-colors hover:ring-1 hover:ring-white ${bg}`}
                              title={`${dayName} à ${cell.hour}h : ${cell.value} événement(s)`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500 font-mono pt-1">
                <span>Moins actif</span>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded-xs bg-white/[0.02]" />
                  <div className="w-3 h-3 rounded-xs bg-indigo-950/40" />
                  <div className="w-3 h-3 rounded-xs bg-indigo-700/50" />
                  <div className="w-3 h-3 rounded-xs bg-indigo-500" />
                </div>
                <span>Plus actif</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 2 : MEMBRES & RÉTENTION */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Arrivées sur la période</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                +{data.kpis.members.current - data.kpis.members.previous > 0
                  ? data.timeSeries.reduce((s, p) => s + p.joins, 0)
                  : 0}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Départs sur la période</div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                -{data.timeSeries.reduce((s, p) => s + p.leaves, 0)}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Croissance Nette</div>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {data.timeSeries.reduce((s, p) => s + p.joins, 0) -
                  data.timeSeries.reduce((s, p) => s + p.leaves, 0) >=
                0
                  ? `+${
                      data.timeSeries.reduce((s, p) => s + p.joins, 0) -
                      data.timeSeries.reduce((s, p) => s + p.leaves, 0)
                    }`
                  : data.timeSeries.reduce((s, p) => s + p.joins, 0) -
                    data.timeSeries.reduce((s, p) => s + p.leaves, 0)}
              </div>
            </div>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Flux des Membres (Arrivées vs Départs)
            </h3>

            <div className="divide-y divide-white/[0.04]">
              {data.timeSeries.map((point, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">{point.timestamp}</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-emerald-400">+{point.joins} arrivées</span>
                    <span className="text-rose-400">-{point.leaves} départs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 3 : MODÉRATION & SÉCURITÉ */}
      {/* ========================================================================= */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Avertissements</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {data.moderationBreakdown.warn || 0}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Mises en Sourdine</div>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {data.moderationBreakdown.timeout || 0}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Expulsions (Kicks)</div>
              <div className="text-2xl font-bold text-orange-400 font-mono mt-1">
                {data.moderationBreakdown.kick || 0}
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Bannissements</div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {data.moderationBreakdown.ban || 0}
              </div>
            </div>
          </div>

          <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Statut Sécurité & Anti-Raid
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Le module Anti-Raid et Anti-Spam assure la surveillance du serveur. Les incidents interceptés
              sont enregistrés dans le journal d'audit centralisé du bot.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOUS-ONGLET 4 : COMMANDES & BOT HEALTH */}
      {/* ========================================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Métriques Santé Système */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Statut du Bot</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-white uppercase font-mono">
                  {data.botHealth.status}
                </span>
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Latence Gateway (Ping)</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {data.botHealth.pingMs} ms
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Mémoire Vive (RAM)</div>
              <div className="text-xl font-bold text-indigo-400 font-mono mt-1">
                {data.botHealth.memoryMb} MB
              </div>
            </div>

            <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
              <div className="text-xs text-slate-400 font-mono">Temps de Fonctionnement</div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {Math.floor(data.botHealth.uptimeSeconds / 3600)}h {Math.floor((data.botHealth.uptimeSeconds % 3600) / 60)}m
              </div>
            </div>
          </div>

          {/* Top Commandes */}
          <div className="bg-[#101217] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Commandes les Plus Sollicitées
            </h3>

            <div className="space-y-3">
              {data.topCommands.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono py-8 text-center">
                  Aucune commande enregistrée sur cette période.
                </div>
              ) : (
                data.topCommands.map((c) => (
                  <div key={c.command} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-white font-mono">/{c.command}</span>
                      <span className="font-mono text-slate-400">
                        {c.count} exécutions ({c.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
