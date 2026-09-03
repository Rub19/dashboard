import React from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Code2,
  ExternalLink,
  Gift,
  HelpCircle,
  Layers,
  Lightbulb,
  Palette,
  Shield,
  ShieldAlert,
  Terminal,
  Ticket,
  Trophy,
  User,
  UserPlus,
} from 'lucide-react';
import { useGuild } from '../context/GuildContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { selectedGuild } = useGuild();

  const navItems = [
    {
      label: 'Overview',
      icon: BarChart3,
      path: '/overview',
      category: 'GÉNÉRAL',
    },
    {
      label: 'Apparence & Couleurs',
      icon: Palette,
      path: '/settings/appearance',
      category: 'CONFIGURATION',
    },
    {
      label: 'Commandes & Préfixe',
      icon: Terminal,
      path: '/settings/commands',
      category: 'CONFIGURATION',
    },
    {
      label: 'Modules',
      icon: Layers,
      path: '/modules',
      category: 'SYSTÈME',
    },
    {
      label: 'Modération',
      icon: Shield,
      path: '/moderation',
      category: 'SYSTÈME',
    },
    {
      label: 'Welcome & Goodbye',
      icon: UserPlus,
      path: '/welcome',
      category: 'SYSTÈME',
    },
    {
      label: 'Tickets',
      icon: Ticket,
      path: '/tickets',
      category: 'SYSTÈME',
    },
    {
      label: 'Logs & Audit',
      icon: Activity,
      path: '/logs',
      category: 'SYSTÈME',
    },
    {
      label: 'Rôles & Auto-Roles',
      icon: Shield,
      path: '/roles',
      category: 'SYSTÈME',
    },
    {
      label: 'Sécurité & Anti-Raid',
      icon: ShieldAlert,
      path: '/security',
      category: 'SYSTÈME',
    },
    {
      label: 'Leveling & XP',
      icon: Trophy,
      path: '/leveling',
      category: 'SYSTÈME',
    },
    {
      label: 'Giveaways & Events',
      icon: Gift,
      path: '/giveaways',
      category: 'SYSTÈME',
    },
    {
      label: 'Server Insights',
      icon: BarChart3,
      path: '/analytics',
      category: 'SYSTÈME',
    },
    {
      label: 'Suggestions & Idées',
      icon: Lightbulb,
      path: '/suggestions',
      category: 'SYSTÈME',
    },
    {
      label: 'Command Builder',
      icon: Code2,
      path: '/commands',
      category: 'OUTILS',
    },
    {
      label: 'Mon Compte',
      icon: User,
      path: '/account',
      category: 'UTILISATEUR',
    },
  ];

  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  const handleItemClick = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Barre latérale */}
      <aside
        className={`fixed lg:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 bg-[#0A0B0E] border-r border-white/[0.08] flex flex-col justify-between transition-transform duration-200 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-3 space-y-5 overflow-y-auto">
          {/* Carte Serveur Actif épurée */}
          {selectedGuild && (
            <div className="bg-[#12141C] p-2.5 rounded-xl border border-white/[0.06] flex items-center gap-2.5">
              {selectedGuild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=64`}
                  alt={selectedGuild.name}
                  className="w-8 h-8 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs border border-white/10">
                  {selectedGuild.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-white text-xs truncate">{selectedGuild.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-slate-400">Actif</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-4">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {cat}
                </div>
                {navItems
                  .filter((item) => item.category === cat)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleItemClick(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                          isActive
                            ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-indigo-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </nav>
        </div>

        {/* Pied de sidebar */}
        <div className="p-3 border-t border-white/[0.08]">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1545139931154878464&permissions=8&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              Inviter le bot
            </span>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded font-mono text-slate-400">v1.0</span>
          </a>
        </div>
      </aside>
    </>
  );
};
