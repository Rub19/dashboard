"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { BotLang } from "./botLandingI18n";

type Tab = "shield" | "sanction" | "music" | "lyrics" | "welcome";

const T: Record<BotLang, Record<string, string>> = {
  fr: {
    channel: "général",
    today: "Aujourd'hui à",
    tabShield: "🛡️ Anti-raid",
    tabSanction: "⚖️ Sanctions",
    tabMusic: "🎵 Musique",
    tabLyrics: "🎤 Paroles",
    tabWelcome: "👋 Bienvenue",
    raidAuthor: "Protection · Anti-raid",
    raidTitle: "Raid bloqué",
    raidDesc: "**12 comptes** ont rejoint en 8 secondes avec des liens frauduleux. Le serveur est verrouillé le temps que l'équipe vérifie.",
    raidAction: "Action",
    raidActionV: "Bannissement",
    raidRepaired: "Réparé",
    raidRepairedV: "37 messages supprimés",
    raidLock: "Verrouillage",
    raidLockV: "Actif",
    raidFooter: "Etho · Protection",
    unlock: "Déverrouiller",
    audit: "Voir le journal",
    deleted: "Message supprimé par Etho",
    warnTitle: "⚠️ Avertissement · #128",
    member: "Membre",
    moderator: "Modérateur",
    reason: "Raison",
    reasonV: "Publicité en message privé",
    points: "⚖️ 2 points · expire dans 30 jours",
    total: "📋 3 sanctions au total",
    history: "Historique",
    undo: "Annuler (10 s)",
    playing: "En cours de lecture",
    requested: "Demandé par",
    queue: "File d'attente",
    pause: "Pause",
    play: "Lecture",
    skip: "Suivant",
    loop: "Boucle",
    lyricsTitle: "Paroles",
    lyricsSource: "Paroles synchronisées · LRCLib",
    copy: "Copier",
    copied: "Copié !",
    welcomeLine: "Bienvenue {user} sur **ETHONE Community**, tu es notre **1 428e** membre !",
    welcomeTitle: "Un nouveau membre !",
    welcomeCard: "BIENVENUE",
    welcomeSub: "Tu es notre 1 428e membre",
    rules: "Règlement",
    roles: "Choisir mes rôles",
  },
  en: {
    channel: "general",
    today: "Today at",
    tabShield: "🛡️ Anti-raid",
    tabSanction: "⚖️ Sanctions",
    tabMusic: "🎵 Music",
    tabLyrics: "🎤 Lyrics",
    tabWelcome: "👋 Welcome",
    raidAuthor: "Protection · Anti-raid",
    raidTitle: "Raid blocked",
    raidDesc: "**12 accounts** joined within 8 seconds with scam links. The server is locked while the team checks.",
    raidAction: "Action",
    raidActionV: "Ban",
    raidRepaired: "Repaired",
    raidRepairedV: "37 messages deleted",
    raidLock: "Lockdown",
    raidLockV: "Active",
    raidFooter: "Etho · Protection",
    unlock: "Unlock",
    audit: "View log",
    deleted: "Message deleted by Etho",
    warnTitle: "⚠️ Warning · #128",
    member: "Member",
    moderator: "Moderator",
    reason: "Reason",
    reasonV: "Advertising in DMs",
    points: "⚖️ 2 points · expires in 30 days",
    total: "📋 3 sanctions in total",
    history: "History",
    undo: "Undo (10 s)",
    playing: "Now playing",
    requested: "Requested by",
    queue: "Queue",
    pause: "Pause",
    play: "Play",
    skip: "Skip",
    loop: "Loop",
    lyricsTitle: "Lyrics",
    lyricsSource: "Synced lyrics · LRCLib",
    copy: "Copy",
    copied: "Copied!",
    welcomeLine: "Welcome {user} to **ETHONE Community**, you are our **1,428th** member!",
    welcomeTitle: "A new member!",
    welcomeCard: "WELCOME",
    welcomeSub: "You are our 1,428th member",
    rules: "Rules",
    roles: "Pick my roles",
  },
  es: {
    channel: "general",
    today: "Hoy a las",
    tabShield: "🛡️ Anti-raid",
    tabSanction: "⚖️ Sanciones",
    tabMusic: "🎵 Música",
    tabLyrics: "🎤 Letras",
    tabWelcome: "👋 Bienvenida",
    raidAuthor: "Protección · Anti-raid",
    raidTitle: "Raid bloqueado",
    raidDesc: "**12 cuentas** se unieron en 8 segundos con enlaces fraudulentos. El servidor queda bloqueado mientras el equipo revisa.",
    raidAction: "Acción",
    raidActionV: "Baneo",
    raidRepaired: "Reparado",
    raidRepairedV: "37 mensajes eliminados",
    raidLock: "Bloqueo",
    raidLockV: "Activo",
    raidFooter: "Etho · Protección",
    unlock: "Desbloquear",
    audit: "Ver el registro",
    deleted: "Mensaje eliminado por Etho",
    warnTitle: "⚠️ Advertencia · #128",
    member: "Miembro",
    moderator: "Moderador",
    reason: "Razón",
    reasonV: "Publicidad por mensaje privado",
    points: "⚖️ 2 puntos · caduca en 30 días",
    total: "📋 3 sanciones en total",
    history: "Historial",
    undo: "Deshacer (10 s)",
    playing: "Reproduciendo",
    requested: "Pedido por",
    queue: "Cola",
    pause: "Pausa",
    play: "Reproducir",
    skip: "Siguiente",
    loop: "Repetir",
    lyricsTitle: "Letra",
    lyricsSource: "Letra sincronizada · LRCLib",
    copy: "Copiar",
    copied: "¡Copiado!",
    welcomeLine: "¡Bienvenido {user} a **ETHONE Community**, eres nuestro miembro **n.º 1428**!",
    welcomeTitle: "¡Un nuevo miembro!",
    welcomeCard: "BIENVENIDO",
    welcomeSub: "Eres nuestro miembro n.º 1428",
    rules: "Reglas",
    roles: "Elegir mis roles",
  },
  de: {
    channel: "allgemein",
    today: "Heute um",
    tabShield: "🛡️ Anti-Raid",
    tabSanction: "⚖️ Sanktionen",
    tabMusic: "🎵 Musik",
    tabLyrics: "🎤 Songtexte",
    tabWelcome: "👋 Willkommen",
    raidAuthor: "Schutz · Anti-Raid",
    raidTitle: "Raid blockiert",
    raidDesc: "**12 Konten** sind in 8 Sekunden mit Betrugslinks beigetreten. Der Server ist gesperrt, bis das Team prüft.",
    raidAction: "Aktion",
    raidActionV: "Bann",
    raidRepaired: "Repariert",
    raidRepairedV: "37 Nachrichten gelöscht",
    raidLock: "Sperre",
    raidLockV: "Aktiv",
    raidFooter: "Etho · Schutz",
    unlock: "Entsperren",
    audit: "Protokoll ansehen",
    deleted: "Nachricht von Etho gelöscht",
    warnTitle: "⚠️ Verwarnung · #128",
    member: "Mitglied",
    moderator: "Moderator",
    reason: "Grund",
    reasonV: "Werbung per Privatnachricht",
    points: "⚖️ 2 Punkte · läuft in 30 Tagen ab",
    total: "📋 3 Sanktionen insgesamt",
    history: "Verlauf",
    undo: "Rückgängig (10 s)",
    playing: "Läuft gerade",
    requested: "Angefragt von",
    queue: "Warteschlange",
    pause: "Pause",
    play: "Abspielen",
    skip: "Weiter",
    loop: "Wiederholen",
    lyricsTitle: "Songtext",
    lyricsSource: "Synchronisierter Text · LRCLib",
    copy: "Kopieren",
    copied: "Kopiert!",
    welcomeLine: "Willkommen {user} auf **ETHONE Community**, du bist unser **1.428.** Mitglied!",
    welcomeTitle: "Ein neues Mitglied!",
    welcomeCard: "WILLKOMMEN",
    welcomeSub: "Du bist unser 1.428. Mitglied",
    rules: "Regeln",
    roles: "Meine Rollen wählen",
  },
};

