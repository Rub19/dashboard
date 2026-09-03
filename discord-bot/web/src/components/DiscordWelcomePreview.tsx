import React from 'react';
import { BrandMark } from './BrandMark';
import { WelcomeEmbedConfig, WelcomeImageConfig } from '../types';

interface DiscordWelcomePreviewProps {
  botName: string;
  messageContent: string;
  embed: WelcomeEmbedConfig;
  image: WelcomeImageConfig;
  serverName: string;
  memberCount: number;
}

export const DiscordWelcomePreview: React.FC<DiscordWelcomePreviewProps> = ({
  botName,
  messageContent,
  embed,
  image,
  serverName,
  memberCount,
}) => {
  // Remplacement factice des variables pour l'aperçu
  const replaceVars = (str: string) => {
    return str
      .replace(/\{user\}/gi, '@Rub')
      .replace(/\{mention\}/gi, '@Rub')
      .replace(/\{username\}/gi, 'rub19')
      .replace(/\{displayname\}/gi, 'Rub')
      .replace(/\{userid\}/gi, '1128633164290596884')
      .replace(/\{server\}/gi, serverName || 'Mon Serveur')
      .replace(/\{serverid\}/gi, '1128633164290596884')
      .replace(/\{membercount\}/gi, memberCount.toLocaleString('fr-FR'))
      .replace(/\{channel\}/gi, '#bienvenue')
      .replace(/\{createdat\}/gi, 'il y a 2 ans');
  };

  const parsedContent = replaceVars(messageContent);
  const parsedTitle = replaceVars(embed.title);
  const parsedDesc = replaceVars(embed.description);
  const parsedAuthor = replaceVars(embed.authorName);
  const parsedFooter = replaceVars(embed.footer);

  const cardTitle = replaceVars(image.titleText);
  const cardSubtitle = replaceVars(image.subtitleText);
  const cardTag = replaceVars(image.tagText);

  return (
    <div className="bg-[#313338] rounded-xl p-4 sm:p-5 text-[#DBDEE1] font-sans text-sm shadow-xl border border-white/[0.04] select-none">
      {/* Entête du message Discord */}
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-full bg-[#1e1f22] p-1.5 flex items-center justify-center shrink-0 border border-white/5">
          <BrandMark className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-[15px]">{botName || 'Ethone Bot'}</span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              BOT
            </span>
            <span className="text-[11px] text-[#949BA4]">Aujourd’hui à 21:30</span>
          </div>

          {/* Contenu textuel standard */}
          {parsedContent && (
            <div className="text-[14px] leading-relaxed text-[#DBDEE1] whitespace-pre-wrap break-words">
              {parsedContent.split(' ').map((word, i) => {
                if (word.startsWith('@Rub')) {
                  return (
                    <span
                      key={i}
                      className="bg-[#5865F2]/20 text-[#C9CDFB] px-1 py-0.5 rounded font-medium mr-1"
                    >
                      {word}
                    </span>
                  );
                }
                return word + ' ';
              })}
            </div>
          )}

          {/* Embed Discord */}
          {embed.enabled && (
            <div
              className="mt-2.5 max-w-lg rounded-lg bg-[#2B2D31] p-3.5 space-y-3 border-l-4"
              style={{ borderLeftColor: embed.color || '#5865F2' }}
            >
              {/* Auteur */}
              {parsedAuthor && (
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <div className="w-5 h-5 rounded-full bg-[#1e1f22] flex items-center justify-center text-[10px]">
                    👤
                  </div>
                  <span>{parsedAuthor}</span>
                </div>
              )}

              {/* Titre */}
              {parsedTitle && (
                <div className="font-bold text-white text-[15px] leading-snug">
                  {parsedTitle}
                </div>
              )}

              {/* Description */}
              {parsedDesc && (
                <div className="text-[13px] text-[#DBDEE1] leading-relaxed whitespace-pre-wrap">
                  {parsedDesc}
                </div>
              )}

              {/* Carte Image de Bienvenue */}
              {image.enabled && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-gradient-to-r from-[#08080C] via-[#0E1017] to-[#08080A] p-4 relative shadow-inner">
                  <div
                    className="absolute -left-10 -top-10 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: image.accentColor || '#8B5CF6' }}
                  />

                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="w-16 h-16 rounded-full p-0.5 shrink-0 shadow-lg"
                      style={{ backgroundColor: image.accentColor || '#8B5CF6' }}
                    >
                      <div className="w-full h-full rounded-full bg-[#1e1f22] flex items-center justify-center text-xl">
                        👤
                      </div>
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div
                        className="text-[11px] font-bold tracking-widest uppercase font-mono"
                        style={{ color: image.accentColor || '#8B5CF6' }}
                      >
                        {cardTitle || 'BIENVENUE'}
                      </div>
                      <div className="text-base font-bold text-white truncate">
                        {cardSubtitle || 'Rub'}
                      </div>
                      <div className="text-xs text-slate-400 font-medium truncate">
                        {cardTag || `Membre #${memberCount.toLocaleString('fr-FR')}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              {parsedFooter && (
                <div className="text-[11px] text-[#949BA4] pt-1 flex items-center gap-2">
                  <span>{parsedFooter}</span>
                  {embed.showTimestamp && (
                    <>
                      <span>•</span>
                      <span>21:30</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Carte seule si Embed désactivé mais Image activée */}
          {!embed.enabled && image.enabled && (
            <div className="mt-2 max-w-lg rounded-lg overflow-hidden border border-white/10 bg-gradient-to-r from-[#08080C] via-[#0E1017] to-[#08080A] p-4 relative shadow-inner">
              <div
                className="absolute -left-10 -top-10 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ backgroundColor: image.accentColor || '#8B5CF6' }}
              />

              <div className="flex items-center gap-4 relative z-10">
                <div
                  className="w-16 h-16 rounded-full p-0.5 shrink-0 shadow-lg"
                  style={{ backgroundColor: image.accentColor || '#8B5CF6' }}
                >
                  <div className="w-full h-full rounded-full bg-[#1e1f22] flex items-center justify-center text-xl">
                    👤
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div
                    className="text-[11px] font-bold tracking-widest uppercase font-mono"
                    style={{ color: image.accentColor || '#8B5CF6' }}
                  >
                    {cardTitle || 'BIENVENUE'}
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {cardSubtitle || 'Rub'}
                  </div>
                  <div className="text-xs text-slate-400 font-medium truncate">
                    {cardTag || `Membre #${memberCount.toLocaleString('fr-FR')}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
