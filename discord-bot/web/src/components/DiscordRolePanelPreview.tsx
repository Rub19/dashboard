import React from 'react';
import { BrandMark } from './BrandMark';
import { RolePanel } from '../types';
import { ChevronDown } from 'lucide-react';

interface DiscordRolePanelPreviewProps {
  botName: string;
  serverName: string;
  panel: RolePanel;
}

export const DiscordRolePanelPreview: React.FC<DiscordRolePanelPreviewProps> = ({
  botName,
  serverName,
  panel,
}) => {
  return (
    <div className="bg-[#313338] rounded-xl p-4 sm:p-5 text-[#DBDEE1] font-sans text-sm shadow-xl border border-white/[0.04] select-none">
      {/* Entête du message Discord */}
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-full bg-[#1e1f22] p-1.5 flex items-center justify-center shrink-0 border border-white/5">
          <BrandMark className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-[15px]">{botName || 'Ethone Bot'}</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              BOT
            </span>
            <span className="text-[11px] text-[#949BA4]">Aujourd’hui à 21:45</span>
          </div>

          {/* Embed du Panel */}
          <div
            className="rounded-lg bg-[#2B2D31] p-4 space-y-2.5 border-l-4 max-w-lg"
            style={{ borderLeftColor: panel.color || '#5865F2' }}
          >
            <div className="font-bold text-white text-base leading-snug">
              {panel.title || '🎭 Choisissez vos Rôles'}
            </div>

            {panel.description && (
              <div className="text-[13px] text-[#DBDEE1] leading-relaxed whitespace-pre-wrap">
                {panel.description}
              </div>
            )}

            <div className="text-[11px] text-[#949BA4] pt-2 border-t border-white/[0.04]">
              {panel.footer || `${serverName} • Système de Rôles`}
            </div>
          </div>

          {/* Composants : Boutons ou Select Menu */}
          <div className="max-w-lg pt-1">
            {panel.componentType === 'buttons' ? (
              <div className="flex flex-wrap gap-2">
                {panel.items.length === 0 ? (
                  <div className="text-xs text-[#949BA4] italic py-1">
                    (Aucun bouton configuré pour l'instant)
                  </div>
                ) : (
                  panel.items.map((item) => {
                    let bg = 'bg-[#4E5058] hover:bg-[#6D6F78]'; // Secondary
                    if (item.style === 'Primary') bg = 'bg-[#5865F2] hover:bg-[#4752C4]';
                    if (item.style === 'Success') bg = 'bg-[#23A55A] hover:bg-[#1E8B4C]';
                    if (item.style === 'Danger') bg = 'bg-[#DA373C] hover:bg-[#A1282D]';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-white font-medium text-xs transition-colors shadow-sm ${bg}`}
                      >
                        {item.emoji && <span>{item.emoji}</span>}
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-3 py-2 rounded bg-[#2B2D31] border border-white/[0.08] text-xs text-[#DBDEE1]">
                  <span>{panel.placeholder || 'Sélectionnez vos rôles...'}</span>
                  <ChevronDown className="w-4 h-4 text-[#949BA4]" />
                </div>
                {panel.items.length > 0 && (
                  <div className="text-[11px] text-[#949BA4] flex items-center gap-1">
                    <span>Options disponibles :</span>
                    <span className="text-slate-300">
                      {panel.items.map((i) => i.label).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
