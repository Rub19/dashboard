import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { OverviewData } from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Activity,
  ArrowUpRight,
  Clock,
  Hash,
  Terminal,
  Users,
  Wifi,
} from 'lucide-react';

interface OverviewPageProps {
  guildId: string;
  onNavigate: (path: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ guildId, onNavigate }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getOverview(guildId)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [guildId]);

  const formatUptime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#101217] border border-white/[0.08] p-6 rounded-xl text-center text-rose-400 text-xs">
        Erreur de chargement des données : {error || 'Serveur indisponible'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Bannière Serveur sobre */}
      <div className="bg-[#101217] border border-white/[0.08] p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {data.guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png?size=128`}
              alt={data.guild.name}
              className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 text-indigo-300 font-bold text-lg flex items-center justify-center border border-white/10">
              {data.guild.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-white tracking-tight">
                {data.guild.name}
              </h1>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connecté
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Bot : <span className="text-slate-200">{data.config.botName}</span> • Préfixe : <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[11px]">{data.config.prefix}</code>
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/settings/appearance')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white transition-colors"
        >
          <span>Personnaliser</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Grille de Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Membres */}
        <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Membres</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {data.guild.memberCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.guild.channelsCount} salons • {data.guild.rolesCount} rôles
          </div>
        </div>

        {/* Commandes Serveur */}
        <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Commandes</span>
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {data.stats.totalCommands.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Exécutées sur ce serveur
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Disponibilité</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatUptime(data.botStatus.uptimeMs)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            En ligne sans interruption
          </div>
        </div>

        {/* Ping Gateway */}
        <div className="bg-[#101217] border border-white/[0.06] p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Latence</span>
            <Wifi className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {data.botStatus.pingMs} ms
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            WebSocket Discord
          </div>
        </div>
      </div>

      {/* 2 Colonnes : Réglages & Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Réglages Rapides */}
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Réglages Rapides
            </h3>
            <button
              onClick={() => onNavigate('/settings/commands')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Modifier
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Préfixe</span>
              <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white">
                {data.config.prefix}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Commandes Textuelles</span>
              <span className={data.config.prefixCommandsEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                {data.config.prefixCommandsEnabled ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Slash Commands ( / )</span>
              <span className={data.config.slashCommandsEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                {data.config.slashCommandsEnabled ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Langue</span>
              <span className="uppercase text-white font-mono">{data.config.language}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Fuseau</span>
              <span className="text-slate-200">{data.config.timezone}</span>
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Dernières Commandes
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Temps réel</span>
          </div>

          {data.stats.recentActivities.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Aucune commande exécutée récemment.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] uppercase bg-white/5 text-slate-300 px-1.5 py-0.5 rounded">
                      {act.type}
                    </span>
                    <span className="font-mono text-white font-medium">
                      {act.type === 'slash' ? `/${act.commandName}` : `${data.config.prefix}${act.commandName}`}
                    </span>
                    <span className="text-slate-400 text-[11px]">par {act.userTag}</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