/** Gras Discord (**texte**) et mention (@Alex) dans une ligne d'exemple. */
function Md({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|\{user\})/g).map((p, i) =>
        p === "{user}" ? (
          <span key={i} className="rounded-[3px] bg-[#5865F2]/30 px-0.5 font-medium text-[#C9CDFB]">
            @Alex
          </span>
        ) : p.startsWith("**") ? (
          <strong key={i} className="font-semibold text-[#F2F3F5]">
            {p.slice(2, -2)}
          </strong>
        ) : (
          p
        )
      )}
    </>
  );
}

function Message({ time, today, children, author = "Etho", app = true, avatar }: { time: string; today: string; children: ReactNode; author?: string; app?: boolean; avatar?: ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-1">
      {avatar ?? <Image src="/branding/ethone-discord-avatar-v2.png" alt="Etho" width={40} height={40} unoptimized className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 leading-[1.375rem]">
          <span className="text-[15px] font-medium text-[#F2F3F5]">{author}</span>
          {app && (
            <span className="flex h-[15px] items-center gap-0.5 rounded-[3px] bg-[#5865F2] px-1 text-[10px] font-semibold leading-none text-white">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
                <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1L13.4 4.4z" />
              </svg>
              APP
            </span>
          )}
          <span className="ml-1 text-xs text-[#949BA4]">
            {today} {time}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Embed({ color, children, thumb }: { color: string; children: ReactNode; thumb?: ReactNode }) {
  return (
    <div className="mt-1 grid max-w-[432px] grid-cols-[auto_1fr] overflow-hidden rounded-[4px] bg-[#2B2D31]">
      <div className="w-1" style={{ background: color }} />
      <div className="flex gap-4 py-2 pl-3 pr-4">
        <div className="min-w-0 flex-1 space-y-2 py-1">{children}</div>
        {thumb}
      </div>
    </div>
  );
}

const Field = ({ name, value, inline = true }: { name: string; value: ReactNode; inline?: boolean }) => (
  <div className={inline ? "min-w-0" : "col-span-3"}>
    <p className="text-[13px] font-semibold text-[#F2F3F5]">{name}</p>
    <p className="text-[13px] text-[#DBDEE1]">{value}</p>
  </div>
);

function Btn({ children, tone = "secondary", onClick }: { children: ReactNode; tone?: "primary" | "secondary" | "success" | "danger"; onClick?: () => void }) {
  const bg = { primary: "bg-[#5865F2] hover:bg-[#4752C4]", secondary: "bg-[#4E5058] hover:bg-[#6D6F78]", success: "bg-[#248046] hover:bg-[#1A6334]", danger: "bg-[#DA373C] hover:bg-[#A12828]" }[tone];
  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClick} className={`flex h-8 min-w-[60px] items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white transition-colors ${bg}`}>
      {children}
    </motion.button>
  );
}

/** Aperçu des messages d'Etho, rendu comme dans Discord (thème sombre), dans la langue du site. */
export default function DiscordShowcase({ lang }: { lang: BotLang }) {
  const t = T[lang];
  const [tab, setTab] = useState<Tab>("shield");
  const [playing, setPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const tabs: Array<[Tab, string]> = [
    ["shield", t.tabShield],
    ["sanction", t.tabSanction],
    ["music", t.tabMusic],
    ["lyrics", t.tabLyrics],
    ["welcome", t.tabWelcome],
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-black/40 bg-[#313338] text-left shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)]" style={{ fontFamily: "'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center gap-2 border-b border-black/30 px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <span className="text-xl leading-none text-[#80848E]">#</span>
        <span className="text-[15px] font-semibold text-[#F2F3F5]">{t.channel}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-black/20 bg-[#2B2D31] px-2 py-1.5 [scrollbar-width:none]">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`relative shrink-0 rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors ${tab === id ? "text-[#F2F3F5]" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>
            {tab === id && <motion.span layoutId="showcase-tab" className="absolute inset-0 rounded-[4px] bg-[#404249]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[340px] py-4 text-[15px] leading-[1.375rem] text-[#DBDEE1]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-3">
            {tab === "shield" && (
              <>
                <Message time="21:04" today={t.today} author="FreeNitro_Bot" app={false} avatar={<div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ED4245] text-sm font-bold text-white">F</div>}>
                  <p className="text-[#949BA4] line-through">@everyone FREE NITRO 👉 discord-gift.ru/claim</p>
                  <p className="text-xs italic text-[#949BA4]">{t.deleted}</p>
                </Message>
                <Message time="21:04" today={t.today}>
                  <Embed color="#ED4245">
                    <p className="text-sm font-semibold text-[#F2F3F5]">{t.raidAuthor}</p>
                    <p className="text-base font-semibold text-[#F2F3F5]">{t.raidTitle}</p>
                    <p className="text-sm text-[#DBDEE1]">
                      <Md text={t.raidDesc} />
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Field name={t.raidAction} value={t.raidActionV} />
                      <Field name={t.raidRepaired} value={t.raidRepairedV} />
                      <Field name={t.raidLock} value={t.raidLockV} />
                    </div>
                    <p className="text-xs text-[#B5BAC1]">
                      {t.raidFooter} • {t.today} 21:04
                    </p>
                  </Embed>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Btn tone="success">🔓 {t.unlock}</Btn>
                    <Btn>📋 {t.audit}</Btn>
                  </div>
                </Message>
              </>
            )}

            {tab === "sanction" && (
              <Message time="18:32" today={t.today}>
                <div className="mt-1 max-w-[440px] overflow-hidden rounded-lg border border-white/5 bg-[#2B2D31]" style={{ borderLeft: "4px solid #F0B232" }}>
                  <div className="space-y-2 p-4">
                    <div className="flex gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-lg font-bold text-[#F2F3F5]">{t.warnTitle}</p>
                        <p className="text-sm">
                          <strong className="text-[#F2F3F5]">{t.member} :</strong> <span className="rounded-[3px] bg-[#5865F2]/30 px-0.5 text-[#C9CDFB]">@Max</span>
                        </p>
                        <p className="text-sm">
                          <strong className="text-[#F2F3F5]">{t.moderator} :</strong> <span className="rounded-[3px] bg-[#5865F2]/30 px-0.5 text-[#C9CDFB]">@Rub</span>
                        </p>
                      </div>
                      <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#F0B232] to-[#ED4245] text-3xl font-bold text-white">M</div>
                    </div>
                    <p className="text-sm">
                      <strong className="text-[#F2F3F5]">{t.reason} :</strong> {t.reasonV}
                    </p>
                    <div className="h-px bg-white/10" />
                    <p className="text-xs text-[#B5BAC1]">
                      {t.total} · {t.points}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Btn>📋 {t.history}</Btn>
                      <Btn tone="danger">{t.undo}</Btn>
                    </div>
                  </div>
                </div>
              </Message>
            )}

            {tab === "music" && (
              <Message time="22:15" today={t.today}>
                <Embed
                  color="#92C8D2"
                  thumb={<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[4px] bg-gradient-to-br from-[#8E2DE2] via-[#ED4245] to-[#F0B232]"><motion.div className="absolute inset-3 rounded-full border-4 border-black/40" animate={{ rotate: playing ? 360 : 0 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} /></div>}
                >
                  <p className="text-sm font-semibold text-[#F2F3F5]">🎵 {t.playing}</p>
                  <p className="text-base font-semibold text-[#00A8FC]">Starboy</p>
                  <p className="text-sm">The Weeknd, Daft Punk</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-[#B5BAC1]">
                    1:42
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.span className="block h-full rounded-full bg-[#92C8D2]" animate={{ width: playing ? ["44%", "52%"] : "44%" }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                    </span>
                    3:50
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field name={t.requested} value={<span className="rounded-[3px] bg-[#5865F2]/30 px-0.5 text-[#C9CDFB]">@Alex</span>} />
                    <Field name={t.queue} value="4" />
                    <Field name={t.loop} value="—" />
                  </div>
                </Embed>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Btn tone="primary" onClick={() => setPlaying((p) => !p)}>
                    {playing ? `⏸ ${t.pause}` : `▶ ${t.play}`}
                  </Btn>
                  <Btn>⏭ {t.skip}</Btn>
                  <Btn>🔁 {t.loop}</Btn>
                </div>
              </Message>
            )}

            {tab === "lyrics" && (
              <Message time="23:02" today={t.today}>
                <Embed color="#A78BFA">
                  <p className="text-base font-semibold text-[#F2F3F5]">
                    {t.lyricsTitle} · Blinding Lights — The Weeknd
                  </p>
                  <div className="space-y-0.5 text-sm">
                    <p className="text-[#949BA4]">I&apos;ve been tryna call</p>
                    <p className="font-semibold text-[#F2F3F5]">I&apos;ve been on my own for long enough</p>
                    <p className="text-[#949BA4]">Maybe you can show me how to love, maybe</p>
                  </div>
                  <p className="text-xs text-[#B5BAC1]">{t.lyricsSource}</p>
                </Embed>
                <div className="mt-2 flex gap-2">
                  <Btn
                    onClick={() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? `✓ ${t.copied}` : `📋 ${t.copy}`}
                  </Btn>
                </div>
              </Message>
            )}

            {tab === "welcome" && (
              <Message time="19:47" today={t.today}>
                <p>
                  <Md text={t.welcomeLine} />
                </p>
                <div className="mt-1 max-w-[432px] overflow-hidden rounded-lg">
                  <div className="relative flex aspect-[1024/450] flex-col items-center justify-center bg-gradient-to-br from-[#1E1F22] to-[#5865F2] text-white">
                    <motion.div className="h-[26%] w-auto rounded-full bg-gradient-to-br from-[#92C8D2] to-[#5865F2] ring-[3px] ring-white" style={{ aspectRatio: "1" }} animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.0)", "0 0 24px 6px rgba(255,255,255,0.25)", "0 0 0 0 rgba(255,255,255,0.0)"] }} transition={{ duration: 2.4, repeat: Infinity }} />
                    <p className="mt-2 text-[clamp(18px,6vw,30px)] font-bold leading-none tracking-wide" style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}>
                      {t.welcomeCard}
                    </p>
                    <p className="text-sm font-bold">Alex</p>
                    <p className="text-[11px] text-white/80">{t.welcomeSub}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Btn>📜 {t.rules} ↗</Btn>
                  <Btn tone="primary">🎭 {t.roles}</Btn>
                </div>
              </Message>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
