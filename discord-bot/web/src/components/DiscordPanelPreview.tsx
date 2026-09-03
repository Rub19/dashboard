import React from 'react';
import { BrandMark } from './BrandMark';
import { TicketCategory, TicketPanel } from '../types';

interface DiscordPanelPreviewProps {
  botName: string;
  serverName: string;
  panel: TicketPanel;
  categories: TicketCategory[];
}

export const DiscordPanelPreview: React.FC<DiscordPanelPreviewProps> = ({
  botName,
  serverName,
  panel,
  categories,
}) => {
  const selectedCategories =
    panel.categoryIds.length > 0
      ? categories.filter((c) => panel.categoryIds.includes(c.id))
      : categories;

  return (
    <div className="bg-[#313338] rounded-xl p-4 sm:p-5 text-[#DBDEE1] font-sans text-sm shadow-xl border border-white/[0.04] select-none">
      {/* Entête du message Discord */}
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-full bg-[#1e1f22] p-1.5 flex items-center justify-center shrink-0 border border-white/5">
          <BrandMark className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-[15px]">{botName || 'Ethone Bot'}</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              BOT
            </span>
            <span className="text-[11px] text-[#949BA4]">Aujourd’hui à 21:40</span>
          </div>

          {/* Embed du Panel */}
          <div
            className="rounded-lg bg-[#2B2D31] p-4 space-y-2.5 border-l-4 max-w-lg"
            style={{ borderLeftColor: panel.color || '#5865F2' }}
          >
            <div className="font-bold text-white text-base leading-snug">
              {panel.title || '🎫 Support & Assistance'}
            </div>

            <div className="text-[13px] text-[#DBDEE1] leading-relaxed whitespace-pre-wrap">
              {panel.description ||
                'Besoin d’aide ? Cliquez sur l’un des boutons ci-dessous pour ouvrir un ticket auprès de notre équipe.'}
            </div>

            <div className="text-[11px] text-[#949BA4] pt-2 border-t border-white/[0.04]">
              {serverName} • Système de Support
            </div>
          </div>

          {/* Boutons d'action sous l'embed */}
          <div className="flex flex-wrap gap-2 pt-1 max-w-lg">
            {selectedCategories.length === 1 ? (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-xs transition-colors shadow-sm"
              >
                <span>{selectedCategories[0].emoji || '🎫'}</span>
                <span>{panel.buttonLabel || `Ouvrir un ticket (${selectedCategories[0].name})`}</span>
              </button>
            ) : selectedCategories.length > 1 ? (
              selectedCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#4E5058] hover:bg-[#6D6F78] text-white font-medium text-xs transition-colors shadow-sm"
                >
                  <span>{cat.emoji || '🎫'}</span>
                  <span>{cat.name}</span>
                </button>
              ))
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#5865F2] text-white font-medium text-xs shadow-sm"
              >
                <span>🎫</span>
                <span>{panel.buttonLabel || 'Créer un ticket'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
