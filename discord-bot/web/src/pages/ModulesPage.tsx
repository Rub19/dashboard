import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ModuleItem } from '../types';
import { Skeleton } from '../components/Skeleton';
import {
  Award,
  Gamepad2,
  Music,
  Scroll,
  Shield,
  Ticket,
  UserPlus,
  Zap,
} from 'lucide-react';

interface ModulesPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  UserPlus,
  Scroll,
  Award,
  Ticket,
  Gamepad2,
  Music,
};

export const ModulesPage: React.FC<ModulesPageProps> = ({ guildId, onShowToast }) => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getModules(guildId)
      .then((res) => {
        if (isMounted) setModules(res.modules);
      })
      .catch((err) => {
        if (isMounted) onShowToast(err.message, 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [guildId]);

  const handleToggle = async (module: ModuleItem) => {
    if (!module.available) {
      onShowToast(`Le module ${module.name} sera bientôt disponible.`, 'info');
      return;
    }

    const nextState = !module.enabled;
    setToggling(module.id);

    try {
      await api.updateModule(guildId, module.id, nextState);
      setModules((prev) =>
        prev.map((m) => (m.id === module.id ? { ...m, enabled: nextState } : m))
      );
      onShowToast(
        `Module ${module.name} ${nextState ? 'activé' : 'désactivé'}.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête */}
      <div className="border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
          <span>Système</span>
          <span>/</span>
          <span className="text-slate-200">Modules</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
          Modules du Bot
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Activez ou désactivez les fonctionnalités selon les besoins de votre serveur.
        </p>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((mod) => {
          const Icon = ICON_MAP[mod.icon] || Zap;
          const isPending = toggling === mod.id;

          return (
            <div
              key={mod.id}
              className={`bg-[#101217] border p-4 rounded-xl flex flex-col justify-between transition-colors ${
                mod.enabled ? 'border-indigo-500/30' : 'border-white/[0.06]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        mod.enabled
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white text-xs">{mod.name}</h3>
                      <div className="mt-0.5">
                        {!mod.available ? (
                          <span className="text-[10px] font-mono text-slate-500">
                            Bientôt
                          </span>
                        ) : mod.enabled ? (
                          <span className="text-[10px] font-mono text-emerald-400">
                            Activé
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            Désactivé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Switch */}
                  <button
                    type="button"
                    disabled={!mod.available || isPending}
                    onClick={() => handleToggle(mod)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-30 ${
                      mod.enabled ? 'bg-indigo-600' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        mod.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{mod.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
