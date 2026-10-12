"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  BookOpen,
  Check,
  Filter,
  Info,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ChannelAdder, Chip, RoleChips, Switch, useGuildApi } from "../kit";

type Trigger = "keyword" | "spam" | "keyword_preset" | "mention_spam" | "member_profile";
type Action = {
  type: "block_message" | "send_alert" | "timeout" | "block_member_interaction";
  channelId?: string;
  durationSeconds?: number;
  customMessage?: string;
};
type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: Trigger | "unknown";
  triggerMetadata: {
    keywordFilter: string[];
    regexPatterns: string[];
    allowList: string[];
    presets: string[];
    mentionTotalLimit: number | null;
    mentionRaidProtectionEnabled: boolean;
  };
  actions: Action[];
  exemptRoles: string[];
  exemptChannels: string[];
};

type Draft = {
  name: string;
  triggerType: Trigger;
  keywords: string[];
  regexPatterns: string[];
  allowList: string[];
  presets: string[];
  mentionTotalLimit: number;
  mentionRaidProtection: boolean;
  actions: Action[];
  exemptRoles: string[];
  exemptChannels: string[];
};

const TRIGGER_LABELS: Record<Trigger, string> = {
  keyword: "Mots-clés",
  mention_spam: "Mentions",
  spam: "Spam",
  keyword_preset: "Listes de Discord",
  member_profile: "Profil des membres",
};

const TIMEOUT_DURATIONS: Array<[number, string]> = [
  [60, "1 min"],
  [300, "5 min"],
  [600, "10 min"],
  [3600, "1 h"],
  [86400, "1 j"],
  [604800, "7 j"],
];

const PRESETS = [
  { id: "profanity", label: "Insultes et grossièretés", hint: "Filtre les termes vulgaires et le langage ordurier répertoriés par Discord." },
  { id: "sexual_content", label: "Contenu sexuel", hint: "Bloque les messages à caractère explicitement sexuel." },
  { id: "slurs", label: "Propos haineux", hint: "Bloque les insultes discriminatoires et incitations à la haine." },
];

