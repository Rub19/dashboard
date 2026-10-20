"use client";

import { Fragment, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ExternalLink, ImageIcon, Loader2 } from "lucide-react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { formatOf, iconSources, type IconSource, type MessageCommon, type Meta } from "./types";
import { tx } from "@/lib/tx";

export type Viewer = { name: string; username: string; avatar: string | null; id: string };

/** Remplace les variables comme le bot le fera, avec toi dans le rôle du nouveau membre. */
export function fillVars(t: string, v: Viewer, meta: Meta, mention: boolean): string {
  const n = meta.memberCount || 1;
  return t
    .replace(/\{user\}/gi, mention ? `\u0000@${v.name}\u0000` : v.name)
    .replace(/\{mention\}/gi, `\u0000@${v.name}\u0000`)
    .replace(/\{username\}/gi, v.username)
    .replace(/\{displayname\}/gi, v.name)
    .replace(/\{userid\}/gi, v.id)
    .replace(/\{server\}/gi, meta.guildName)
    .replace(/\{membercount\.ordinal\}/gi, n === 1 ? "1er" : `${n.toLocaleString("fr-FR")}e`)
    .replace(/\{(membercount|usercount)\}/gi, n.toLocaleString("fr-FR"))
    .replace(/\{accountage\}/gi, "2 ans")
    .replace(/\{createdat\}/gi, "01/01/2024")
    .replace(/\{serverowner\}/gi, "Propriétaire")
    .replace(/\{channel\}/gi, "\u0000#bienvenue\u0000");
}

/** Markdown Discord de base : gras, italique, souligné, code, liens masqués et mentions. */
function Md({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\u0000[^\u0000]*\u0000|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith("\u0000")) return <span key={i} className="rounded bg-[#5865F2]/30 px-0.5 font-medium text-[#C9CDFB]">{p.slice(1, -1)}</span>;
        if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("__")) return <u key={i}>{p.slice(2, -2)}</u>;
        if (p.startsWith("`")) return <code key={i} className="rounded bg-black/30 px-1 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
        if (p.startsWith("[")) {
          const m = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(p);
          return <span key={i} className="text-[#00A8FC]">{m?.[1] ?? p}</span>;
        }
        if (p.startsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}

function Img({ src, className }: { src: string | null; className?: string }) {
  if (!src) return null;
   
  return <img src={src} alt="" className={className} />;
}

type Props = {
  message: MessageCommon & { mentionUser?: boolean; asServer?: boolean };
  meta: Meta;
  viewer: Viewer;
  dm?: boolean;
  card: { url: string | null; loading: boolean; failed: boolean } | null;
};

