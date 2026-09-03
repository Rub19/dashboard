import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, User, Sparkles } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* En-tête */}
      <div className="border-b border-ethone-border pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-ethone-accent uppercase tracking-wider mb-1">
          <User className="w-3.5 h-3.5" />
          <span>Profil Utilisateur</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Mon Compte Discord
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gérez votre session et consultez les informations de votre compte connecté.
        </p>
      </div>

      {/* Carte Profil */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`}
              alt={user.username}
              className="w-16 h-16 rounded-2xl border border-white/10 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-ethone-accent text-white flex items-center justify-center font-bold text-2xl shadow-lg">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-white">
              {user.globalName || user.username}
            </h3>
            <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Administrateur Autorisé
              </span>
            </div>
          </div>
        </div>

        {/* Détails du compte */}
        <div className="border-t border-white/5 pt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Identifiant Discord (User ID)</span>
            <span className="font-mono text-white bg-white/5 px-2 py-0.5 rounded">
              {user.id}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-slate-400">Statut de la session</span>
            <span className="text-emerald-400 font-semibold">Active & Chiffrée</span>
          </div>
        </div>

        {/* Bouton de déconnexion */}
        <div className="pt-4 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter du Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
