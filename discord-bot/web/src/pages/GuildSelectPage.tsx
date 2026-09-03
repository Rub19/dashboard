import React from 'react';
import { useGuild } from '../context/GuildContext';
import { Crown, Plus, RefreshCw, Server, Settings } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

interface GuildSelectPageProps {
  onSelectGuild: (guildId: string) => void;
}

export const GuildSelectPage: React.FC<GuildSelectPageProps> = ({ onSelectGuild }) => {
  const { guilds, loading, refreshGuilds } = useGuild();

  const handleInvite = (guildId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1545139931154878464&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
    window.open(inviteUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* En-tête sobre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Gestion</span>
            <span>/</span>
            <span className="text-slate-200">Serveurs Discord</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Sélectionnez un serveur
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Seuls les serveurs où vous disposez des permissions Administrateur ou Gérer le serveur sont listés.
          </p>
        </div>

        <button
          onClick={() => refreshGuilds()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* État de chargement */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : guilds.length === 0 ? (
        <div className="bg-[#101217] border border-white/[0.08] rounded-xl p-10 text-center max-w-md mx-auto space-y-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Aucun serveur administrable</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vous devez être propriétaire ou administrateur d'un serveur Discord pour le gérer ici.
          </p>
        </div>
      ) : (
        /* Grille des serveurs */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guilds.map((guild) => (
            <div
              key={guild.id}
              onClick={() => {
                if (guild.botPresent) {
                  onSelectGuild(guild.id);
                }
              }}
              className={`bg-[#101217] border p-4 rounded-xl flex flex-col justify-between transition-colors ${
                guild.botPresent
                  ? 'border-white/[0.08] hover:border-indigo-500/40 cursor-pointer'
                  : 'border-white/[0.04] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
                      alt={guild.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-sm border border-white/10">
                      {guild.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {guild.botPresent ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Bot Présent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400">
                      Non Invité
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-white text-sm truncate">{guild.name}</h3>
                    {guild.owner && (
                      <span title="Propriétaire">
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {guild.memberCount !== null
                      ? `${guild.memberCount.toLocaleString()} membres`
                      : 'Serveur Discord'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                {guild.botPresent ? (
                  <button
                    onClick={() => onSelectGuild(guild.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium text-xs transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurer</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleInvite(guild.id, e)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-medium text-xs border border-white/[0.06] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inviter le bot</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
