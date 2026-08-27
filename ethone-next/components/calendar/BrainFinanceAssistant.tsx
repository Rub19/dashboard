"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Plus, Check, Loader2, TrendingUp, AlertCircle, DollarSign, Wallet, X, Zap } from "lucide-react";
import { BILL_BRANDS, detectBrandMeta } from "@/lib/bills-brands";
import { addBill, type Bill, toISODate } from "@/lib/bills-manager";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

import { CalendarDate, getLocalTimeZone } from "@internationalized/date";

interface BrainFinanceAssistantProps {
  bills: Bill[];
  onRefresh: () => void;
  selectedDate?: CalendarDate | null;
}

export default function BrainFinanceAssistant({ bills, onRefresh, selectedDate }: BrainFinanceAssistantProps) {
  const { notify, success, error: showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Target date based on calendar selection
  const getTargetDate = () => {
    if (selectedDate) {
      return selectedDate.toDate(getLocalTimeZone());
    }
    return new Date();
  };

  // Financial Stats
  const totalMonthly = bills.reduce((acc, b) => {
    if (b.recurrence === "yearly") return acc + b.amount / 12;
    if (b.recurrence === "weekly") return acc + b.amount * 4.33;
    return acc + b.amount;
  }, 0);

  const totalYearly = totalMonthly * 12;
  const unpaidCount = bills.filter((b) => !b.paid).length;

  const popularPicks = [
    { key: "chatgpt", label: "ChatGPT Plus", amount: 20, currency: "$", logo: BILL_BRANDS.chatgpt?.logo || "https://cdn.simpleicons.org/openai/ffffff" },
    { key: "spotify", label: "Spotify", amount: 10.99, currency: "€", logo: BILL_BRANDS.spotify?.logo || "https://cdn.simpleicons.org/spotify/1DB954" },
    { key: "netflix", label: "Netflix", amount: 13.49, currency: "€", logo: BILL_BRANDS.netflix?.logo || "https://cdn.simpleicons.org/netflix/E50914" },
    { key: "youtube", label: "YouTube Premium", amount: 12.99, currency: "€", logo: BILL_BRANDS.youtube?.logo || "https://cdn.simpleicons.org/youtube/FF0000" },
    { key: "prime", label: "Amazon Prime", amount: 6.99, currency: "€", logo: BILL_BRANDS.prime?.logo || "https://cdn.simpleicons.org/amazonprime/00A8E1" },
    { key: "disney", label: "Disney+", amount: 8.99, currency: "€", logo: BILL_BRANDS.disney?.logo || "https://cdn.simpleicons.org/disney/113CCF" },
    { key: "applemusic", label: "Apple Music", amount: 10.99, currency: "€", logo: BILL_BRANDS.applemusic?.logo || "https://cdn.simpleicons.org/applemusic/FC3C44" },
    { key: "apple", label: "iCloud 200 Go", amount: 2.99, currency: "€", logo: BILL_BRANDS.apple?.logo || "https://cdn.simpleicons.org/apple/ffffff" },
    { key: "github", label: "GitHub Copilot", amount: 10, currency: "$", logo: BILL_BRANDS.github?.logo || "https://cdn.simpleicons.org/github/ffffff" },
    { key: "discord", label: "Discord Nitro", amount: 9.99, currency: "€", logo: BILL_BRANDS.discord?.logo || "https://cdn.simpleicons.org/discord/ffffff" },
    { key: "claude", label: "Claude Pro", amount: 20, currency: "$", logo: BILL_BRANDS.claude?.logo || "https://cdn.simpleicons.org/anthropic/ffffff" },
    { key: "midjourney", label: "Midjourney", amount: 10, currency: "$", logo: BILL_BRANDS.midjourney?.logo || "https://cdn.simpleicons.org/midjourney/ffffff" },
    { key: "cursor", label: "Cursor AI", amount: 20, currency: "$", logo: BILL_BRANDS.cursor?.logo || "https://cdn.simpleicons.org/cursor/ffffff" },
    { key: "perplexity", label: "Perplexity Pro", amount: 20, currency: "$", logo: BILL_BRANDS.perplexity?.logo || "https://cdn.simpleicons.org/perplexity/22B8CD" },
    { key: "playstation", label: "PlayStation Plus", amount: 8.99, currency: "€", logo: BILL_BRANDS.playstation?.logo || "https://cdn.simpleicons.org/playstation/003791" },
    { key: "xbox", label: "Xbox Game Pass", amount: 14.99, currency: "€", logo: BILL_BRANDS.xbox?.logo || "https://cdn.simpleicons.org/xbox/107C10" },
    { key: "free", label: "Freebox Pop", amount: 39.99, currency: "€", logo: BILL_BRANDS.free?.logo || "https://cdn.simpleicons.org/free/CC0000" },
    { key: "adobe", label: "Adobe Cloud", amount: 24.99, currency: "€", logo: BILL_BRANDS.adobe?.logo || "https://cdn.simpleicons.org/adobe/FF0000" },
    { key: "notion", label: "Notion Plus", amount: 10, currency: "€", logo: BILL_BRANDS.notion?.logo || "https://cdn.simpleicons.org/notion/ffffff" },
    { key: "canal", label: "Canal+", amount: 22.99, currency: "€", logo: BILL_BRANDS.canal?.logo || "https://cdn.simpleicons.org/canalplus/ffffff" },
    { key: "deezer", label: "Deezer", amount: 11.99, currency: "€", logo: BILL_BRANDS.deezer?.logo || "https://cdn.simpleicons.org/deezer/A238FF" },
    { key: "crunchyroll", label: "Crunchyroll", amount: 6.49, currency: "€", logo: BILL_BRANDS.crunchyroll?.logo || "https://cdn.simpleicons.org/crunchyroll/F47521" },
  ];

  const handleQuickAddPopular = (brandKey: string) => {
    const brand = BILL_BRANDS[brandKey];
    if (!brand) return;

    const targetDate = getTargetDate();
    addBill({
      label: brand.name,
      amount: brand.defaultAmount || 10,
      currency: brand.currency || "€",
      dueDate: toISODate(targetDate),
      paid: false,
      category: brand.category || "subscriptions",
      recurrence: "monthly",
    });

    const dayNumber = targetDate.getDate();
    const monthName = targetDate.toLocaleString("fr-FR", { month: "short" });
    success("Abonnement ajouté", `${brand.name} prévu le ${dayNumber} ${monthName} (${brand.defaultAmount}${brand.currency})`);
    onRefresh();
  };

  const handleCreateWithAi = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    try {
      const brand = detectBrandMeta(prompt);
      const amountMatch = prompt.match(/(\d+([.,]\d+)?)\s*(€|\$|eur|usd)?/i);
      const extractedAmount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : brand.defaultAmount || 10;
      const extractedCurrency = prompt.includes("$") || prompt.toLowerCase().includes("usd") ? "$" : "€";

      const targetDate = getTargetDate();
      addBill({
        label: brand.name !== "Facture" ? brand.name : prompt.trim(),
        amount: extractedAmount,
        currency: extractedCurrency,
        dueDate: toISODate(targetDate),
        paid: false,
        category: brand.category || "subscriptions",
        recurrence: "monthly",
      });

      const dayNumber = targetDate.getDate();
      success("Facture créée par Brain", `${brand.name} : ${extractedAmount}${extractedCurrency}/mois (le ${dayNumber})`);
      setPrompt("");
      onRefresh();
    } catch {
      showError("Erreur lors de la création IA");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAskBrainAdvice = async () => {
    setIsProcessing(true);
    try {
      const summary = bills.map((b) => `${b.label}: ${b.amount}${b.currency} (${b.recurrence})`).join(", ");
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Voici la liste de mes abonnements et factures actuels : [${summary || "Aucun pour le moment"}]. 
Donne-moi un bilan financier express en 3 puces : (1) Total estimé par mois et par an, (2) Conseils d'optimisation / doublons éventuels, (3) Prochaine action recommandée. Sois ultra concis et percutant.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAdvice(data?.response || data?.choices?.[0]?.message?.content || "Analyse financière indisponible.");
      }
    } catch {
      setAiAdvice("Conseil IA temporairement indisponible.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0c0d14]/90 p-4 backdrop-blur-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Brain Finance & Abonnements</h4>
            <p className="text-[10px] text-zinc-400">
              {totalMonthly.toFixed(2)} €/mois · {totalYearly.toFixed(0)} €/an
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="h-3 w-3 text-purple-400" />
          <span>{isOpen ? "Fermer" : "Assistant IA"}</span>
        </button>
      </div>

      {/* Quick Add Brands Carousel */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          ⚡ Ajouter un abonnement officiel en 1 clic
        </p>
        <div className="flex items-center gap-2 overflow-x-auto os-scroll pb-1">
          {popularPicks.map((pick) => (
            <button
              key={pick.key}
              type="button"
              onClick={() => handleQuickAddPopular(pick.key)}
              className="group flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <img
                src={pick.logo}
                alt=""
                className="h-3.5 w-3.5 object-contain opacity-90 group-hover:scale-110 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="font-medium text-[11px]">{pick.label}</span>
              <span className="text-[10px] font-mono font-bold text-zinc-400">
                {pick.amount}{pick.currency}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Assistant Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3 border-t border-white/10 pt-3 overflow-hidden"
          >
            {/* Natural language AI Bill Add */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-300">
                Créer une facture en langage naturel avec Brain :
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateWithAi()}
                  placeholder="Ex: Netflix 13.49€, ChatGPT 20$, Loyer 750€..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-24 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
                />
                <button
                  type="button"
                  onClick={handleCreateWithAi}
                  disabled={!prompt.trim() || isProcessing}
                  className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-purple-500 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Brain Advisor Button & Output */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAskBrainAdvice}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer shadow-sm"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                )}
                <span>Analyser mon budget & Optimiser avec Brain</span>
              </button>

              {aiAdvice && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-xs leading-relaxed text-zinc-300 whitespace-pre-line animate-in fade-in zoom-in-95 duration-200">
                  {aiAdvice}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
