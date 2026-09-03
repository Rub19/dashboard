import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GuildConfig } from '../types';
import { Skeleton } from '../components/Skeleton';
import { Save, Terminal, Zap } from 'lucide-react';

interface CommandsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CommandsPage: React.FC<CommandsPageProps> = ({ guildId, onShowToast }) => {
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [prefix, setPrefix] = useState('!');
  const [prefixEnabled, setPrefixEnabled] = useState(true);
  const [slashEnabled, setSlashEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getSettings(guildId)
      .then((res) => {
        if (!isMounted) return;
        setConfig(res.config);
        setPrefix(res.config.prefix);
        setPrefixEnabled(res.config.prefixCommandsEnabled);
        setSlashEnabled(res.config.slashCommandsEnabled);
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (prefix.length < 1 || prefix.length > 5 || /\s/.test(prefix)) {
      onShowToast('Le préfixe doit contenir 1 à 5 caractères sans espace.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateSettings(guildId, {
        prefix,
        prefixCommandsEnabled: prefixEnabled,
        slashCommandsEnabled: slashEnabled,
      });

      setConfig(res.config);
      onShowToast('Configuration des commandes enregistrée.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête sobre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Configuration</span>
            <span>/</span>
            <span className="text-slate-200">Commandes</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Commandes & Préfixe
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Activez les types de commandes désirés et personnalisez le préfixe textuel.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors w-full sm:w-auto shadow-sm"
        >
          {saving ? (
            <span className="text-xs">Sauvegarde...</span>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Sauvegarder</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {/* Toggle Slash Commands */}
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="font-medium text-white text-xs">Slash Commands ( / )</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Commandes natives avec auto-complétion et validation des paramètres (ex: <code className="bg-white/5 px-1 py-0.5 rounded text-slate-300 font-mono text-[11px]">/help</code>, <code className="bg-white/5 px-1 py-0.5 rounded text-slate-300 font-mono text-[11px]">/ping</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSlashEnabled(!slashEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              slashEnabled ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                slashEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle Prefix Commands */}
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="font-medium text-white text-xs">Commandes Textuelles (Préfixe)</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Commandes déclenchées par un message standard débutant par le préfixe configuré.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPrefixEnabled(!prefixEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              prefixEnabled ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefixEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Préfixe */}
        <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Préfixe Personnalisé
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Caractère(s) de déclenchement des commandes dans le chat Discord.
            </p>
          </div>

          <div className="max-w-xs">
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.trim())}
              maxLength={5}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              placeholder="!"
            />
          </div>

          <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>Syntaxe d'aide :</span>
            <code className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-mono text-xs">
              {prefix}help
            </code>
            <span>ou</span>
            <code className="px-2 py-0.5 rounded bg-white/5 text-slate-200 font-mono text-xs">
              /help
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
