"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ToastProvider";
import {
  Download,
  Copy,
  Check,
  Share2,
  Sparkles,
  X,
  ExternalLink,
} from "@/components/icons/ph";
import type { ValorantAccountProfile, ValorantComputedStats } from "@/lib/valorant-provider";
import { calculateAgentStats } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";

export interface PlayerCardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: ValorantAccountProfile | null;
  stats?: ValorantComputedStats | null;
  matches?: ValorantMatch[];
  riotName?: string;
  riotTag?: string;
  isEn?: boolean;
}

export default function PlayerCardExportModal({
  isOpen,
  onClose,
  profile,
  stats,
  matches = [],
  riotName = "Agent",
  riotTag = "ETH",
  isEn = false,
}: PlayerCardExportModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { success, error: showError } = useToast();
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [rendering, setRendering] = useState(true);

  const cleanName = profile?.name || riotName || "Agent";
  const cleanTag = (profile?.tag || riotTag || "ETH").replace(/^#/, "");
  const tierName = profile?.currentTierPatched || (isEn ? "Unranked" : "Non classé");
  const rankRating = typeof profile?.rr === "number" ? profile.rr : 0;
  const level = profile?.accountLevel || 1;

  const topAgent = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const agentList = calculateAgentStats(matches);
    return agentList.length > 0 ? agentList[0] : null;
  }, [matches]);

  const hsPercent = useMemo<number | null>(() => {
    let hs = 0;
    let bs = 0;
    let ls = 0;
    matches.forEach((m) => {
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      const h = me?.stats?.headshots || 0;
      const b = me?.stats?.bodyshots || 0;
      const l = me?.stats?.legshots || 0;
      if (h + b + l > 0) {
        hs += h;
        bs += b;
        ls += l;
      }
    });
    const total = hs + bs + ls;
    if (total > 0) return Math.round((hs / total) * 100);
    if (stats?.headshotPercentage !== null && stats?.headshotPercentage !== undefined) {
      return Math.round(Number(stats.headshotPercentage));
    }
    return null;
  }, [matches, stats]);

  const kdRatio = stats?.kdRatio !== null && stats?.kdRatio !== undefined ? String(stats.kdRatio) : null;
  const winRate = stats?.winRate !== null && stats?.winRate !== undefined ? `${stats.winRate}%` : null;

  const pickEmInfo = useMemo(() => {
    if (typeof window === "undefined") return { points: 0, label: isEn ? "Unranked" : "Non classé" };
    try {
      const raw = localStorage.getItem("ethone:vct:pickems");
      if (raw) {
        const parsed = JSON.parse(raw);
        const count = Object.keys(parsed).length;
        const pts = count * 10;
        let lbl = isEn ? "Bronze Predictor" : "Pronostiqueur Bronze";
        if (pts >= 150) lbl = isEn ? "Radiant Predictor" : "Pronostiqueur Radiant";
        else if (pts >= 100) lbl = isEn ? "Immortal Predictor" : "Pronostiqueur Immortel";
        else if (pts >= 50) lbl = isEn ? "Diamond Predictor" : "Pronostiqueur Diamant";
        else if (pts >= 20) lbl = isEn ? "Gold Predictor" : "Pronostiqueur Or";
        return { points: pts, label: lbl };
      }
    } catch {}
    return { points: 0, label: isEn ? "Initiate" : "Initié" };
  }, [isEn]);

  const renderCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1200;
    const height = 675;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#090c10");
    bgGrad.addColorStop(0.5, "#0e131b");
    bgGrad.addColorStop(1, "#141923");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const rad1 = ctx.createRadialGradient(250, 150, 20, 250, 150, 450);
    rad1.addColorStop(0, "rgba(244, 63, 94, 0.16)");
    rad1.addColorStop(1, "rgba(244, 63, 94, 0)");
    ctx.fillStyle = rad1;
    ctx.fillRect(0, 0, width, height);

    const rad2 = ctx.createRadialGradient(950, 500, 20, 950, 500, 450);
    rad2.addColorStop(0, "rgba(6, 182, 212, 0.14)");
    rad2.addColorStop(1, "rgba(6, 182, 212, 0)");
    ctx.fillStyle = rad2;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cardMargin = 30;
    const cardW = width - cardMargin * 2;
    const cardH = height - cardMargin * 2;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(cardMargin, cardMargin, cardW, cardH, 28);
      ctx.stroke();
    } else {
      ctx.strokeRect(cardMargin, cardMargin, cardW, cardH);
    }
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText("ETHONE VALORANT TELEMETRY", 70, 75);

    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(58, 71, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "12px 'SF Mono', Menlo, Consolas, monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `EPISODE 9 · ${new Date().toLocaleDateString(isEn ? "en-US" : "fr-FR")}`,
      width - 70,
      75
    );
    ctx.textAlign = "left";

    const avatarX = 70;
    const avatarY = 110;
    const avatarSize = 100;

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 24);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
    }

    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cleanName.slice(0, 2).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    ctx.restore();

    const infoX = 195;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.fillText(cleanName, infoX, 150);

    const nameMetrics = ctx.measureText(cleanName);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "bold 24px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(`#${cleanTag}`, infoX + nameMetrics.width + 12, 150);

    const rankPillY = 175;
    ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
    ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(infoX, rankPillY, 210, 32, 16);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(infoX, rankPillY, 210, 32);
    }

    ctx.fillStyle = "#fecdd3";
    ctx.font = "bold 13px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(`${tierName.toUpperCase()} · ${rankRating} RR`, infoX + 16, rankPillY + 20);

    const lvlX = infoX + 225;
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(lvlX, rankPillY, 110, 32, 16);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(lvlX, rankPillY, 110, 32);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "bold 12px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(`NIV. ${level}`, lvlX + 18, rankPillY + 20);

    const bannerX = width - 420;
    const bannerY = 110;
    const bannerW = 350;
    const bannerH = 100;

    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 20);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "11px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(isEn ? "SIGNATURE AGENT" : "AGENT SIGNATURE", bannerX + 20, bannerY + 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    ctx.fillText(topAgent ? topAgent.agentName : isEn ? "No Match Data" : "Aucune Partie", bannerX + 20, bannerY + 62);

    ctx.fillStyle = topAgent ? "#06b6d4" : "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 12px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(
      topAgent
        ? `${topAgent.matches} ${isEn ? "matches" : "parties"} · ${topAgent.winRate}% ${isEn ? "win rate" : "victoires"}`
        : isEn
        ? "Play matches to reveal agent"
        : "Jouez des parties pour révéler l'agent",
      bannerX + 20,
      bannerY + 84
    );

    const tileY = 245;
    const tileH = 170;
    const tileW = 250;
    const gap = 20;
    const startX = 70;

    const tiles = [
      {
        title: isEn ? "HEADSHOT RATIO" : "PRÉCISION TÊTE",
        value: hsPercent !== null ? `${hsPercent}%` : "—",
        sub: hsPercent !== null ? (isEn ? "Headshot hit placement" : "Tirs tête enregistrés") : (isEn ? "No telemetry" : "Aucune télémétrie"),
        color: "#06b6d4",
        border: "rgba(6, 182, 212, 0.3)",
        bg: "rgba(6, 182, 212, 0.08)",
      },
      {
        title: isEn ? "K/D RATIO" : "RATIO K/D",
        value: kdRatio ?? "—",
        sub: kdRatio ? (isEn ? "Kills / Deaths conversion" : "Éliminations / Morts") : (isEn ? "No matches recorded" : "Aucune partie enregistrée"),
        color: "#f43f5e",
        border: "rgba(244, 63, 94, 0.3)",
        bg: "rgba(244, 63, 94, 0.08)",
      },
      {
        title: isEn ? "WIN RATE" : "TAUX DE VICTOIRE",
        value: winRate ?? "—",
        sub: winRate ? (isEn ? "Official match outcomes" : "Parties officielles") : (isEn ? "No matches recorded" : "Aucune partie enregistrée"),
        color: "#10b981",
        border: "rgba(16, 185, 129, 0.3)",
        bg: "rgba(16, 185, 129, 0.08)",
      },
      {
        title: isEn ? "VCT PICK'EMS" : "SCORE PICK'EMS",
        value: `${pickEmInfo.points} PTS`,
        sub: pickEmInfo.label,
        color: "#f59e0b",
        border: "rgba(245, 158, 11, 0.3)",
        bg: "rgba(245, 158, 11, 0.08)",
      },
    ];

    tiles.forEach((t, i) => {
      const curX = startX + i * (tileW + gap);

      ctx.save();
      ctx.fillStyle = t.bg;
      ctx.strokeStyle = t.border;
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(curX, tileY, tileW, tileH, 22);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(curX, tileY, tileW, tileH);
        ctx.strokeRect(curX, tileY, tileW, tileH);
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 11px 'SF Mono', Menlo, Consolas, monospace";
      ctx.fillText(t.title, curX + 22, tileY + 36);

      ctx.fillStyle = t.color;
      ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
      ctx.fillText(t.value, curX + 22, tileY + 98);

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.font = "12px 'SF Mono', Menlo, Consolas, monospace";
      ctx.fillText(t.sub, curX + 22, tileY + 138);

      ctx.restore();
    });

    const quoteY = 445;
    const quoteW = width - 140;
    const quoteH = 105;

    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(70, quoteY, quoteW, quoteH, 20);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "11px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText(isEn ? "TACTICAL SUMMARY" : "VERDICT STRATÉGIQUE", 95, quoteY + 34);

    ctx.fillStyle = "#ffffff";
    ctx.font = "15px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    const summaryText = isEn
      ? `High-caliber competitive performance with ${cleanName} anchoring ${tierName} matchmaking. Strong ${hsPercent}% headshot conversion.`
      : `Performance compétitive de haut calibre avec ${cleanName} solidement positionné en ${tierName}. Précision remarquable de ${hsPercent}% à la tête.`;
    ctx.fillText(summaryText, 95, quoteY + 68);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "11px 'SF Mono', Menlo, Consolas, monospace";
    ctx.fillText("✓ 100% LOCAL PRIVACY · ZERO LOG · VANGUARD FAIR-PLAY", 70, height - 55);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("ethone.app/tracker", width - 70, height - 55);
    ctx.textAlign = "left";

    setRendering(false);
  }, [cleanName, cleanTag, tierName, rankRating, level, topAgent, hsPercent, kdRatio, winRate, pickEmInfo, isEn]);

  useEffect(() => {
    if (isOpen) {
      setRendering(true);
      const timer = setTimeout(() => {
        renderCard();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, renderCard]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ethone-playercard-${cleanName.toLowerCase()}-${cleanTag.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      success(isEn ? "Player Card downloaded!" : "Player Card téléchargée en haute résolution !");
    } catch {
      showError(isEn ? "Unable to download image" : "Impossible d'exporter l'image");
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showError(isEn ? "Failed to generate image" : "Échec de génération de l'image");
          return;
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2500);
            success(isEn ? "Player Card copied to clipboard!" : "Player Card copiée dans le presse-papier !");
          } else {
            handleDownloadImage();
          }
        } catch {
          handleDownloadImage();
        }
      }, "image/png");
    } catch {
      handleDownloadImage();
    }
  };

  const handleCopyDiscord = () => {
    const text = [
      `**🎮 ETHONE VALORANT TELEMETRY — ${cleanName}#${cleanTag}**`,
      `🏆 **Rang :** ${tierName} (${rankRating} RR) · Niv. ${level}`,
      hsPercent !== null ? `🎯 **Précision Tête :** ${hsPercent}%` : null,
      (kdRatio || winRate) ? `⚔️ **K/D :** ${kdRatio ?? "—"} · **Winrate :** ${winRate ?? "—"}` : null,
      topAgent ? `⭐ **Agent Signature :** ${topAgent.agentName} (${topAgent.winRate}% WR)` : null,
      pickEmInfo.points > 0 ? `🔮 **Pick'ems VCT :** ${pickEmInfo.points} PTS (${pickEmInfo.label})` : null,
      `🔗 *Généré sur ETHONE Tracker — 100% Local Vanguard Fair-Play*`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      navigator.clipboard.writeText(text);
      setCopiedDiscord(true);
      setTimeout(() => setCopiedDiscord(false), 2500);
      success(isEn ? "Discord summary copied!" : "Format Discord copié avec succès !");
    } catch {
      showError(isEn ? "Clipboard write failed" : "Échec de la copie");
    }
  };

  const handleShareTwitter = () => {
    const text = isEn
      ? `My official @VALORANT telemetry on @ETHONE: ${cleanName}#${cleanTag} (${tierName}) | ${hsPercent}% HS | ${kdRatio} K/D | ${winRate} WR | Pick'ems: ${pickEmInfo.points} pts. Check your stats on ethone.app!`
      : `Mes statistiques officielles @VALORANT sur ETHONE : ${cleanName}#${cleanTag} (${tierName}) | ${hsPercent}% Headshot | ${kdRatio} K/D | ${winRate} Victoires | Pick'ems : ${pickEmInfo.points} pts. Vérifie tes stats sur ethone.app !`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl backdrop-blur-2xl space-y-5 text-white">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-inner">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white">
                {isEn ? "Export Player Card" : "Exporter ma Player Card"}
              </h2>
              <p className="text-xs font-mono text-neutral-400">
                {isEn
                  ? "Dark Apple Design summary ready for Discord, X and social feeds"
                  : "Visuel Apple sombre récapitulatif pour Discord, X et réseaux sociaux"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-neutral-400 hover:text-white cursor-pointer transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
          <canvas ref={canvasRef} className="w-full h-auto block" />
          {rendering && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                <Sparkles className="h-4 w-4 text-cyan-400 animate-spin" />
                <span>{isEn ? "Rendering HD Player Card..." : "Génération de la Player Card HD..."}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiscord}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-mono font-semibold text-neutral-200 hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
            >
              {copiedDiscord ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedDiscord ? (isEn ? "Copied!" : "Copié !") : isEn ? "Discord Text" : "Format Discord"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareTwitter}
              className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-mono font-semibold text-sky-300 hover:bg-sky-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{isEn ? "Share on X" : "Partager sur X"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyImage}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-xs font-mono font-bold text-cyan-200 hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {copiedImage ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedImage ? (isEn ? "Copied!" : "Image Copiée !") : isEn ? "Copy Image" : "Copier l'Image"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-lg shadow-rose-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isEn ? "Download HD PNG" : "Télécharger PNG (HD)"}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