/** Aperçu façon Discord du message tel qu'Etho l'enverra. */
export default function DiscordPreview({ message, meta, viewer, dm, card }: Props) {
  const e = message.embed;
  const format = formatOf(message);
  const src = iconSources(e, dm);
  const fill = (t: string, mention = !dm) => fillVars(t ?? "", viewer, meta, mention);
  const icon = (s: IconSource, url: string | null) => (s === "member" ? viewer.avatar : s === "server" ? meta.guildIcon : s === "custom" ? url : null);
  const author = message.asServer && !dm ? { name: meta.guildName, avatar: meta.guildIcon, app: false } : { name: meta.botName, avatar: meta.botAvatar, app: true };
  const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const mention = message.mentionUser && !dm ? `\u0000@${viewer.name}\u0000` : "";
  const above = format === "text" ? fill(message.messageContent) : fill(message.contentAbove);
  const content = mention && !above.includes(mention) ? [mention, above].filter(Boolean).join(" ") : above;
  const buttons = (message.buttons ?? []).filter((b) => b.action === "URL" && b.label);
  const bigImage = card ? card : src.image !== "none" ? { url: icon(src.image, e.imageUrl), loading: false, failed: false } : null;
  const thumb = icon(src.thumbnail, e.thumbnailUrl);
  const footer = [fill(e.footer, false), e.showTimestamp ? `Aujourd'hui à ${now}` : ""].filter(Boolean).join(" • ");

  const cardImage = bigImage && (
    <div className="mt-3 overflow-hidden rounded-md bg-black/20">
      {bigImage.url ? (
        <motion.img key={bigImage.url} initial={{ opacity: 0.4 }} animate={{ opacity: bigImage.loading ? 0.7 : 1 }} src={bigImage.url} alt="" className="block w-full" />
      ) : (
        <div className="grid aspect-[16/7] place-items-center text-[11px] text-white/50">
          <span className="flex flex-col items-center gap-1.5">
            {bigImage.failed ? <ImageIcon className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            {bigImage.failed ? tx("Aperçu indisponible") : tx("Rendu de l'image…")}
          </span>
        </div>
      )}
    </div>
  );

  const buttonRow = buttons.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-2">
      {buttons.map((b) => (
        <span key={b.id} className="flex items-center gap-1.5 rounded-[3px] bg-[#4E5058] px-4 py-1.5 text-[13px] font-medium text-white">
          {b.label}
          <ExternalLink className="h-3 w-3" />
        </span>
      ))}
    </div>
  );

  let body: ReactNode = null;
  if (format === "embed") {
    body = (
      <div className="mt-1 flex max-w-[432px] overflow-hidden rounded-[4px] bg-[#2B2D31]">
        <div className="w-1 shrink-0" style={{ background: /^#[0-9a-f]{6}$/i.test(e.color) ? e.color : "#202225" }} />
        <div className="min-w-0 flex-1 p-3 pr-4">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {e.authorName && (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                  <Img src={icon(src.author, e.authorIconUrl)} className="h-6 w-6 rounded-full object-cover" />
                  <span className="truncate">{fill(e.authorName, false)}</span>
                </div>
              )}
              {e.title && <p className={cn("text-[15px] font-semibold", e.url ? "text-[#00A8FC]" : "text-white")}><Md text={fill(e.title, false)} /></p>}
              {e.description && <Md text={fill(e.description)} className="block text-[13.5px] leading-[1.4] text-[#DBDEE1]" />}
              {e.fields.length > 0 && (
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 pt-1">
                  {e.fields.map((f) => (
                    <div key={f.id} className={f.inline ? "col-span-1" : "col-span-3"}>
                      <p className="text-[13px] font-semibold text-white"><Md text={fill(f.name, false)} /></p>
                      <Md text={fill(f.value)} className="block text-[13px] text-[#DBDEE1]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {thumb && <Img src={thumb} className="h-20 w-20 shrink-0 rounded-md object-cover" />}
          </div>
          {cardImage}
          {footer && (
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-[#B5BAC1]">
              <Img src={icon(src.footer, e.footerIconUrl)} className="h-5 w-5 rounded-full object-cover" />
              <span className="truncate">{footer}</span>
            </div>
          )}
        </div>
      </div>
    );
  } else if (format === "container") {
    body = (
      <div className="mt-1 max-w-[460px] overflow-hidden rounded-lg border border-white/5 bg-[#2B2D31]" style={{ borderLeft: `4px solid ${/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : "transparent"}` }}>
        <div className="space-y-2 p-4">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {e.authorName && <p className="text-[12px] text-[#B5BAC1]">{fill(e.authorName, false)}</p>}
              {e.title && <p className={cn("text-[17px] font-bold", e.url ? "text-[#00A8FC]" : "text-white")}>{fill(e.title, false)}</p>}
              {e.description && <Md text={fill(e.description)} className="block text-[14px] leading-[1.4] text-[#DBDEE1]" />}
            </div>
            {thumb && <Img src={thumb} className="h-[84px] w-[84px] shrink-0 rounded-lg object-cover" />}
          </div>
          {e.fields.map((f) => (
            <div key={f.id}>
              <p className="text-[14px] font-bold text-white">{fill(f.name, false)}</p>
              <Md text={fill(f.value)} className="block text-[14px] text-[#DBDEE1]" />
            </div>
          ))}
          {cardImage}
          {footer && (
            <>
              <div className="my-2 h-px bg-white/10" />
              <p className="text-[12px] text-[#B5BAC1]">{footer}</p>
            </>
          )}
          {buttonRow}
        </div>
      </div>
    );
  } else if (card) {
    body = <div className="max-w-[432px]">{cardImage}</div>;
  }

  return (
    <motion.div layout transition={SPRING_LAYOUT} className="rounded-xl bg-[#313338] p-4 font-[system-ui] shadow-inner">
      <div className="flex gap-3">
        {author.avatar ? (
           
          <img src={author.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#5865F2]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-medium text-white">{author.name}</span>
            {author.app && <span className="rounded-[3px] bg-[#5865F2] px-1 py-px text-[10px] font-semibold leading-tight text-white">{tx("APP")}</span>}
            <span className="text-[11px] text-[#949BA4]">{tx("Aujourd'hui à")}{" "} {now}</span>
          </div>
          {content && <Md text={content} className="block text-[15px] leading-[1.375] text-[#DBDEE1]" />}
          {body}
          {format !== "container" && buttonRow}
        </div>
      </div>
    </motion.div>
  );
}
