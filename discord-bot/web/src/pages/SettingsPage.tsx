import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GuildConfig } from '../types';
import { DiscordEmbedPreview } from '../components/DiscordEmbedPreview';
import { Skeleton } from '../components/Skeleton';
import { Save } from 'lucide-react';

interface SettingsPageProps {
  guildId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ guildId, onShowToast }) => {
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [botName, setBotName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#5865F2');
  const [secondaryColor, setSecondaryColor] = useState('#4752C4');
  const [successColor, setSuccessColor] = useState('#57F287');
  const [errorColor, setErrorColor] = useState('#ED4245');
  const [infoColor, setInfoColor] = useState('#5865F2');
  const [emojiSuccess, setEmojiSuccess] = useState('✅');
  const [emojiError, setEmojiError] = useState('❌');
  const [emojiInfo, setEmojiInfo] = useState('ℹ️');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getSettings(guildId)
      .then((res) => {
        if (!isMounted) return;
        setConfig(res.config);
        setBotName(res.config.botName);
        setPrimaryColor(res.config.primaryColor);
        setSecondaryColor(res.config.secondaryColor);
        setSuccessColor(res.config.successColor);
        setErrorColor(res.config.errorColor);
        setInfoColor(res.config.infoColor);
        setEmojiSuccess(res.config.emojis.success || '✅');
        setEmojiError(res.config.emojis.error || '❌');
        setEmojiInfo(res.config.emojis.info || 'ℹ️');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await api.updateSettings(guildId, {
        botName,
        primaryColor,
        secondaryColor,
        successColor,
        errorColor,
        infoColor,
        emojis: {
          success: emojiSuccess,
          error: emojiError,
          info: emojiInfo,
          loading: config?.emojis.loading || '⏳',
          settings: config?.emojis.settings || '⚙️',
          prefix: config?.emojis.prefix || '⌨️',
          slash: config?.emojis.slash || '⚡',
        },
      });

      setConfig(res.config);
      onShowToast('Paramètres mis à jour avec succès.', 'success');
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête sobre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <span>Configuration</span>
            <span>/</span>
            <span className="text-slate-200">Apparence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Apparence & Couleurs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personnalisez le nom du bot, les couleurs d'embeds et les emojis du serveur.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors w-full sm:w-auto"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire des Réglages (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* Nom du Bot */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Nom d'affichage
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nom utilisé dans le titre et le pied de page des embeds sur ce serveur.
              </p>
            </div>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              maxLength={32}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Ex: Ethone Bot"
            />
          </div>

          {/* Couleurs HEX */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Couleurs des Embeds
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Codes hexadécimaux pour la bordure latérale des messages.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">HEX</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Principale */}
              <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                <label className="text-xs text-slate-300 font-medium">Couleur Principale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Secondaire */}
              <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                <label className="text-xs text-slate-300 font-medium">Couleur Secondaire</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Succès */}
              <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                <label className="text-xs text-slate-300 font-medium">Succès</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={successColor}
                    onChange={(e) => setSuccessColor(e.target.value.toUpperCase())}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={successColor}
                    onChange={(e) => setSuccessColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Erreur */}
              <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                <label className="text-xs text-slate-300 font-medium">Erreur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={errorColor}
                    onChange={(e) => setErrorColor(e.target.value.toUpperCase())}
                    className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={errorColor}
                    onChange={(e) => setErrorColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    required
                    className="w-full px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emojis */}
          <div className="bg-[#101217] border border-white/[0.06] p-5 rounded-xl space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Emojis Système
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Symboles utilisés dans les titres des notifications.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Succès</label>
                <input
                  type="text"
                  value={emojiSuccess}
                  onChange={(e) => setEmojiSuccess(e.target.value)}
                  maxLength={10}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Erreur</label>
                <input
                  type="text"
                  value={emojiError}
                  onChange={(e) => setEmojiError(e.target.value)}
                  maxLength={10}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Info</label>
                <input
                  type="text"
                  value={emojiInfo}
                  onChange={(e) => setEmojiInfo(e.target.value)}
                  maxLength={10}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-xs text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Colonne Droite : Aperçu Discord en Direct */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Aperçu en Direct Discord
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rendu pixel-perfect avec vos couleurs personnalisées.
            </p>
          </div>

          <DiscordEmbedPreview
            botName={botName}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            successColor={successColor}
            errorColor={errorColor}
            infoColor={infoColor}
            emojis={{
              success: emojiSuccess,
              error: emojiError,
              info: emojiInfo,
            }}
            prefix={config.prefix}
          />
        </div>
      </div>
    </div>
  );
};
