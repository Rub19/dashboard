import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGuild } from '../context/GuildContext';
import { ChevronDown, LogOut, Menu, Server, X } from 'lucide-react';
import { BrandMark } from './BrandMark';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { guilds, selectedGuild, selectGuild } = useGuild();
  const [isGuildDropdownOpen, setIsGuildDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-white/[0.08] bg-[#0A0B0E]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Côté Gauche : Menu mobile + Vrai Logo ETHONE */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <a href="/" className="flex items-center gap-2.5 group">
          <BrandMark size={28} />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white tracking-tight text-sm">
              ETHONE
            </span>
            <span className="text-[10px] font-mono text-slate-400">/</span>
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Bot
            </span>
          </div>
        </a>

        {/* Séparateur */}
        <div className="hidden md:block h-4 w-[1px] bg-white/[0.08] mx-2" />

        {/* Sélecteur de Serveur sobre */}
        {selectedGuild && (
          <div className="relative">
            <button
              onClick={() => setIsGuildDropdownOpen(!isGuildDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium transition-colors"
            >
              {selectedGuild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=64`}
                  alt={selectedGuild.name}
                  className="w-4 h-4 rounded-md object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded bg-white/10 text-white flex items-center justify-center text-[9px] font-bold">
                  {selectedGuild.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="max-w-[130px] truncate text-slate-200">{selectedGuild.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Menu Déroulant */}
            {isGuildDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsGuildDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#101217] border border-white/10 shadow-2xl z-30 py-2">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Changer de serveur
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {guilds.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          selectGuild(g.id);
                          setIsGuildDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                          selectedGuild.id === g.id ? 'bg-indigo-600/15 text-indigo-400 font-medium' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {g.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`}
                              alt={g.name}
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-white/10 text-slate-300 flex items-center justify-center text-[9px] font-bold">
                              {g.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{g.name}</span>
                        </div>
                        {g.botPresent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.08] pt-1 mt-1 px-2">
                    <a
                      href="/guilds"
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Server className="w-3.5 h-3.5" />
                      Voir tous les serveurs
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Côté Droit : Statut du bot + Profil utilisateur */}
      <div className="flex items-center gap-3">
        {/* Statut Gateway sobre */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Connecté</span>
        </div>

        {/* Profil utilisateur connecté */}
        {user && (
          <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-white/[0.08]">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
                  alt={user.username}
                  className="w-7 h-7 rounded-full border border-white/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left leading-tight">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[110px]">
                  {user.globalName || user.username}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">@{user.username}</div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Déconnexion"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
