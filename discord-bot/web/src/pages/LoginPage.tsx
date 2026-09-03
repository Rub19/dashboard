import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Terminal } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithDiscord, devLogin } = useAuth();
  const [loadingDev, setLoadingDev] = useState(false);

  const handleDevLogin = async () => {
    setLoadingDev(true);
    try {
      await devLogin();
    } finally {
      setLoadingDev(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30">
      {/* Header épuré */}
      <header className="h-16 border-b border-white/[0.06] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            ⚡
          </div>
          <span className="font-semibold text-white tracking-tight text-sm">ETHONE</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Gateway active</span>
        </div>
      </header>

      {/* Centre : Carte d'authentification sobre et directe */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#10121A] border border-white/[0.08] rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Connexion au Dashboard
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sélectionnez et configurez vos serveurs Discord, vos commandes et vos modules en temps réel.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Bouton principal Discord OAuth */}
            <button
              onClick={loginWithDiscord}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-xs shadow-md hover:shadow-indigo-500/20 transition-all duration-150"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Continuer avec Discord</span>
            </button>

            {/* Accès Développeur Rapide */}
            <button
              onClick={handleDevLogin}
              disabled={loadingDev}
              className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white font-medium text-xs transition-all"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>{loadingDev ? 'Connexion en cours...' : 'Accès Développeur Rapide'}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Bot v1.0.0</span>
            <span>Local / VPS</span>
          </div>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="h-12 border-t border-white/[0.06] px-6 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>ETHONE Dashboard</span>
        <span>Node.js / Bun</span>
      </footer>
    </div>
  );
};
