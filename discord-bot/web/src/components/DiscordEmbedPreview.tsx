import React, { useState } from 'react';
import { BrandMark } from './BrandMark';

interface DiscordEmbedPreviewProps {
  botName: string;
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  errorColor: string;
  infoColor: string;
  emojis: {
    success: string;
    error: string;
    info: string;
  };
  prefix: string;
}

export const DiscordEmbedPreview: React.FC<DiscordEmbedPreviewProps> = ({
  botName,
  primaryColor,
  secondaryColor,
  successColor,
  errorColor,
  infoColor,
  emojis,
  prefix,
}) => {
  const [activeTab, setActiveTab] = useState<'primary' | 'success' | 'error' | 'info'>('primary');

  const getBorderColor = () => {
    switch (activeTab) {
      case 'success':
        return successColor;
      case 'error':
        return errorColor;
      case 'info':
        return infoColor;
      case 'primary':
      default:
        return primaryColor;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'success':
        return `${emojis.success || '✅'} Configuration mise à jour`;
      case 'error':
        return `${emojis.error || '❌'} Erreur d'exécution`;
      case 'info':
        return `${emojis.info || 'ℹ️'} Informations Système`;
      case 'primary':
      default:
        return `🏓 Pong !`;
    }
  };

  const getDescription = () => {
    switch (activeTab) {
      case 'success':
        return `Les nouveaux paramètres du serveur ont été sauvegardés. Le bot utilise désormais le préfixe \`${prefix}\`.`;
      case 'error':
        return `Action impossible : vous ne disposez pas des permissions requises pour exécuter cette commande.`;
      case 'info':
        return `Toutes les commandes sont opérationnelles et synchronisées avec le dashboard web.`;
      case 'primary':
      default:
        return `Latence API : \`38ms\` • WebSocket : \`94ms\``;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Sélecteur de type d'embed */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg border border-white/[0.06] w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('primary')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            activeTab === 'primary'
              ? 'bg-white/10 text-white font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Principale
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('success')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            activeTab === 'success'
              ? 'bg-emerald-500/15 text-emerald-400 font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Succès
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('error')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            activeTab === 'error'
              ? 'bg-rose-500/15 text-rose-400 font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Erreur
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            activeTab === 'info'
              ? 'bg-indigo-500/15 text-indigo-400 font-medium'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Info
        </button>
      </div>

      {/* Rendu Discord Pixel-Perfect */}
      <div className="bg-[#313338] text-[#DBDEE1] rounded-xl p-4 font-sans shadow-xl border border-white/[0.04] max-w-lg">
        {/* Entête du message Discord */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <BrandMark size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white hover:underline cursor-pointer text-sm">
                {botName || 'Ethone Bot'}
              </span>
              <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                APP
              </span>
              <span className="text-[11px] text-[#949BA4] ml-1">Aujourd'hui à 14:32</span>
            </div>

            {/* Embed Discord */}
            <div
              className="mt-2 bg-[#2B2D31] rounded-md p-3.5 border-l-4 transition-colors duration-200"
              style={{ borderLeftColor: getBorderColor() }}
            >
              <h4 className="font-semibold text-white text-sm leading-tight">{getTitle()}</h4>
              <p className="text-xs text-[#DBDEE1] mt-1.5 leading-relaxed">{getDescription()}</p>

              {/* Footer Embed */}
              <div className="mt-3 pt-2 border-t border-[#383A40] flex items-center gap-1.5 text-[11px] text-[#949BA4]">
                <span>{botName || 'Ethone Bot'}</span>
                <span>•</span>
                <span>Aujourd'hui à 14:32</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