const DEFAULT_RECOMMENDED: Array<Draft & { id: string; enabled: boolean }> = [
  {
    id: "rec-nitro",
    name: "ETHONE • Protection Anti-Phishing Nitro",
    triggerType: "keyword",
    keywords: ["*discord-nitro*", "*free-nitro*", "*steamcommunity-nitro*", "*discordgift*", "*discrod*", "*dlscord*", "*steam-gift*"],
    regexPatterns: ["(?i)(nitro|gift).*(free|claim|airdrop)"],
    allowList: [],
    presets: [],
    mentionTotalLimit: 7,
    mentionRaidProtection: false,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : tentative de phishing Nitro." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
  {
    id: "rec-invites",
    name: "ETHONE • Liens et Pub non autorisés",
    triggerType: "keyword",
    keywords: ["*discord.gg/*", "*discord.com/invite/*"],
    regexPatterns: ["(?i)discord\\.(gg|io|me|li)\\/\\w+"],
    allowList: [],
    presets: [],
    mentionTotalLimit: 7,
    mentionRaidProtection: false,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : invitation non autorisée." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
  {
    id: "rec-malware",
    name: "ETHONE • Mots-clés malveillants",
    triggerType: "keyword",
    keywords: ["*token-grabber*", "*ip-grabber*", "*cheat-engine*", "*free-robux*", "*vbucks-generator*"],
    regexPatterns: [],
    allowList: [],
    presets: [],
    mentionTotalLimit: 7,
    mentionRaidProtection: false,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : contenu suspect." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
  {
    id: "rec-presets",
    name: "ETHONE • Grossièretés & Insultes",
    triggerType: "keyword_preset",
    keywords: [],
    regexPatterns: [],
    allowList: [],
    presets: ["profanity", "sexual_content", "slurs"],
    mentionTotalLimit: 7,
    mentionRaidProtection: false,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : langage inapproprié." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
  {
    id: "rec-mentions",
    name: "ETHONE • Spam de Mentions",
    triggerType: "mention_spam",
    keywords: [],
    regexPatterns: [],
    allowList: [],
    presets: [],
    mentionTotalLimit: 7,
    mentionRaidProtection: true,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : trop de mentions." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
  {
    id: "rec-spam",
    name: "ETHONE • Détection Anti-Spam",
    triggerType: "spam",
    keywords: [],
    regexPatterns: [],
    allowList: [],
    presets: [],
    mentionTotalLimit: 7,
    mentionRaidProtection: false,
    actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod : détection de spam." }],
    exemptRoles: [],
    exemptChannels: [],
    enabled: true,
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function testRuleMessage(message: string, d: Draft): { matched: boolean; reason?: string } {
  if (!message.trim()) return { matched: false };
  const lowerMsg = message.toLowerCase();

  for (const allow of d.allowList) {
    if (allow.trim() && lowerMsg.includes(allow.toLowerCase().trim())) {
      return { matched: false, reason: `Exemption autorisée : "${allow}"` };
    }
  }

  if (d.triggerType === "keyword" || d.triggerType === "member_profile") {
    for (const kw of d.keywords) {
      const cleanKw = kw.trim();
      if (!cleanKw) continue;
      const lowerKw = cleanKw.toLowerCase();
      if (lowerKw.startsWith("*") && lowerKw.endsWith("*")) {
        const sub = lowerKw.slice(1, -1);
        if (sub && lowerMsg.includes(sub)) {
          return { matched: true, reason: `Mot-clé détecté : "${cleanKw}"` };
        }
      } else if (lowerKw.startsWith("*")) {
        const sub = lowerKw.slice(1);
        const re = new RegExp(`\\b\\w*${escapeRegex(sub)}\\b`, "i");
        if (re.test(message)) {
          return { matched: true, reason: `Mot-clé détecté : "${cleanKw}"` };
        }
      } else if (lowerKw.endsWith("*")) {
        const sub = lowerKw.slice(0, -1);
        const re = new RegExp(`\\b${escapeRegex(sub)}\\w*\\b`, "i");
        if (re.test(message)) {
          return { matched: true, reason: `Mot-clé détecté : "${cleanKw}"` };
        }
      } else {
        const re = new RegExp(`\\b${escapeRegex(lowerKw)}\\b`, "i");
        if (re.test(message)) {
          return { matched: true, reason: `Mot-clé détecté : "${cleanKw}"` };
        }
      }
    }

    for (const rx of d.regexPatterns) {
      if (!rx.trim()) continue;
      try {
        const cleaned = rx.replace(/^\(\?i\)/, "");
        const reg = new RegExp(cleaned, rx.startsWith("(?i)") ? "i" : "");
        if (reg.test(message)) {
          return { matched: true, reason: `Expression régulière : "${rx}"` };
        }
      } catch {}
    }
  }

  if (d.triggerType === "mention_spam") {
    const mentionMatches = message.match(/<@!?\d+>|@everyone|@here/g) || [];
    const count = mentionMatches.length;
    if (count > d.mentionTotalLimit) {
      return { matched: true, reason: `Mentions excessives (${count} / max ${d.mentionTotalLimit})` };
    }
  }

  if (d.triggerType === "keyword_preset") {
    const profanities = ["merde", "putain", "con", "salope", "connard", "fdp", "encule", "fuck", "bitch", "asshole"];
    const hateSpeech = ["nigger", "faggot", "pede", "youpin", "sale arabe", "sale noir"];
    const sexual = ["porno", "hentai", "nude", "onlyfans", "leak nude", "sexe"];

    if (d.presets.includes("profanity")) {
      for (const w of profanities) {
        if (new RegExp(`\\b${escapeRegex(w)}\\b`, "i").test(message)) {
          return { matched: true, reason: `Liste grossièretés Discord ("${w}")` };
        }
      }
    }
    if (d.presets.includes("slurs")) {
      for (const w of hateSpeech) {
        if (new RegExp(`\\b${escapeRegex(w)}\\b`, "i").test(message)) {
          return { matched: true, reason: `Liste propos haineux Discord ("${w}")` };
        }
      }
    }
    if (d.presets.includes("sexual_content")) {
      for (const w of sexual) {
        if (new RegExp(`\\b${escapeRegex(w)}\\b`, "i").test(message)) {
          return { matched: true, reason: `Liste contenu sexuel Discord ("${w}")` };
        }
      }
    }
  }

  if (d.triggerType === "spam") {
    if (/(.)\1{7,}/.test(message) || /(https?:\/\/[^\s]+.*){3,}/i.test(message)) {
      return { matched: true, reason: `Motif répétitif suspecté comme spam` };
    }
  }

  return { matched: false };
}

function getRuleSummaryText(r: {
  triggerType: Trigger | "unknown";
  triggerMetadata?: Rule["triggerMetadata"];
  keywords?: string[];
  regexPatterns?: string[];
  presets?: string[];
  mentionTotalLimit?: number | null;
  actions: Action[];
}): string {
  const t = r.triggerType;
  let part = "";
  if (t === "keyword" || t === "member_profile") {
    const count = r.triggerMetadata
      ? r.triggerMetadata.keywordFilter.length + (r.triggerMetadata.regexPatterns?.length ?? 0)
      : (r.keywords?.length ?? 0) + (r.regexPatterns?.length ?? 0);
    part = `Mots-clés · ${count} ${count > 1 ? "mots-clés" : "mot-clé"}`;
  } else if (t === "keyword_preset") {
    const count = r.triggerMetadata ? r.triggerMetadata.presets.length : (r.presets?.length ?? 0);
    part = `Listes de Discord · ${count} ${count > 1 ? "listes" : "liste"}`;
  } else if (t === "mention_spam") {
    const limit = r.triggerMetadata ? r.triggerMetadata.mentionTotalLimit : r.mentionTotalLimit;
    part = `Mentions de masse · plus de ${limit ?? 7} mentions`;
  } else if (t === "spam") {
    part = "Spam";
  } else {
    part = "AutoMod";
  }

  const hasBlock = r.actions.some((a) => a.type === "block_message");
  const hasTimeout = r.actions.some((a) => a.type === "timeout");
  const hasAlert = r.actions.some((a) => a.type === "send_alert");

  const actionParts: string[] = [];
  if (hasBlock) actionParts.push("bloque");
  if (hasTimeout) actionParts.push("timeout");
  if (hasAlert) actionParts.push("alerte");
  if (actionParts.length === 0) actionParts.push("surveille");

  return `${part} · ${actionParts.join(", ")}`;
}

export default function ConsoleAutomodNative({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success: toastSuccess } = useToast();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ rules: Rule[] }>("/automod-native");
    if (res?.rules) {
      setRules(res.rules);
    } else {
      setRules([]);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (ruleId: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    setRules((prev) =>
      prev
        ? prev.map((r) => (r.id === ruleId ? { ...r, enabled: nextState } : r))
        : null
    );

    const res = await api(`/automod-native/${ruleId}/toggle`, {
      method: "PATCH",
      json: { enabled: nextState },
    });

    if (!res) {
      void load();
    } else {
      toastSuccess("AutoMod", `Règle ${nextState ? "activée" : "désactivée"}`);
    }
  };

  const handleInstallRecommended = async () => {
    setBusy(true);
    const res = await api<{ created: unknown[]; skipped: unknown[] }>("/automod-native/recommended", {
      method: "POST",
      json: {},
    });
    setBusy(false);
    if (res) {
      toastSuccess("AutoMod", "Règles recommandées ETHONE installées avec succès");
      void load();
    } else {
      for (const rec of DEFAULT_RECOMMENDED) {
        await api("/automod-native", {
          method: "POST",
          json: {
            name: rec.name,
            triggerType: rec.triggerType,
            enabled: rec.enabled,
            keywords: rec.keywords,
            regexPatterns: rec.regexPatterns,
            allowList: rec.allowList,
            presets: rec.presets,
            mentionTotalLimit: rec.mentionTotalLimit,
            mentionRaidProtection: rec.mentionRaidProtection,
            actions: rec.actions,
            exemptRoles: rec.exemptRoles,
            exemptChannels: rec.exemptChannels,
          },
        });
      }
      toastSuccess("AutoMod", "Règles standard synchronisées");
      void load();
    }
  };

  const displayRules = useMemo(() => {
    if (!rules || rules.length === 0) {
      return DEFAULT_RECOMMENDED.map((rec) => ({
        id: rec.id,
        name: rec.name,
        enabled: rec.enabled,
        triggerType: rec.triggerType,
        triggerMetadata: {
          keywordFilter: rec.keywords,
          regexPatterns: rec.regexPatterns,
          allowList: rec.allowList,
          presets: rec.presets,
          mentionTotalLimit: rec.mentionTotalLimit,
          mentionRaidProtectionEnabled: rec.mentionRaidProtection,
        },
        actions: rec.actions,
        exemptRoles: rec.exemptRoles,
        exemptChannels: rec.exemptChannels,
      }));
    }
    return rules;
  }, [rules]);

  const activeRule = useMemo(() => {
    if (!editingId) return null;
    return displayRules.find((r) => r.id === editingId) ?? null;
  }, [editingId, displayRules]);

  if (editingId !== null) {
    return (
      <RuleEditorView
        guildId={guildId}
        initialRule={activeRule}
        isNew={isNewRule}
        onBack={() => {
          setEditingId(null);
          setIsNewRule(false);
        }}
        onSaved={() => {
          setEditingId(null);
          setIsNewRule(false);
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              AutoMod
            </h1>
            <button
              type="button"
              onClick={() => setInfoOpen(!infoOpen)}
              aria-label="Information AutoMod"
              className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Règles automatiques de modération natives Discord.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNewRule(true);
            setEditingId("new");
          }}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nouvelle règle</span>
        </button>
      </div>

      <AnimatePresence>
        {infoOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_LAYOUT}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-300">
                    Modération native Discord intégrée
                  </p>
                  <p className="leading-relaxed opacity-90">
                    Ces règles sont exécutées directement par les serveurs de Discord avant même que les messages ne soient envoyés. Elles fonctionnent 24h/24, même si le bot est hors ligne.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {rules && rules.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-emerald-300">
              Installation recommandée en 1 clic
            </p>
            <p className="text-xs text-emerald-200/80">
              Active la suite complète anti-phishing, anti-pub, grossièretés, raid et spam.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleInstallRecommended}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{busy ? "Installation..." : "Installer les 6 règles"}</span>
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {displayRules.map((r) => {
          const isKeyword = r.triggerType === "keyword" || r.triggerType === "member_profile";
          const isPreset = r.triggerType === "keyword_preset";
          const isMention = r.triggerType === "mention_spam";
          const isSpam = r.triggerType === "spam";

          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-4 transition-all hover:border-[var(--panel-border-hover,var(--panel-border))]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  {isKeyword && <Filter className="h-5 w-5" strokeWidth={1.75} />}
                  {isPreset && <BookOpen className="h-5 w-5" strokeWidth={1.75} />}
                  {isMention && <AtSign className="h-5 w-5" strokeWidth={1.75} />}
                  {isSpam && <AlertCircle className="h-5 w-5" strokeWidth={1.75} />}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {r.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {getRuleSummaryText(r)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Switch
                  checked={r.enabled}
                  onChange={() => toggle(r.id, r.enabled)}
                  label={`Activer ${r.name}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsNewRule(false);
                    setEditingId(r.id);
                  }}
                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer"
                >
                  Modifier
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleEditorView({
  guildId,
  initialRule,
  isNew,
  onBack,
  onSaved,
}: {
  guildId: string;
  initialRule: Rule | null;
  isNew: boolean;
  onBack: () => void;
  onSaved: () => void;
}) {
  const api = useGuildApi(guildId);
  const { success: toastSuccess, error: toastError } = useToast();

  const [d, setD] = useState<Draft>(() => {
    if (initialRule && !isNew) {
      return {
        name: initialRule.name,
        triggerType: initialRule.triggerType === "unknown" ? "keyword" : initialRule.triggerType,
        keywords: [...(initialRule.triggerMetadata?.keywordFilter ?? [])],
        regexPatterns: [...(initialRule.triggerMetadata?.regexPatterns ?? [])],
        allowList: [...(initialRule.triggerMetadata?.allowList ?? [])],
        presets: [...(initialRule.triggerMetadata?.presets ?? [])],
        mentionTotalLimit: initialRule.triggerMetadata?.mentionTotalLimit ?? 7,
        mentionRaidProtection: initialRule.triggerMetadata?.mentionRaidProtectionEnabled ?? false,
        actions: [...initialRule.actions],
        exemptRoles: [...initialRule.exemptRoles],
        exemptChannels: [...initialRule.exemptChannels],
      };
    }
    return {
      name: "Nouvelle règle AutoMod",
      triggerType: "keyword",
      keywords: ["*discord-nitro*", "*free-nitro*"],
      regexPatterns: [],
      allowList: [],
      presets: ["profanity", "slurs"],
      mentionTotalLimit: 7,
      mentionRaidProtection: true,
      actions: [{ type: "block_message", customMessage: "Ce message a été bloqué par ETHONE AutoMod." }],
      exemptRoles: [],
      exemptChannels: [],
    };
  });

  const [enabled, setEnabled] = useState(initialRule ? initialRule.enabled : true);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [newAllowInput, setNewAllowInput] = useState("");
  const [regexText, setRegexText] = useState(() => d.regexPatterns.join("\n"));
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<ChannelOption[]>([]);

  useEffect(() => {
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId]);

  const testResult = useMemo(() => {
    return testRuleMessage(testMessage, {
      ...d,
      regexPatterns: regexText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    });
  }, [testMessage, d, regexText]);

  const blockAction = useMemo(() => d.actions.find((a) => a.type === "block_message"), [d.actions]);
  const alertAction = useMemo(() => d.actions.find((a) => a.type === "send_alert"), [d.actions]);
  const timeoutAction = useMemo(() => d.actions.find((a) => a.type === "timeout"), [d.actions]);

  const updateAction = (type: Action["type"], active: boolean, extra?: Partial<Action>) => {
    setD((prev) => {
      const filtered = prev.actions.filter((a) => a.type !== type);
      if (!active) return { ...prev, actions: filtered };
      const current = prev.actions.find((a) => a.type === type) ?? { type };
      return {
        ...prev,
        actions: [...filtered, { ...current, ...extra } as Action],
      };
    });
  };

  const addKeywordsFromInput = (raw: string) => {
    const parts = raw
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setD((prev) => ({
      ...prev,
      keywords: Array.from(new Set([...prev.keywords, ...parts])),
    }));
    setNewKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setD((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((x) => x !== kw),
    }));
  };

  const addAllowFromInput = (raw: string) => {
    const parts = raw
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setD((prev) => ({
      ...prev,
      allowList: Array.from(new Set([...prev.allowList, ...parts])),
    }));
    setNewAllowInput("");
  };

  const removeAllow = (word: string) => {
    setD((prev) => ({
      ...prev,
      allowList: prev.allowList.filter((x) => x !== word),
    }));
  };

  const handleSave = async () => {
    if (!d.name.trim()) {
      toastError("AutoMod", "Veuillez indiquer un nom pour la règle");
      return;
    }
    if (d.actions.length === 0) {
      toastError("AutoMod", "Veuillez activer au moins une action");
      return;
    }

    setSaving(true);
    const regexList = regexText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      name: d.name.trim(),
      triggerType: d.triggerType,
      enabled,
      keywords: d.triggerType === "keyword" || d.triggerType === "member_profile" ? d.keywords : [],
      regexPatterns: d.triggerType === "keyword" || d.triggerType === "member_profile" ? regexList : [],
      allowList: d.triggerType === "keyword" || d.triggerType === "keyword_preset" ? d.allowList : [],
      presets: d.triggerType === "keyword_preset" ? d.presets : [],
      mentionTotalLimit: d.triggerType === "mention_spam" ? d.mentionTotalLimit : undefined,
      mentionRaidProtection: d.triggerType === "mention_spam" ? d.mentionRaidProtection : false,
      actions: d.actions,
      exemptRoles: d.exemptRoles,
      exemptChannels: d.exemptChannels,
    };

    let res: unknown = null;
    if (initialRule && !isNew && !initialRule.id.startsWith("rec-")) {
      res = await api(`/automod-native/${initialRule.id}`, {
        method: "PUT",
        json: payload,
      });
    } else {
      res = await api("/automod-native", {
        method: "POST",
        json: payload,
      });
    }

    setSaving(false);
    if (res) {
      toastSuccess("AutoMod", "Règle enregistrée avec succès");
      onSaved();
    } else {
      toastSuccess("AutoMod", "Règle mise à jour localement");
      onSaved();
    }
  };

  const handleDelete = async () => {
    if (!initialRule || isNew) return;
    const ok = await confirmDialog(`Supprimer la règle Discord « ${initialRule.name} » ?`, {
      title: "Supprimer la règle",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;

    if (!initialRule.id.startsWith("rec-")) {
      await api(`/automod-native/${initialRule.id}`, { method: "DELETE" });
    }
    toastSuccess("AutoMod", "Règle supprimée");
    onSaved();
  };

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--panel-border)] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour</span>
        </button>

        <h1 className="truncate text-base font-bold text-[var(--text-primary)]">
          {d.name || "Nouvelle règle"}
        </h1>

        <div className="w-16" />
      </div>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Général
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Nom
            </label>
            <input
              type="text"
              value={d.name}
              maxLength={100}
              onChange={(e) => setD((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nom de la règle"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-6 pt-2 sm:pt-6">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Activée
            </span>
            <Switch
              checked={enabled}
              onChange={setEnabled}
              label="Activer la règle"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Déclencheur
          </h2>
          <Info className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["keyword", "mention_spam", "spam", "keyword_preset"] as Trigger[]).map((t) => {
            const active = d.triggerType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setD((prev) => ({ ...prev, triggerType: t }))}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                {t === "keyword" && <Filter className="h-3.5 w-3.5" />}
                {t === "mention_spam" && <AtSign className="h-3.5 w-3.5" />}
                {t === "spam" && <AlertCircle className="h-3.5 w-3.5" />}
                {t === "keyword_preset" && <BookOpen className="h-3.5 w-3.5" />}
                <span>{TRIGGER_LABELS[t]}</span>
              </button>
            );
          })}
        </div>

        {d.triggerType === "keyword" && (
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Tags / Mots-clés
                </label>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {d.keywords.length} / 1000
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-2 min-h-[56px]">
                {d.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-300"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="text-emerald-400/80 hover:text-emerald-200 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addKeywordsFromInput(newKeywordInput);
                    }
                  }}
                  placeholder="Ajoute un mot-clé (Entrée ou virgule pour valider)..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
                />
                <button
                  type="button"
                  onClick={() => addKeywordsFromInput(newKeywordInput)}
                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Un mot-clé par ligne ou séparés par des virgules. Utilise * au début ou à la fin pour les correspondances partielles (*nitro*).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Expressions régulières
                </label>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {regexText.split("\n").filter((x) => x.trim()).length} / 10
                </span>
              </div>
              <textarea
                value={regexText}
                rows={2}
                onChange={(e) => setRegexText(e.target.value)}
                placeholder="(?i)discord\.gg\/\w+"
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-2.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Format regex standard de Discord. Max 10. Ex: (?i)(nitro|gift).*(free|claim)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Exceptions du déclencheur
                </label>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {d.allowList.length} / 100
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-2 min-h-[44px]">
                {d.allowList.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => removeAllow(word)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newAllowInput}
                  onChange={(e) => setNewAllowInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addAllowFromInput(newAllowInput);
                    }
                  }}
                  placeholder="Mot ou lien autorisé (Entrée pour valider)..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
                />
                <button
                  type="button"
                  onClick={() => addAllowFromInput(newAllowInput)}
                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {d.triggerType === "keyword_preset" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {PRESETS.map((p) => {
                const active = d.presets.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {p.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {p.hint}
                      </p>
                    </div>
                    <Switch
                      checked={active}
                      onChange={(v) =>
                        setD((prev) => ({
                          ...prev,
                          presets: v
                            ? [...prev.presets, p.id]
                            : prev.presets.filter((x) => x !== p.id),
                        }))
                      }
                      label={p.label}
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Mots autorisés
                </label>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {d.allowList.length} / 1000
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-2 min-h-[44px]">
                {d.allowList.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => removeAllow(word)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newAllowInput}
                  onChange={(e) => setNewAllowInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addAllowFromInput(newAllowInput);
                    }
                  }}
                  placeholder="Mot autorisé (Entrée pour valider)..."
                  className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
                />
                <button
                  type="button"
                  onClick={() => addAllowFromInput(newAllowInput)}
                  className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {d.triggerType === "mention_spam" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Mentions dans un message
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Déclenche l&apos;action si un message contient plus de {d.mentionTotalLimit} mentions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setD((prev) => ({
                      ...prev,
                      mentionTotalLimit: Math.max(1, prev.mentionTotalLimit - 1),
                    }))
                  }
                  className="h-8 w-8 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono text-sm font-bold text-[var(--text-primary)]">
                  {d.mentionTotalLimit}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setD((prev) => ({
                      ...prev,
                      mentionTotalLimit: Math.min(50, prev.mentionTotalLimit + 1),
                    }))
                  }
                  className="h-8 w-8 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Détection des raids
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Reconnaît les vagues de mentions venant de multiples comptes coordonnés.
                </p>
              </div>
              <Switch
                checked={d.mentionRaidProtection}
                onChange={(v) => setD((prev) => ({ ...prev, mentionRaidProtection: v }))}
                label="Détection des raids"
              />
            </div>
          </div>
        )}

        {d.triggerType === "spam" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <p className="font-semibold text-emerald-300">
              Détection du spam Discord
            </p>
            <p className="mt-1 leading-relaxed opacity-90">
              Discord décide seul de ce qui est du spam. Choisis simplement l&apos;action.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Tester
          </h2>
          <Info className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Écris un message pour le tester en direct.
        </p>

        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          rows={2}
          placeholder="Écris un message pour le tester..."
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
        />

        {testMessage.trim() && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border p-3 text-xs transition-colors",
              testResult.matched
                ? "border-red-500/40 bg-red-500/10 text-red-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            )}
          >
            {testResult.matched ? (
              <>
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                <span>
                  <strong>Déclenché :</strong> Le message sera bloqué ! ({testResult.reason})
                </span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Non déclenché :</strong> Le message passerait sans encombre.
                </span>
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Actions
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Bloquer le message
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Le message n&apos;est jamais publié dans le salon.
                </p>
              </div>
              <Switch
                checked={!!blockAction}
                onChange={(v) => updateAction("block_message", v)}
                label="Bloquer le message"
              />
            </div>

            {blockAction && (
              <div className="mt-3 border-t border-[var(--panel-border)] pt-3">
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Message de blocage personnalisé (facultatif, max 150 caractères)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={blockAction.customMessage ?? ""}
                  onChange={(e) =>
                    updateAction("block_message", true, {
                      customMessage: e.target.value || undefined,
                    })
                  }
                  placeholder="Ce message a été bloqué par ETHONE AutoMod."
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/70"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Alerte dans un salon
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Envoie une alerte dans un salon du staff.
                </p>
              </div>
              <Switch
                checked={!!alertAction}
                onChange={(v) => updateAction("send_alert", v)}
                label="Alerte dans un salon"
              />
            </div>

            {alertAction && (
              <div className="mt-3 border-t border-[var(--panel-border)] pt-3">
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Salon de destination
                </label>
                <ChannelPicker
                  guildId={guildId}
                  value={alertAction.channelId ?? ""}
                  filterTypes={[0]}
                  placeholder="Sélectionne un salon"
                  onChange={(id) => updateAction("send_alert", true, { channelId: id })}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Timeout de l&apos;auteur
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Exclut temporairement l&apos;auteur du message.
                </p>
              </div>
              <Switch
                checked={!!timeoutAction}
                onChange={(v) => updateAction("timeout", v, { durationSeconds: 600 })}
                label="Timeout de l'auteur"
              />
            </div>

            {timeoutAction && (
              <div className="mt-3 border-t border-[var(--panel-border)] pt-3">
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">
                  Durée de l&apos;exclusion
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEOUT_DURATIONS.map(([sec, label]) => {
                    const active = timeoutAction.durationSeconds === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          updateAction("timeout", true, { durationSeconds: sec })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                          active
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                            : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-5 space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Exceptions
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Rôles exemptés
            </label>
            <RoleChips
              guildId={guildId}
              ids={d.exemptRoles}
              max={20}
              onChange={(ids) => setD((prev) => ({ ...prev, exemptRoles: ids }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Salons exemptés
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {d.exemptChannels.map((id) => (
                <Chip
                  key={id}
                  label={`#${channelName(id)}`}
                  onRemove={() =>
                    setD((prev) => ({
                      ...prev,
                      exemptChannels: prev.exemptChannels.filter((x) => x !== id),
                    }))
                  }
                />
              ))}
              <ChannelAdder
                guildId={guildId}
                excludeIds={d.exemptChannels}
                onPick={(c) =>
                  setD((prev) => ({
                    ...prev,
                    exemptChannels: [...prev.exemptChannels, c.id],
                  }))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/90 backdrop-blur-md px-6 py-3.5 shadow-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            Prête à être enregistrée.
          </p>

          <div className="flex items-center gap-3">
            {initialRule && !isNew && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
